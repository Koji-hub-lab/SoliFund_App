import { Module } from '@nestjs/common';
import { CagnottesController } from './cagnottes.controller';
import { CagnottesService } from './cagnottes.service';
import { PublicationCagnottesService } from './publication-cagnottes.service';
import { RisqueCagnotteService } from './risque-cagnotte.service';
import { UploadsModule } from '../uploads/uploads.module';
import { RetraitsModule } from '../retraits/retraits.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { AlertesAdminModule } from '../alertes-admin/alertes-admin.module';

@Module({
  imports: [
    UploadsModule,
    RetraitsModule,
    NotificationsModule,
    AlertesAdminModule,
  ],
  controllers: [CagnottesController],
  providers: [
    CagnottesService,
    RisqueCagnotteService,
    PublicationCagnottesService,
  ],
  exports: [CagnottesService, PublicationCagnottesService],
})
export class CagnottesModule {}
