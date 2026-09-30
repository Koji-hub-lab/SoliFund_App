-- Paiement par Notch Pay : notre référence (unique), la référence Notch Pay, le canal et la raison
-- d'un échec. Les colonnes de l'ancien prestataire (transaction_id, reference_externe) sont retirées.

ALTER TABLE "slf_paiement"
  ADD COLUMN "reference" VARCHAR(100),
  ADD COLUMN "reference_notchpay" VARCHAR(255),
  ADD COLUMN "canal" VARCHAR(50),
  ADD COLUMN "code_erreur" VARCHAR(100),
  ADD COLUMN "message_erreur" TEXT;

-- Paiements existants : l'ancien identifiant s'il existe (il était unique), sinon une référence
-- construite à partir de l'identifiant du paiement.
UPDATE "slf_paiement"
SET "reference" = COALESCE(LEFT("transaction_id", 100), 'SLF-ANCIEN-' || "id_paiement");

ALTER TABLE "slf_paiement" ALTER COLUMN "reference" SET NOT NULL;
CREATE UNIQUE INDEX "slf_paiement_reference_key" ON "slf_paiement"("reference");
CREATE INDEX "slf_paiement_reference_notchpay_idx" ON "slf_paiement"("reference_notchpay");

DROP INDEX IF EXISTS "slf_paiement_transaction_id_key";
ALTER TABLE "slf_paiement"
  DROP COLUMN "transaction_id",
  DROP COLUMN "reference_externe";
