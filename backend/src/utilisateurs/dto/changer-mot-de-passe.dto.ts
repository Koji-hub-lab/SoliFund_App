import { MotDePasseSaisi, NouveauMotDePasse } from '../../common/validation';

export class ChangerMotDePasseDto {
  @MotDePasseSaisi('Saisissez votre mot de passe actuel.')
  ancien_mot_de_passe!: string;

  @NouveauMotDePasse()
  nouveau_mot_de_passe!: string;
}
