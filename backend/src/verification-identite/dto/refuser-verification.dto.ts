import { TexteObligatoire } from '../../common/validation';

export class RefuserVerificationDto {
  // Transmis à l'utilisateur dans sa notification.
  @TexteObligatoire('motifRefus', 500)
  motif!: string;
}
