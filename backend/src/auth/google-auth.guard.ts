import { ExecutionContext, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';
import { googleConfigure, ProfilGoogle } from './google.strategy';

type RequeteGoogle = Omit<Request, 'user'> & { user?: ProfilGoogle | null };

// Garde des routes /auth/google : ne bloque jamais la requête. Si Google n'est pas configuré, ou en
// cas d'annulation ou d'erreur au retour, req.user vaut null et le contrôleur redirige vers la page
// de connexion avec un message d'erreur.
@Injectable()
export class GoogleAuthGuard extends AuthGuard('google') {
  private readonly logger = new Logger(GoogleAuthGuard.name);

  constructor(private readonly config: ConfigService) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (!googleConfigure(this.config)) {
      const requete = context.switchToHttp().getRequest<RequeteGoogle>();
      requete.user = null;
      return true;
    }
    return (await super.canActivate(context)) as boolean;
  }

  handleRequest<T = ProfilGoogle | null>(erreur: unknown, profil: unknown): T {
    if (erreur) {
      this.logger.warn(
        `Connexion Google échouée : ${erreur instanceof Error ? erreur.message : JSON.stringify(erreur)}`,
      );
    }
    return (erreur || !profil ? null : profil) as T;
  }
}
