import { Equals } from 'class-validator';
import { m } from '../../i18n/messages';

// Mode manuel de secours : l'administrateur confirme que la somme a été versée hors plateforme.
export class TraiterRetraitDto {
  @Equals(true, { message: m('retraits.horsPlateformeRequis') })
  hors_plateforme!: boolean;
}
