import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { getAI, withRetry, quotaErrorResponse } from "@/lib/gemini";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

        const user = await prisma.user.findUnique({ 
            where: { id: session.user.id },
            include: { school: true }
        });
        
        let availableCredits = 0;
        if (user?.role === "OWNER") availableCredits = 999999;
        else if (user?.school) availableCredits = user.school.credits;

        if (!user || availableCredits <= 0)
            return NextResponse.json({ message: "Insufficient school credits to use AI." }, { status: 403 });

        const body = await req.json();
        const { questions } = body;

        if (!questions || !Array.isArray(questions) || questions.length === 0)
            return NextResponse.json({ message: "Invalid or empty questions array provided." }, { status: 400 });

        // ── System Instruction ────────────────────────────────────────────────────
        const systemInstruction = `
You are an expert Anti-Cheat Exam Variant Generator for the ExamCraft Pro platform.

Your job is to rewrite a JSON array of exam questions ("Set A") into a completely different but equivalent "Set B".

STRICT RULES:
1. Return exactly the same number of questions in the array.
2. Preserve the exact same "type", "marks", "sectionHeading", "customHeading" for every question.
3. Change the physical scenario, names, vocabulary, reading passages, and numerical values so students cannot copy.
4. MCQ: provide 4 brand-new options relevant to the new question; update "correctIndex". Never shuffle old options.
5. MATCH: create entirely new left/right concept pairs on the same topic.
6. DATA_TABLE: generate a new table with different column values.
7. If the original has "solutionText", generate an equivalent one for the new variant. Never drop solutions.
8. FOR MCQs: "questionText" must NOT contain the options. Options go only into the "options" array.
9. Image placeholders like [Not visible] or [Image] must be preserved exactly.

OUTPUT FORMAT: Return ONLY a valid JSON array. No markdown. No explanation. No extra text.
`.trim();

        // ── Call Gemini ───────────────────────────────────────────────────────────
        const ai = getAI();
        const response = await withRetry(() =>
            ai.models.generateContent({
                model: "gemini-2.5-flash",
                systemInstruction,
                contents: [
                    {
                        role: "user",
                        parts: [
                            {
                                text: `Original Set A JSON Array:\n${JSON.stringify(questions, null, 2)}`,
                            },
                        ],
                    },
                ],
                config: {
                    responseMimeType: "application/json",
                    // Thinking: enable for better variant quality (avoids subtle copy-paste)
                    thinkingConfig: { thinkingBudget: 3072 },
                },
            })
        );

        const output = response.text || "[]";
        let cleaned = output.trim();
        if (cleaned.startsWith("```json")) cleaned = cleaned.slice(7);
        if (cleaned.startsWith("```")) cleaned = cleaned.slice(3);
        if (cleaned.endsWith("```")) cleaned = cleaned.slice(0, -3);

        const parsedVariantQuestions = JSON.parse(cleaned.trim());

        if (user.role !== "OWNER" && user.schoolId) {
            await prisma.school.update({
                where: { id: user.schoolId },
                data: { credits: { decrement: 1 } },
            });
        }

        return NextResponse.json({ questions: parsedVariantQuestions });
    } catch (error: any) {
        console.error("AI Variant Generation failed:", error);
        if (error?.status === 429 || error?.message?.includes("429") || error?.message?.includes("quota"))
            return quotaErrorResponse();
        return NextResponse.json({ message: "AI Variant Generation failed" }, { status: 500 });
    }
}
