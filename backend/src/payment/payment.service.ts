import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class PaymentService {
  private readonly apiUrl = 'https://api-production.aangaraa-pay.com/api/v1';

  constructor(private readonly configService: ConfigService) {}

  private mapOperateur(methode: string): string {
    return methode === 'MTN_MOBILE_MONEY' ? 'MTN_Cameroon' : 'Orange_Cameroon';
  }

  async initierPaiement(numeroPayeur: string, montant: number, description: string, transactionId: string, methode: string) {
    try {
      const res = await axios.post(`${this.apiUrl}/no_redirect/payment`, {
        phone_number: numeroPayeur,
        amount: montant.toString(),
        description,
        app_key: this.configService.get<string>('AANGARAA_APP_KEY'),
        transaction_id: transactionId,
        notify_url: `${this.configService.get<string>('BACKEND_URL')}/payment/webhook/aangaraa`,
        operator: this.mapOperateur(methode),
        devise_id: 'XAF',
      });
      return res.data.data; // { payToken, status }
    } catch (error: any) {
      console.error('Erreur AangaraaPay (initiation):', error.response?.data || error.message);
      throw new InternalServerErrorException("Échec de l'initialisation du paiement.");
    }
  }

  async verifierStatut(payToken: string) {
    try {
      const res = await axios.post(`${this.apiUrl}/aangaraa_check_status`, {
        payToken,
        app_key: this.configService.get<string>('AANGARAA_APP_KEY'),
      });
      return res.data; // { success, status, amount, ... }
    } catch (error: any) {
      console.error('Erreur AangaraaPay (statut):', error.response?.data || error.message);
      throw new InternalServerErrorException('Échec de la vérification du statut.');
    }
  }
}