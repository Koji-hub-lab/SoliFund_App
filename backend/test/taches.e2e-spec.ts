import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { SchedulerRegistry } from '@nestjs/schedule';
import { App } from 'supertest/types';
import { AlertesAdminService } from '../src/alertes-admin/alertes-admin.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { TachesService, estTache } from '../src/taches/taches.service';
import {
  EmailAlerte,
  creerApplication,
  creerCagnotte,
  creerUtilisateur,
  viderBase,
} from './outils';

// Tâches planifiées lancées hors de l'application (scripts/taches.ts, par Cron) : TachesService.executer
// et alertes regroupées gardées en base.
describe('Tâches planifiées (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let jwt: JwtService;
  let emails: EmailAlerte[];
  let taches: TachesService;
  let alertes: AlertesAdminService;

  beforeAll(async () => {
    ({ app, prisma, jwt, emails } = await creerApplication());
    await viderBase(prisma);
    taches = app.get(TachesService);
    alertes = app.get(AlertesAdminService);
    await creerUtilisateur(prisma, jwt, { admin: true });
  });

  afterAll(async () => {
    await app.close();
  });

  it('sans TACHES_INTERNES=true, l’application ne lance aucune tâche elle-même', () => {
    expect(process.env.TACHES_INTERNES).toBeUndefined();
    expect(() => app.get(SchedulerRegistry)).toThrow();
  });

  it('reconnaît les noms de tâches du script', () => {
    for (const nom of [
      'reconciliation',
      'alertes',
      'maintenance',
      'purge-identites',
    ]) {
      expect(estTache(nom)).toBe(true);
    }
    expect(estTache('autre')).toBe(false);
    expect(estTache(undefined)).toBe(false);
  });

  it('alertes : la première part tout de suite, les suivantes attendent en base la fin des 10 minutes', async () => {
    emails.length = 0;
    await alertes.alerter('IDENTITE_A_VERIFIER', {
      prenoms: 'Awa',
      nom: 'Ngono',
    });
    expect(emails).toHaveLength(1);

    await alertes.alerter('VERSEMENT_INTROUVABLE', {
      retrait: 4,
      montant: 9700,
      fournisseur: 'AangaraaPay',
    });
    await alertes.alerter('SUSPENSION_AUTOMATIQUE', {
      titre: 'Tournoi',
      nombre: 3,
    });
    expect(emails).toHaveLength(1);
    expect(
      await prisma.alerteEmail.count({ where: { date_envoi: null } }),
    ).toBe(2);

    // Tâche lancée avant la fin de la fenêtre : rien n'est envoyé.
    expect(await taches.executer('alertes')).toBe(
      'Alertes : 0 alerte(s) envoyée(s) par email.',
    );
    expect(emails).toHaveLength(1);

    // 11 minutes plus tard (simulé) : un seul email regroupe les deux alertes, une seule fois.
    await prisma.alerteEmail.updateMany({
      where: { date_envoi: { not: null } },
      data: { date_envoi: new Date(Date.now() - 11 * 60_000) },
    });
    expect(await taches.executer('alertes')).toBe(
      'Alertes : 2 alerte(s) envoyée(s) par email.',
    );
    expect(emails).toHaveLength(2);
    expect(emails[1].sujet).toContain('2 éléments');
    expect(emails[1].lignes).toHaveLength(2);
    expect(await taches.executer('alertes')).toContain('0 alerte(s)');
  });

  it('maintenance : termine les cagnottes échues et supprime les alertes envoyées il y a plus de 30 jours', async () => {
    const orga = await creerUtilisateur(prisma, jwt);
    const cagnotte = await creerCagnotte(prisma, orga.id_utilisateur);
    await prisma.cagnotte.update({
      where: { id_cagnotte: cagnotte.id_cagnotte },
      data: { date_fin: new Date('2026-01-10') },
    });
    await prisma.alerteEmail.create({
      data: {
        code: 'IDENTITE_A_VERIFIER',
        parametres: {},
        date_envoi: new Date(Date.now() - 31 * 24 * 60 * 60_000),
      },
    });

    const resume = await taches.executer('maintenance');
    expect(resume).toMatch(/1 cagnotte\(s\) terminée\(s\)/);
    expect(resume).toMatch(/1 ancienne\(s\) alerte\(s\) supprimée\(s\)/);
    expect(
      (
        await prisma.cagnotte.findUniqueOrThrow({
          where: { id_cagnotte: cagnotte.id_cagnotte },
        })
      ).statut,
    ).toBe('TERMINEE');
  });

  it('purge des pièces refusées et réconciliation : exécutées, avec leur résumé', async () => {
    expect(await taches.executer('purge-identites')).toMatch(/^Purge : /);
    expect(await taches.executer('reconciliation')).toMatch(
      /^Réconciliation : 0 don\(s\)/,
    );
  });
});
