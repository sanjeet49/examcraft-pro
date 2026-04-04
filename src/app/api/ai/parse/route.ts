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

        // ── Pre-clean pasted text (strip citation markers from tools like Gemini Deep Research) ──
        const cleanText = (raw: string) =>
            raw
                .replace(/\[cite_start\]/gi, "")
                .replace(/\[cite_end\]/gi, "")
                .replace(/\[cite:\s*[\d,\s]+\]/gi, "")
                .replace(/\*\*\[cite:[^\]]*\]\*\*/gi, "")
                .trim();

        if (text) parts.push({ text: `Raw Instructions from User:\n${cleanText(text)}` });
        if (extractedDocxText) parts.push({ text: cleanText(extractedDocxText) });

        // ── System Instruction ────────────────────────────────────────────────────
        const systemInstruction = `
You are an expert AI exam extractor for teachers on the ExamCraft Pro platform.

Your ONLY job is to parse the provided content and return a perfectly structured JSON array of question objects.
You MUST follow every rule below with zero deviation.

QUESTION TYPES allowed: MCQ, TF, DESCRIPTIVE, MATCH, MAP, FILL_IN_THE_BLANKS, DATA_TABLE, SHORT_ANSWER, LONG_ANSWER, CUSTOM.

CLEANUP RULES (apply BEFORE anything else):
- STRIP all citation/annotation markers such as [cite_start], [cite_end], [cite: N], [cite: N, M], **[cite: ...]**, etc. These are NOT part of the question.
- STRIP any bold markdown wrappers (**text** → text) from question text.
- STRIP any leading numbering like "1.", "Q1.", "Question 1:" from questionText — the sequence order number handles that.
- The cleaned question text must read naturally as a student would see it.

HEADING RULES:
- Top-level section titles (e.g. "Section A", "Section 1: Basics") → extract into "sectionHeading"
- Sub-instructions beneath them (e.g. "Choose the correct option") → extract into "customHeading"
- Propagate BOTH fields to every child question in that group.

MARKS RULES:
- Divide group marks evenly among children. Every question MUST have marks > 0 (except CUSTOM type).
- Default to 1 mark if unspecified.

CONTENT RULES:
- MCQ options: strip letter/number prefixes (A., B), iv.) from the options array values.
- Fill-in-the-blank sentences: use "___" as the blank placeholder.
- MATCH sections: combine ALL pairs into ONE question object with pairs:[{left,right}].
- DATA_TABLE: use tableData: string[][] for tabular data.
- Reading comprehension passages: use CUSTOM type with 0 marks.
- If an answer/solution is visible in the text → place it in "solutionText".
- For MCQs with a known correct answer → also set "correctIndex" (0-based).
- sequenceOrder starts at 1 and increments continuously across all sections.
- Math formulas: wrap in $...$ (inline) or $$...$$ (block) with double-escaped backslashes.

OUTPUT FORMAT: Return ONLY a valid JSON array. No markdown fences. No explanation. No extra text outside the array.

SCHEMA per question object:
{
  "id": "unique-string",
  "type": "ONE_OF_ALLOWED_TYPES",
  "marks": number,
  "sequenceOrder": number,
  "sectionHeading": "optional string or null",
  "customHeading": "optional string or null",
  "content": {
    "questionText": "clean question string with NO citation markers",
    "options": ["option text only, no A/B/C prefix"],
    "correctIndex": number_or_null,
    "isTrue": boolean_or_null,
    "linesRequired": number_or_null,
    "pairs": [{"left":"string","right":"string"}],
    "tableData": [["string"]],
    "solutionText": "string or null"
  }
}
`.trim();

        // ── Call Gemini ───────────────────────────────────────────────────────────
        const ai = getAI();
        const response = await withRetry(() =>
            ai.models.generateContent({
                model: "gemini-2.5-flash",
                contents: [{ role: "user", parts }],
                config: {
                    systemInstruction,
                    responseMimeType: "application/json",
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
