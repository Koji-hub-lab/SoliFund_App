import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { existsSync } from 'fs';
import { join } from 'path';
import request from 'supertest';
import { App } from 'supertest/types';
import { PrismaService } from '../src/prisma/prisma.service';
import { VerificationIdentiteService } from '../src/verification-identite/verification-identite.service';
import {
  creerApplication,
  creerCagnotte,
  creerUtilisateur,
  entete,
  validerIdentite,
  viderBase,
} from './outils';

// Contenus minimaux reconnus par leur signature (les fichiers ne sont pas décodés).
const JPEG = Buffer.concat([
  Buffer.from([0xff, 0xd8, 0xff, 0xe0]),
  Buffer.alloc(64),
]);
const PNG = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  Buffer.alloc(64),
]);
const TEXTE = Buffer.from('<html>ceci n’est pas une image</html>');

function ilYA(annees: number, jours = 0): string {
  const d = new Date();
  d.setUTCFullYear(d.getUTCFullYear() - annees);
  d.setUTCDate(d.getUTCDate() - jours);
  return d.toISOString().slice(0, 10);
}
function dans(jours: number): string {
  return new Date(Date.now() + jours * 86_400_000).toISOString().slice(0, 10);
}

const VALIDE = {
  type_piece: 'CNI',
  nom: 'NGONO',
  prenoms: 'Awa Marie',
  date_naissance: '1990-05-10',
  numero_piece: '123456789',
  date_expiration: dans(365),
  telephone_retrait: '+237 6 77 11 22 33',
  methode_retrait: 'MTN_MOBILE_MONEY',
};

type Fichiers = Partial<Record<'recto' | 'verso' | 'selfie', Buffer>>;

