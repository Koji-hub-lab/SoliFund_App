-- Les codes sont désormais stockés hachés (sha256) : deux utilisateurs peuvent recevoir le même code,
-- donc le hash ne peut plus être unique. La recherche se fait par utilisateur + type.
DROP INDEX "slf_jeton_code_key";

-- Compteur d'essais ratés (le jeton est invalidé après 5 échecs).
ALTER TABLE "slf_jeton" ADD COLUMN "tentatives" INTEGER NOT NULL DEFAULT 0;

-- Les anciens codes sont en clair et ne correspondront plus au nouveau format : on les invalide.
UPDATE "slf_jeton" SET "est_utilise" = true WHERE "est_utilise" = false;

CREATE INDEX "slf_jeton_id_utilisateur_type_est_utilise_idx" ON "slf_jeton"("id_utilisateur", "type", "est_utilise");
