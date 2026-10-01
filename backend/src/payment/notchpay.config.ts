import { ConfigService } from '@nestjs/config';

export const URL_API_NOTCHPAY_PAR_DEFAUT = 'https://api.notchpay.co';

// Format des numéros envoyés à Notch Pay (NOTCHPAY_FORMAT_TELEPHONE) :
// « sans_plus » → 237677123456 (défaut : les exemples de docs/paiement/notchpay-openapi.yaml,
// écrits +237600000000 sans guillemets, sont lus par YAML comme le nombre 237600000000) ;
// « avec_plus » → +237677123456 (forme des exemples JSON des guides de Notch Pay).
export const FORMATS_TELEPHONE = ['sans_plus', 'avec_plus'] as const;
export type FormatTelephone = (typeof FORMATS_TELEPHONE)[number];

export interface ConfigurationNotchPay {
  urlApi: string;
  clePublique: string;
  // Envoyée dans X-Grant, uniquement pour les versements et le solde.
  clePrivee: string;
  formatTelephone: FormatTelephone;
}

export function lireConfigurationNotchPay(
  config: ConfigService,
): ConfigurationNotchPay {
  const format = config.get<string>('NOTCHPAY_FORMAT_TELEPHONE');
  return {
    urlApi: (
      config.get<string>('NOTCHPAY_API_URL') || URL_API_NOTCHPAY_PAR_DEFAUT
    ).replace(/\/+$/, ''),
    // Vides si Notch Pay n'est pas le fournisseur actif (voir validerEnvironnement).
    clePublique: config.get<string>('NOTCHPAY_PUBLIC_KEY') ?? '',
    clePrivee: config.get<string>('NOTCHPAY_PRIVATE_KEY') ?? '',
    formatTelephone: format === 'avec_plus' ? 'avec_plus' : 'sans_plus',
  };
}

// Numéro au format attendu par Notch Pay, à partir de la forme normalisée +2376XXXXXXXX
// (normaliserNumero). Appliqué à tous les numéros envoyés : customer.phone, data.phone,
// beneficiary_data.phone.
export function formaterTelephone(
  numero: string,
  format: FormatTelephone,
): string {
  const chiffres = numero.replace(/^\+/, '');
  return format === 'avec_plus' ? `+${chiffres}` : chiffres;
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
