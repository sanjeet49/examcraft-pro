import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { getAI, withRetry, quotaErrorResponse } from "@/lib/gemini";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const body = await req.json();
        const { submissionId, questionId } = body;

        if (!submissionId || !questionId)
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });

        const submission = await prisma.studentSubmission.findUnique({
            where: { id: submissionId },
            include: { paper: { include: { questions: true } } },
        });

        if (!submission) return NextResponse.json({ error: "Submission not found" }, { status: 404 });

        const isOwner = submission.paper.userId === session.user.id;
        const isAdmin = session.user.role === "ADMIN" || session.user.role === "SUPER_ADMIN";
        if (!isOwner && !isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

        const question = submission.paper.questions.find((q) => q.id === questionId);
        if (!question) return NextResponse.json({ error: "Question not found in paper" }, { status: 404 });

        const content: any = question.content;
        const studentResponses = submission.responses as Record<string, any>;
        const studentAnswer = studentResponses[questionId];

        if (!studentAnswer || String(studentAnswer).trim() === "")
            return NextResponse.json({ error: "Student did not provide an answer" }, { status: 400 });

        // ── System Instruction ────────────────────────────────────────────────────
        const systemInstruction = `
You are a strict but fair academic examiner evaluating student answers on ExamCraft Pro.

Your evaluation must be:
- Academically accurate: judge only on subject knowledge, not writing style
- Concise: feedback must be 1–3 sentences max, addressed directly to the teacher reviewing it
- Precise: awarded marks must be a number (integer or decimal like 2.5), never exceed max marks, never be negative

OUTPUT FORMAT: Return ONLY a valid JSON object with this exact schema. No markdown. No extra text.
{ "suggestedMarks": number, "explanation": "string" }
`.trim();

        const userPrompt = `
Question: ${content.questionText || "Provide an explanation based on typical knowledge."}
Max Marks: ${question.marks}
Answer Key / Solution Strategy: ${content.answerKey || content.solutionText || "None provided — use expert domain knowledge and academic standards."}
Student's Answer: "${studentAnswer}"
`.trim();

        // ── Call Gemini ───────────────────────────────────────────────────────────
        const ai = getAI();
        const response = await withRetry(() =>
            ai.models.generateContent({
                model: "gemini-2.5-flash",
                systemInstruction,
                contents: [{ role: "user", parts: [{ text: userPrompt }] }],
                config: {
                    responseMimeType: "application/json",
                    temperature: 0.1, // Very deterministic — grading must be consistent
                    // Thinking: allow deep reasoning for fair, accurate marks
                    thinkingConfig: { thinkingBudget: 1024 },
                },
            })
        );

        let outputText = (response.text || "").trim();
        outputText = outputText.replace(/^```json\s*/, "").replace(/```$/, "").trim();

        const aiFeedback = JSON.parse(outputText);

        // Persist feedback alongside existing feedback for other questions
        const existing = ((submission as any).aiFeedback as Record<string, any>) || {};
        existing[questionId] = {
            suggestedMarks: aiFeedback.suggestedMarks,
            explanation: aiFeedback.explanation,
            timestamp: new Date().toISOString(),
        };

        await prisma.studentSubmission.update({
            where: { id: submissionId },
            data: { aiFeedback: existing } as any,
        });

        return NextResponse.json({ success: true, feedback: existing[questionId] });
    } catch (error: any) {
        console.error("AI Grading Error:", error);
        if (error?.status === 429 || error?.message?.includes("429") || error?.message?.includes("quota"))
            return quotaErrorResponse();
        return NextResponse.json({ error: error.message || "Failed to generate AI grading" }, { status: 500 });
    }
}
