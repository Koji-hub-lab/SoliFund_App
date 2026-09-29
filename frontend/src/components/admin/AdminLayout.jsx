import { Wallet, Users, LayoutDashboard, PiggyBank, ArrowLeftRight, Tags } from 'lucide-react';
import EspaceLayout from '../layout/EspaceLayout';

const liens = [
  { label: 'Tableau de bord', href: '/admin/tableau-de-bord', icon: LayoutDashboard },
  { label: 'Cagnottes', href: '/admin/cagnottes', icon: PiggyBank },
  { label: 'Retraits', href: '/admin/retraits', icon: Wallet },
  { label: 'Utilisateurs', href: '/admin/utilisateurs', icon: Users },
  { label: 'Catégories', href: '/admin/categories', icon: Tags },
  { label: 'Espace organisateur', href: '/dashboard', icon: ArrowLeftRight },
];

// Espace administrateur : même barre latérale que l'organisateur, avec l'étiquette « Administration ».
export default function AdminLayout({ children }) {
  return (
    <EspaceLayout
      liens={liens}
      lienLogo="/admin/tableau-de-bord"
      etiquette={<span className="inline-flex rounded-full bg-accent-soft px-3 py-1 text-xs font-bold text-[#7A5312]">Administration</span>}
    >
      {children}
    </EspaceLayout>
  );
}
