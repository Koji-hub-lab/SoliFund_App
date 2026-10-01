import { plainToInstance, Type } from 'class-transformer';
import {
  IsEmail,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  Min,
  MinLength,
  ValidateIf,
  validateSync,
} from 'class-validator';
import { estCleDeTest } from '../payment/notchpay.config';
import { MONTANT_MAX } from '../common/validation';

// Notch Pay est le fournisseur actif (PAIEMENT_FOURNISSEUR absent ou « notchpay »).
function notchPayActif(variables: { PAIEMENT_FOURNISSEUR?: string }) {
  return (variables.PAIEMENT_FOURNISSEUR ?? 'notchpay') === 'notchpay';
}

const CLES_NOTCHPAY = [
  'NOTCHPAY_PUBLIC_KEY',
  'NOTCHPAY_PRIVATE_KEY',
  'NOTCHPAY_WEBHOOK_HASH',
];

// Variables d'environnement lues au démarrage (voir .env.example).
class VariablesEnvironnement {
  @IsString()
  @IsNotEmpty()
  DATABASE_URL!: string;

  @IsString()
  @MinLength(32, {
    message: 'JWT_SECRET doit contenir au moins 32 caractères.',
  })
  JWT_SECRET!: string;

  @IsString()
  @IsNotEmpty()
  BREVO_API_KEY!: string;

  @IsEmail(
    {},
    { message: 'BREVO_SENDER_EMAIL doit être une adresse email valide.' },
  )
  BREVO_SENDER_EMAIL!: string;

  @IsUrl(
    { require_tld: false },
    { message: 'FRONTEND_URL doit être une URL (ex. http://localhost:5173).' },
  )
  FRONTEND_URL!: string;

  // URL publique du backend telle que la voient les visiteurs et les robots de WhatsApp / Facebook
  // (liens de partage, images des aperçus) et AangaraaPay (notify_url du webhook). Par défaut :
  // http://localhost:<PORT> ; obligatoire avec AangaraaPay, qui doit pouvoir joindre le webhook.
  @ValidateIf(
    (variables: VariablesEnvironnement) =>
      variables.PAIEMENT_FOURNISSEUR === 'aangaraa' ||
      variables.PUBLIC_API_URL !== undefined,
  )
  @IsUrl(
    { require_tld: false },
    {
      message:
        'PUBLIC_API_URL doit être une URL (ex. https://api.solifund.cm).',
    },
  )
  PUBLIC_API_URL?: string;

  // Connexion avec Google : les trois variables ensemble, ou aucune (le bouton Google renvoie
  // alors vers la page de connexion avec un message d'erreur). Vides = absentes.
  @IsOptional()
  @IsString()
  GOOGLE_CLIENT_ID?: string;

  @IsOptional()
  @IsString()
  GOOGLE_CLIENT_SECRET?: string;

  @IsOptional()
  @IsUrl(
    { require_tld: false, require_protocol: true },
    {
      message:
        'GOOGLE_CALLBACK_URL doit être une URL complète (ex. http://localhost:5173/api/auth/google/callback).',
    },
  )
  GOOGLE_CALLBACK_URL?: string;

  // Fournisseur de paiement Mobile Money des nouveaux paiements et versements (voir src/payment) :
  // « notchpay » (par défaut) ou « aangaraa ». Les clés du fournisseur actif sont obligatoires.
  @IsOptional()
  @IsIn(['notchpay', 'aangaraa'], {
    message: 'PAIEMENT_FOURNISSEUR doit valoir « notchpay » ou « aangaraa ».',
  })
  PAIEMENT_FOURNISSEUR?: string;

  // Notch Pay. Clé publique : toutes les requêtes ; clé privée : versements et solde ; hash :
  // signature des webhooks (exigé en production).
  @IsOptional()
  @IsUrl(
    { require_tld: false, require_protocol: true },
    {
      message:
        'NOTCHPAY_API_URL doit être une URL complète (ex. https://api.notchpay.co).',
    },
  )
  NOTCHPAY_API_URL?: string;

  @ValidateIf(notchPayActif)
  @IsString()
  @IsNotEmpty()
  NOTCHPAY_PUBLIC_KEY?: string;

  @ValidateIf(notchPayActif)
  @IsString()
  @IsNotEmpty()
  NOTCHPAY_PRIVATE_KEY?: string;

