import { IsOptional, IsString, MaxLength } from 'class-validator';
import { TexteObligatoire, VideEnNull } from '../../common/validation';

// Le mot de passe se change par PATCH /utilisateurs/moi/mot-de-passe (ChangerMotDePasseDto).
export class UpdateUtilisateurDto {
  @IsOptional()
  @TexteObligatoire('Le nom', 100)
  nom?: string;

  @IsOptional()
  @TexteObligatoire('Le prénom', 100)
  prenom?: string;

  // Chaîne vide = suppression du numéro (enregistré à null).
  @IsOptional()
  @VideEnNull()
  @IsString()
  @MaxLength(20, {
    message: 'Le numéro de téléphone ne peut pas dépasser 20 caractères.',
  })
  telephone?: string | null;
}
