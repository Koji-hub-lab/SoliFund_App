import { IsString, Length } from 'class-validator';
import { Email, SansEspaces } from '../../common/validation';
import { m } from '../../i18n/messages';

export class VerifierEmailDto {
  @Email()
  email!: string;

  @SansEspaces()
  @IsString()
  @Length(6, 6, { message: m('validation.code6Chiffres') })
  code!: string;
}
