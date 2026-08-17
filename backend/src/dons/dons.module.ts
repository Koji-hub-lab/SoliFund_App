import { Module } from '@nestjs/common';
import { DonsController } from './dons.controller';
import { DonsService } from './dons.service';

@Module({
  controllers: [DonsController],
  providers: [DonsService]
})
export class DonsModule {}
