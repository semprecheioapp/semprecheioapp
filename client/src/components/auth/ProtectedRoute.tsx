import { useAuth } from "@/lib/auth";
import { useLocation } from "wouter";
import { useEffect } from "react";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'super_admin' | 'admin';
  fallbackPath?: string;
}

export function ProtectedRoute({ 
  children, 
  requiredRole, 
  fallbackPath = '/login' 
}: ProtectedRouteProps) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        setLocation('/login');
        return;
      }

      if (requiredRole && user) {
        // Verificar se o usuário tem o role necessário
        const userRole = getUserRole(user);
        
        if (requiredRole === 'super_admin' && userRole !== 'super_admin') {
          // Usuário não é super admin, redirecionar para admin
          setLocation('/admin');
          return;
        }
        
        if (requiredRole === 'admin' && userRole === 'super_admin') {
          // Super admin tentando acessar área de admin, redirecionar para super-admin
          setLocation('/super-admin');
          return;
        }
      }
    }
  }, [isAuthenticated, isLoading, user, requiredRole, setLocation]);

  // Mostrar loading enquanto verifica autenticação
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-12 h-12 sm:w-16 sm:h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 text-sm sm:text-base">Verificando permissões...</p>
        </div>
      </div>
    );
  }

  // Se não está autenticado, não renderizar nada (redirecionamento já foi feito)
  if (!isAuthenticated) {
    return null;
  }

  // Se tem role específico e usuário não tem permissão, não renderizar
  if (requiredRole && user) {
    const userRole = getUserRole(user);
    
    if (requiredRole === 'super_admin' && userRole !== 'super_admin') {
      return null;
    }
    
    if (requiredRole === 'admin' && userRole === 'super_admin') {
      return null;
    }
  }

  return <>{children}</>;
}

// Função auxiliar para determinar o role do usuário
function getUserRole(user: any): 'super_admin' | 'admin' {
  // Verificar se é super admin pelo email
  if (user.email === 'semprecheioapp@gmail.com') {
    return 'super_admin';
  }
  
  // Verificar pelo userType retornado da API
  if (user.userType === 'Super Admin') {
    return 'super_admin';
  }
  
  // Verificar pelo role direto
  if (user.role === 'super_admin') {
    return 'super_admin';
  }
  
  // Por padrão, é admin
  return 'admin';
}

// Componente específico para rotas de Super Admin
export function SuperAdminRoute({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute requiredRole="super_admin">
      {children}
    </ProtectedRoute>
  );
}

// Componente específico para rotas de Admin
export function AdminRoute({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute requiredRole="admin">
      {children}
    </ProtectedRoute>
  );
}
