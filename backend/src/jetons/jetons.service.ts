import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { createHash, randomInt, timingSafeEqual } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { BrevoService } from './brevo.service';

type TypeJeton = 'RESET_MDP' | 'VERIF_EMAIL';

const MAX_TENTATIVES = 5;
export const DUREE_RESET_MDP_MS = 15 * 60 * 1000; // 15 minutes
export const DUREE_VERIF_EMAIL_MS = 30 * 60 * 1000; // 30 minutes

function hacherCode(code: string): string {
  return createHash('sha256').update(code).digest('hex');
}

// Codes à 6 chiffres envoyés par email (réinitialisation du mot de passe, vérification de l'email) :
// stockés hachés, un seul code actif par utilisateur et par type, expiration, 5 essais au maximum.
@Injectable()
export class JetonsService {
  private readonly logger = new Logger(JetonsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly brevoService: BrevoService,
  ) {}

  // Crée un nouveau code (les anciens codes du même type sont invalidés) et le renvoie en clair
  // pour l'envoi par email : seul son hash est enregistré.
  async creerCode(
    idUtilisateur: number,
    type: TypeJeton,
    dureeMs: number,
  ): Promise<string> {
    const code = randomInt(100000, 1000000).toString();
    await this.prisma.$transaction([
      this.prisma.jeton.updateMany({
        where: { id_utilisateur: idUtilisateur, type, est_utilise: false },
        data: { est_utilise: true },
      }),
      this.prisma.jeton.create({
        data: {
          id_utilisateur: idUtilisateur,
          code: hacherCode(code),
          type,
          date_expiration: new Date(Date.now() + dureeMs),
        },
      }),
    ]);
    return code;
  }

  // Crée un code VERIF_EMAIL et l'envoie. Un échec d'envoi est journalisé sans être renvoyé au client
  // (l'utilisateur pourra demander un nouveau code).
  async envoyerCodeVerification(utilisateur: {
    id_utilisateur: number;
    email: string;
    prenom: string;
  }) {
    const code = await this.creerCode(
      utilisateur.id_utilisateur,
      'VERIF_EMAIL',
      DUREE_VERIF_EMAIL_MS,
    );
    try {
      await this.brevoService.envoyerCodeVerification(
        utilisateur.email,
        utilisateur.prenom,
        code,
      );
    } catch (e) {
      this.logger.error(
        `Échec de l'envoi du code de vérification (utilisateur ${utilisateur.id_utilisateur})`,
        e instanceof Error ? e.stack : String(e),
      );
    }
  }

  // Vérifie le code du jeton actif de l'utilisateur. Chaque essai réserve d'abord une tentative de
  // façon atomique (pas de dépassement avec des requêtes simultanées) ; un essai réussi la rend si
  // `rendreTentative` est vrai, un essai raté la garde. Au 5e échec, le jeton est invalidé.
  async verifierCode(
    idUtilisateur: number | null,
    type: TypeJeton,
    code: string,
    rendreTentative: boolean,
  ) {
    const erreur = new BadRequestException('Code invalide ou expiré.');
    if (idUtilisateur === null) throw erreur;

    const jeton = await this.prisma.jeton.findFirst({
      where: {
        id_utilisateur: idUtilisateur,
        type,
        est_utilise: false,
        date_expiration: { gt: new Date() },
        tentatives: { lt: MAX_TENTATIVES },
      },
      orderBy: { date_creation: 'desc' },
    });
    if (!jeton) throw erreur;

    const reserve = await this.prisma.jeton.updateMany({
      where: {
        id_jeton: jeton.id_jeton,
        est_utilise: false,
        tentatives: { lt: MAX_TENTATIVES },
      },
      data: { tentatives: { increment: 1 } },
    });
    if (reserve.count === 0) throw erreur;

    const attendu = Buffer.from(jeton.code, 'hex');
    const recu = Buffer.from(hacherCode(code), 'hex');
    const correct =
      attendu.length === recu.length && timingSafeEqual(attendu, recu);

    if (correct) {
      if (rendreTentative) {
        await this.prisma.jeton.update({
          where: { id_jeton: jeton.id_jeton },
          data: { tentatives: { decrement: 1 } },
        });
      }
      return jeton;
    }

    const apres = await this.prisma.jeton.findUnique({
      where: { id_jeton: jeton.id_jeton },
    });
    if (apres && apres.tentatives >= MAX_TENTATIVES) {
      await this.prisma.jeton.update({
        where: { id_jeton: jeton.id_jeton },
        data: { est_utilise: true },
      });
      throw new BadRequestException(
        'Trop de tentatives. Demandez un nouveau code.',
      );
    }
    throw erreur;
  }
}
