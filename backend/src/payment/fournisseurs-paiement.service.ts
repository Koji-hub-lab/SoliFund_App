import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AangaraaPayFournisseur } from './aangaraa.fournisseur';
import type {
  FournisseurPaiement,
  NomFournisseur,
} from './fournisseur-paiement';
import { NotchPayFournisseur } from './notchpay.fournisseur';
import { ErreurConfigurationPaiement } from './paiement.erreurs';

// Valeurs de PAIEMENT_FOURNISSEUR (notchpay par défaut).
export const FOURNISSEURS_PAIEMENT = ['notchpay', 'aangaraa'] as const;
const NOMS: Record<(typeof FOURNISSEURS_PAIEMENT)[number], NomFournisseur> = {
  notchpay: 'NOTCHPAY',
  aangaraa: 'AANGARAA',
};

// Accès aux fournisseurs de paiement. Les nouveaux paiements et versements passent par le
// fournisseur actif (PAIEMENT_FOURNISSEUR) ; une opération existante est toujours consultée chez
// le fournisseur qui l'a traitée, même si le fournisseur actif a changé depuis.
@Injectable()
export class FournisseursPaiement {
  private readonly nomActif: NomFournisseur;
  private readonly fournisseurs: Record<NomFournisseur, FournisseurPaiement>;

  constructor(
    config: ConfigService,
    notchPay: NotchPayFournisseur,
    aangaraa: AangaraaPayFournisseur,
  ) {
    const choix = config.get<string>('PAIEMENT_FOURNISSEUR') || 'notchpay';
    this.nomActif = NOMS[choix as keyof typeof NOMS] ?? NOMS.notchpay;
    this.fournisseurs = { NOTCHPAY: notchPay, AANGARAA: aangaraa };
  }

  // Fournisseur des nouveaux paiements et versements.
  actif(): FournisseurPaiement {
    return this.get(this.nomActif);
  }

  // Fournisseur d'une opération existante (null : ancienne opération, forcément Notch Pay).
  get(nom: NomFournisseur | null | undefined): FournisseurPaiement {
    const fournisseur = this.fournisseurs[nom ?? 'NOTCHPAY'];
    if (!fournisseur.estConfigure()) {
      throw new ErreurConfigurationPaiement(
        `Le fournisseur de paiement ${fournisseur.nom} n'est pas configuré (clé absente).`,
      );
    }
    return fournisseur;
  }
}
