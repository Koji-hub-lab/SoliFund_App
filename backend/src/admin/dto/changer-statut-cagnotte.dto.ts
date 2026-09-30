import {
  IsIn,
  IsNotEmpty,
  IsString,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { SansEspaces } from '../../common/validation';
import { m } from '../../i18n/messages';

export class ChangerStatutCagnotteDto {
  @IsIn(['SUSPENDUE', 'ACTIVE'], {
    message: m('validation.statutCagnotte'),
  })
  statut!: 'SUSPENDUE' | 'ACTIVE';

  // Obligatoire pour une suspension : il est transmis à l'organisateur.
  @ValidateIf((dto: ChangerStatutCagnotteDto) => dto.statut === 'SUSPENDUE')
  @SansEspaces()
  @IsString()
  @IsNotEmpty({
    message: m('validation.motifSuspension'),
  })
  @MaxLength(500)
  motif?: string;
}
