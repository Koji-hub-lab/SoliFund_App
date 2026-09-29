-- Miniature (400 px de large, WebP) de la photo de couverture, pour les cartes et les listes.
-- Les images déjà envoyées sont converties par scripts/convertir-images.ts.
ALTER TABLE "slf_cagnotte" ADD COLUMN "image_miniature" VARCHAR(255);
