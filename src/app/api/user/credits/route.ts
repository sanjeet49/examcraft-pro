import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);

        if (!session || !session.user) {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        const user = await prisma.user.findUnique({
            where: { id: session.user.id }
        });

        if (!user || !user.schoolId) {
            return NextResponse.json({ message: "No school associated." }, { status: 400 });
        }

        if (user.role !== "SUPER_ADMIN") {
            return NextResponse.json({ message: "Only the School SUPER_ADMIN can authorize financial purchases." }, { status: 403 });
        }

        const { amount } = await req.json();

        // @ts-ignore
        const updatedSchool = await prisma.school.update({
            where: { id: user.schoolId },
            data: {
                credits: { increment: amount },
                isPremium: true
            },
        });

        return NextResponse.json({
            message: "Credits added successfuly!",
            // @ts-ignore
            credits: updatedSchool.credits
        });
    } catch (error) {
        return NextResponse.json({ message: "Something went wrong" }, { status: 500 });
    }
}
