import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

// Authentification facultative : si un token valide est fourni, req.user est rempli ;
// sinon (pas de token, token expiré, compte suspendu...) la requête passe en anonyme (req.user = null).
@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  handleRequest<TUser = any>(err: any, user: any): TUser {
    if (err || !user) {
      return null as TUser;
    }
    return user as TUser;
  }
}
