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
        if (isLoading) {
          return <div>Carregando...</div>;
        }

        if (!isAuthenticated) {
          setLocation('/login');
          return null;
        }

        if (!allowedRoles.includes(role)) {
          setLocation('/acesso-negado');
          return null;
        }

        return <Component />;
      }}
    />
  );
};

export default ProtectedRoute;
