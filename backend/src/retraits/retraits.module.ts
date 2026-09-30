import { Module } from '@nestjs/common';
import { RetraitsController } from './retraits.controller';
import { RetraitsService } from './retraits.service';
import { CommissionController } from './commission.controller';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  controllers: [RetraitsController, CommissionController],
  providers: [RetraitsService],
  exports: [RetraitsService],
})
export class RetraitsModule {}
