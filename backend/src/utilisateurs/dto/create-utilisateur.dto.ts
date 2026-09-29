import { IsOptional, IsString, MaxLength } from 'class-validator';
import {
  Email,
  NouveauMotDePasse,
  TexteObligatoire,
  VideEnNull,
} from '../../common/validation';

export class CreateUtilisateurDto {
  @TexteObligatoire('Le nom', 100)
  nom!: string;

  @TexteObligatoire('Le prénom', 100)
  prenom!: string;

  @Email()
  email!: string;

  @NouveauMotDePasse()
  mot_de_passe!: string;

  // Chaîne vide = pas de numéro (null) : la colonne est unique.
  @IsOptional()
  @VideEnNull()
  @IsString()
  @MaxLength(20, {
    message: 'Le numéro de téléphone ne peut pas dépasser 20 caractères.',
  })
  telephone?: string | null;
}
