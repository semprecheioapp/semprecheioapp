
import React from "react";
import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { useAuth } from "@/lib/auth";
import { ProtectedRoute, SuperAdminRoute, AdminRoute } from "@/components/auth/ProtectedRoute";
import Login from "@/pages/login";
import Register from "@/pages/register";
import Home from "@/pages/home";
import NotFound from "@/pages/not-found";
import Agenda from "@/pages/agenda";
import SuperAdminAgenda from "@/pages/super-admin-agenda";
import WhatsAppChannels from "@/pages/whatsapp-channels";
import Configuracoes from "@/pages/configuracoes";
import ProfessionalConfig from "@/pages/professional-config";
import ConfigProfissionais from "@/pages/config-profissionais";
import AdminEmpresa from "@/pages/admin";

// Componente para redirecionamento automático baseado no perfil
function AutoRedirect() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  React.useEffect(() => {
    if (user) {
      // Determinar rota baseada no perfil do usuário
      if (user.email === 'semprecheioapp@gmail.com' || user.userType === 'Super Admin' || user.role === 'super_admin') {
        setLocation('/super-admin');
      } else {
        setLocation('/admin');
      }
    }
  }, [user, setLocation]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="text-center">
        <div className="w-12 h-12 sm:w-16 sm:h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-600 text-sm sm:text-base">Redirecionando...</p>
      </div>
    </div>
  );
}

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-12 h-12 sm:w-16 sm:h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 text-sm sm:text-base">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <Switch>
      {!isAuthenticated ? (
        <>
          <Route path="/cadastro" component={Register} />
          <Route path="/" component={Login} />
          <Route path="*" component={Login} />
        </>
      ) : (
        <>
          {/* Rotas protegidas para Super Admin */}
          <Route path="/super-admin" component={() => (
            <SuperAdminRoute>
              <SuperAdminAgenda />
            </SuperAdminRoute>
          )} />

          {/* Rotas protegidas para Admin */}
          <Route path="/admin" component={() => (
            <AdminRoute>
              <AdminEmpresa />
            </AdminRoute>
          )} />

          {/* Rotas gerais protegidas */}
          <Route path="/agenda" component={() => (
            <ProtectedRoute>
              <Agenda />
            </ProtectedRoute>
          )} />

          <Route path="/configuracoes" component={() => (
            <ProtectedRoute>
              <Configuracoes />
            </ProtectedRoute>
          )} />

          <Route path="/profissionais" component={() => (
            <ProtectedRoute>
              <ProfessionalConfig />
            </ProtectedRoute>
          )} />

          <Route path="/config-profissionais" component={() => (
            <ProtectedRoute>
              <ConfigProfissionais />
            </ProtectedRoute>
          )} />

          <Route path="/whatsapp" component={() => (
            <ProtectedRoute>
              <WhatsAppChannels />
            </ProtectedRoute>
          )} />

          <Route path="/dashboard" component={() => (
            <ProtectedRoute>
              <Home />
            </ProtectedRoute>
          )} />

          {/* Rota raiz - redireciona baseado no perfil */}
          <Route path="/" component={() => (
            <ProtectedRoute>
              <AutoRedirect />
            </ProtectedRoute>
          )} />

          {/* Rota 404 */}
          <Route path="*" component={NotFound} />
        </>
      )}
    </Switch>
  );
}

function App() {
  return (
    <ThemeProvider defaultTheme="light" storageKey="semprecheio-ui-theme">
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
