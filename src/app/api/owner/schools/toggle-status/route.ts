import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || session.user.role !== "OWNER") {
            return NextResponse.json({ message: "Unauthorized — OWNER access required" }, { status: 403 });
        }

        const { schoolId, isActive } = await req.json();
        
        if (!schoolId) {
            return NextResponse.json({ message: "School ID required" }, { status: 400 });
        }

        const school = await prisma.school.findUnique({
            where: { id: schoolId }
        });

        if (!school) {
            return NextResponse.json({ message: "School not found" }, { status: 404 });
        }

        // Toggle the active state of the school
        await prisma.school.update({
            where: { id: schoolId },
            data: { isActive: isActive }
        });

        return NextResponse.json({ 
            message: `School ${isActive ? 'activated' : 'suspended'} successfully.` 
        }, { status: 200 });

    } catch (error) {
        console.error("Owner toggle school status error:", error);
        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
}
