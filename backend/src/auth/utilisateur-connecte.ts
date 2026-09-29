import type { Request } from 'express';

// Utilisateur placé dans req.user par JwtStrategy.validate (rechargé en base à chaque requête).
export interface UtilisateurConnecte {
  id_utilisateur: number;
  email: string;
  est_verifie: boolean;
  roles: string[];
}

// Requête d'une route protégée par JwtAuthGuard : req.user est toujours rempli.
export interface RequeteAuthentifiee extends Request {
  user: UtilisateurConnecte;
}

// Requête d'une route protégée par OptionalJwtAuthGuard : req.user vaut null pour un visiteur.
export interface RequeteOptionnelle extends Omit<Request, 'user'> {
  user?: UtilisateurConnecte | null;
}
