-- Retraits versés par Notch Pay : statut ECHOUE (versement échoué, relançable), références et
-- raison de l'échec, mode manuel de secours.
ALTER TYPE "StatutRetrait" ADD VALUE IF NOT EXISTS 'ECHOUE';

ALTER TABLE "slf_retrait"
  ADD COLUMN "reference_notchpay" VARCHAR(255),
  ADD COLUMN "tentatives_versement" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "code_erreur" VARCHAR(100),
  ADD COLUMN "message_erreur" TEXT,
  ADD COLUMN "hors_plateforme" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "traite_par" INTEGER;

CREATE INDEX "slf_retrait_reference_notchpay_idx" ON "slf_retrait"("reference_notchpay");
