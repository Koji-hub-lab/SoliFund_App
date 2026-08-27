import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Wallet, PlusCircle, Bell, UserCircle, LogOut, Menu, X, HeartHandshake, ArrowLeft } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';

const liensNav = [
  { label: 'Tableau de bord', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Mes cagnottes', href: '/mes-cagnottes', icon: Wallet },
  { label: 'Créer une cagnotte', href: '/creer-cagnotte', icon: PlusCircle },
  { label: 'Notifications', href: '/notifications', icon: Bell },
  { label: 'Mon profil', href: '/compte', icon: UserCircle },
];

export default function DashboardLayout({ children }) {
  const { utilisateur, deconnecter } = useAuth();
  const location = useLocation();
  const [ouvert, setOuvert] = useState(false);
  const [nbNonLues, setNbNonLues] = useState(0);

  useEffect(() => {
    api.get('/notifications').then((res) => {
      setNbNonLues(res.data.filter((r) => r.statut === 'NON_LUE').length);
    });
  }, []);

  const ContenuSidebar = () => (
    <>
      <Link to="/" className="flex items-center gap-2 px-6 py-5">
        <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <HeartHandshake className="size-5" />
        </span>
        <span className="text-lg font-bold tracking-tight text-foreground">
          Soli<span className="text-primary">fund</span>
        </span>
      </Link>

      <nav className="flex flex-1 flex-col gap-1 px-3">
        {liensNav.map((lien) => {
          const Icon = lien.icon;
          const actif = location.pathname === lien.href;
          return (
            <Link
              key={lien.href}
              to={lien.href}
              onClick={() => setOuvert(false)}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                actif ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
              }`}
            >
              <Icon className="size-4.5" />
              {lien.label}
              {lien.href === '/notifications' && nbNonLues > 0 && (
                <span className="ml-auto rounded-full bg-primary px-2 py-0.5 text-xs font-semibold text-primary-foreground">
                  {nbNonLues}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border px-3 py-4">
        <Link to="/" className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground">
          <ArrowLeft className="size-4.5" />
          Retour au site
        </Link>
        <button onClick={deconnecter} className="flex w-full items-center gap-3 rounded-lg bg-transparent px-3 py-2.5 text-left text-sm font-medium text-destructive hover:bg-destructive/10">
          <LogOut className="size-4.5" />
          Déconnexion
        </button>
      </div>
    </>
  );

  return (
    <div className="flex min-h-screen bg-secondary">
      {/* Sidebar desktop */}
      <aside className="sticky top-0 hidden h-screen w-64 flex-col border-r border-border bg-background lg:flex">
        <ContenuSidebar />
      </aside>

      {/* Sidebar mobile (overlay) */}
      {ouvert && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOuvert(false)} />
          <aside className="absolute left-0 top-0 flex h-full w-64 flex-col bg-background">
            <ContenuSidebar />
          </aside>
        </div>
      )}

      <div className="flex flex-1 flex-col">
        {/* Top bar mobile */}
        <div className="flex items-center justify-between border-b border-border bg-background px-4 py-3 lg:hidden">
          <span className="font-bold text-foreground">
            Bonjour, {utilisateur?.prenom}
          </span>
          <button onClick={() => setOuvert(true)} className="rounded-lg border border-border p-2">
            <Menu className="size-5" />
          </button>
        </div>

        <main className="flex-1 p-4 sm:p-6 lg:p-10">{children}</main>
      </div>
    </div>
  );
}