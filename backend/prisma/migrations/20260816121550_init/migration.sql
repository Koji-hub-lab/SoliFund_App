-- CreateEnum
CREATE TYPE "RoleNom" AS ENUM ('ROLE_USER', 'ROLE_ADMIN');

-- CreateEnum
CREATE TYPE "StatutUtilisateur" AS ENUM ('ACTIF', 'SUSPENDU', 'BANNI', 'INACTIF');

-- CreateEnum
CREATE TYPE "TypeJeton" AS ENUM ('VERIF_EMAIL', 'RESET_MDP');

-- CreateEnum
CREATE TYPE "StatutCagnotte" AS ENUM ('ACTIVE', 'TERMINEE', 'SUSPENDUE', 'ANNULEE');

-- CreateEnum
CREATE TYPE "MethodePaiement" AS ENUM ('MTN_MOBILE_MONEY', 'ORANGE_MONEY');

-- CreateEnum
CREATE TYPE "StatutPaiement" AS ENUM ('EN_ATTENTE', 'VALIDE', 'ECHOUE', 'REMBOURSE');

-- CreateEnum
CREATE TYPE "StatutRetrait" AS ENUM ('EN_ATTENTE', 'APPROUVE', 'REJETE', 'TRAITE');

-- CreateEnum
CREATE TYPE "TypeTransaction" AS ENUM ('DON', 'RETRAIT', 'REMBOURSEMENT');

-- CreateEnum
CREATE TYPE "StatutTransaction" AS ENUM ('EN_ATTENTE', 'SUCCES', 'ECHEC');

-- CreateEnum
CREATE TYPE "TypeNotification" AS ENUM ('DON', 'RETRAIT', 'COMMENTAIRE', 'SYSTEME', 'VERIFICATION');

-- CreateEnum
CREATE TYPE "StatutLecture" AS ENUM ('NON_LUE', 'LUE');

-- CreateTable
CREATE TABLE "slf_role" (
    "id_role" SERIAL NOT NULL,
    "nom" "RoleNom" NOT NULL,

    CONSTRAINT "slf_role_pkey" PRIMARY KEY ("id_role")
);

-- CreateTable
CREATE TABLE "slf_utilisateur" (
    "id_utilisateur" SERIAL NOT NULL,
    "nom" VARCHAR(100) NOT NULL,
    "prenom" VARCHAR(100) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "mot_de_passe" VARCHAR(255) NOT NULL,
    "telephone" VARCHAR(20),
    "photo_profil" VARCHAR(255),
    "date_inscription" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "est_verifie" BOOLEAN NOT NULL DEFAULT false,
    "statut" "StatutUtilisateur" NOT NULL DEFAULT 'ACTIF',
    "date_fin_suspension" TIMESTAMP(3),

    CONSTRAINT "slf_utilisateur_pkey" PRIMARY KEY ("id_utilisateur")
);

-- CreateTable
CREATE TABLE "slf_posseder" (
    "id_utilisateur" INTEGER NOT NULL,
    "id_role" INTEGER NOT NULL,

    CONSTRAINT "slf_posseder_pkey" PRIMARY KEY ("id_utilisateur","id_role")
);

-- CreateTable
CREATE TABLE "slf_jeton" (
    "id_jeton" SERIAL NOT NULL,
    "id_utilisateur" INTEGER NOT NULL,
    "code" VARCHAR(255) NOT NULL,
    "type" "TypeJeton" NOT NULL,
    "date_creation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "date_expiration" TIMESTAMP(3) NOT NULL,
    "est_utilise" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "slf_jeton_pkey" PRIMARY KEY ("id_jeton")
);

-- CreateTable
CREATE TABLE "slf_categorie" (
    "id_categorie" SERIAL NOT NULL,
    "nom" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "icone" VARCHAR(255),
    "couleur" VARCHAR(50),

    CONSTRAINT "slf_categorie_pkey" PRIMARY KEY ("id_categorie")
);

