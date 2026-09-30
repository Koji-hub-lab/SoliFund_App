-- Vérification d'identité des organisateurs : soumissions (historique conservé) et journal des
-- consultations de fichiers et des décisions.
-- CreateEnum
CREATE TYPE "TypePieceIdentite" AS ENUM ('CNI', 'RECEPISSE_CNI', 'PASSEPORT');

-- CreateEnum
CREATE TYPE "StatutVerificationIdentite" AS ENUM ('EN_ATTENTE', 'VALIDEE', 'REFUSEE');

-- CreateEnum
CREATE TYPE "ActionJournalIdentite" AS ENUM ('CONSULTATION_FICHIER', 'VALIDATION', 'REFUS');

-- CreateTable
CREATE TABLE "slf_verification_identite" (
    "id_verification" SERIAL NOT NULL,
    "type_piece" "TypePieceIdentite" NOT NULL,
    "nom" VARCHAR(100) NOT NULL,
    "prenoms" VARCHAR(150) NOT NULL,
    "date_naissance" DATE NOT NULL,
    "numero_piece" VARCHAR(50) NOT NULL,
    "date_expiration" DATE,
    "fichier_recto" VARCHAR(255),
    "fichier_verso" VARCHAR(255),
    "fichier_selfie" VARCHAR(255),
    "fichiers_supprimes_le" TIMESTAMP(3),
    "telephone_retrait" VARCHAR(20) NOT NULL,
    "methode_retrait" "MethodePaiement" NOT NULL,
    "statut" "StatutVerificationIdentite" NOT NULL DEFAULT 'EN_ATTENTE',
    "motif_refus" TEXT,
    "date_soumission" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "date_decision" TIMESTAMP(3),
    "id_utilisateur" INTEGER NOT NULL,
    "id_admin" INTEGER,

    CONSTRAINT "slf_verification_identite_pkey" PRIMARY KEY ("id_verification")
);

-- CreateTable
CREATE TABLE "slf_journal_verification_identite" (
    "id_journal" SERIAL NOT NULL,
    "action" "ActionJournalIdentite" NOT NULL,
    "detail" TEXT,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "id_verification" INTEGER NOT NULL,
    "id_admin" INTEGER NOT NULL,

    CONSTRAINT "slf_journal_verification_identite_pkey" PRIMARY KEY ("id_journal")
);

-- CreateIndex
CREATE INDEX "slf_verification_identite_id_utilisateur_idx" ON "slf_verification_identite"("id_utilisateur");

-- CreateIndex
CREATE INDEX "slf_verification_identite_statut_idx" ON "slf_verification_identite"("statut");

-- CreateIndex
CREATE INDEX "slf_journal_verification_identite_id_verification_idx" ON "slf_journal_verification_identite"("id_verification");

-- AddForeignKey
ALTER TABLE "slf_verification_identite" ADD CONSTRAINT "slf_verification_identite_id_utilisateur_fkey" FOREIGN KEY ("id_utilisateur") REFERENCES "slf_utilisateur"("id_utilisateur") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "slf_verification_identite" ADD CONSTRAINT "slf_verification_identite_id_admin_fkey" FOREIGN KEY ("id_admin") REFERENCES "slf_utilisateur"("id_utilisateur") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "slf_journal_verification_identite" ADD CONSTRAINT "slf_journal_verification_identite_id_verification_fkey" FOREIGN KEY ("id_verification") REFERENCES "slf_verification_identite"("id_verification") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "slf_journal_verification_identite" ADD CONSTRAINT "slf_journal_verification_identite_id_admin_fkey" FOREIGN KEY ("id_admin") REFERENCES "slf_utilisateur"("id_utilisateur") ON DELETE RESTRICT ON UPDATE CASCADE;

