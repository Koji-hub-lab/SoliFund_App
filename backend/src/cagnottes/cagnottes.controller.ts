import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Request,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { BadRequestException } from '@nestjs/common';
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

  @UseGuards(JwtAuthGuard)
  @Post(':id/image')
  @UseInterceptors(
    FileInterceptor('image', {
      storage: diskStorage({
        destination: './uploads/cagnottes',
        filename: (req, file, callback) => {
          const suffixeUnique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
          callback(null, `${suffixeUnique}${extname(file.originalname)}`);
        },
      }),
      fileFilter: (req, file, callback) => {
        if (!file.mimetype.match(/^image\/(jpg|jpeg|png|webp)$/)) {
          return callback(
            new BadRequestException(
              'Seules les images JPG, PNG ou WEBP sont acceptées.',
            ),
            false,
          );
        }
        callback(null, true);
      },
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  uploaderImage(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: any,
    @UploadedFile() fichier: Express.Multer.File,
  ) {
    return this.cagnottesService.mettreAJourImage(
      id,
      req.user.id_utilisateur,
      `/uploads/cagnottes/${fichier.filename}`,
    );
  }
}