-- CreateTable
CREATE TABLE "slf_cagnotte" (
    "id_cagnotte" SERIAL NOT NULL,
    "titre" VARCHAR(255) NOT NULL,
    "slug" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "objectif" DECIMAL(15,2) NOT NULL,
    "montant_collecte" DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    "date_debut" DATE NOT NULL,
    "date_fin" DATE NOT NULL,
    "statut" "StatutCagnotte" NOT NULL DEFAULT 'ACTIVE',
    "est_publique" BOOLEAN NOT NULL DEFAULT true,
    "date_creation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "date_modification" TIMESTAMP(3),
    "devise" VARCHAR(10) NOT NULL DEFAULT 'XAF',
    "image" VARCHAR(255),
    "id_utilisateur" INTEGER NOT NULL,
    "id_categorie" INTEGER,

    CONSTRAINT "slf_cagnotte_pkey" PRIMARY KEY ("id_cagnotte")
);

-- CreateTable
CREATE TABLE "slf_paiement" (
    "id_paiement" SERIAL NOT NULL,
    "montant" DECIMAL(15,2) NOT NULL,
    "devise" VARCHAR(10) NOT NULL DEFAULT 'XAF',
    "methode_paiement" "MethodePaiement" NOT NULL,
    "transaction_id" VARCHAR(255),
    "reference_externe" VARCHAR(255),
    "statut" "StatutPaiement" NOT NULL DEFAULT 'EN_ATTENTE',
    "date_creation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "date_maj" TIMESTAMP(3),
    "numero_payeur" VARCHAR(20),
    "id_utilisateur" INTEGER NOT NULL,

    CONSTRAINT "slf_paiement_pkey" PRIMARY KEY ("id_paiement")
);

-- CreateTable
CREATE TABLE "slf_don" (
    "id_don" SERIAL NOT NULL,
    "message" TEXT,
    "est_anonyme" BOOLEAN NOT NULL DEFAULT false,
    "date_creation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "statut" "StatutPaiement" NOT NULL DEFAULT 'EN_ATTENTE',
    "id_cagnotte" INTEGER NOT NULL,
    "id_utilisateur" INTEGER,
    "id_paiement" INTEGER NOT NULL,

    CONSTRAINT "slf_don_pkey" PRIMARY KEY ("id_don")
);

-- CreateTable
CREATE TABLE "slf_commentaire" (
    "id_commentaire" SERIAL NOT NULL,
    "date_creation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "description" TEXT NOT NULL,
    "id_utilisateur" INTEGER NOT NULL,
    "id_cagnotte" INTEGER NOT NULL,

    CONSTRAINT "slf_commentaire_pkey" PRIMARY KEY ("id_commentaire")
);

-- CreateTable
CREATE TABLE "slf_retrait" (
    "id_retrait" SERIAL NOT NULL,
    "montant" DECIMAL(15,2) NOT NULL,
    "methode_retrait" "MethodePaiement" NOT NULL,
    "numero_beneficiaire" VARCHAR(20) NOT NULL,
    "reference_retrait" VARCHAR(255),
    "motif_rejet" TEXT,
    "statut" "StatutRetrait" NOT NULL DEFAULT 'EN_ATTENTE',
    "date_creation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "date_traitement" TIMESTAMP(3),
    "date_validation" TIMESTAMP(3),
    "id_utilisateur" INTEGER NOT NULL,
    "id_cagnotte" INTEGER NOT NULL,

    CONSTRAINT "slf_retrait_pkey" PRIMARY KEY ("id_retrait")
);

-- CreateTable
CREATE TABLE "slf_transaction" (
    "id_transaction" SERIAL NOT NULL,
    "type" "TypeTransaction" NOT NULL,
    "montant" DECIMAL(15,2) NOT NULL,
    "devise" VARCHAR(10) NOT NULL DEFAULT 'XAF',
    "reference" VARCHAR(255),
    "statut" "StatutTransaction" NOT NULL DEFAULT 'EN_ATTENTE',
    "date_creation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "id_paiement" INTEGER,
    "id_retrait" INTEGER,

    CONSTRAINT "slf_transaction_pkey" PRIMARY KEY ("id_transaction")
);

-- CreateTable
CREATE TABLE "slf_notification" (
    "id_notification" SERIAL NOT NULL,
    "titre" VARCHAR(255) NOT NULL,
    "message" TEXT NOT NULL,
    "type" "TypeNotification" NOT NULL,
    "date_envoi" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "id_cagnotte" INTEGER,

    CONSTRAINT "slf_notification_pkey" PRIMARY KEY ("id_notification")
);

