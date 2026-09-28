import { Module, forwardRef } from '@nestjs/common';
import { DonsController } from './dons.controller';
import { DonsService } from './dons.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { PaymentModule } from '../payment/payment.module';

@Module({
  imports: [NotificationsModule, forwardRef(() => PaymentModule)],
  controllers: [DonsController],
  providers: [DonsService],
  exports: [DonsService],
})
export class DonsModule {}