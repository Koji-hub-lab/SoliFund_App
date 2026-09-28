import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Request,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/optional-jwt-auth.guard';
import { CagnottesService } from './cagnottes.service';
import { CreateCagnotteDto } from './dto/create-cagnotte.dto';
import { UpdateCagnotteDto } from './dto/update-cagnotte.dto';
import { ListerCagnottesDto } from './dto/lister-cagnottes.dto';

@Controller('cagnottes')
export class CagnottesController {
  constructor(private readonly cagnottesService: CagnottesService) {}

  @Get()
  lister(@Query() dto: ListerCagnottesDto) {
    return this.cagnottesService.listerPubliques(dto);
  }

  // Déclarée avant GET :id, sinon « mes » serait pris pour un identifiant.
  @UseGuards(JwtAuthGuard)
  @Get('mes')
  listerMiennes(@Request() req: any) {
    return this.cagnottesService.listerMiennes(req.user.id_utilisateur);
  }

  // Token facultatif : le propriétaire ou un admin voit aussi les cagnottes privées/suspendues/annulées.
  @UseGuards(OptionalJwtAuthGuard)
  @Get(':id')
  trouver(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    return this.cagnottesService.trouverVisible(id, req.user ?? null);
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

  @UseGuards(JwtAuthGuard)
  @Post(':id/image')
  // Stockage en mémoire : rien n'est écrit sur le disque avant la vérification du propriétaire
  // et du vrai type de fichier (faites dans le service).
  @UseInterceptors(
    FileInterceptor('image', { limits: { fileSize: 5 * 1024 * 1024, files: 1 } }),
  )
  uploaderImage(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: any,
    @UploadedFile() fichier: Express.Multer.File | undefined,
  ) {
    return this.cagnottesService.mettreAJourImage(
      id,
      req.user.id_utilisateur,
      fichier,
    );
  }
}
