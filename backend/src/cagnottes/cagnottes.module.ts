import { Module } from '@nestjs/common';
import { CagnottesController } from './cagnottes.controller';
import { CagnottesService } from './cagnottes.service';
import { UploadsModule } from '../uploads/uploads.module';
import { RetraitsModule } from '../retraits/retraits.module';

@Module({
  imports: [UploadsModule, RetraitsModule],
  controllers: [CagnottesController],
  providers: [CagnottesService],
  exports: [CagnottesService],
})
export class CagnottesModule {}
