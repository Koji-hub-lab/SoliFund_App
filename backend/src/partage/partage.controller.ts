import { Controller, Get, Header, Param, Req } from '@nestjs/common';
import type { Request } from 'express';
import { ApiExcludeController } from '@nestjs/swagger';
import { CSP_PAGE_PARTAGE, PartageService } from './partage.service';
import { LangueRequete } from '../i18n/langue-requete.decorator';
import type { Langue } from '../i18n/langues';

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
  // La page dépend de la langue demandée : les caches gardent une version par langue.
  @Header('Vary', 'Accept-Language')
  pageCagnotte(
    @Param('id') id: string,
    @LangueRequete() langue: Langue,
    @Req() req: Request,
  ) {
    // Sans PUBLIC_API_URL (développement uniquement) : adresse de la requête reçue.
    return this.partageService.pageCagnotte(
      id,
      langue,
      `${req.protocol}://${req.get('host') ?? ''}`,
    );
  }
}
