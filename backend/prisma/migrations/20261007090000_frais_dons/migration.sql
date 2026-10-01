-- Frais de transaction payés par le donateur : montant du don, frais et total payé.
ALTER TABLE "slf_don"
  ADD COLUMN "montant_don" DECIMAL(15,2),
  ADD COLUMN "montant_frais" DECIMAL(15,2) NOT NULL DEFAULT 0,
  ADD COLUMN "montant_total" DECIMAL(15,2);

-- Dons existants : aucun frais, le don et le total sont le montant du paiement.
UPDATE "slf_don" d
SET "montant_don" = p."montant", "montant_total" = p."montant"
FROM "slf_paiement" p
WHERE p."id_paiement" = d."id_paiement";

ALTER TABLE "slf_don"
  ALTER COLUMN "montant_don" SET NOT NULL,
  ALTER COLUMN "montant_total" SET NOT NULL;
