import { Module } from '@nestjs/common';
import { CommentairesController } from './commentaires.controller';
import { CommentairesService } from './commentaires.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { CagnottesModule } from '../cagnottes/cagnottes.module';

@Module({
  imports: [CagnottesModule, NotificationsModule],
  controllers: [CommentairesController],
  providers: [CommentairesService],
})
export class CommentairesModule {}
