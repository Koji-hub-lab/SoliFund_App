import { Email, MotDePasseSaisi } from '../../common/validation';

export class LoginDto {
  @Email()
  email!: string;

  @MotDePasseSaisi('Saisissez votre mot de passe.')
  mot_de_passe!: string;
}
