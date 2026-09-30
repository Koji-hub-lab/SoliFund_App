import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import { langueDepuisEntete, type Langue } from './langues';

export function langueDeLaRequete(requete: Request): Langue {
  return langueDepuisEntete(requete.headers['accept-language']);
}

// Langue demandée par le client (en-tête Accept-Language) : « fr » ou « en ».
export const LangueRequete = createParamDecorator(
  (_: unknown, contexte: ExecutionContext): Langue =>
    langueDeLaRequete(contexte.switchToHttp().getRequest<Request>()),
);
