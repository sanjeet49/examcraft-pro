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
            select: { role: true, schoolId: true }
        });

        if (!target) {
            return NextResponse.json({ message: "User not found" }, { status: 404 });
        }

        if (target.role !== "SUPER_ADMIN") {
            return NextResponse.json({ message: "This endpoint only revokes SUPER_ADMINs" }, { status: 400 });
        }

        // Safety check: ensure this school still has at least one other active SUPER_ADMIN
        if (target.schoolId) {
            const otherActiveSA = await prisma.user.count({
                where: {
                    schoolId: target.schoolId,
                    role: "SUPER_ADMIN",
                    isActive: true,
                    id: { not: userId }
                }
            });

            if (otherActiveSA === 0) {
                return NextResponse.json({
                    message: "Cannot revoke — this is the only active Super Admin for this school. Please promote another Super Admin first."
                }, { status: 409 });
            }
        }

        await prisma.user.update({
            where: { id: userId },
            data: {
                isActive: false,
                revokedBy: session.user.id,
                revokedAt: new Date(),
            }
        });

        return NextResponse.json({ message: "Super Admin revoked. Account is now read-only." }, { status: 200 });
    } catch (error) {
        console.error("Owner revoke error:", error);
        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
}
