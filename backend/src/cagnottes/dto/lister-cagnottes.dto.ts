import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { PaginationDto } from '../../common/pagination';
import { SansEspaces } from '../../common/validation';

export const TRIS_CAGNOTTES = [
  'recentes',
  'populaires',
  'bientot_terminees',
] as const;

export class ListerCagnottesDto extends PaginationDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  @SansEspaces()
  recherche?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  id_categorie?: number;

  @IsOptional()
  @IsIn(TRIS_CAGNOTTES)
  tri?: (typeof TRIS_CAGNOTTES)[number];
}
