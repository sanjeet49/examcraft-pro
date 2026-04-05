const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
    const OWNER_EMAIL = "sanjeet1gkp@gmail.com";

    console.log("Seeding OWNER account...");

    const existing = await prisma.user.findUnique({ where: { email: OWNER_EMAIL } });

    if (existing) {
        await prisma.user.update({
            where: { email: OWNER_EMAIL },
            data: {
                role: "OWNER",
                isApproved: true,
                isActive: true,
                displayId: existing.displayId ?? "ECP-0001",
            },
        });
        console.log("Owner account updated:", OWNER_EMAIL);
        return;
    }

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

    console.log("OWNER account created:", OWNER_EMAIL);
    console.log("Default password: ChangeMe@123");
    console.log("Please change this after first login!");
}

main()
    .catch((e) => {
        console.error("Seed failed:", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
