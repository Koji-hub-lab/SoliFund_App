import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_SECRET'),
    });
  }

  // Recharge l'utilisateur à chaque requête : un bannissement ou un changement de rôle
  // prend effet immédiatement, sans attendre l'expiration du token.
  async validate(payload: { sub: number }) {
    const utilisateur = await this.prisma.utilisateur.findUnique({
      where: { id_utilisateur: payload.sub },
      select: {
        id_utilisateur: true,
        email: true,
        statut: true,
        posseders: { select: { role: { select: { nom: true } } } },
      },
    });
    if (!utilisateur || utilisateur.statut !== 'ACTIF') {
      throw new UnauthorizedException('Session invalide. Reconnecte-toi.');
    }
    return {
      id_utilisateur: utilisateur.id_utilisateur,
      email: utilisateur.email,
      roles: utilisateur.posseders.map((p) => p.role.nom),
    };
  }
}
