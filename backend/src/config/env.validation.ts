import { plainToInstance, Type } from 'class-transformer';
import {
  IsEmail,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  Min,
  MinLength,
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
  const variables = plainToInstance(VariablesEnvironnement, config, {
    enableImplicitConversion: false,
  });
  const erreurs = validateSync(variables, { skipMissingProperties: false });

  if (erreurs.length > 0) {
    const details = erreurs.map((e) => {
      const valeur = config[e.property];
      if (valeur === undefined || valeur === '') {
        return `  - ${e.property} : variable manquante`;
      }
      // Jamais la valeur elle-même : elle peut contenir un secret.
      return `  - ${e.property} : ${Object.values(e.constraints ?? {}).join(' ')}`;
    });
    throw new Error(
      `Configuration invalide, démarrage annulé (voir backend/.env.example) :\n${details.join('\n')}`,
    );
  }
  return config;
}
