-- Langue préférée de l'utilisateur (interface et emails).
CREATE TYPE "Langue" AS ENUM ('fr', 'en');
ALTER TABLE "slf_utilisateur" ADD COLUMN "langue_preferee" "Langue" NOT NULL DEFAULT 'fr';

-- Notifications : un code et des paramètres, affichés par le frontend dans la langue active.
-- Les notifications existantes gardent leur texte (titre, message) et n'ont pas de code.
ALTER TABLE "slf_notification"
  ADD COLUMN "code" VARCHAR(100),
  ADD COLUMN "parametres" JSONB,
  ALTER COLUMN "titre" DROP NOT NULL,
  ALTER COLUMN "message" DROP NOT NULL;
