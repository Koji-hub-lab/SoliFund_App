import { Identifiant, TexteObligatoire } from '../../common/validation';

export class CreateCommentaireDto {
  @Identifiant('La cagnotte')
  id_cagnotte!: number;

  @TexteObligatoire('Le commentaire', 1000)
  description!: string;
}
