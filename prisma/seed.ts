import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
    const OWNER_EMAIL = "sanjeet1gkp@gmail.com";

    console.log("🌱 Seeding OWNER account...");

    // Check if owner already exists
    const existing = await prisma.user.findUnique({
        where: { email: OWNER_EMAIL },
    });

    if (existing) {
        // Ensure it has the OWNER role and is approved
        await prisma.user.update({
            where: { email: OWNER_EMAIL },
            data: {
                role: "OWNER",
                isApproved: true,
                isActive: true,
                displayId: existing.displayId ?? "ECP-0001",
            },
        });
        console.log("✅ Owner account updated to OWNER role:", OWNER_EMAIL);
        return;
    }

    // Generate a dummy password (you should change this after first login)
    const hashedPassword = await bcrypt.hash("ChangeMe@123", 10);

    await prisma.user.create({
        data: {
            email: OWNER_EMAIL,
            name: "Sanjeet Shrivastava",
            displayId: "ECP-0001",
            password: hashedPassword,
            role: "OWNER",
            isApproved: true,
            isActive: true,
            credits: 999,
            isPremium: true,
        },
    });

    console.log("✅ OWNER account created:", OWNER_EMAIL);
    console.log("🔑 Default password: ChangeMe@123");
    console.log("   → Please change this immediately after first login!");
}

main()
    .catch((e) => {
        console.error("❌ Seed failed:", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
