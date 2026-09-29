import { Module } from '@nestjs/common';
import { ActualitesController } from './actualites.controller';
import { ActualitesService } from './actualites.service';
import { CagnottesModule } from '../cagnottes/cagnottes.module';

@Module({
  imports: [CagnottesModule],
  controllers: [ActualitesController],
  providers: [ActualitesService],
})
export class ActualitesModule {}
