import {
  ArgumentsHost,
  BadRequestException,
  Catch,
  ConflictException,
  HttpException,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import { Prisma } from '@prisma/client';

// Message du doublon selon la colonne concernée (contrainte unique).
function messageDoublon(erreur: Prisma.PrismaClientKnownRequestError): string {
  const details = JSON.stringify(erreur.meta ?? {});
  if (details.includes('telephone'))
    return 'Ce numéro de téléphone est déjà utilisé par un autre compte.';
  if (details.includes('email'))
    return 'Cette adresse email est déjà utilisée.';
  if (details.includes('nom')) return 'Ce nom est déjà utilisé.';
  return 'Cet élément existe déjà.';
}

// Traduit les erreurs Prisma connues en erreurs HTTP claires ; null pour les autres.
function traduireErreurPrisma(erreur: unknown): HttpException | null {
  if (!(erreur instanceof Prisma.PrismaClientKnownRequestError)) return null;
  switch (erreur.code) {
    case 'P2002':
      return new ConflictException(messageDoublon(erreur));
    case 'P2025':
      return new NotFoundException("L'élément demandé est introuvable.");
    case 'P2003':
      return new BadRequestException(
        "Un élément lié (cagnotte, catégorie, utilisateur...) n'existe pas.",
      );
    case 'P2000':
      return new BadRequestException(
        'Une des valeurs envoyées est trop longue.',
      );
    default:
      return null;
  }
}

// Filtre global (enregistré dans main.ts). Les HttpException gardent leur comportement habituel ;
// les erreurs Prisma connues deviennent 409 / 404 / 400 ; tout le reste renvoie une erreur 500 au
// message générique, le détail n'étant écrit que dans les logs.
@Catch()
export class FiltreErreurs extends BaseExceptionFilter {
  private readonly logger = new Logger('Erreurs');

  catch(exception: unknown, host: ArgumentsHost) {
    if (exception instanceof HttpException) {
      return super.catch(exception, host);
    }

    const traduite = traduireErreurPrisma(exception);
    if (traduite) {
      return super.catch(traduite, host);
    }

    const requete =
      host.getType() === 'http'
        ? host.switchToHttp().getRequest<{ method?: string; url?: string }>()
        : null;
    this.logger.error(
      `Erreur non gérée${requete ? ` sur ${requete.method} ${requete.url}` : ''}`,
      exception instanceof Error ? exception.stack : String(exception),
    );
    return super.catch(
      new InternalServerErrorException(
        'Une erreur interne est survenue. Veuillez réessayer plus tard.',
      ),
      host,
    );
  }
}
