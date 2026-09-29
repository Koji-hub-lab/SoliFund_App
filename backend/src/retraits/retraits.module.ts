import { Module } from '@nestjs/common';
import { RetraitsController } from './retraits.controller';
import { RetraitsService } from './retraits.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  controllers: [RetraitsController],
  providers: [RetraitsService],
  exports: [RetraitsService],
})
export class RetraitsModule {}
