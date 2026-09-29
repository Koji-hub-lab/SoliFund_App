import { urlBaseTest } from './base-test';

// Chargé avant chaque fichier de test (setupFiles) : l'application pointe sur la base de test.
// PrismaService lit DATABASE_URL à sa création, et @nestjs/config ne remplace pas une variable déjà définie.
process.env.DATABASE_URL_DEVELOPPEMENT ??= process.env.DATABASE_URL;
process.env.DATABASE_URL = urlBaseTest();
process.env.NODE_ENV = 'test';

// Connexion Google désactivée par défaut dans les tests, quel que soit le .env (valeurs vides =
// absentes). google-configure.e2e-spec.ts la configure avec des identifiants factices.
process.env.GOOGLE_CLIENT_ID = '';
process.env.GOOGLE_CLIENT_SECRET = '';
process.env.GOOGLE_CALLBACK_URL = '';

// 3SPAY : valeurs factices si le .env n'en fournit pas (aucun appel réel n'est fait dans les tests).
process.env.TROISPAY_API_URL ??= 'https://3spay.test';
process.env.TROISPAY_API_KEY ??= 'cle-api-de-test';
process.env.TROISPAY_PARTNER_ID ??= 'PARTENAIRE-TEST';
process.env.TROISPAY_WEBHOOK_SECRET ??= 'secret-webhook-de-test';
