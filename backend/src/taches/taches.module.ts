import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { DonsModule } from '../dons/dons.module';
import { RetraitsModule } from '../retraits/retraits.module';
import { VerificationIdentiteModule } from '../verification-identite/verification-identite.module';
import { AlertesAdminModule } from '../alertes-admin/alertes-admin.module';
import { TachesService } from './taches.service';

@Module({
  imports: [
    NotificationsModule,
    DonsModule,
    RetraitsModule,
    VerificationIdentiteModule,
    AlertesAdminModule,
  ],
  providers: [TachesService],
  exports: [TachesService],
})
export class TachesModule {}
