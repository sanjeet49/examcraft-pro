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
        if (!session?.user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

        const user = await prisma.user.findUnique({ where: { id: session.user.id } });
        if (!user || user.credits <= 0)
            return NextResponse.json({ message: "Insufficient credits to use AI." }, { status: 403 });

        const formData = await req.formData();
        const text = (formData.get("text") as string) || "";
        const uploadFiles = formData.getAll("files") as File[];

        if (!text && uploadFiles.length === 0)
            return NextResponse.json({ message: "Instructions, an image, or a document is required." }, { status: 400 });

        // ── Build multimodal parts ────────────────────────────────────────────────
        const parts: any[] = [];
        let extractedDocxText = "";

        for (const file of uploadFiles) {
            const arrayBuffer = await file.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);

            const isDocx =
                file.name.endsWith(".docx") ||
                file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

            if (isDocx) {
                const result = await mammoth.extractRawText({ buffer });
                extractedDocxText += `\n\n--- Extracted from ${file.name} ---\n${result.value}\n---\n`;
            } else {
                // PDF or Image — Gemini reads natively via inline base64
                parts.push({
                    inlineData: {
                        data: buffer.toString("base64"),
                        mimeType: file.type || "application/pdf",
                    },
                });
            }
        }

        if (text) parts.push({ text: `Raw Instructions from User:\n${text}` });
        if (extractedDocxText) parts.push({ text: extractedDocxText });

        // ── System Instruction (Gemini 2.5 feature) ───────────────────────────────
        const systemInstruction = `
You are an expert AI exam extractor for teachers on the ExamCraft Pro platform.

Your ONLY job is to parse the provided content and return a perfectly structured JSON array of question objects.
You MUST follow every rule below with zero deviation.

QUESTION TYPES allowed: MCQ, TF, DESCRIPTIVE, MATCH, MAP, FILL_IN_THE_BLANKS, DATA_TABLE, SHORT_ANSWER, LONG_ANSWER, CUSTOM.

HEADING RULES:
- Top-level section titles (e.g. "Section A", "ATHLETICS") → extract into "sectionHeading"
- Sub-instructions beneath them (e.g. "Tick the correct option") → extract into "customHeading"
- Propagate BOTH fields to every child question in that group

MARKS RULES:
- Divide group marks evenly among children. Every question MUST have marks > 0 (except type CUSTOM).
- Default to 1 mark if unspecified.

CONTENT RULES:
- MCQ options: strip letter/number prefixes (A., B), iv.) from options array
- Fill-in-the-blank sentences: use "___" as the blank placeholder
- MATCH sections: combine ALL pairs into ONE question object with pairs:[{left,right}]
- DATA_TABLE: use tableData: string[][] for tabular data
- Reading comprehension passages: use CUSTOM type with 0 marks
- If an answer/solution is already visible in the text → place it in "solutionText"
- For MCQs with a known correct answer → also set "correctIndex"
- sequenceOrder starts at 1 and increments continuously
- Math formulas: wrap in $...$ (inline) or $$...$$ (block) with double-escaped backslashes

OUTPUT FORMAT: Return ONLY a valid JSON array. No markdown. No explanation. No extra text.

SCHEMA:
[{
  "id": "unique-string",
  "type": "ONE_OF_TYPES",
  "marks": number,
  "sequenceOrder": number,
  "sectionHeading": "optional string",
  "customHeading": "optional string",
  "content": {
    "questionText": "string",
    "options": ["string"],
    "correctIndex": number,
    "isTrue": boolean,
    "linesRequired": number,
    "pairs": [{"left":"string","right":"string"}],
    "tableData": [["string"]],
    "solutionText": "string"
  }
}]
`.trim();

        // ── Call Gemini ───────────────────────────────────────────────────────────
        const ai = getAI();
        const response = await withRetry(() =>
            ai.models.generateContent({
                model: "gemini-2.5-flash",
                systemInstruction,
                contents: [{ role: "user", parts }],
                config: {
                    responseMimeType: "application/json",
                    // Thinking: allow moderate reasoning for complex exam layouts
                    thinkingConfig: { thinkingBudget: 2048 },
                },
            })
        );

        const output = response.text || "[]";
        let cleaned = output.trim();
        if (cleaned.startsWith("```json")) cleaned = cleaned.slice(7);
        if (cleaned.startsWith("```")) cleaned = cleaned.slice(3);
        if (cleaned.endsWith("```")) cleaned = cleaned.slice(0, -3);

        const parsedQuestions = JSON.parse(cleaned.trim());

        // Safety cleanup: strip any A., B), (c) prefixes the model missed
        const finalQuestions = parsedQuestions.map((q: any) => {
            if (q.type === "MCQ" && Array.isArray(q.content?.options)) {
                q.content.options = q.content.options.map((opt: string) =>
                    opt.replace(/^\s*(?:[a-zA-Z]|[ivxIVX]+)[\.\)\-]\s*/, "").trim()
                );
            }
            return q;
        });

        await prisma.user.update({
            where: { id: session.user.id },
            data: { credits: { decrement: 1 } },
        });

        return NextResponse.json({ questions: finalQuestions });
    } catch (error: any) {
        console.error("AI Parse failed:", error);
        if (error?.status === 429 || error?.message?.includes("429") || error?.message?.includes("quota"))
            return quotaErrorResponse();
        return NextResponse.json({ message: "AI Parsing failed" }, { status: 500 });
    }
}
