import { Controller, Get, Header, Param } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { CSP_PAGE_PARTAGE, PartageService } from './partage.service';

// Liens de partage des cagnottes (WhatsApp, Facebook...) : une page HTML avec les balises Open Graph
// pour l'aperçu, qui redirige aussitôt le visiteur vers la page de la cagnotte sur le frontend.
@ApiExcludeController()
@Controller('partage')
export class PartageController {
  constructor(private readonly partageService: PartageService) {}

  @Get('cagnottes/:id')
  @Header('Content-Type', 'text/html; charset=utf-8')
  @Header('Content-Security-Policy', CSP_PAGE_PARTAGE)
  @Header('Cache-Control', 'public, max-age=300')
  pageCagnotte(@Param('id') id: string) {
    return this.partageService.pageCagnotte(id);
  }
}
