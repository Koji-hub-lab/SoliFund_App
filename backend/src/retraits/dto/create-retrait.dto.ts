import { IsOptional, IsString, MaxLength } from 'class-validator';
import { Identifiant, Montant } from '../../common/validation';

export class CreateRetraitDto {
  @Identifiant('cagnotte')
  id_cagnotte!: number;

  @Montant('montantRetrait', 100)
  montant!: number;

  // Ces deux champs ne sont plus pris en compte : le retrait est toujours versé sur le numéro et
  // l'opérateur de la vérification d'identité validée. Ils restent acceptés (et ignorés) pour les
  // clients qui les envoient encore.
  @IsOptional()
  @IsString()
  @MaxLength(30)
  methode_retrait?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  numero_beneficiaire?: string;
}
