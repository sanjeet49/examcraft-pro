import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function PUT(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user.id) {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        const { name, phone, image } = await req.json();

        // Ensure user can only update their own profile
        const updatedUser = await prisma.user.update({
            where: { id: session.user.id },
            data: { 
                name: name !== undefined ? name : undefined, 
                phone: phone !== undefined ? phone : undefined,
                image: image !== undefined ? image : undefined
            }
        });

        return NextResponse.json({ message: "Profile updated successfully.", user: updatedUser }, { status: 200 });

    } catch (error) {
        console.error("Profile update error:", error);
        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
}
