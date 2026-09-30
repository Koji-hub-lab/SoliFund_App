import { INestApplication, ValidationPipe } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { FiltreErreurs } from './common/filtre-erreurs.filter';
import { TraductionReponses } from './i18n/traduction-reponses.interceptor';

// Réglages communs à l'API (main.ts) et aux tests e2e : validation des entrées, filtre d'erreurs et
// traduction des messages dans la langue de la requête (Accept-Language).
export function configurerApplication(app: INestApplication) {
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  // Erreurs Prisma traduites en 409 / 404 / 400, autres erreurs en 500 générique (détail dans les logs).
  app.useGlobalFilters(new FiltreErreurs(app.get(HttpAdapterHost).httpAdapter));
  // Réponses { message } : texte dans la langue demandée.
  app.useGlobalInterceptors(new TraductionReponses());
}
