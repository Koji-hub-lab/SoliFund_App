import { IsIn, IsOptional } from 'class-validator';
import { PaginationDto } from '../../common/pagination';

export class ListerVerificationsDto extends PaginationDto {
  // Absent = tous les statuts.
  @IsOptional()
  @IsIn(['EN_ATTENTE', 'VALIDEE', 'REFUSEE'])
  statut?: 'EN_ATTENTE' | 'VALIDEE' | 'REFUSEE';
}
