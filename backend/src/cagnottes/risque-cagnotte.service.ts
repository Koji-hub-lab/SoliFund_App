import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { seuilObjectifVerification } from '../config/seuils';
import { PrismaService } from '../prisma/prisma.service';

// Raisons pour lesquelles une cagnotte attend une vérification avant d'être publiée.
// Les deux premières sont des règles de risque ; elles demandent la décision d'un administrateur.
export type RaisonVerification =
  | 'OBJECTIF_ELEVE'
  | 'ANTECEDENT_ORGANISATEUR'
  | 'IDENTITE_EN_ATTENTE'
  | 'REVISION_APRES_REFUS';

export interface ContexteRisque {
  idUtilisateur: number;
  objectif: number;
  // Cagnotte évaluée, si elle existe déjà (modification) : ignorée dans les antécédents.
  idCagnotte?: number;
}

interface RegleRisque {
  raison: RaisonVerification;
  sApplique(contexte: ContexteRisque): boolean | Promise<boolean>;
}

// Règles de risque appliquées à la publication d'une cagnotte. Pour en ajouter une : une raison
// dans RaisonVerification (et son libellé « raisons.<CODE> » dans src/i18n et dans le frontend), puis une entrée dans `regles`.
@Injectable()
export class RisqueCagnotteService {
  private readonly regles: RegleRisque[];

  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    const seuilObjectif = seuilObjectifVerification(config);
    this.regles = [
      {
        raison: 'OBJECTIF_ELEVE',
        sApplique: ({ objectif }) => objectif > seuilObjectif,
      },
      {
        // Statuts actuels des autres cagnottes de l'organisateur (l'historique des statuts
        // n'est pas conservé : une cagnotte suspendue puis réactivée ne compte plus).
        raison: 'ANTECEDENT_ORGANISATEUR',
        sApplique: async ({ idUtilisateur, idCagnotte }) =>
          (await this.prisma.cagnotte.count({
            where: {
              id_utilisateur: idUtilisateur,
              statut: { in: ['SUSPENDUE', 'REFUSEE'] },
              ...(idCagnotte ? { id_cagnotte: { not: idCagnotte } } : {}),
            },
          })) > 0,
      },
    ];
  }

  async evaluer(contexte: ContexteRisque): Promise<RaisonVerification[]> {
    const raisons: RaisonVerification[] = [];
    for (const regle of this.regles) {
      if (await regle.sApplique(contexte)) raisons.push(regle.raison);
    }
    return raisons;
  }
}
