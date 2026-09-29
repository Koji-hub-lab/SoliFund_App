import { IsOptional } from 'class-validator';
import { TexteFacultatif } from '../../common/validation';

export class RejectRetraitDto {
  @IsOptional()
  @TexteFacultatif('Le motif', 500)
  motif_rejet?: string;
}
