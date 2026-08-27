import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Refill all users with 0 credits to 10 credits
  const result = await prisma.user.updateMany({
    where: { credits: { lte: 0 } },
    data: { credits: 10 }
  });
  console.log(`✅ Refilled credits for ${result.count} user(s).`);

  // Also show all users' current credits
  const users = await prisma.user.findMany({
    select: { email: true, name: true, credits: true, role: true }
  });
  console.table(users);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
