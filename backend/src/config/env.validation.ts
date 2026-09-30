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
  // (liens de partage, images des aperçus). Par défaut : http://localhost:<PORT>.
  @IsOptional()
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

  // Paiement Mobile Money par Notch Pay (voir src/payment). Clé publique : toutes les requêtes ;
  // clé privée : versements et solde ; hash : signature des webhooks (exigé en production).
  @IsOptional()
  @IsUrl(
    { require_tld: false, require_protocol: true },
    {
      message:
        'NOTCHPAY_API_URL doit être une URL complète (ex. https://api.notchpay.co).',
    },
  )
  NOTCHPAY_API_URL?: string;

  @IsString()
  @IsNotEmpty()
  NOTCHPAY_PUBLIC_KEY!: string;

  @IsString()
  @IsNotEmpty()
  NOTCHPAY_PRIVATE_KEY!: string;

  @ValidateIf(
    (variables: VariablesEnvironnement) =>
      variables.NODE_ENV === 'production' ||
      variables.NOTCHPAY_WEBHOOK_HASH !== undefined,
  )
  @IsString()
  @IsNotEmpty()
  NOTCHPAY_WEBHOOK_HASH?: string;

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
  for (const nom of ['NOTCHPAY_API_URL', 'NOTCHPAY_WEBHOOK_HASH']) {
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
  return config;
}
