import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class BrevoService {
  constructor(private readonly configService: ConfigService) {}

  async envoyerEmailReinitialisation(email: string, prenom: string, lien: string) {
    await axios.post(
      'https://api.brevo.com/v3/smtp/email',
      {
        sender: {
          email: this.configService.get<string>('BREVO_SENDER_EMAIL'),
          name: this.configService.get<string>('BREVO_SENDER_NOM'),
        },
        to: [{ email, name: prenom }],
        subject: 'Réinitialise ton mot de passe Solifund',
        htmlContent: `
          <div style="font-family: sans-serif; max-width: 480px; margin: auto;">
            <h2 style="color:#0EA5A0;">Solifund</h2>
            <p>Bonjour ${prenom},</p>
            <p>Tu as demandé à réinitialiser ton mot de passe. Clique sur le lien ci-dessous (valable 1 heure) :</p>
            <p><a href="${lien}" style="background:#0EA5A0;color:white;padding:10px 20px;border-radius:8px;text-decoration:none;">Réinitialiser mon mot de passe</a></p>
            <p>Si tu n'es pas à l'origine de cette demande, ignore simplement cet email.</p>
          </div>
        `,
      },
      {
        headers: {
          'api-key': this.configService.get<string>('BREVO_API_KEY'),
          'Content-Type': 'application/json',
        },
      },
    );
  }
}