import { Transform } from 'class-transformer';
import { IsIn, IsOptional, Matches } from 'class-validator';
import { NumeroMobileMoney, TexteObligatoire } from '../../common/validation';
import { m } from '../../i18n/messages';

const FORMAT_DATE = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

// Champs texte de POST /verification-identite (multipart : les fichiers recto, verso et selfie
// sont reçus à part). Les règles métier (âge, expiration, pièces exigées) sont dans le service.
export class SoumettreVerificationDto {
  @IsIn(['CNI', 'RECEPISSE_CNI', 'PASSEPORT'], {
    message: m('validation.typePiece'),
  })
  type_piece!: 'CNI' | 'RECEPISSE_CNI' | 'PASSEPORT';

  @TexteObligatoire('nom', 100)
  nom!: string;

  @TexteObligatoire('prenoms', 150)
  prenoms!: string;

  @Matches(FORMAT_DATE, {
    message: m('validation.dateNaissanceFormat'),
  })
  date_naissance!: string;

  @TexteObligatoire('numeroPiece', 50)
  numero_piece!: string;

  // Facultative pour le récépissé de CNI uniquement (contrôlé dans le service). Vide = absente.
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    value === '' ? undefined : value,
  )
  @Matches(FORMAT_DATE, {
    message: m('validation.dateExpirationFormat'),
  })
  date_expiration?: string;

  @NumeroMobileMoney('numeroRetrait')
  telephone_retrait!: string;

  @IsIn(['MTN_MOBILE_MONEY', 'ORANGE_MONEY'], {
    message: m('validation.operateur'),
  })
  methode_retrait!: 'MTN_MOBILE_MONEY' | 'ORANGE_MONEY';
}
