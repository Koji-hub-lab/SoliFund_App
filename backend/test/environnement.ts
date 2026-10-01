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
// Un proxy de confiance : les tests simulent des visiteurs différents avec X-Forwarded-For
// (limites par adresse IP). proxy.e2e-spec.ts vérifie aussi le réglage par défaut (0).
process.env.TRUST_PROXY = '1';

// Photos des cagnottes envoyées par les tests : dossier temporaire aussi, jamais backend/uploads.
process.env.UPLOADS_DIR = join(tmpdir(), 'solifund-tests-uploads');

// Fournisseur de paiement : Notch Pay, quel que soit le .env (aangaraa.e2e-spec.ts choisit
// AangaraaPay). Clés factices ; aucun test n'appelle une vraie API (clients remplacés par des faux).
process.env.PAIEMENT_FOURNISSEUR = 'notchpay';
process.env.AANGARAA_APP_KEY = 'cle-aangaraa-factice';
process.env.AANGARAA_WEBHOOK_JETON =
  'jeton-webhook-aangaraa-factice-0123456789';
process.env.AANGARAA_API_URL = 'http://127.0.0.1:9';
process.env.PUBLIC_API_URL = '';
process.env.NOTCHPAY_PUBLIC_KEY = 'pk_test_factice';
process.env.NOTCHPAY_PRIVATE_KEY = 'sk_test_factice';
process.env.NOTCHPAY_WEBHOOK_HASH = 'hsk_test_factice';
process.env.NOTCHPAY_API_URL = 'http://127.0.0.1:9';

// Taux de commission fixe dans les tests, quel que soit le .env (commission.e2e-spec.ts le change
// pour vérifier que l'historique est conservé).
process.env.COMMISSION_TAUX_POURCENT = '3';

// Montant minimum d'un don : la valeur par défaut, quel que soit le .env (dons-minimum.e2e-spec.ts
// la change pour vérifier qu'elle est lue à chaque requête).
process.env.DON_MONTANT_MINIMUM = '100';

// Frais de transaction des donateurs : nuls par défaut dans les tests, quel que soit le .env (le
// montant payé est alors le montant du don). frais-dons.e2e-spec.ts règle les tarifs réels.
for (const nom of [
  'FRAIS_MTN_ENCAISSEMENT_POURCENT',
  'FRAIS_MTN_VERSEMENT_POURCENT',
  'FRAIS_ORANGE_ENCAISSEMENT_POURCENT',
  'FRAIS_ORANGE_VERSEMENT_POURCENT',
]) {
  process.env[nom] = '0';
}
