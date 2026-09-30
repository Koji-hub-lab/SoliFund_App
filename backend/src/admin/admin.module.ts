import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { RevenusService } from './revenus.service';
import { CagnottesModule } from '../cagnottes/cagnottes.module';
import { SignalementsModule } from '../signalements/signalements.module';

@Module({
  imports: [NotificationsModule, CagnottesModule, SignalementsModule],
  controllers: [AdminController],
  providers: [AdminService, RevenusService],
})
export class AdminModule {}
