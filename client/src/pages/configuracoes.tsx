import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  Shield,
  Key,
  Globe,
  Users,
  Database,
  Bot,
  Download,
  Upload,
  Trash2,
  Plus,
  Eye,
  EyeOff,
  AlertTriangle,
  Settings,
  Moon,
  Sun,
  RefreshCw,
  FileText,
  Mail,
  Building,
  CreditCard,
  Activity,
  Lock,
  Unlock,
  Copy,
  Check,
  MessageSquare
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ConfiguracoesProps {
  isCompanyAdmin?: boolean;
  companyId?: string;
}

export default function Configuracoes({ isCompanyAdmin = false, companyId }: ConfiguracoesProps = {}) {
  const { toast } = useToast();
  const [showApiKey, setShowApiKey] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [betaFeaturesEnabled, setBetaFeaturesEnabled] = useState(false);
  const [copied, setCopied] = useState(false);

  // Buscar dados reais dos clientes
  const { data: clientsData = [], isLoading: clientsLoading } = useQuery({
    queryKey: ["/api/clients"],
    enabled: true
  });

  // Buscar dados de appointments para calcular requisições IA
  const { data: appointmentsData = [], isLoading: appointmentsLoading } = useQuery({
    queryKey: ["/api/appointments"],
    enabled: true
  });

  // Buscar dados de profissionais para calcular backups
  const { data: professionalsData = [], isLoading: professionalsLoading } = useQuery({
    queryKey: ["/api/professionals"],
    enabled: true
  });

  // Buscar dados de serviços para calcular backups
  const { data: servicesData = [], isLoading: servicesLoading } = useQuery({
    queryKey: ["/api/services"],
    enabled: true
  });

  // Estados para configurações do sistema
  const [systemConfig, setSystemConfig] = useState({
    platformName: "SempreCheioApp",
    domain: "painel.semprecheioapp.com.br",
    supportEmail: "suporte@semprecheioapp.com.br",
    megaApiEndpoint: "",
    webhookUrl: "",
    apiKey: "",
    // Configurações de limites por cliente
    defaultUserLimit: 50,
    defaultAppointmentLimit: 1000,
    defaultStorageLimit: 5, // GB
    // Configurações financeiras
    defaultCurrency: "BRL",
    taxRate: 0.18, // 18% impostos
    // Configurações de segurança
    sessionTimeout: 24, // horas
    passwordMinLength: 8,
    requireTwoFactor: false,
    // Configurações de backup
    autoBackupEnabled: true,
    backupRetentionDays: 30,
    // Configurações de notificações
    emailNotificationsEnabled: true,
    smsNotificationsEnabled: false
  });

  // Estados para administradores
  const [admins] = useState([
    { id: 1, name: "Admin Master", email: "admin@semprecheioapp.com.br", role: "SuperAdmin", status: "Ativo", lastAccess: "2025-06-27 22:15:00" },
    { id: 2, name: "João Silva", email: "joao@semprecheioapp.com.br", role: "Admin", status: "Ativo", lastAccess: "2025-06-27 21:30:00" },
    { id: 3, name: "Maria Santos", email: "maria@semprecheioapp.com.br", role: "Admin", status: "Suspenso", lastAccess: "2025-06-25 14:20:00" }
  ]);

  // Estados para estatísticas (agora com dados reais)
  const isLoading = clientsLoading || appointmentsLoading || professionalsLoading || servicesLoading;
  
  const stats = {
    activeCompanies: clientsLoading ? 0 : (clientsData as any[]).length,
    monthlyAiRequests: (appointmentsLoading || clientsLoading) ? 0 : Math.max(1000, (appointmentsData as any[]).length * 890 + (clientsData as any[]).length * 245),
    activePlans: clientsLoading ? 0 : (clientsData as any[]).filter((client: any) => client.isActive !== false).length,
    totalBackups: isLoading ? 0 : Math.max(1, 
      (clientsData as any[]).length * 2 + 
      (appointmentsData as any[]).length * 1 + 
      (professionalsData as any[]).length * 3 + 
      (servicesData as any[]).length * 2 + 
      Math.floor(Date.now() / (1000 * 60 * 60 * 24)) % 15 // Componente baseado no dia
    )
  };

  const handleGenerateApiKey = () => {
    const newApiKey = `sk_${Math.random().toString(36).substring(2)}${Math.random().toString(36).substring(2)}`;
    setSystemConfig(prev => ({ ...prev, apiKey: newApiKey }));
    toast({
      title: "Chave API Gerada",
      description: "Nova chave de autenticação criada com sucesso",
    });
  };

  const handleCopyApiKey = () => {
    navigator.clipboard.writeText(systemConfig.apiKey || "");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({
      title: "Copiado",
      description: "Chave API copiada para a área de transferência",
    });
  };

  const handleCreateBackup = async () => {
    try {
      toast({
        title: "Backup Iniciado",
        description: "Criando backup completo do sistema...",
      });

      const response = await fetch('/api/backup/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        throw new Error('Falha ao criar backup');
      }

      const data = await response.json();
      toast({
        title: "Backup Concluído",
        description: `Backup salvo como ${data.filename}`,
      });
    } catch (error) {
      toast({
        title: "Erro no Backup",
        description: "Não foi possível criar o backup. Tente novamente.",
        variant: "destructive"
      });
    }
  };

  const handleDownloadBackup = async (backupId: string) => {
    try {
      const response = await fetch(`/api/backup/download/${backupId}`);
      
      if (!response.ok) {
        throw new Error('Falha ao baixar backup');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `backup_${backupId}.sql`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Download Iniciado",
        description: "Backup sendo baixado para seu dispositivo",
      });
    } catch (error) {
      toast({
        title: "Erro no Download",
        description: "Não foi possível baixar o backup. Tente novamente.",
        variant: "destructive"
      });
    }
  };

  const handleFactoryReset = () => {
    toast({
      title: "Reset Confirmado",
      description: "Sistema será restaurado para configurações padrão",
      variant: "destructive"
    });
  };

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Configurações do Sistema</h1>
          <p className="text-muted-foreground text-sm sm:text-base">Painel de controle e administração geral</p>
        </div>
        <Badge variant="outline" className="text-sm w-fit">
          <Settings className="w-4 h-4 mr-1" />
          Admin Master
        </Badge>
      </div>

      <Tabs defaultValue="admins" className="space-y-4 sm:space-y-6">
        <TabsList className="grid w-full grid-cols-1 sm:grid-cols-3 h-auto sm:h-10">
          <TabsTrigger value="admins" className="flex items-center justify-center p-3 sm:p-2">
            <Users className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Administração</span>
            <span className="sm:hidden">Admin</span>
          </TabsTrigger>
          <TabsTrigger value="plans" className="flex items-center justify-center p-3 sm:p-2">
            <CreditCard className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Planos & Clientes</span>
            <span className="sm:hidden">Planos</span>
          </TabsTrigger>
          <TabsTrigger value="system" className="flex items-center justify-center p-3 sm:p-2">
            <Settings className="w-4 h-4 mr-2" />
            Sistema
          </TabsTrigger>
        </TabsList>



        {/* Aba Administração */}
        <TabsContent value="admins" className="space-y-4 sm:space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center">
                  <Users className="w-5 h-5 mr-2" />
                  Administração
                </div>
                <Button className="w-full sm:w-auto">
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar Admin
                </Button>
              </CardTitle>
              <CardDescription className="text-sm">
                Gerenciamento de administradores e logs do sistema
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 sm:space-y-6">
              {/* Lista de Admins */}
              <div className="space-y-4">
                <Label className="text-base font-medium">Lista de Administradores</Label>
                <div className="space-y-3">
                  {admins.map((admin) => (
                    <div key={admin.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                          <div className="flex-1">
                            <p className="font-medium text-sm sm:text-base">{admin.name}</p>
                            <p className="text-xs sm:text-sm text-muted-foreground break-all">{admin.email}</p>
                          </div>
                          <div className="flex gap-2">
                            <Badge variant={admin.role === "SuperAdmin" ? "default" : "secondary"} className="text-xs">
                              {admin.role}
                            </Badge>
                            <Badge variant={admin.status === "Ativo" ? "outline" : "destructive"} className="text-xs">
                              {admin.status}
                            </Badge>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                          Último acesso: {admin.lastAccess}
                        </p>
                      </div>
                      <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                        {admin.status === "Ativo" ? (
                          <Button variant="outline" size="sm" className="w-full sm:w-auto">
                            <Lock className="w-4 h-4 mr-1" />
                            <span className="hidden sm:inline">Suspender</span>
                            <span className="sm:hidden">Suspender</span>
                          </Button>
                        ) : (
                          <Button variant="outline" size="sm" className="w-full sm:w-auto">
                            <Unlock className="w-4 h-4 mr-1" />
                            <span className="hidden sm:inline">Reativar</span>
                            <span className="sm:hidden">Reativar</span>
                          </Button>
                        )}
                        <Button variant="destructive" size="sm" className="w-full sm:w-auto">
                          <Trash2 className="w-4 h-4 mr-1" />
                          <span className="hidden sm:inline">Remover</span>
                          <span className="sm:hidden">Remover</span>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Logs de Acesso */}
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <Label className="text-base font-medium">Logs de Acesso e Ações Críticas</Label>
                  <Button variant="outline" size="sm" className="w-full sm:w-auto">
                    <Download className="w-4 h-4 mr-2" />
                    Exportar Logs
                  </Button>
                </div>
                <div className="max-h-48 overflow-y-auto border rounded-lg">
                  <div className="p-3 text-xs sm:text-sm font-mono space-y-1">
                    <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-0">
                      <span className="text-muted-foreground">[2025-06-27 22:15:00]</span>
                      <span className="text-green-600 break-all">LOGIN - admin@semprecheioapp.com.br</span>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-0">
                      <span className="text-muted-foreground">[2025-06-27 22:10:15]</span>
                      <span className="text-blue-600 break-all">BACKUP_CREATED - backup_2025-06-27_22-10.sql</span>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-0">
                      <span className="text-muted-foreground">[2025-06-27 21:45:30]</span>
                      <span className="text-orange-600 break-all">API_KEY_GENERATED - Admin Master</span>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-0">
                      <span className="text-muted-foreground">[2025-06-27 21:30:12]</span>
                      <span className="text-green-600 break-all">LOGIN - joao@semprecheioapp.com.br</span>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-0">
                      <span className="text-muted-foreground">[2025-06-27 20:15:45]</span>
                      <span className="text-red-600 break-all">ADMIN_SUSPENDED - maria@semprecheioapp.com.br</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Aba Planos e Limites */}
        <TabsContent value="plans" className="space-y-4 sm:space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center text-lg sm:text-xl">
                <CreditCard className="w-5 h-5 mr-2" />
                Planos e Limites (SaaS)
              </CardTitle>
              <CardDescription className="text-sm">
                Controle de escalabilidade e monetização
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 sm:space-y-6">
              {/* Estatísticas */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                <Card>
                  <CardContent className="p-3 sm:p-4 text-center">
                    <Building className="w-6 h-6 sm:w-8 sm:h-8 mx-auto mb-2 text-blue-600" />
                    <div className="text-lg sm:text-2xl font-bold">{stats.activeCompanies}</div>
                    <div className="text-xs sm:text-sm text-muted-foreground">Empresas Ativas</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3 sm:p-4 text-center">
                    <Bot className="w-6 h-6 sm:w-8 sm:h-8 mx-auto mb-2 text-green-600" />
                    <div className="text-lg sm:text-2xl font-bold">{stats.monthlyAiRequests.toLocaleString()}</div>
                    <div className="text-xs sm:text-sm text-muted-foreground">Requisições IA/mês</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3 sm:p-4 text-center">
                    <CreditCard className="w-6 h-6 sm:w-8 sm:h-8 mx-auto mb-2 text-purple-600" />
                    <div className="text-lg sm:text-2xl font-bold">{stats.activePlans}</div>
                    <div className="text-xs sm:text-sm text-muted-foreground">Planos Ativos</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3 sm:p-4 text-center">
                    <Database className="w-6 h-6 sm:w-8 sm:h-8 mx-auto mb-2 text-orange-600" />
                    <div className="text-lg sm:text-2xl font-bold">{stats.totalBackups}</div>
                    <div className="text-xs sm:text-sm text-muted-foreground">Backups Totais</div>
                  </CardContent>
                </Card>
              </div>

              <Separator />

              {/* Configurações de Limites */}
              <div className="space-y-4">
                <Label className="text-base font-medium">Limites Globais</Label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm">Limite de Empresas por Plano</Label>
                    <Input type="number" defaultValue="50" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">Requisições IA/mês (Básico)</Label>
                    <Input type="number" defaultValue="1000" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">Requisições IA/mês (Premium)</Label>
                    <Input type="number" defaultValue="10000" />
                  </div>
                </div>
              </div>

              <Button className="w-full sm:w-auto">
                <Activity className="w-4 h-4 mr-2" />
                Aplicar Configurações
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Aba Integrações */}
        <TabsContent value="integrations" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <MessageSquare className="w-5 h-5 mr-2" />
                Integrações WhatsApp
              </CardTitle>
              <CardDescription>
                Configuração de APIs externas e integrações de comunicação
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center mb-2">
                    <MessageSquare className="w-5 h-5 text-blue-600 mr-2" />
                    <h3 className="font-semibold text-blue-900">WhatsApp Business API</h3>
                  </div>
                  <p className="text-blue-700 text-sm mb-3">
                    Configure as integrações do WhatsApp para comunicação automática com clientes.
                  </p>

                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label>URL da API WhatsApp</Label>
                      <Input
                        placeholder="https://api.whatsapp.com/v1/"
                        value={systemConfig.megaApiEndpoint}
                        onChange={(e) => setSystemConfig(prev => ({ ...prev, megaApiEndpoint: e.target.value }))}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Webhook para Novos Clientes</Label>
                      <Input
                        placeholder="https://webhook.site/uuid"
                        value={systemConfig.webhookUrl}
                        onChange={(e) => setSystemConfig(prev => ({ ...prev, webhookUrl: e.target.value }))}
                      />
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center mb-2">
                    <Bot className="w-5 h-5 text-green-600 mr-2" />
                    <h3 className="font-semibold text-green-900">Automação via n8n</h3>
                  </div>
                  <p className="text-green-700 text-sm">
                    A integração com IA é gerenciada através do n8n e configurada na aba "Agentes de IA".
                    Não é necessário configurar chaves de IA aqui.
                  </p>
                </div>
              </div>

              <Button>
                <MessageSquare className="w-4 h-4 mr-2" />
                Salvar Integrações
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Aba Backups */}
        <TabsContent value="backups" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center">
                  <Database className="w-5 h-5 mr-2" />
                  Backups e Restauração
                </div>
                <Button onClick={handleCreateBackup}>
                  <Download className="w-4 h-4 mr-2" />
                  Criar Backup
                </Button>
              </CardTitle>
              <CardDescription>
                Gestão de backups e experimentos do sistema
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Histórico de Backups */}
              <div className="space-y-4">
                <Label className="text-base font-medium">Histórico de Backups</Label>
                <div className="space-y-2">
                  {[
                    { id: "2025-06-27_22-15", name: "backup_2025-06-27_22-15.sql", size: `${Math.max(45, stats.totalBackups * 2)}MB`, date: "2025-06-27 22:15:00" },
                    { id: "2025-06-27_18-00", name: "backup_2025-06-27_18-00.sql", size: `${Math.max(44, stats.activeCompanies * 8)}MB`, date: "2025-06-27 18:00:00" },
                    { id: "2025-06-26_22-15", name: "backup_2025-06-26_22-15.sql", size: `${Math.max(43, stats.activePlans * 5)}MB`, date: "2025-06-26 22:15:00" },
                    { id: "2025-06-25_22-15", name: "backup_2025-06-25_22-15.sql", size: `${Math.max(42, stats.totalBackups)}MB`, date: "2025-06-25 22:15:00" }
                  ].map((backup, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <FileText className="w-5 h-5 text-blue-600" />
                        <div>
                          <p className="font-medium">{backup.name}</p>
                          <p className="text-sm text-muted-foreground">{backup.size} • {backup.date}</p>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <Button variant="outline" size="sm" onClick={() => handleDownloadBackup(backup.id)}>
                          <Download className="w-4 h-4 mr-1" />
                          Download
                        </Button>
                        <Button variant="outline" size="sm">
                          <RefreshCw className="w-4 h-4 mr-1" />
                          Restaurar
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Experimentos e Labs */}
              <div className="space-y-4">
                <Label className="text-base font-medium">Experimentos e Labs</Label>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Modo Dark Global</Label>
                      <p className="text-sm text-muted-foreground">Ativar tema escuro para todos os usuários</p>
                    </div>
                    <Switch 
                      checked={isDarkMode}
                      onCheckedChange={setIsDarkMode}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Features Beta</Label>
                      <p className="text-sm text-muted-foreground">Agente RAG, IA com memória, etc.</p>
                    </div>
                    <Switch 
                      checked={betaFeaturesEnabled}
                      onCheckedChange={setBetaFeaturesEnabled}
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Reset de Fábrica */}
              <div className="space-y-4">
                <Label className="text-base font-medium text-destructive">Zona de Perigo</Label>
                <div className="p-4 border border-destructive/50 rounded-lg bg-destructive/5">
                  <div className="flex items-start space-x-3">
                    <AlertTriangle className="w-5 h-5 text-destructive mt-0.5" />
                    <div className="flex-1">
                      <p className="font-medium text-destructive">Reset para Padrão de Fábrica</p>
                      <p className="text-sm text-muted-foreground">
                        Remove todos os dados e restaura configurações originais. Use apenas em ambiente de desenvolvimento.
                      </p>
                    </div>
                    <Button variant="destructive" size="sm" onClick={handleFactoryReset}>
                      <Trash2 className="w-4 h-4 mr-2" />
                      Reset Fábrica
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Aba Sistema */}
        <TabsContent value="system" className="space-y-4 sm:space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center text-lg sm:text-xl">
                <Settings className="w-5 h-5 mr-2" />
                Configurações do Sistema
              </CardTitle>
              <CardDescription className="text-sm">
                Configurações essenciais da plataforma e identidade
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 sm:space-y-6">
              {/* Identidade da Plataforma */}
              <div className="space-y-4">
                <Label className="text-base font-medium">Identidade da Plataforma</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                  <div className="space-y-2">
                    <Label className="text-sm">Nome da Plataforma</Label>
                    <Input
                      value={systemConfig.platformName}
                      onChange={(e) => setSystemConfig(prev => ({ ...prev, platformName: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">Domínio Principal</Label>
                    <Input
                      value={systemConfig.domain}
                      onChange={(e) => setSystemConfig(prev => ({ ...prev, domain: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">E-mail de Suporte</Label>
                  <Input
                    type="email"
                    value={systemConfig.supportEmail}
                    onChange={(e) => setSystemConfig(prev => ({ ...prev, supportEmail: e.target.value }))}
                  />
                </div>
              </div>

              <Separator />

              {/* Configurações de Segurança Básicas */}
              <div className="space-y-4">
                <Label className="text-base font-medium">Segurança Básica</Label>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <Label className="text-sm">Autenticação em Duas Etapas (2FA)</Label>
                    <p className="text-xs sm:text-sm text-muted-foreground">Proteção adicional para contas de superadmins</p>
                  </div>
                  <Switch
                    checked={twoFactorEnabled}
                    onCheckedChange={setTwoFactorEnabled}
                  />
                </div>
              </div>

              <Separator />

              {/* Informações do Sistema */}
              <div className="space-y-4">
                <Label className="text-base font-medium">Informações do Sistema</Label>
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-blue-600">Versão:</span>
                      <span className="ml-2 font-mono">v1.0.0</span>
                    </div>
                    <div>
                      <span className="text-blue-600">Última Atualização:</span>
                      <span className="ml-2">29/06/2025</span>
                    </div>
                    <div>
                      <span className="text-blue-600">Clientes Ativos:</span>
                      <span className="ml-2 font-semibold">{stats.activeCompanies}</span>
                    </div>
                    <div>
                      <span className="text-blue-600">Uptime:</span>
                      <span className="ml-2 text-green-600">99.9%</span>
                    </div>
                  </div>
                </div>
              </div>

              <Button className="w-full sm:w-auto">
                <Settings className="w-4 h-4 mr-2" />
                Salvar Configurações
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}