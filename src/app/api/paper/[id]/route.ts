import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const session = await getServerSession(authOptions);
        if (!session || !session.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const paper = await prisma.paper.findUnique({
            where: { id },
            include: { questions: { orderBy: { sequenceOrder: 'asc' } } }
        });

        if (!paper) {
            return NextResponse.json({ error: "Not found" }, { status: 404 });
        }

        if (paper.userId !== session.user.id && session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        return NextResponse.json({ paper });
    } catch (error) {
        console.error("Error fetching paper:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const session = await getServerSession(authOptions);
        if (!session || !session.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const existingPaper = await prisma.paper.findUnique({ where: { id } });
        if (!existingPaper) return NextResponse.json({ error: "Not found" }, { status: 404 });
        if (existingPaper.userId !== session.user.id && session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const body = await req.json();
        const { metadata, questions } = body;

        let paperDate = new Date();
        if (metadata.date) {
            paperDate = new Date(metadata.date);
            if (isNaN(paperDate.getTime())) paperDate = new Date();
        }

        // Use a transaction: Delete all existing questions, update paper, insert new questions
        const updatedPaper = await prisma.$transaction(async (tx) => {
            await tx.question.deleteMany({ where: { paperId: id } });

            return await tx.paper.update({
                where: { id },
                data: {
                    schoolName: metadata.schoolName || "Unnamed School",
                    subject: metadata.subject || "General",
                    examName: metadata.examName || "Untitled Exam",
                    totalMarks: Number(metadata.totalMarks) || 100,
                    date: paperDate,
                    timeLimit: metadata.timeLimit ? Number(metadata.timeLimit) : null,
                    layoutSettings: (() => {
                        const l = { ...metadata };
                        ['schoolName', 'subject', 'examName', 'totalMarks', 'date', 'timeLimit', 'isPublishedOnline'].forEach(k => delete (l as any)[k]);
                        l.instructions = metadata.instructions || "";
                        l.standard = metadata.standard || "";
                        l.timeAllowed = metadata.timeAllowed || "";
                        l.showStudentInfo = metadata.showStudentInfo !== false;
                        return l;
                    })(),
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
                include: { questions: true }
            });
        });

        return NextResponse.json({ success: true, paper: updatedPaper });
    } catch (error) {
        console.error("Error updating paper:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const session = await getServerSession(authOptions);
        if (!session || !session.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const existingPaper = await prisma.paper.findUnique({ where: { id } });
        if (!existingPaper) return NextResponse.json({ error: "Not found" }, { status: 404 });
        if (existingPaper.userId !== session.user.id && session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        await prisma.paper.delete({
            where: { id }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error deleting paper:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
