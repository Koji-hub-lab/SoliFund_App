import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import { Prisma, StatutCagnotte, StatutUtilisateur } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { configurerApplication } from '../src/configuration-application';
import { PrismaService } from '../src/prisma/prisma.service';
import { BrevoService } from '../src/jetons/brevo.service';
import { NotchPayClient } from '../src/payment/notchpay.client';
import { AangaraaPayClient } from '../src/payment/aangaraa.client';
import { ConfigService } from '@nestjs/config';
import { FauxNotchPay } from './faux-notchpay';

export const MOT_DE_PASSE = 'motdepasse-test-1';

// Email d'alerte aux administrateurs capturé par le faux service Brevo des tests.
export interface EmailAlerte {
  destinataires: string[];
  sujet: string;
  lignes: string[];
}

// Application complète (mêmes modules et réglages que l'API), branchée sur la base de test.
// Aucun email réel n'est envoyé : BrevoService est remplacé, et les alertes sont gardées dans
// `emails`. Aucun paiement réel non plus : NotchPayClient est remplacé par FauxNotchPay, et
// AangaraaPayClient par le faux fourni (sinon il vise une adresse injoignable). « trust proxy »
// permet aux tests de simuler des adresses IP avec X-Forwarded-For.
export async function creerApplication(options: { aangaraa?: object } = {}) {
  const emails: EmailAlerte[] = [];
  const notchPay = new FauxNotchPay();
  const fauxBrevo = {
    envoyerCodeReinitialisation: () => Promise.resolve(),
    envoyerCodeVerification: () => Promise.resolve(),
    // Un email par administrateur, écrit dans sa langue.
    envoyerAlerteAdmin: (
      destinataire: { email: string },
      sujet: string,
      lignes: string[],
    ) => {
      emails.push({ destinataires: [destinataire.email], sujet, lignes });
      return Promise.resolve();
    },
  };
  const module = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(BrevoService)
    .useValue(fauxBrevo)
    .overrideProvider(NotchPayClient)
    .useValue(notchPay)
    .overrideProvider(AangaraaPayClient)
    .useFactory({
      factory: (config: ConfigService) =>
        options.aangaraa ?? new AangaraaPayClient(config),
      inject: [ConfigService],
    })
    .compile();
  const app: NestExpressApplication = module.createNestApplication({
    logger: false,
    rawBody: true, // comme main.ts : signature des webhooks
  });
  app.set('trust proxy', true);
  configurerApplication(app);
  await app.init();
  return {
    app: app as INestApplication<App>,
    prisma: app.get(PrismaService),
    jwt: app.get(JwtService),
    emails,
    notchPay,
  };
}

