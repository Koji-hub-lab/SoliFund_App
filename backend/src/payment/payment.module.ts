import { Module } from '@nestjs/common';
import { NotchPayClient } from './notchpay.client';

// Paiement Mobile Money par Notch Pay : client de l'API (paiements, versements, solde).
@Module({
  providers: [NotchPayClient],
  exports: [NotchPayClient],
})
export class PaymentModule {}
