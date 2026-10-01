import { IsIn, IsOptional } from 'class-validator';
import { PaginationDto } from '../../common/pagination';

export class ListerRetraitsDto extends PaginationDto {
  // Filtre de la page admin (EN_ATTENTE, TRAITE, REJETE...) ; absent = tous les statuts.
  @IsOptional()
  @IsIn(['EN_ATTENTE', 'APPROUVE', 'TRAITE', 'REJETE', 'ECHOUE'])
  statut?: 'EN_ATTENTE' | 'APPROUVE' | 'TRAITE' | 'REJETE' | 'ECHOUE';
}
