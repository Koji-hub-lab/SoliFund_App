import { IsNumber, IsString } from 'class-validator';

export class CreateActualiteDto {
  @IsNumber()
  id_cagnotte!: number;

  @IsString()
  titre!: string;

  @IsString()
  contenu!: string;
}