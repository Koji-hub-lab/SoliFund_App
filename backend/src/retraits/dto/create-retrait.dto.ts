import { IsIn } from 'class-validator';
import {
  Identifiant,
  Montant,
  TexteObligatoire,
} from '../../common/validation';

export class CreateRetraitDto {
  @Identifiant('La cagnotte')
  id_cagnotte!: number;

  @Montant('Le montant du retrait', 100)
  montant!: number;

  @IsIn(['MTN_MOBILE_MONEY', 'ORANGE_MONEY'], {
    message: 'Choisissez MTN Mobile Money ou Orange Money.',
  })
  methode_retrait!: string;

  @TexteObligatoire('Le numéro de téléphone', 20)
  numero_beneficiaire!: string;
}
