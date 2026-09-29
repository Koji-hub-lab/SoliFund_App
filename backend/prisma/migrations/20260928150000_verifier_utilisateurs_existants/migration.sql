-- La vérification de l'email devient obligatoire pour créer une cagnotte ou demander un retrait.
-- Les comptes créés avant cette fonctionnalité sont considérés comme vérifiés, pour ne pas les bloquer.
UPDATE "slf_utilisateur" SET "est_verifie" = true WHERE "est_verifie" = false;
