import type { fr } from './fr';

// Textes anglais : mêmes clés que fr.ts (vérifié à la compilation).
export const en: Record<keyof typeof fr, string> = {
  'commun.nonAuthentifie': 'Please log in to continue.',
  'commun.interdit': "You don't have permission to do this.",
  'commun.tropDeRequetes':
    'Too many attempts. Please wait a minute before trying again.',
  'commun.erreurInterne':
    'Something went wrong on our side. Please try again later.',
  'commun.fichierTropVolumineux': 'File too large: 5 MB maximum per file.',

  'base.doublonTelephone':
    'This phone number is already used by another account.',
  'base.doublonEmail': 'This email address is already in use.',
  'base.doublonNom': 'This name is already in use.',
  'base.doublon': 'This item already exists.',
  'base.introuvable': "We couldn't find what you asked for.",
  'base.lienInexistant':
    "A linked item (fundraiser, category, user...) doesn't exist.",
  'base.valeurTropLongue': 'One of the values sent is too long.',

  'champs.nom': 'The last name',
  'champs.prenom': 'The first name',
  'champs.prenoms': 'The first names field',
  'champs.titre': 'The title',
  'champs.description': 'The description',
  'champs.contenu': 'The content',
  'champs.commentaire': 'The comment',
  'champs.motif': 'The reason',
  'champs.motifRefus': 'The reason for declining',
  'champs.numeroPiece': 'The document number',
  'champs.numeroRetrait': 'The withdrawal number',
  'champs.telephone': 'The phone number',
  'champs.message': 'The message',
  'champs.icone': 'The icon',
  'champs.cagnotte': 'The fundraiser',
  'champs.categorie': 'The category',
  'champs.objectif': 'The goal',
  'champs.montantDon': 'The gift amount',
  'champs.montantRetrait': 'The withdrawal amount',
  'validation.texte': '{champ} must be text.',
  'validation.obligatoire': '{champ} is required.',
  'validation.longueurMax': "{champ} can't be longer than {max} characters.",
  'validation.entier': '{champ} must be a whole number.',
  'validation.invalide': '{champ} is invalid.',
  'validation.montantEntier':
    '{champ} must be a whole number of CFA francs (no decimals).',
  'validation.montantMin': '{champ} must be at least {min} XAF.',
  'validation.montantTropEleve': '{champ} is too high.',
  'validation.emailInvalide': "This email address isn't valid.",
  'validation.emailTropLong':
    "The email address can't be longer than 255 characters.",
  'validation.motDePasseRequis': 'Please enter your password.',
  'validation.motDePasseActuelRequis': 'Please enter your current password.',
  'validation.motDePasseTexte': 'The password must be text.',
  'validation.motDePasseMin': 'The password must be at least 8 characters.',
  'validation.motDePasseMax':
    "The password can't be longer than 128 characters.",
  'validation.numeroMobileMoney':
    '{champ} is invalid: enter 9 digits starting with 6 (e.g. 6XX XX XX XX).',
  'validation.code6Chiffres': 'The code must be 6 digits.',
  'validation.telephoneTropLong':
    "The phone number can't be longer than 20 characters.",
  'validation.langue': 'The language must be “fr” or “en”.',
  'validation.statutCagnotte': 'The status must be SUSPENDUE or ACTIVE.',
  'validation.motifSuspension': 'A reason is required to suspend a fundraiser.',
  'validation.typePiece':
    'Choose the type of document: national ID card, ID card receipt or passport.',
  'validation.dateNaissanceFormat':
    'The date of birth is invalid (format YYYY-MM-DD).',
  'validation.dateExpirationFormat':
    'The expiry date is invalid (format YYYY-MM-DD).',
  'validation.operateur': 'Choose MTN Mobile Money or Orange Money.',
  'validation.dateDebut': 'The start date is invalid.',
  'validation.dateFin': 'The end date is invalid.',
  'validation.devise': 'Only the XAF currency is accepted.',
  'validation.couleur': 'The colour must be a code such as #087F7A.',
  'validation.motifSignalement':
    'Choose a reason: scam, inappropriate content, false information or other.',

  'auth.identifiantsInvalides': 'Incorrect email or password.',
  'auth.compteGoogle':
    'This account uses Google login. Use the “Continue with Google” button, or set a password with “Forgot your password?”.',
  'auth.suspenduJusquAu': 'Your account is suspended until {fin|date}.',
  'auth.suspendu':
    'Your account is suspended. Please contact the administrator.',
  'auth.banni': 'Your account has been banned.',
  'auth.desactive':
    'Your account is deactivated. Please contact the administrator.',
  'auth.codeInvalide': 'Invalid or expired code.',
  'auth.tropDeTentatives': 'Too many attempts. Please request a new code.',
  'auth.emailNonVerifie':
    "Your email address isn't verified yet. Enter the code we emailed you to start a fundraiser or request a withdrawal.",
  'auth.sessionInvalide':
    'Your session is no longer valid. Please log in again.',
  'auth.motDePasseModifie':
    'Your password has been changed. Please log in again.',
  'auth.codeEnvoye': 'If this account exists, a code has been sent by email.',
  'auth.codeRenvoye':
    "If this account exists and isn't verified yet, a new code has been sent by email.",
  'auth.codeValide': 'Code accepted.',
  'auth.motDePasseReinitialise': 'Your password has been reset.',
  'auth.emailDejaVerifie': 'Your email address is already verified.',
  'auth.emailVerifie': 'Email address verified.',

  'utilisateurs.emailDejaUtilise': 'This email is already in use.',
  'utilisateurs.introuvable': 'User not found.',
  'utilisateurs.motDePasseActuelIncorrect':
    'The current password is incorrect.',
  'utilisateurs.motDePasseIdentique':
    'The new password must be different from the current one.',
  'utilisateurs.motDePasseModifie': 'Password changed.',
  'utilisateurs.motDePasseDefini': 'Password set.',
  'utilisateurs.propreStatut': "You can't change your own status.",
  'utilisateurs.statutAdmin': "An administrator's status can't be changed.",

  'cagnottes.introuvable': 'Fundraiser not found.',
  'cagnottes.pasProprietaire': "You aren't the owner of this fundraiser.",
  'cagnottes.identiteRefusee':
    'Your identity check was declined: please submit a new one before starting a fundraiser.',
  'cagnottes.identiteRequise':
    'Please verify your identity before starting a fundraiser.',
  'cagnottes.approbationImpossible':
    'Only a fundraiser under review can be approved.',
  'cagnottes.identiteNonValidee':
    "The organiser's identity isn't verified: the fundraiser can't be published.",
  'cagnottes.dateFinDepassee':
    "This fundraiser's end date has passed: the organiser must edit it before it can be published.",
  'cagnottes.statutChange':
    "The fundraiser's status has just changed. Please reload the page.",
  'cagnottes.statutChangeReessayer':
    "The fundraiser's status has just changed. Please reload the page and try again.",
  'cagnottes.refusImpossible':
    'Only a fundraiser under review can be declined.',
  'cagnottes.datesInvalides': 'Invalid dates.',
  'cagnottes.dateFinAvantDebut': 'The end date must be after the start date.',
  'cagnottes.dateFinPassee': "The end date can't be in the past.",
  'cagnottes.suspendueNonModifiable':
    "This fundraiser has been suspended by our moderators: it can't be edited.",
  'cagnottes.annuleeNonModifiable':
    'This fundraiser is cancelled: it can no longer be edited.',
  'cagnottes.objectifInferieur':
    "The goal can't be lower than the amount already raised ({collecte} {devise}).",
  'cagnottes.dejaAnnulee': 'This fundraiser is already cancelled.',
  'cagnottes.annuleeAuLieuDeSupprimee':
    'This fundraiser has already received gifts: it was cancelled instead of deleted.',
  'cagnottes.supprimee': 'Fundraiser deleted.',
  'cagnottes.suspensionImpossible':
    'Only an active fundraiser can be suspended.',
  'cagnottes.reactivationImpossible':
    'Only a suspended fundraiser can be reinstated.',

  'images.aucunFichier': 'No file was sent (an “image” field is expected).',
  'images.formatRefuse': 'Only JPG, PNG or WEBP images are accepted.',
  'images.illisible':
    "We couldn't read this image. Check the file or choose another one.",
  'fichiers.recto': 'Front',
  'fichiers.verso': 'Back',
  'fichiers.selfie': 'Selfie',
  'fichiers.manquant': '{fichier}: file missing.',
  'fichiers.formatRefuse':
    '{fichier}: only JPG, PNG or WEBP images are accepted.',

  'actualites.cagnotteFermee':
    "You can't post an update on a suspended or cancelled fundraiser.",
  'commentaires.fermes':
    'Comments are closed on a suspended or cancelled fundraiser.',
  'commentaires.introuvable': 'Comment not found.',
  'commentaires.suppressionInterdite': "You can't delete this comment.",
  'commentaires.supprime': 'Comment deleted.',

  'dons.horsLigne':
    "This fundraiser isn't live: it can't receive gifts for now.",
  'dons.plusDeDons': 'This fundraiser is no longer accepting gifts.',
  'dons.cagnotteTerminee':
    'This fundraiser has ended: its end date has passed.',
  'dons.tropDeTentatives':
    "You've made too many gift attempts in a short time. Please wait a few minutes before trying again.",
  'paiement.MONTANT_INCOHERENT':
    "The amount paid doesn't match your gift. Our team is checking this payment: please don't try again for now.",
  'dons.introuvable': 'Gift not found.',
  'dons.dejaValide': 'This gift is already confirmed.',
  'dons.nonValidable':
    'This gift can no longer be confirmed (status {statut}).',

  'paiement.INVALID_PHONE':
    "This phone number isn't valid. Please check it and try again.",
  'paiement.UNREGISTERED_PHONE':
    "This number doesn't have a Mobile Money account with this operator. Please check the number and the operator you chose.",
  'paiement.INSUFFICIENT_BALANCE':
    'Your Mobile Money balance is too low. Top up your account or choose a smaller amount, then try again.',
  'paiement.TRANSACTION_LIMIT_EXCEEDED':
    'This payment is over the limit set by your operator. Try a smaller amount or another account.',
  'paiement.TIMEOUT':
    "The payment wasn't confirmed in time. Try again, then approve the request that appears on your phone.",
  'paiement.PROVIDER_ERROR':
    'The Mobile Money operator is having a problem. Please try again in a few minutes.',
  'paiement.CANCELLED_BY_USER':
    'You cancelled the payment on your phone. You can try again whenever you like.',
  'paiement.DUPLICATE_TRANSACTION':
    'An identical payment is already in progress. Please check your phone before trying again.',
  'paiement.ECHEC':
    "The payment didn't go through. No money was taken. Please try again.",

  'retraits.identiteEnAttente':
    "Your identity check is being reviewed: you'll be able to withdraw once it's approved.",
  'retraits.identiteRequise':
    'Please verify your identity before requesting a withdrawal.',
  'retraits.cagnotteFermee':
    "You can't request a withdrawal from a suspended or cancelled fundraiser.",
  'retraits.disponibleInsuffisant':
    'Not enough available funds ({disponible} {devise}).',
  'retraits.introuvable': 'Withdrawal not found.',
  'retraits.dejaTraite': 'This withdrawal has already been processed.',

  'categories.utilisee':
    "This category is used by {nombre} fundraiser: it can't be deleted.",
  'categories.utiliseePluriel':
    "This category is used by {nombre} fundraisers: it can't be deleted.",
  'categories.introuvable': 'Category not found.',
  'categories.supprimee': 'Category deleted.',

  'signalements.propreCagnotte': "You can't report your own fundraiser.",
  'signalements.dejaSignalee': "You've already reported this fundraiser.",
  'signalements.introuvable': 'Report not found.',
  'signalements.dejaClasse': 'This report is already closed.',
  'signalements.transmis':
    'Thank you: your report has been sent to our moderation team.',
  'signalements.classes': 'Reports closed.',

  'identite.fichierInconnu': 'Unknown file: recto, verso or selfie.',
  'identite.dateNaissanceInvalide': 'The date of birth is invalid.',
  'identite.ageMinimum':
    'You must be at least 18 to have your identity verified.',
  'identite.expirationObligatoire': "The document's expiry date is required.",
  'identite.pieceExpiree':
    'This identity document has expired. Please use a valid one.',
  'identite.rectoObligatoire':
    'A photo of the front of the document is required.',
  'identite.selfieObligatoire':
    'A photo of you holding the document (selfie) is required.',
  'identite.versoObligatoire':
    'A photo of the back of the document is required.',
  'identite.introuvable': 'Identity check not found.',
  'identite.fichierAbsent': "This file doesn't exist or has been deleted.",
  'identite.validationImpossible': 'Only a pending check can be approved.',
  'identite.dejaRefusee': 'This check has already been declined.',
  'identite.dejaEnCours': 'An identity check is already being reviewed.',
  'identite.dejaVerifiee':
    'Your identity is already verified. To change your withdrawal number, please contact the SoliFund team.',

  'emails.bonjour': 'Hello {prenom},',
  'emails.ignorer':
    "If you didn't ask for this, you can simply ignore this email.",
  'emails.reinitialisation.sujet': 'Your SoliFund password reset code',
  'emails.reinitialisation.introduction':
    'Here is your code to reset your password (valid for 15 minutes):',
  'emails.verification.sujet': 'Verify your SoliFund email address',
  'emails.verification.introduction':
    'Here is your code to verify your email address (valid for 30 minutes):',
  'emails.alertes.sujetUn': 'SoliFund: one item to review',
  'emails.alertes.sujetPlusieurs': 'SoliFund: {nombre} items to review',
  'emails.alertes.titre': 'SoliFund — moderation',
  'emails.alertes.bonjour': 'Hello,',
  'emails.alertes.introductionUn': 'One item needs your attention:',
  'emails.alertes.introductionPlusieurs': 'Several items need your attention:',
  'emails.alertes.conclusion': 'Log in to the admin area to review them.',

  'alertes.IDENTITE_A_VERIFIER.titre': 'Identity to verify',
  'alertes.IDENTITE_A_VERIFIER.message':
    '{prenoms} {nom} has submitted an identity check.',
  'alertes.CAGNOTTE_EN_VERIFICATION.titre': 'Fundraiser under review',
  'alertes.CAGNOTTE_EN_VERIFICATION.message':
    'The fundraiser “{titre}” is waiting for review ({raisons}).',
  'alertes.SUSPENSION_AUTOMATIQUE.titre': 'Automatic suspension',
  'alertes.SUSPENSION_AUTOMATIQUE.message':
    'The fundraiser “{titre}” was automatically suspended after {nombre} reports.',
  'raisons.OBJECTIF_ELEVE': 'high goal',
  'raisons.ANTECEDENT_ORGANISATEUR':
    'organiser with a suspended or declined fundraiser',
  'raisons.IDENTITE_EN_ATTENTE': "organiser's identity being verified",
  'raisons.REVISION_APRES_REFUS': 'fundraiser edited after being declined',

  'partage.titreGenerique': 'SoliFund — Fundraising for Cameroon',
  'partage.descriptionGenerique':
    'Make your plans happen, stand by the people you love: fundraisers with gifts by MTN Mobile Money and Orange Money.',
  'partage.imageGenerique': 'SoliFund, fundraising for Cameroon',
  'partage.soutenez':
    'Support “{titre}” on SoliFund, by MTN Mobile Money or Orange Money.',
  'partage.continuer': 'Continue to SoliFund',
};