  @ValidateIf(
    (variables: VariablesEnvironnement) =>
      (notchPayActif(variables) && variables.NODE_ENV === 'production') ||
      variables.NOTCHPAY_WEBHOOK_HASH !== undefined,
  )
  @IsString()
  @IsNotEmpty()
  NOTCHPAY_WEBHOOK_HASH?: string;

  // AangaraaPay. Clé du service (app_key) ; URL de l'API facultative.
  @IsOptional()
  @IsUrl(
    { require_tld: false, require_protocol: true },
    {
      message:
        'AANGARAA_API_URL doit être une URL complète (ex. https://api-production.aangaraa-pay.com).',
    },
  )
  AANGARAA_API_URL?: string;

  @ValidateIf(
    (variables: VariablesEnvironnement) =>
      variables.PAIEMENT_FOURNISSEUR === 'aangaraa',
  )
  @IsString()
  @IsNotEmpty()
  AANGARAA_APP_KEY?: string;

  // Jeton secret du webhook AangaraaPay, placé dans notify_url (les notifications ne sont pas
  // signées) : au moins 32 caractères aléatoires.
  @ValidateIf(
    (variables: VariablesEnvironnement) =>
      variables.PAIEMENT_FOURNISSEUR === 'aangaraa' ||
      variables.AANGARAA_WEBHOOK_JETON !== undefined,
  )
  @IsString()
  @MinLength(32, {
    message: 'AANGARAA_WEBHOOK_JETON doit contenir au moins 32 caractères.',
  })
  AANGARAA_WEBHOOK_JETON?: string;

  // Commission SoliFund sur les retraits, en % (3 par défaut). Deux décimales au plus.
  @IsOptional()
  @Type(() => Number)
  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'COMMISSION_TAUX_POURCENT doit être un nombre (ex. 3 ou 2.5).' },
  )
  @Min(0)
  @Max(100)
  COMMISSION_TAUX_POURCENT?: number;

  // Frais de transaction payés par le donateur, en % (tarifs d'AangaraaPay par défaut, voir
  // src/config/frais-transaction.ts).
  @IsOptional()
  @Type(() => Number)
  @IsNumber(
    { maxDecimalPlaces: 2 },
    {
      message: 'FRAIS_MTN_ENCAISSEMENT_POURCENT doit être un nombre (ex. 1.7).',
    },
  )
  @Min(0)
  @Max(100)
  FRAIS_MTN_ENCAISSEMENT_POURCENT?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'FRAIS_MTN_VERSEMENT_POURCENT doit être un nombre (ex. 1.7).' },
  )
  @Min(0)
  @Max(100)
  FRAIS_MTN_VERSEMENT_POURCENT?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber(
    { maxDecimalPlaces: 2 },
    {
      message:
        'FRAIS_ORANGE_ENCAISSEMENT_POURCENT doit être un nombre (ex. 1.7).',
    },
  )
  @Min(0)
  @Max(100)
  FRAIS_ORANGE_ENCAISSEMENT_POURCENT?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber(
    { maxDecimalPlaces: 2 },
    {
      message: 'FRAIS_ORANGE_VERSEMENT_POURCENT doit être un nombre (ex. 1.7).',
    },
  )
  @Min(0)
  @Max(100)
  FRAIS_ORANGE_VERSEMENT_POURCENT?: number;

  // Montant minimum d'un don, en XAF (100 par défaut, voir src/config/dons.ts).
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'DON_MONTANT_MINIMUM doit être un nombre entier de XAF.' })
  @Min(1, { message: 'DON_MONTANT_MINIMUM doit être au moins 1.' })
  @Max(MONTANT_MAX, { message: 'DON_MONTANT_MINIMUM est trop élevé.' })
  DON_MONTANT_MINIMUM?: number;

  // Seuils de modération (voir src/config/seuils.ts pour les valeurs par défaut).
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  SEUIL_OBJECTIF_VERIFICATION?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  SEUIL_SIGNALEMENTS?: number;

  // Dossier du stockage privé (pièces d'identité). Par défaut : backend/stockage-prive.
  @IsOptional()
  @IsString()
  STOCKAGE_PRIVE_DIR?: string;

  // Dossier des photos des cagnottes (servi sous /uploads). Par défaut : backend/uploads.
  @IsOptional()
  @IsString()
  UPLOADS_DIR?: string;

  // Format des numéros envoyés à Notch Pay : « sans_plus » (237677123456, par défaut) ou
  // « avec_plus » (+237677123456).
  @IsOptional()
  @IsIn(['sans_plus', 'avec_plus'], {
    message:
      'NOTCHPAY_FORMAT_TELEPHONE doit valoir « sans_plus » ou « avec_plus ».',
  })
  NOTCHPAY_FORMAT_TELEPHONE?: string;

  // Hors production, l'application refuse de démarrer avec une clé Notch Pay « live », sauf si
  // cette variable vaut « true » (voir validerEnvironnement).
  @IsOptional()
  @IsIn(['true', 'false'])
  NOTCHPAY_AUTORISER_LIVE_EN_DEV?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(65535)
  PORT?: number;

  @IsOptional()
  @IsIn(['development', 'production', 'test'])
  NODE_ENV?: string;
}

