import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { PaginationDto } from '../common/pagination';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/optional-jwt-auth.guard';
import { CommentairesService } from './commentaires.service';
import { CreateCommentaireDto } from './dto/create-commentaire.dto';
import type {
  RequeteAuthentifiee,
  RequeteOptionnelle,
} from '../auth/utilisateur-connecte';

@Controller('commentaires')
export class CommentairesController {
  constructor(private readonly commentairesService: CommentairesService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  creer(
    @Request() req: RequeteAuthentifiee,
    @Body() dto: CreateCommentaireDto,
  ) {
    return this.commentairesService.creer(req.user, dto);
  }

  // Token facultatif : le propriétaire ou un admin voit aussi les cagnottes masquées.
  @UseGuards(OptionalJwtAuthGuard)
  @Get('cagnotte/:id')
  listerParCagnotte(
    @Param('id', ParseIntPipe) id: number,
    @Query() dto: PaginationDto,
    @Request() req: RequeteOptionnelle,
  ) {
    return this.commentairesService.listerParCagnotte(
      id,
      dto,
      req.user ?? null,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  supprimer(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: RequeteAuthentifiee,
  ) {
    return this.commentairesService.supprimer(id, req.user.id_utilisateur);
  }
}
