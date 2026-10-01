-- Alertes des administrateurs en attente d'email (regroupées, envoyées par l'application ou par Cron).
CREATE TABLE "slf_alerte_email" (
    "id_alerte" SERIAL NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "parametres" JSONB NOT NULL,
    "date_creation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "date_envoi" TIMESTAMP(3),

    CONSTRAINT "slf_alerte_email_pkey" PRIMARY KEY ("id_alerte")
);

CREATE INDEX "slf_alerte_email_date_envoi_idx" ON "slf_alerte_email"("date_envoi");
