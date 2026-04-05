import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Roles that can be self-registered (OWNER is never allowed)
const ALLOWED_SELF_REGISTER_ROLES = ["TEACHER", "ADMIN", "SUPER_ADMIN"];

async function generateDisplayId(): Promise<string> {
    const lastUser = await prisma.user.findFirst({
        where: { displayId: { not: null } },
        orderBy: { createdAt: "desc" },
        select: { displayId: true },
    });

    let nextNum = 1002; // Start from 1002 since 0001 is reserved for OWNER
    if (lastUser?.displayId) {
        const parts = lastUser.displayId.split("-");
        const parsed = parseInt(parts[1] ?? "1001");
        if (!isNaN(parsed)) nextNum = parsed + 1;
    }
    return `ECP-${String(nextNum).padStart(4, "0")}`;
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const {
            email,
            password,
            name,
            role,
            schoolCode,
            // SUPER_ADMIN creates school
            schoolName,
            schoolAddress,
            // KYC fields
            phone,
            employeeId,
            idType,
            idNumber,
            idDocUrl,
            currentAddress,
            permanentAddress,
            // Trusty fields
            trustyName,
            trustyPhone,
            trustyEmail,
            trustyAddress,
        } = body;

        // ── Basic validation ──────────────────────────────────────────────────
        if (!email || !password || !name) {
            return NextResponse.json(
                { message: "Name, email, and password are required." },
                { status: 400 }
            );
        }

        const selectedRole = role || "TEACHER";
        if (!ALLOWED_SELF_REGISTER_ROLES.includes(selectedRole)) {
            return NextResponse.json(
                { message: "Invalid role. You cannot self-register as OWNER." },
                { status: 400 }
            );
        }

        // ── Duplicate email check ─────────────────────────────────────────────
        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            return NextResponse.json(
                { message: "An account with this email already exists." },
                { status: 400 }
            );
        }

        // ── School resolution ─────────────────────────────────────────────────
        let resolvedSchoolId: string | undefined;

        if (selectedRole === "SUPER_ADMIN") {
            // SUPER_ADMIN creates a new school
            if (!schoolName) {
                return NextResponse.json(
                    { message: "School name is required for Super Admin registration." },
                    { status: 400 }
                );
            }

            // Generate a unique school code
            const schoolCount = await prisma.school.count();
            const schoolCode = `SCH-${String(1001 + schoolCount).padStart(4, "0")}`;

            const newSchool = await prisma.school.create({
                data: {
                    name: schoolName,
                    address: schoolAddress || null,
                    schoolCode,
                },
            });
            resolvedSchoolId = newSchool.id;

        } else if (selectedRole === "ADMIN" || selectedRole === "TEACHER") {
            // ADMIN and TEACHER must provide a school code
            if (!schoolCode) {
                return NextResponse.json(
                    { message: "School code is required. Ask your Super Admin for your school code." },
                    { status: 400 }
                );
            }

            const school = await prisma.school.findUnique({ where: { schoolCode } });
            if (!school) {
                return NextResponse.json(
                    { message: "Invalid school code. Please check with your Super Admin." },
                    { status: 404 }
                );
            }
            if (!school.isActive) {
                return NextResponse.json(
                    { message: "This school account is deactivated. Contact the platform owner." },
                    { status: 403 }
                );
            }
            resolvedSchoolId = school.id;
        }

        // ── Create user ────────────────────────────────────────────────────────
        const hashedPassword = await bcrypt.hash(password, 10);
        const displayId = await generateDisplayId();

        const user = await prisma.user.create({
            data: {
                email,
                password: hashedPassword,
                name,
                role: selectedRole,
                displayId,
                isApproved: false,
                isActive: true,
                schoolId: resolvedSchoolId ?? null,
                // KYC
                phone: phone || null,
                employeeId: employeeId || null,
                idType: idType || null,
                idNumber: idNumber || null,
                idDocUrl: idDocUrl || null,
                currentAddress: currentAddress || null,
                permanentAddress: permanentAddress || null,
                // Trusty
                trustyName: trustyName || null,
                trustyPhone: trustyPhone || null,
                trustyEmail: trustyEmail || null,
                trustyAddress: trustyAddress || null,
            },
        });

        const message =
            selectedRole === "SUPER_ADMIN"
                ? "Account created! The platform owner will review your KYC documents and approve your account."
                : selectedRole === "ADMIN"
                ? "Account created! Your Super Admin will review and approve your account."
                : "Account created! Your school Admin will approve your account shortly.";

        return NextResponse.json(
            { message, userId: user.id, displayId: user.displayId },
            { status: 201 }
        );
    } catch (error) {
        console.error("Registration error:", error);
        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
}
