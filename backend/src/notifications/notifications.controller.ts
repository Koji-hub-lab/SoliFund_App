import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { NotificationsService } from './notifications.service';
import type { RequeteAuthentifiee } from '../auth/utilisateur-connecte';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  lister(@Request() req: RequeteAuthentifiee) {
    return this.notificationsService.listerPourUtilisateur(
      req.user.id_utilisateur,
    );
  }

  @Patch(':id/lue')
  marquerLue(
    @Request() req: RequeteAuthentifiee,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.notificationsService.marquerLue(req.user.id_utilisateur, id);
  }
}
