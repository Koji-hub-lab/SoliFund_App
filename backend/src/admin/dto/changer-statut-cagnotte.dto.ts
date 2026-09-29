import {
  IsIn,
  IsNotEmpty,
  IsString,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { SansEspaces } from '../../common/validation';

export class ChangerStatutCagnotteDto {
  @IsIn(['SUSPENDUE', 'ACTIVE'], {
    message: 'Le statut doit être SUSPENDUE ou ACTIVE.',
  })
  statut!: 'SUSPENDUE' | 'ACTIVE';

  // Obligatoire pour une suspension : il est transmis à l'organisateur.
  @ValidateIf((dto: ChangerStatutCagnotteDto) => dto.statut === 'SUSPENDUE')
  @SansEspaces()
  @IsString()
  @IsNotEmpty({
    message: 'Le motif est obligatoire pour suspendre une cagnotte.',
  })
  @MaxLength(500)
  motif?: string;
}
