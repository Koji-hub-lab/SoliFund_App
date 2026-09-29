// Convertit les photos de cagnotte envoyées avant le passage au WebP : pour chaque cagnotte qui a une
// image mais pas encore de miniature, crée les deux versions WebP (1200 px et 400 px), met à jour la
// cagnotte, puis supprime l'ancien fichier. Peut être relancé sans risque (les cagnottes déjà
// converties sont ignorées).
//
// Usage (dans backend/) :
//   npx tsx scripts/convertir-images.ts           conversion
//   npx tsx scripts/convertir-images.ts --essai   affiche ce qui serait fait, sans rien modifier
import 'dotenv/config';
import { readFile, stat } from 'fs/promises';
import { join } from 'path';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { ImagesService } from '../src/uploads/images.service';

const essai = process.argv.includes('--essai');
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
const images = new ImagesService();

function ko(octets: number) {
  return `${Math.round(octets / 1024)} Ko`;
}

async function main() {
  const cagnottes = await prisma.cagnotte.findMany({
    where: { image: { not: null }, image_miniature: null },
    select: { id_cagnotte: true, titre: true, image: true },
    orderBy: { id_cagnotte: 'asc' },
  });
  console.log(`${cagnottes.length} image(s) à convertir${essai ? ' (mode essai : rien ne sera modifié)' : ''}.`);

  let avant = 0;
  let apres = 0;
  let converties = 0;
  for (const c of cagnottes) {
    const ancienne = c.image!;
    // Les images sont servies sous /uploads/... et stockées dans backend/uploads/...
    const fichier = join(process.cwd(), ancienne.replace(/^\//, ''));
    let contenu: Buffer;
    try {
      contenu = await readFile(fichier);
    } catch {
      console.log(`⚠️  Cagnotte ${c.id_cagnotte} (« ${c.titre} ») : fichier introuvable (${ancienne}), ignorée.`);
      continue;
    }
    if (essai) {
      console.log(`- Cagnotte ${c.id_cagnotte} (« ${c.titre} ») : ${ancienne} (${ko(contenu.length)})`);
      continue;
    }

    try {
      const nouvelles = await images.enregistrerContenu(contenu, 'cagnottes');
      // Mise à jour seulement si l'image n'a pas changé entre-temps (envoi pendant la conversion).
      const { count } = await prisma.cagnotte.updateMany({
        where: { id_cagnotte: c.id_cagnotte, image: ancienne, image_miniature: null },
        data: { image: nouvelles.image, image_miniature: nouvelles.image_miniature },
      });
      if (count === 0) {
        await images.supprimer('cagnottes', nouvelles.image, nouvelles.image_miniature);
        console.log(`⚠️  Cagnotte ${c.id_cagnotte} : image modifiée pendant la conversion, ignorée.`);
        continue;
      }
      const tailleImage = (await stat(join(process.cwd(), nouvelles.image.replace(/^\//, '')))).size;
      const tailleMiniature = (await stat(join(process.cwd(), nouvelles.image_miniature.replace(/^\//, '')))).size;
      await images.supprimer('cagnottes', ancienne);
      avant += contenu.length;
      apres += tailleImage + tailleMiniature;
      converties++;
      console.log(`✅ Cagnotte ${c.id_cagnotte} : ${ko(contenu.length)} → ${ko(tailleImage)} + miniature ${ko(tailleMiniature)}`);
    } catch (e) {
      console.log(`❌ Cagnotte ${c.id_cagnotte} : ${e instanceof Error ? e.message : e}`);
    }
  }

  if (!essai) {
    console.log(`${converties} image(s) convertie(s) : ${ko(avant)} avant, ${ko(apres)} après (les deux versions).`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
