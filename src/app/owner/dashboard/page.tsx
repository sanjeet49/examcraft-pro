import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { OwnerDashboardClient } from "./OwnerDashboardClient";

export const dynamic = "force-dynamic";

export default async function OwnerDashboardPage() {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "OWNER") {
        redirect("/dashboard");
    }

    const [schools, pendingSuperAdmins, stats, aggregatedCredits, totalPapers] = await Promise.all([
        prisma.school.findMany({
            include: {
                users: {
                    where: { role: { in: ["SUPER_ADMIN", "ADMIN"] } },
                    select: { id: true, name: true, email: true, isApproved: true, isActive: true, displayId: true, phone: true, createdAt: true, role: true }
                },
                _count: { select: { users: true, papers: true } }
            },
            orderBy: { createdAt: "desc" }
        }),
        prisma.user.findMany({
            where: { role: "SUPER_ADMIN", isApproved: false, isActive: true },
            select: {
                id: true, name: true, email: true, phone: true, displayId: true,
                idType: true, idNumber: true, idDocUrl: true, employeeId: true,
                school: { select: { name: true, schoolCode: true } }
            },
            orderBy: { createdAt: "desc" }
        }),
        prisma.user.groupBy({
            by: ["role"],
            _count: { id: true }
        }),
        // @ts-ignore
        prisma.school.aggregate({
            // @ts-ignore
            _sum: { credits: true }
        }),
        prisma.paper.count()
    ]);

    const statMap = Object.fromEntries(stats.map((s) => [s.role, s._count.id]));

    const totals = {
        // @ts-ignore
        coins: aggregatedCredits._sum?.credits || 0,
        papers: totalPapers,
        usedCoins: 0 
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6 sm:p-8">
            <OwnerDashboardClient 
                schools={schools} 
                pendingSuperAdmins={pendingSuperAdmins} 
                stats={statMap} 
                totals={totals}
            />
        </div>
    );
}
