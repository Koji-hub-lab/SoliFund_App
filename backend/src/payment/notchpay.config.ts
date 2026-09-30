import { ConfigService } from '@nestjs/config';

export const URL_API_NOTCHPAY_PAR_DEFAUT = 'https://api.notchpay.co';

export interface ConfigurationNotchPay {
  urlApi: string;
  clePublique: string;
  // Envoyée dans X-Grant, uniquement pour les versements et le solde.
  clePrivee: string;
}

export function lireConfigurationNotchPay(
  config: ConfigService,
): ConfigurationNotchPay {
  return {
    urlApi: (
      config.get<string>('NOTCHPAY_API_URL') || URL_API_NOTCHPAY_PAR_DEFAUT
    ).replace(/\/+$/, ''),
    clePublique: config.getOrThrow<string>('NOTCHPAY_PUBLIC_KEY'),
    clePrivee: config.getOrThrow<string>('NOTCHPAY_PRIVATE_KEY'),
  };
}

// Les clés du mode test contiennent « test » dans leur préfixe (pk_test_..., sk_test_...,
// hsk_test_...) ; toute autre clé est une clé « live », qui déplace de l'argent réel.
export function estCleDeTest(cle: string): boolean {
  return /^[a-z]+_test[._]/i.test(cle.trim());
}

// Avertissements à écrire au démarrage : clé « live » hors production, clé de test en production,
// clés de modes différents. Ne contient jamais la valeur d'une clé.
export function avertissementsCles(
  cles: { nom: string; valeur?: string }[],
  environnement: string | undefined,
): string[] {
  const renseignees = cles.filter((c) => c.valeur);
  const enProduction = environnement === 'production';
  const avertissements: string[] = [];
  for (const { nom, valeur } of renseignees) {
    const test = estCleDeTest(valeur!);
    if (!test && !enProduction) {
      avertissements.push(
        `${nom} est une clé « live » alors que NODE_ENV n'est pas « production » : les paiements déplaceront de l'argent réel.`,
      );
    }
    if (test && enProduction) {
      avertissements.push(
        `${nom} est une clé de test alors que NODE_ENV est « production » : aucun paiement réel ne sera encaissé.`,
      );
    }
  }
  const modes = new Set(renseignees.map((c) => estCleDeTest(c.valeur!)));
  if (modes.size > 1) {
    avertissements.push(
      'Les clés Notch Pay ne sont pas toutes du même mode (test et live mélangés).',
    );
  }
  return avertissements;
}
