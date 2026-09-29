import { Identifiant, TexteObligatoire } from '../../common/validation';

export class CreateActualiteDto {
  @Identifiant('La cagnotte')
  id_cagnotte!: number;

  @TexteObligatoire('Le titre', 255)
  titre!: string;

  @TexteObligatoire('Le contenu', 5000)
  contenu!: string;
}
