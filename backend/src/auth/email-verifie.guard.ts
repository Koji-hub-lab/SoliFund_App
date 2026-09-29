import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import type { RequeteOptionnelle } from './utilisateur-connecte';

// À placer après JwtAuthGuard : réserve la route aux comptes dont l'email est vérifié.
@Injectable()
export class EmailVerifieGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const { user } = context.switchToHttp().getRequest<RequeteOptionnelle>();
    if (!user?.est_verifie) {
      throw new ForbiddenException(
        "Votre adresse email n'est pas encore vérifiée. Saisissez le code reçu par email pour créer une cagnotte ou demander un retrait.",
      );
    }
    return true;
  }
}
