import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export const dynamic = "force-dynamic";

export async function PUT(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user.id) {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        const { currentPassword, newPassword } = await req.json();

        if (!newPassword || newPassword.length < 6) {
            return NextResponse.json({ message: "New password must be at least 6 characters long." }, { status: 400 });
        }

        const user = await prisma.user.findUnique({
            where: { id: session.user.id }
        });

        if (!user) {
            return NextResponse.json({ message: "User not found" }, { status: 404 });
        }

        // If the user has an existing password (meaning they didn't JUST use Google OAuth)
        // enforce current password check.
        if (user.password) {
            if (!currentPassword) {
                return NextResponse.json({ message: "Current password is required." }, { status: 400 });
            }

            const isCorrect = await bcrypt.compare(currentPassword, user.password);
            if (!isCorrect) {
                return NextResponse.json({ message: "Incorrect current password." }, { status: 400 });
            }
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);

        await prisma.user.update({
            where: { id: session.user.id },
            data: { password: hashedPassword }
        });

        return NextResponse.json({ message: "Password updated successfully." }, { status: 200 });

    } catch (error) {
        console.error("Password update error:", error);
        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
}
