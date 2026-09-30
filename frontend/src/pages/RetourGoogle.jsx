import { useTranslation } from 'react-i18next';
import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { SymboleNjangi } from '../components/Logo';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

// Retour de la connexion avec Google : le backend redirige ici avec le jeton dans le fragment
// (#token=...), jamais envoyé à un serveur. On l'efface de l'adresse, on charge le profil, puis on
// ouvre le tableau de bord.
export default function RetourGoogle() {
  const navigate = useNavigate();
  const { connecter } = useAuth();
  const { t } = useTranslation('auth');
  // En développement, React exécute l'effet deux fois : le jeton n'est lu qu'une seule fois.
  const dejaTraite = useRef(false);

  useEffect(() => {
    if (dejaTraite.current) return;
    dejaTraite.current = true;

    const jeton = new URLSearchParams(window.location.hash.slice(1)).get('token');
    window.history.replaceState(null, '', window.location.pathname);
    if (!jeton) {
      navigate('/login?erreur=google', { replace: true });
      return;
    }

    // Le jeton est enregistré avant l'appel : l'intercepteur axios l'ajoute à la requête.
    localStorage.setItem('token', jeton);
    api.get('/utilisateurs/moi')
      .then((res) => {
        connecter(jeton, res.data);
        navigate('/dashboard', { replace: true });
      })
      .catch(() => {
        localStorage.removeItem('token');
        navigate('/login?erreur=google', { replace: true });
      });
  }, [connecter, navigate]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background px-5 text-center">
      <SymboleNjangi taille={96} />
      <p className="font-display text-2xl font-bold text-foreground" role="status">
        {t('google.enCours')}
      </p>
    </main>
  );
}
