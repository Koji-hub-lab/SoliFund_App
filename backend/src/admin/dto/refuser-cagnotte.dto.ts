import { TexteObligatoire } from '../../common/validation';

export class RefuserCagnotteDto {
  // Transmis à l'organisateur dans sa notification.
  @TexteObligatoire('motifRefus', 500)
  motif!: string;
}
