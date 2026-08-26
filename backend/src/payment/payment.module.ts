import { Module } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { PaymentController } from './payment.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { ConfigModule } from '@nestjs/config';
import { DonsModule } from '../dons/dons.module';

@Module({
  imports: [PrismaModule, ConfigModule, DonsModule],
  providers: [PaymentService],
  controllers: [PaymentController],
})
export class PaymentModule {}
