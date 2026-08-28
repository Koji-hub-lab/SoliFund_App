import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UtilisateursService } from './utilisateurs.service';
import { CreateUtilisateurDto } from './dto/create-utilisateur.dto';
import { UpdateUtilisateurDto } from './dto/update-utilisateur.dto';
import { ChangeStatutDto } from './dto/change-statut.dto';

@Controller('utilisateurs')
export class UtilisateursController {
  constructor(private readonly utilisateursService: UtilisateursService) {}

  @Post('inscription')
  inscrire(@Body() dto: CreateUtilisateurDto) {
    return this.utilisateursService.inscrire(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('moi')
  modifierProfil(@Request() req: any, @Body() dto: UpdateUtilisateurDto) {
    return this.utilisateursService.modifierProfil(req.user.id_utilisateur, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ROLE_ADMIN')
  @Get()
  listerTous() {
    return this.utilisateursService.listerTous();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ROLE_ADMIN')
  @Patch(':id/statut')
  changerStatut(@Param('id', ParseIntPipe) id: number, @Body() dto: ChangeStatutDto) {
    return this.utilisateursService.changerStatut(id, dto);
  }
}