// Vide toutes les tables (sauf les rôles et l'historique des migrations) entre deux fichiers de test.
export async function viderBase(prisma: PrismaService) {
  const tables = await prisma.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables
    WHERE schemaname = current_schema() AND tablename NOT IN ('_prisma_migrations', 'slf_role')`;
  if (tables.length === 0) return;
  const liste = tables.map((t) => `"${t.tablename}"`).join(', ');
  await prisma.$executeRawUnsafe(
    `TRUNCATE TABLE ${liste} RESTART IDENTITY CASCADE`,
  );
}

let compteur = 0;

// Crée un utilisateur (email vérifié) et renvoie son jeton, signé comme à la connexion.
export async function creerUtilisateur(
  prisma: PrismaService,
  jwt: JwtService,
  options: {
    admin?: boolean;
    statut?: StatutUtilisateur;
    dateFinSuspension?: Date;
  } = {},
) {
  compteur += 1;
  const roles = options.admin ? ['ROLE_USER', 'ROLE_ADMIN'] : ['ROLE_USER'];
  const utilisateur = await prisma.utilisateur.create({
    data: {
      nom: 'Test',
      prenom: `Utilisateur${compteur}`,
      email: `utilisateur${compteur}-${Date.now()}@solifund.test`,
      mot_de_passe: await bcrypt.hash(MOT_DE_PASSE, 4),
      est_verifie: true,
      statut: options.statut ?? 'ACTIF',
      date_fin_suspension: options.dateFinSuspension,
      posseders: {
        create: roles.map((nom) => ({
          role: { connect: { nom: nom as 'ROLE_USER' | 'ROLE_ADMIN' } },
        })),
      },
    },
  });
  const jeton = jwt.sign({
    sub: utilisateur.id_utilisateur,
    email: utilisateur.email,
    roles,
  });
  return { ...utilisateur, jeton };
}

export function entete(jeton: string) {
  return { Authorization: `Bearer ${jeton}` };
}

export async function creerCagnotte(
  prisma: PrismaService,
  idUtilisateur: number,
  donnees: {
    statut?: StatutCagnotte;
    est_publique?: boolean;
    montant_collecte?: number;
  } = {},
) {
  compteur += 1;
  return prisma.cagnotte.create({
    data: {
      titre: `Cagnotte de test ${compteur}`,
      slug: `cagnotte-test-${compteur}-${Date.now()}`,
      description: 'Description de test.',
      objectif: 100000,
      date_debut: new Date('2026-01-01'),
      date_fin: new Date('2099-12-31'),
      id_utilisateur: idUtilisateur,
      statut: donnees.statut ?? 'ACTIVE',
      est_publique: donnees.est_publique ?? true,
      montant_collecte: new Prisma.Decimal(donnees.montant_collecte ?? 0),
    },
  });
}

// Don avec son paiement ; statut EN_ATTENTE (à valider) ou VALIDE (déjà compté dans montant_collecte).
export async function creerDon(
  prisma: PrismaService,
  idCagnotte: number,
  idDonateur: number,
  montant: number,
  statut: 'EN_ATTENTE' | 'VALIDE' = 'EN_ATTENTE',
) {
  compteur += 1;
  const paiement = await prisma.paiement.create({
    data: {
      montant,
      methode_paiement: 'MTN_MOBILE_MONEY',
      numero_payeur: '+237699000000',
      id_utilisateur: idDonateur,
      reference: `SLF-DON-TEST-${compteur}-${Date.now()}`,
      statut,
    },
  });
  const don = await prisma.don.create({
    data: {
      id_cagnotte: idCagnotte,
      id_utilisateur: idDonateur,
      id_paiement: paiement.id_paiement,
      // Sans frais : le total payé est le montant du don.
      montant_don: montant,
      montant_total: montant,
      statut,
    },
  });
  if (statut === 'VALIDE') {
    await prisma.cagnotte.update({
      where: { id_cagnotte: idCagnotte },
      data: { montant_collecte: { increment: montant } },
    });
  }
  return { don, paiement };
}

// Vérification d'identité créée directement en base (sans fichiers), VALIDEE par défaut.
export async function validerIdentite(
  prisma: PrismaService,
  idUtilisateur: number,
  telephone = '699112233',
  statut: 'VALIDEE' | 'EN_ATTENTE' | 'REFUSEE' = 'VALIDEE',
) {
  return prisma.verificationIdentite.create({
    data: {
      id_utilisateur: idUtilisateur,
      type_piece: 'CNI',
      nom: 'Test',
      prenoms: 'Organisateur',
      date_naissance: new Date('1990-01-01'),
      numero_piece: `CNI-${idUtilisateur}-${Date.now()}`,
      date_expiration: new Date('2099-12-31'),
      telephone_retrait: telephone,
      methode_retrait: 'ORANGE_MONEY',
      statut,
      date_decision: statut === 'EN_ATTENTE' ? null : new Date(),
    },
  });
}

// Utilisateur dont l'identité est vérifiée : il peut demander des retraits.
export async function creerOrganisateur(
  prisma: PrismaService,
  jwt: JwtService,
) {
  const utilisateur = await creerUtilisateur(prisma, jwt);
  await validerIdentite(prisma, utilisateur.id_utilisateur);
  return utilisateur;
}
