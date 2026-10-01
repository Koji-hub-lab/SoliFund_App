import { ValidationPipe } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { HttpAdapterHost } from '@nestjs/core';
import { FiltreErreurs } from './common/filtre-erreurs.filter';
import { TraductionReponses } from './i18n/traduction-reponses.interceptor';

// Réglages communs à l'API (main.ts) et aux tests e2e : validation des entrées, filtre d'erreurs et
// traduction des messages dans la langue de la requête (Accept-Language).
export function configurerApplication(app: NestExpressApplication) {
  // Derrière un ou plusieurs proxys (hébergeur, répartiteur de charge) : TRUST_PROXY est leur nombre.
  // Express lit alors la vraie adresse du visiteur dans X-Forwarded-For (req.ip), utilisée par les
  // limites par adresse IP (ThrottlerGuard, signalements). 0 par défaut : l'en-tête est ignoré,
  // sans quoi n'importe qui pourrait choisir son adresse et contourner les limites.
  // Lu dans process.env (chargé depuis .env et vérifié au démarrage par env.validation.ts).
  const proxys = Number(process.env.TRUST_PROXY ?? 0);
  app.set(
    'trust proxy',
    Number.isInteger(proxys) && proxys > 0 ? proxys : false,
  );
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