-- CreateTable
CREATE TABLE "slf_recevoir" (
    "statut" "StatutLecture" NOT NULL DEFAULT 'NON_LUE',
    "date_lecture" TIMESTAMP(3),
    "id_utilisateur" INTEGER NOT NULL,
    "id_notification" INTEGER NOT NULL,

    CONSTRAINT "slf_recevoir_pkey" PRIMARY KEY ("id_utilisateur","id_notification")
);

-- CreateTable
CREATE TABLE "slf_actualite" (
    "id_actualite" SERIAL NOT NULL,
    "titre" VARCHAR(255) NOT NULL,
    "contenu" TEXT NOT NULL,
    "date_publication" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "id_cagnotte" INTEGER NOT NULL,

    CONSTRAINT "slf_actualite_pkey" PRIMARY KEY ("id_actualite")
);

-- CreateIndex
CREATE UNIQUE INDEX "slf_role_nom_key" ON "slf_role"("nom");

-- CreateIndex
CREATE UNIQUE INDEX "slf_utilisateur_email_key" ON "slf_utilisateur"("email");

-- CreateIndex
CREATE UNIQUE INDEX "slf_utilisateur_telephone_key" ON "slf_utilisateur"("telephone");

-- CreateIndex
CREATE INDEX "slf_utilisateur_email_idx" ON "slf_utilisateur"("email");

-- CreateIndex
CREATE INDEX "slf_utilisateur_statut_idx" ON "slf_utilisateur"("statut");

-- CreateIndex
CREATE UNIQUE INDEX "slf_jeton_code_key" ON "slf_jeton"("code");

-- CreateIndex
CREATE UNIQUE INDEX "slf_categorie_nom_key" ON "slf_categorie"("nom");

-- CreateIndex
CREATE UNIQUE INDEX "slf_cagnotte_slug_key" ON "slf_cagnotte"("slug");

-- CreateIndex
CREATE INDEX "slf_cagnotte_id_utilisateur_idx" ON "slf_cagnotte"("id_utilisateur");

-- CreateIndex
CREATE INDEX "slf_cagnotte_statut_idx" ON "slf_cagnotte"("statut");

-- CreateIndex
CREATE INDEX "slf_cagnotte_id_categorie_idx" ON "slf_cagnotte"("id_categorie");

-- CreateIndex
CREATE INDEX "slf_cagnotte_date_fin_idx" ON "slf_cagnotte"("date_fin");

-- CreateIndex
CREATE UNIQUE INDEX "slf_paiement_transaction_id_key" ON "slf_paiement"("transaction_id");

-- CreateIndex
CREATE INDEX "slf_paiement_statut_idx" ON "slf_paiement"("statut");

-- CreateIndex
CREATE INDEX "slf_paiement_id_utilisateur_idx" ON "slf_paiement"("id_utilisateur");

-- CreateIndex
CREATE UNIQUE INDEX "slf_don_id_paiement_key" ON "slf_don"("id_paiement");

-- CreateIndex
CREATE INDEX "slf_don_id_cagnotte_idx" ON "slf_don"("id_cagnotte");

-- CreateIndex
CREATE INDEX "slf_don_id_utilisateur_idx" ON "slf_don"("id_utilisateur");

-- CreateIndex
CREATE INDEX "slf_commentaire_id_cagnotte_idx" ON "slf_commentaire"("id_cagnotte");

-- CreateIndex
CREATE INDEX "slf_commentaire_id_utilisateur_idx" ON "slf_commentaire"("id_utilisateur");

-- CreateIndex
CREATE UNIQUE INDEX "slf_retrait_reference_retrait_key" ON "slf_retrait"("reference_retrait");

-- CreateIndex
CREATE INDEX "slf_retrait_id_utilisateur_idx" ON "slf_retrait"("id_utilisateur");

-- CreateIndex
CREATE INDEX "slf_retrait_id_cagnotte_idx" ON "slf_retrait"("id_cagnotte");

-- CreateIndex
CREATE UNIQUE INDEX "slf_transaction_reference_key" ON "slf_transaction"("reference");

-- CreateIndex
CREATE INDEX "slf_transaction_id_paiement_idx" ON "slf_transaction"("id_paiement");

-- CreateIndex
CREATE INDEX "slf_transaction_id_retrait_idx" ON "slf_transaction"("id_retrait");

-- CreateIndex
CREATE INDEX "slf_notification_type_idx" ON "slf_notification"("type");

-- CreateIndex
CREATE INDEX "slf_notification_id_cagnotte_idx" ON "slf_notification"("id_cagnotte");

