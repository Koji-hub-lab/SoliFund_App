import { useCallback, useEffect, useState } from 'react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

// Statut de la vérification d'identité de l'utilisateur connecté (GET /verification-identite/moi) :
// { statut: 'NON_SOUMISE' } ou { statut, motif_refus, type_piece, telephone_retrait, methode_retrait,
// date_soumission, date_decision }. Gardé en mémoire pendant la visite (barre latérale, profil,
// retraits) ; oublierVerification() force une nouvelle lecture, par exemple après un envoi.
// La mémoire est liée à l'utilisateur connecté : un autre compte ne voit jamais ce statut.

let connue = null;
let demande = null;
let pourUtilisateur = null;
const abonnes = new Set();

function charger(idUtilisateur) {
  if (pourUtilisateur !== idUtilisateur) {
    pourUtilisateur = idUtilisateur;
    connue = null;
    demande = null;
  }
  if (!demande) {
    demande = api.get('/verification-identite/moi').then((res) => {
      connue = res.data;
      abonnes.forEach((f) => f(connue));
      return connue;
    });
    // Échec : on réessaiera au prochain appel.
    demande.catch(() => {
      demande = null;
    });
  }
  return demande;
}

export function oublierVerification(nouvelle = null) {
  connue = nouvelle;
  demande = nouvelle ? Promise.resolve(nouvelle) : null;
  if (nouvelle) abonnes.forEach((f) => f(nouvelle));
}

// { verification (null pendant le chargement), erreur, recharger }
export function useVerificationIdentite() {
  const { utilisateur } = useAuth();
  const idUtilisateur = utilisateur?.id_utilisateur ?? null;
  const [verification, setVerification] = useState(pourUtilisateur === idUtilisateur ? connue : null);
  const [erreur, setErreur] = useState('');

  const recharger = useCallback(() => {
    setErreur('');
    if (!idUtilisateur) return Promise.resolve();
    return charger(idUtilisateur)
      .then((valeur) => setVerification(valeur))
      .catch((err) => setErreur(err.messageAffichable));
  }, [idUtilisateur]);

  useEffect(() => {
    abonnes.add(setVerification);
    recharger();
    return () => {
      abonnes.delete(setVerification);
    };
  }, [recharger]);

  return { verification, erreur, recharger };
}

// Identité utilisable pour créer une cagnotte (soumise : en attente ou validée).
export function identiteSoumise(verification) {
  return verification?.statut === 'EN_ATTENTE' || verification?.statut === 'VALIDEE';
}

// Adresse de la page de vérification, avec la page où revenir après l'envoi.
export function lienVerification(retour) {
  return retour ? `/verification-identite?retour=${encodeURIComponent(retour)}` : '/verification-identite';
}

// Adresse de retour acceptée : une page du site uniquement (jamais un autre domaine).
export function retourSur(retour) {
  return typeof retour === 'string' && retour.startsWith('/') && !retour.startsWith('//') ? retour : null;
}
