import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import { App } from 'supertest/types';
import { AlertesAdminService } from '../src/alertes-admin/alertes-admin.service';
import { NotificationsService } from '../src/notifications/notifications.service';
import { PrismaService } from '../src/prisma/prisma.service';
import {
  EmailAlerte,
  creerApplication,
  creerCagnotte,
  creerUtilisateur,
  entete,
  viderBase,
} from './outils';

type Utilisateur = Awaited<ReturnType<typeof creerUtilisateur>>;

// Attention : /auth/* est limité à 5 appels par minute ; ce fichier en fait 5.
describe('Langue des messages, des emails et des notifications (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let jwt: JwtService;
  let emails: EmailAlerte[];
  let utilisateur: Utilisateur;

  beforeAll(async () => {
    ({ app, prisma, jwt, emails } = await creerApplication());
    await viderBase(prisma);
    utilisateur = await creerUtilisateur(prisma, jwt);
  });

  afterAll(async () => {
    await app.close();
  });

  const http = () => request(app.getHttpServer());
  const message = (reponse: request.Response) =>
    (reponse.body as { message: string | string[] }).message;

  describe('messages d’erreur selon Accept-Language', () => {
    const connexion = (langue?: string) => {
      const requete = http().post('/auth/login');
      if (langue) void requete.set('Accept-Language', langue);
      return requete.send({
        email: utilisateur.email,
        mot_de_passe: 'mauvais-mot-de-passe',
      });
    };

    it('erreur métier : français par défaut, anglais sur demande', async () => {
      const defaut = await connexion();
      expect(defaut.status).toBe(401);
      expect(message(defaut)).toBe('Identifiants invalides.');

      expect(message(await connexion('fr-CM,fr;q=0.9'))).toBe(
        'Identifiants invalides.',
      );
      const anglais = await connexion('en-GB,en;q=0.9,fr;q=0.8');
      expect(anglais.status).toBe(401);
      expect(message(anglais)).toBe('Incorrect email or password.');
      // Langue non gérée : français.
      expect(message(await connexion('de'))).toBe('Identifiants invalides.');
    });

    it('validation des DTO', async () => {
      const inscrire = (langue: string) =>
        http()
          .post('/utilisateurs/inscription')
          .set('Accept-Language', langue)
          .send({ nom: '', prenom: 'Awa', email: 'pas-un-email' });

      const francais = await inscrire('fr');
      expect(francais.status).toBe(400);
      expect(message(francais)).toEqual(
        expect.arrayContaining([
          'Le nom est obligatoire.',
          "L'adresse email n'est pas valide.",
          'Le mot de passe doit contenir au moins 8 caractères.',
        ]),
      );

      const anglais = await inscrire('en');
      expect(anglais.status).toBe(400);
      expect(message(anglais)).toEqual(
        expect.arrayContaining([
          'The last name is required.',
          "This email address isn't valid.",
          'The password must be at least 8 characters.',
        ]),
      );
    });

    it('erreur Prisma traduite par le filtre d’exception', async () => {
      // Notification inexistante : Prisma lève P2025, traduite en 404.
      const marquer = (langue: string) =>
        http()
          .patch('/notifications/999999/lue')
          .set(entete(utilisateur.jeton))
          .set('Accept-Language', langue);

      const francais = await marquer('fr');
      expect(francais.status).toBe(404);
      expect(message(francais)).toBe("L'élément demandé est introuvable.");

      const anglais = await marquer('en');
      expect(anglais.status).toBe(404);
      expect(message(anglais)).toBe("We couldn't find what you asked for.");
    });

    it('requête sans jeton', async () => {
      const moi = (langue: string) =>
        http().get('/utilisateurs/moi').set('Accept-Language', langue);
      expect(message(await moi('fr'))).toBe(
        'Connexion requise. Reconnectez-vous.',
      );
      expect(message(await moi('en'))).toBe('Please log in to continue.');
    });

    it('message de confirmation (réponse réussie)', async () => {
      const demander = (langue: string) =>
        http()
          .post('/auth/mot-de-passe-oublie')
          .set('Accept-Language', langue)
          .send({ email: 'inconnu@solifund.test' });
      expect(message(await demander('en'))).toBe(
        'If this account exists, a code has been sent by email.',
      );
    });
  });

  describe('langue préférée', () => {
    const modifier = (corps: object, langue = 'fr') =>
      http()
        .patch('/utilisateurs/moi')
        .set(entete(utilisateur.jeton))
        .set('Accept-Language', langue)
        .send(corps);

    it('vaut « fr » par défaut et se modifie par PATCH /utilisateurs/moi', async () => {
      const avant = await http()
        .get('/utilisateurs/moi')
        .set(entete(utilisateur.jeton));
      expect(avant.body).toMatchObject({ langue_preferee: 'fr' });

      const reponse = await modifier({ langue_preferee: 'en' });
      expect(reponse.status).toBe(200);
      expect(reponse.body).toMatchObject({
        langue_preferee: 'en',
        prenom: utilisateur.prenom, // les autres champs ne changent pas
      });
      const enBase = await prisma.utilisateur.findUniqueOrThrow({
        where: { id_utilisateur: utilisateur.id_utilisateur },
      });
      expect(enBase.langue_preferee).toBe('en');
    });

    it('refuse une langue non gérée', async () => {
      const francais = await modifier({ langue_preferee: 'de' });
      expect(francais.status).toBe(400);
      expect(message(francais)).toEqual([
        'La langue doit être « fr » ou « en ».',
      ]);
      expect(message(await modifier({ langue_preferee: 'de' }, 'en'))).toEqual([
        'The language must be “fr” or “en”.',
      ]);
    });

    it('enregistre la langue de l’interface à l’inscription', async () => {
      const reponse = await http()
        .post('/utilisateurs/inscription')
        .set('Accept-Language', 'en')
        .send({
          nom: 'Ngono',
          prenom: 'Awa',
          email: 'awa-langue@solifund.test',
          mot_de_passe: 'motdepasse-test-1',
        });
      expect(reponse.status).toBe(201);
      expect(reponse.body).toMatchObject({ langue_preferee: 'en' });
    });

    it('écrit l’email d’alerte dans la langue de chaque administrateur', async () => {
      const adminFr = await creerUtilisateur(prisma, jwt, { admin: true });
      const adminEn = await creerUtilisateur(prisma, jwt, { admin: true });
      await prisma.utilisateur.update({
        where: { id_utilisateur: adminEn.id_utilisateur },
        data: { langue_preferee: 'en' },
      });
      const alertes = app.get(AlertesAdminService);
      await alertes.envoyerEmails();
      emails.length = 0;

      await alertes.alerter('CAGNOTTE_EN_VERIFICATION', {
        titre: 'Forage de Bikok',
        raisons: ['OBJECTIF_ELEVE', 'IDENTITE_EN_ATTENTE'],
      });
      await alertes.envoyerEmails();

      const pour = (email: string) =>
        emails.find((e) => e.destinataires.includes(email));
      expect(pour(adminFr.email)).toMatchObject({
        sujet: 'SoliFund : un élément à traiter',
        lignes: [
          "Cagnotte en vérification — La cagnotte « Forage de Bikok » attend une vérification (objectif élevé, identité de l'organisateur en cours de vérification).",
        ],
      });
      expect(pour(adminEn.email)).toMatchObject({
        sujet: 'SoliFund: one item to review',
        lignes: [
          "Fundraiser under review — The fundraiser “Forage de Bikok” is waiting for review (high goal, organiser's identity being verified).",
        ],
      });
    });
  });

  describe('notifications', () => {
    it('renvoie un code et des paramètres, et garde le texte des anciennes', async () => {
      const cagnotte = await creerCagnotte(prisma, utilisateur.id_utilisateur);
      // Ancienne notification, enregistrée en texte avant ce changement.
      await prisma.notification.create({
        data: {
          titre: 'Nouveau don reçu',
          message: 'Vous avez reçu un don de 5 000 XAF.',
          type: 'DON',
          date_envoi: new Date('2026-01-01'),
          destinataires: {
            create: { id_utilisateur: utilisateur.id_utilisateur },
          },
        },
      });
      await app
        .get(NotificationsService)
        .envoyer(
          utilisateur.id_utilisateur,
          'DON_RECU',
          { montant: 5000, devise: 'XAF', titre: cagnotte.titre },
          'DON',
          cagnotte.id_cagnotte,
        );

      const reponse = await http()
        .get('/notifications')
        .set(entete(utilisateur.jeton));
      expect(reponse.status).toBe(200);
      const [nouvelle, ancienne] = (
        reponse.body as { notification: Record<string, unknown> }[]
      ).map((r) => r.notification);
      expect(nouvelle).toMatchObject({
        code: 'DON_RECU',
        parametres: { montant: 5000, devise: 'XAF', titre: cagnotte.titre },
        titre: null,
        message: null,
      });
      expect(ancienne).toMatchObject({
        code: null,
        titre: 'Nouveau don reçu',
        message: 'Vous avez reçu un don de 5 000 XAF.',
      });
    });
  });

  describe('page de partage', () => {
    const page = (chemin: string, langue?: string) => {
      const requete = http().get(chemin);
      if (langue) void requete.set('Accept-Language', langue);
      return requete;
    };

    it('traduit les textes génériques', async () => {
      const francais = await page('/partage/cagnottes/999999');
      expect(francais.text).toContain('<html lang="fr">');
      expect(francais.text).toContain('Cagnottes solidaires au Cameroun');
      expect(francais.text).toContain('Continuer vers SoliFund');

      const anglais = await page('/partage/cagnottes/999999', 'en');
      expect(anglais.text).toContain('<html lang="en">');
      expect(anglais.text).toContain('content="en_GB"');
      expect(anglais.text).toContain('SoliFund — Fundraising for Cameroon');
      expect(anglais.text).toContain('Continue to SoliFund');
      expect(anglais.headers.vary).toContain('Accept-Language');
    });

    it('garde le contenu de la cagnotte tel quel', async () => {
      const { id_cagnotte } = await creerCagnotte(
        prisma,
        utilisateur.id_utilisateur,
      );
      const cagnotte = await prisma.cagnotte.update({
        where: { id_cagnotte },
        data: {
          titre: 'Soins pour grand-mère Thérèse',
          description: 'Aidons Thérèse à payer son opération.',
        },
      });
      const anglais = await page(
        `/partage/cagnottes/${cagnotte.id_cagnotte}`,
        'en',
      );
      expect(anglais.text).toContain('Soins pour grand-mère Thérèse');
      expect(anglais.text).toContain('Aidons Thérèse à payer son opération.');
      expect(anglais.text).toContain('Continue to SoliFund');
    });
  });
});
