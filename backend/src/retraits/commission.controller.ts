import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { tauxCommission } from './commission';

// Taux de commission en vigueur : public, pour que le site l'affiche (formulaire de retrait,
// création d'une cagnotte, conditions d'utilisation) sans l'écrire en dur.
@Controller('commission')
export class CommissionController {
  private readonly taux: number;

  constructor(config: ConfigService) {
    this.taux = tauxCommission(config);
  }

  @Get()
  lire() {
    return { taux_pourcent: this.taux };
  }
}
