import { IsDateString, IsIn, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateCagnotteDto {
  @IsString()
  titre!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNumber()
  @Min(1)
  objectif!: number;

  @IsDateString()
  date_debut!: string;

  @IsDateString()
  date_fin!: string;

  @IsOptional()
  @IsIn(['XAF'])
  devise?: string;

  @IsOptional()
  @IsNumber()
  id_categorie?: number;
}