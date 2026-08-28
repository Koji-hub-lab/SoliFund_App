import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import api from './api/axios';
import RouteProtegee from './components/RouteProtegee';
import Accueil from './pages/Accueil';
import AuthPage from './pages/AuthPage';
import ListeCagnottes from './pages/ListeCagnottes';
import DetailCagnotte from './pages/DetailCagnotte';
import CreerCagnotte from './pages/CreerCagnotte';
import ModifierCagnotte from './pages/ModifierCagnotte';
import MesCagnottes from './pages/MesCagnottes';
import Notifications from './pages/Notifications';
import Compte from './pages/Compte';
import NonTrouve from './pages/NonTrouve';
import Dashboard from './pages/Dashboard';
import MotDePasseOublie from './pages/MotDePasseOublie';
import AdminRoute from './components/AdminRoute';
import AdminRetraits from './pages/admin/AdminRetraits';

function Nav() {
  const { utilisateur, deconnecter } = useAuth();
  const [nbNonLues, setNbNonLues] = useState(0);

  useEffect(() => {
    if (!utilisateur) return;
    api.get('/notifications').then((res) => {
      setNbNonLues(res.data.filter((r) => r.statut === 'NON_LUE').length);
    });
  }, [utilisateur]);

  return (
    <div className="nav-app">
      <div className="nav-app-contenu">
        <Link to="/" className="nav-logo">
          <img src="/logo.svg" alt="Solifund" />
          Solifund
        </Link>
        <Link to="/cagnottes-toutes">Toutes les cagnottes</Link>
        {utilisateur && <Link to="/mes-cagnottes">Mes cagnottes</Link>}
        {utilisateur && <Link to="/creer-cagnotte">Créer une cagnotte</Link>}
        {utilisateur && <Link to="/notifications">Notifications {nbNonLues > 0 && `(${nbNonLues})`}</Link>}
        {utilisateur && <Link to="/compte">Mon compte</Link>}
        <span style={{ flex: 1 }}></span>
        {utilisateur ? (
          <button onClick={deconnecter}>Déconnexion</button>
        ) : (
          <Link to="/login">Connexion</Link>
        )}
      </div>
    </div>
  );
}

function ContenuApp() {
  const location = useLocation();
  const pagesSansNavGlobale = ['/', '/login', '/inscription', '/dashboard', '/mes-cagnottes', '/creer-cagnotte', '/notifications', '/compte', '/mot-de-passe-oublie', '/cagnottes-toutes', '/admin/retraits'];
const estDetailCagnotte = /^\/cagnottes\/\d+$/.test(location.pathname);
const estModifierCagnotte = /^\/cagnottes\/\d+\/modifier$/.test(location.pathname);
const surAccueil = pagesSansNavGlobale.includes(location.pathname) || estDetailCagnotte || estModifierCagnotte;
  return (
    <>
      {!surAccueil && <Nav />}
      <Routes>
        <Route path="/" element={<Accueil />} />
        <Route path="/login" element={<AuthPage defaultTab="login" />} />
        <Route path="/inscription" element={<AuthPage defaultTab="signup" />} />
        <Route path="/cagnottes-toutes" element={<ListeCagnottes />} />
        <Route path="/cagnottes/:id" element={<DetailCagnotte />} />
        <Route path="/creer-cagnotte" element={<RouteProtegee><CreerCagnotte /></RouteProtegee>} />
        <Route path="/cagnottes/:id/modifier" element={<RouteProtegee><ModifierCagnotte /></RouteProtegee>} />
        <Route path="/mes-cagnottes" element={<RouteProtegee><MesCagnottes /></RouteProtegee>} />
        <Route path="/notifications" element={<RouteProtegee><Notifications /></RouteProtegee>} />
        <Route path="/compte" element={<RouteProtegee><Compte /></RouteProtegee>} />
        <Route path="/mot-de-passe-oublie" element={<MotDePasseOublie />} />
        <Route path="/admin/retraits" element={<AdminRoute><AdminRetraits /></AdminRoute>} />
        <Route path="*" element={<NonTrouve />} />
        <Route path="/dashboard" element={<RouteProtegee><Dashboard /></RouteProtegee>} />
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <ContenuApp />
      </BrowserRouter>
    </AuthProvider>
  );
}