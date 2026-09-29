import { Module } from '@nestjs/common';
import { PartageController } from './partage.controller';
import { PartageService } from './partage.service';
import { CagnottesModule } from '../cagnottes/cagnottes.module';

@Module({
  imports: [CagnottesModule],
  controllers: [PartageController],
  providers: [PartageService],
})
export class PartageModule {}
