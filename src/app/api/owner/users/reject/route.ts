import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || session.user.role !== "OWNER") {
            return NextResponse.json({ message: "Unauthorized — OWNER access required" }, { status: 403 });
        }

        const { userId } = await req.json();
        if (!userId) {
            return NextResponse.json({ message: "User ID required" }, { status: 400 });
        }

        const target = await prisma.user.findUnique({
            where: { id: userId },
            select: { role: true, isApproved: true }
        });

        if (!target) {
            return NextResponse.json({ message: "User not found" }, { status: 404 });
        }

        if (target.role !== "SUPER_ADMIN" || target.isApproved) {
            return NextResponse.json({ message: "Can only reject pending Super Admins" }, { status: 400 });
        }

        // Marking as inactive essentially soft-deletes the application
        // They will not be able to log in or proceed further.
        await prisma.user.update({
            where: { id: userId },
            data: {
                isActive: false,
                revokedBy: session.user.id,
                revokedAt: new Date(),
            }
        });

        return NextResponse.json({ message: "Super Admin KYC rejected." }, { status: 200 });
    } catch (error) {
        console.error("Owner reject error:", error);
        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
}
