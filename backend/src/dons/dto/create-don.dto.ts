import { IsBoolean, IsIn, IsOptional } from 'class-validator';
import {
  Identifiant,
  Montant,
  TexteFacultatif,
  TexteObligatoire,
} from '../../common/validation';
import { m } from '../../i18n/messages';
import { montantMinimumDon } from '../../config/dons';

export class CreateDonDto {
  @Identifiant('cagnotte')
  id_cagnotte!: number;

  // Minimum réglable par DON_MONTANT_MINIMUM (src/config/dons.ts), lu à chaque requête.
  @Montant('montantDon', montantMinimumDon)
  montant!: number;

  @IsIn(['MTN_MOBILE_MONEY', 'ORANGE_MONEY'], {
    message: m('validation.operateur'),
  })
  methode_paiement!: string;

  @TexteObligatoire('telephone', 20)
  numero_payeur!: string;

  @IsOptional()
  @TexteFacultatif('message', 500)
  message?: string;

  @IsOptional()
  @IsBoolean()
  est_anonyme?: boolean;
}
