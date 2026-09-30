import {
  Body,
  Controller,
  Get,
  Header,
  NotFoundException,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Request,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import type { RequeteAuthentifiee } from '../auth/utilisateur-connecte';
import { ListerVerificationsDto } from './dto/lister-verifications.dto';
import { RefuserVerificationDto } from './dto/refuser-verification.dto';
import {
  NOMS_FICHIERS,
  VerificationIdentiteService,
  type NomFichier,
} from './verification-identite.service';
import { m } from '../i18n/messages';

// Vérifications d'identité, côté administration : toutes les routes exigent ROLE_ADMIN.
@Controller('admin/verifications-identite')
@UseGuards(JwtAuthGuard, RolesGuard)
export class VerificationIdentiteAdminController {
  constructor(private readonly service: VerificationIdentiteService) {}

  @Roles('ROLE_ADMIN')
  @Get()
  lister(@Query() dto: ListerVerificationsDto) {
    return this.service.lister(dto);
  }

  @Roles('ROLE_ADMIN')
  @Get(':id')
  detail(@Param('id', ParseIntPipe) id: number) {
    return this.service.detail(id);
  }

  // Lecture en flux du recto, du verso ou du selfie. Jamais gardé en cache par le navigateur ;
  // chaque consultation est journalisée (voir le service).
  @Roles('ROLE_ADMIN')
  @Get(':id/fichiers/:nom')
  @Header('Cache-Control', 'no-store')
  async fichier(
    @Param('id', ParseIntPipe) id: number,
    @Param('nom') nom: string,
    @Request() req: RequeteAuthentifiee,
  ) {
    if (!(NOMS_FICHIERS as readonly string[]).includes(nom)) {
      throw new NotFoundException(m('identite.fichierInconnu'));
    }
    const { flux, typeMime } = await this.service.lireFichier(
      id,
      nom as NomFichier,
      req.user.id_utilisateur,
    );
    return new StreamableFile(flux, { type: typeMime, disposition: 'inline' });
  }

  @Roles('ROLE_ADMIN')
  @Post(':id/valider')
  valider(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: RequeteAuthentifiee,
  ) {
    return this.service.valider(id, req.user.id_utilisateur);
  }

  @Roles('ROLE_ADMIN')
  @Post(':id/refuser')
  refuser(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RefuserVerificationDto,
    @Request() req: RequeteAuthentifiee,
  ) {
    return this.service.refuser(id, req.user.id_utilisateur, dto.motif);
  }
}
