import { applyDecorators } from '@nestjs/common';
import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { m, type CleMessage } from '../i18n/messages';

// Décorateurs de validation communs aux DTO. Les tailles suivent le schéma Prisma (VarChar).
// Les messages sont des clés traduites à la sortie (src/i18n) ; `champ` désigne le nom du champ
// dans les dictionnaires (« champs.titre » → « Le titre », « The title »).

type CleChamp<C = CleMessage> = C extends `champs.${infer Nom}` ? Nom : never;
export type Champ = CleChamp;

const champ = (nom: Champ) => ({ champ: { cle: `champs.${nom}` as const } });

// Montant maximal accepté (colonnes Decimal(15, 2) : 13 chiffres avant la virgule).
export const MONTANT_MAX = 1_000_000_000_000;

// Supprime les espaces au début et à la fin d'un texte.
export const SansEspaces = () =>
  Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  );

// Texte facultatif : les espaces sont supprimés et une chaîne vide devient null.
export const VideEnNull = () =>
  Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() || null : value,
  );

// Texte obligatoire : sans espaces autour, non vide, longueur maximale.
export function TexteObligatoire(nom: Champ, max: number) {
  return applyDecorators(
    SansEspaces(),
    IsString({ message: m('validation.texte', champ(nom)) }),
    IsNotEmpty({ message: m('validation.obligatoire', champ(nom)) }),
    MaxLength(max, {
      message: m('validation.longueurMax', { ...champ(nom), max }),
    }),
  );
}

// Texte facultatif (à combiner avec @IsOptional()) : sans espaces autour, longueur maximale.
export function TexteFacultatif(nom: Champ, max: number) {
  return applyDecorators(
    SansEspaces(),
    IsString({ message: m('validation.texte', champ(nom)) }),
    MaxLength(max, {
      message: m('validation.longueurMax', { ...champ(nom), max }),
    }),
  );
}

// Identifiant d'une ligne en base (id_cagnotte, id_categorie...).
export function Identifiant(nom: Champ) {
  return applyDecorators(
    IsInt({ message: m('validation.entier', champ(nom)) }),
    Min(1, { message: m('validation.invalide', champ(nom)) }),
  );
}

// Montant en XAF : entier (pas de centimes), entre min et MONTANT_MAX.
export function Montant(nom: Champ, min: number) {
  return applyDecorators(
    IsInt({
      message: m('validation.montantEntier', champ(nom)),
    }),
    Min(min, { message: m('validation.montantMin', { ...champ(nom), min }) }),
    Max(MONTANT_MAX, { message: m('validation.montantTropEleve', champ(nom)) }),
  );
}

// Adresse email : sans espaces autour, 255 caractères maximum.
export function Email() {
  return applyDecorators(
    SansEspaces(),
    IsEmail({}, { message: m('validation.emailInvalide') }),
    MaxLength(255, {
      message: m('validation.emailTropLong'),
    }),
  );
}

// Mot de passe saisi (connexion, mot de passe actuel) : jamais modifié (les espaces comptent).
// 128 caractères au plus : bcrypt n'en utilise de toute façon que 72 octets.
export function MotDePasseSaisi(message: string) {
  return applyDecorators(
    IsString({ message }),
    IsNotEmpty({ message }),
    MaxLength(128, {
      message: m('validation.motDePasseMax'),
    }),
  );
}

// Nouveau mot de passe (inscription, réinitialisation, changement) : 8 à 128 caractères.
export function NouveauMotDePasse() {
  return applyDecorators(
    IsString({ message: m('validation.motDePasseTexte') }),
    MinLength(8, {
      message: m('validation.motDePasseMin'),
    }),
    MaxLength(128, {
      message: m('validation.motDePasseMax'),
    }),
  );
}

// Numéro Mobile Money camerounais : 9 chiffres commençant par 6. Les espaces, points, tirets et le
// préfixe +237 (ou 237) sont tolérés à la saisie ; la valeur gardée est la forme à 9 chiffres
// (même règle que le frontend, utils/telephone.js).
export function NumeroMobileMoney(nom: Champ) {
  return applyDecorators(
    Transform(({ value }: { value: unknown }) =>
      typeof value === 'string'
        ? value.replace(/[\s.-]/g, '').replace(/^\+?237(?=6\d{8}$)/, '')
        : value,
    ),
    Matches(/^6\d{8}$/, {
      message: m('validation.numeroMobileMoney', champ(nom)),
    }),
  );
}
