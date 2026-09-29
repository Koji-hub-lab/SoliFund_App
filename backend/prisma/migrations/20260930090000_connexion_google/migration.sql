-- Connexion avec Google : identifiant Google du compte lié, et mot de passe facultatif
-- (un compte créé avec Google n'en a pas tant que l'utilisateur n'en définit pas un).
ALTER TABLE "slf_utilisateur" ALTER COLUMN "mot_de_passe" DROP NOT NULL;
ALTER TABLE "slf_utilisateur" ADD COLUMN "google_id" VARCHAR(255);
CREATE UNIQUE INDEX "slf_utilisateur_google_id_key" ON "slf_utilisateur"("google_id");
