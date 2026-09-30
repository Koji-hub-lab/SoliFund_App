-- Commission SoliFund sur les retraits.
-- « montant » devient « montant_brut » (montant demandé) ; taux, commission et net sont figés à
-- la demande. Les retraits existants ont été demandés sans commission : taux 0, net = brut.
ALTER TABLE "slf_retrait" RENAME COLUMN "montant" TO "montant_brut";
ALTER TABLE "slf_retrait" ADD COLUMN "taux_commission" DECIMAL(5,2) NOT NULL DEFAULT 0;
ALTER TABLE "slf_retrait" ADD COLUMN "montant_commission" DECIMAL(15,2) NOT NULL DEFAULT 0;
ALTER TABLE "slf_retrait" ADD COLUMN "montant_net" DECIMAL(15,2);
UPDATE "slf_retrait" SET "montant_net" = "montant_brut";
ALTER TABLE "slf_retrait" ALTER COLUMN "montant_net" SET NOT NULL;
ALTER TABLE "slf_retrait" ALTER COLUMN "taux_commission" DROP DEFAULT;
ALTER TABLE "slf_retrait" ALTER COLUMN "montant_commission" DROP DEFAULT;

-- Registre des commissions : une ligne par retrait traité.
CREATE TABLE "slf_commission" (
    "id_commission" SERIAL NOT NULL,
    "montant" DECIMAL(15,2) NOT NULL,
    "taux" DECIMAL(5,2) NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "id_retrait" INTEGER NOT NULL,
    "id_cagnotte" INTEGER NOT NULL,

    CONSTRAINT "slf_commission_pkey" PRIMARY KEY ("id_commission")
);
CREATE UNIQUE INDEX "slf_commission_id_retrait_key" ON "slf_commission"("id_retrait");
CREATE INDEX "slf_commission_date_idx" ON "slf_commission"("date");
CREATE INDEX "slf_commission_id_cagnotte_idx" ON "slf_commission"("id_cagnotte");
ALTER TABLE "slf_commission" ADD CONSTRAINT "slf_commission_id_retrait_fkey" FOREIGN KEY ("id_retrait") REFERENCES "slf_retrait"("id_retrait") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "slf_commission" ADD CONSTRAINT "slf_commission_id_cagnotte_fkey" FOREIGN KEY ("id_cagnotte") REFERENCES "slf_cagnotte"("id_cagnotte") ON DELETE RESTRICT ON UPDATE CASCADE;
