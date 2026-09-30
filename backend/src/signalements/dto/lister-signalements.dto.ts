import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Min } from 'class-validator';
import { PaginationDto } from '../../common/pagination';

export class ListerSignalementsDto extends PaginationDto {
  // Absent = tous les statuts.
  @IsOptional()
  @IsIn(['OUVERT', 'CLASSE'])
  statut?: 'OUVERT' | 'CLASSE';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  id_cagnotte?: number;
}
