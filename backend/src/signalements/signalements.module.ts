import { Module } from '@nestjs/common';
import { AlertesAdminModule } from '../alertes-admin/alertes-admin.module';
import { CagnottesModule } from '../cagnottes/cagnottes.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { SignalementsController } from './signalements.controller';
import { SignalementsService } from './signalements.service';

@Module({
  imports: [CagnottesModule, NotificationsModule, AlertesAdminModule],
  controllers: [SignalementsController],
  providers: [SignalementsService],
  exports: [SignalementsService],
})
export class SignalementsModule {}
