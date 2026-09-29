import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

// Mise en forme commune des emails contenant un code à 6 chiffres.
function gabaritCode(prenom: string, introduction: string, code: string) {
  return `
          <div style="font-family: sans-serif; max-width: 480px; margin: auto;">
            <h2 style="color:#0EA5A0;">Solifund</h2>
            <p>Bonjour ${prenom},</p>
            <p>${introduction}</p>
            <p style="font-size:32px; font-weight:bold; letter-spacing:8px; color:#0EA5A0; text-align:center; padding:16px; background:#F7F9FA; border-radius:12px;">${code}</p>
            <p>Si vous n'êtes pas à l'origine de cette demande, ignorez simplement cet email.</p>
          </div>
        `;
}

@Injectable()
export class BrevoService {
  constructor(private readonly configService: ConfigService) {}

  async envoyerCodeReinitialisation(
    email: string,
    prenom: string,
    code: string,
  ) {
    await this.envoyer(
      email,
      prenom,
      'Votre code de réinitialisation Solifund',
      gabaritCode(
        prenom,
        'Voici votre code pour réinitialiser votre mot de passe (valable 15 minutes) :',
        code,
      ),
    );
  }

  async envoyerCodeVerification(email: string, prenom: string, code: string) {
    await this.envoyer(
      email,
      prenom,
      'Vérifiez votre adresse email Solifund',
      gabaritCode(
        prenom,
        'Voici votre code pour vérifier votre adresse email (valable 30 minutes) :',
        code,
      ),
    );
  }

  private async envoyer(
    email: string,
    prenom: string,
    sujet: string,
    htmlContent: string,
  ) {
    await axios.post(
      'https://api.brevo.com/v3/smtp/email',
      {
        sender: {
          email: this.configService.get<string>('BREVO_SENDER_EMAIL'),
          name: this.configService.get<string>('BREVO_SENDER_NOM'),
        },
        to: [{ email, name: prenom }],
        subject: sujet,
        htmlContent,
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
