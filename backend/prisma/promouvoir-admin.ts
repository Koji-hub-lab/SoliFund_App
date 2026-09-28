import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error('Usage : npx tsx prisma/promouvoir-admin.ts email@exemple.com');
    process.exit(1);
  }

  const utilisateur = await prisma.utilisateur.findUnique({ where: { email } });
  if (!utilisateur) {
    console.error(`Aucun utilisateur trouvé avec l'email ${email}. Il doit d'abord s'inscrire normalement sur le site.`);
    process.exit(1);
  }

  const roleAdmin = await prisma.role.findUnique({ where: { nom: 'ROLE_ADMIN' } });
  if (!roleAdmin) {
    console.error("Le rôle ROLE_ADMIN n'existe pas en base (vérifie que le seed a été exécuté).");
    process.exit(1);
  }

  const dejaAdmin = await prisma.posseder.findUnique({
    where: { id_utilisateur_id_role: { id_utilisateur: utilisateur.id_utilisateur, id_role: roleAdmin.id_role } },
  });
  if (dejaAdmin) {
    console.log(`${email} est déjà administrateur.`);
    return;
  }

  await prisma.posseder.create({
    data: { id_utilisateur: utilisateur.id_utilisateur, id_role: roleAdmin.id_role },
  });

  console.log(`✅ ${email} est maintenant administrateur.`);
}

main().finally(() => prisma.$disconnect());