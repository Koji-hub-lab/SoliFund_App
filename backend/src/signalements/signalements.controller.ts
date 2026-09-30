import {
  Body,
  Controller,
  Param,
  ParseIntPipe,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { OptionalJwtAuthGuard } from '../auth/optional-jwt-auth.guard';
import type { RequeteOptionnelle } from '../auth/utilisateur-connecte';
import { CreerSignalementDto } from './dto/creer-signalement.dto';
import { SignalementsService } from './signalements.service';

@Controller('cagnottes')
export class SignalementsController {
  constructor(private readonly signalementsService: SignalementsService) {}

  // Route publique (jeton facultatif), limitée à 3 signalements par minute et par adresse IP.
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  @UseGuards(OptionalJwtAuthGuard)
  @Post(':id/signaler')
  signaler(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: RequeteOptionnelle,
    @Body() dto: CreerSignalementDto,
  ) {
    return this.signalementsService.signaler(
      id,
      req.user ?? null,
      req.ip ?? 'inconnue',
      dto,
    );
  }
}
