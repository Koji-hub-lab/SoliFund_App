import { Email } from '../../common/validation';

export class RenvoyerCodeDto {
  @Email()
  email!: string;
}
