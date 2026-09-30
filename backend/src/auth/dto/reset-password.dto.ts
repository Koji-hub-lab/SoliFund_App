import { IsString, Length } from 'class-validator';
import { Email, NouveauMotDePasse, SansEspaces } from '../../common/validation';
import { m } from '../../i18n/messages';

export class ResetPasswordDto {
  @Email()
  email!: string;

  @SansEspaces()
  @IsString()
  @Length(6, 6, { message: m('validation.code6Chiffres') })
  code!: string;

  @NouveauMotDePasse()
  mot_de_passe!: string;
}
