import { urlBaseTest } from './base-test';

// Chargé avant chaque fichier de test (setupFiles) : l'application pointe sur la base de test.
// PrismaService lit DATABASE_URL à sa création, et @nestjs/config ne remplace pas une variable déjà définie.
process.env.DATABASE_URL_DEVELOPPEMENT ??= process.env.DATABASE_URL;
process.env.DATABASE_URL = urlBaseTest();
process.env.NODE_ENV = 'test';
