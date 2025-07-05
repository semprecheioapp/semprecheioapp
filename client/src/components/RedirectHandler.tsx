import React, { useEffect } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/lib/auth';

const RedirectHandler: React.FC = () => {
  const [, setLocation] = useLocation();
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      if (user.role === 'super_admin') {
        setLocation('/super-admin');
      } else if (user.role === 'admin') {
        setLocation('/admin');
      }
    }
  }, [user, setLocation]);

  return <div>Redirecionando...</div>;
};

export default RedirectHandler;
