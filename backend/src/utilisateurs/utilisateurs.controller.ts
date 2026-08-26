import { Body, Controller, Patch, Post, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UtilisateursService } from './utilisateurs.service';
import { CreateUtilisateurDto } from './dto/create-utilisateur.dto';
import { UpdateUtilisateurDto } from './dto/update-utilisateur.dto';

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
}