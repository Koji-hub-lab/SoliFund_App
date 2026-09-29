import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import RouteProtegee from './components/RouteProtegee';
import AdminRoute from './components/AdminRoute';
import { SqueletteEspace } from './components/ui/Squelette';
// Pages publiques : chargées avec l'application (accueil, cagnottes, connexion).
import Accueil from './pages/Accueil';
import AuthPage from './pages/AuthPage';
import ListeCagnottes from './pages/ListeCagnottes';
import DetailCagnotte from './pages/DetailCagnotte';
import MotDePasseOublie from './pages/MotDePasseOublie';
import NonTrouve from './pages/NonTrouve';
import Conditions from './pages/Conditions';
import Confidentialite from './pages/Confidentialite';

// Espace connecté et administration : code chargé seulement à la première visite de ces pages,
// pour alléger le chargement de l'accueil.
const Dashboard = lazy(() => import('./pages/Dashboard'));
const MesCagnottes = lazy(() => import('./pages/MesCagnottes'));
const GererCagnotte = lazy(() => import('./pages/GererCagnotte'));
const CreerCagnotte = lazy(() => import('./pages/CreerCagnotte'));
const ModifierCagnotte = lazy(() => import('./pages/ModifierCagnotte'));
const Notifications = lazy(() => import('./pages/Notifications'));
const Compte = lazy(() => import('./pages/Compte'));
const AdminTableauDeBord = lazy(() => import('./pages/admin/AdminTableauDeBord'));
const AdminCagnottes = lazy(() => import('./pages/admin/AdminCagnottes'));
const AdminRetraits = lazy(() => import('./pages/admin/AdminRetraits'));
const AdminUtilisateurs = lazy(() => import('./pages/admin/AdminUtilisateurs'));
const AdminCategories = lazy(() => import('./pages/admin/AdminCategories'));

function ContenuApp() {
  return (
    <Suspense fallback={<SqueletteEspace />}>
      <Routes>
        <Route path="/" element={<Accueil />} />
        <Route path="/login" element={<AuthPage defaultTab="login" />} />
        <Route path="/inscription" element={<AuthPage defaultTab="signup" />} />
        <Route path="/cagnottes" element={<ListeCagnottes />} />
        {/* Ancienne adresse de la liste, conservée pour les liens déjà partagés. */}
        <Route path="/cagnottes-toutes" element={<Navigate to="/cagnottes" replace />} />
        <Route path="/cagnottes/:id" element={<DetailCagnotte />} />
        <Route path="/creer-cagnotte" element={<RouteProtegee><CreerCagnotte /></RouteProtegee>} />
        <Route path="/cagnottes/:id/modifier" element={<RouteProtegee><ModifierCagnotte /></RouteProtegee>} />
        <Route path="/mes-cagnottes" element={<RouteProtegee><MesCagnottes /></RouteProtegee>} />
        <Route path="/mes-cagnottes/:id" element={<RouteProtegee><GererCagnotte /></RouteProtegee>} />
        <Route path="/notifications" element={<RouteProtegee><Notifications /></RouteProtegee>} />
        <Route path="/compte" element={<RouteProtegee><Compte /></RouteProtegee>} />
        <Route path="/mot-de-passe-oublie" element={<MotDePasseOublie />} />
        <Route path="/conditions" element={<Conditions />} />
        <Route path="/confidentialite" element={<Confidentialite />} />
        <Route path="/admin/tableau-de-bord" element={<AdminRoute><AdminTableauDeBord /></AdminRoute>} />
        <Route path="/admin/cagnottes" element={<AdminRoute><AdminCagnottes /></AdminRoute>} />
        <Route path="/admin/retraits" element={<AdminRoute><AdminRetraits /></AdminRoute>} />
        <Route path="/admin/utilisateurs" element={<AdminRoute><AdminUtilisateurs /></AdminRoute>} />
        <Route path="/admin/categories" element={<AdminRoute><AdminCategories /></AdminRoute>} />
        <Route path="*" element={<NonTrouve />} />
        <Route path="/dashboard" element={<RouteProtegee><Dashboard /></RouteProtegee>} />
      </Routes>
    </Suspense>
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