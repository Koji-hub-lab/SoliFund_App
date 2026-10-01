import { Module } from '@nestjs/common';
import { DonsModule } from '../dons/dons.module';
import { RetraitsModule } from '../retraits/retraits.module';
import { AangaraaWebhookService } from './aangaraa-webhook.service';
import { NotchPayWebhookController } from './notchpay-webhook.controller';
import { NotchPayWebhookService } from './notchpay-webhook.service';

// Réception des webhooks des fournisseurs de paiement : POST /paiements/webhook/notchpay (signé)
// et POST /paiements/webhook/aangaraa (non signé, le paiement est toujours reconsulté).
@Module({
  imports: [DonsModule, RetraitsModule],
  controllers: [NotchPayWebhookController],
  providers: [NotchPayWebhookService, AangaraaWebhookService],
})
export class NotchPayWebhookModule {}
