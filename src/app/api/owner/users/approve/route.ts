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

        if (target.role !== "SUPER_ADMIN") {
            return NextResponse.json({ message: "This endpoint only approves SUPER_ADMINs" }, { status: 400 });
        }

        await prisma.user.update({
            where: { id: userId },
            data: {
                isApproved: true,
                approvedBy: session.user.id,
                approvedAt: new Date(),
            }
        });

        return NextResponse.json({ message: "Super Admin approved successfully" }, { status: 200 });
    } catch (error) {
        console.error("Owner approve error:", error);
        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
}
