import { Navigate, useLocation } from 'react-router-dom';
import useAuthStore from '../store/authStore';

export function ProtectedRoute({ children, adminOnly = false }) {
  const { isAuthenticated, user } = useAuthStore();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to={`/login?redirect=${location.pathname}`} replace />;
  }

  // Admin access validation
  if (adminOnly && user?.role && !['admin', 'manager'].includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return children;
}
