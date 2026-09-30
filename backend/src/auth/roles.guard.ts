import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { RequeteOptionnelle } from './utilisateur-connecte';
import { m } from '../i18n/messages';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const rolesRequis = this.reflector.get<string[]>(
      'roles',
      context.getHandler(),
    );
    if (!rolesRequis || rolesRequis.length === 0) return true;

    const { user } = context.switchToHttp().getRequest<RequeteOptionnelle>();
    const aLeRole = rolesRequis.some((role) => user?.roles?.includes(role));
    if (!aLeRole) {
      throw new ForbiddenException(m('commun.interdit'));
    }
    return true;
  }
}
