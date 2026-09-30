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
import { PaginationDto } from '../common/pagination';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UtilisateursService } from './utilisateurs.service';
import { CreateUtilisateurDto } from './dto/create-utilisateur.dto';
import { UpdateUtilisateurDto } from './dto/update-utilisateur.dto';
import { ChangeStatutDto } from './dto/change-statut.dto';
import { ChangerMotDePasseDto } from './dto/changer-mot-de-passe.dto';
import type { RequeteAuthentifiee } from '../auth/utilisateur-connecte';
import { LangueRequete } from '../i18n/langue-requete.decorator';
import type { Langue } from '../i18n/langues';

@Controller('utilisateurs')
export class UtilisateursController {
  constructor(private readonly utilisateursService: UtilisateursService) {}

  @Post('inscription')
  inscrire(@Body() dto: CreateUtilisateurDto, @LangueRequete() langue: Langue) {
    return this.utilisateursService.inscrire(dto, langue);
  }

  @UseGuards(JwtAuthGuard)
  @Get('moi')
  moi(@Request() req: RequeteAuthentifiee) {
    return this.utilisateursService.moi(req.user.id_utilisateur);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('moi/mot-de-passe')
  changerMotDePasse(
    @Request() req: RequeteAuthentifiee,
    @Body() dto: ChangerMotDePasseDto,
  ) {
    return this.utilisateursService.changerMotDePasse(
      req.user.id_utilisateur,
      dto,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Patch('moi')
  modifierProfil(
    @Request() req: RequeteAuthentifiee,
    @Body() dto: UpdateUtilisateurDto,
  ) {
    return this.utilisateursService.modifierProfil(
      req.user.id_utilisateur,
      dto,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ROLE_ADMIN')
  @Get()
  listerTous(@Query() dto: PaginationDto) {
    return this.utilisateursService.listerTous(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ROLE_ADMIN')
  @Patch(':id/statut')
  changerStatut(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ChangeStatutDto,
    @Request() req: RequeteAuthentifiee,
  ) {
    return this.utilisateursService.changerStatut(
      id,
      dto,
      req.user.id_utilisateur,
    );
  }
}
