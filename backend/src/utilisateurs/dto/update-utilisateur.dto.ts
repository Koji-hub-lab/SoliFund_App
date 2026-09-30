import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { TexteObligatoire, VideEnNull } from '../../common/validation';
import { LANGUES, type Langue } from '../../i18n/langues';
import { m } from '../../i18n/messages';

// Le mot de passe se change par PATCH /utilisateurs/moi/mot-de-passe (ChangerMotDePasseDto).
export class UpdateUtilisateurDto {
  @IsOptional()
  @TexteObligatoire('nom', 100)
  nom?: string;

  @IsOptional()
  @TexteObligatoire('prenom', 100)
  prenom?: string;

  // Chaîne vide = suppression du numéro (enregistré à null).
  @IsOptional()
  @VideEnNull()
  @IsString()
  @MaxLength(20, {
    message: m('validation.telephoneTropLong'),
  })
  telephone?: string | null;

  // Langue de l'interface, utilisée pour les emails.
  @IsOptional()
  @IsIn(LANGUES, { message: m('validation.langue') })
  langue_preferee?: Langue;
}
