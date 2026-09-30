import { Module } from '@nestjs/common';
import { JetonsModule } from '../jetons/jetons.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { AlertesAdminService } from './alertes-admin.service';

@Module({
  imports: [NotificationsModule, JetonsModule],
  providers: [AlertesAdminService],
  exports: [AlertesAdminService],
})
export class AlertesAdminModule {}
