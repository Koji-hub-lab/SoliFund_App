import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import type { NextFunction, Request, Response } from 'express';
import type { ServerResponse } from 'http';
import { AppModule } from './app.module';
import { configurerApplication } from './configuration-application';
import { dossierUploads } from './uploads/images.service';

async function bootstrap() {
  // rawBody : le corps brut de chaque requête est gardé (req.rawBody), pour vérifier la signature
  // des webhooks Notch Pay sur les octets reçus.
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    rawBody: true,
  });
  const config = app.get(ConfigService);
  const docsActives = config.get<string>('NODE_ENV') !== 'production';

  // La page Swagger UI ne fonctionne pas avec la CSP stricte de helmet : on l'assouplit
  // uniquement pour /docs, qui n'existe pas en production.
  const helmetStrict = helmet();
  const helmetDocs = helmet({ contentSecurityPolicy: false });
  app.use((req: Request, res: Response, next: NextFunction) =>
    docsActives && req.path.startsWith('/docs')
      ? helmetDocs(req, res, next)
      : helmetStrict(req, res, next),
  );

  // FRONTEND_URL est obligatoire (vérifiée au démarrage par src/config/env.validation.ts).
  app.enableCors({ origin: config.getOrThrow<string>('FRONTEND_URL') });
  configurerApplication(app);
  app.useStaticAssets(dossierUploads(), {
    prefix: '/uploads',
    // Empêche le navigateur de deviner un autre type que celui annoncé (ex. exécuter du HTML).
    setHeaders: (res: ServerResponse) => {
      res.setHeader('X-Content-Type-Options', 'nosniff');
      // helmet impose same-origin par défaut : les images doivent rester affichables depuis le frontend.
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    },
  });

  if (docsActives) {
    const documentation = new DocumentBuilder()
      .setTitle('SoliFund API')
      .setDescription(
        'API des cagnottes solidaires SoliFund (montants en XAF).',
      )
      .setVersion('1.0')
      .addBearerAuth()
      .addSecurityRequirements('bearer')
      .build();
    SwaggerModule.setup('docs', app, () =>
      SwaggerModule.createDocument(app, documentation),
    );
  }

  const port = Number(config.get<string>('PORT') ?? 3000);
  await app.listen(port);
  Logger.log(
    `API démarrée sur le port ${port}${docsActives ? ` — documentation sur /docs` : ''}`,
    'Bootstrap',
  );
}

// Échec au démarrage (base injoignable, port occupé...) : message clair et arrêt du processus.
bootstrap().catch((erreur: unknown) => {
  Logger.error(
    'Démarrage impossible',
    erreur instanceof Error ? erreur.stack : String(erreur),
    'Bootstrap',
  );
  process.exit(1);
});
