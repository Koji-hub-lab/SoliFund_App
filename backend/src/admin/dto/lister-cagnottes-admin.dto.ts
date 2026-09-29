import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginationDto } from '../../common/pagination';
import { SansEspaces } from '../../common/validation';

export class ListerCagnottesAdminDto extends PaginationDto {
  @IsOptional()
  @IsIn(['ACTIVE', 'TERMINEE', 'SUSPENDUE', 'ANNULEE'])
  statut?: 'ACTIVE' | 'TERMINEE' | 'SUSPENDUE' | 'ANNULEE';

  @IsOptional()
  @IsString()
  @MaxLength(100)
  @SansEspaces()
  recherche?: string;
}
