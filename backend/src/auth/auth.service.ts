import { Injectable, UnauthorizedException, NotFoundException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { UtilisateursService } from '../utilisateurs/utilisateurs.service';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { BrevoService } from './brevo.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly utilisateursService: UtilisateursService,
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
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
    // On répond pareil que l'utilisateur existe ou non, pour ne pas révéler quels emails sont inscrits
    if (!utilisateur) {
      return { message: 'Si ce compte existe, un email de réinitialisation a été envoyé.' };
    }

    const code = crypto.randomBytes(32).toString('hex');
    const dateExpiration = new Date(Date.now() + 60 * 60 * 1000); // 1h

    await this.prisma.jeton.create({
      data: {
        id_utilisateur: utilisateur.id_utilisateur,
        code,
        type: 'RESET_MDP',
        date_expiration: dateExpiration,
      },
    });

    const frontendUrl = this.configService.get<string>('FRONTEND_URL', 'http://localhost:5173');
    const lien = `${frontendUrl}/reinitialiser-mot-de-passe?code=${code}`;

    await this.brevoService.envoyerEmailReinitialisation(utilisateur.email, utilisateur.prenom, lien);

    return { message: 'Si ce compte existe, un email de réinitialisation a été envoyé.' };
  }

  async reinitialiserMotDePasse(dto: ResetPasswordDto) {
    const jeton = await this.prisma.jeton.findUnique({ where: { code: dto.code } });

    if (!jeton || jeton.type !== 'RESET_MDP' || jeton.est_utilise || jeton.date_expiration < new Date()) {
      throw new BadRequestException('Ce lien de réinitialisation est invalide ou a expiré.');
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