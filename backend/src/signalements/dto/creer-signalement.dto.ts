import { IsIn, IsOptional } from 'class-validator';
import { TexteFacultatif } from '../../common/validation';
import { m } from '../../i18n/messages';

export const MOTIFS_SIGNALEMENT = [
  'ARNAQUE',
  'CONTENU_INAPPROPRIE',
  'FAUSSES_INFORMATIONS',
  'AUTRE',
] as const;

export class CreerSignalementDto {
  @IsIn(MOTIFS_SIGNALEMENT, {
    message: m('validation.motifSignalement'),
  })
  motif!: (typeof MOTIFS_SIGNALEMENT)[number];

  @IsOptional()
  @TexteFacultatif('commentaire', 1000)
  commentaire?: string;
}
