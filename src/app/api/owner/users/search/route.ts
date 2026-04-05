import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (session?.user?.role !== "OWNER") {
            return NextResponse.json({ message: "Forbidden" }, { status: 403 });
        }

        const { searchParams } = new URL(req.url);
        const query = searchParams.get("q");

        if (!query || query.trim() === "") {
            return NextResponse.json({ users: [] }, { status: 200 });
        }

        const cleanQuery = query.trim();

        const users = await prisma.user.findMany({
            where: {
                OR: [
                    { email: { contains: cleanQuery } },
                    { name: { contains: cleanQuery } },
                    { displayId: { contains: cleanQuery } },
                    { phone: { contains: cleanQuery } },
                ]
            },
            take: 10,
            include: {
                school: {
                    select: { name: true, schoolCode: true, isActive: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        return NextResponse.json({ users }, { status: 200 });
    } catch (error) {
        console.error("[USER_SEARCH_ERROR]", error);
        return NextResponse.json({ message: "Internal Error" }, { status: 500 });
    }
}
