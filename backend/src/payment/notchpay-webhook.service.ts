import { Injectable, Logger } from '@nestjs/common';
import { createHash } from 'crypto';
import { Prisma } from '@prisma/client';
import { DonsService } from '../dons/dons.service';
import { RetraitsService } from '../retraits/retraits.service';
import { PrismaService } from '../prisma/prisma.service';
import { lireEvenement } from './notchpay.reponses';

export type ResultatWebhook =
  'traite' | 'deja_traite' | 'transaction_inconnue' | 'ignore';

// Traitement des événements reçus de Notch Pay, une fois leur signature vérifiée.
// - Chaque événement est enregistré (WebhookRecu, identifiant unique) : un événement déjà traité
//   n'est pas refait. Un événement dont le traitement a échoué (erreur interne → 500) n'est pas
//   marqué traité : Notch Pay le renvoie, et il est alors traité.
// - Le contenu de l'événement n'est jamais cru sur parole : il sert seulement à retrouver le don.
//   Le paiement est reconsulté par l'API, son montant vérifié, puis le statut appliqué par les
//   mêmes fonctions que la vérification et la réconciliation (DonsService.synchroniserDon).
@Injectable()
export class NotchPayWebhookService {
  private readonly logger = new Logger('WebhookNotchPay');

  constructor(
    private readonly prisma: PrismaService,
    private readonly donsService: DonsService,
    private readonly retraitsService: RetraitsService,
  ) {}

  async traiter(corps: unknown, corpsBrut: Buffer): Promise<ResultatWebhook> {
    const evenement = lireEvenement(corps);
    // Événement sans identifiant : l'empreinte du corps sert d'identifiant (même corps = même
    // événement).
    const idEvenement =
      evenement.id ??
      `sha256:${createHash('sha256').update(corpsBrut).digest('hex')}`;

    const recu = await this.enregistrer(
      idEvenement,
      evenement.type,
      evenement.reference,
    );
    if (recu.date_traitement) {
      this.logger.log(
        `Événement ${idEvenement} (${evenement.type}) déjà traité.`,
      );
      return 'deja_traite';
    }

    const resultat = await this.appliquer(evenement);
    await this.prisma.webhookRecu.update({
      where: { id_webhook: recu.id_webhook },
      data: { date_traitement: new Date() },
    });
    return resultat;
  }

  // Enregistre l'événement, ou renvoie la ligne existante s'il a déjà été reçu.
  private async enregistrer(
    idEvenement: string,
    type: string,
    reference?: string,
  ) {
    try {
      return await this.prisma.webhookRecu.create({
        data: { id_evenement: idEvenement, type, reference },
      });
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      ) {
        return this.prisma.webhookRecu.findUniqueOrThrow({
          where: { id_evenement: idEvenement },
        });
      }
      throw e;
    }
  }

  private async appliquer(
    evenement: ReturnType<typeof lireEvenement>,
  ): Promise<ResultatWebhook> {
    const references = [
      evenement.reference,
      evenement.referenceMarchand,
    ].filter((r): r is string => !!r);
    if (evenement.type.startsWith('transfer.')) {
      return this.appliquerVersement(evenement.type, references);
    }
    if (!evenement.type.startsWith('payment.')) {
      this.logger.log(`Événement ${evenement.type} reçu, non traité.`);
      return 'ignore';
    }

    const paiement =
      references.length > 0
        ? await this.prisma.paiement.findFirst({
            where: {
              OR: [
                { reference_fournisseur: { in: references } },
                { reference: { in: references } },
              ],
            },
            select: { don: { select: { id_don: true } } },
          })
        : null;
    if (!paiement?.don) {
      this.logger.warn(
        `Événement ${evenement.type} pour une transaction inconnue (${references.join(', ') || 'sans référence'}).`,
      );
      return 'transaction_inconnue';
    }

    // Statut relu chez Notch Pay ; une erreur temporaire remonte (500) pour un nouvel envoi.
    const statut = await this.donsService.synchroniserDon(paiement.don.id_don, {
      propagerErreurTemporaire: true,
    });
    this.logger.log(
      `Événement ${evenement.type} : don ${paiement.don.id_don} → ${statut}.`,
    );
    return 'traite';
  }

  // Événement de versement (transfer.*) : le versement est reconsulté, puis le retrait passe en
  // TRAITE ou en ECHOUE (RetraitsService.synchroniserRetrait).
  private async appliquerVersement(
    type: string,
    references: string[],
  ): Promise<ResultatWebhook> {
    const retrait =
      references.length > 0
        ? await this.prisma.retrait.findFirst({
            where: {
              OR: [
                { reference_fournisseur: { in: references } },
                { reference_retrait: { in: references } },
              ],
            },
            select: { id_retrait: true },
          })
        : null;
    if (!retrait) {
      this.logger.warn(
        `Événement ${type} pour un versement inconnu (${references.join(', ') || 'sans référence'}).`,
      );
      return 'transaction_inconnue';
    }
    const statut = await this.retraitsService.synchroniserRetrait(
      retrait.id_retrait,
      { propagerErreurTemporaire: true },
    );
    this.logger.log(
      `Événement ${type} : retrait ${retrait.id_retrait} → ${statut}.`,
    );
    return 'traite';
  }
}
