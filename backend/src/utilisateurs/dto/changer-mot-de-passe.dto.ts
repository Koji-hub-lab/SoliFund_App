import { IsOptional } from 'class-validator';
import { MotDePasseSaisi, NouveauMotDePasse } from '../../common/validation';
import { m } from '../../i18n/messages';

export class ChangerMotDePasseDto {
  // Facultatif uniquement pour un compte sans mot de passe (créé avec Google) : voir le service.
  @IsOptional()
  @MotDePasseSaisi(m('validation.motDePasseActuelRequis'))
  ancien_mot_de_passe?: string;

  @NouveauMotDePasse()
  nouveau_mot_de_passe!: string;
}
