import { IsDateString, IsIn, IsOptional } from 'class-validator';
import {
  Identifiant,
  Montant,
  TexteFacultatif,
  TexteObligatoire,
} from '../../common/validation';

export class CreateCagnotteDto {
  @TexteObligatoire('Le titre', 255)
  titre!: string;

  @IsOptional()
  @TexteFacultatif('La description', 5000)
  description?: string;

  @Montant("L'objectif", 1)
  objectif!: number;

  @IsDateString({}, { message: 'La date de début est invalide.' })
  date_debut!: string;

  @IsDateString({}, { message: 'La date de fin est invalide.' })
  date_fin!: string;

  @IsOptional()
  @IsIn(['XAF'], { message: 'Seule la devise XAF est acceptée.' })
  devise?: string;

  @IsOptional()
  @Identifiant('La catégorie')
  id_categorie?: number;
}
