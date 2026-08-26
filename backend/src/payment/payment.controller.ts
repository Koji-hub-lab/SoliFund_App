import {
  Body,
  Controller,
  Post,
  Request,
  UseGuards,
  HttpCode,
  HttpStatus,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PaymentService } from './payment.service';
import { InitiatePaymentDto } from './dto/initiate-payment.dto';
import { PrismaService } from '../prisma/prisma.service';

interface WebhookBody {
  id?: string | number;
  status?: string;
}

@Controller('payment')
export class PaymentController {
  constructor(
    private readonly paymentService: PaymentService,
    private readonly prisma: PrismaService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Post('initiate')
  async initiatePayment(@Request() req: any, @Body() dto: InitiatePaymentDto) {
    const donation = await this.prisma.don.findUnique({
      where: { id_don: dto.donationId },
      include: { paiement: true },
    });

    if (!donation) {
      throw new NotFoundException('Donation not found');
    }

    const paiement = donation.paiement;
    if (paiement.statut !== 'EN_ATTENTE') {
      throw new BadRequestException('Payment is not in pending state');
    }

    let paymentUrl: string;
    if (paiement.methode_paiement === 'MTN_MOBILE_MONEY') {
      paymentUrl = await this.paymentService.initiateMtnPayment(
        Number(paiement.montant),
        paiement.devise,
        paiement.numero_payeur!,
        paiement.id_paiement.toString(),
        dto.payerMessage,
        dto.payeeNote,
      );
    } else if (paiement.methode_paiement === 'ORANGE_MONEY') {
      paymentUrl = await this.paymentService.initiateOrangePayment(
        Number(paiement.montant),
        paiement.devise,
        paiement.numero_payeur!,
        paiement.id_paiement.toString(),
        dto.payerMessage,
        dto.payeeNote,
      );
    } else {
      throw new BadRequestException('Unsupported payment method');
    }

    return { paymentUrl };
  }

  @HttpCode(HttpStatus.OK)
  @Post('webhook/mtn')
  async mtnWebhook(@Body() body: WebhookBody) {
    console.log('MTN webhook received:', body);
    const { id: externalId, status } = body;
    const externalIdString =
      externalId !== undefined && externalId !== null
        ? String(externalId)
        : undefined;
    const statusString =
      status !== undefined && status !== null ? status : undefined;
    if (externalIdString && statusString) {
      try {
        await this.paymentService.handleWebhookPayment(
          'MTN',
          Number(externalIdString),
          statusString,
        );
      } catch (error) {
        console.error('Error processing MTN webhook:', error);
      }
    }
    return { status: 'processed' };
  }

  @HttpCode(HttpStatus.OK)
  @Post('webhook/orange')
  async orangeWebhook(@Body() body: WebhookBody) {
    console.log('Orange webhook received:', body);
    const { id: externalId, status } = body;
    const externalIdString =
      externalId !== undefined && externalId !== null
        ? String(externalId)
        : undefined;
    const statusString =
      status !== undefined && status !== null ? status : undefined;
    if (externalIdString && statusString) {
      try {
        await this.paymentService.handleWebhookPayment(
          'ORANGE',
          Number(externalIdString),
          statusString,
        );
      } catch (error) {
        console.error('Error processing Orange webhook:', error);
      }
    }
    return { status: 'processed' };
  }
}
