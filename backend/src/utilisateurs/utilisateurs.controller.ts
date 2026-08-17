import { Body, Controller, Post } from '@nestjs/common';
import { UtilisateursService } from './utilisateurs.service';
import { CreateUtilisateurDto } from './dto/create-utilisateur.dto';

@Controller('utilisateurs')
export class UtilisateursController {
  constructor(private readonly utilisateursService: UtilisateursService) {}

  @Post('inscription')
  inscrire(@Body() dto: CreateUtilisateurDto) {
    return this.utilisateursService.inscrire(dto);
  }
}