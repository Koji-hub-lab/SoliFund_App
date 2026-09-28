import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { TachesService } from './taches.service';

@Module({
  imports: [NotificationsModule],
  providers: [TachesService],
})
export class TachesModule {}
