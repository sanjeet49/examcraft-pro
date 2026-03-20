import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { notFound, redirect } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download, Eye, FileText, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import dayjs from "dayjs";

export default async function SubmissionsPage({ params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.id) {
        redirect("/login");
    }

    const { id: paperId } = await params;

    const paper = await prisma.paper.findUnique({
        where: { id: paperId },
        include: {
            submissions: {
                orderBy: { submittedAt: 'desc' }
            }
        }
    });

    if (!paper) {
        notFound();
    }

    // Security: Only the creator or an Admin can view submissions
    if (paper.userId !== session.user.id && session.user.role === 'TEACHER') {
        redirect("/dashboard");
    }

    const { submissions } = paper;

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in zoom-in-95 duration-300">
            <div className="flex justify-between items-end mb-8 border-b border-gray-200 pb-4">
                <div>
                    <Link href={`/dashboard/builder?id=${paper.id}`}>
                        <Button variant="ghost" className="mb-2 text-indigo-600 hover:bg-indigo-50 pl-0">
                            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Builder
                        </Button>
                    </Link>
                    <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Student Submissions</h1>
                    <p className="text-gray-500 mt-2 flex items-center">
                        <FileText className="w-4 h-4 mr-2" /> {paper.examName} ({paper.subject}) • Total Marks: {paper.totalMarks}
                    </p>
                </div>
                <div className="text-right">
                    <div className="text-3xl font-black text-indigo-600">{submissions.length}</div>
                    <div className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Responses</div>
                </div>
            </div>

            {submissions.length === 0 ? (
                <Card className="text-center py-20 border-dashed border-2">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <FileText className="w-8 h-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-700">No Submissions Yet</h3>
                    <p className="text-gray-500 max-w-md mx-auto mt-2">
                        Share the live Test Link from the Builder page to start receiving student responses. Auto-graded objective scores will appear here instantly.
                    </p>
                </Card>
            ) : (
                <Card className="shadow-sm overflow-hidden border-gray-200">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-gray-600 uppercase bg-gray-50 border-b">
                                <tr>
                                    <th className="px-6 py-4 font-bold tracking-wider">Student Name</th>
                                    <th className="px-6 py-4 font-bold tracking-wider">Roll No</th>
                                    <th className="px-6 py-4 font-bold tracking-wider text-center">Auto-Graded Score</th>
                                    <th className="px-6 py-4 font-bold tracking-wider text-right">Submitted At</th>
                                    <th className="px-6 py-4 font-bold tracking-wider text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 bg-white">
                                {submissions.map((sub) => (
                                    <tr key={sub.id} className="hover:bg-indigo-50/30 transition-colors">
                                        <td className="px-6 py-4 font-medium text-gray-900 flex items-center">
                                            <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center mr-3 font-bold">
                                                {sub.studentName.charAt(0).toUpperCase()}
                                            </div>
                                            {sub.studentName}
                                        </td>
                                        <td className="px-6 py-4 text-gray-600">{sub.rollNo || '-'}</td>
                                        <td className="px-6 py-4 text-gray-600">{sub.division || '-'}</td>
                                        <td className="px-6 py-4 text-center">
                                            {sub.totalScore !== null ? (
                                                <div className="inline-flex items-center px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold border border-emerald-200">
                                                    <CheckCircle2 className="w-4 h-4 mr-2" />
                                                    {sub.totalScore} / {paper.totalMarks}
                                                </div>
                                            ) : (
                                                <span className="text-gray-400 italic">Pending</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-gray-500 text-right font-mono text-xs">
                                            {dayjs(sub.submittedAt).format("MMM D, YYYY • h:mm A")}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <Link href={`/dashboard/submissions/${paper.id}/report/${sub.id}`}>
                                                <Button size="sm" variant="outline" className="text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200">
                                                    <Eye className="w-4 h-4 mr-2" /> Report PDF
                                                </Button>
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>
            )}
        </div>
    );
}
