import { IsString, Length } from 'class-validator';
import { Email, NouveauMotDePasse, SansEspaces } from '../../common/validation';

export class ResetPasswordDto {
  @Email()
  email!: string;

  @SansEspaces()
  @IsString()
  @Length(6, 6, { message: 'Le code doit contenir 6 chiffres.' })
  code!: string;

  @NouveauMotDePasse()
  mot_de_passe!: string;
}
