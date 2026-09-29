import { INestApplication, ValidationPipe } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { FiltreErreurs } from './common/filtre-erreurs.filter';

// Réglages communs à l'API (main.ts) et aux tests e2e : validation des entrées et filtre d'erreurs.
export function configurerApplication(app: INestApplication) {
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  // Erreurs Prisma traduites en 409 / 404 / 400, autres erreurs en 500 générique (détail dans les logs).
  app.useGlobalFilters(
    new FiltreErreurs(app.get(HttpAdapterHost).httpAdapter),
  );
}
