import { Email, MotDePasseSaisi } from '../../common/validation';
import { m } from '../../i18n/messages';

export class LoginDto {
  @Email()
  email!: string;

  @MotDePasseSaisi(m('validation.motDePasseRequis'))
  mot_de_passe!: string;
}
