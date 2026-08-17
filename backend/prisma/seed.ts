import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  await prisma.role.upsert({
    where: { nom: 'ROLE_USER' },
    update: {},
    create: { nom: 'ROLE_USER' },
  });
  await prisma.role.upsert({
    where: { nom: 'ROLE_ADMIN' },
    update: {},
    create: { nom: 'ROLE_ADMIN' },
  });
  console.log('Rôles créés.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());