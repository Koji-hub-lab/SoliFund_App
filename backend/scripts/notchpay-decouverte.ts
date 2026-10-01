/**
 * Script de découverte de l'API Notch Pay, à lancer À LA MAIN, en mode test uniquement :
 *
 *   cd backend && npx tsx scripts/notchpay-decouverte.ts
 *
 * Il crée et traite de vrais paiements de test avec les numéros de test officiels du Cameroun
 * (MTN +23767000000X, Orange +23769000000X ; X = 0 succès, 1 fonds insuffisants, 2 échec,
 * 3 délai dépassé, 4 annulation par le client), consulte leur statut jusqu'à un statut final, et
 * enregistre toutes les réponses brutes dans docs/paiement/exemples/ (un fichier par scénario).
 * Il enregistre aussi quelques réponses d'erreur (référence inconnue, montant refusé), une
 * annulation et le solde.
 *
 * Aucune clé n'est écrite dans les fichiers ni dans le terminal. Le script refuse de tourner avec
 * une clé qui n'est pas une clé de test.
 *
 * Ces fichiers servent à ajuster la lecture des réponses (src/payment/notchpay.reponses.ts) et la
 * correspondance des statuts et des codes d'erreur (src/payment/notchpay.utilitaires.ts).
 */
import 'dotenv/config';
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import type { ConfigService } from '@nestjs/config';
import {
  NotchPayClient,
  type EchangeNotchPay,
} from '../src/payment/notchpay.client';
import { estCleDeTest } from '../src/payment/notchpay.config';
import { ErreurPaiement } from '../src/payment/paiement.erreurs';
import {
  canalNotchPay,
  erreurMobileMoney,
  estStatutFinal,
  genererReference,
  statutDepuisNotchPay,
  type MethodePaiement,
} from '../src/payment/notchpay.utilitaires';
import { traduireTexte } from '../src/i18n/messages';

const DOSSIER = join(__dirname, '..', '..', 'docs', 'paiement', 'exemples');
// Consultation du statut : toutes les 5 secondes, pendant 2 minutes au plus par paiement.
const INTERVALLE_MS = 5_000;
const ATTENTE_MAX_MS = 120_000;
// Pause entre deux scénarios.
const PAUSE_MS = 2_000;

const OPERATEURS: { nom: string; methode: MethodePaiement; prefixe: string }[] =
  [
    { nom: 'mtn', methode: 'MTN_MOBILE_MONEY', prefixe: '+23767000000' },
    { nom: 'orange', methode: 'ORANGE_MONEY', prefixe: '+23769000000' },
  ];
const CAS = [
  { chiffre: 0, nom: 'succes' },
  { chiffre: 1, nom: 'fonds-insuffisants' },
  { chiffre: 2, nom: 'echec' },
  { chiffre: 3, nom: 'delai-depasse' },
  { chiffre: 4, nom: 'annulation-client' },
];
// Montants de base (XAF), un par scénario ; quelques francs sont ajoutés au hasard pour que deux
// lancements n'envoient pas les mêmes montants (détection de fraude de Notch Pay).
const MONTANTS = [500, 750, 1200, 1850, 2300, 3100, 4250, 5600, 6900, 8150];

const clePublique = process.env.NOTCHPAY_PUBLIC_KEY ?? '';
const clePrivee = process.env.NOTCHPAY_PRIVATE_KEY ?? '';
const secrets = [
  clePublique,
  clePrivee,
  process.env.NOTCHPAY_WEBHOOK_HASH ?? '',
].filter((s) => s.length > 0);

function refuser(raison: string): never {
  console.error(`Script de découverte annulé : ${raison}`);
  process.exit(1);
}

if (!clePublique) refuser('NOTCHPAY_PUBLIC_KEY est absente de backend/.env.');
if (!estCleDeTest(clePublique)) {
  refuser(
    "NOTCHPAY_PUBLIC_KEY n'est pas une clé de test (elle doit contenir « test »). Ce script ne tourne jamais avec une clé « live ».",
  );
}
if (clePrivee && !estCleDeTest(clePrivee)) {
  refuser(
    "NOTCHPAY_PRIVATE_KEY n'est pas une clé de test. Ce script ne tourne jamais avec une clé « live ».",
  );
}

