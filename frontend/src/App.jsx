import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
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
import AdminUtilisateurs from './pages/admin/AdminUtilisateurs';

function ContenuApp() {
  return (
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
      <Route path="/admin/utilisateurs" element={<AdminRoute><AdminUtilisateurs /></AdminRoute>} />
      <Route path="*" element={<NonTrouve />} />
      <Route path="/dashboard" element={<RouteProtegee><Dashboard /></RouteProtegee>} />
    </Routes>
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