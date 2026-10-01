import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { DonsModule } from '../dons/dons.module';
import { RetraitsModule } from '../retraits/retraits.module';
import { TachesService } from './taches.service';

@Module({
  imports: [NotificationsModule, DonsModule, RetraitsModule],
  providers: [TachesService],
})
export class TachesModule {}
