import { Module } from '@nestjs/common';
import { CagnottesController } from './cagnottes.controller';
import { CagnottesService } from './cagnottes.service';

@Module({
  controllers: [CagnottesController],
  providers: [CagnottesService]
})
export class CagnottesModule {}
