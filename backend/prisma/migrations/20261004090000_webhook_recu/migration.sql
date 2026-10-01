-- Événements reçus de Notch Pay par webhook (dédoublonnage par identifiant d'événement).
CREATE TABLE "slf_webhook_recu" (
    "id_webhook" SERIAL NOT NULL,
    "id_evenement" VARCHAR(255) NOT NULL,
    "type" VARCHAR(100) NOT NULL,
    "reference" VARCHAR(255),
    "date_reception" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "date_traitement" TIMESTAMP(3),

    CONSTRAINT "slf_webhook_recu_pkey" PRIMARY KEY ("id_webhook")
);

CREATE UNIQUE INDEX "slf_webhook_recu_id_evenement_key" ON "slf_webhook_recu"("id_evenement");
