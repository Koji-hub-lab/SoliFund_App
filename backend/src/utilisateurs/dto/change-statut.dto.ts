import { IsIn } from 'class-validator';

export class ChangeStatutDto {
  @IsIn(['ACTIF', 'SUSPENDU', 'BANNI', 'INACTIF'])
  statut!: 'ACTIF' | 'SUSPENDU' | 'BANNI' | 'INACTIF';
}