import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const schoolId = searchParams.get("id");

        // If fetching a specific school (for settings page)
        if (schoolId) {
            // Users can only fetch their own school (OWNER can fetch any)
            const callerSchoolId = (session.user as any).schoolId as string | null;
            if (session.user.role !== "OWNER" && callerSchoolId !== schoolId) {
                return NextResponse.json({ message: "Forbidden" }, { status: 403 });
            }

            const school = await prisma.school.findUnique({
                where: { id: schoolId },
                select: { id: true, name: true, schoolCode: true, isActive: true }
            });

            if (!school) {
                return NextResponse.json({ message: "School not found" }, { status: 404 });
            }

            return NextResponse.json({ school });
        }

        // OWNER: list all schools
        if (session.user.role !== "OWNER") {
            return NextResponse.json({ message: "Forbidden — OWNER access required for full list" }, { status: 403 });
        }

        const schools = await prisma.school.findMany({
            orderBy: { createdAt: "desc" },
            include: {
                _count: { select: { users: true, papers: true } }
            }
        });

        return NextResponse.json({ schools });
    } catch (error) {
        console.error("Schools API error:", error);
        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user || session.user.role !== "OWNER") {
            return NextResponse.json({ message: "Forbidden — OWNER only" }, { status: 403 });
        }

        const { name, address } = await req.json();
        if (!name) {
            return NextResponse.json({ message: "School name is required" }, { status: 400 });
        }

        const schoolCount = await prisma.school.count();
        const schoolCode = `SCH-${String(1001 + schoolCount).padStart(4, "0")}`;

        const school = await prisma.school.create({
            data: { name, address: address || null, schoolCode }
        });

        return NextResponse.json({ school }, { status: 201 });
    } catch (error) {
        console.error("Create school error:", error);
        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
}
