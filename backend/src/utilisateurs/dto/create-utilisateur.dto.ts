import { IsOptional, IsString, MaxLength } from 'class-validator';
import {
  Email,
  NouveauMotDePasse,
  TexteObligatoire,
  VideEnNull,
} from '../../common/validation';
import { m } from '../../i18n/messages';

export class CreateUtilisateurDto {
  @TexteObligatoire('nom', 100)
  nom!: string;

  @TexteObligatoire('prenom', 100)
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
    message: m('validation.telephoneTropLong'),
  })
  telephone?: string | null;
}
