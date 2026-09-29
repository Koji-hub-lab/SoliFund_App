import { execSync } from 'child_process';
import { join } from 'path';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { nomBase, urlBaseTest } from './base-test';

// Exécuté une fois avant tous les tests e2e : crée la base de test si besoin, y applique les
// migrations (prisma migrate deploy), puis crée les rôles.
export default async function preparationGlobale() {
  const url = urlBaseTest();
  const nom = nomBase(url);

  // Création de la base, depuis la base « postgres » du même serveur.
  const urlServeur = new URL(url);
  urlServeur.pathname = '/postgres';
  urlServeur.searchParams.delete('schema');
  const serveur = new PrismaClient({ adapter: new PrismaPg({ connectionString: urlServeur.toString() }) });
  try {
    const existe = await serveur.$queryRaw<unknown[]>`SELECT 1 FROM pg_database WHERE datname = ${nom}`;
    if (existe.length === 0) {
      await serveur.$executeRawUnsafe(`CREATE DATABASE "${nom.replace(/"/g, '""')}"`);
      console.log(`\nBase de test « ${nom} » créée.`);
    }
  } catch (e) {
    throw new Error(
      `Impossible de créer la base de test « ${nom} » : créez-la à la main ou définissez DATABASE_URL_TEST.\n${e instanceof Error ? e.message : String(e)}`,
    );
  } finally {
    await serveur.$disconnect();
  }

  try {
    execSync('npx prisma migrate deploy', {
      cwd: join(__dirname, '..'),
      env: { ...process.env, DATABASE_URL: url },
      stdio: 'pipe',
    });
  } catch (e) {
    const sortie = (e as { stderr?: Buffer; stdout?: Buffer }).stderr?.toString() || (e as { stdout?: Buffer }).stdout?.toString();
    throw new Error(`Échec des migrations sur la base de test « ${nom} » :\n${sortie ?? String(e)}`);
  }

  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });
  try {
    for (const role of ['ROLE_USER', 'ROLE_ADMIN'] as const) {
      await prisma.role.upsert({ where: { nom: role }, update: {}, create: { nom: role } });
    }
  } finally {
    await prisma.$disconnect();
  }
}
