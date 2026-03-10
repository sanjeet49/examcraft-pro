import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);

        const { paperId, newStatus } = await req.json();

        if (!paperId || !newStatus) {
            return NextResponse.json({ message: "Missing required fields" }, { status: 400 });
        }

        const paper = await prisma.paper.findUnique({
            where: { id: paperId }
        });

        if (!paper) {
            return NextResponse.json({ message: "Paper not found" }, { status: 404 });
        }

        // Logic check: Teachers can only promote FROM Draft TO Pending Admin.
        if (session?.user?.role === "TEACHER") {
            if (paper.userId !== session.user.id) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
            if (newStatus !== "PENDING_ADMIN" || paper.status !== "DRAFT") {
                return NextResponse.json({ message: "Invalid status transition for teacher" }, { status: 403 });
            }
        }
        else if (session?.user?.role === "ADMIN") {
            if (newStatus !== "PENDING_SUPERADMIN" && newStatus !== "REJECTED" && newStatus !== "DRAFT" && newStatus !== "APPROVED") {
                return NextResponse.json({ message: "Invalid status transition for admin" }, { status: 403 });
            }
        }
        else if (session?.user?.role === "SUPER_ADMIN") {
            // Can do anything, typically moving to APPROVED or REJECTED.
        } else {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        await prisma.paper.update({
            where: { id: paperId },
            data: { status: newStatus }
        });

        return NextResponse.json({ message: "Paper status updated successfully", status: newStatus }, { status: 200 });

    } catch (error) {
        console.error("Error updating paper status:", error);
        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
}
