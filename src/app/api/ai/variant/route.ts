import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

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

        const body = await req.json();
        const { questions } = body;

        if (!questions || !Array.isArray(questions) || questions.length === 0) {
            return NextResponse.json({ message: "Invalid or empty questions array provided." }, { status: 400 });
        }

        const prompt = `
    You are an expert Anti-Cheat Exam Generator for teachers. 
    The user is providing you with a JSON array of questions that represent "Set A" of an exam.
    
    Your job is to completely rewrite this entire JSON array to create "Set B". 
    
    CRITICAL RULES FOR SET B:
    1. You MUST return exactly the same number of questions in the array.
    2. Every new question in Set B must test the EXACT SAME concept, skill, and difficulty level as its corresponding question in Set A.
    3. You MUST maintain the exact same \`type\`, \`marks\`, \`sectionHeading\`, and \`customHeading\` parameters for every question! Do not alter the structure of the exam.
    4. FOR MCQs: Cleanly separate the question text from its options! The \`questionText\` MUST NOT contain the options themselves (e.g., if the raw text is "What is X? A. 1 B. 2", \`questionText\` must be JUST "What is X?" and \`options\` must be ["A. 1", "B. 2"]). DO NOT include the options inside the \`questionText\` string.
    5. Keep image placeholders like [Not visible] or [Image] exactly as they appear in the original text.
    6. You MUST CHANGE the physical scenario, the names, the vocabulary, the reading passages, and the numerical values in math/physics equations so that a student looking at Set B cannot copy the answer from a student looking at Set A.
    7. For MCQ types, you MUST provide 4 new options that make sense for your new question, and update the \`correctIndex\`. Do not shuffle the old options, create brand new ones.
    8. For MATCH types, you must come up with completely new left/right pair concepts that test the same subject matter.
    9. For DATA_TABLE types, generate a new table of data with different column values.
    10. PRE-SOLVED NOTES PRESERVATION: If the original Set A question object contains a \`solutionText\`, you MUST generate an equivalent \`solutionText\` for your new Set B question! Do not drop the solutions if they exist in Set A.
    
    Return ONLY a valid JSON array. Do not include markdown formatting like \`\`\`json.
    
    Original Set A JSON Array:
    ${JSON.stringify(questions, null, 2)}
    `;

        const aiClient = getAI();
        const response = await aiClient.models.generateContent({
            model: "gemini-2.5-flash",
            contents: [{ text: prompt }],
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

        const parsedVariantQuestions = JSON.parse(cleanedOutput.trim());

        // Deduct 1 generation credit on success!
        await prisma.user.update({
            where: { id: session.user.id },
            data: { credits: { decrement: 1 } }
        });

        return NextResponse.json({ questions: parsedVariantQuestions });
    } catch (error: any) {
        console.error("AI Variant Generation failed:", error);

        // Check for Rate Limit / Quota Exceeded from Google API
        if (error?.status === 429 || error?.message?.includes("429") || error?.message?.includes("quota")) {
            return NextResponse.json({
                message: "Google AI Free Tier Limit Reached. Please wait 1 minute before trying again, or upgrade your Gemini API key."
            }, { status: 429 });
        }

        return NextResponse.json({ message: "AI Variant Generation failed" }, { status: 500 });
    }
}
