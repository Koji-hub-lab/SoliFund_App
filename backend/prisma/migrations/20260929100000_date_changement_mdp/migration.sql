-- Date du dernier changement de mot de passe : les jetons émis avant cette date sont refusés
-- (JwtStrategy). Vide pour les comptes existants, dont les jetons restent donc valides.
ALTER TABLE "slf_utilisateur" ADD COLUMN "date_changement_mdp" TIMESTAMP(3);

-- Les téléphones vides deviennent NULL : la colonne est unique, et le profil n'enregistre plus de chaîne vide.
UPDATE "slf_utilisateur" SET "telephone" = NULL WHERE "telephone" = '';
