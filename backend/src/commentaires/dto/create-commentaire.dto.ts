import { IsNumber, IsString } from 'class-validator';

export class CreateCommentaireDto {
  @IsNumber()
  id_cagnotte!: number;

  @IsString()
  description!: string;
}