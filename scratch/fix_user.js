const { PrismaClient } = require('./services/auth-service/node_modules/@prisma/client');
const prisma = new PrismaClient({ datasourceUrl: 'mongodb://localhost:27017/cabgo_auth?replicaSet=rs0' });

async function fixUser() {
  try {
    const user = await prisma.user.update({
      where: { email: 'user@test.com' },
      data: { phone: '0912345678' }
    });
    console.log('✔ User phone fixed:', user.email);
  } catch (err) {
    console.error('Error fixing user:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

fixUser();
