import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../prisma/prisma.service';
import type { UtilisateurConnecte } from './utilisateur-connecte';

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
  async validate(payload: {
    sub: number;
    iat?: number;
  }): Promise<UtilisateurConnecte> {
    const utilisateur = await this.prisma.utilisateur.findUnique({
      where: { id_utilisateur: payload.sub },
      select: {
        id_utilisateur: true,
        email: true,
        statut: true,
        est_verifie: true,
        date_changement_mdp: true,
        posseders: { select: { role: { select: { nom: true } } } },
      },
    });
    if (!utilisateur || utilisateur.statut !== 'ACTIF') {
      throw new UnauthorizedException('Session invalide. Reconnectez-vous.');
    }
    // Jeton émis avant le dernier changement de mot de passe : refusé. iat est en secondes,
    // on arrondit la date à la seconde pour accepter le jeton obtenu juste après le changement.
    const changement = utilisateur.date_changement_mdp;
    if (
      changement &&
      (payload.iat ?? 0) < Math.floor(changement.getTime() / 1000)
    ) {
      throw new UnauthorizedException(
        'Votre mot de passe a été modifié. Reconnectez-vous.',
      );
    }
    return {
      id_utilisateur: utilisateur.id_utilisateur,
      email: utilisateur.email,
      est_verifie: utilisateur.est_verifie,
      roles: utilisateur.posseders.map((p) => p.role.nom),
    };
  }
}