describe('Vérification d’identité (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let jwt: JwtService;
  let admin: { id_utilisateur: number; jeton: string };

  beforeAll(async () => {
    ({ app, prisma, jwt } = await creerApplication());
    await viderBase(prisma);
    admin = await creerUtilisateur(prisma, jwt, { admin: true });
  });

  afterAll(async () => {
    await app.close();
  });

  function soumettre(
    jeton: string,
    champs: Record<string, string | undefined> = {},
    fichiers: Fichiers = { recto: JPEG, verso: PNG, selfie: JPEG },
  ) {
    const requete = request(app.getHttpServer())
      .post('/verification-identite')
      .set(entete(jeton));
    for (const [cle, valeur] of Object.entries({ ...VALIDE, ...champs })) {
      if (valeur !== undefined) void requete.field(cle, valeur);
    }
    for (const [nom, contenu] of Object.entries(fichiers)) {
      void requete.attach(nom, contenu, {
        filename: `${nom}.jpg`,
        contentType: 'image/jpeg',
      });
    }
    return requete;
  }
  const message = (r: request.Response) =>
    (r.body as { message: string }).message;
  const idDe = (r: request.Response) =>
    (r.body as { id_verification: number }).id_verification;
  const adminGet = (chemin: string) =>
    request(app.getHttpServer()).get(chemin).set(entete(admin.jeton));
  const adminPost = (chemin: string, corps?: object) =>
    request(app.getHttpServer())
      .post(chemin)
      .set(entete(admin.jeton))
      .send(corps);

  it('refuse une personne de moins de 18 ans', async () => {
    const u = await creerUtilisateur(prisma, jwt);
    const mineur = await soumettre(u.jeton, { date_naissance: ilYA(18, -2) });
    expect(mineur.status).toBe(400);
    expect(message(mineur)).toContain('18 ans');

    // 18 ans révolus (anniversaire aujourd'hui, ou hier selon le fuseau) : accepté.
    expect(
      (await soumettre(u.jeton, { date_naissance: ilYA(18) })).status,
    ).toBe(201);
  });

  it('refuse une pièce expirée', async () => {
    const u = await creerUtilisateur(prisma, jwt);
    const expiree = await soumettre(u.jeton, { date_expiration: dans(-2) });
    expect(expiree.status).toBe(400);
    expect(message(expiree)).toContain('expirée');
    expect(
      await prisma.verificationIdentite.count({
        where: { id_utilisateur: u.id_utilisateur },
      }),
    ).toBe(0);
  });

  it('exige les bonnes pièces selon le type', async () => {
    const u = await creerUtilisateur(prisma, jwt);
    // CNI sans verso, sans selfie, sans date d'expiration.
    expect(
      (await soumettre(u.jeton, {}, { recto: JPEG, selfie: JPEG })).status,
    ).toBe(400);
    expect(
      (await soumettre(u.jeton, {}, { recto: JPEG, verso: PNG })).status,
    ).toBe(400);
    expect(
      (await soumettre(u.jeton, { date_expiration: undefined })).status,
    ).toBe(400);
    // Fichier qui n'est pas une image, numéro de retrait invalide.
    const faux = await soumettre(
      u.jeton,
      {},
      { recto: TEXTE, verso: PNG, selfie: JPEG },
    );
    expect(faux.status).toBe(400);
    expect(message(faux)).toContain('JPG, PNG ou WEBP');
    expect(
      (await soumettre(u.jeton, { telephone_retrait: '222334455' })).status,
    ).toBe(400);
    // Numéro de retrait d'un autre opérateur que celui choisi.
    const orangeSurMtn = await soumettre(u.jeton, {
      telephone_retrait: '699112233',
      methode_retrait: 'MTN_MOBILE_MONEY',
    });
    expect(orangeSurMtn.status).toBe(400);
    expect(message(orangeSurMtn)).toContain('Ce numéro est un numéro Orange.');
    // 655 à 659 : Orange, même si 650 à 654 sont MTN.
    const orange655 = await soumettre(u.jeton, {
      telephone_retrait: '655112233',
      methode_retrait: 'MTN_MOBILE_MONEY',
    });
    expect(message(orange655)).toContain('Ce numéro est un numéro Orange.');
    const mtn = await soumettre(u.jeton, {
      telephone_retrait: '681112233',
      methode_retrait: 'ORANGE_MONEY',
    });
    expect(message(mtn)).toContain('Ce numéro est un numéro MTN.');
    expect(
      await prisma.verificationIdentite.count({
        where: { id_utilisateur: u.id_utilisateur },
      }),
    ).toBe(0);

    // Passeport sans verso : accepté.
    const passeport = await soumettre(
      u.jeton,
      { type_piece: 'PASSEPORT' },
      { recto: JPEG, selfie: JPEG },
    );
    expect(passeport.status).toBe(201);

    // Récépissé sans date d'expiration : accepté.
    const autre = await creerUtilisateur(prisma, jwt);
    const recepisse = await soumettre(autre.jeton, {
      type_piece: 'RECEPISSE_CNI',
      date_expiration: undefined,
    });
    expect(recepisse.status).toBe(201);
  });

  it('refuse un fichier de plus de 5 Mo', async () => {
    const u = await creerUtilisateur(prisma, jwt);
    const gros = Buffer.concat([JPEG, Buffer.alloc(5 * 1024 * 1024)]);
    const reponse = await soumettre(
      u.jeton,
      {},
      { recto: gros, verso: PNG, selfie: JPEG },
    );
    expect(reponse.status).toBe(413);
    expect(message(reponse)).toContain('5 Mo');
  });

  it('enregistre la soumission en privé et ne renvoie jamais les fichiers à l’utilisateur', async () => {
    const u = await creerUtilisateur(prisma, jwt);
    const reponse = await soumettre(u.jeton);
    expect(reponse.status).toBe(201);
    expect(reponse.body).toMatchObject({
      statut: 'EN_ATTENTE',
      telephone_retrait: '677112233',
      methode_retrait: 'MTN_MOBILE_MONEY',
    });
    expect(JSON.stringify(reponse.body)).not.toContain('fichier');

    const enBase = await prisma.verificationIdentite.findUniqueOrThrow({
      where: { id_verification: idDe(reponse) },
    });
    const dossier = join(process.env.STOCKAGE_PRIVE_DIR!, 'identites');
    expect(enBase.fichier_recto).toMatch(/^[0-9a-f-]{36}\.jpg$/);
    expect(enBase.fichier_verso).toMatch(/^[0-9a-f-]{36}\.png$/);
    expect(existsSync(join(dossier, enBase.fichier_recto!))).toBe(true);

    const moi = await request(app.getHttpServer())
      .get('/verification-identite/moi')
      .set(entete(u.jeton));
    expect(moi.body).toMatchObject({ statut: 'EN_ATTENTE', motif_refus: null });
    expect(JSON.stringify(moi.body)).not.toContain('fichier');

    // Le stockage privé n'est servi par aucune route publique.
    const direct = await request(app.getHttpServer()).get(
      `/uploads/identites/${enBase.fichier_recto}`,
    );
    expect(direct.status).toBe(404);
  });

  it('refuse une double soumission (en attente ou validée), accepte une nouvelle après un refus', async () => {
    const u = await creerUtilisateur(prisma, jwt);
    const premiere = await soumettre(u.jeton);
    expect(premiere.status).toBe(201);

    const double = await soumettre(u.jeton);
    expect(double.status).toBe(409);

    // Deux soumissions simultanées après un refus : une seule passe.
    await adminPost(`/admin/verifications-identite/${idDe(premiere)}/refuser`, {
      motif: 'Photo floue.',
    });
    const simultanees = await Promise.all([
      soumettre(u.jeton),
      soumettre(u.jeton),
    ]);
    expect(simultanees.map((r) => r.status).sort()).toEqual([201, 409]);

    const deuxieme = simultanees.find((r) => r.status === 201)!;
    await adminPost(`/admin/verifications-identite/${idDe(deuxieme)}/valider`);
    expect((await soumettre(u.jeton)).status).toBe(409);

    // L'historique est conservé ; la dernière soumission fait foi.
    const historique = await prisma.verificationIdentite.findMany({
      where: { id_utilisateur: u.id_utilisateur },
      orderBy: { id_verification: 'asc' },
    });
    expect(historique.map((v) => v.statut)).toEqual(['REFUSEE', 'VALIDEE']);
  });

  it('réserve les fichiers et les routes d’administration aux administrateurs', async () => {
    const u = await creerUtilisateur(prisma, jwt);
    const autre = await creerUtilisateur(prisma, jwt);
    const id = idDe(await soumettre(u.jeton));
    const chemin = `/admin/verifications-identite/${id}`;

    for (const route of [
      `${chemin}/fichiers/recto`,
      chemin,
      '/admin/verifications-identite',
    ]) {
      expect((await request(app.getHttpServer()).get(route)).status).toBe(401);
      expect(
        (await request(app.getHttpServer()).get(route).set(entete(autre.jeton)))
          .status,
      ).toBe(403);
      // Même le propriétaire de la pièce n'y accède pas.
      expect(
        (await request(app.getHttpServer()).get(route).set(entete(u.jeton)))
          .status,
      ).toBe(403);
    }
    for (const action of ['valider', 'refuser']) {
      const reponse = await request(app.getHttpServer())
        .post(`${chemin}/${action}`)
        .set(entete(u.jeton))
        .send({ motif: 'x' });
      expect(reponse.status).toBe(403);
    }
    expect(
      await prisma.journalVerificationIdentite.count({
        where: { id_verification: id },
      }),
    ).toBe(0);
  });

  it('sert les fichiers à un administrateur sans cache, et journalise chaque consultation', async () => {
    const u = await creerUtilisateur(prisma, jwt);
    const id = idDe(await soumettre(u.jeton));

    const recto = await adminGet(
      `/admin/verifications-identite/${id}/fichiers/recto`,
    ).buffer(true);
    expect(recto.status).toBe(200);
    expect(recto.headers['cache-control']).toBe('no-store');
    expect(recto.headers['content-type']).toBe('image/jpeg');
    expect(Buffer.compare(recto.body as Buffer, JPEG)).toBe(0);

    const verso = await adminGet(
      `/admin/verifications-identite/${id}/fichiers/verso`,
    );
    expect(verso.headers['content-type']).toBe('image/png');
    expect(
      (await adminGet(`/admin/verifications-identite/${id}/fichiers/autre`))
        .status,
    ).toBe(404);

    const journal = await prisma.journalVerificationIdentite.findMany({
      where: { id_verification: id },
      orderBy: { id_journal: 'asc' },
    });
    expect(journal.map((j) => [j.action, j.detail, j.id_admin])).toEqual([
      ['CONSULTATION_FICHIER', 'recto', admin.id_utilisateur],
      ['CONSULTATION_FICHIER', 'verso', admin.id_utilisateur],
    ]);
  });

  it('valide ou refuse (motif obligatoire), notifie l’utilisateur et journalise la décision', async () => {
    const valide = await creerUtilisateur(prisma, jwt);
    const refuse = await creerUtilisateur(prisma, jwt);
    const idValide = idDe(await soumettre(valide.jeton));
    const idRefuse = idDe(await soumettre(refuse.jeton));

    const liste = await adminGet(
      '/admin/verifications-identite?statut=EN_ATTENTE&limite=50',
    );
    const ids = (
      liste.body as { donnees: { id_verification: number; fichiers: object }[] }
    ).donnees;
    expect(ids.map((v) => v.id_verification)).toEqual(
      expect.arrayContaining([idValide, idRefuse]),
    );
    expect(JSON.stringify(liste.body)).not.toContain('fichier_');

    expect(
      (await adminPost(`/admin/verifications-identite/${idRefuse}/refuser`, {}))
        .status,
    ).toBe(400);
    expect(
      (
        await adminPost(`/admin/verifications-identite/${idRefuse}/refuser`, {
          motif: 'Le selfie ne montre pas la pièce.',
        })
      ).status,
    ).toBe(201);
    expect(
      (await adminPost(`/admin/verifications-identite/${idValide}/valider`))
        .status,
    ).toBe(201);
    // Une décision ne se prend qu'une fois.
    expect(
      (await adminPost(`/admin/verifications-identite/${idValide}/valider`))
        .status,
    ).toBe(400);

    const detail = await adminGet(`/admin/verifications-identite/${idValide}`);
    expect(detail.body).toMatchObject({
      statut: 'VALIDEE',
      id_admin: admin.id_utilisateur,
      fichiers: { recto: true, verso: true, selfie: true },
    });

    const profil = async (jeton: string) =>
      (
        await request(app.getHttpServer())
          .get('/utilisateurs/moi')
          .set(entete(jeton))
      ).body as { identite_verifiee: boolean };
    expect((await profil(valide.jeton)).identite_verifiee).toBe(true);
    expect((await profil(refuse.jeton)).identite_verifiee).toBe(false);

    const moi = await request(app.getHttpServer())
      .get('/verification-identite/moi')
      .set(entete(refuse.jeton));
    expect(moi.body).toMatchObject({
      statut: 'REFUSEE',
      motif_refus: 'Le selfie ne montre pas la pièce.',
    });

    const notification = async (idUtilisateur: number) =>
      (
        await prisma.recevoir.findFirstOrThrow({
          where: {
            id_utilisateur: idUtilisateur,
            notification: { type: 'VERIFICATION' },
          },
          include: { notification: true },
        })
      ).notification;
    expect((await notification(valide.id_utilisateur)).code).toBe(
      'IDENTITE_VERIFIEE',
    );
    expect((await notification(refuse.id_utilisateur)).parametres).toEqual({
      motif: 'Le selfie ne montre pas la pièce.',
    });

    const decisions = await prisma.journalVerificationIdentite.findMany({
      where: { id_verification: { in: [idValide, idRefuse] } },
      orderBy: { id_journal: 'asc' },
    });
    expect(
      decisions.map((j) => [j.id_verification, j.action, j.id_admin]),
    ).toEqual([
      [idRefuse, 'REFUS', admin.id_utilisateur],
      [idValide, 'VALIDATION', admin.id_utilisateur],
    ]);
  });

  it('refuse un retrait tant que l’identité n’est pas validée', async () => {
    const u = await creerUtilisateur(prisma, jwt);
    const cagnotte = await creerCagnotte(prisma, u.id_utilisateur, {
      montant_collecte: 10000,
    });
    const demander = () =>
      request(app.getHttpServer())
        .post('/retraits')
        .set(entete(u.jeton))
        .send({ id_cagnotte: cagnotte.id_cagnotte, montant: 1000 });

    expect((await demander()).status).toBe(403); // aucune vérification
    const id = idDe(await soumettre(u.jeton));
    const enAttente = await demander();
    expect(enAttente.status).toBe(403); // en attente
    expect(message(enAttente)).toContain("en cours d'examen");

    await adminPost(`/admin/verifications-identite/${id}/valider`);
    expect((await demander()).status).toBe(201);

    // Révocation par l'administrateur : les retraits sont de nouveau refusés.
    await adminPost(`/admin/verifications-identite/${id}/refuser`, {
      motif: 'Numéro à changer.',
    });
    expect((await demander()).status).toBe(403);
    expect(
      await prisma.retrait.count({
        where: { id_cagnotte: cagnotte.id_cagnotte },
      }),
    ).toBe(1);
  });

  it('enregistre toujours le retrait sur le numéro et l’opérateur vérifiés', async () => {
    const u = await creerUtilisateur(prisma, jwt);
    await validerIdentite(prisma, u.id_utilisateur, '677000111');
    const cagnotte = await creerCagnotte(prisma, u.id_utilisateur, {
      montant_collecte: 10000,
    });

    const reponse = await request(app.getHttpServer())
      .post('/retraits')
      .set(entete(u.jeton))
      .send({
        id_cagnotte: cagnotte.id_cagnotte,
        montant: 2000,
        // Un autre numéro envoyé dans la demande est ignoré.
        numero_beneficiaire: '699999999',
        methode_retrait: 'MTN_MOBILE_MONEY',
      });

    expect(reponse.status).toBe(201);
    const retrait = await prisma.retrait.findFirstOrThrow({
      where: { id_cagnotte: cagnotte.id_cagnotte },
    });
    expect(retrait.numero_beneficiaire).toBe('677000111');
    expect(retrait.methode_retrait).toBe('ORANGE_MONEY');
  });

  it('supprime les fichiers d’une soumission refusée depuis plus de 30 jours, pas les autres', async () => {
    const ancien = await creerUtilisateur(prisma, jwt);
    const recent = await creerUtilisateur(prisma, jwt);
    const idAncien = idDe(await soumettre(ancien.jeton));
    const idRecent = idDe(await soumettre(recent.jeton));
    await adminPost(`/admin/verifications-identite/${idAncien}/refuser`, {
      motif: 'Illisible.',
    });
    await adminPost(`/admin/verifications-identite/${idRecent}/refuser`, {
      motif: 'Illisible.',
    });
    await prisma.verificationIdentite.update({
      where: { id_verification: idAncien },
      data: { date_decision: new Date(Date.now() - 31 * 86_400_000) },
    });
    const avant = await prisma.verificationIdentite.findUniqueOrThrow({
      where: { id_verification: idAncien },
    });
    const dossier = join(process.env.STOCKAGE_PRIVE_DIR!, 'identites');

    expect(
      await app.get(VerificationIdentiteService).purgerFichiersRefuses(),
    ).toBe(1);

    const apres = await prisma.verificationIdentite.findUniqueOrThrow({
      where: { id_verification: idAncien },
    });
    expect([
      apres.fichier_recto,
      apres.fichier_verso,
      apres.fichier_selfie,
    ]).toEqual([null, null, null]);
    expect(apres.fichiers_supprimes_le).not.toBeNull();
    expect(existsSync(join(dossier, avant.fichier_recto!))).toBe(false);
    expect(
      (
        await adminGet(
          `/admin/verifications-identite/${idAncien}/fichiers/recto`,
        )
      ).status,
    ).toBe(404);

    const garde = await prisma.verificationIdentite.findUniqueOrThrow({
      where: { id_verification: idRecent },
    });
    expect(existsSync(join(dossier, garde.fichier_recto!))).toBe(true);
  });
});
