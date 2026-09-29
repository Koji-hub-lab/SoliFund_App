import { Module } from '@nestjs/common';
import { Client3SPay } from './client-3spay.service';

// Prestataire de paiement 3SPAY (Mobile Money). Les dons y seront branchés ensuite (P2).
@Module({
  providers: [Client3SPay],
  exports: [Client3SPay],
})
export class Paiement3SPayModule {}
