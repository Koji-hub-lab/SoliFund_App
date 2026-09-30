import { tmpdir } from 'os';
import { join } from 'path';
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

// Pièces d'identité des tests : dans un dossier temporaire, jamais dans backend/stockage-prive.
process.env.STOCKAGE_PRIVE_DIR = join(
  tmpdir(),
  'solifund-tests-stockage-prive',
);

// Notch Pay : clés factices du mode test, quel que soit le .env. Aucun test n'appelle la vraie API.
process.env.NOTCHPAY_PUBLIC_KEY = 'pk_test_factice';
process.env.NOTCHPAY_PRIVATE_KEY = 'sk_test_factice';
process.env.NOTCHPAY_WEBHOOK_HASH = '';
process.env.NOTCHPAY_API_URL = 'http://127.0.0.1:9';

// Taux de commission fixe dans les tests, quel que soit le .env (commission.e2e-spec.ts le change
// pour vérifier que l'historique est conservé).
process.env.COMMISSION_TAUX_POURCENT = '3';
