import { Module } from '@nestjs/common';
import { DonsController } from './dons.controller';
import { DonsService } from './dons.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { CagnottesModule } from '../cagnottes/cagnottes.module';
import { PaymentModule } from '../payment/payment.module';
import { ReconciliationDonsService } from './reconciliation-dons.service';

@Module({
  imports: [NotificationsModule, CagnottesModule, PaymentModule],
  controllers: [DonsController],
  providers: [DonsService, ReconciliationDonsService],
  exports: [DonsService],
})
export class DonsModule {}
