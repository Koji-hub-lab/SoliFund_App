import { Module } from '@nestjs/common';
import { AangaraaPayClient } from './aangaraa.client';
import { AangaraaPayFournisseur } from './aangaraa.fournisseur';
import { FournisseursPaiement } from './fournisseurs-paiement.service';
import { NotchPayClient } from './notchpay.client';
import { NotchPayFournisseur } from './notchpay.fournisseur';
import { OperateursController } from './operateurs.controller';

// Paiement Mobile Money : clients des fournisseurs (Notch Pay, AangaraaPay), leur interface
// commune (FournisseursPaiement, seule utilisée par le reste du code), et préfixes des opérateurs
// (GET /paiements/operateurs).
@Module({
  controllers: [OperateursController],
  providers: [
    NotchPayClient,
    NotchPayFournisseur,
    AangaraaPayClient,
    AangaraaPayFournisseur,
    FournisseursPaiement,
  ],
  exports: [FournisseursPaiement],
})
export class PaymentModule {}
