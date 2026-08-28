import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class BrevoService {
  constructor(private readonly configService: ConfigService) {}

  async envoyerCodeReinitialisation(email: string, prenom: string, code: string) {
    await axios.post(
      'https://api.brevo.com/v3/smtp/email',
      {
        sender: {
          email: this.configService.get<string>('BREVO_SENDER_EMAIL'),
          name: this.configService.get<string>('BREVO_SENDER_NOM'),
        },
        to: [{ email, name: prenom }],
        subject: 'Ton code de réinitialisation Solifund',
        htmlContent: `
          <div style="font-family: sans-serif; max-width: 480px; margin: auto;">
            <h2 style="color:#0EA5A0;">Solifund</h2>
            <p>Bonjour ${prenom},</p>
            <p>Voici ton code pour réinitialiser ton mot de passe (valable 15 minutes) :</p>
            <p style="font-size:32px; font-weight:bold; letter-spacing:8px; color:#0EA5A0; text-align:center; padding:16px; background:#F7F9FA; border-radius:12px;">${code}</p>
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