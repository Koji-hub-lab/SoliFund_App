import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { createHash } from 'crypto';
import { DonsService } from '../dons/dons.service';
import { PrismaService } from '../prisma/prisma.service';
import type { ResultatWebhook } from './notchpay-webhook.service';

type Objet = Record<string, unknown>;

function texte(valeur: unknown): string | undefined {
  if (typeof valeur === 'string' && valeur !== '') return valeur;
  if (typeof valeur === 'number') return String(valeur);
  return undefined;
}

// Notifications d'AangaraaPay, reçues sur l'adresse à jeton secret (voir le contrôleur). Elles ne
// sont PAS signées (docs/paiement/aangaraa-api.md) : seul transaction_id (notre référence
// « SOLIFUND-DON-<id> ») est lu, pour retrouver le don. Le statut, le payToken et le montant du
// corps ne sont jamais utilisés : le paiement est consulté auprès d'AangaraaPay avec le payToken
// ENREGISTRÉ, et seul ce statut est appliqué (DonsService.synchroniserDon, qui vérifie aussi le
// montant, la devise et le numéro du payeur).
@Injectable()
export class AangaraaWebhookService {
  private readonly logger = new Logger('WebhookAangaraa');

  constructor(
    private readonly prisma: PrismaService,
    private readonly donsService: DonsService,
  ) {}

  async traiter(corps: unknown, corpsBrut: Buffer): Promise<ResultatWebhook> {
    const donnees: Objet =
      typeof corps === 'object' && corps !== null ? (corps as Objet) : {};
    const reference = texte(donnees.transaction_id);
    // Pas d'identifiant d'événement : l'empreinte du corps en tient lieu (même corps = même
    // notification).
    const idEvenement = `aangaraa:${createHash('sha256').update(corpsBrut).digest('hex')}`;

    const recu = await this.enregistrer(
      idEvenement,
      texte(donnees.status) ?? 'inconnu',
      reference,
    );
    if (recu.date_traitement) return 'deja_traite';

    const resultat = await this.appliquer(reference);
    await this.prisma.webhookRecu.update({
      where: { id_webhook: recu.id_webhook },
      data: { date_traitement: new Date() },
    });
    return resultat;
  }

  private async enregistrer(id: string, type: string, reference?: string) {
    try {
      return await this.prisma.webhookRecu.create({
        data: {
          id_evenement: id,
          type: `aangaraa.${type}`.slice(0, 100),
          reference,
        },
      });
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      ) {
        return this.prisma.webhookRecu.findUniqueOrThrow({
          where: { id_evenement: id },
        });
      }
      throw e;
    }
  }

  private async appliquer(
    reference: string | undefined,
  ): Promise<ResultatWebhook> {
    const paiement = reference
      ? await this.prisma.paiement.findFirst({
          where: { fournisseur: 'AANGARAA', reference },
          select: {
            reference_fournisseur: true,
            don: { select: { id_don: true } },
          },
        })
      : null;
    if (!paiement?.don) {
      this.logger.warn(
        `Notification pour une transaction inconnue (${reference ?? 'sans transaction_id'}).`,
      );
      return 'transaction_inconnue';
    }
    if (!paiement.reference_fournisseur) {
      // Aucun payToken enregistré (la réponse d'AangaraaPay n'est jamais arrivée) : impossible de
      // vérifier le statut. Le don reste tel quel ; la réconciliation l'abandonnera à 30 minutes.
      this.logger.warn(
        `Notification pour le don ${paiement.don.id_don}, sans payToken enregistré : statut non vérifiable, rien n'est appliqué.`,
      );
      return 'transaction_inconnue';
    }

    const statut = await this.donsService.synchroniserDon(paiement.don.id_don, {
      propagerErreurTemporaire: true,
      succesTardif: true,
    });
    this.logger.log(`Notification : don ${paiement.don.id_don} → ${statut}.`);
    return 'traite';
  }
}
