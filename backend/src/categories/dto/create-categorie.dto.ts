import { IsOptional, Matches } from 'class-validator';
import {
  SansEspaces,
  TexteFacultatif,
  TexteObligatoire,
} from '../../common/validation';

export class CreateCategorieDto {
  @TexteObligatoire('Le nom', 100)
  nom!: string;

  @IsOptional()
  @TexteFacultatif('La description', 500)
  description?: string;

  @IsOptional()
  @TexteFacultatif("L'icône", 255)
  icone?: string;

  // Code couleur hexadécimal (#RRGGBB) ; l'interface propose les couleurs de la charte.
  @IsOptional()
  @SansEspaces()
  @Matches(/^#[0-9A-Fa-f]{6}$/, {
    message: 'La couleur doit être un code du type #087F7A.',
  })
  couleur?: string;
}
