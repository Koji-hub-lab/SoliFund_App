import { IsDateString, IsIn, IsOptional } from 'class-validator';
import {
  Identifiant,
  Montant,
  TexteFacultatif,
  TexteObligatoire,
} from '../../common/validation';
import { m } from '../../i18n/messages';

export class CreateCagnotteDto {
  @TexteObligatoire('titre', 255)
  titre!: string;

  @IsOptional()
  @TexteFacultatif('description', 5000)
  description?: string;

  @Montant('objectif', 1)
  objectif!: number;

  @IsDateString({}, { message: m('validation.dateDebut') })
  date_debut!: string;

  @IsDateString({}, { message: m('validation.dateFin') })
  date_fin!: string;

  @IsOptional()
  @IsIn(['XAF'], { message: m('validation.devise') })
  devise?: string;

  @IsOptional()
  @Identifiant('categorie')
  id_categorie?: number;
}
