import { applyDecorators } from '@nestjs/common';
import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

// Décorateurs de validation communs aux DTO. Les tailles suivent le schéma Prisma (VarChar).

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
export function TexteObligatoire(libelle: string, max: number) {
  return applyDecorators(
    SansEspaces(),
    IsString({ message: `${libelle} doit être un texte.` }),
    IsNotEmpty({ message: `${libelle} est obligatoire.` }),
    MaxLength(max, {
      message: `${libelle} ne peut pas dépasser ${max} caractères.`,
    }),
  );
}

// Texte facultatif (à combiner avec @IsOptional()) : sans espaces autour, longueur maximale.
export function TexteFacultatif(libelle: string, max: number) {
  return applyDecorators(
    SansEspaces(),
    IsString({ message: `${libelle} doit être un texte.` }),
    MaxLength(max, {
      message: `${libelle} ne peut pas dépasser ${max} caractères.`,
    }),
  );
}

// Identifiant d'une ligne en base (id_cagnotte, id_categorie...).
export function Identifiant(libelle: string) {
  return applyDecorators(
    IsInt({ message: `${libelle} doit être un nombre entier.` }),
    Min(1, { message: `${libelle} est invalide.` }),
  );
}

// Montant en XAF : entier (pas de centimes), entre min et MONTANT_MAX.
export function Montant(libelle: string, min: number) {
  return applyDecorators(
    IsInt({
      message: `${libelle} doit être un nombre entier de francs CFA (pas de centimes).`,
    }),
    Min(min, { message: `${libelle} doit être d'au moins ${min} XAF.` }),
    Max(MONTANT_MAX, { message: `${libelle} est trop élevé.` }),
  );
}

// Adresse email : sans espaces autour, 255 caractères maximum.
export function Email() {
  return applyDecorators(
    SansEspaces(),
    IsEmail({}, { message: "L'adresse email n'est pas valide." }),
    MaxLength(255, {
      message: "L'adresse email ne peut pas dépasser 255 caractères.",
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
      message: 'Le mot de passe ne peut pas dépasser 128 caractères.',
    }),
  );
}

// Nouveau mot de passe (inscription, réinitialisation, changement) : 8 à 128 caractères.
export function NouveauMotDePasse() {
  return applyDecorators(
    IsString({ message: 'Le mot de passe doit être un texte.' }),
    MinLength(8, {
      message: 'Le mot de passe doit contenir au moins 8 caractères.',
    }),
    MaxLength(128, {
      message: 'Le mot de passe ne peut pas dépasser 128 caractères.',
    }),
  );
}
