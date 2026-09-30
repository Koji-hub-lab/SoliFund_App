import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { BrevoService } from './brevo.service';

// Les emails sont écrits dans la langue préférée du destinataire.
describe('BrevoService', () => {
  const envoi = jest.spyOn(axios, 'post');
  const service = new BrevoService({
    get: () => 'valeur',
  } as unknown as ConfigService);
  const dernierEmail = () =>
    envoi.mock.calls.at(-1)?.[1] as { subject: string; htmlContent: string };

  beforeEach(() => {
    envoi.mockReset();
    envoi.mockResolvedValue({});
  });

  it('envoie le code de vérification en français', async () => {
    await service.envoyerCodeVerification(
      { email: 'a@solifund.test', prenom: 'Awa', langue_preferee: 'fr' },
      '123456',
    );
    expect(dernierEmail().subject).toBe(
      'Vérifiez votre adresse email Solifund',
    );
    expect(dernierEmail().htmlContent).toContain('Bonjour Awa,');
    expect(dernierEmail().htmlContent).toContain('123456');
  });

  it('envoie le code de vérification en anglais', async () => {
    await service.envoyerCodeVerification(
      { email: 'a@solifund.test', prenom: 'Awa', langue_preferee: 'en' },
      '123456',
    );
    expect(dernierEmail().subject).toBe('Verify your SoliFund email address');
    expect(dernierEmail().htmlContent).toContain('Hello Awa,');
    expect(dernierEmail().htmlContent).toContain('valid for 30 minutes');
  });

  it('envoie le code de réinitialisation en anglais', async () => {
    await service.envoyerCodeReinitialisation(
      { email: 'a@solifund.test', prenom: '<b>Awa</b>', langue_preferee: 'en' },
      '654321',
    );
    expect(dernierEmail().subject).toBe('Your SoliFund password reset code');
    // Le prénom vient de l'utilisateur : il est échappé.
    expect(dernierEmail().htmlContent).toContain(
      'Hello &lt;b&gt;Awa&lt;/b&gt;,',
    );
  });
});
