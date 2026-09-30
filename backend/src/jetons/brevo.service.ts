import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import type { Langue } from '../i18n/langues';
import { traduire } from '../i18n/messages';

// Les textes venant des utilisateurs (prénom, titres de cagnotte, noms) sont échappés.
function echapper(texte: string) {
  return texte
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Mise en forme commune des emails contenant un code à 6 chiffres.
function gabaritCode(
  langue: Langue,
  prenom: string,
  introduction: string,
  code: string,
) {
  return `
          <div style="font-family: sans-serif; max-width: 480px; margin: auto;">
            <h2 style="color:#0EA5A0;">Solifund</h2>
            <p>${traduire(langue, 'emails.bonjour', { prenom: echapper(prenom) })}</p>
            <p>${introduction}</p>
            <p style="font-size:32px; font-weight:bold; letter-spacing:8px; color:#0EA5A0; text-align:center; padding:16px; background:#F7F9FA; border-radius:12px;">${code}</p>
            <p>${traduire(langue, 'emails.ignorer')}</p>
          </div>
        `;
}

type Destinataire = { email: string; prenom: string; langue_preferee: Langue };

// Emails envoyés par Brevo, écrits dans la langue préférée du destinataire (langue_preferee).
@Injectable()
export class BrevoService {
  constructor(private readonly configService: ConfigService) {}

  async envoyerCodeReinitialisation(destinataire: Destinataire, code: string) {
    const langue = destinataire.langue_preferee;
    await this.envoyer(
      destinataire,
      traduire(langue, 'emails.reinitialisation.sujet'),
      gabaritCode(
        langue,
        destinataire.prenom,
        traduire(langue, 'emails.reinitialisation.introduction'),
        code,
      ),
    );
  }

  async envoyerCodeVerification(destinataire: Destinataire, code: string) {
    const langue = destinataire.langue_preferee;
    await this.envoyer(
      destinataire,
      traduire(langue, 'emails.verification.sujet'),
      gabaritCode(
        langue,
        destinataire.prenom,
        traduire(langue, 'emails.verification.introduction'),
        code,
      ),
    );
  }

  // Alerte de modération envoyée à un administrateur : une ligne par événement à traiter, déjà
  // écrite dans sa langue, comme le sujet (voir AlertesAdminService).
  async envoyerAlerteAdmin(
    destinataire: Destinataire,
    sujet: string,
    lignes: string[],
  ) {
    const langue = destinataire.langue_preferee;
    const plusieurs = lignes.length > 1;
    const html = `
          <div style="font-family: sans-serif; max-width: 560px; margin: auto;">
            <h2 style="color:#087F7A;">${traduire(langue, 'emails.alertes.titre')}</h2>
            <p>${traduire(langue, 'emails.alertes.bonjour')}</p>
            <p>${traduire(langue, plusieurs ? 'emails.alertes.introductionPlusieurs' : 'emails.alertes.introductionUn')}</p>
            <ul>${lignes.map((l) => `<li>${echapper(l)}</li>`).join('')}</ul>
            <p>${traduire(langue, 'emails.alertes.conclusion')}</p>
          </div>
        `;
    await this.envoyer(destinataire, sujet, html);
  }

  private async envoyer(
    destinataire: { email: string; prenom: string },
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
        to: [{ email: destinataire.email, name: destinataire.prenom }],
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
