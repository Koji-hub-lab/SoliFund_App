import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateUtilisateurDto {
  @IsString()
  @IsNotEmpty()
  nom!: string;

  @IsString()
  @IsNotEmpty()
  prenom!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8, { message: 'Le mot de passe doit contenir au moins 8 caractères' })
  mot_de_passe!: string;

  @IsOptional()
  @IsString()
  telephone?: string;
}