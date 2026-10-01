import {
  Body,
  Controller,
  ForbiddenException,
  Headers,
  HttpCode,
  Logger,
  Param,
  Post,
  Req,
} from '@nestjs/common';
import { timingSafeEqual } from 'crypto';
import type { RawBodyRequest } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiExcludeController } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import type { Request } from 'express';
import { signatureValide } from './notchpay.signature';
import { NotchPayWebhookService } from './notchpay-webhook.service';
import { AangaraaWebhookService } from './aangaraa-webhook.service';

// Webhook de Notch Pay : route publique, authentifiée uniquement par la signature du corps.
// Réponses : 200 (événement traité, déjà traité, inconnu ou ignoré), 403 (signature absente ou
// invalide, hash non configuré), 500 (erreur interne : Notch Pay renverra l'événement).
@ApiExcludeController()
@SkipThrottle()
@Controller('paiements/webhook')
export class NotchPayWebhookController {
  private readonly logger = new Logger('WebhookNotchPay');
  private readonly hash?: string;
  private readonly jetonAangaraa?: string;

  constructor(
    config: ConfigService,
    private readonly service: NotchPayWebhookService,
    private readonly aangaraa: AangaraaWebhookService,
  ) {
    this.hash = config.get<string>('NOTCHPAY_WEBHOOK_HASH') || undefined;
    this.jetonAangaraa =
      config.get<string>('AANGARAA_WEBHOOK_JETON') || undefined;
  }

  @Post('notchpay')
  @HttpCode(200)
  async recevoir(
    @Req() requete: RawBodyRequest<Request>,
    @Headers('x-notch-signature') signature: string | undefined,
    @Body() corps: unknown,
  ) {
    // La signature porte sur le corps brut (rawBody, activé dans main.ts), jamais sur le JSON
    // re-sérialisé.
    if (!signatureValide(requete.rawBody, signature, this.hash)) {
      this.logger.warn(
        this.hash
          ? 'Webhook refusé : signature absente ou invalide.'
          : 'Webhook refusé : NOTCHPAY_WEBHOOK_HASH non configuré.',
      );
      throw new ForbiddenException();
    }
    const resultat = await this.service.traiter(corps, requete.rawBody!);
    return { recu: true, resultat };
  }

  // Webhook d'AangaraaPay. AangaraaPay ne signe pas ses notifications : l'adresse contient un
  // jeton secret (AANGARAA_WEBHOOK_JETON, inclus dans notify_url), et le contenu n'est jamais cru
  // (le statut est reconsulté par l'API, voir AangaraaWebhookService). Jeton absent ou incorrect :
  // 403. Limite de requêtes par adresse IP comme le reste de l'API.
  @Post('aangaraa')
  @SkipThrottle({ default: false })
  recevoirAangaraaSansJeton(): never {
    this.logger.warn('Notification AangaraaPay refusée : jeton absent.');
    throw new ForbiddenException();
  }

  @Post('aangaraa/:jeton')
  @SkipThrottle({ default: false })
  @HttpCode(200)
  async recevoirAangaraa(
    @Req() requete: RawBodyRequest<Request>,
    @Param('jeton') jeton: string,
    @Body() corps: unknown,
  ) {
    if (!jetonValide(jeton, this.jetonAangaraa)) {
      this.logger.warn(
        this.jetonAangaraa
          ? 'Notification AangaraaPay refusée : jeton incorrect.'
          : 'Notification AangaraaPay refusée : AANGARAA_WEBHOOK_JETON non configuré.',
      );
      throw new ForbiddenException();
    }
    const resultat = await this.aangaraa.traiter(
      corps,
      requete.rawBody ?? Buffer.from(JSON.stringify(corps ?? {})),
    );
    return { recu: true, resultat };
  }
}

// Comparaison en temps constant, après avoir vérifié les longueurs (timingSafeEqual l'exige).
function jetonValide(recu: string, attendu: string | undefined): boolean {
  if (!attendu || !recu) return false;
  const a = Buffer.from(recu, 'utf8');
  const b = Buffer.from(attendu, 'utf8');
  return a.length === b.length && timingSafeEqual(a, b);
}
