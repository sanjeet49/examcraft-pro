import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { requireRole, requireSameSchool, rbacErrorResponse } from "@/lib/rbac";
import type { Session } from "next-auth";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions) as Session | null;

        // Must be at least TEACHER (or higher)
        requireRole(session, "TEACHER", "ADMIN", "SUPER_ADMIN", "OWNER");

        const { paperId, newStatus } = await req.json();

        if (!paperId || !newStatus) {
            return NextResponse.json({ message: "Missing required fields" }, { status: 400 });
        }

        const paper = await prisma.paper.findUnique({ where: { id: paperId } });

        if (!paper) {
            return NextResponse.json({ message: "Paper not found" }, { status: 404 });
        }

        const role = session!.user.role;

        // School scope for ADMIN/SUPER_ADMIN — they can only change status of papers in their school
        if ((role === "ADMIN" || role === "SUPER_ADMIN") && paper.schoolId) {
            requireSameSchool(session, paper.schoolId);
        }

        // ── Role-based transition rules ─────────────────────────────────────
        const VALID_TRANSITIONS: Record<string, { from: string[]; to: string[] }> = {
            TEACHER: {
                from: ["DRAFT"],
                to: ["PENDING_ADMIN"],
            },
            ADMIN: {
                from: ["PENDING_ADMIN"],
                to: ["PENDING_SUPERADMIN", "REJECTED", "DRAFT"],
            },
            SUPER_ADMIN: {
                from: ["PENDING_SUPERADMIN", "PENDING_ADMIN"],
                to: ["APPROVED", "REJECTED", "DRAFT"],
            },
            OWNER: {
                from: ["*"], // Owner can set any status
                to: ["*"],
            },
        };

        if (role === "TEACHER") {
            if (paper.userId !== session!.user.id) {
                return NextResponse.json({ message: "You can only submit your own papers." }, { status: 403 });
            }
            if (!VALID_TRANSITIONS.TEACHER.from.includes(paper.status) ||
                !VALID_TRANSITIONS.TEACHER.to.includes(newStatus)) {
                return NextResponse.json(
                    { message: `Teachers can only submit DRAFT papers to PENDING_ADMIN. Current status: ${paper.status}` },
                    { status: 403 }
                );
            }
        } else if (role === "ADMIN") {
            if (!VALID_TRANSITIONS.ADMIN.to.includes(newStatus)) {
                return NextResponse.json(
                    { message: `Admins can only approve to PENDING_SUPERADMIN or reject. Got: ${newStatus}` },
                    { status: 403 }
                );
            }
        } else if (role === "SUPER_ADMIN") {
            if (!VALID_TRANSITIONS.SUPER_ADMIN.to.includes(newStatus)) {
                return NextResponse.json(
                    { message: `Super Admins can set APPROVED, REJECTED, or DRAFT. Got: ${newStatus}` },
                    { status: 403 }
                );
            }
        }
        // OWNER has no restrictions

        await prisma.paper.update({
            where: { id: paperId },
            data: { status: newStatus },
        });

        return NextResponse.json(
            { message: "Paper status updated successfully", status: newStatus },
            { status: 200 }
        );
    } catch (error) {
        const rbacRes = rbacErrorResponse(error);
        if (rbacRes) return rbacRes;
        console.error("Error updating paper status:", error);
        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
}
