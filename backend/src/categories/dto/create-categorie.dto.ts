import { IsOptional, IsString } from 'class-validator';

export class CreateCategorieDto {
  @IsString()
  nom!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  icone?: string;

  @IsOptional()
  @IsString()
  couleur?: string;
}