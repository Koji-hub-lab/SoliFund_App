import { Module } from '@nestjs/common';
import { RetraitsController } from './retraits.controller';
import { RetraitsService } from './retraits.service';
import { CommissionController } from './commission.controller';
import { NotificationsModule } from '../notifications/notifications.module';
import { PaymentModule } from '../payment/payment.module';
import { AlertesAdminModule } from '../alertes-admin/alertes-admin.module';

@Module({
  imports: [NotificationsModule, PaymentModule, AlertesAdminModule],
  controllers: [RetraitsController, CommissionController],
  providers: [RetraitsService],
  exports: [RetraitsService],
})
export class RetraitsModule {}
