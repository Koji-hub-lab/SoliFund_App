import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import api from './api/axios';
import RouteProtegee from './components/RouteProtegee';
import Login from './pages/Login';
import Inscription from './pages/Inscription';
import ListeCagnottes from './pages/ListeCagnottes';
import DetailCagnotte from './pages/DetailCagnotte';
import CreerCagnotte from './pages/CreerCagnotte';
import MesCagnottes from './pages/MesCagnottes';
import Notifications from './pages/Notifications';
import Compte from './pages/Compte';
import NonTrouve from './pages/NonTrouve';
import ModifierCagnotte from './pages/ModifierCagnotte';

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
        <Link to="/">Accueil</Link>
        {utilisateur && <Link to="/mes-cagnottes">Mes cagnottes</Link>}
        {utilisateur && <Link to="/creer-cagnotte">Créer une cagnotte</Link>}
        {utilisateur && (
          <Link to="/notifications">
            Notifications {nbNonLues > 0 && `(${nbNonLues})`}
          </Link>
        )}
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

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Nav />
        <Routes>
          <Route path="/" element={<ListeCagnottes />} />
          <Route path="/login" element={<Login />} />
          <Route path="/inscription" element={<Inscription />} />
          <Route path="/cagnottes/:id" element={<DetailCagnotte />} />
          <Route path="/cagnottes/:id/modifier" element={<RouteProtegee><ModifierCagnotte /></RouteProtegee>} />
          <Route path="/creer-cagnotte" element={<CreerCagnotte />} />
          <Route path="/mes-cagnottes" element={<MesCagnottes />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/compte" element={<Compte />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}