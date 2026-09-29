import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { randomBytes, timingSafeEqual } from 'crypto';
import type { Request, Response } from 'express';
import { Profile, Strategy } from 'passport-google-oauth20';
import type { StateStore } from 'passport-oauth2';

// Informations utiles renvoyées par Google après la connexion (voir AuthService.connexionGoogle).
export interface ProfilGoogle {
  google_id: string;
  email: string | null;
  email_verifie: boolean;
  prenom: string | null;
  nom: string | null;
}

export function googleConfigure(config: ConfigService): boolean {
  return [
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET',
    'GOOGLE_CALLBACK_URL',
  ].every((nom) => !!config.get<string>(nom));
}

const COOKIE_ETAT = 'solifund_google_etat';
const DUREE_ETAT_MS = 10 * 60 * 1000;

function lireCookie(req: Request, nom: string): string | null {
  for (const morceau of (req.headers.cookie ?? '').split(';')) {
    const [cle, ...valeur] = morceau.trim().split('=');
    if (cle === nom) return decodeURIComponent(valeur.join('='));
  }
  return null;
}

// Paramètre « state » d'OAuth sans session serveur : une valeur aléatoire est envoyée à Google et
// gardée dans un cookie httpOnly ; au retour, les deux doivent correspondre. Empêche un tiers de
// connecter un visiteur à un autre compte (attaque « login CSRF »).
class EtatParCookie {
  constructor(private readonly securise: boolean) {}

  store(req: Request, rappel: (err: Error | null, etat?: string) => void) {
    const etat = randomBytes(24).toString('base64url');
    (req.res as Response).cookie(COOKIE_ETAT, etat, {
      httpOnly: true,
      sameSite: 'lax',
      secure: this.securise,
      maxAge: DUREE_ETAT_MS,
      path: '/',
    });
    rappel(null, etat);
  }

  verify(
    req: Request,
    etatRecu: string | undefined,
    rappel: (
      err: Error | null,
      ok: boolean,
      info?: { message: string },
    ) => void,
  ) {
    const attendu = lireCookie(req, COOKIE_ETAT);
    (req.res as Response).clearCookie(COOKIE_ETAT, { path: '/' });
    const valide =
      !!attendu &&
      !!etatRecu &&
      attendu.length === etatRecu.length &&
      timingSafeEqual(Buffer.from(attendu), Buffer.from(etatRecu));
    if (!valide) {
      rappel(null, false, { message: 'Paramètre state invalide ou expiré.' });
      return;
    }
    rappel(null, true);
  }
}

// Stratégie « google » : n'est enregistrée que si les trois variables GOOGLE_* sont renseignées
// (voir AuthModule).
@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(config: ConfigService) {
    const callbackURL = config.getOrThrow<string>('GOOGLE_CALLBACK_URL');
    super({
      clientID: config.getOrThrow<string>('GOOGLE_CLIENT_ID'),
      clientSecret: config.getOrThrow<string>('GOOGLE_CLIENT_SECRET'),
      callbackURL,
      scope: ['openid', 'email', 'profile'],
      // passport-oauth2 choisit la signature d'après le nombre de paramètres (store(req, rappel),
      // verify(req, state, rappel)) ; ses types ne décrivent que les surcharges : conversion nécessaire.
      store: new EtatParCookie(
        callbackURL.startsWith('https://'),
      ) as unknown as StateStore,
    });
  }

  // Le compte SoliFund est trouvé ou créé ensuite, dans AuthService.connexionGoogle.
  validate(
    _accessToken: string,
    _refreshToken: string,
    profil: Profile,
  ): ProfilGoogle {
    const donnees = profil._json;
    return {
      google_id: profil.id,
      email: donnees.email?.toLowerCase() ?? null,
      // Selon les versions, Google renvoie un booléen ou la chaîne « true ».
      email_verifie: String(donnees.email_verified) === 'true',
      prenom: donnees.given_name ?? profil.displayName ?? null,
      nom: donnees.family_name ?? null,
    };
  }
}
