import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import type { RequeteOptionnelle } from './utilisateur-connecte';
import { m } from '../i18n/messages';

// À placer après JwtAuthGuard : réserve la route aux comptes dont l'email est vérifié.
@Injectable()
export class EmailVerifieGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const { user } = context.switchToHttp().getRequest<RequeteOptionnelle>();
    if (!user?.est_verifie) {
      throw new ForbiddenException(m('auth.emailNonVerifie'));
    }
    return true;
  }
}
