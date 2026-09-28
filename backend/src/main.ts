import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { Logger, ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import { join } from 'path';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.use(helmet());

  const frontendUrl = process.env.FRONTEND_URL;
  if (!frontendUrl) {
    Logger.warn('FRONTEND_URL non défini : CORS limité à http://localhost:5173.', 'Bootstrap');
  }
  app.enableCors({ origin: frontendUrl ?? 'http://localhost:5173' });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useStaticAssets(join(process.cwd(), 'uploads'), {
    prefix: '/uploads',
    // Empêche le navigateur de deviner un autre type que celui annoncé (ex. exécuter du HTML).
    setHeaders: (res) => {
      res.setHeader('X-Content-Type-Options', 'nosniff');
      // helmet impose same-origin par défaut : les images doivent rester affichables depuis le frontend.
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    },
  });
  await app.listen(3000);
}
bootstrap();