const config = {
  get: (nom: string) => process.env[nom],
  getOrThrow: (nom: string) => process.env[nom] ?? '',
} as unknown as ConfigService;
const client = new NotchPayClient(config);

// Tous les échanges HTTP du scénario en cours (sans aucun en-tête).
let echanges: (EchangeNotchPay & { date: string })[] = [];
client.surEchange = (echange) =>
  echanges.push({ date: new Date().toISOString(), ...echange });

const attendre = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

// Écrit un fichier JSON, après avoir masqué toute clé qui s'y trouverait.
function enregistrer(nom: string, contenu: object) {
  let texte = JSON.stringify(contenu, null, 2);
  for (const secret of secrets)
    texte = texte.split(secret).join('[clé masquée]');
  writeFileSync(join(DOSSIER, `${nom}.json`), `${texte}\n`);
}

function decrireErreur(e: unknown) {
  return e instanceof ErreurPaiement
    ? {
        type: e.name,
        statutHttp: e.statutHttp,
        code: e.code,
        message: e.message,
        erreursChamps: e.erreursChamps,
      }
    : { type: 'Erreur', message: e instanceof Error ? e.message : String(e) };
}

interface Resume {
  fichier: string;
  numero?: string;
  montant?: number;
  statutNotchPay?: string;
  statutSoliFund?: string;
  codeErreur?: string;
  dureeSecondes?: number;
  erreur?: string;
}
const resumes: Resume[] = [];

// Un paiement complet : initialisation, traitement, puis consultation jusqu'à un statut final.
async function scenarioPaiement(
  operateur: (typeof OPERATEURS)[number],
  cas: (typeof CAS)[number],
  montant: number,
  rang: number,
) {
  const fichier = `paiement-${operateur.nom}-${cas.chiffre}-${cas.nom}`;
  const numero = `${operateur.prefixe}${cas.chiffre}`;
  const reference = genererReference('DON');
  const debut = Date.now();
  echanges = [];
  const resume: Resume = { fichier, numero, montant };
  let erreur: object | undefined;
  process.stdout.write(`${fichier} (${numero}, ${montant} XAF)... `);

  try {
    const initialise = await client.initialiserPaiement({
      montant,
      reference,
      description: `Découverte SoliFund : ${operateur.nom} ${cas.nom}`,
      client: {
        nom: `Donateur Test ${rang}`,
        email: `decouverte-${rang}@example.com`,
        telephone: numero,
      },
    });
    let paiement = await client.traiterPaiement(
      initialise.reference,
      canalNotchPay(operateur.methode),
      numero,
    );
    while (
      !estStatutFinal(paiement.statut) &&
      Date.now() - debut < ATTENTE_MAX_MS
    ) {
      await attendre(INTERVALLE_MS);
      paiement = await client.consulterPaiement(initialise.reference);
    }
    resume.statutNotchPay = paiement.statut;
    resume.statutSoliFund = statutDepuisNotchPay(paiement.statut);
    resume.codeErreur = paiement.codeErreur;
  } catch (e) {
    erreur = decrireErreur(e);
    resume.erreur = (erreur as { message: string }).message;
  }

  resume.dureeSecondes = Math.round((Date.now() - debut) / 1000);
  const lecture = erreurMobileMoney(resume.codeErreur);
  enregistrer(fichier, {
    scenario: {
      operateur: operateur.nom,
      cas: cas.nom,
      numero,
      montant,
      reference,
    },
    // Ce que le code de SoliFund a compris des réponses (à comparer aux réponses brutes).
    lecture: {
      ...resume,
      statutFinalAtteint: resume.statutNotchPay
        ? estStatutFinal(resume.statutNotchPay)
        : false,
      messagePourLeDonateur:
        resume.statutSoliFund === 'ECHOUE'
          ? traduireTexte('fr', lecture.message)
          : undefined,
      peutReessayer:
        resume.statutSoliFund === 'ECHOUE' ? lecture.peutReessayer : undefined,
    },
    erreur,
    echanges,
  });
  resumes.push(resume);
  console.log(
    resume.erreur
      ? `ERREUR : ${resume.erreur}`
      : `${resume.statutNotchPay} → ${resume.statutSoliFund} (${resume.dureeSecondes} s)`,
  );
}

