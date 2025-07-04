import { useAuth, useLogout } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { LogOut, User, Shield } from "lucide-react";

export default function Home() {
  const { user } = useAuth();
  const logoutMutation = useLogout();
  const { toast } = useToast();

  const handleLogout = async () => {
    try {
      await logoutMutation.mutateAsync();
      toast({
        title: "Logout realizado",
        description: "Você foi desconectado com sucesso.",
      });
    } catch (error: any) {
      toast({
        title: "Erro no logout",
        description: error.message || "Erro ao realizar logout.",
        variant: "destructive",
      });
    }
  };

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 lg:mb-8 space-y-4 sm:space-y-0">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-600">Bem-vindo de volta!</p>
          </div>
          
          <Button
            onClick={handleLogout}
            disabled={logoutMutation.isPending}
            variant="outline"
            className="flex items-center space-x-2 w-full sm:w-auto"
          >
            <LogOut className="w-4 h-4" />
            <span>{logoutMutation.isPending ? "Saindo..." : "Sair"}</span>
          </Button>
        </div>

        <div className="grid gap-4 lg:gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <User className="w-5 h-5" />
                <span>Informações do Usuário</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-600">E-mail:</label>
                <p className="text-gray-900">{user.email}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Função:</label>
                <div className="flex items-center space-x-2">
                  <Shield className="w-4 h-4 text-blue-500" />
                  <p className="text-gray-900">{user.role}</p>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Membro desde:</label>
                <p className="text-gray-900">
                  {new Date(user.createdAt!).toLocaleDateString("pt-BR")}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Acesso Rápido</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-600">
                Você está logado como <strong>{user.role}</strong>.
              </p>
              
              {user.role === "Super Admin" && (
                <div className="p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-semibold text-blue-900 mb-2">Privilégios de Super Admin</h4>
                  <p className="text-blue-700 text-sm">
                    Você tem acesso total ao sistema e pode gerenciar todos os usuários e configurações.
                  </p>
                </div>
              )}
              
              {user.role === "Admin" && (
                <div className="p-4 bg-green-50 rounded-lg">
                  <h4 className="font-semibold text-green-900 mb-2">Privilégios de Admin</h4>
                  <p className="text-green-700 text-sm">
                    Você pode gerenciar usuários e acessar funcionalidades administrativas.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Sistema de Autenticação</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">
              O sistema de login está funcionando corretamente. Você foi autenticado com sucesso
              e pode acessar todas as funcionalidades disponíveis para seu nível de permissão.
            </p>
            
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-semibold text-gray-900 mb-2">Recursos Implementados:</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>✓ Autenticação com e-mail e senha</li>
                <li>✓ Validação de formulário com feedback</li>
                <li>✓ Sessões persistentes com "Manter conectado"</li>
                <li>✓ Usuários de teste predefinidos</li>
                <li>✓ Interface em português brasileiro</li>
                <li>✓ Design responsivo</li>
                <li>✓ Logout seguro</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
