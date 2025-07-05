import React, { useEffect } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/lib/auth';

const RedirectHandler: React.FC = () => {
  const [, setLocation] = useLocation();
  const { user, isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    console.log('RedirectHandler - User:', user);
    console.log('RedirectHandler - IsAuthenticated:', isAuthenticated);
    console.log('RedirectHandler - IsLoading:', isLoading);

    if (!isLoading) {
      if (isAuthenticated && user) {
        let redirectPath = '/dashboard';
        if (user.role === 'super_admin') {
          redirectPath = '/super-admin';
        } else if (user.role === 'admin') {
          redirectPath = '/admin';
        }
        console.log('RedirectHandler - Redirecionando para:', redirectPath);
        setLocation(redirectPath);
      } else {
        console.log('RedirectHandler - Usuário não autenticado, redirecionando para /login');
        setLocation('/login');
      }
    }
  }, [user, isAuthenticated, isLoading, setLocation]);

  return <div>Redirecionando...</div>;
};

export default RedirectHandler;
