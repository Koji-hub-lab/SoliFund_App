import { Body, Controller, Post } from '@nestjs/common';
import { DonsService } from '../dons/dons.service';

@Controller('payment')
export class PaymentController {
  constructor(private readonly donsService: DonsService) {}

  @Post('webhook/aangaraa')
  async webhook(@Body() body: any) {
    await this.donsService.gererWebhookPaiement(body.transaction_id, body.status);
    return { received: true };
  }
}