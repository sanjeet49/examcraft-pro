import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { notFound, redirect } from "next/navigation";
import StudentReportView from "@/components/dashboard/StudentReportView";

export default async function StudentReportPage({ params }: { params: Promise<{ id: string, submissionId: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.id) {
        redirect("/login");
    }

    const { id: paperId, submissionId } = await params;

    const paper = await prisma.paper.findUnique({
        where: { id: paperId },
        include: {
            questions: {
                orderBy: { sequenceOrder: 'asc' }
            }
        }
    });

    if (!paper) {
        notFound();
    }

    // Security: Only the creator or an Admin can view submissions
    if (paper.userId !== session.user.id && session.user.role === 'TEACHER') {
        redirect("/dashboard");
    }

    const submission = await prisma.studentSubmission.findUnique({
        where: { id: submissionId }
    });

    if (!submission || submission.paperId !== paper.id) {
        notFound();
    }

    return (
        <StudentReportView paper={paper} submission={submission} />
    );
}
