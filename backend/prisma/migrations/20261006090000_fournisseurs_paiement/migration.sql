-- Plusieurs fournisseurs de paiement (Notch Pay, AangaraaPay) : la référence chez le fournisseur
-- devient générique (renommage, les données sont conservées), et chaque paiement ou versement
-- garde le fournisseur utilisé. Paiement : statut et raison renvoyés par l'opérateur.
CREATE TYPE "FournisseurPaiement" AS ENUM ('NOTCHPAY', 'AANGARAA');

ALTER TABLE "slf_paiement" RENAME COLUMN "reference_notchpay" TO "reference_fournisseur";
ALTER INDEX "slf_paiement_reference_notchpay_idx" RENAME TO "slf_paiement_reference_fournisseur_idx";
ALTER TABLE "slf_paiement"
  ADD COLUMN "fournisseur" "FournisseurPaiement",
  ADD COLUMN "statut_operateur" VARCHAR(50),
  ADD COLUMN "raison_operateur" TEXT;
-- Les paiements déjà envoyés à un fournisseur l'ont tous été à Notch Pay.
UPDATE "slf_paiement" SET "fournisseur" = 'NOTCHPAY' WHERE "reference_fournisseur" IS NOT NULL;

ALTER TABLE "slf_retrait" RENAME COLUMN "reference_notchpay" TO "reference_fournisseur";
ALTER INDEX "slf_retrait_reference_notchpay_idx" RENAME TO "slf_retrait_reference_fournisseur_idx";
ALTER TABLE "slf_retrait" ADD COLUMN "fournisseur" "FournisseurPaiement";
UPDATE "slf_retrait" SET "fournisseur" = 'NOTCHPAY' WHERE "reference_fournisseur" IS NOT NULL;
