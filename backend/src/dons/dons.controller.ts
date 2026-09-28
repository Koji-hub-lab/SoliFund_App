import { Body, Controller, Get, Param, ParseIntPipe, Post, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { DonsService } from './dons.service';
import { CreateDonDto } from './dto/create-don.dto';

@Controller('dons')
export class DonsController {
  constructor(private readonly donsService: DonsService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  creer(@Request() req: any, @Body() dto: CreateDonDto) {
    return this.donsService.creer(req.user.id_utilisateur, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/verifier-statut')
  verifierStatut(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    const estAdmin = req.user.roles?.includes('ROLE_ADMIN');
    return this.donsService.verifierStatutDon(id, req.user.id_utilisateur, estAdmin);
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

  @Get('cagnotte/:id')
  listerParCagnotte(@Param('id', ParseIntPipe) id: number) {
    return this.donsService.listerParCagnotte(id);
  }
}