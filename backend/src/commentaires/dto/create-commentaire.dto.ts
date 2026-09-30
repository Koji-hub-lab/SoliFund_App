import { Identifiant, TexteObligatoire } from '../../common/validation';

export class CreateCommentaireDto {
  @Identifiant('cagnotte')
  id_cagnotte!: number;

  @TexteObligatoire('commentaire', 1000)
  description!: string;
}
