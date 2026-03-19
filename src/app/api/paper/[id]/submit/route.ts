import { NextResponse } from 'next/server';
import { prisma } from "@/lib/prisma";

export async function POST(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: paperId } = await params;
        const body = await req.json();
        const { studentName, rollNo, division, responses } = body;

        if (!studentName || !responses) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        // Fetch the Paper to ensure it's online and grab questions for auto-grading
        const paper = await prisma.paper.findUnique({
            where: { id: paperId },
            include: { questions: true }
        });

        if (!paper) {
            return NextResponse.json({ error: "Test not found." }, { status: 404 });
        }

        if (!paper.isPublishedOnline) {
             return NextResponse.json({ error: "Test is currently closed." }, { status: 403 });
        }

        let totalScore = 0;

        // --- THE AUTO GRADING ENGINE ---
        paper.questions.forEach((q) => {
            const studentAnswer = responses[q.id];
            if (studentAnswer === undefined || studentAnswer === null) return; // skipped

            const content: any = q.content;
            let isCorrect = false;

            if (q.type === "MCQ") {
                if (typeof content.correctIndex === 'number') {
                    if (studentAnswer === content.correctIndex) {
                        isCorrect = true;
                    }
                }
            } else if (q.type === "TF") {
                if (typeof content.isTrue === 'boolean') {
                    if (studentAnswer === content.isTrue) {
                        isCorrect = true;
                    }
                }
            }
            // Future logic for Fill in Blanks or custom string matching could safely go here.

            if (isCorrect) {
                 totalScore += q.marks;
            }
        });

        // Save safely into DB
        const submission = await prisma.studentSubmission.create({
            data: {
                paperId,
                studentName: studentName.trim(),
                rollNo: rollNo?.trim() || null,
                division: division?.trim() || null,
                responses: responses,
                totalScore: totalScore
            }
        });

        return NextResponse.json({
            success: true,
            submissionId: submission.id,
            autoGradedScore: totalScore
        });

    } catch (error: any) {
        console.error("Submission API Error:", error);
        return NextResponse.json({ error: "Failed to submit test" }, { status: 500 });
    }
}
