import { useState, useEffect } from 'react';
import { LayoutDashboard, Wallet, PlusCircle, Bell, UserCircle, ShieldCheck, Compass } from 'lucide-react';
import EspaceLayout from '../layout/EspaceLayout';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';

// Espace organisateur : barre latérale commune (EspaceLayout) avec les liens de l'organisateur.
export default function DashboardLayout({ children }) {
  const { utilisateur } = useAuth();
  const [nbNonLues, setNbNonLues] = useState(0);
  const [erreurNotifications, setErreurNotifications] = useState('');

  useEffect(() => {
    api.get('/notifications')
      .then((res) => setNbNonLues(res.data.filter((r) => r.statut === 'NON_LUE').length))
      .catch((err) => setErreurNotifications(err.messageAffichable));
  }, []);

  const liens = [
    { label: 'Tableau de bord', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Mes cagnottes', href: '/mes-cagnottes', icon: Wallet },
    { label: 'Créer une cagnotte', href: '/creer-cagnotte', icon: PlusCircle },
    { label: 'Notifications', href: '/notifications', icon: Bell, compteur: nbNonLues },
    { label: 'Mon profil', href: '/compte', icon: UserCircle },
  ];
  if (utilisateur?.roles?.includes('ROLE_ADMIN')) {
    liens.push({ label: 'Administration', href: '/admin/tableau-de-bord', icon: ShieldCheck, actifSi: (chemin) => chemin.startsWith('/admin') });
  }

  // Pages publiques, séparées de l'espace personnel dans la barre latérale.
  const liensSecondaires = [{ label: 'Découvrir les cagnottes', href: '/cagnottes', icon: Compass }];

  return (
    <EspaceLayout liens={liens} liensSecondaires={liensSecondaires}>
      {erreurNotifications && (
        <p className="mb-6 text-sm text-destructive">Vos notifications n'ont pas pu être vérifiées. {erreurNotifications}</p>
      )}
      {children}
    </EspaceLayout>
  );
}
