import { Session } from "next-auth";

// ─── Role Hierarchy ────────────────────────────────────────────────────────────
export const ROLE_HIERARCHY: Record<string, number> = {
    OWNER: 4,
    SUPER_ADMIN: 3,
    ADMIN: 2,
    TEACHER: 1,
};

// ─── Custom Errors ─────────────────────────────────────────────────────────────
export class UnauthorizedError extends Error {
    status = 401;
    constructor(message = "Unauthorized — please log in") {
        super(message);
        this.name = "UnauthorizedError";
    }
}

export class ForbiddenError extends Error {
    status = 403;
    constructor(message = "Forbidden — insufficient permissions") {
        super(message);
        this.name = "ForbiddenError";
    }
}

// ─── Guard Helpers ─────────────────────────────────────────────────────────────

/**
 * Throws if session is missing or the user doesn't have one of the required roles.
 */
export const requireRole = (session: Session | null, ...roles: string[]) => {
    if (!session?.user) throw new UnauthorizedError();
    if (!session.user.isActive) {
        throw new ForbiddenError("Your account has been revoked.");
    }
    if (!roles.includes(session.user.role)) {
        throw new ForbiddenError(
            `Requires one of: ${roles.join(", ")}. Your role: ${session.user.role}`
        );
    }
};

/**
 * Throws if the session user is not in the same school as targetSchoolId.
 * OWNER bypasses this check (sees all schools).
 */
export const requireSameSchool = (session: Session | null, targetSchoolId: string) => {
    if (!session?.user) throw new UnauthorizedError();
    if (session.user.role === "OWNER") return; // Owner sees all
    if ((session.user as any).schoolId !== targetSchoolId) {
        throw new ForbiddenError("You can only manage users within your own school.");
    }
};

/**
 * Throws if the caller's role is not strictly higher than the target role.
 * Prevents privilege escalation (e.g. ADMIN cannot approve another ADMIN).
 */
export const requireHigherRole = (callerRole: string, targetRole: string) => {
    const callerLevel = ROLE_HIERARCHY[callerRole] ?? 0;
    const targetLevel = ROLE_HIERARCHY[targetRole] ?? 0;
    if (callerLevel <= targetLevel) {
        throw new ForbiddenError(
            `You cannot manage a user with role ${targetRole}. Your role (${callerRole}) must be strictly higher.`
        );
    }
};

/**
 * Returns a Next.js JSON error response from an RBAC error.
 */
export const rbacErrorResponse = (error: unknown) => {
    const { NextResponse } = require("next/server");
    if (error instanceof UnauthorizedError) {
        return NextResponse.json({ message: error.message }, { status: 401 });
    }
    if (error instanceof ForbiddenError) {
        return NextResponse.json({ message: error.message }, { status: 403 });
    }
    return null;
};
