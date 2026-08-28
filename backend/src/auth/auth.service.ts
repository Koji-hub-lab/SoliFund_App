import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { UtilisateursService } from '../utilisateurs/utilisateurs.service';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { VerifyCodeDto } from './dto/verify-code.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { BrevoService } from './brevo.service';

function genererCodeSixChiffres(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

@Injectable()
export class AuthService {
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

  async demanderReinitialisation(dto: ForgotPasswordDto) {
    const utilisateur = await this.utilisateursService.trouverParEmail(dto.email);
    if (!utilisateur) {
      // Réponse identique que le compte existe ou non, pour ne pas révéler les emails inscrits
      return { message: 'Si ce compte existe, un code a été envoyé par email.' };
    }

    let code = genererCodeSixChiffres();
    for (let tentative = 0; tentative < 5; tentative++) {
      const existant = await this.prisma.jeton.findUnique({ where: { code } });
      if (!existant) break;
      code = genererCodeSixChiffres();
    }

    await this.prisma.jeton.create({
      data: {
        id_utilisateur: utilisateur.id_utilisateur,
        code,
        type: 'RESET_MDP',
        date_expiration: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes
      },
    });

    await this.brevoService.envoyerCodeReinitialisation(utilisateur.email, utilisateur.prenom, code);

    return { message: 'Si ce compte existe, un code a été envoyé par email.' };
  }

  async verifierCode(dto: VerifyCodeDto) {
    const utilisateur = await this.utilisateursService.trouverParEmail(dto.email);
    if (!utilisateur) {
      throw new BadRequestException('Code invalide ou expiré.');
    }

    const jeton = await this.prisma.jeton.findUnique({ where: { code: dto.code } });
    if (
      !jeton ||
      jeton.id_utilisateur !== utilisateur.id_utilisateur ||
      jeton.type !== 'RESET_MDP' ||
      jeton.est_utilise ||
      jeton.date_expiration < new Date()
    ) {
      throw new BadRequestException('Code invalide ou expiré.');
    }

    return { message: 'Code valide.' };
  }

  async reinitialiserMotDePasse(dto: ResetPasswordDto & { email: string }) {
    const utilisateur = await this.utilisateursService.trouverParEmail(dto.email);
    if (!utilisateur) {
      throw new BadRequestException('Code invalide ou expiré.');
    }

    const jeton = await this.prisma.jeton.findUnique({ where: { code: dto.code } });
    if (
      !jeton ||
      jeton.id_utilisateur !== utilisateur.id_utilisateur ||
      jeton.type !== 'RESET_MDP' ||
      jeton.est_utilise ||
      jeton.date_expiration < new Date()
    ) {
      throw new BadRequestException('Code invalide ou expiré.');
    }

    const mot_de_passe_hash = await bcrypt.hash(dto.mot_de_passe, 10);

    await this.prisma.$transaction([
      this.prisma.utilisateur.update({
        where: { id_utilisateur: jeton.id_utilisateur },
        data: { mot_de_passe: mot_de_passe_hash },
      }),
      this.prisma.jeton.update({
        where: { id_jeton: jeton.id_jeton },
        data: { est_utilise: true },
      }),
    ]);

    return { message: 'Mot de passe réinitialisé avec succès.' };
  }
}