import { IsBoolean, IsIn, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateDonDto {
  @IsNumber()
  id_cagnotte!: number;

  @IsNumber()
  @Min(100)
  montant!: number;

  @IsIn(['MTN_MOBILE_MONEY', 'ORANGE_MONEY'])
  methode_paiement!: string;

  @IsString()
  numero_payeur!: string;

  @IsOptional()
  @IsString()
  message?: string;

  @IsOptional()
  @IsBoolean()
  est_anonyme?: boolean;
}