import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { UserCheck, FileCheck, ShieldAlert, Users, School } from "lucide-react";
import { ApproveUserButton } from "@/components/admin/ApproveUserButton";
import { RevokeUserButton } from "@/components/admin/RevokeUserButton";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
    const session = await getServerSession(authOptions);

    if (!session || !session.user.isApproved || (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN")) {
        redirect("/dashboard");
    }

    const isSuperAdmin = session.user.role === "SUPER_ADMIN";
    const schoolId = (session.user as any).schoolId as string | null;

    // School info
    const school = schoolId
        ? await prisma.school.findUnique({ where: { id: schoolId }, select: { name: true, schoolCode: true } })
        : null;

    // Pending users — scoped to the same school, role below caller
    const pendingRoles = isSuperAdmin ? ["ADMIN", "TEACHER"] : ["TEACHER"];
    const pendingUsers = await prisma.user.findMany({
        where: {
            isApproved: false,
            isActive: true,
            role: { in: pendingRoles },
            ...(schoolId ? { schoolId } : {}),
        },
        orderBy: { createdAt: "desc" }
    });

    // Active users in school (approved or not, but all active)
    const managedUsers = await prisma.user.findMany({
        where: {
            role: { in: pendingRoles },
            isActive: true,
            isApproved: true,
            ...(schoolId ? { schoolId } : {}),
        },
        orderBy: { createdAt: "desc" },
        select: {
            id: true, name: true, email: true, role: true, isApproved: true,
            displayId: true, phone: true, createdAt: true
        }
    });

    // Pending papers — scoped to school
    const pendingPapers = await prisma.paper.findMany({
        where: {
            status: isSuperAdmin
                ? { in: ["PENDING_ADMIN", "PENDING_SUPERADMIN"] }
                : "PENDING_ADMIN",
            ...(schoolId ? { schoolId } : {}),
        },
        select: {
            id: true, examName: true, subject: true, status: true,
            user: { select: { name: true, email: true } }
        },
        orderBy: { updatedAt: "desc" }
    });

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
            <div className="max-w-6xl mx-auto space-y-8">

                {/* Header */}
                <div className="flex items-start gap-4">
                    <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-3 rounded-2xl shadow-xl shadow-indigo-500/20">
                        <ShieldAlert className="w-7 h-7 text-white" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-white">
                            {isSuperAdmin ? "Super Admin Portal" : "Admin Portal"}
                        </h1>
                        {school && (
                            <div className="flex items-center gap-2 mt-1">
                                <School className="w-4 h-4 text-indigo-400" />
                                <span className="text-indigo-300 text-sm">{school.name}</span>
                                <span className="text-slate-500 text-xs font-mono">({school.schoolCode})</span>
                            </div>
                        )}
                        <div className="flex flex-wrap gap-2 mt-3">
                            {isSuperAdmin ? (
                                <>
                                    <span className="text-[10px] uppercase tracking-wider font-bold px-2 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-md">Financial Authority</span>
                                    <span className="text-[10px] uppercase tracking-wider font-bold px-2 py-1 bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded-md">Institution Manager</span>
                                </>
                            ) : (
                                <>
                                    <span className="text-[10px] uppercase tracking-wider font-bold px-2 py-1 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-md">Academic Moderator</span>
                                    <span className="text-[10px] uppercase tracking-wider font-bold px-2 py-1 bg-slate-500/10 text-slate-400 border border-slate-500/20 rounded-md">Subordinate Access</span>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Pending Approvals */}
                    <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
                        <div className="flex items-center gap-3 p-5 border-b border-white/10 bg-amber-500/5">
                            <UserCheck className="w-5 h-5 text-amber-400" />
                            <div>
                                <h2 className="text-white font-semibold">Pending Approvals</h2>
                                <p className="text-amber-400/70 text-xs">{pendingUsers.length} account(s) waiting</p>
                            </div>
                        </div>
                        {pendingUsers.length === 0 ? (
                            <div className="p-10 text-center text-slate-500">
                                <UserCheck className="w-7 h-7 mx-auto mb-2 opacity-30" />
                                <p className="text-sm">No pending approvals.</p>
                            </div>
                        ) : (
                            <ul className="divide-y divide-white/5">
                                {pendingUsers.map((user) => (
                                    <li key={user.id} className="p-4 flex items-center justify-between gap-3">
                                        <div>
                                            <p className="text-white font-medium text-sm">{user.name || "Unknown"}</p>
                                            <p className="text-slate-400 text-xs">{user.email}</p>
                                            <span className="inline-block mt-1 text-xs px-2 py-0.5 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-full">{user.role}</span>
                                        </div>
                                        <ApproveUserButton userId={user.id} />
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                    {/* Pending Papers */}
                    <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
                        <div className="flex items-center gap-3 p-5 border-b border-white/10 bg-blue-500/5">
                            <FileCheck className="w-5 h-5 text-blue-400" />
                            <div>
                                <h2 className="text-white font-semibold">Pending Papers</h2>
                                <p className="text-blue-400/70 text-xs">{pendingPapers.length} paper(s) to review</p>
                            </div>
                        </div>
                        {pendingPapers.length === 0 ? (
                            <div className="p-10 text-center text-slate-500">
                                <FileCheck className="w-7 h-7 mx-auto mb-2 opacity-30" />
                                <p className="text-sm">No pending papers.</p>
                            </div>
                        ) : (
                            <ul className="divide-y divide-white/5">
                                {pendingPapers.map((paper) => (
                                    <li key={paper.id} className="p-4">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <p className="text-white font-medium text-sm">{paper.examName}</p>
                                                <p className="text-slate-400 text-xs">{paper.subject} · by {paper.user.name || paper.user.email}</p>
                                            </div>
                                            <span className="text-xs px-2 py-0.5 bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 rounded-full">
                                                {paper.status.replace(/_/g, " ")}
                                            </span>
                                        </div>
                                        <div className="mt-3">
                                            <a href={`/dashboard/builder?id=${paper.id}`}
                                                className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-lg hover:bg-indigo-500/20 transition-colors">
                                                Review &amp; Edit
                                            </a>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>

                {/* Active Users in School */}
                <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
                    <div className="flex items-center gap-3 p-5 border-b border-white/10">
                        <Users className="w-5 h-5 text-green-400" />
                        <h2 className="text-white font-semibold">Active Staff in School</h2>
                        <span className="ml-auto text-xs text-slate-500">{managedUsers.length} member(s)</span>
                    </div>
                    {managedUsers.length === 0 ? (
                        <div className="p-10 text-center text-slate-500">
                            <Users className="w-7 h-7 mx-auto mb-2 opacity-30" />
                            <p className="text-sm">No approved staff yet.</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-white/5">
                            {managedUsers.map((user) => (
                                <div key={user.id} className="p-4 flex items-center justify-between gap-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold uppercase text-sm">
                                            {user.name?.[0] || "?"}
                                        </div>
                                        <div>
                                            <p className="text-white text-sm font-medium">{user.name || "Unknown"}</p>
                                            <p className="text-slate-400 text-xs">{user.email}</p>
                                            {user.displayId && <p className="text-slate-500 text-xs font-mono">{user.displayId}</p>}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="text-xs px-2 py-0.5 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-full">{user.role}</span>
                                        <RevokeUserButton userId={user.id} userName={user.name || user.email} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
