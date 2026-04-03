import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PlusCircle, FileText, Clock, AlertCircle, ShieldCheck } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { PaperCard, EmptyPaperCard } from "@/components/dashboard/PaperCard";

export default async function DashboardPage() {
    const session = await getServerSession(authOptions);

    // Fetch real user papers from the database
    const papers = session?.user?.id
        ? await prisma.paper.findMany({
            where: { userId: session.user.id },
            select: {
                id: true,
                userId: true,
                schoolName: true,
                subject: true,
                examName: true,
                totalMarks: true,
                date: true,
                timeLimit: true,
                status: true,
                isPublishedOnline: true,
                createdAt: true,
                updatedAt: true,
            },
            orderBy: { createdAt: 'desc' },
            take: 6
        })
        : [];

    return (
        <div className="p-8 max-w-6xl mx-auto space-y-8">
            {!session?.user?.isApproved && session?.user?.role === "TEACHER" && (
                <Alert variant="destructive" className="bg-amber-50 text-amber-900 border-amber-200">
                    <AlertCircle className="h-4 w-4 text-amber-600" />
                    <AlertTitle>Account Pending Approval</AlertTitle>
                    <AlertDescription>
                        Your account is currently under review. You will not be able to create or submit exam papers until an Administrator approves your account.
                    </AlertDescription>
                </Alert>
            )}

            {(session?.user?.role === "ADMIN" || session?.user?.role === "SUPER_ADMIN") && (
                <Alert className="bg-indigo-50 border-indigo-200">
                    <ShieldCheck className="h-4 w-4 text-indigo-600" />
                    <AlertTitle>Admin Portal Access</AlertTitle>
                    <AlertDescription className="flex items-center justify-between mt-2 md:mt-0">
                        <span>You have administrative privileges. Manage users and review paper submissions in the Admin Portal.</span>
                        <Link href="/dashboard/admin">
                            <Button size="sm" variant="outline" className="border-indigo-300 text-indigo-700 bg-white ml-4">Go to Admin Portal</Button>
                        </Link>
                    </AlertDescription>
                </Alert>
            )}

            <div>
                <h1 className="text-3xl font-bold text-gray-900">Welcome back, {session?.user?.name || "Teacher"}!</h1>
                <p className="text-gray-500 mt-2">Here is a summary of your recent question papers and credit usage.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="bg-gradient-to-br from-indigo-500 to-indigo-600 text-white border-none shadow-md">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-indigo-100 text-sm font-medium uppercase tracking-wider">Available Credits</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-end gap-2">
                            <span className="text-4xl font-extrabold">{session?.user?.credits || 0}</span>
                            <span className="text-indigo-200 mb-1">credits</span>
                        </div>
                        <Link href="/dashboard/settings">
                            <Button variant="secondary" size="sm" className="mt-4 w-full bg-white text-indigo-600 hover:bg-gray-50">
                                Buy More Credits
                            </Button>
                        </Link>
                    </CardContent>
                </Card>

                <Card className="border-gray-200 shadow-sm md:col-span-2">
                    <CardHeader className="pb-2 flex flex-row items-center justify-between">
                        <div>
                            <CardTitle className="text-lg text-gray-900">Quick Actions</CardTitle>
                            <CardDescription>Start creating a new exam immediately</CardDescription>
                        </div>
                        <div className="bg-indigo-50 p-3 rounded-full">
                            <PlusCircle className="w-6 h-6 text-indigo-600" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        {(!session?.user?.isApproved && session?.user?.role === "TEACHER") ? (
                            <Button disabled className="w-full h-24 text-lg border-2 border-dashed border-gray-200 bg-gray-50 text-gray-400">
                                <PlusCircle className="mr-2 h-6 w-6" /> Create New Paper (Pending Approval)
                            </Button>
                        ) : (
                            <Link href="/dashboard/builder">
                                <Button className="w-full h-24 text-lg border-2 border-dashed border-indigo-200 bg-indigo-50/50 hover:bg-indigo-50 text-indigo-700 hover:border-indigo-300">
                                    <PlusCircle className="mr-2 h-6 w-6" /> Create New Paper
                                </Button>
                            </Link>
                        )}
                    </CardContent>
                </Card>
            </div>

            <div>
                <h2 className="text-xl font-bold text-gray-900 mb-4">Recent Papers</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {papers.length === 0 ? (
                        <>
                            <EmptyPaperCard />
                            <div className="opacity-50 pointer-events-none hidden md:block"><EmptyPaperCard /></div>
                            <div className="opacity-50 pointer-events-none hidden lg:block"><EmptyPaperCard /></div>
                        </>
                    ) : (
                        papers.map((paper) => (
                            <PaperCard key={paper.id} paper={paper} userRole={session?.user?.role} />
                        ))
                    )}

                    {papers.length > 0 && papers.length < 6 && (
                        <EmptyPaperCard />
                    )}
                </div>
            </div>
        </div>
    );
}
