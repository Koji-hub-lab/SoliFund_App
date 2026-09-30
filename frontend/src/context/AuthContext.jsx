import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import api from '../api/axios';
import i18n, { langueActive } from '../i18n';

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

  // La langue de l'interface est enregistrée dans le compte (langue_preferee) : les emails sont
  // envoyés dans cette langue. Vérifié à la connexion et à chaque changement de langue.
  const idUtilisateur = utilisateur?.id_utilisateur;
  const langueDuCompte = utilisateur?.langue_preferee;
  useEffect(() => {
    // Copie locale sans langue (ancienne session) : on attend le profil rechargé du serveur.
    if (!idUtilisateur || !langueDuCompte) return undefined;
    function enregistrer(langue) {
      if (langue === langueDuCompte) return;
      api.patch('/utilisateurs/moi', { langue_preferee: langue })
        .then((res) => {
          setUtilisateur((actuel) => {
            if (!actuel) return actuel;
            const aJour = { ...actuel, langue_preferee: res.data.langue_preferee };
            localStorage.setItem('utilisateur', JSON.stringify(aJour));
            return aJour;
          });
        })
        .catch(() => {
          // Sans gravité : le choix reste mémorisé dans le navigateur et sera renvoyé plus tard.
        });
    }
    enregistrer(langueActive());
    i18n.on('languageChanged', enregistrer);
    return () => i18n.off('languageChanged', enregistrer);
  }, [idUtilisateur, langueDuCompte]);

  return (
    <AuthContext.Provider value={{ utilisateur, connecter, deconnecter, rafraichirUtilisateur }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
