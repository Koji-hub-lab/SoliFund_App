import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ListerRetraitsDto } from './dto/lister-retraits.dto';
import { EmailVerifieGuard } from '../auth/email-verifie.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { RetraitsService } from './retraits.service';
import { CreateRetraitDto } from './dto/create-retrait.dto';
import { RejectRetraitDto } from './dto/reject-retrait.dto';
import { TraiterRetraitDto } from './dto/traiter-retrait.dto';
import type { RequeteAuthentifiee } from '../auth/utilisateur-connecte';

@Controller('retraits')
@UseGuards(JwtAuthGuard)
export class RetraitsController {
  constructor(private readonly retraitsService: RetraitsService) {}

  // JwtAuthGuard (niveau classe) s'exécute avant : req.user est disponible.
  @UseGuards(EmailVerifieGuard)
  @Post()
  demander(@Request() req: RequeteAuthentifiee, @Body() dto: CreateRetraitDto) {
    return this.retraitsService.demander(req.user.id_utilisateur, dto);
  }

  // « Approuver et verser » (retrait EN_ATTENTE) ou « Relancer le versement » (retrait ECHOUE) :
  // le montant net est envoyé par Notch Pay sur le numéro vérifié de l'organisateur.
  @UseGuards(RolesGuard)
  @Roles('ROLE_ADMIN')
  @Post(':id/verser')
  verser(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: RequeteAuthentifiee,
  ) {
    return this.retraitsService.approuverEtVerser(id, req.user.id_utilisateur);
  }

  // Mode manuel de secours : somme versée hors plateforme, confirmée par { hors_plateforme: true }.
  @UseGuards(RolesGuard)
  @Roles('ROLE_ADMIN')
  @Post(':id/traiter')
  traiter(
    @Param('id', ParseIntPipe) id: number,
    @Body() _dto: TraiterRetraitDto,
    @Request() req: RequeteAuthentifiee,
  ) {
    return this.retraitsService.traiterHorsPlateforme(
      id,
      req.user.id_utilisateur,
    );
  }

  @UseGuards(RolesGuard)
  @Roles('ROLE_ADMIN')
  @Post(':id/rejeter')
  rejeter(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RejectRetraitDto,
  ) {
    return this.retraitsService.rejeter(id, dto);
  }

  @UseGuards(RolesGuard)
  @Roles('ROLE_ADMIN')
  @Get()
  listerToutes(@Query() dto: ListerRetraitsDto) {
    return this.retraitsService.listerToutes(dto);
  }

  @Get('cagnotte/:id')
  listerParCagnotte(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: RequeteAuthentifiee,
  ) {
    const estAdmin = req.user.roles?.includes('ROLE_ADMIN');
    return this.retraitsService.listerParCagnotte(
      id,
      req.user.id_utilisateur,
      estAdmin,
    );
  }
}
