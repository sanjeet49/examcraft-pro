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

        // Only the owner or an Admin can publish
        if (paper.userId !== session.user.id && session.user.role === 'TEACHER') {
             return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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
