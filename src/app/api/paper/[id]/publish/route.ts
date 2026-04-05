import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

export async function POST(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;
        const body = await req.json();
        const { isPublishedOnline } = body;

        if (typeof isPublishedOnline !== 'boolean') {
            return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
        }

        const paper = await prisma.paper.findUnique({
            where: { id }
        });

        if (!paper) {
            return NextResponse.json({ error: "Paper not found" }, { status: 404 });
        }

        const role = session.user.role;

        // TEACHER can only publish their own papers
        if (role === "TEACHER" && paper.userId !== session.user.id) {
            return NextResponse.json({ error: "Forbidden — not your paper" }, { status: 403 });
        }

        // ADMIN/SUPER_ADMIN can publish papers in their school only
        if ((role === "ADMIN" || role === "SUPER_ADMIN") && paper.schoolId) {
            const callerSchoolId = (session.user as any).schoolId as string | null;
            if (callerSchoolId !== paper.schoolId) {
                return NextResponse.json({ error: "Forbidden — paper is in a different school" }, { status: 403 });
            }
        }

        const updatedPaper = await prisma.paper.update({
            where: { id },
            data: { isPublishedOnline }
        });

        return NextResponse.json({
            success: true,
            isPublishedOnline: updatedPaper.isPublishedOnline
        });
    } catch (error: any) {
        console.error("Publishing error:", error);
        return NextResponse.json({ error: "Failed to update publication status" }, { status: 500 });
    }
}
