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
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { submissionId, questionId } = body;

        if (!submissionId || !questionId) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const submission = await prisma.studentSubmission.findUnique({
            where: { id: submissionId },
            include: {
                paper: {
                    include: { questions: true }
                }
            }
        });

        if (!submission) {
            return NextResponse.json({ error: "Submission not found" }, { status: 404 });
        }

        // Verify authorization
        if (submission.paper.userId !== session.user.id && session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const question = submission.paper.questions.find(q => q.id === questionId);
        if (!question) {
            return NextResponse.json({ error: "Question not found in paper" }, { status: 404 });
        }

        const content: any = question.content;
        const studentResponses = submission.responses as Record<string, any>;
        const studentAnswer = studentResponses[questionId];

        if (!studentAnswer || studentAnswer.trim() === "") {
            return NextResponse.json({ error: "Student did not provide an answer" }, { status: 400 });
        }

        const prompt = `You are an expert strict teacher evaluating a student's answer for a SaaS application ExamCraft Pro.

Question: ${content.questionText || "Provide an explanation based on typical knowledge."}
Max Marks Available: ${question.marks}
Teacher's Answer Key / Solution Strategy: ${content.answerKey || "None provided. Use your expert domain knowledge and typical academic standards."}

Student's Answer:
"${studentAnswer}"

Evaluate the student's answer fairly but strictly. Assign a suggested score out of the max marks (can be integer or decimal, e.g. 2.5). 
Provide a short 1-3 sentence explanation directly addressing the student's errors or praising their completeness, intended for the teacher to review.

Return strictly as a JSON object with this exact schema. Do not use markdown backticks around the JSON.
{
  "suggestedMarks": number,
  "explanation": "string"
}`;

        const genAI = getAI();
        const response = await genAI.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                temperature: 0.1, // Strict, deterministic output
                responseMimeType: "application/json"
            }
        });

        let outputText = response.text || "";
        let aiFeedback;
        
        try {
            // Strip any accidental markdown formatting if the model disobeys
            outputText = outputText.replace(/^```json\s*/, '').replace(/```$/, '');
            aiFeedback = JSON.parse(outputText);
        } catch (parseError) {
            console.error("Failed to parse Gemini JSON:", outputText);
            return NextResponse.json({ error: "Failed to parse AI response" }, { status: 500 });
        }

        // Safely cache this feedback into the database
        const existingAIFeedback = (submission as any).aiFeedback ? ((submission as any).aiFeedback as Record<string, any>) : {};
        
        existingAIFeedback[questionId] = {
            suggestedMarks: aiFeedback.suggestedMarks,
            explanation: aiFeedback.explanation,
            timestamp: new Date().toISOString()
        };

        await prisma.studentSubmission.update({
            where: { id: submissionId },
            data: { aiFeedback: existingAIFeedback } as any
        });

        return NextResponse.json({ 
            success: true, 
            feedback: existingAIFeedback[questionId] 
        });

    } catch (error: any) {
        console.error("AI Grading Error:", error);
        
        if (error?.status === 429 || error?.message?.includes("429") || error?.message?.includes("quota")) {
            return NextResponse.json({ error: "Google AI Free Tier Limit Reached. Please wait a minute or upgrade API key." }, { status: 429 });
        }

        return NextResponse.json({ error: error.message || "Failed to generate AI grading" }, { status: 500 });
    }
}
