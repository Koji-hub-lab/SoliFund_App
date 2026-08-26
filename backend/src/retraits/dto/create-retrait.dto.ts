import { IsIn, IsNumber, IsString, Min } from 'class-validator';

export class CreateRetraitDto {
  @IsNumber()
  id_cagnotte!: number;

  @IsNumber()
  @Min(100)
  montant!: number;

  @IsIn(['MTN_MOBILE_MONEY', 'ORANGE_MONEY'])
  methode_retrait!: string;

  @IsString()
  numero_beneficiaire!: string;
}
