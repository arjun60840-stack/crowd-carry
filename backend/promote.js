// ⚠️ Admin-only maintenance script. Promotes a SINGLE user to ADMIN.
// Usage: node promote.js <email>
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error('Usage: node promote.js <email>');
    process.exit(1);
  }

  try {
    const user = await prisma.user.update({
      where: { email },
      data: { role: 'ADMIN' },
    });
    console.log(`Promoted ${user.email} to ADMIN.`);
  } catch (e) {
    if (e.code === 'P2025') {
      console.error(`No user found with email ${email}.`);
      process.exit(1);
    }
    throw e;
  }
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
