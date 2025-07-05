
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { useAuth } from "@/lib/auth";
import ProtectedRoute from "@/components/ProtectedRoute";
import RedirectHandler from "@/components/RedirectHandler";
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
import AcessoNegado from "@/pages/acesso-negado";

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
      <Route path="/login" component={Login} />
      <Route path="/cadastro" component={Register} />
      <Route path="/acesso-negado" component={AcessoNegado} />
      
      <ProtectedRoute path="/agenda" component={Agenda} allowedRoles={['admin', 'super_admin']} />
      <ProtectedRoute path="/super-admin" component={SuperAdminAgenda} allowedRoles={['super_admin']} />
      <ProtectedRoute path="/admin" component={AdminEmpresa} allowedRoles={['admin', 'super_admin']} />
      <ProtectedRoute path="/configuracoes" component={Configuracoes} allowedRoles={['admin', 'super_admin']} />
      <ProtectedRoute path="/profissionais" component={ProfessionalConfig} allowedRoles={['admin', 'super_admin']} />
      <ProtectedRoute path="/config-profissionais" component={ConfigProfissionais} allowedRoles={['admin', 'super_admin']} />
      <ProtectedRoute path="/whatsapp" component={WhatsAppChannels} allowedRoles={['admin', 'super_admin']} />
      <ProtectedRoute path="/dashboard" component={Home} allowedRoles={['admin', 'super_admin']} />
      <ProtectedRoute path="/" component={RedirectHandler} allowedRoles={['admin', 'super_admin']} />
      
      <Route component={NotFound} />
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