// Utilisée par ConfigModule.forRoot({ validate }) : l'application refuse de démarrer
// si une variable obligatoire manque ou est invalide, en indiquant laquelle.
export function validerEnvironnement(config: Record<string, unknown>) {
  // Variables Google laissées vides dans le .env : considérées comme absentes.
  const google = [
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET',
    'GOOGLE_CALLBACK_URL',
  ];
  const aVerifier = { ...config };
  // Facultatives laissées vides : considérées comme absentes.
  for (const nom of [
    'NOTCHPAY_API_URL',
    'NOTCHPAY_WEBHOOK_HASH',
    'NOTCHPAY_AUTORISER_LIVE_EN_DEV',
    'NOTCHPAY_FORMAT_TELEPHONE',
    'NOTCHPAY_PUBLIC_KEY',
    'NOTCHPAY_PRIVATE_KEY',
    'PAIEMENT_FOURNISSEUR',
    'AANGARAA_API_URL',
    'AANGARAA_APP_KEY',
    'AANGARAA_WEBHOOK_JETON',
    'PUBLIC_API_URL',
  ]) {
    if (aVerifier[nom] === '') delete aVerifier[nom];
  }
  for (const nom of google) {
    if (aVerifier[nom] === '') delete aVerifier[nom];
  }
  const googleRenseignees = google.filter(
    (nom) => aVerifier[nom] !== undefined,
  );
  const googleIncomplet =
    googleRenseignees.length > 0 && googleRenseignees.length < google.length;

  const variables = plainToInstance(VariablesEnvironnement, aVerifier, {
    enableImplicitConversion: false,
  });
  const erreurs = validateSync(variables, { skipMissingProperties: false });

  if (erreurs.length > 0 || googleIncomplet) {
    const details = erreurs.map((e) => {
      const valeur = config[e.property];
      if (valeur === undefined || valeur === '') {
        return `  - ${e.property} : variable manquante`;
      }
      // Jamais la valeur elle-même : elle peut contenir un secret.
      return `  - ${e.property} : ${Object.values(e.constraints ?? {}).join(' ')}`;
    });
    if (googleIncomplet) {
      const manquantes = google.filter(
        (nom) => !googleRenseignees.includes(nom),
      );
      details.push(
        `  - ${manquantes.join(', ')} : à renseigner (connexion Google : les trois variables ensemble, ou aucune)`,
      );
    }
    throw new Error(
      `Configuration invalide, démarrage annulé (voir backend/.env.example) :\n${details.join('\n')}`,
    );
  }

  // Clés « live » : elles déplacent de l'argent réel. Hors production, le démarrage est refusé,
  // sauf autorisation explicite. Le message ne contient jamais la valeur d'une clé.
  const clesLive = CLES_NOTCHPAY.filter((nom) => {
    const valeur = aVerifier[nom];
    return typeof valeur === 'string' && valeur !== '' && !estCleDeTest(valeur);
  });
  if (
    clesLive.length > 0 &&
    aVerifier.NODE_ENV !== 'production' &&
    aVerifier.NOTCHPAY_AUTORISER_LIVE_EN_DEV !== 'true'
  ) {
    throw new Error(
      `Clé Notch Pay « live » hors production, démarrage annulé : ${clesLive.join(', ')}.\n` +
        `  Une clé « live » déplace de l'argent réel. Utilisez les clés du mode test (elles contiennent « test »),\n` +
        `  ou définissez NOTCHPAY_AUTORISER_LIVE_EN_DEV=true si c'est vraiment voulu (voir backend/.env.example).`,
    );
  }
  return config;
}
