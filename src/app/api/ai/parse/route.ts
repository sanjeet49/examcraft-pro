import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
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

        const isAdmin = user?.role === "ADMIN" || user?.role === "SUPER_ADMIN";
        if (!user || (!isAdmin && user.credits <= 0)) {
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

        // Retry with exponential backoff for transient API errors (503, 429)
        const MAX_RETRIES = 3;
        let response;
        for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
            try {
                response = await aiClient.models.generateContent({
                    model: "gemini-2.5-flash",
                    contents: parts,
                    config: {
                        responseMimeType: "application/json"
                    }
                });
                break; // Success — exit retry loop
            } catch (retryError: any) {
                const status = retryError?.status || retryError?.httpStatusCode;
                const isRetryable = status === 503 || status === 429;
                if (isRetryable && attempt < MAX_RETRIES - 1) {
                    const delay = Math.pow(2, attempt) * 1000; // 1s, 2s, 4s
                    console.log(`Gemini API returned ${status}, retrying in ${delay}ms (attempt ${attempt + 1}/${MAX_RETRIES})...`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                } else {
                    throw retryError; // Non-retryable or last attempt — propagate
                }
            }
        }

        if (!response) {
            throw new Error("AI generation failed after all retries.");
        }

        const output = response.text || "[]";

        let cleanedOutput = output;
        if (cleanedOutput.startsWith("```json")) {
            cleanedOutput = cleanedOutput.replace(/^```json\n/, "").replace(/\n```$/, "");
        } else if (cleanedOutput.startsWith("```")) {
            cleanedOutput = cleanedOutput.replace(/^```\n/, "").replace(/\n```$/, "");
        }

        // Sanitize invalid JSON escape sequences (e.g. LaTeX \text, \frac)
        // Walk through the raw JSON string, and inside quoted strings,
        // double-escape any backslash that isn't a valid JSON escape.
        const sanitizeJsonEscapes = (raw: string): string => {
            // This regex matches a backslash followed by a character that is NOT
            // a valid JSON escape initiator: " \ / b f n r t u
            // We replace it with a double-backslash so JSON.parse sees a literal \.
            // We only apply this inside JSON string values.
            let result = '';
            let inString = false;
            let i = 0;
            while (i < raw.length) {
                const ch = raw[i];
                if (!inString) {
                    if (ch === '"') {
                        inString = true;
                    }
                    result += ch;
                    i++;
                } else {
                    // Inside a JSON string
                    if (ch === '"') {
                        // End of string (unescaped quote)
                        inString = false;
                        result += ch;
                        i++;
                    } else if (ch === '\\') {
                        // Check what follows the backslash
                        const next = i + 1 < raw.length ? raw[i + 1] : '';
                        if ('"\\\/bfnrt'.includes(next)) {
                            // Valid two-char JSON escape — keep as-is
                            result += ch + next;
                            i += 2;
                        } else if (next === 'u') {
                            // Could be a valid \uXXXX — check for 4 hex digits
                            const hex = raw.substring(i + 2, i + 6);
                            if (/^[0-9a-fA-F]{4}$/.test(hex)) {
                                result += raw.substring(i, i + 6);
                                i += 6;
                            } else {
                                // Invalid \u sequence, double-escape it
                                result += '\\\\' + next;
                                i += 2;
                            }
                        } else {
                            // Invalid escape like \t(ext), \f(rac) — but wait,
                            // \t and \f ARE valid JSON escapes, already handled above.
                            // Anything else: double-escape the backslash.
                            result += '\\\\' + next;
                            i += 2;
                        }
                    } else {
                        result += ch;
                        i++;
                    }
                }
            }
            return result;
        };

        let parsedQuestions;
        try {
            parsedQuestions = JSON.parse(cleanedOutput.trim());
        } catch {
            // If initial parse fails, sanitize escape sequences and retry
            const sanitized = sanitizeJsonEscapes(cleanedOutput.trim());
            parsedQuestions = JSON.parse(sanitized);
        }

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

        // Deduct 1 generation credit on success (skip for admins)!
        if (!isAdmin) {
            await prisma.user.update({
                where: { id: session.user.id },
                data: { credits: { decrement: 1 } }
            });
        }

        return NextResponse.json({ questions: finalQuestions });
    } catch (error: any) {
        console.error("AI Generation failed:", error);

        // Check for Service Unavailable (high demand)
        if (error?.status === 503 || error?.message?.includes("503") || error?.message?.includes("UNAVAILABLE")) {
            return NextResponse.json({
                message: "Google AI servers are experiencing high demand. Please try again in a few seconds."
            }, { status: 503 });
        }

        // Check for Rate Limit / Quota Exceeded from Google API
        if (error?.status === 429 || error?.message?.includes("429") || error?.message?.includes("quota")) {
            return NextResponse.json({
                message: "Google AI Free Tier Limit Reached. Please wait 1 minute before trying again, or upgrade your Gemini API key."
            }, { status: 429 });
        }

        return NextResponse.json({ message: "AI Parsing failed" }, { status: 500 });
    }
}
