import { IsString, Length } from 'class-validator';
import { Email, SansEspaces } from '../../common/validation';

export class VerifierEmailDto {
  @Email()
  email!: string;

  @SansEspaces()
  @IsString()
  @Length(6, 6, { message: 'Le code doit contenir 6 chiffres.' })
  code!: string;
}
