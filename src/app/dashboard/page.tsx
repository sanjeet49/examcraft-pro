import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PlusCircle, FileText, Clock, AlertCircle, ShieldCheck, Crown } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { PaperCard, EmptyPaperCard } from "@/components/dashboard/PaperCard";

export default async function DashboardPage() {
    const session = await getServerSession(authOptions);

    // Redirect Google OAuth users who haven't completed their profile yet
    // (no schoolId means they registered via Google and skipped role selection)
    if (session?.user?.id && session.user.role === "TEACHER") {
        const dbMeta = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { schoolId: true, displayId: true }
        });
        if (dbMeta && !dbMeta.displayId) {
            redirect("/complete-profile");
        }
    }

    const dbUser = session?.user?.id ? await prisma.user.findUnique({
        where: { id: session.user.id },
        include: { school: true }
    }) : null;

    const availableCredits = dbUser?.school?.credits || 0;

    if (session?.user?.role === "OWNER") {
        redirect("/owner/dashboard");
    }

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
            {!session?.user?.isApproved && session?.user?.role !== "OWNER" && (
                <Alert variant="destructive" className="bg-amber-50 text-amber-900 border-amber-200">
                    <AlertCircle className="h-4 w-4 text-amber-600" />
                    <AlertTitle>Account Pending Approval</AlertTitle>
                    <AlertDescription>
                        Your account is currently under review. At this time you can only view your dashboard but cannot access platform tools.
                    </AlertDescription>
                </Alert>
            )}

            {(session?.user?.role === "ADMIN" || session?.user?.role === "SUPER_ADMIN") && session?.user?.isApproved && (
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

            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 p-8 text-white shadow-xl">
                <div className="absolute top-0 right-0 -mt-4 -mr-4 h-32 w-32 rounded-full bg-white/10 blur-2xl"></div>
                <div className="absolute bottom-0 left-0 -mb-4 -ml-4 h-24 w-24 rounded-full bg-white/10 blur-xl"></div>
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">
                            Welcome back, {session?.user?.name || "Teacher"}!
                        </h1>
                        <p className="mt-2 text-indigo-100 max-w-lg text-lg">
                            {dbUser?.school?.name ? `Teaching at ${dbUser.school.name}. ` : ""} 
                            Here is a summary of your recent examination papers and analytics.
                        </p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="bg-white/80 backdrop-blur border-slate-200 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-slate-500 text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                            <Crown className="w-4 h-4 text-amber-500" />
                            School Resource Wallet
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-end gap-2 text-slate-800">
                            <span className="text-5xl font-black tracking-tighter">{availableCredits}</span>
                            <span className="text-slate-500 mb-1.5 font-medium">Credits remaining</span>
                        </div>
                        
                        {(session?.user?.role === "SUPER_ADMIN" || session?.user?.role === "ADMIN") ? (
                            <Link href="/dashboard/settings" className="block mt-5">
                                <Button className="w-full bg-blue-50 hover:bg-blue-100 text-blue-700 shadow-none border border-blue-200 font-semibold transition-all">
                                    Manage School Billing
                                </Button>
                            </Link>
                        ) : (
                            <div className="mt-5 p-3 bg-slate-50 rounded-lg border border-slate-100">
                                <p className="text-xs text-slate-500 text-center">Pooled resources are managed by your School Administrator.</p>
                            </div>
                        )}
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
                        {!session?.user?.isApproved ? (
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
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight">Recent Examinations</h2>
                </div>
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
