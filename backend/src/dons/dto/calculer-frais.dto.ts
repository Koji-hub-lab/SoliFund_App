import { Type } from 'class-transformer';
import { IsIn } from 'class-validator';
import { Identifiant, Montant } from '../../common/validation';
import { montantMinimumDon } from '../../config/dons';
import { m } from '../../i18n/messages';
import type { MethodePaiement } from '../../payment/notchpay.utilitaires';

// Paramètres de GET /dons/frais (chaîne de requête) : mêmes règles que pour la création d'un don.
export class CalculerFraisDto {
  @Type(() => Number)
  @Identifiant('cagnotte')
  id_cagnotte!: number;

  @Type(() => Number)
  @Montant('montantDon', montantMinimumDon)
  montant!: number;

  @IsIn(['MTN_MOBILE_MONEY', 'ORANGE_MONEY'], {
    message: m('validation.operateur'),
  })
  methode_paiement!: MethodePaiement;
}
