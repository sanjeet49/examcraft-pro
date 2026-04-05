import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { requireRole, requireSameSchool, requireHigherRole, rbacErrorResponse } from "@/lib/rbac";
import type { Session } from "next-auth";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions) as Session | null;
        requireRole(session, "ADMIN", "SUPER_ADMIN", "OWNER");

        const { userId } = await req.json();
        if (!userId) {
            return NextResponse.json({ message: "User ID required" }, { status: 400 });
        }

        const target = await prisma.user.findUnique({
            where: { id: userId },
            select: { role: true, schoolId: true, isActive: true }
        });

        if (!target) {
            return NextResponse.json({ message: "User not found" }, { status: 404 });
        }

        if (target.schoolId) {
            requireSameSchool(session, target.schoolId);
        }

        requireHigherRole(session!.user.role, target.role);

        // For TEACHER/ADMIN revocation: soft-delete
        await prisma.user.update({
            where: { id: userId },
            data: {
                isActive: false,
                revokedBy: session!.user.id,
                revokedAt: new Date(),
            }
        });

        return NextResponse.json({ message: "User access revoked. Account is now read-only." }, { status: 200 });
    } catch (error) {
        const rbacRes = rbacErrorResponse(error);
        if (rbacRes) return rbacRes;
        console.error("Revoke error:", error);
        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
}