// Un appel isolé dont on veut garder la réponse (erreur attendue, annulation, solde).
async function scenarioSimple(fichier: string, action: () => Promise<unknown>) {
  echanges = [];
  const resume: Resume = { fichier };
  let erreur: object | undefined;
  process.stdout.write(`${fichier}... `);
  try {
    await action();
  } catch (e) {
    erreur = decrireErreur(e);
    resume.erreur = (erreur as { message: string }).message;
  }
  enregistrer(fichier, { erreur, echanges });
  resumes.push(resume);
  console.log(
    resume.erreur ? `erreur reçue : ${resume.erreur}` : 'réponse reçue',
  );
}

async function principal() {
  mkdirSync(DOSSIER, { recursive: true });
  console.log(
    `Découverte Notch Pay (mode test) : réponses enregistrées dans ${DOSSIER}\n`,
  );

  let rang = 0;
  for (const operateur of OPERATEURS) {
    for (const cas of CAS) {
      const montant =
        MONTANTS[rang % MONTANTS.length] + Math.floor(Math.random() * 100);
      rang += 1;
      await scenarioPaiement(operateur, cas, montant, rang);
      await attendre(PAUSE_MS);
    }
  }

  // Formes des réponses d'erreur.
  await scenarioSimple('erreur-paiement-inconnu', () =>
    client.consulterPaiement('SLF-REFERENCE-INCONNUE'),
  );
  await scenarioSimple('erreur-montant-refuse', () =>
    client.initialiserPaiement({
      montant: 1,
      reference: genererReference('DON'),
      description: 'Découverte SoliFund : montant trop petit',
      client: { nom: 'Donateur Test', email: 'decouverte-montant@example.com' },
    }),
  );
  await scenarioSimple('erreur-numero-invalide', async () => {
    const paiement = await client.initialiserPaiement({
      montant: 900 + Math.floor(Math.random() * 100),
      reference: genererReference('DON'),
      description: 'Découverte SoliFund : numéro invalide',
      client: { nom: 'Donateur Test', email: 'decouverte-numero@example.com' },
    });
    await client.traiterPaiement(paiement.reference, 'cm.mtn', '+2376700');
  });
  // Annulation d'un paiement initialisé, puis consultation.
  await scenarioSimple('annulation', async () => {
    const paiement = await client.initialiserPaiement({
      montant: 1400 + Math.floor(Math.random() * 100),
      reference: genererReference('DON'),
      description: 'Découverte SoliFund : annulation',
      client: {
        nom: 'Donateur Test',
        email: 'decouverte-annulation@example.com',
      },
    });
    await client.annulerPaiement(paiement.reference);
    await client.consulterPaiement(paiement.reference);
  });
  // Solde (clé privée).
  if (clePrivee) {
    await scenarioSimple('solde', () => client.lireSolde());
  } else {
    console.log('solde... ignoré (NOTCHPAY_PRIVATE_KEY absente)');
  }

  enregistrer('resume', { date: new Date().toISOString(), scenarios: resumes });
  console.log('\nRésumé :');
  console.table(
    resumes.map((r) => ({
      fichier: r.fichier,
      statut: r.statutNotchPay ?? '',
      solifund: r.statutSoliFund ?? '',
      code: r.codeErreur ?? '',
      duree: r.dureeSecondes ?? '',
      erreur: (r.erreur ?? '').slice(0, 50),
    })),
  );
  console.log(`\nFichiers écrits dans ${DOSSIER} (aucune clé).`);
}

principal().catch((e: unknown) => {
  console.error(
    'Échec du script :',
    e instanceof Error ? e.message : String(e),
  );
  process.exit(1);
});
