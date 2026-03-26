import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import mammoth from "mammoth";
const pdfParse = require("pdf-parse");

export const dynamic = "force-dynamic";

let ai: GoogleGenAI | null = null;
const getAI = () => {
    if (!ai) {
        ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "dummy-key-for-build" });
    }
    return ai;
};

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const user = await prisma.user.findUnique({ where: { id: session.user.id } });
        if (!user || user.credits <= 0) return NextResponse.json({ error: "Insufficient credits." }, { status: 403 });

        const formData = await req.formData();
        const textContext = formData.get("text") as string;
        const uploadFiles = formData.getAll("files") as File[];

        if (!textContext && uploadFiles.length === 0) {
            return NextResponse.json({ error: "Please provide a document or syllabus text." }, { status: 400 });
        }

        let combinedContext = textContext ? `Additional Instructions/Context:\n${textContext}\n\n` : "";

        for (const file of uploadFiles) {
            const arrayBuffer = await file.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);

            if (file.name.endsWith('.docx') || file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
                try {
                    const result = await mammoth.extractRawText({ buffer });
                    combinedContext += `--- Extracted Docx Text from ${file.name} ---\n${result.value}\n-----------------------------------\n\n`;
                } catch (e) {
                    console.error("Mammoth extraction failed:", e);
                    return NextResponse.json({ error: `Failed to extract text from DOCX: ${file.name}` }, { status: 400 });
                }
            } else if (file.name.endsWith('.pdf') || file.type === 'application/pdf') {
                try {
                    const data = await pdfParse(buffer);
                    combinedContext += `--- Extracted PDF Text from ${file.name} ---\n${data.text}\n-----------------------------------\n\n`;
                } catch (e) {
                    console.error("PDF-parse extraction failed:", e);
                    return NextResponse.json({ error: `Failed to extract text from PDF: ${file.name}` }, { status: 400 });
                }
            } else {
                 return NextResponse.json({ error: `Unsupported file type for full exam generation: ${file.name}. Please upload PDF or DOCX.` }, { status: 400 });
            }
        }

        const prompt = `
Act as an expert exam setter. 
Using exactly the provided syllabus text, generate a perfectly balanced 50-mark examination paper.
The exam must include a logical mix of:
- 10 MCQs (1 mark each = 10 marks)
- 5 Fill-in-the-blanks (1 mark each = 5 marks) 
- 5 True/False questions (1 mark each = 5 marks)
- 5 Short Answer questions (2 marks each = 10 marks)
- 4 Descriptive/Long Answer questions (5 marks each = 20 marks)
TOTAL: 50 Marks.

Syllabus / Source Material:
${combinedContext}

CRITICAL: Return strictly in the following JSON array schema (no markdown formatting outside of the array).
Each object represents a question inside a section grouped by type:

[
    {
        "id": "gen-random-string",
        "type": "ONE_OF_TYPES (MCQ, TF, SHORT_ANSWER, DESCRIPTIVE, FILL_IN_THE_BLANKS)",
        "marks": number,
        "sequenceOrder": number,
        "sectionHeading": "string (e.g., 'Section A: Multiple Choice')",
        "customHeading": "string (e.g., 'Tick the correct option')",
        "content": {
            // if MCQ: "questionText": string, "options": string[], "correctIndex": number, "solutionText": string
            // if TF: "questionText": string, "isTrue": boolean, "solutionText": string
            // if SHORT_ANSWER: "questionText": string, "linesRequired": 3, "solutionText": string
            // if DESCRIPTIVE: "questionText": string, "linesRequired": 8, "solutionText": string
            // if FILL_IN_THE_BLANKS: "questionText": string (use "___" for blank), "solutionText": string
        }
    }
]
`;

        const aiClient = getAI();
        const response = await aiClient.models.generateContent({
            // Using gemini-2.5-pro for high-reasoning full document exam synthesis
            model: "gemini-2.5-pro",
            contents: prompt,
            config: { responseMimeType: "application/json" }
        });

        const output = response.text || "[]";
        let cleanedOutput = output;
        if (cleanedOutput.startsWith("\`\`\`json")) cleanedOutput = cleanedOutput.replace(/^\`\`\`json\n/, "").replace(/\n\`\`\`$/, "");
        else if (cleanedOutput.startsWith("\`\`\`")) cleanedOutput = cleanedOutput.replace(/^\`\`\`\n/, "").replace(/\n\`\`\`$/, "");

        const parsedQuestions = JSON.parse(cleanedOutput.trim());

        await prisma.user.update({
            where: { id: session.user.id },
            data: { credits: { decrement: 1 } }
        });

        return NextResponse.json({ success: true, questions: parsedQuestions });

    } catch (error: any) {
        console.error("Generate Exam Failed:", error);
        
        if (error?.status === 429 || error?.message?.includes("429") || error?.message?.includes("quota")) {
            return NextResponse.json({
                error: "Google AI Free Tier Limit Reached. Please wait a minute or upgrade API key."
            }, { status: 429 });
        }

        return NextResponse.json({ error: "Failed to generate exam from PDF." }, { status: 500 });
    }
}
