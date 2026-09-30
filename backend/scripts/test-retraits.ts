// Test de bout en bout des règles de retrait (cumul, concurrence, statut de cagnotte, double traitement, rejet).
// Usage (backend lancé sur le port 3000) : npx tsx scripts/test-retraits.ts
//
// Le script crée ses propres données (utilisateurs, cagnottes, retraits) et ne supprime à la fin
// que les lignes dont il a enregistré l'identifiant. Il ne touche à aucune autre donnée.
import 'dotenv/config';
import * as bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const API = process.env.API_URL ?? 'http://localhost:3000';
const MOT_DE_PASSE = 'TestRetraits!2026';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

// Identifiants de tout ce que le script a créé : seules ces lignes seront supprimées.
const cree = {
  utilisateurs: [] as number[],
  cagnottes: [] as number[],
};

type Reponse = { status: number; ok: boolean; body: any };

async function appel(chemin: string, token: string | null, corps?: unknown): Promise<Reponse> {
  const res = await fetch(`${API}${chemin}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(corps ?? {}),
  });
  const texte = await res.text();
  let body: any = texte;
  try {
    body = JSON.parse(texte);
  } catch {}
  return { status: res.status, ok: res.ok, body };
}

function message(r: Reponse): string {
  const m = r.body?.message ?? r.body;
  return `${r.status} ${Array.isArray(m) ? m.join(', ') : m}`;
}

async function creerUtilisateur(suffixe: string, roles: number[]) {
  const email = `test-retraits-${suffixe}-${Date.now()}@solifund.test`;
  const utilisateur = await prisma.utilisateur.create({
    data: {
      nom: 'Test',
      prenom: `Retraits ${suffixe}`,
      email,
      mot_de_passe: await bcrypt.hash(MOT_DE_PASSE, 10),
      est_verifie: true,
    },
  });
  cree.utilisateurs.push(utilisateur.id_utilisateur);
  // Les retraits exigent une identité vérifiée : le numéro bénéficiaire vient de cette vérification.
  await prisma.verificationIdentite.create({
    data: {
      id_utilisateur: utilisateur.id_utilisateur,
      type_piece: 'CNI',
      nom: 'Test',
      prenoms: `Retraits ${suffixe}`,
      date_naissance: new Date('1990-01-01'),
      numero_piece: `TEST-${Date.now()}`,
      date_expiration: new Date('2099-12-31'),
      telephone_retrait: '699112233',
      methode_retrait: 'MTN_MOBILE_MONEY',
      statut: 'VALIDEE',
      date_decision: new Date(),
    },
  });
  for (const id_role of roles) {
    await prisma.posseder.create({ data: { id_utilisateur: utilisateur.id_utilisateur, id_role } });
  }
  return utilisateur;
}

async function creerCagnotte(idOrganisateur: number, nom: string) {
  const aujourdHui = new Date();
  const cagnotte = await prisma.cagnotte.create({
    data: {
      titre: `[TEST RETRAITS] ${nom}`,
      slug: `test-retraits-${nom}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      objectif: 50000,
      montant_collecte: 10000,
      date_debut: aujourdHui,
      date_fin: new Date(aujourdHui.getTime() + 30 * 24 * 3600 * 1000),
      statut: 'ACTIVE',
      est_publique: false,
      id_utilisateur: idOrganisateur,
    },
  });
  cree.cagnottes.push(cagnotte.id_cagnotte);
  return cagnotte.id_cagnotte;
}

async function connexion(email: string): Promise<string> {
  const r = await appel('/auth/login', null, { email, mot_de_passe: MOT_DE_PASSE });
  if (!r.ok || !r.body?.access_token) {
    throw new Error(`Connexion impossible pour ${email} : ${message(r)}`);
  }
  return r.body.access_token;
}

// ---------------------------------------------------------------------------

let tokenOrga = '';
let tokenAdmin = '';
let idOrga = 0;

function demande(idCagnotte: number, montant: number) {
  return appel('/retraits', tokenOrga, {
    id_cagnotte: idCagnotte,
    montant,
    methode_retrait: 'MTN_MOBILE_MONEY',
    numero_beneficiaire: '670000000',
  });
}

