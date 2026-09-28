import { Transform, Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { PaginationDto } from '../../common/pagination';

export const TRIS_CAGNOTTES = ['recentes', 'populaires', 'bientot_terminees'] as const;

export class ListerCagnottesDto extends PaginationDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
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
