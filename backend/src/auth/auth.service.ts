import { Injectable, Logger, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { createHash, randomInt, timingSafeEqual } from 'crypto';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { UtilisateursService } from '../utilisateurs/utilisateurs.service';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { VerifyCodeDto } from './dto/verify-code.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { BrevoService } from './brevo.service';

const MAX_TENTATIVES = 5;
const DUREE_CODE_MS = 15 * 60 * 1000; // 15 minutes
const MESSAGE_ENVOI = 'Si ce compte existe, un code a été envoyé par email.';

function genererCodeSixChiffres(): string {
  return randomInt(100000, 1000000).toString();
}

function hacherCode(code: string): string {
  return createHash('sha256').update(code).digest('hex');
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly utilisateursService: UtilisateursService,
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
    private readonly brevoService: BrevoService,
  ) {}

  async login(dto: LoginDto) {
    const utilisateur = await this.utilisateursService.trouverParEmail(dto.email);
    if (!utilisateur) {
      throw new UnauthorizedException('Identifiants invalides.');
    }

    const motDePasseValide = await bcrypt.compare(dto.mot_de_passe, utilisateur.mot_de_passe);
    if (!motDePasseValide) {
      throw new UnauthorizedException('Identifiants invalides.');
    }

    await this.verifierStatutConnexion(utilisateur);

    const possessions = await this.prisma.posseder.findMany({
      where: { id_utilisateur: utilisateur.id_utilisateur },
      include: { role: true },
    });
    const roles = possessions.map((p) => p.role.nom);

    const payload = { sub: utilisateur.id_utilisateur, email: utilisateur.email, roles };

    return {
      access_token: this.jwtService.sign(payload),
      utilisateur: {
        id_utilisateur: utilisateur.id_utilisateur,
        nom: utilisateur.nom,
        prenom: utilisateur.prenom,
        email: utilisateur.email,
        roles,
      },
    };
  }

  // Refuse la connexion d'un compte non ACTIF. Une suspension dont la date de fin est passée
  // est levée automatiquement (le compte repasse en ACTIF).
  private async verifierStatutConnexion(utilisateur: {
    id_utilisateur: number;
    statut: string;
    date_fin_suspension: Date | null;
  }) {
    if (utilisateur.statut === 'ACTIF') return;

    if (utilisateur.statut === 'SUSPENDU') {
      const fin = utilisateur.date_fin_suspension;
      if (fin && fin.getTime() <= Date.now()) {
        await this.prisma.utilisateur.update({
          where: { id_utilisateur: utilisateur.id_utilisateur },
          data: { statut: 'ACTIF', date_fin_suspension: null },
        });
        return;
      }
      throw new UnauthorizedException(
        fin
          ? `Ton compte est suspendu jusqu'au ${fin.toLocaleDateString('fr-FR')}.`
          : "Ton compte est suspendu. Contacte l'administrateur.",
      );
    }
    if (utilisateur.statut === 'BANNI') {
      throw new UnauthorizedException('Ton compte a été banni.');
    }
    throw new UnauthorizedException("Ton compte est désactivé. Contacte l'administrateur.");
  }

  async demanderReinitialisation(dto: ForgotPasswordDto) {
    const utilisateur = await this.utilisateursService.trouverParEmail(dto.email);
    if (!utilisateur) {
      // Réponse identique que le compte existe ou non, pour ne pas révéler les emails inscrits
      return { message: MESSAGE_ENVOI };
    }

    const code = genererCodeSixChiffres();
    await this.prisma.$transaction([
      // Un seul code valide à la fois : les anciens codes de cet utilisateur sont invalidés.
      this.prisma.jeton.updateMany({
        where: { id_utilisateur: utilisateur.id_utilisateur, type: 'RESET_MDP', est_utilise: false },
        data: { est_utilise: true },
      }),
      this.prisma.jeton.create({
        data: {
          id_utilisateur: utilisateur.id_utilisateur,
          code: hacherCode(code),
          type: 'RESET_MDP',
          date_expiration: new Date(Date.now() + DUREE_CODE_MS),
        },
      }),
    ]);

    try {
      await this.brevoService.envoyerCodeReinitialisation(utilisateur.email, utilisateur.prenom, code);
    } catch (e) {
      // Pas d'erreur côté client : elle révélerait que le compte existe.
      this.logger.error(
        `Échec de l'envoi du code de réinitialisation (utilisateur ${utilisateur.id_utilisateur})`,
        e instanceof Error ? e.stack : String(e),
      );
    }

    return { message: MESSAGE_ENVOI };
  }

  async verifierCode(dto: VerifyCodeDto) {
    await this.consommerTentative(dto.email, dto.code, false);
    return { message: 'Code valide.' };
  }

  async reinitialiserMotDePasse(dto: ResetPasswordDto) {
    const jeton = await this.consommerTentative(dto.email, dto.code, true);
    const mot_de_passe_hash = await bcrypt.hash(dto.mot_de_passe, 10);

    await this.prisma.$transaction(async (tx) => {
      // Marque le jeton utilisé seulement s'il ne l'est pas déjà (deux envois simultanés).
      const { count } = await tx.jeton.updateMany({
        where: { id_jeton: jeton.id_jeton, est_utilise: false },
        data: { est_utilise: true },
      });
      if (count === 0) {
        throw new BadRequestException('Code invalide ou expiré.');
      }
      await tx.utilisateur.update({
        where: { id_utilisateur: jeton.id_utilisateur },
        data: { mot_de_passe: mot_de_passe_hash },
      });
    });

    return { message: 'Mot de passe réinitialisé avec succès.' };
  }

  // Vérifie le code du jeton RESET_MDP actif de l'utilisateur. Chaque essai réserve d'abord une
  // tentative de façon atomique (pas de dépassement avec des requêtes simultanées) ; un essai réussi
  // la rend, un essai raté la garde. Au 5e échec, le jeton est invalidé.
  private async consommerTentative(email: string, code: string, pourReinitialiser: boolean) {
    const erreur = new BadRequestException('Code invalide ou expiré.');

    const utilisateur = await this.utilisateursService.trouverParEmail(email);
    if (!utilisateur) throw erreur;

    const jeton = await this.prisma.jeton.findFirst({
      where: {
        id_utilisateur: utilisateur.id_utilisateur,
        type: 'RESET_MDP',
        est_utilise: false,
        date_expiration: { gt: new Date() },
        tentatives: { lt: MAX_TENTATIVES },
      },
      orderBy: { date_creation: 'desc' },
    });
    if (!jeton) throw erreur;

    const reserve = await this.prisma.jeton.updateMany({
      where: { id_jeton: jeton.id_jeton, est_utilise: false, tentatives: { lt: MAX_TENTATIVES } },
      data: { tentatives: { increment: 1 } },
    });
    if (reserve.count === 0) throw erreur;

    const attendu = Buffer.from(jeton.code, 'hex');
    const recu = Buffer.from(hacherCode(code), 'hex');
    const correct = attendu.length === recu.length && timingSafeEqual(attendu, recu);

    if (correct) {
      if (!pourReinitialiser) {
        await this.prisma.jeton.update({
          where: { id_jeton: jeton.id_jeton },
          data: { tentatives: { decrement: 1 } },
        });
      }
      return jeton;
    }

    const apres = await this.prisma.jeton.findUnique({ where: { id_jeton: jeton.id_jeton } });
    if (apres && apres.tentatives >= MAX_TENTATIVES) {
      await this.prisma.jeton.update({ where: { id_jeton: jeton.id_jeton }, data: { est_utilise: true } });
      throw new BadRequestException('Trop de tentatives. Demande un nouveau code.');
    }
    throw erreur;
  }
}