function compterRetraits(idCagnotte: number) {
  return prisma.retrait.count({ where: { id_cagnotte: idCagnotte } });
}

// Chaque scénario renvoie null si tout va bien, sinon la raison de l'échec.
const scenarios: { nom: string; executer: () => Promise<string | null> }[] = [
  {
    nom: '1. Cumul de demandes en attente',
    async executer() {
      const id = await creerCagnotte(idOrga, 'cumul');
      const r1 = await demande(id, 6000);
      if (!r1.ok) return `la 1re demande de 6000 aurait dû passer (${message(r1)})`;
      const r2 = await demande(id, 6000);
      if (r2.status !== 400) return `la 2e demande de 6000 aurait dû être refusée (reçu ${message(r2)})`;
      const r3 = await demande(id, 4000);
      if (!r3.ok) return `une demande de 4000 (reste exact) aurait dû passer (${message(r3)})`;
      return null;
    },
  },
  {
    nom: '2. Requêtes simultanées',
    async executer() {
      const id = await creerCagnotte(idOrga, 'concurrence');
      const reponses = await Promise.all(Array.from({ length: 5 }, () => demande(id, 6000)));
      const reussies = reponses.filter((r) => r.ok).length;
      const autres = reponses.filter((r) => !r.ok && r.status !== 400);
      if (autres.length) return `réponses inattendues : ${autres.map(message).join(' | ')}`;
      if (reussies !== 1) return `${reussies} demandes de 6000 acceptées sur 10000 (attendu : 1)`;
      const enBase = await compterRetraits(id);
      if (enBase !== 1) return `${enBase} retraits en base (attendu : 1)`;
      return null;
    },
  },
  {
    nom: '3. Cagnotte suspendue / annulée (et terminée toujours acceptée)',
    async executer() {
      const id = await creerCagnotte(idOrga, 'statut');
      for (const statut of ['SUSPENDUE', 'ANNULEE'] as const) {
        await prisma.cagnotte.update({ where: { id_cagnotte: id }, data: { statut } });
        const r = await demande(id, 1000);
        if (r.status !== 400) return `demande acceptée sur une cagnotte ${statut} (reçu ${message(r)})`;
      }
      if ((await compterRetraits(id)) !== 0) return 'un retrait a été créé malgré le refus';
      await prisma.cagnotte.update({ where: { id_cagnotte: id }, data: { statut: 'TERMINEE' } });
      const r = await demande(id, 1000);
      if (!r.ok) return `une cagnotte TERMINEE doit accepter les retraits (reçu ${message(r)})`;
      return null;
    },
  },
  {
    nom: '4. Double traitement par l’admin',
    async executer() {
      const id = await creerCagnotte(idOrga, 'traitement');
      const r = await demande(id, 5000);
      if (!r.ok) return `création du retrait impossible (${message(r)})`;
      const idRetrait = r.body.id_retrait;
      const [a, b] = await Promise.all([
        appel(`/retraits/${idRetrait}/traiter`, tokenAdmin),
        appel(`/retraits/${idRetrait}/traiter`, tokenAdmin),
      ]);
      const reussies = [a, b].filter((x) => x.ok).length;
      const refusees = [a, b].filter((x) => x.status === 400).length;
      if (reussies !== 1 || refusees !== 1) {
        return `attendu 1 succès + 1 refus 400, reçu : ${message(a)} | ${message(b)}`;
      }
      const transactions = await prisma.transaction.count({ where: { id_retrait: idRetrait } });
      if (transactions !== 1) return `${transactions} transactions créées (attendu : 1)`;
      const retrait = await prisma.retrait.findUnique({ where: { id_retrait: idRetrait } });
      if (retrait?.statut !== 'TRAITE') return `statut final ${retrait?.statut} (attendu : TRAITE)`;
      return null;
    },
  },
  {
    nom: '5. Rejet',
    async executer() {
      const id = await creerCagnotte(idOrga, 'rejet');
      const r = await demande(id, 6000);
      if (!r.ok) return `création du retrait impossible (${message(r)})`;
      const idRetrait = r.body.id_retrait;
      const [a, b] = await Promise.all([
        appel(`/retraits/${idRetrait}/rejeter`, tokenAdmin, { motif_rejet: 'test' }),
        appel(`/retraits/${idRetrait}/rejeter`, tokenAdmin, { motif_rejet: 'test' }),
      ]);
      if ([a, b].filter((x) => x.ok).length !== 1 || [a, b].filter((x) => x.status === 400).length !== 1) {
        return `double rejet : attendu 1 succès + 1 refus 400, reçu : ${message(a)} | ${message(b)}`;
      }
      const t = await appel(`/retraits/${idRetrait}/traiter`, tokenAdmin);
      if (t.status !== 400) return `un retrait rejeté a pu être traité (reçu ${message(t)})`;
      if ((await prisma.transaction.count({ where: { id_retrait: idRetrait } })) !== 0) {
        return 'une transaction a été créée pour un retrait rejeté';
      }
      const r2 = await demande(id, 10000);
      if (!r2.ok) return `le montant rejeté aurait dû redevenir disponible (${message(r2)})`;
      return null;
    },
  },
];

