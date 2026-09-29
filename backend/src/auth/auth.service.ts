import {
  Injectable,
  Logger,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { UtilisateursService } from '../utilisateurs/utilisateurs.service';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { VerifyCodeDto } from './dto/verify-code.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VerifierEmailDto } from './dto/verifier-email.dto';
import { RenvoyerCodeDto } from './dto/renvoyer-code.dto';
import { BrevoService } from '../jetons/brevo.service';
import { DUREE_RESET_MDP_MS, JetonsService } from '../jetons/jetons.service';

const MESSAGE_ENVOI = 'Si ce compte existe, un code a été envoyé par email.';
const MESSAGE_RENVOI_VERIF =
  "Si ce compte existe et n'est pas encore vérifié, un nouveau code a été envoyé par email.";

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly utilisateursService: UtilisateursService,
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
    private readonly brevoService: BrevoService,
    private readonly jetonsService: JetonsService,
  ) {}

  async login(dto: LoginDto) {
    const utilisateur = await this.utilisateursService.trouverParEmail(
      dto.email,
    );
    if (!utilisateur) {
      throw new UnauthorizedException('Identifiants invalides.');
    }

    const motDePasseValide = await bcrypt.compare(
      dto.mot_de_passe,
      utilisateur.mot_de_passe,
    );
    if (!motDePasseValide) {
      throw new UnauthorizedException('Identifiants invalides.');
    }

    await this.verifierStatutConnexion(utilisateur);

    const possessions = await this.prisma.posseder.findMany({
      where: { id_utilisateur: utilisateur.id_utilisateur },
      include: { role: true },
    });
    const roles = possessions.map((p) => p.role.nom);

    const payload = {
      sub: utilisateur.id_utilisateur,
      email: utilisateur.email,
      roles,
    };

    return {
      access_token: this.jwtService.sign(payload),
      utilisateur: {
        id_utilisateur: utilisateur.id_utilisateur,
        nom: utilisateur.nom,
        prenom: utilisateur.prenom,
        email: utilisateur.email,
        est_verifie: utilisateur.est_verifie,
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
          ? `Votre compte est suspendu jusqu'au ${fin.toLocaleDateString('fr-FR')}.`
          : "Votre compte est suspendu. Contactez l'administrateur.",
      );
    }
    if (utilisateur.statut === 'BANNI') {
      throw new UnauthorizedException('Votre compte a été banni.');
    }
    throw new UnauthorizedException(
      "Votre compte est désactivé. Contactez l'administrateur.",
    );
  }

  async demanderReinitialisation(dto: ForgotPasswordDto) {
    const utilisateur = await this.utilisateursService.trouverParEmail(
      dto.email,
    );
    if (!utilisateur) {
      // Réponse identique que le compte existe ou non, pour ne pas révéler les emails inscrits
      return { message: MESSAGE_ENVOI };
    }

    const code = await this.jetonsService.creerCode(
      utilisateur.id_utilisateur,
      'RESET_MDP',
      DUREE_RESET_MDP_MS,
    );

    try {
      await this.brevoService.envoyerCodeReinitialisation(
        utilisateur.email,
        utilisateur.prenom,
        code,
      );
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
    await this.jetonsService.verifierCode(
      await this.idParEmail(dto.email),
      'RESET_MDP',
      dto.code,
      true,
    );
    return { message: 'Code valide.' };
  }

  async reinitialiserMotDePasse(dto: ResetPasswordDto) {
    const jeton = await this.jetonsService.verifierCode(
      await this.idParEmail(dto.email),
      'RESET_MDP',
      dto.code,
      false,
    );
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
        // Déconnecte les sessions ouvertes avec l'ancien mot de passe (voir JwtStrategy).
        data: {
          mot_de_passe: mot_de_passe_hash,
          date_changement_mdp: new Date(),
        },
      });
    });

    return { message: 'Mot de passe réinitialisé avec succès.' };
  }

  async verifierEmail(dto: VerifierEmailDto) {
    const utilisateur = await this.utilisateursService.trouverParEmail(
      dto.email,
    );
    if (utilisateur?.est_verifie) {
      return { message: 'Votre adresse email est déjà vérifiée.' };
    }
    const jeton = await this.jetonsService.verifierCode(
      utilisateur?.id_utilisateur ?? null,
      'VERIF_EMAIL',
      dto.code,
      false,
    );

    await this.prisma.$transaction(async (tx) => {
      const { count } = await tx.jeton.updateMany({
        where: { id_jeton: jeton.id_jeton, est_utilise: false },
        data: { est_utilise: true },
      });
      if (count === 0) {
        throw new BadRequestException('Code invalide ou expiré.');
      }
      await tx.utilisateur.update({
        where: { id_utilisateur: jeton.id_utilisateur },
        data: { est_verifie: true },
      });
    });

    return { message: 'Adresse email vérifiée.' };
  }

  async renvoyerCodeVerification(dto: RenvoyerCodeDto) {
    const utilisateur = await this.utilisateursService.trouverParEmail(
      dto.email,
    );
    // Réponse identique dans tous les cas, pour ne pas révéler les emails inscrits.
    if (utilisateur && !utilisateur.est_verifie) {
      await this.jetonsService.envoyerCodeVerification(utilisateur);
    }
    return { message: MESSAGE_RENVOI_VERIF };
  }

  private async idParEmail(email: string): Promise<number | null> {
    const utilisateur = await this.utilisateursService.trouverParEmail(email);
    return utilisateur?.id_utilisateur ?? null;
  }
}
