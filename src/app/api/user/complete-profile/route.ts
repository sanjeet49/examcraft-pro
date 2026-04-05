import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

async function generateDisplayId(): Promise<string> {
    const lastUser = await prisma.user.findFirst({
        where: { displayId: { not: null } },
        orderBy: { createdAt: "desc" },
        select: { displayId: true },
    });
    let nextNum = 1002;
    if (lastUser?.displayId) {
        const parts = lastUser.displayId.split("-");
        const parsed = parseInt(parts[1] ?? "1001");
        if (!isNaN(parsed)) nextNum = parsed + 1;
    }
    return `ECP-${String(nextNum).padStart(4, "0")}`;
}

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const {
            role,
            phone,
            schoolCode,
            schoolName,
            schoolAddress,
            employeeId,
            idType,
            idNumber,
            idDocUrl,
            currentAddress,
            permanentAddress,
            trustyName,
            trustyPhone,
            trustyEmail,
            trustyAddress,
        } = body;

        const ALLOWED_ROLES = ["TEACHER", "ADMIN", "SUPER_ADMIN"];
        if (!ALLOWED_ROLES.includes(role)) {
            return NextResponse.json({ message: "Invalid role." }, { status: 400 });
        }

        // Check user doesn't already have a role/school set
        const existingUser = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { role: true, schoolId: true, displayId: true },
        });

        if (!existingUser) {
            return NextResponse.json({ message: "User not found." }, { status: 404 });
        }

        // Resolve school
        let resolvedSchoolId: string | null = null;

        if (role === "SUPER_ADMIN") {
            if (!schoolName) {
                return NextResponse.json({ message: "School name is required." }, { status: 400 });
            }
            const schoolCount = await prisma.school.count();
            const newSchoolCode = `SCH-${String(1001 + schoolCount).padStart(4, "0")}`;
            const newSchool = await prisma.school.create({
                data: {
                    name: schoolName,
                    address: schoolAddress || null,
                    schoolCode: newSchoolCode,
                },
            });
            resolvedSchoolId = newSchool.id;
        } else {
            if (!schoolCode) {
                return NextResponse.json({ message: "School code is required." }, { status: 400 });
            }
            const school = await prisma.school.findUnique({ where: { schoolCode } });
            if (!school) {
                return NextResponse.json({ message: "Invalid school code." }, { status: 404 });
            }
            resolvedSchoolId = school.id;
        }

        const displayId = existingUser.displayId ?? (await generateDisplayId());

        await prisma.user.update({
            where: { id: session.user.id },
            data: {
                role,
                displayId,
                isApproved: false,
                schoolId: resolvedSchoolId,
                phone: phone || null,
                employeeId: employeeId || null,
                idType: idType || null,
                idNumber: idNumber || null,
                idDocUrl: idDocUrl || null,
                currentAddress: currentAddress || null,
                permanentAddress: permanentAddress || null,
                trustyName: trustyName || null,
                trustyPhone: trustyPhone || null,
                trustyEmail: trustyEmail || null,
                trustyAddress: trustyAddress || null,
            },
        });

        return NextResponse.json({ message: "Profile completed! Awaiting approval." }, { status: 200 });
    } catch (error) {
        console.error("Complete profile error:", error);
        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
}
