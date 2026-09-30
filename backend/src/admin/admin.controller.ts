import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { AdminService } from './admin.service';
import { RevenusService } from './revenus.service';
import { PaginationDto } from '../common/pagination';
import { ListerCagnottesAdminDto } from './dto/lister-cagnottes-admin.dto';
import { ChangerStatutCagnotteDto } from './dto/changer-statut-cagnotte.dto';
import { RefuserCagnotteDto } from './dto/refuser-cagnotte.dto';
import { PublicationCagnottesService } from '../cagnottes/publication-cagnottes.service';
import { SignalementsService } from '../signalements/signalements.service';
import { ListerSignalementsDto } from '../signalements/dto/lister-signalements.dto';
import type { RequeteAuthentifiee } from '../auth/utilisateur-connecte';
import { m } from '../i18n/messages';

// RolesGuard lit @Roles sur chaque méthode : le décorateur est répété sur chaque route.
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly publication: PublicationCagnottesService,
    private readonly signalementsService: SignalementsService,
    private readonly revenusService: RevenusService,
  ) {}

  @Roles('ROLE_ADMIN')
  @Get('statistiques')
  statistiques() {
    return this.adminService.statistiques();
  }

  // Revenus : commissions prélevées sur les retraits versés.
  @Roles('ROLE_ADMIN')
  @Get('revenus')
  revenus() {
    return this.revenusService.resume();
  }

  @Roles('ROLE_ADMIN')
  @Get('revenus/commissions')
  listerCommissions(@Query() dto: PaginationDto) {
    return this.revenusService.lister(dto);
  }

  @Roles('ROLE_ADMIN')
  @Get('cagnottes')
  listerCagnottes(@Query() dto: ListerCagnottesAdminDto) {
    return this.adminService.listerCagnottes(dto);
  }

  @Roles('ROLE_ADMIN')
  @Patch('cagnottes/:id/statut')
  changerStatutCagnotte(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ChangerStatutCagnotteDto,
    @Request() req: RequeteAuthentifiee,
  ) {
    return this.adminService.changerStatutCagnotte(
      id,
      dto,
      req.user.id_utilisateur,
    );
  }

  // Publie une cagnotte en vérification (refusé si l'identité de l'organisateur n'est pas validée).
  @Roles('ROLE_ADMIN')
  @Post('cagnottes/:id/approuver')
  approuverCagnotte(@Param('id', ParseIntPipe) id: number) {
    return this.publication.approuver(id);
  }

  @Roles('ROLE_ADMIN')
  @Post('cagnottes/:id/refuser')
  refuserCagnotte(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RefuserCagnotteDto,
  ) {
    return this.publication.refuser(id, dto.motif);
  }

  @Roles('ROLE_ADMIN')
  @Get('signalements')
  listerSignalements(@Query() dto: ListerSignalementsDto) {
    return this.signalementsService.lister(dto);
  }

  // Classe sans suite tous les signalements ouverts d'une cagnotte.
  @Roles('ROLE_ADMIN')
  @Post('signalements/cagnottes/:id/classer')
  async classerSignalementsCagnotte(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: RequeteAuthentifiee,
  ) {
    await this.signalementsService.classerPourCagnotte(
      id,
      req.user.id_utilisateur,
    );
    return { message: m('signalements.classes') };
  }

  @Roles('ROLE_ADMIN')
  @Post('signalements/:id/classer')
  classerSignalement(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: RequeteAuthentifiee,
  ) {
    return this.signalementsService.classer(id, req.user.id_utilisateur);
  }
}
