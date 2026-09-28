import { Module } from '@nestjs/common';
import { CagnottesController } from './cagnottes.controller';
import { CagnottesService } from './cagnottes.service';
import { UploadsModule } from '../uploads/uploads.module';

@Module({
  imports: [UploadsModule],
  controllers: [CagnottesController],
  providers: [CagnottesService],
})
export class CagnottesModule {}
