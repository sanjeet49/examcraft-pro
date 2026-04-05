import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { getAI, withRetry, quotaErrorResponse } from "@/lib/gemini";
import mammoth from "mammoth";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user)
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const user = await prisma.user.findUnique({ 
            where: { id: session.user.id },
            include: { school: true }
        });
        let availableCredits = 0;
        if (user?.role === "OWNER") availableCredits = 999999;
        else if (user?.school) availableCredits = user.school.credits;

        if (!user || availableCredits <= 0)
            return NextResponse.json({ error: "Insufficient school credits." }, { status: 403 });

        const formData = await req.formData();
        const textContext = (formData.get("text") as string) || "";
        const syllabusFiles = formData.getAll("files") as File[];
        const referenceFilesList = formData.getAll("referenceFiles") as File[];
        const targetMarksRaw = formData.get("targetMarks") as string;
        const targetMarks = parseInt(targetMarksRaw, 10) || 50;

        if (!textContext && syllabusFiles.length === 0) {
            return NextResponse.json(
                { error: "Please provide a chapter PDF, DOCX, or paste text." },
                { status: 400 }
            );
        }

        // ── Build Gemini content parts ────────────────────────────────────────────
        // Gemini can read PDFs natively via inline base64 — no PDF library needed.
        // DOCX files are extracted to plain text via mammoth.
        type ContentPart = { text: string } | { inlineData: { mimeType: string; data: string } };
        const syllabusParts: ContentPart[] = [];
        const referenceParts: ContentPart[] = [];

        const fileToGeminiParts = async (file: File): Promise<ContentPart[]> => {
            const arrayBuffer = await file.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            const isDocx =
                file.name.endsWith(".docx") ||
                file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
            const isPdf = file.name.endsWith(".pdf") || file.type === "application/pdf";

            if (isDocx) {
                // Extract DOCX to plain text
                const result = await mammoth.extractRawText({ buffer });
                return [{ text: `--- Document: ${file.name} ---\n${result.value}\n---\n\n` }];
            } else if (isPdf) {
                // Send PDF directly to Gemini as base64 — Gemini reads it natively
                return [
                    { text: `--- Document: ${file.name} ---\n` },
                    { inlineData: { mimeType: "application/pdf", data: buffer.toString("base64") } },
                    { text: "\n---\n\n" },
                ];
            } else {
                throw new Error(`Unsupported file type: ${file.name}. Please upload PDF or DOCX.`);
            }
        };

        for (const file of syllabusFiles) {
            try {
                const parts = await fileToGeminiParts(file);
                syllabusParts.push(...parts);
            } catch (e: any) {
                return NextResponse.json({ error: e.message }, { status: 400 });
            }
        }

        for (const file of referenceFilesList) {
            try {
                const parts = await fileToGeminiParts(file);
                referenceParts.push(...parts);
            } catch (e: any) {
                return NextResponse.json({ error: e.message }, { status: 400 });
            }
        }

        const hasReference = referenceParts.length > 0;

        // ── Build the prompt ──────────────────────────────────────────────────────
        const styleInstructions = hasReference
            ? `
You have been given a REFERENCE PAPER above.
Analyse it carefully and identify its structural blueprint:
  - Section names, question types per section, number of questions, marks per question
  - Overall tone (board-exam style, university style, etc.)

Now generate a brand-new ${targetMarks}-mark examination paper that:
  1. STRICTLY replicates the Reference Paper's structural blueprint.
  2. Scales proportionally if Reference Paper's total marks differ from ${targetMarks}.
  3. Sources ALL question content EXCLUSIVELY from the Syllabus material — do NOT reuse Reference Paper questions.
`
            : `
Generate a perfectly balanced ${targetMarks}-mark examination paper using the provided syllabus.
Include a logical mix of MCQs, Fill-in-the-Blanks, True/False, Short Answer, and Descriptive questions totalling exactly ${targetMarks} marks.
`;

        const promptText = `
Act as an expert exam setter.

${styleInstructions}

CRITICAL: Return STRICTLY in the following JSON array schema (no markdown, no text outside the array):

[
    {
        "id": "gen-abc123",
        "type": "MCQ | TF | SHORT_ANSWER | DESCRIPTIVE | FILL_IN_THE_BLANKS",
        "marks": number,
        "sequenceOrder": number,
        "sectionHeading": "Section A: Multiple Choice Questions",
        "customHeading": "Choose the correct option",
        "content": {
            "questionText": "...",
            "options": ["...", "..."],
            "correctIndex": 0,
            "isTrue": true,
            "linesRequired": 3,
            "solutionText": "..."
        }
    }
]
`;

        // ── Call Gemini with all parts ─────────────────────────────────────────────
        const allParts: ContentPart[] = [
            ...(hasReference ? [{ text: "REFERENCE PAPER (for structure only — do not copy questions):\n" } as ContentPart, ...referenceParts] : []),
            { text: "SYLLABUS / CHAPTER MATERIAL (use this for question content):\n" },
            ...(textContext ? [{ text: textContext + "\n\n" } as ContentPart] : []),
            ...syllabusParts,
            { text: promptText },
        ];

        const systemInstruction = `
You are an expert exam setter on the ExamCraft Pro platform.
Your ONLY output must be a valid JSON array of question objects, with no markdown, no explanation, and no text outside the array.
Every question must have marks > 0. sequenceOrder starts at 1.
JSON schema per question: { id, type, marks, sequenceOrder, sectionHeading, customHeading, content: { questionText, options, correctIndex, isTrue, linesRequired, solutionText } }
Allowed types: MCQ, TF, SHORT_ANSWER, DESCRIPTIVE, FILL_IN_THE_BLANKS.
`.trim();

        const aiClient = getAI();
        const response = await withRetry(() =>
            aiClient.models.generateContent({
                model: "gemini-2.5-flash",
                contents: [{ role: "user", parts: allParts }],
                config: {
                    systemInstruction,
                    responseMimeType: "application/json",
                    thinkingConfig: { thinkingBudget: 4096 },
                },
            })
        );

        const output = response.text || "[]";
        let cleaned = output.trim();
        if (cleaned.startsWith("```json")) cleaned = cleaned.slice(7);
        if (cleaned.startsWith("```")) cleaned = cleaned.slice(3);
        if (cleaned.endsWith("```")) cleaned = cleaned.slice(0, -3);
        cleaned = cleaned.trim();

        const parsedQuestions = JSON.parse(cleaned);

        if (user.role !== "OWNER" && user.schoolId) {
            await prisma.school.update({
                where: { id: user.schoolId },
                data: { credits: { decrement: 1 } },
            });
        }

        return NextResponse.json({ success: true, questions: parsedQuestions });
    } catch (error: any) {
        console.error("Generate Exam Failed:", error);

        if (error?.status === 429 || error?.message?.includes("429") || error?.message?.includes("quota")) {
            return NextResponse.json(
                { error: "Google AI quota reached. Please wait a minute and try again." },
                { status: 429 }
            );
        }

        return NextResponse.json(
            { error: error.message || "Failed to generate exam." },
            { status: 500 }
        );
    }
}
