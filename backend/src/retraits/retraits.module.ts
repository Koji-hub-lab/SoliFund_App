import { Module } from '@nestjs/common';
import { RetraitsController } from './retraits.controller';
import { RetraitsService } from './retraits.service';

@Module({
  controllers: [RetraitsController],
  providers: [RetraitsService],
})
export class RetraitsModule {}
