import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function RouteProtegee({ children }) {
  const { utilisateur } = useAuth();
  if (!utilisateur) {
    return <Navigate to="/login" replace />;
  }
  return children;
}