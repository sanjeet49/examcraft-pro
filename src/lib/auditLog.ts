/**
 * Admin Audit Logger
 *
 * Logs all administrative actions (user approvals, paper status changes, etc.)
 * with timestamps, actor, and action details.
 *
 * Currently writes to server console in structured JSON format.
 * In production, this can be extended to write to a database table or
 * external logging service (e.g., Datadog, Logtail).
 */

export interface AuditLogEntry {
    timestamp: string;
    action: string;
    actor: {
        id: string;
        email?: string;
        role: string;
    };
    target: {
        type: "USER" | "PAPER" | "SYSTEM";
        id: string;
        details?: Record<string, any>;
    };
    metadata?: Record<string, any>;
}

/**
 * Log an administrative action.
 */
export function logAuditEvent(entry: AuditLogEntry): void {
    const logEntry = {
        ...entry,
        timestamp: new Date().toISOString(),
        _type: "AUDIT_LOG",
    };

    // Structured JSON logging — easily parseable by log aggregation tools
    console.log(JSON.stringify(logEntry));
}

/**
 * Pre-built audit event creators for common actions
 */
export const AuditEvents = {
    userApproved: (
        actorId: string,
        actorRole: string,
        targetUserId: string
    ): AuditLogEntry => ({
        timestamp: new Date().toISOString(),
        action: "USER_APPROVED",
        actor: { id: actorId, role: actorRole },
        target: { type: "USER", id: targetUserId },
    }),

    paperStatusChanged: (
        actorId: string,
        actorRole: string,
        paperId: string,
        oldStatus: string,
        newStatus: string
    ): AuditLogEntry => ({
        timestamp: new Date().toISOString(),
        action: "PAPER_STATUS_CHANGED",
        actor: { id: actorId, role: actorRole },
        target: {
            type: "PAPER",
            id: paperId,
            details: { oldStatus, newStatus },
        },
    }),

    userRegistered: (userId: string, email: string): AuditLogEntry => ({
        timestamp: new Date().toISOString(),
        action: "USER_REGISTERED",
        actor: { id: userId, role: "TEACHER" },
        target: { type: "USER", id: userId, details: { email } },
    }),

    creditsAdded: (
        userId: string,
        amount: number,
        newBalance: number
    ): AuditLogEntry => ({
        timestamp: new Date().toISOString(),
        action: "CREDITS_ADDED",
        actor: { id: userId, role: "SYSTEM" },
        target: {
            type: "USER",
            id: userId,
            details: { amount, newBalance },
        },
    }),

    paperPublished: (
        actorId: string,
        actorRole: string,
        paperId: string,
        isPublished: boolean
    ): AuditLogEntry => ({
        timestamp: new Date().toISOString(),
        action: isPublished ? "PAPER_PUBLISHED" : "PAPER_UNPUBLISHED",
        actor: { id: actorId, role: actorRole },
        target: { type: "PAPER", id: paperId },
    }),
};
