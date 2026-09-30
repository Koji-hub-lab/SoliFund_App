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
import { Throttle } from '@nestjs/throttler';
import { PaginationDto } from '../common/pagination';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/optional-jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { DonsService } from './dons.service';
import { CreateDonDto } from './dto/create-don.dto';
import type {
  RequeteAuthentifiee,
  RequeteOptionnelle,
} from '../auth/utilisateur-connecte';

@Controller('dons')
export class DonsController {
  constructor(private readonly donsService: DonsService) {}

  // Limite par adresse IP (large : plusieurs donateurs peuvent partager la même adresse) ; la
  // limite par utilisateur est dans DonsService.
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @UseGuards(JwtAuthGuard)
  @Post()
  creer(@Request() req: RequeteAuthentifiee, @Body() dto: CreateDonDto) {
    return this.donsService.creer(req.user.id_utilisateur, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/verifier-statut')
  verifierStatut(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: RequeteAuthentifiee,
  ) {
    const estAdmin = req.user.roles?.includes('ROLE_ADMIN');
    return this.donsService.verifierStatutDon(
      id,
      req.user.id_utilisateur,
      estAdmin,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ROLE_ADMIN')
  @Post(':id/valider')
  valider(@Param('id', ParseIntPipe) id: number) {
    return this.donsService.validerPaiement(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ROLE_ADMIN')
  @Get()
  listerTous() {
    return this.donsService.listerTous();
  }

  // Token facultatif : le propriétaire ou un admin voit aussi les cagnottes masquées.
  @UseGuards(OptionalJwtAuthGuard)
  @Get('cagnotte/:id')
  listerParCagnotte(
    @Param('id', ParseIntPipe) id: number,
    @Query() dto: PaginationDto,
    @Request() req: RequeteOptionnelle,
  ) {
    return this.donsService.listerParCagnotte(id, dto, req.user ?? null);
  }
}
