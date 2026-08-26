import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { UtilisateursService } from '../utilisateurs/utilisateurs.service';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly utilisateursService: UtilisateursService,
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
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
}