async function nettoyer() {
  const { utilisateurs, cagnottes } = cree;
  if (!utilisateurs.length && !cagnottes.length) return;
  try {
    // Ordre imposé par les clés étrangères (onDelete: Restrict).
    const retraits = await prisma.retrait.findMany({
      where: { id_cagnotte: { in: cagnottes } },
      select: { id_retrait: true },
    });
    const idsRetraits = retraits.map((r) => r.id_retrait);
    await prisma.transaction.deleteMany({ where: { id_retrait: { in: idsRetraits } } });
    await prisma.retrait.deleteMany({ where: { id_retrait: { in: idsRetraits } } });
    await prisma.cagnotte.deleteMany({ where: { id_cagnotte: { in: cagnottes } } });
    // Les liens de rôle (slf_posseder) et jetons partent en cascade.
    await prisma.verificationIdentite.deleteMany({ where: { id_utilisateur: { in: utilisateurs } } });
    await prisma.utilisateur.deleteMany({ where: { id_utilisateur: { in: utilisateurs } } });
    console.log('\n🧹 Données de test supprimées.');
  } catch (e) {
    console.error('\n⚠️  Nettoyage incomplet :', e instanceof Error ? e.message : e);
    console.error(`   Utilisateurs de test : ${utilisateurs.join(', ')}`);
    console.error(`   Cagnottes de test    : ${cagnottes.join(', ')}`);
    process.exitCode = 1;
  }
}

async function main() {
  try {
    await fetch(API);
  } catch {
    throw new Error(`Le backend ne répond pas sur ${API}. Lance-le d'abord (npm run start:dev).`);
  }

  const roleAdmin = await prisma.role.findUnique({ where: { nom: 'ROLE_ADMIN' } });
  const roleUser = await prisma.role.findUnique({ where: { nom: 'ROLE_USER' } });
  if (!roleAdmin || !roleUser) {
    throw new Error('Rôles absents en base : exécute d’abord le seed (npx prisma db seed).');
  }

  const orga = await creerUtilisateur('orga', [roleUser.id_role]);
  const admin = await creerUtilisateur('admin', [roleUser.id_role, roleAdmin.id_role]);
  idOrga = orga.id_utilisateur;
  tokenOrga = await connexion(orga.email);
  tokenAdmin = await connexion(admin.email);

  let echecs = 0;
  for (const s of scenarios) {
    let raison: string | null;
    try {
      raison = await s.executer();
    } catch (e) {
      raison = `erreur : ${e instanceof Error ? e.message : e}`;
    }
    if (raison) echecs++;
    console.log(raison ? `❌ ÉCHEC  ${s.nom} — ${raison}` : `✅ OK     ${s.nom}`);
  }

  console.log(`\n${scenarios.length - echecs}/${scenarios.length} scénarios réussis.`);
  if (echecs) process.exitCode = 1;
}

main()
  .catch((e) => {
    console.error(`❌ ${e instanceof Error ? e.message : e}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await nettoyer();
    await prisma.$disconnect();
  });
