import { Controller, Get, Header } from '@nestjs/common';
import { OPERATEURS_MOBILE_MONEY } from '../config/operateurs-mobile-money';

// Préfixes des opérateurs Mobile Money (src/config/operateurs-mobile-money.ts), pour que le
// formulaire de don choisisse l'opérateur d'après le numéro. Public.
@Controller('paiements')
export class OperateursController {
  @Get('operateurs')
  @Header('Cache-Control', 'public, max-age=3600')
  operateurs() {
    return OPERATEURS_MOBILE_MONEY;
  }
}
