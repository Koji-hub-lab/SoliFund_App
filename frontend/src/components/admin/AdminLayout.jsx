import { useTranslation } from 'react-i18next';
import { Wallet, Users, LayoutDashboard, PiggyBank, ArrowLeftRight, Tags, Flag, Coins } from 'lucide-react';
import EspaceLayout from '../layout/EspaceLayout';

// Espace administrateur : même barre latérale que l'organisateur, avec l'étiquette « Administration ».
export default function AdminLayout({ children }) {
  const { t } = useTranslation('admin');
  const liens = [
    { label: t('nav.tableauDeBord'), href: '/admin/tableau-de-bord', icon: LayoutDashboard },
    { label: t('nav.cagnottes'), href: '/admin/cagnottes', icon: PiggyBank },
    { label: t('nav.signalements'), href: '/admin/signalements', icon: Flag },
    { label: t('nav.retraits'), href: '/admin/retraits', icon: Wallet },
    { label: t('nav.revenus'), href: '/admin/revenus', icon: Coins },
    { label: t('nav.utilisateurs'), href: '/admin/utilisateurs', icon: Users },
    { label: t('nav.categories'), href: '/admin/categories', icon: Tags },
    { label: t('nav.espaceOrganisateur'), href: '/dashboard', icon: ArrowLeftRight },
  ];

  return (
    <EspaceLayout
      liens={liens}
      lienLogo="/admin/tableau-de-bord"
      etiquette={<span className="inline-flex rounded-full bg-accent-soft px-3 py-1 text-xs font-bold text-[#7A5312]">{t('nav.etiquette')}</span>}
    >
      {children}
    </EspaceLayout>
  );
}
