import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import { App } from 'supertest/types';
import { AlertesAdminService } from '../src/alertes-admin/alertes-admin.service';
import { PrismaService } from '../src/prisma/prisma.service';
import {
  EmailAlerte,
  creerApplication,
  creerCagnotte,
  creerUtilisateur,
  entete,
  validerIdentite,
  viderBase,
} from './outils';

type Utilisateur = { id_utilisateur: number; jeton: string; email: string };
type Cagnotte = {
  id_cagnotte: number;
  statut: string;
  raisons_verification: string[];
  motif_refus: string | null;
  date_debut: string;
};

function dans(jours: number): string {
  return new Date(Date.now() + jours * 86_400_000).toISOString().slice(0, 10);
}

describe('Publication et modération des cagnottes (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let jwt: JwtService;
  let emails: EmailAlerte[];
  let admin: Utilisateur;
  let ip = 0;

  beforeAll(async () => {
    ({ app, prisma, jwt, emails } = await creerApplication());
    await viderBase(prisma);
    admin = await creerUtilisateur(prisma, jwt, { admin: true });
  });

  afterAll(async () => {
    await app.close();
  });

  // Organisateur avec une vérification d'identité dans l'état voulu (ou sans vérification).
  async function organisateur(
    identite: 'VALIDEE' | 'EN_ATTENTE' | 'REFUSEE' | null,
  ) {
    const u = await creerUtilisateur(prisma, jwt);
    if (identite) {
      await validerIdentite(prisma, u.id_utilisateur, '699112233', identite);
    }
    return u as Utilisateur;
  }

  function creer(u: Utilisateur, champs: Record<string, unknown> = {}) {
    return request(app.getHttpServer())
      .post('/cagnottes')
      .set(entete(u.jeton))
      .send({
        titre: 'Soutien pour la rentrée',
        description: 'Achat de fournitures scolaires.',
        objectif: 200000,
        date_debut: dans(0),
        date_fin: dans(30),
        ...champs,
      });
  }
  const corps = (r: request.Response) => r.body as Cagnotte;
  const message = (r: request.Response) =>
    (r.body as { message: string }).message;
  const lire = (chemin: string, u?: Utilisateur) => {
    const requete = request(app.getHttpServer()).get(chemin);
    return u ? requete.set(entete(u.jeton)) : requete;
  };
  const adminPost = (chemin: string, donnees?: object) =>
    request(app.getHttpServer())
      .post(chemin)
      .set(entete(admin.jeton))
      .send(donnees);
  const enBase = (id: number) =>
    prisma.cagnotte.findUniqueOrThrow({ where: { id_cagnotte: id } });
  // Chaque appel vient d'une adresse IP différente, sauf si une adresse est imposée.
  function signaler(
    id: number,
    u?: Utilisateur,
    adresse?: string,
    motif = 'ARNAQUE',
  ) {
    ip += 1;
    const requete = request(app.getHttpServer())
      .post(`/cagnottes/${id}/signaler`)
      .set(
        'X-Forwarded-For',
        adresse ?? `10.0.${Math.floor(ip / 250)}.${(ip % 250) + 1}`,
      );
    return (u ? requete.set(entete(u.jeton)) : requete).send({ motif });
  }

  it('refuse la création sans vérification d’identité soumise, ou si elle a été refusée', async () => {
    const sans = await creer(await organisateur(null));
    expect(sans.status).toBe(403);
    expect(message(sans)).toContain('vérifier votre identité');

    const refusee = await creer(await organisateur('REFUSEE'));
    expect(refusee.status).toBe(403);
    expect(await prisma.cagnotte.count()).toBe(0);
  });

  it('publie immédiatement la cagnotte d’un organisateur à l’identité validée', async () => {
    const orga = await organisateur('VALIDEE');
    const reponse = await creer(orga);

    expect(reponse.status).toBe(201);
    expect(corps(reponse)).toMatchObject({
      statut: 'ACTIVE',
      raisons_verification: [],
    });
    const id = corps(reponse).id_cagnotte;
    expect((await lire(`/cagnottes/${id}`)).status).toBe(200);
    const liste = (await lire('/cagnottes?limite=50')).body as {
      donnees: Cagnotte[];
    };
    expect(liste.donnees.map((c) => c.id_cagnotte)).toContain(id);
  });

  it('met la cagnotte en vérification, invisible du public, quand l’identité est en cours', async () => {
    const orga = await organisateur('EN_ATTENTE');
    const autre = await organisateur('VALIDEE');
    emails.length = 0;
    const reponse = await creer(orga, { titre: 'Cagnotte en attente' });

    expect(reponse.status).toBe(201);
    expect(corps(reponse)).toMatchObject({
      statut: 'EN_VERIFICATION',
      raisons_verification: ['IDENTITE_EN_ATTENTE'],
    });
    const id = corps(reponse).id_cagnotte;

    // Même règle qu'une cagnotte privée : 404 pour le public, visible par l'organisateur et l'admin.
    for (const route of [
      `/cagnottes/${id}`,
      `/dons/cagnotte/${id}`,
      `/commentaires/cagnotte/${id}`,
    ]) {
      expect((await lire(route)).status).toBe(404);
      expect((await lire(route, autre)).status).toBe(404);
      expect((await lire(route, orga)).status).toBe(200);
      expect((await lire(route, admin)).status).toBe(200);
    }
    const liste = (await lire('/cagnottes?limite=50')).body as {
      donnees: Cagnotte[];
    };
    expect(liste.donnees.map((c) => c.id_cagnotte)).not.toContain(id);
    expect((await lire(`/partage/cagnottes/${id}`)).text).not.toContain(
      'Cagnotte en attente',
    );

    // Les administrateurs sont alertés : notification dans l'application et email.
    const notification = await prisma.recevoir.findFirst({
      where: {
        id_utilisateur: admin.id_utilisateur,
        notification: { id_cagnotte: id },
      },
      include: { notification: true },
    });
    expect(notification?.notification.code).toBe('CAGNOTTE_EN_VERIFICATION');
    expect(emails.flatMap((e) => e.lignes).join('\n')).toContain(
      'Cagnotte en attente',
    );
    expect(emails.every((e) => e.destinataires.includes(admin.email))).toBe(
      true,
    );
  });

  it('applique les règles de risque même avec une identité validée', async () => {
    const orga = await organisateur('VALIDEE');
    const eleve = await creer(orga, { objectif: 1_000_001 });
    expect(corps(eleve)).toMatchObject({
      statut: 'EN_VERIFICATION',
      raisons_verification: ['OBJECTIF_ELEVE'],
    });
    // Au seuil exact : pas de vérification.
    expect(corps(await creer(orga, { objectif: 1_000_000 })).statut).toBe(
      'ACTIVE',
    );

    const antecedent = await organisateur('VALIDEE');
    await creerCagnotte(prisma, antecedent.id_utilisateur, {
      statut: 'SUSPENDUE',
    });
    expect(corps(await creer(antecedent))).toMatchObject({
      statut: 'EN_VERIFICATION',
      raisons_verification: ['ANTECEDENT_ORGANISATEUR'],
    });
  });

  it('publie automatiquement, à la validation de l’identité, les cagnottes qui n’attendaient qu’elle', async () => {
    const orga = await organisateur('EN_ATTENTE');
    const simple = corps(await creer(orga, { titre: 'Simple' })).id_cagnotte;
    const risquee = corps(
      await creer(orga, { titre: 'Risquée', objectif: 5_000_000 }),
    ).id_cagnotte;
    const verification = await prisma.verificationIdentite.findFirstOrThrow({
      where: { id_utilisateur: orga.id_utilisateur },
    });

    const validation = await adminPost(
      `/admin/verifications-identite/${verification.id_verification}/valider`,
    );
    expect(validation.status).toBe(201);
    expect(
      (validation.body as { cagnottes_publiees: number }).cagnottes_publiees,
    ).toBe(1);

    expect(await enBase(simple)).toMatchObject({
      statut: 'ACTIVE',
      raisons_verification: [],
    });
    // La règle de risque demande toujours la décision d'un administrateur.
    expect(await enBase(risquee)).toMatchObject({
      statut: 'EN_VERIFICATION',
      raisons_verification: ['OBJECTIF_ELEVE'],
    });
    const notification = await prisma.recevoir.findFirst({
      where: {
        id_utilisateur: orga.id_utilisateur,
        notification: { id_cagnotte: simple },
      },
      include: { notification: true },
    });
    expect(notification?.notification.code).toBe('CAGNOTTE_PUBLIEE_IDENTITE');
  });

  it('un administrateur approuve ou refuse une cagnotte en vérification', async () => {
    const orga = await organisateur('VALIDEE');
    const aApprouver = corps(
      await creer(orga, { objectif: 2_000_000 }),
    ).id_cagnotte;
    const aRefuser = corps(
      await creer(orga, { objectif: 3_000_000 }),
    ).id_cagnotte;
    // Date de début déjà passée au moment de l'approbation.
    await prisma.cagnotte.update({
      where: { id_cagnotte: aApprouver },
      data: { date_debut: new Date('2026-01-01') },
    });

    // Réservé aux administrateurs.
    const interdit = await request(app.getHttpServer())
      .post(`/admin/cagnottes/${aApprouver}/approuver`)
      .set(entete(orga.jeton));
    expect(interdit.status).toBe(403);

    const approbation = await adminPost(
      `/admin/cagnottes/${aApprouver}/approuver`,
    );
    expect(approbation.status).toBe(201);
    const approuvee = await enBase(aApprouver);
    expect(approuvee.statut).toBe('ACTIVE');
    expect(approuvee.date_debut.getTime()).toBeGreaterThan(
      new Date('2026-01-01').getTime(),
    );
    expect(
      (await adminPost(`/admin/cagnottes/${aApprouver}/approuver`)).status,
    ).toBe(400);

    expect(
      (await adminPost(`/admin/cagnottes/${aRefuser}/refuser`, {})).status,
    ).toBe(400);
    const refus = await adminPost(`/admin/cagnottes/${aRefuser}/refuser`, {
      motif: 'Description trop vague.',
    });
    expect(refus.status).toBe(201);
    expect(await enBase(aRefuser)).toMatchObject({
      statut: 'REFUSEE',
      motif_refus: 'Description trop vague.',
    });
    expect((await lire(`/cagnottes/${aRefuser}`)).status).toBe(404);
    const notification = await prisma.recevoir.findFirst({
      where: {
        id_utilisateur: orga.id_utilisateur,
        notification: { id_cagnotte: aRefuser },
      },
      include: { notification: true },
      orderBy: { id_notification: 'desc' },
    });
    expect(notification?.notification.code).toBe('CAGNOTTE_REFUSEE');
    expect(notification?.notification.parametres).toMatchObject({
      motif: 'Description trop vague.',
    });
  });

  it('refuse d’approuver une cagnotte dont l’organisateur n’a pas d’identité validée', async () => {
    const orga = await organisateur('EN_ATTENTE');
    const id = corps(await creer(orga)).id_cagnotte;
    const reponse = await adminPost(`/admin/cagnottes/${id}/approuver`);
    expect(reponse.status).toBe(400);
    expect(message(reponse)).toContain('identité');
    expect((await enBase(id)).statut).toBe('EN_VERIFICATION');
  });

  it('une cagnotte en vérification ou refusée reste modifiable ; refusée, elle repasse en vérification', async () => {
    const orga = await organisateur('VALIDEE');
    const id = corps(await creer(orga, { objectif: 2_000_000 })).id_cagnotte;
    const modifier = (donnees: object) =>
      request(app.getHttpServer())
        .patch(`/cagnottes/${id}`)
        .set(entete(orga.jeton))
        .send(donnees);

    const enVerification = await modifier({ titre: 'Titre précisé' });
    expect(enVerification.status).toBe(200);
    expect(corps(enVerification).statut).toBe('EN_VERIFICATION');

    await adminPost(`/admin/cagnottes/${id}/refuser`, {
      motif: 'Objectif non justifié.',
    });
    const apresRefus = await modifier({
      description: 'Devis joint : 2 000 000 XAF de travaux.',
    });
    expect(apresRefus.status).toBe(200);
    expect(corps(apresRefus)).toMatchObject({
      statut: 'EN_VERIFICATION',
      motif_refus: null,
      raisons_verification: ['OBJECTIF_ELEVE', 'REVISION_APRES_REFUS'],
    });

    // Même en ramenant l'objectif sous le seuil, une cagnotte refusée attend un administrateur.
    expect(corps(await modifier({ objectif: 100000 }))).toMatchObject({
      statut: 'EN_VERIFICATION',
      raisons_verification: ['REVISION_APRES_REFUS'],
    });
    expect((await adminPost(`/admin/cagnottes/${id}/approuver`)).status).toBe(
      201,
    );
  });

  it('suspend automatiquement une cagnotte au 3e signalement et alerte les administrateurs', async () => {
    const orga = await organisateur('VALIDEE');
    const id = corps(
      await creer(orga, { titre: 'Cagnotte signalée' }),
    ).id_cagnotte;
    const u1 = await organisateur(null);
    const u2 = await organisateur(null);

    expect((await signaler(id, orga)).status).toBe(400); // pas sa propre cagnotte
    expect((await signaler(id, u1)).status).toBe(201);
    expect((await signaler(id, u1)).status).toBe(409); // une seule fois par compte
    expect((await signaler(id, undefined, '41.202.0.10')).status).toBe(201);
    expect((await signaler(id, undefined, '41.202.0.10')).status).toBe(409); // une seule fois par IP
    expect((await signaler(id, u2, undefined, 'MOTIF_INCONNU')).status).toBe(
      400,
    );
    expect((await enBase(id)).statut).toBe('ACTIVE');

    emails.length = 0;
    expect(
      (await signaler(id, u2, undefined, 'FAUSSES_INFORMATIONS')).status,
    ).toBe(201);

    expect((await enBase(id)).statut).toBe('SUSPENDUE');
    const alerte = await prisma.recevoir.findFirst({
      where: {
        id_utilisateur: admin.id_utilisateur,
        notification: { id_cagnotte: id },
      },
      include: { notification: true },
      orderBy: { id_notification: 'desc' },
    });
    expect(alerte?.notification.code).toBe('SUSPENSION_AUTOMATIQUE');
    // Une cagnotte suspendue n'est plus visible : elle ne peut plus être signalée par le public.
    expect((await signaler(id)).status).toBe(404);

    // Côté administration : liste, classement, et réactivation qui classe le reste.
    const liste = await lire(
      `/admin/signalements?statut=OUVERT&id_cagnotte=${id}`,
      admin,
    );
    const signalements = (
      liste.body as { donnees: { id_signalement: number; motif: string }[] }
    ).donnees;
    expect(signalements).toHaveLength(3);
    expect((await lire('/admin/signalements', u1)).status).toBe(403);
    const classement = await adminPost(
      `/admin/signalements/${signalements[0].id_signalement}/classer`,
    );
    expect(classement.status).toBe(201);
    expect(
      (
        await adminPost(
          `/admin/signalements/${signalements[0].id_signalement}/classer`,
        )
      ).status,
    ).toBe(400);

    const reactivation = await request(app.getHttpServer())
      .patch(`/admin/cagnottes/${id}/statut`)
      .set(entete(admin.jeton))
      .send({ statut: 'ACTIVE' });
    expect(reactivation.status).toBe(200);
    expect(
      await prisma.signalement.count({
        where: { id_cagnotte: id, statut: 'OUVERT' },
      }),
    ).toBe(0);
  });

  it('limite les signalements à 3 par minute et par adresse IP', async () => {
    const orga = await organisateur('VALIDEE');
    const ids = [];
    for (let i = 0; i < 4; i++) ids.push(corps(await creer(orga)).id_cagnotte);

    const statuts = [];
    for (const id of ids)
      statuts.push((await signaler(id, undefined, '41.202.9.9')).status);
    expect(statuts).toEqual([201, 201, 201, 429]);
  });

  it('refuse tout don sur une cagnotte en vérification, refusée ou suspendue', async () => {
    const orga = await organisateur('VALIDEE');
    const donateur = await organisateur(null);
    const donner = (idCagnotte: number) =>
      request(app.getHttpServer())
        .post('/dons')
        .set(entete(donateur.jeton))
        .send({
          id_cagnotte: idCagnotte,
          montant: 1000,
          methode_paiement: 'MTN_MOBILE_MONEY',
          numero_payeur: '699000000',
        });

    for (const statut of ['EN_VERIFICATION', 'REFUSEE', 'SUSPENDUE'] as const) {
      const cagnotte = await creerCagnotte(prisma, orga.id_utilisateur, {
        statut,
      });
      const reponse = await donner(cagnotte.id_cagnotte);
      expect(reponse.status).toBe(400);
      expect(message(reponse)).toContain("n'est pas en ligne");
    }
    expect(await prisma.don.count()).toBe(0);
  });

  it('regroupe en un seul email les alertes arrivées dans les 10 minutes', async () => {
    const alertes = app.get(AlertesAdminService);
    await alertes.envoyerEmails(); // vide la file et démarre la fenêtre de regroupement
    emails.length = 0;

    await alertes.alerter('IDENTITE_A_VERIFIER', {
      prenoms: 'Awa',
      nom: 'Ngono',
    });
    await alertes.alerter('SUSPENSION_AUTOMATIQUE', {
      titre: 'Tournoi',
      nombre: 3,
    });
    expect(emails).toHaveLength(0); // en attente : un email vient de partir

    await alertes.envoyerEmails(); // fin de la fenêtre
    expect(emails).toHaveLength(1);
    expect(emails[0].lignes).toEqual([
      "Identité à vérifier — Awa Ngono a soumis une vérification d'identité.",
      'Suspension automatique — La cagnotte « Tournoi » a été suspendue automatiquement après 3 signalements.',
    ]);
    expect(emails[0].sujet).toContain('2 éléments');
  });

  it('compte dans les statistiques ce qui attend une décision de modération', async () => {
    const stats = (await lire('/admin/statistiques', admin)).body as Record<
      string,
      number
    > & {
      cagnottes_par_statut: Record<string, number>;
    };
    expect(stats.nb_identites_a_verifier).toBe(
      await prisma.verificationIdentite.count({
        where: { statut: 'EN_ATTENTE' },
      }),
    );
    expect(stats.nb_cagnottes_en_verification).toBe(
      await prisma.cagnotte.count({ where: { statut: 'EN_VERIFICATION' } }),
    );
    expect(stats.nb_cagnottes_en_verification).toBeGreaterThan(0);
    expect(stats.nb_signalements_ouverts).toBe(
      await prisma.signalement.count({ where: { statut: 'OUVERT' } }),
    );
    expect(stats.cagnottes_par_statut).toHaveProperty('REFUSEE');
  });
});
