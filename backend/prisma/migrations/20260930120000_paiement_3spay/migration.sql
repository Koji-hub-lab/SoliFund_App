-- Remplacement d'AangaraaPay par 3SPAY.
-- reference_externe devient partner_reference (référence SoliFund envoyée à 3SPAY), désormais
-- unique ; toutes les valeurs existantes sont vides, aucun conflit possible.
ALTER TABLE "slf_paiement" RENAME COLUMN "reference_externe" TO "partner_reference";
ALTER TABLE "slf_paiement" ALTER COLUMN "partner_reference" SET DATA TYPE VARCHAR(100);
CREATE UNIQUE INDEX "slf_paiement_partner_reference_key" ON "slf_paiement"("partner_reference");

-- Clé d'idempotence (UUID) envoyée à 3SPAY, conservée pour rejouer la même clé.
ALTER TABLE "slf_paiement" ADD COLUMN "cle_idempotence" VARCHAR(36);
CREATE UNIQUE INDEX "slf_paiement_cle_idempotence_key" ON "slf_paiement"("cle_idempotence");

-- Opérateur 3SPAY, référence opérateur, et erreur renvoyée en cas d'échec.
ALTER TABLE "slf_paiement" ADD COLUMN "operateur" VARCHAR(30);
ALTER TABLE "slf_paiement" ADD COLUMN "operator_reference" VARCHAR(255);
ALTER TABLE "slf_paiement" ADD COLUMN "error_type" VARCHAR(40);
ALTER TABLE "slf_paiement" ADD COLUMN "error_code" VARCHAR(100);
