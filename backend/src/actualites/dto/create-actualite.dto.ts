import { Identifiant, TexteObligatoire } from '../../common/validation';

export class CreateActualiteDto {
  @Identifiant('cagnotte')
  id_cagnotte!: number;

  @TexteObligatoire('titre', 255)
  titre!: string;

  @TexteObligatoire('contenu', 5000)
  contenu!: string;
}
