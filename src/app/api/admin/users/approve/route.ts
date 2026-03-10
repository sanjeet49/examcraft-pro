import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN")) {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        const { userId } = await req.json();

        if (!userId) {
            return NextResponse.json({ message: "User ID required" }, { status: 400 });
        }

        await prisma.user.update({
            where: { id: userId },
            data: { isApproved: true }
        });

        return NextResponse.json({ message: "User approved successfully" }, { status: 200 });
    } catch (error) {
        console.error("Error approving user:", error);
        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
}
