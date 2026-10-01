import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
import { LayoutDashboard, Wallet, PlusCircle, Bell, UserCircle, ShieldCheck, Compass } from 'lucide-react';
import EspaceLayout from '../layout/EspaceLayout';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';
import { useVerificationIdentite } from '../../utils/identite';

// Espace organisateur : barre latérale commune (EspaceLayout) avec les liens de l'organisateur.
export default function DashboardLayout({ children }) {
  const { utilisateur } = useAuth();
  const [nbNonLues, setNbNonLues] = useState(0);
  const [erreurNotifications, setErreurNotifications] = useState('');
  const { t } = useTranslation('tableau-de-bord');
  // Point Ambre sur « Mon profil » tant que l'identité n'est pas vérifiée.
  const { verification } = useVerificationIdentite();
  const identiteAVerifier = verification && verification.statut !== 'VALIDEE';

  useEffect(() => {
    api.get('/notifications')
      .then((res) => setNbNonLues(res.data.filter((r) => r.statut === 'NON_LUE').length))
      .catch((err) => setErreurNotifications(err.messageAffichable));
  }, []);

  const liens = [
    { label: t('nav.tableauDeBord'), href: '/dashboard', icon: LayoutDashboard },
    { label: t('nav.mesCagnottes'), href: '/mes-cagnottes', icon: Wallet },
    { label: t('nav.creer'), href: '/creer-cagnotte', icon: PlusCircle },
    { label: t('nav.notifications'), href: '/notifications', icon: Bell, compteur: nbNonLues },
    {
      label: t('nav.profil'),
      href: '/compte',
      icon: UserCircle,
      pastille: identiteAVerifier ? t('identite:pastille') : undefined,
      actifSi: (chemin) => chemin === '/compte' || chemin === '/verification-identite',
    },
  ];
  if (utilisateur?.roles?.includes('ROLE_ADMIN')) {
    liens.push({ label: t('nav.administration'), href: '/admin/tableau-de-bord', icon: ShieldCheck, actifSi: (chemin) => chemin.startsWith('/admin') });
  }

  // Pages publiques, séparées de l'espace personnel dans la barre latérale.
  const liensSecondaires = [{ label: t('nav.decouvrir'), href: '/cagnottes', icon: Compass }];

  return (
    <EspaceLayout liens={liens} liensSecondaires={liensSecondaires}>
      {erreurNotifications && (
        <p className="mb-6 text-sm text-destructive">{t('nav.erreurNotifications', { detail: erreurNotifications })}</p>
      )}
      {children}
    </EspaceLayout>
  );
}
