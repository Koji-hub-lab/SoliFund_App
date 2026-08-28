import { IsString, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @IsString()
  code!: string;

  @IsString()
  @MinLength(8, { message: 'Le mot de passe doit contenir au moins 8 caractères' })
  mot_de_passe!: string;
}