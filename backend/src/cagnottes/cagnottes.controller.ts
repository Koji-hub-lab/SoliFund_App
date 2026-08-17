import {
  Body, Controller, Delete, Get, Param, ParseIntPipe,
  Patch, Post, Request, UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CagnottesService } from './cagnottes.service';
import { CreateCagnotteDto } from './dto/create-cagnotte.dto';
import { UpdateCagnotteDto } from './dto/update-cagnotte.dto';

@Controller('cagnottes')
export class CagnottesController {
  constructor(private readonly cagnottesService: CagnottesService) {}

  @Get()
  lister() {
    return this.cagnottesService.listerPubliques();
  }

  @Get(':id')
  trouver(@Param('id', ParseIntPipe) id: number) {
    return this.cagnottesService.trouverParId(id);
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  creer(@Request() req: any, @Body() dto: CreateCagnotteDto) {
    return this.cagnottesService.creer(req.user.id_utilisateur, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  modifier(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: any,
    @Body() dto: UpdateCagnotteDto,
  ) {
    return this.cagnottesService.modifier(id, req.user.id_utilisateur, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  supprimer(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    return this.cagnottesService.supprimer(id, req.user.id_utilisateur);
  }
}