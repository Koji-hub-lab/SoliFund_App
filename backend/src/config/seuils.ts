import { ConfigService } from '@nestjs/config';

// Seuils de modération, réglables par variables d'environnement (voir .env.example).

function entierPositif(config: ConfigService, nom: string, defaut: number) {
  const valeur = Number(config.get<string>(nom));
  return Number.isInteger(valeur) && valeur > 0 ? valeur : defaut;
}

// Objectif (XAF) au-dessus duquel une cagnotte est vérifiée par un administrateur avant publication.
export function seuilObjectifVerification(config: ConfigService): number {
  return entierPositif(config, 'SEUIL_OBJECTIF_VERIFICATION', 1_000_000);
}

// Nombre de signalements ouverts à partir duquel une cagnotte active est suspendue automatiquement.
export function seuilSignalements(config: ConfigService): number {
  return entierPositif(config, 'SEUIL_SIGNALEMENTS', 3);
}
