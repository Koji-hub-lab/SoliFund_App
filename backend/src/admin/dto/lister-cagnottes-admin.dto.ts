import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginationDto } from '../../common/pagination';
import { SansEspaces } from '../../common/validation';

export class ListerCagnottesAdminDto extends PaginationDto {
  @IsOptional()
  @IsIn([
    'ACTIVE',
    'TERMINEE',
    'SUSPENDUE',
    'ANNULEE',
    'EN_VERIFICATION',
    'REFUSEE',
  ])
  statut?:
    | 'ACTIVE'
    | 'TERMINEE'
    | 'SUSPENDUE'
    | 'ANNULEE'
    | 'EN_VERIFICATION'
    | 'REFUSEE';

  @IsOptional()
  @IsString()
  @MaxLength(100)
  @SansEspaces()
  recherche?: string;
}
