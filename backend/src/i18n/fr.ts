// Textes français. Les clés de ce fichier définissent la liste des messages (type CleMessage) :
// en.ts doit fournir exactement les mêmes.
export const fr = {
  // Réponses par défaut du framework
  'commun.nonAuthentifie': 'Connexion requise. Reconnectez-vous.',
  'commun.interdit': "Vous n'avez pas les droits pour effectuer cette action.",
  'commun.tropDeRequetes':
    'Trop de tentatives. Patientez une minute avant de réessayer.',
  'commun.erreurInterne':
    'Une erreur interne est survenue. Veuillez réessayer plus tard.',
  'commun.fichierTropVolumineux':
    'Fichier trop volumineux : 5 Mo maximum par fichier.',

  // Erreurs de base de données (filtre d'erreurs)
  'base.doublonTelephone':
    'Ce numéro de téléphone est déjà utilisé par un autre compte.',
  'base.doublonEmail': 'Cette adresse email est déjà utilisée.',
  'base.doublonNom': 'Ce nom est déjà utilisé.',
  'base.doublon': 'Cet élément existe déjà.',
  'base.introuvable': "L'élément demandé est introuvable.",
  'base.lienInexistant':
    "Un élément lié (cagnotte, catégorie, utilisateur...) n'existe pas.",
  'base.valeurTropLongue': 'Une des valeurs envoyées est trop longue.',

  // Validation des données envoyées (DTO)
  'champs.nom': 'Le nom',
  'champs.prenom': 'Le prénom',
  'champs.prenoms': 'Les prénoms',
  'champs.titre': 'Le titre',
  'champs.description': 'La description',
  'champs.contenu': 'Le contenu',
  'champs.commentaire': 'Le commentaire',
  'champs.motif': 'Le motif',
  'champs.motifRefus': 'Le motif du refus',
  'champs.numeroPiece': 'Le numéro de la pièce',
  'champs.numeroRetrait': 'Le numéro de retrait',
  'champs.telephone': 'Le numéro de téléphone',
  'champs.message': 'Le message',
  'champs.icone': "L'icône",
  'champs.cagnotte': 'La cagnotte',
  'champs.categorie': 'La catégorie',
  'champs.objectif': "L'objectif",
  'champs.montantDon': 'Le montant du don',
  'champs.montantRetrait': 'Le montant du retrait',
  'validation.texte': '{champ} doit être un texte.',
  'validation.obligatoire': '{champ} est obligatoire.',
  'validation.longueurMax': '{champ} ne peut pas dépasser {max} caractères.',
  'validation.entier': '{champ} doit être un nombre entier.',
  'validation.invalide': '{champ} est invalide.',
  'validation.montantEntier':
    '{champ} doit être un nombre entier de francs CFA (pas de centimes).',
  'validation.montantMin': "{champ} doit être d'au moins {min} XAF.",
  'validation.montantTropEleve': '{champ} est trop élevé.',
  'validation.emailInvalide': "L'adresse email n'est pas valide.",
  'validation.emailTropLong':
    "L'adresse email ne peut pas dépasser 255 caractères.",
  'validation.motDePasseRequis': 'Saisissez votre mot de passe.',
  'validation.motDePasseActuelRequis': 'Saisissez votre mot de passe actuel.',
  'validation.motDePasseTexte': 'Le mot de passe doit être un texte.',
  'validation.motDePasseMin':
    'Le mot de passe doit contenir au moins 8 caractères.',
  'validation.motDePasseMax':
    'Le mot de passe ne peut pas dépasser 128 caractères.',
  'validation.numeroMobileMoney':
    '{champ} est invalide : saisissez 9 chiffres commençant par 6 (ex. 6XX XX XX XX).',
  'validation.code6Chiffres': 'Le code doit contenir 6 chiffres.',
  'validation.telephoneTropLong':
    'Le numéro de téléphone ne peut pas dépasser 20 caractères.',
  'validation.langue': 'La langue doit être « fr » ou « en ».',
  'validation.statutCagnotte': 'Le statut doit être SUSPENDUE ou ACTIVE.',
  'validation.motifSuspension':
    'Le motif est obligatoire pour suspendre une cagnotte.',
  'validation.typePiece':
    'Choisissez le type de pièce : CNI, récépissé de CNI ou passeport.',
  'validation.dateNaissanceFormat':
    'La date de naissance est invalide (format AAAA-MM-JJ).',
  'validation.dateExpirationFormat':
    "La date d'expiration est invalide (format AAAA-MM-JJ).",
  'validation.operateur': 'Choisissez MTN Mobile Money ou Orange Money.',
  'validation.dateDebut': 'La date de début est invalide.',
  'validation.dateFin': 'La date de fin est invalide.',
  'validation.devise': 'Seule la devise XAF est acceptée.',
  'validation.couleur': 'La couleur doit être un code du type #087F7A.',
  'validation.motifSignalement':
    'Choisissez un motif : arnaque, contenu inapproprié, fausses informations ou autre.',

  // Connexion, codes et session
  'auth.identifiantsInvalides': 'Identifiants invalides.',
  'auth.compteGoogle':
    'Ce compte utilise la connexion Google. Utilisez le bouton « Continuer avec Google », ou définissez un mot de passe avec « Mot de passe oublié ».',
  'auth.suspenduJusquAu': "Votre compte est suspendu jusqu'au {fin|date}.",
  'auth.suspendu': "Votre compte est suspendu. Contactez l'administrateur.",
  'auth.banni': 'Votre compte a été banni.',
  'auth.desactive': "Votre compte est désactivé. Contactez l'administrateur.",
  'auth.codeInvalide': 'Code invalide ou expiré.',
  'auth.tropDeTentatives': 'Trop de tentatives. Demandez un nouveau code.',
  'auth.emailNonVerifie':
    "Votre adresse email n'est pas encore vérifiée. Saisissez le code reçu par email pour créer une cagnotte ou demander un retrait.",
  'auth.sessionInvalide': 'Session invalide. Reconnectez-vous.',
  'auth.motDePasseModifie':
    'Votre mot de passe a été modifié. Reconnectez-vous.',
  'auth.codeEnvoye': 'Si ce compte existe, un code a été envoyé par email.',
  'auth.codeRenvoye':
    "Si ce compte existe et n'est pas encore vérifié, un nouveau code a été envoyé par email.",
  'auth.codeValide': 'Code valide.',
  'auth.motDePasseReinitialise': 'Mot de passe réinitialisé avec succès.',
  'auth.emailDejaVerifie': 'Votre adresse email est déjà vérifiée.',
  'auth.emailVerifie': 'Adresse email vérifiée.',

  // Utilisateurs
  'utilisateurs.emailDejaUtilise': 'Cet email est déjà utilisé.',
  'utilisateurs.introuvable': 'Utilisateur introuvable.',
  'utilisateurs.motDePasseActuelIncorrect':
    'Le mot de passe actuel est incorrect.',
  'utilisateurs.motDePasseIdentique':
    "Le nouveau mot de passe doit être différent de l'actuel.",
  'utilisateurs.motDePasseModifie': 'Mot de passe modifié.',
  'utilisateurs.motDePasseDefini': 'Mot de passe défini.',
  'utilisateurs.propreStatut':
    'Vous ne pouvez pas modifier votre propre statut.',
  'utilisateurs.statutAdmin':
    "Le statut d'un administrateur ne peut pas être modifié.",

  // Cagnottes
  'cagnottes.introuvable': 'Cagnotte introuvable.',
  'cagnottes.pasProprietaire':
    "Vous n'êtes pas le propriétaire de cette cagnotte.",
  'cagnottes.identiteRefusee':
    "Votre vérification d'identité a été refusée : soumettez-en une nouvelle avant de créer une cagnotte.",
  'cagnottes.identiteRequise':
    'Faites vérifier votre identité avant de créer une cagnotte.',
  'cagnottes.approbationImpossible':
    'Seule une cagnotte en vérification peut être approuvée.',
  'cagnottes.identiteNonValidee':
    "L'identité de l'organisateur n'est pas validée : la cagnotte ne peut pas être publiée.",
  'cagnottes.dateFinDepassee':
    "La date de fin de cette cagnotte est dépassée : l'organisateur doit la modifier avant publication.",
  'cagnottes.statutChange':
    'Le statut de la cagnotte vient de changer. Rechargez la page.',
  'cagnottes.statutChangeReessayer':
    'Le statut de la cagnotte vient de changer. Rechargez la page puis réessayez.',
  'cagnottes.refusImpossible':
    'Seule une cagnotte en vérification peut être refusée.',
  'cagnottes.datesInvalides': 'Dates invalides.',
  'cagnottes.dateFinAvantDebut':
    'La date de fin doit être après la date de début.',
  'cagnottes.dateFinPassee': 'La date de fin ne peut pas être dans le passé.',
  'cagnottes.suspendueNonModifiable':
    'Cette cagnotte est suspendue par la modération : elle ne peut pas être modifiée.',
  'cagnottes.annuleeNonModifiable':
    'Cette cagnotte est annulée : elle ne peut plus être modifiée.',
  'cagnottes.objectifInferieur':
    "L'objectif ne peut pas être inférieur au montant déjà collecté ({collecte} {devise}).",
  'cagnottes.dejaAnnulee': 'Cette cagnotte est déjà annulée.',
  'cagnottes.annuleeAuLieuDeSupprimee':
    "Cette cagnotte a déjà reçu des dons : elle a été annulée au lieu d'être supprimée.",
  'cagnottes.supprimee': 'Cagnotte supprimée.',
  'cagnottes.suspensionImpossible':
    'Seule une cagnotte active peut être suspendue.',
  'cagnottes.reactivationImpossible':
    'Seule une cagnotte suspendue peut être réactivée.',

  // Images et fichiers
  'images.aucunFichier': 'Aucun fichier envoyé (champ « image » attendu).',
  'images.formatRefuse': 'Seules les images JPG, PNG ou WEBP sont acceptées.',
  'images.illisible':
    "L'image n'a pas pu être lue. Vérifiez le fichier ou choisissez-en un autre.",
  'fichiers.recto': 'Recto',
  'fichiers.verso': 'Verso',
  'fichiers.selfie': 'Selfie',
  'fichiers.manquant': '{fichier} : fichier manquant.',
  'fichiers.formatRefuse':
    '{fichier} : seules les images JPG, PNG ou WEBP sont acceptées.',

  // Actualités et commentaires
  'actualites.cagnotteFermee':
    'Impossible de publier une actualité sur une cagnotte suspendue ou annulée.',
  'commentaires.fermes':
    'Les commentaires sont fermés sur une cagnotte suspendue ou annulée.',
  'commentaires.introuvable': 'Commentaire introuvable.',
  'commentaires.suppressionInterdite':
    'Vous ne pouvez pas supprimer ce commentaire.',
  'commentaires.supprime': 'Commentaire supprimé.',

  // Dons
  'dons.horsLigne':
    "Cette cagnotte n'est pas en ligne : elle ne peut pas recevoir de dons pour le moment.",
  'dons.plusDeDons': "Cette cagnotte n'accepte plus de dons.",
  'dons.cagnotteTerminee':
    'Cette cagnotte est terminée : la date de fin est dépassée.',
  'dons.tropDeTentatives':
    'Vous avez fait trop de tentatives de don en peu de temps. Patientez quelques minutes avant de réessayer.',
  'paiement.MONTANT_INCOHERENT':
    'Le montant payé ne correspond pas à votre don. Notre équipe vérifie ce paiement : ne réessayez pas pour le moment.',
  'dons.introuvable': 'Don introuvable.',
  'dons.dejaValide': 'Ce don est déjà validé.',
  'dons.nonValidable': 'Ce don ne peut plus être validé (statut {statut}).',

  // Paiement Mobile Money (codes d'erreur de Notch Pay)
  'paiement.INVALID_PHONE':
    "Ce numéro de téléphone n'est pas valide. Vérifiez-le puis réessayez.",
  'paiement.UNREGISTERED_PHONE':
    "Ce numéro n'a pas de compte Mobile Money chez cet opérateur. Vérifiez le numéro et l'opérateur choisi.",
  'paiement.INSUFFICIENT_BALANCE':
    'Le solde de votre compte Mobile Money est insuffisant. Rechargez votre compte ou choisissez un montant plus petit, puis réessayez.',
  'paiement.TRANSACTION_LIMIT_EXCEEDED':
    'Ce paiement dépasse la limite autorisée par votre opérateur. Essayez un montant plus petit ou un autre compte.',
  'paiement.TIMEOUT':
    "Le paiement n'a pas été confirmé à temps. Réessayez, puis validez la demande qui s'affiche sur votre téléphone.",
  'paiement.PROVIDER_ERROR':
    "L'opérateur Mobile Money rencontre un problème. Veuillez réessayer dans quelques minutes.",
  'paiement.CANCELLED_BY_USER':
    'Vous avez annulé le paiement sur votre téléphone. Vous pouvez réessayer quand vous le souhaitez.',
  'paiement.DUPLICATE_TRANSACTION':
    'Un paiement identique est déjà en cours. Vérifiez votre téléphone avant de réessayer.',
  'paiement.LOW_BALANCE_OR_PAYEE_LIMIT_REACHED_OR_NOT_ALLOWED':
    'Le paiement a été refusé par MTN Mobile Money. Vérifiez que votre solde est suffisant et que votre compte est autorisé à payer chez un marchand, puis réessayez ou utilisez un autre numéro.',
  'paiement.numeroAutreOperateur': 'Ce numéro est un numéro {operateur}.',
  'paiement.SERVICE_INDISPONIBLE':
    "Le service de paiement ne répond pas pour le moment. Aucun montant n'a été prélevé. Réessayez dans quelques minutes.",
  'paiement.SERVICE_INCERTAIN':
    "Le service de paiement ne répond pas pour le moment. Si une demande de paiement s'affiche sur votre téléphone, ne la validez pas. Réessayez dans quelques minutes.",
  'paiement.ECHEC':
    "Le paiement n'a pas abouti. Aucun montant n'a été débité. Veuillez réessayer.",

  // Retraits
  'retraits.identiteEnAttente':
    "Votre vérification d'identité est en cours d'examen : les retraits seront possibles une fois qu'elle sera validée.",
  'retraits.identiteRequise':
    'Faites vérifier votre identité avant de demander un retrait.',
  'retraits.cagnotteFermee':
    'Impossible de demander un retrait sur une cagnotte suspendue ou annulée.',
  'retraits.disponibleInsuffisant':
    'Montant disponible insuffisant ({disponible} {devise}).',
  'retraits.soldeInsuffisantOperateur':
    'Le solde {operateur} du compte {fournisseur} est insuffisant : {net|nombre} XAF à verser. Soldes disponibles : MTN {mtn|nombre} XAF, Orange {orange|nombre} XAF. Rechargez le solde {operateur}, puis réessayez.',
  'retraits.precedentEnCours':
    'Le versement précédent est toujours en cours chez {fournisseur} : attendez son résultat avant de relancer.',
  'retraits.precedentReussi':
    "Le versement précédent a finalement abouti chez {fournisseur} : le retrait est marqué comme versé, rien n'a été renvoyé.",
  'retraits.precedentNonConfirme':
    "{fournisseur} ne confirme pas l'échec du versement précédent : rien n'a été renvoyé. Vérifiez-le dans son tableau de bord.",
  'retraits.versementEnCours':
    'Un versement est déjà en cours pour ce retrait. Attendez son résultat.',
  'retraits.soldeInsuffisant':
    'Le solde du compte {fournisseur} est insuffisant : {disponible|nombre} XAF disponibles pour {net|nombre} XAF à verser. Rechargez le compte {fournisseur}, puis réessayez.',
  'retraits.notchPayIndisponible':
    "{fournisseur} ne répond pas : le solde n'a pas pu être vérifié et aucun versement n'a été lancé. Réessayez dans quelques minutes.",
  'retraits.versementRefuse':
    "{fournisseur} a refusé le versement : {detail} Rien n'a été versé ; vous pouvez relancer le versement ou rejeter le retrait.",
  'retraits.versementIncertain':
    "{fournisseur} n'a pas répondu : le versement est peut-être parti. Vérifiez-le dans le tableau de bord {fournisseur} avant toute autre action sur ce retrait.",
  'retraits.horsPlateformeRequis':
    'Confirmez que le versement a été effectué hors plateforme.',
  'retraits.introuvable': 'Retrait introuvable.',
  'retraits.dejaTraite': 'Ce retrait a déjà été traité.',

  // Catégories
  'categories.utilisee':
    'Cette catégorie est utilisée par {nombre} cagnotte : elle ne peut pas être supprimée.',
  'categories.utiliseePluriel':
    'Cette catégorie est utilisée par {nombre} cagnottes : elle ne peut pas être supprimée.',
  'categories.introuvable': 'Catégorie introuvable.',
  'categories.supprimee': 'Catégorie supprimée.',

  // Signalements
  'signalements.propreCagnotte':
    'Vous ne pouvez pas signaler votre propre cagnotte.',
  'signalements.dejaSignalee': 'Vous avez déjà signalé cette cagnotte.',
  'signalements.introuvable': 'Signalement introuvable.',
  'signalements.dejaClasse': 'Ce signalement est déjà classé.',
  'signalements.transmis':
    'Merci : votre signalement a été transmis à notre équipe de modération.',
  'signalements.classes': 'Signalements classés.',

  // Vérification d'identité
  'identite.fichierInconnu': 'Fichier inconnu : recto, verso ou selfie.',
  'identite.dateNaissanceInvalide': 'La date de naissance est invalide.',
  'identite.ageMinimum':
    'Vous devez avoir au moins 18 ans pour faire vérifier votre identité.',
  'identite.expirationObligatoire':
    "La date d'expiration de la pièce est obligatoire.",
  'identite.pieceExpiree':
    "Cette pièce d'identité est expirée. Utilisez une pièce en cours de validité.",
  'identite.rectoObligatoire': 'La photo du recto de la pièce est obligatoire.',
  'identite.selfieObligatoire':
    'La photo de vous tenant la pièce (selfie) est obligatoire.',
  'identite.versoObligatoire': 'La photo du verso de la pièce est obligatoire.',
  'identite.introuvable': 'Vérification introuvable.',
  'identite.fichierAbsent': "Ce fichier n'existe pas ou a été supprimé.",
  'identite.validationImpossible':
    'Seule une vérification en attente peut être validée.',
  'identite.dejaRefusee': 'Cette vérification est déjà refusée.',
  'identite.dejaEnCours':
    "Une vérification d'identité est déjà en cours d'examen.",
  'identite.dejaVerifiee':
    "Votre identité est déjà vérifiée. Pour changer de numéro de retrait, contactez l'équipe SoliFund.",

  // Emails
  'emails.bonjour': 'Bonjour {prenom},',
  'emails.ignorer':
    "Si vous n'êtes pas à l'origine de cette demande, ignorez simplement cet email.",
  'emails.reinitialisation.sujet': 'Votre code de réinitialisation Solifund',
  'emails.reinitialisation.introduction':
    'Voici votre code pour réinitialiser votre mot de passe (valable 15 minutes) :',
  'emails.verification.sujet': 'Vérifiez votre adresse email Solifund',
  'emails.verification.introduction':
    'Voici votre code pour vérifier votre adresse email (valable 30 minutes) :',
  'emails.alertes.sujetUn': 'SoliFund : un élément à traiter',
  'emails.alertes.sujetPlusieurs': 'SoliFund : {nombre} éléments à traiter',
  'emails.alertes.titre': 'SoliFund — modération',
  'emails.alertes.bonjour': 'Bonjour,',
  'emails.alertes.introductionUn': 'Un élément demande votre attention :',
  'emails.alertes.introductionPlusieurs':
    'Plusieurs éléments demandent votre attention :',
  'emails.alertes.conclusion':
    "Connectez-vous à l'espace d'administration pour les traiter.",

  // Alertes de modération destinées aux administrateurs (emails ; les notifications sont
  // affichées par le frontend à partir du même code).
  'alertes.IDENTITE_A_VERIFIER.titre': 'Identité à vérifier',
  'alertes.IDENTITE_A_VERIFIER.message':
    "{prenoms} {nom} a soumis une vérification d'identité.",
  'alertes.CAGNOTTE_EN_VERIFICATION.titre': 'Cagnotte en vérification',
  'alertes.CAGNOTTE_EN_VERIFICATION.message':
    'La cagnotte « {titre} » attend une vérification ({raisons}).',
  'alertes.SUSPENSION_AUTOMATIQUE.titre': 'Suspension automatique',
  'alertes.SUSPENSION_AUTOMATIQUE.message':
    'La cagnotte « {titre} » a été suspendue automatiquement après {nombre} signalements.',
  'alertes.VERSEMENT_INCERTAIN.titre': 'Versement à vérifier',
  'alertes.VERSEMENT_INCERTAIN.message':
    "{fournisseur} n'a pas répondu au versement du retrait n° {retrait} ({montant|nombre} XAF) : il est peut-être parti. Vérifiez-le dans son tableau de bord avant toute action.",
  'alertes.VERSEMENT_INTROUVABLE.titre': 'Versement introuvable',
  'alertes.VERSEMENT_INTROUVABLE.message':
    '{fournisseur} ne trouve pas le versement du retrait n° {retrait} ({montant|nombre} XAF). Aucune action automatique : vérifiez-le dans son tableau de bord.',
  'raisons.OBJECTIF_ELEVE': 'objectif élevé',
  'raisons.ANTECEDENT_ORGANISATEUR':
    'organisateur ayant une cagnotte suspendue ou refusée',
  'raisons.IDENTITE_EN_ATTENTE':
    "identité de l'organisateur en cours de vérification",
  'raisons.REVISION_APRES_REFUS': 'cagnotte modifiée après un refus',

  // Page de partage (aperçu WhatsApp, Facebook...)
  'partage.titreGenerique': 'SoliFund — Cagnottes solidaires au Cameroun',
  'partage.descriptionGenerique':
    'Réalisez vos projets, soutenez vos proches : cagnottes solidaires, dons par MTN Mobile Money et Orange Money.',
  'partage.imageGenerique': 'SoliFund, cagnottes solidaires au Cameroun',
  'partage.soutenez':
    'Soutenez « {titre} » sur SoliFund, par MTN Mobile Money ou Orange Money.',
  'partage.continuer': 'Continuer vers SoliFund',
} as const;
