import { IsOptional } from 'class-validator';
import { TexteFacultatif } from '../../common/validation';

export class RejectRetraitDto {
  @IsOptional()
  @TexteFacultatif('motif', 500)
  motif_rejet?: string;
}
