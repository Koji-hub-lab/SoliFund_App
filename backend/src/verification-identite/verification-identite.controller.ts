import {
  Body,
  Controller,
  Get,
  Post,
  Request,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { RequeteAuthentifiee } from '../auth/utilisateur-connecte';
import { SoumettreVerificationDto } from './dto/soumettre-verification.dto';
import {
  VerificationIdentiteService,
  type FichiersIdentite,
} from './verification-identite.service';

// 5 Mo par fichier, comme pour les photos de cagnotte.
const TAILLE_MAX = 5 * 1024 * 1024;

// Vérification d'identité, côté utilisateur. Les fichiers ne sont jamais renvoyés par ces routes.
@Controller('verification-identite')
@UseGuards(JwtAuthGuard)
export class VerificationIdentiteController {
  constructor(private readonly service: VerificationIdentiteService) {}

  // Multipart : champs texte du DTO + fichiers « recto », « verso » (facultatif pour le passeport)
  // et « selfie ». Gardés en mémoire le temps des contrôles, puis écrits dans le stockage privé.
  @Post()
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'recto', maxCount: 1 },
        { name: 'verso', maxCount: 1 },
        { name: 'selfie', maxCount: 1 },
      ],
      { limits: { fileSize: TAILLE_MAX, files: 3 } },
    ),
  )
  soumettre(
    @Request() req: RequeteAuthentifiee,
    @Body() dto: SoumettreVerificationDto,
    @UploadedFiles() fichiers: FichiersIdentite | undefined,
  ) {
    return this.service.soumettre(req.user.id_utilisateur, dto, fichiers ?? {});
  }

  @Get('moi')
  moi(@Request() req: RequeteAuthentifiee) {
    return this.service.moi(req.user.id_utilisateur);
  }
}
