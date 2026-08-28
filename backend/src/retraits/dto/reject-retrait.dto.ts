import { IsOptional, IsString } from 'class-validator';

export class RejectRetraitDto {
  @IsOptional()
  @IsString()
  motif_rejet?: string;
}