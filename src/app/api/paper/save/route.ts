import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { metadata, questions } = body;

        if (!metadata || !questions || !Array.isArray(questions)) {
            return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
        }

        // Validate date
        let paperDate = new Date();
        if (metadata.date) {
            paperDate = new Date(metadata.date);
            if (isNaN(paperDate.getTime())) {
                paperDate = new Date(); // fallback
            }
        }

        // Create paper and questions in a transaction
        const paper = await prisma.paper.create({
            data: {
                userId: session.user.id,
                schoolName: metadata.schoolName || "Unnamed School",
                subject: metadata.subject || "General",
                examName: metadata.examName || "Untitled Exam",
                totalMarks: Number(metadata.totalMarks) || 100,
                date: paperDate,
                layoutSettings: {
                    instructions: metadata.instructions || "",
                    standard: metadata.standard || "",
                    timeAllowed: metadata.timeAllowed || "",
                    showStudentInfo: metadata.showStudentInfo !== false
                },
                questions: {
                    create: questions.map((q: any, index: number) => ({
                        type: q.type,
                        content: q.content,
                        marks: Number(q.marks) || 1,
                        sequenceOrder: q.sequenceOrder || index + 1,
                        customHeading: q.customHeading || null,
                        hasOr: Boolean(q.hasOr)
                    }))
                }
            },
            include: {
                questions: true
            }
        });

        return NextResponse.json({ success: true, paper });

    } catch (error) {
        console.error("Error saving paper:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
