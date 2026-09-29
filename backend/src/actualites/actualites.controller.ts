import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/optional-jwt-auth.guard';
import { ActualitesService } from './actualites.service';
import { CreateActualiteDto } from './dto/create-actualite.dto';
import type {
  RequeteAuthentifiee,
  RequeteOptionnelle,
} from '../auth/utilisateur-connecte';

@Controller('actualites')
export class ActualitesController {
  constructor(private readonly actualitesService: ActualitesService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  creer(@Request() req: RequeteAuthentifiee, @Body() dto: CreateActualiteDto) {
    return this.actualitesService.creer(req.user.id_utilisateur, dto);
  }

  // Token facultatif : le propriétaire ou un admin voit aussi les cagnottes masquées.
  @UseGuards(OptionalJwtAuthGuard)
  @Get('cagnotte/:id')
  listerParCagnotte(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: RequeteOptionnelle,
  ) {
    return this.actualitesService.listerParCagnotte(id, req.user ?? null);
  }
}
