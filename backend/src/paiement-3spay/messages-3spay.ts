// Messages affichés au donateur selon l'error_type renvoyé par 3SPAY.
const MESSAGES: Record<string, string> = {
  INSUFFICIENT_BALANCE:
    'Le solde de votre compte Mobile Money est insuffisant. Rechargez votre compte, puis réessayez.',
  DAILY_LIMIT_REACHED:
    'Vous avez atteint le plafond de paiement de votre compte Mobile Money. Réessayez plus tard ou avec un montant plus faible.',
  ACCOUNT_BLOCKED:
    'Votre compte Mobile Money est bloqué ou suspendu. Contactez votre opérateur, puis réessayez.',
  INVALID_PIN:
    'Le code secret saisi est incorrect. Réessayez en saisissant votre code Mobile Money.',
  OPERATOR_TIMEOUT:
    "Votre opérateur n'a pas répondu à temps. Réessayez dans quelques instants.",
  NETWORK_ERROR:
    'Une erreur de réseau a interrompu le paiement. Réessayez dans quelques instants.',
  USER_REJECTED: 'Le paiement a été refusé ou annulé sur votre téléphone.',
  INVALID_PHONE:
    "Ce numéro n'est pas valide ou n'est pas actif chez l'opérateur. Vérifiez le numéro saisi.",
  OPERATOR_REJECTED:
    'Votre opérateur a refusé le paiement. Contactez-le pour en connaître le motif.',
};

const MESSAGE_PAR_DEFAUT =
  "Le paiement n'a pas abouti. Réessayez ou utilisez un autre numéro.";

// Message lisible pour un error_type (OTHER, absent ou inconnu : message général).
export function messageErreur3SPay(
  errorType: string | null | undefined,
): string {
  return (errorType && MESSAGES[errorType]) || MESSAGE_PAR_DEFAUT;
}
