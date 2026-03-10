import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { UserCheck, FileCheck, ShieldAlert } from "lucide-react";
import { ApproveUserButton } from "@/components/admin/ApproveUserButton";

export default async function AdminDashboardPage() {
    const session = await getServerSession(authOptions);

    if (!session || (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN")) {
        redirect("/dashboard");
    }

    const isSuperAdmin = session.user.role === "SUPER_ADMIN";

    // Admins see TEACHERs pending approval
    // SuperAdmins see TEACHERs and ADMINs pending approval (if applicable)
    const pendingUsers = await prisma.user.findMany({
        where: {
            isApproved: false,
            role: isSuperAdmin ? undefined : "TEACHER"
        },
        orderBy: { createdAt: 'desc' }
    });

    const pendingPapers = await prisma.paper.findMany({
        where: {
            status: isSuperAdmin ? { in: ["PENDING_ADMIN", "PENDING_SUPERADMIN"] } : "PENDING_ADMIN"
        },
        include: {
            user: true
        },
        orderBy: { updatedAt: 'desc' }
    });

    return (
        <div className="p-8 max-w-6xl mx-auto space-y-8">
            <div className="flex items-center gap-3">
                <div className="bg-indigo-100 p-2 rounded-lg">
                    <ShieldAlert className="w-8 h-8 text-indigo-600" />
                </div>
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">{isSuperAdmin ? "Super Admin Portal" : "Admin Portal"}</h1>
                    <p className="text-gray-500">Review pending teacher accounts and paper submissions.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                    <CardHeader className="bg-amber-50 rounded-t-lg border-b border-amber-100 pb-4">
                        <div className="flex items-center gap-2">
                            <UserCheck className="w-5 h-5 text-amber-600" />
                            <CardTitle className="text-xl text-amber-900">Pending Users</CardTitle>
                        </div>
                        <CardDescription className="text-amber-700">Accounts awaiting your approval</CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                        {pendingUsers.length === 0 ? (
                            <div className="p-8 text-center text-gray-500">No pending users.</div>
                        ) : (
                            <ul className="divide-y divide-gray-100">
                                {pendingUsers.map(user => (
                                    <li key={user.id} className="p-4 hover:bg-gray-50 flex items-center justify-between">
                                        <div>
                                            <p className="font-medium text-gray-900">{user.name || "Unknown Name"}</p>
                                            <p className="text-sm text-gray-500">{user.email}</p>
                                            <span className="inline-block mt-1 text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">{user.role}</span>
                                        </div>
                                        <ApproveUserButton userId={user.id} />
                                    </li>
                                ))}
                            </ul>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="bg-blue-50 rounded-t-lg border-b border-blue-100 pb-4">
                        <div className="flex items-center gap-2">
                            <FileCheck className="w-5 h-5 text-blue-600" />
                            <CardTitle className="text-xl text-blue-900">Pending Papers</CardTitle>
                        </div>
                        <CardDescription className="text-blue-700">Exam papers awaiting your review</CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                        {pendingPapers.length === 0 ? (
                            <div className="p-8 text-center text-gray-500">No pending papers in your queue.</div>
                        ) : (
                            <ul className="divide-y divide-gray-100">
                                {pendingPapers.map(paper => (
                                    <li key={paper.id} className="p-4 hover:bg-gray-50">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <p className="font-medium text-gray-900">{paper.examName} ({paper.subject})</p>
                                                <p className="text-sm text-gray-500">By: {paper.user.name || paper.user.email}</p>
                                            </div>
                                            <span className="text-xs px-2 py-1 bg-yellow-100 text-yellow-800 font-medium rounded-full">
                                                {paper.status.replace("_", " ")}
                                            </span>
                                        </div>
                                        <div className="mt-4 text-right">
                                            {/* Note: the edit builder needs to accept ?id= and load the paper for admins */}
                                            <a href={`/dashboard/builder?id=${paper.id}`} className="px-3 py-1.5 bg-gray-100 text-gray-700 border border-gray-300 rounded-md text-sm font-medium hover:bg-gray-200">
                                                Review & Edit
                                            </a>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
