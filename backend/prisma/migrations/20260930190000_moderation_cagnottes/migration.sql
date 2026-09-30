-- Publication des cagnottes avec modération : statuts EN_VERIFICATION et REFUSEE, raisons de la
-- mise en vérification, motif de refus, et signalements.
-- CreateEnum
CREATE TYPE "MotifSignalement" AS ENUM ('ARNAQUE', 'CONTENU_INAPPROPRIE', 'FAUSSES_INFORMATIONS', 'AUTRE');

-- CreateEnum
CREATE TYPE "StatutSignalement" AS ENUM ('OUVERT', 'CLASSE');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "StatutCagnotte" ADD VALUE 'EN_VERIFICATION';
ALTER TYPE "StatutCagnotte" ADD VALUE 'REFUSEE';

-- AlterTable
ALTER TABLE "slf_cagnotte" ADD COLUMN     "motif_refus" TEXT,
ADD COLUMN     "raisons_verification" TEXT[];

-- CreateTable
CREATE TABLE "slf_signalement" (
    "id_signalement" SERIAL NOT NULL,
    "motif" "MotifSignalement" NOT NULL,
    "commentaire" TEXT,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "statut" "StatutSignalement" NOT NULL DEFAULT 'OUVERT',
    "date_classement" TIMESTAMP(3),
    "id_cagnotte" INTEGER NOT NULL,
    "id_utilisateur" INTEGER,
    "empreinte_ip" VARCHAR(64),
    "id_admin" INTEGER,

    CONSTRAINT "slf_signalement_pkey" PRIMARY KEY ("id_signalement")
);

-- CreateIndex
CREATE INDEX "slf_signalement_statut_idx" ON "slf_signalement"("statut");

-- CreateIndex
CREATE UNIQUE INDEX "slf_signalement_id_cagnotte_id_utilisateur_key" ON "slf_signalement"("id_cagnotte", "id_utilisateur");

-- CreateIndex
CREATE UNIQUE INDEX "slf_signalement_id_cagnotte_empreinte_ip_key" ON "slf_signalement"("id_cagnotte", "empreinte_ip");

-- AddForeignKey
ALTER TABLE "slf_signalement" ADD CONSTRAINT "slf_signalement_id_cagnotte_fkey" FOREIGN KEY ("id_cagnotte") REFERENCES "slf_cagnotte"("id_cagnotte") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "slf_signalement" ADD CONSTRAINT "slf_signalement_id_utilisateur_fkey" FOREIGN KEY ("id_utilisateur") REFERENCES "slf_utilisateur"("id_utilisateur") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "slf_signalement" ADD CONSTRAINT "slf_signalement_id_admin_fkey" FOREIGN KEY ("id_admin") REFERENCES "slf_utilisateur"("id_utilisateur") ON DELETE SET NULL ON UPDATE CASCADE;

