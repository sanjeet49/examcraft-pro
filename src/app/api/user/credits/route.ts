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

        const { amount } = await req.json();

        const updatedUser = await prisma.user.update({
            where: { id: session.user.id },
            data: {
                credits: { increment: amount },
                isPremium: true
            },
        });

        return NextResponse.json({
            message: "Credits added successfuly!",
            credits: updatedUser.credits
        });
    } catch (error) {
        return NextResponse.json({ message: "Something went wrong" }, { status: 500 });
    }
}
