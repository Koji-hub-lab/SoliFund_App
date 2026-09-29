import { IsBoolean, IsIn, IsOptional } from 'class-validator';
import {
  Identifiant,
  Montant,
  TexteFacultatif,
  TexteObligatoire,
} from '../../common/validation';

export class CreateDonDto {
  @Identifiant('La cagnotte')
  id_cagnotte!: number;

  @Montant('Le montant du don', 100)
  montant!: number;

  @IsIn(['MTN_MOBILE_MONEY', 'ORANGE_MONEY'], {
    message: 'Choisissez MTN Mobile Money ou Orange Money.',
  })
  methode_paiement!: string;

  @TexteObligatoire('Le numéro de téléphone', 20)
  numero_payeur!: string;

  @IsOptional()
  @TexteFacultatif('Le message', 500)
  message?: string;

  @IsOptional()
  @IsBoolean()
  est_anonyme?: boolean;
}
