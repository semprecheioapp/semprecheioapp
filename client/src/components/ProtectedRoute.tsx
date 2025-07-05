import React from 'react';
import { Route, useLocation } from 'wouter';
import { useAuth } from '@/lib/auth';

interface ProtectedRouteProps {
  component: React.ComponentType<any>;
  path: string;
  allowedRoles: string[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ component: Component, path, allowedRoles }) => {
  const { isAuthenticated, role, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  return (
    <Route
      path={path}
      component={() => {
        console.log('ProtectedRoute - Path:', path);
        console.log('ProtectedRoute - IsAuthenticated:', isAuthenticated);
        console.log('ProtectedRoute - Role:', role);
        console.log('ProtectedRoute - AllowedRoles:', allowedRoles);

        if (isLoading) {
          return <div>Carregando...</div>;
        }

        if (!isAuthenticated) {
          console.log('ProtectedRoute - Not authenticated, redirecting to /login');
          setLocation('/login');
          return null;
        }

        // Ensure role is not null before checking includes
        if (role === null || !allowedRoles.includes(role)) {
          console.log('ProtectedRoute - Role not allowed, redirecting to /acesso-negado');
          setLocation('/acesso-negado');
          return null;
        }

        return <Component />;
      }}
    />
  );
};

export default ProtectedRoute;
