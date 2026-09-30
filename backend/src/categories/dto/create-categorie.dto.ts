import { IsOptional, Matches } from 'class-validator';
import {
  SansEspaces,
  TexteFacultatif,
  TexteObligatoire,
} from '../../common/validation';
import { m } from '../../i18n/messages';

export class CreateCategorieDto {
  @TexteObligatoire('nom', 100)
  nom!: string;

  @IsOptional()
  @TexteFacultatif('description', 500)
  description?: string;

  @IsOptional()
  @TexteFacultatif('icone', 255)
  icone?: string;

  // Code couleur hexadécimal (#RRGGBB) ; l'interface propose les couleurs de la charte.
  @IsOptional()
  @SansEspaces()
  @Matches(/^#[0-9A-Fa-f]{6}$/, {
    message: m('validation.couleur'),
  })
  couleur?: string;
}
