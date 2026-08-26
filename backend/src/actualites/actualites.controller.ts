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
import { ActualitesService } from './actualites.service';
import { CreateActualiteDto } from './dto/create-actualite.dto';

@Controller('actualites')
export class ActualitesController {
  constructor(private readonly actualitesService: ActualitesService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  creer(@Request() req: any, @Body() dto: CreateActualiteDto) {
    return this.actualitesService.creer(req.user.id_utilisateur, dto);
  }

  @Get('cagnotte/:id')
  listerParCagnotte(@Param('id', ParseIntPipe) id: number) {
    return this.actualitesService.listerParCagnotte(id);
  }
}
