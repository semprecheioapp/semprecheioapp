
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { useAuth } from "@/lib/auth";
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
        </>
      ) : (
        <>
          <Route path="/" component={() => <SuperAdminAgenda />} />
          <Route path="/agenda" component={Agenda} />
          <Route path="/super-admin" component={() => <SuperAdminAgenda />} />
          <Route path="/admin" component={AdminEmpresa} />
          <Route path="/configuracoes" component={() => <Configuracoes />} />
          <Route path="/profissionais" component={ProfessionalConfig} />
          <Route path="/config-profissionais" component={() => <ConfigProfissionais />} />
          <Route path="/whatsapp" component={() => <WhatsAppChannels />} />
          <Route path="/dashboard" component={Home} />
          <Route component={NotFound} />
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
