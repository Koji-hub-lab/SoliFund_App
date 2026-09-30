-- Retour au schéma de paiement d'origine : annule la migration précédente (colonnes du
-- prestataire abandonné). Toutes ces colonnes étaient vides.
DROP INDEX "slf_paiement_partner_reference_key";
DROP INDEX "slf_paiement_cle_idempotence_key";
ALTER TABLE "slf_paiement" DROP COLUMN "cle_idempotence";
ALTER TABLE "slf_paiement" DROP COLUMN "operateur";
ALTER TABLE "slf_paiement" DROP COLUMN "operator_reference";
ALTER TABLE "slf_paiement" DROP COLUMN "error_type";
ALTER TABLE "slf_paiement" DROP COLUMN "error_code";
ALTER TABLE "slf_paiement" RENAME COLUMN "partner_reference" TO "reference_externe";
ALTER TABLE "slf_paiement" ALTER COLUMN "reference_externe" SET DATA TYPE VARCHAR(255);
