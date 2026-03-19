import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import mammoth from "mammoth";

export const dynamic = "force-dynamic";

let ai: GoogleGenAI | null = null;
const getAI = () => {
    if (!ai) {
        ai = new GoogleGenAI({
            apiKey: process.env.GEMINI_API_KEY || "dummy-key-for-build",
        });
    }
    return ai;
};

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);

        if (!session || !session.user) {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        const user = await prisma.user.findUnique({
            where: { id: session.user.id }
        });

        if (!user || user.credits <= 0) {
            return NextResponse.json({ message: "Insufficient credits to use AI." }, { status: 403 });
        }

        const formData = await req.formData();
        const text = formData.get("text") as string;
        const uploadFiles = formData.getAll("files") as File[];

        if (!text && uploadFiles.length === 0) {
            return NextResponse.json({ message: "Instructions, an image, or a PDF document is required" }, { status: 400 });
        }

        const parts: any[] = [];
        let extractedDocxText = "";

        for (const file of uploadFiles) {
            const arrayBuffer = await file.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);

            // Check if it's a Word Document
            if (file.name.endsWith('.docx') || file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
                try {
                    const result = await mammoth.extractRawText({ buffer });
                    extractedDocxText += `\n\n--- Extracted Text from ${file.name} ---\n${result.value}\n-----------------------------------\n\n`;
                } catch (e) {
                    console.error("Mammoth docx extraction failed:", e);
                    return NextResponse.json({ message: `Failed to extract text from Word document: ${file.name}` }, { status: 400 });
                }
            } else {
                // Handle as PDF or Image natively via Gemini inlineData
                parts.push({
                    inlineData: {
                        data: buffer.toString("base64"),
                        mimeType: file.type || "application/pdf"
                    }
                });
            }
        }

        const prompt = `
    You are an expert AI exam extractor for teachers. Your job is to extract structured questions from the provided raw text instructions${uploadFiles.length > 0 ? ", the attached PDF document(s), and/or the attached images." : "."}
    ${uploadFiles.length > 0 ? "CRITICAL: If PDF documents or Images are attached, you MUST read the documents/images and follow the user's explicit written instructions found in the raw text." : ""}
    ${extractedDocxText ? `CRITICAL: The user has uploaded Word documents. The raw text extracted from those documents is appended to the bottom of this prompt. You MUST read it and extract the questions from it according to the instructions.` : ""}
    Convert the output into a precise JSON array of question objects.
    
    The question objects MUST adhere precisely to these types:
    "MCQ", "TF", "DESCRIPTIVE", "MATCH", "MAP", "FILL_IN_THE_BLANKS", "DATA_TABLE", "SHORT_ANSWER", "LONG_ANSWER", "CUSTOM".

    CRITICAL PARSING RULES for HEADINGS:
    1. If you see a top-level, overarching title like "Section A", "ATHLETICS", "KABADDI", or "OR: BASKETBALL", you MUST extract this specific centered heading text into the new \`sectionHeading\` property of the JSON question object! Preserve the exact wording.
    2. Then, if there is a specific sub-instruction for the question format beneath it (e.g., "Tick the Correct Option", "Multiple choice questions :", "Fill in the blanks :", or "Match the following :"), you MUST extract THAT sub-instruction string into the \`customHeading\` property!
    3. Both \`sectionHeading\` and \`customHeading\` must be passed down recursively into EVERY child question inside that group. It is absolutely essential so the UI groups them correctly.
    
    CRITICAL PARSING RULES for DATA:
    1. Extract the marks accurately. Divide parent group marks among the children evenly. E.g if a group of 4 questions is [2M] total, each gets 0.5 marks. If it's [4M], each gets 1 mark. CRITICAL: Every single question object MUST have a "marks" value strictly greater than 0, UNLESS its type is "CUSTOM". If no marks are provided, default to 1 mark per question.
    4. Maintain the proper order of the questions using the \`sequenceOrder\` field, starting from 1.
    5. STRICT PRESERVATION: DO NOT strip sequence numbering! Keep the exact text of the question, including its original number (e.g., "1. Which step...", "A. ...") precisely as it appears in the source text. Do not change anything.
    6. For MCQ, extract the multiple choice options into the \`options\` array. **CRITICAL:** You MUST strip out any letter or number prefixes (like "A.", "B)", "(c)", "iv.") from the options. The array should ONLY contain the raw text of the option (e.g. ["Fifth", "Sixth"], NOT ["A. Fifth", "B. Sixth"]).
    7. For Fill in the Blanks sentences, use "___" for the blank space! If options are provided inline like "(1, 2, 3)", keep them in the \`questionText\`.
    8. **Math & Science Formatting**: Preserve all superscripts, subscripts, fractions, and symbols intact. CRITICAL: You MUST wrap all mathematical formulas, numbers with units (e.g. $5\\text{ cm}$), exponents, fractions, and symbols strictly inside $ ... $ (for inline math) or $$ ... $$ (for block math) LaTeX tags! Do NOT break the JSON structure with unescaped backslashes (use double backslashes like \\text{} or \\frac{}{}).
    9. **Matching Sections**: If a section says "Match the following", COMBINE all the pairs into a SINGLE "MATCH" question block! Do NOT split them into individual questions. Put all left/right pairs into the \`pairs: [{left, right}]\` array. If one column has more items than the other, pad the missing side with an empty string "".
    10. **Data Tables**: If you detect a frequency distribution, statistics table, or grid of data (like "Class | Frequency" or "Monthly consumption"), use the "DATA_TABLE" type! Map the columns and rows precisely into the \`tableData: string[][]\` 2D array, and put the actual question prompt (e.g. "Find the mean of the data") into \`questionText\`.
    11. **Reading Comprehension / Pure Text**: Anything that is just reading material (like a paragraph or poem) must use the "CUSTOM" type with 0 marks.
    12. **PRE-SOLVED NOTES (ANSWERS PROVIDED)**: If the raw text already includes the answer for a question (e.g., "(True)", "Answer: Climate is...", or a Fill-in-the-blank word), you MUST extract that answer text and place it cleanly into the \`solutionText\` property of the content object. For MCQs, also ensure the \`correctIndex\` is set perfectly if indicated.
    
    Format for each object:
    {
      "id": "generate-a-unique-string",
      "type": "ONE_OF_THE_TYPES",
      "marks": number,
      "sequenceOrder": number,
      "sectionHeading": "string (OPTIONAL: The centered top-level title e.g. 'Section A' or 'Part 1')",
      "customHeading": "string (OPTIONAL: The left-aligned instruction e.g. 'Multiple choice questions :')",
      "content": { // specific to the type }
    }
    
    Content structures required for the "content" property:
    MCQ: { questionText: string, options: string[], correctIndex?: number }
    TF: { questionText: string, isTrue?: boolean, solutionText?: string }
    SHORT_ANSWER: { questionText: string, linesRequired: number, solutionText?: string } // Typically 3 lines
    LONG_ANSWER: { questionText: string, linesRequired: number, solutionText?: string } // Typically 6 lines
    DESCRIPTIVE: { questionText: string, linesRequired: number, solutionText?: string } // General descriptive
    MATCH: { questionText: string, pairs: [{left: string, right: string}], solutionText?: string }
    FILL_IN_THE_BLANKS: { questionText: string, solutionText?: string } // use "___" for blank
    DATA_TABLE: { questionText: string, tableData: string[][], solutionText?: string } 
    CUSTOM: { questionText: string, linesRequired: 0, solutionText?: string } // Use this for large reading comprehenion paragraphs so the student just reads it.
    
    Raw Instructions from User:
    ${text}

    ${extractedDocxText}
    `;

        const aiClient = getAI();
        parts.push({ text: prompt });

        const response = await aiClient.models.generateContent({
            model: "gemini-2.5-flash",
            contents: parts,
            config: {
                responseMimeType: "application/json"
            }
        });

        const output = response.text || "[]";

        let cleanedOutput = output;
        if (cleanedOutput.startsWith("```json")) {
            cleanedOutput = cleanedOutput.replace(/^```json\n/, "").replace(/\n```$/, "");
        } else if (cleanedOutput.startsWith("```")) {
            cleanedOutput = cleanedOutput.replace(/^```\n/, "").replace(/\n```$/, "");
        }

        const parsedQuestions = JSON.parse(cleanedOutput.trim());

        // Safety Regex Cleanup: AI sometimes fails to strip A., B), etc.
        const finalQuestions = parsedQuestions.map((q: any) => {
            if (q.type === "MCQ" && Array.isArray(q.content?.options)) {
                q.content.options = q.content.options.map((opt: string) => {
                    // Regex strips leading A., (A), a), A-, iv. etc
                    return opt.replace(/^\s*(?:[a-zA-Z]|[ivxIVX]+)[\.\)\-]\s*/, '').trim();
                });
            }
            return q;
        });

        // Deduct 1 generation credit on success!
        await prisma.user.update({
            where: { id: session.user.id },
            data: { credits: { decrement: 1 } }
        });

        return NextResponse.json({ questions: finalQuestions });
    } catch (error: any) {
        console.error("AI Generation failed:", error);

        // Check for Rate Limit / Quota Exceeded from Google API
        if (error?.status === 429 || error?.message?.includes("429") || error?.message?.includes("quota")) {
            return NextResponse.json({
                message: "Google AI Free Tier Limit Reached. Please wait 1 minute before trying again, or upgrade your Gemini API key."
            }, { status: 429 });
        }

        return NextResponse.json({ message: "AI Parsing failed" }, { status: 500 });
    }
}
