import { Email } from '../../common/validation';

export class ForgotPasswordDto {
  @Email()
  email!: string;
}
