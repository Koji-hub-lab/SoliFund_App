import { Controller, Get, Header } from '@nestjs/common';
import { montantMinimumDon } from '../config/dons';

// Réglages publics lus par le frontend (formulaire de don), pour ne pas les recopier en dur.
@Controller('configuration')
export class ConfigurationPubliqueController {
  @Get()
  @Header('Cache-Control', 'public, max-age=300')
  lire() {
    return { don_montant_minimum: montantMinimumDon() };
  }
}
