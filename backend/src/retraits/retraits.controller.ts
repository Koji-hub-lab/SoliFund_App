import { Body, Controller, Get, Param, ParseIntPipe, Post, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { RetraitsService } from './retraits.service';
import { CreateRetraitDto } from './dto/create-retrait.dto';

@Controller('retraits')
@UseGuards(JwtAuthGuard)
export class RetraitsController {
  constructor(private readonly retraitsService: RetraitsService) {}

  @Post()
  demander(@Request() req: any, @Body() dto: CreateRetraitDto) {
    return this.retraitsService.demander(req.user.id_utilisateur, dto);
  }

  @UseGuards(RolesGuard)
  @Roles('ROLE_ADMIN')
  @Post(':id/traiter')
  traiter(@Param('id', ParseIntPipe) id: number) {
    return this.retraitsService.traiter(id);
  }

  @Get('cagnotte/:id')
  listerParCagnotte(@Param('id', ParseIntPipe) id: number) {
    return this.retraitsService.listerParCagnotte(id);
  }
}