-- CreateIndex
CREATE INDEX "slf_recevoir_id_utilisateur_idx" ON "slf_recevoir"("id_utilisateur");

-- CreateIndex
CREATE INDEX "slf_recevoir_statut_idx" ON "slf_recevoir"("statut");

-- CreateIndex
CREATE INDEX "slf_actualite_id_cagnotte_idx" ON "slf_actualite"("id_cagnotte");

-- AddForeignKey
ALTER TABLE "slf_posseder" ADD CONSTRAINT "slf_posseder_id_utilisateur_fkey" FOREIGN KEY ("id_utilisateur") REFERENCES "slf_utilisateur"("id_utilisateur") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "slf_posseder" ADD CONSTRAINT "slf_posseder_id_role_fkey" FOREIGN KEY ("id_role") REFERENCES "slf_role"("id_role") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "slf_jeton" ADD CONSTRAINT "slf_jeton_id_utilisateur_fkey" FOREIGN KEY ("id_utilisateur") REFERENCES "slf_utilisateur"("id_utilisateur") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "slf_cagnotte" ADD CONSTRAINT "slf_cagnotte_id_utilisateur_fkey" FOREIGN KEY ("id_utilisateur") REFERENCES "slf_utilisateur"("id_utilisateur") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "slf_cagnotte" ADD CONSTRAINT "slf_cagnotte_id_categorie_fkey" FOREIGN KEY ("id_categorie") REFERENCES "slf_categorie"("id_categorie") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "slf_paiement" ADD CONSTRAINT "slf_paiement_id_utilisateur_fkey" FOREIGN KEY ("id_utilisateur") REFERENCES "slf_utilisateur"("id_utilisateur") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "slf_don" ADD CONSTRAINT "slf_don_id_cagnotte_fkey" FOREIGN KEY ("id_cagnotte") REFERENCES "slf_cagnotte"("id_cagnotte") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "slf_don" ADD CONSTRAINT "slf_don_id_utilisateur_fkey" FOREIGN KEY ("id_utilisateur") REFERENCES "slf_utilisateur"("id_utilisateur") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "slf_don" ADD CONSTRAINT "slf_don_id_paiement_fkey" FOREIGN KEY ("id_paiement") REFERENCES "slf_paiement"("id_paiement") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "slf_commentaire" ADD CONSTRAINT "slf_commentaire_id_utilisateur_fkey" FOREIGN KEY ("id_utilisateur") REFERENCES "slf_utilisateur"("id_utilisateur") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "slf_commentaire" ADD CONSTRAINT "slf_commentaire_id_cagnotte_fkey" FOREIGN KEY ("id_cagnotte") REFERENCES "slf_cagnotte"("id_cagnotte") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "slf_retrait" ADD CONSTRAINT "slf_retrait_id_utilisateur_fkey" FOREIGN KEY ("id_utilisateur") REFERENCES "slf_utilisateur"("id_utilisateur") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "slf_retrait" ADD CONSTRAINT "slf_retrait_id_cagnotte_fkey" FOREIGN KEY ("id_cagnotte") REFERENCES "slf_cagnotte"("id_cagnotte") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "slf_transaction" ADD CONSTRAINT "slf_transaction_id_paiement_fkey" FOREIGN KEY ("id_paiement") REFERENCES "slf_paiement"("id_paiement") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "slf_transaction" ADD CONSTRAINT "slf_transaction_id_retrait_fkey" FOREIGN KEY ("id_retrait") REFERENCES "slf_retrait"("id_retrait") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "slf_notification" ADD CONSTRAINT "slf_notification_id_cagnotte_fkey" FOREIGN KEY ("id_cagnotte") REFERENCES "slf_cagnotte"("id_cagnotte") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "slf_recevoir" ADD CONSTRAINT "slf_recevoir_id_utilisateur_fkey" FOREIGN KEY ("id_utilisateur") REFERENCES "slf_utilisateur"("id_utilisateur") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "slf_recevoir" ADD CONSTRAINT "slf_recevoir_id_notification_fkey" FOREIGN KEY ("id_notification") REFERENCES "slf_notification"("id_notification") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "slf_actualite" ADD CONSTRAINT "slf_actualite_id_cagnotte_fkey" FOREIGN KEY ("id_cagnotte") REFERENCES "slf_cagnotte"("id_cagnotte") ON DELETE CASCADE ON UPDATE CASCADE;
