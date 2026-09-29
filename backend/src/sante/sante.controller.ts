import { Controller, Get } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';

// Route de santé : utilisée pour vérifier que l'API répond (supervision, hébergeur).
@SkipThrottle()
@Controller('sante')
export class SanteController {
  @Get()
  verifier() {
    return { statut: 'ok' };
  }
}
