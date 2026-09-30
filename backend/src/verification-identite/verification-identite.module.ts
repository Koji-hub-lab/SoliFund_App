import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { UploadsModule } from '../uploads/uploads.module';
import { AlertesAdminModule } from '../alertes-admin/alertes-admin.module';
import { CagnottesModule } from '../cagnottes/cagnottes.module';
import { VerificationIdentiteAdminController } from './verification-identite-admin.controller';
import { VerificationIdentiteController } from './verification-identite.controller';
import { VerificationIdentiteService } from './verification-identite.service';

@Module({
  imports: [
    NotificationsModule,
    UploadsModule,
    AlertesAdminModule,
    CagnottesModule,
  ],
  controllers: [
    VerificationIdentiteController,
    VerificationIdentiteAdminController,
  ],
  providers: [VerificationIdentiteService],
})
export class VerificationIdentiteModule {}
