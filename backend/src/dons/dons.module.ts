import { Module } from '@nestjs/common';
import { DonsController } from './dons.controller';
import { DonsService } from './dons.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  controllers: [DonsController],
  providers: [DonsService],
  exports: [DonsService],
})
export class DonsModule {}
