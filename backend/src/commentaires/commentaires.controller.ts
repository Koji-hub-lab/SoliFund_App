import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CommentairesService } from './commentaires.service';
import { CreateCommentaireDto } from './dto/create-commentaire.dto';

@Controller('commentaires')
export class CommentairesController {
  constructor(private readonly commentairesService: CommentairesService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  creer(@Request() req: any, @Body() dto: CreateCommentaireDto) {
    return this.commentairesService.creer(req.user.id_utilisateur, dto);
  }

  @Get('cagnotte/:id')
  listerParCagnotte(@Param('id', ParseIntPipe) id: number) {
    return this.commentairesService.listerParCagnotte(id);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  supprimer(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    return this.commentairesService.supprimer(id, req.user.id_utilisateur);
  }
}