import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DonsService } from '../dons/dons.service';
import { AxiosError } from 'axios';
import axios from 'axios';
import { ConfigService } from '@nestjs/config';
import { StatutPaiement } from '@prisma/client';

@Injectable()
export class PaymentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly donsService: DonsService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Initialise un paiement MTN Mobile Money.
   * Retourne l'URL de redirection vers laquelle le frontend doit envoyer l'utilisateur.
   */
  async initiateMtnPayment(
    amount: number,
    currency: string,
    phoneNumber: string,
    externalId: string,
    payerMessage?: string,
    payeeNote?: string,
  ): Promise<string> {
    try {
      const apiKey = this.configService.get<string>('MTN_MOMO_API_KEY');
      const subscriptionKey = this.configService.get<string>(
        'MTN_MOMO_SUBSCRIPTION_KEY',
      );
      const targetEnv = this.configService.get<string>(
        'MTN_MOMO_TARGET_ENVIRONMENT',
        'sandbox',
      );

      // MTN MoI Collection API endpoint (sandbox example)
      const baseUrl =
        targetEnv === 'sandbox'
          ? 'https://sandbox.momodeveloper.mtn.com'
          : 'https://api.mtn.com/momopay';

      const url = `${baseUrl}/collection/v1_0/requesttopay`;

      const headers = {
        'Ocp-Apim-Subscription-Key': subscriptionKey,
        Authorization: `Bearer ${apiKey}`,
        'X-Target-Environment': targetEnv,
        'Content-Type': 'application/json',
      };

      const data = {
        amount: `${amount}`,
        currency,
        externalId,
        payer: {
          partyIdType: 'MSISDN',
          partyId: phoneNumber,
        },
        payerMessage,
        payeeNote,
      };

      const response = await axios.post(url, data, { headers });

      // The response should contain a location or redirect URL (depends on API version)
      // For sandbox we assume it returns a URL in the 'Location' header or body.
      // We'll mock: return a placeholder URL that includes the transaction id.
      // In real implementation, you would poll the transaction status or wait for webhook.
      const locationHeader = response.headers.location as
        string | string[] | undefined;
      let location: string | undefined;
      if (Array.isArray(locationHeader)) {
        location = locationHeader[0];
      } else {
        location = locationHeader;
      }
      if (typeof location === 'string') {
        return location;
      }
      return `https://mtn-momo.mock/pay/${externalId}`;
    } catch (error) {
      if (error instanceof AxiosError) {
        console.error(
          'MTN payment initiation error:',
          error.response?.data || error.message,
        );
      } else {
        console.error('MTN payment initiation error:', error);
      }
      throw new InternalServerErrorException(
        'Failed to initiate MTN Mobile Money payment',
      );
    }
  }

  /**
   * Initialise un paiement Orange Money Cameroon.
   */
  async initiateOrangePayment(
    amount: number,
    currency: string,
    phoneNumber: string,
    externalId: string,
    payerMessage?: string,
    payeeNote?: string,
  ): Promise<string> {
    try {
      const apiKey = this.configService.get<string>('ORANGE_MONEY_API_KEY');
      const targetEnv = this.configService.get<string>(
        'ORANGE_MONEY_TARGET_ENVIRONMENT',
        'sandbox',
      );

      // Orange Money API endpoint (example)
      const baseUrl =
        targetEnv === 'sandbox'
          ? 'https://api.sandbox.orange.com'
          : 'https://api.orange.com';

      const url = `${baseUrl}/omcore/v1/payments`;

      const headers = {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      };

      const data = {
        amount: `${amount}`,
        currency,
        externalId,
        sender: {
          partyIdType: 'MSISDN',
          partyId: phoneNumber,
        },
        payerMessage,
        payeeNote,
      };

      const response = await axios.post(url, data, { headers });

      const locationHeader = response.headers.location as
        string | string[] | undefined;
      let location: string | undefined;
      if (Array.isArray(locationHeader)) {
        location = locationHeader[0];
      } else {
        location = locationHeader;
      }
      if (typeof location === 'string') {
        return location;
      }
      return `https://orange-money.mock/pay/${externalId}`;
    } catch (error) {
      if (error instanceof AxiosError) {
        console.error(
          'Orange Money payment initiation error:',
          error.response?.data || error.message,
        );
      } else {
        console.error('Orange Money payment initiation error:', error);
      }
      throw new InternalServerErrorException(
        'Failed to initiate Orange Money payment',
      );
    }
  }

  /**
   * Met à jour le statut d'un paiement à partir du webhook et, si le paiement réussit,
   * déclenche la validation du don.
   */
  async handleWebhookPayment(
    provider: 'MTN' | 'ORANGE',
    paiementId: number,
    status: string,
  ) {
    // Map the provider's status to our internal status
    let newStatus: StatutPaiement;
    if (
      status.toUpperCase() === 'SUCCESSFUL' ||
      status.toUpperCase() === 'SUCCES'
    ) {
      newStatus = 'VALIDE';
    } else {
      newStatus = 'ECHOUE';
    }

    // Update the paiement status
    await this.prisma.paiement.update({
      where: { id_paiement: paiementId },
      data: { statut: newStatus },
    });

    // If successful, validate the payment (which will update don, cagnotte, and create transaction)
    if (newStatus === 'VALIDE') {
      await this.validatePaymentByPaiementId(paiementId);
    }
  }

  /**
   * Valide un paiement après confirmation du webhook
   * (réutilise la logique existante de DonsService.validerPaiement)
   */
  async validatePaymentByPaiementId(idPaiement: number) {
    // Find the associated don
    const don = await this.prisma.don.findFirst({
      where: { id_paiement: idPaiement },
      include: { cagnotte: true },
    });

    if (!don) {
      throw new Error(`Don not found for paiement id ${idPaiement}`);
    }

    // Use existing validation logic from DonsService
    return this.donsService.validerPaiement(don.id_don);
  }
}
