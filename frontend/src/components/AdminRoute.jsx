import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function AdminRoute({ children }) {
  const { utilisateur } = useAuth();
  if (!utilisateur) {
    return <Navigate to="/login" replace />;
  }
  if (!utilisateur.roles?.includes('ROLE_ADMIN')) {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
}