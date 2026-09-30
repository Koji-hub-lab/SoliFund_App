import {
  ArgumentsHost,
  BadRequestException,
  Catch,
  ConflictException,
  HttpException,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  PayloadTooLargeException,
} from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import { Prisma } from '@prisma/client';
import type { Request } from 'express';
import { langueDeLaRequete } from '../i18n/langue-requete.decorator';
import { LANGUE_DEFAUT, type Langue } from '../i18n/langues';
import { m, traduire, traduireTexte, type CleMessage } from '../i18n/messages';

// Message du doublon selon la colonne concernée (contrainte unique).
function messageDoublon(erreur: Prisma.PrismaClientKnownRequestError): string {
  const details = JSON.stringify(erreur.meta ?? {});
  if (details.includes('telephone')) return m('base.doublonTelephone');
  if (details.includes('email')) return m('base.doublonEmail');
  if (details.includes('nom')) return m('base.doublonNom');
  return m('base.doublon');
}

// Traduit les erreurs Prisma connues en erreurs HTTP claires ; null pour les autres.
function traduireErreurPrisma(erreur: unknown): HttpException | null {
  if (!(erreur instanceof Prisma.PrismaClientKnownRequestError)) return null;
  switch (erreur.code) {
    case 'P2002':
      return new ConflictException(messageDoublon(erreur));
    case 'P2025':
      return new NotFoundException(m('base.introuvable'));
    case 'P2003':
      return new BadRequestException(m('base.lienInexistant'));
    case 'P2000':
      return new BadRequestException(m('base.valeurTropLongue'));
    default:
      return null;
  }
}

// Messages par défaut du framework (en anglais), remplacés par un message traduit.
const MESSAGES_PAR_DEFAUT: Record<string, CleMessage> = {
  Unauthorized: 'commun.nonAuthentifie',
  Forbidden: 'commun.interdit',
  'Forbidden resource': 'commun.interdit',
  'ThrottlerException: Too Many Requests': 'commun.tropDeRequetes',
};

function traduireMessage(langue: Langue, message: string): string {
  const cle = MESSAGES_PAR_DEFAUT[message];
  return cle ? traduire(langue, cle) : traduireTexte(langue, message);
}

// Même exception, avec son ou ses messages dans la langue demandée. Les messages qui ne viennent
// pas de m() (messages techniques de class-validator sans texte défini) sont laissés tels quels.
function dansLaLangue(exception: HttpException, langue: Langue): HttpException {
  const reponse = exception.getResponse();
  if (typeof reponse === 'string') {
    return new HttpException(
      traduireMessage(langue, reponse),
      exception.getStatus(),
    );
  }
  const { message } = reponse as { message?: unknown };
  const traduit = Array.isArray(message)
    ? (message as unknown[]).map((texte) =>
        typeof texte === 'string' ? traduireMessage(langue, texte) : texte,
      )
    : typeof message === 'string'
      ? traduireMessage(langue, message)
      : message;
  return new HttpException(
    { ...reponse, message: traduit },
    exception.getStatus(),
  );
}

// Filtre global (enregistré dans main.ts). Les HttpException gardent leur comportement habituel ;
// les erreurs Prisma connues deviennent 409 / 404 / 400 ; tout le reste renvoie une erreur 500 au
// message générique, le détail n'étant écrit que dans les logs. Tous les messages sont renvoyés
// dans la langue de la requête (en-tête Accept-Language).
@Catch()
export class FiltreErreurs extends BaseExceptionFilter {
  private readonly logger = new Logger('Erreurs');

  catch(exception: unknown, host: ArgumentsHost) {
    const requete =
      host.getType() === 'http'
        ? host.switchToHttp().getRequest<Request>()
        : null;
    const langue = requete ? langueDeLaRequete(requete) : LANGUE_DEFAUT;
    const renvoyer = (erreur: HttpException) =>
      super.catch(dansLaLangue(erreur, langue), host);

    // Fichier envoyé trop volumineux (limite de 5 Mo des envois de fichiers).
    if (exception instanceof PayloadTooLargeException) {
      return renvoyer(
        new PayloadTooLargeException(m('commun.fichierTropVolumineux')),
      );
    }
    if (exception instanceof HttpException) {
      return renvoyer(exception);
    }

    const traduite = traduireErreurPrisma(exception);
    if (traduite) {
      return renvoyer(traduite);
    }

    this.logger.error(
      `Erreur non gérée${requete ? ` sur ${requete.method} ${requete.url}` : ''}`,
      exception instanceof Error ? exception.stack : String(exception),
    );
    return renvoyer(
      new InternalServerErrorException(m('commun.erreurInterne')),
    );
  }
}
