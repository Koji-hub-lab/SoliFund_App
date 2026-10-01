/**
 * Enregistre la réponse brute de Notch Pay pour les derniers paiements échoués, afin de voir où
 * Notch Pay place la raison de l'échec. Lecture seule : uniquement GET /payments/{reference}.
 *
 *   cd backend && npx tsx scripts/notchpay-exemples-echecs.ts [nombre, 3 par défaut]
 *
 * Les fichiers vont dans docs/paiement/exemples/paiement-echoue-<id_paiement>.json. Aucune clé
 * n'y est écrite, et les données personnelles (téléphone, email, nom, adresse IP...) sont masquées.
 */
import 'dotenv/config';
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import type { ConfigService } from '@nestjs/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import {
  NotchPayClient,
  type EchangeNotchPay,
} from '../src/payment/notchpay.client';
import { estCleDeTest } from '../src/payment/notchpay.config';
import { ErreurPaiement } from '../src/payment/paiement.erreurs';

const DOSSIER = join(__dirname, '..', '..', 'docs', 'paiement', 'exemples');
const nombre = Number(process.argv[2] ?? 3);

// Champs dont la valeur est une donnée personnelle : remplacée par « [masqué] ».
const CHAMPS_PERSONNELS =
  /phone|email|name|customer|account|address|ip$|^ip|geo|msisdn|payer|beneficiary|recipient|first|last/i;

function anonymiser(valeur: unknown, cle = ''): unknown {
  if (Array.isArray(valeur)) return valeur.map((v) => anonymiser(v));
  if (valeur && typeof valeur === 'object') {
    return Object.fromEntries(
      Object.entries(valeur).map(([k, v]) => [k, anonymiser(v, k)]),
    );
  }
  if (CHAMPS_PERSONNELS.test(cle) && valeur !== null && valeur !== '') {
    return typeof valeur === 'object' ? anonymiser(valeur) : '[masqué]';
  }
  // Numéro camerounais glissé dans un texte (message d'erreur...).
  if (typeof valeur === 'string') {
    return valeur.replace(/\+?(237)?6\d{8}/g, '[numéro masqué]');
  }
  return valeur;
}

const secrets = [
  process.env.NOTCHPAY_PUBLIC_KEY,
  process.env.NOTCHPAY_PRIVATE_KEY,
  process.env.NOTCHPAY_WEBHOOK_HASH,
].filter((s): s is string => !!s);

function enregistrer(nom: string, contenu: object) {
  let texte = JSON.stringify(contenu, null, 2);
  for (const secret of secrets)
    texte = texte.split(secret).join('[clé masquée]');
  writeFileSync(join(DOSSIER, `${nom}.json`), `${texte}\n`);
}

async function principal() {
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });
  const client = new NotchPayClient({
    get: (nom: string) => process.env[nom],
    getOrThrow: (nom: string) => process.env[nom] ?? '',
  } as unknown as ConfigService);
  let echanges: EchangeNotchPay[] = [];
  client.surEchange = (e) => echanges.push(e);

  const paiements = await prisma.paiement.findMany({
    where: { statut: 'ECHOUE', reference_fournisseur: { not: null } },
    select: {
      id_paiement: true,
      reference_fournisseur: true,
      canal: true,
      code_erreur: true,
      message_erreur: true,
    },
    orderBy: { id_paiement: 'desc' },
    take: nombre,
  });
  mkdirSync(DOSSIER, { recursive: true });
  console.log(
    `Mode des clés : ${estCleDeTest(process.env.NOTCHPAY_PUBLIC_KEY ?? '') ? 'test' : 'live'} ; ${paiements.length} paiement(s) échoué(s) consulté(s).`,
  );

  for (const p of paiements) {
    echanges = [];
    let erreur: object | undefined;
    try {
      await client.consulterPaiement(p.reference_fournisseur!);
    } catch (e) {
      erreur =
        e instanceof ErreurPaiement
          ? {
              type: e.name,
              statutHttp: e.statutHttp,
              code: e.code,
              message: e.message,
            }
          : { message: String(e) };
    }
    const nom = `paiement-echoue-${p.id_paiement}`;
    enregistrer(nom, {
      // Ce que SoliFund avait enregistré pour ce paiement avant cette consultation.
      enregistre: {
        canal: p.canal,
        code_erreur: p.code_erreur,
        message_erreur: p.message_erreur,
      },
      erreur,
      reponses: echanges.map((e) => ({
        methode: e.methode,
        chemin: e.chemin.replace(p.reference_fournisseur!, '<reference>'),
        statutHttp: e.statutHttp,
        corps: anonymiser(e.corpsRecu),
        erreurReseau: e.erreurReseau,
      })),
    });
    console.log(
      `${nom}.json écrit (HTTP ${echanges.at(-1)?.statutHttp ?? '-'})`,
    );
  }
  await prisma.$disconnect();
}

principal().catch((e: unknown) => {
  console.error('Échec :', e instanceof Error ? e.message : String(e));
  process.exit(1);
});
