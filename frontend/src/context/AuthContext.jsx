import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import api from '../api/axios';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [utilisateur, setUtilisateur] = useState(() => {
    const stocke = localStorage.getItem('utilisateur');
    return stocke ? JSON.parse(stocke) : null;
  });

  function connecter(token, utilisateurConnecte) {
    localStorage.setItem('token', token);
    localStorage.setItem('utilisateur', JSON.stringify(utilisateurConnecte));
    setUtilisateur(utilisateurConnecte);
  }

  const deconnecter = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('utilisateur');
    setUtilisateur(null);
  }, []);

  // Recharge le profil depuis le serveur (rôles, est_verifie, téléphone...) et met à jour la copie
  // locale. Renvoie le profil, ou null si la session n'est plus valide (on déconnecte alors).
  const rafraichirUtilisateur = useCallback(async () => {
    try {
      const res = await api.get('/utilisateurs/moi');
      setUtilisateur((actuel) => {
        const aJour = { ...actuel, ...res.data };
        localStorage.setItem('utilisateur', JSON.stringify(aJour));
        return aJour;
      });
      return res.data;
    } catch (err) {
      if (err.response?.status === 401) {
        deconnecter();
        return null;
      }
      throw err;
    }
  }, [deconnecter]);

  // Au chargement de l'application : la copie locale peut dater de la dernière connexion.
  useEffect(() => {
    if (localStorage.getItem('token')) {
      rafraichirUtilisateur().catch(() => {
        // Serveur injoignable : on garde la copie locale.
      });
    }
  }, [rafraichirUtilisateur]);

  return (
    <AuthContext.Provider value={{ utilisateur, connecter, deconnecter, rafraichirUtilisateur }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
