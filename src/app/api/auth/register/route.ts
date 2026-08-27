import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { validatePassword, validateEmail, sanitizeInput } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
    try {
        const { email, password, name } = await req.json();

        if (!email || !password) {
            return NextResponse.json(
                { message: "Email and password are required" },
                { status: 400 }
            );
        }

        // Validate email format
        const sanitizedEmail = sanitizeInput(email).toLowerCase();
        if (!validateEmail(sanitizedEmail)) {
            return NextResponse.json(
                { message: "Please provide a valid email address" },
                { status: 400 }
            );
        }

        // Validate password strength
        const passwordCheck = validatePassword(password);
        if (!passwordCheck.valid) {
            return NextResponse.json(
                { message: passwordCheck.errors[0], errors: passwordCheck.errors },
                { status: 400 }
            );
        }

        // Sanitize name
        const sanitizedName = name ? sanitizeInput(name) : null;

        const existingUser = await prisma.user.findUnique({
            where: { email: sanitizedEmail },
        });

        if (existingUser) {
            return NextResponse.json(
                { message: "User already exists" },
                { status: 400 }
            );
        }

        const hashedPassword = await bcrypt.hash(password, 12);

        const user = await prisma.user.create({
            data: {
                email: sanitizedEmail,
                password: hashedPassword,
                name: sanitizedName,
            },
        });

        return NextResponse.json(
            { message: "User registered successfully", userId: user.id },
            { status: 201 }
        );
    } catch (error) {
        console.error("Registration error:", error);
        return NextResponse.json(
            { message: "Internal server error" },
            { status: 500 }
        );
    }
}

