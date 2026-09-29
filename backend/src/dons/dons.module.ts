import { Module } from '@nestjs/common';
import { DonsController } from './dons.controller';
import { DonsService } from './dons.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { CagnottesModule } from '../cagnottes/cagnottes.module';

@Module({
  imports: [NotificationsModule, CagnottesModule],
  controllers: [DonsController],
  providers: [DonsService],
  exports: [DonsService],
})
export class DonsModule {}
