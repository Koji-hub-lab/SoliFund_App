import { Body, Controller, Get, Param, ParseIntPipe, Post, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
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
  @Post(':id/valider')
  valider(@Param('id', ParseIntPipe) id: number) {
    return this.donsService.validerPaiement(id);
  }

  @Get('cagnotte/:id')
  listerParCagnotte(@Param('id', ParseIntPipe) id: number) {
    return this.donsService.listerParCagnotte(id);
  }
}