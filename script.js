const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
    await prisma.user.updateMany({ data: { credits: 100 } });
    console.log('Successfully added 100 credits to all test users!');
}
main();
