import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Users, Settings, UserCheck, Briefcase, Menu, X, LogOut, User, Key, Shield, Clock, Tag, BarChart3, CreditCard, TrendingUp, Building2, Download, Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ThemeToggle } from '@/components/theme-toggle';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import CalendarView from '@/components/CalendarView';
import ProfessionalScheduleConfig from '@/components/ProfessionalScheduleConfig';
import ProfessionalsManagement from '@/components/ProfessionalsManagement';
import { CompaniesManagement } from '@/components/CompaniesManagement';

interface User {
  id: string;
  name: string;
  email: string;
  userType: string;
  redirectPath: string;
}

interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  serviceType: string;
  isActive: boolean;
}

const AdminEmpresa: React.FC = () => {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [activeSection, setActiveSection] = useState('Agenda');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [currentClient, setCurrentClient] = useState<Client | null>(null);
  const [selectedProfessionalId, setSelectedProfessionalId] = useState<string>('all');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('month');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [showNewServiceModal, setShowNewServiceModal] = useState(false);
  const [newService, setNewService] = useState({
    name: '',
    description: '',
    duration: 0,
    price: 0
  });

  const handleNewServiceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentClient?.id) return;

    try {
      const response = await fetch('/api/services', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...newService,
          client_id: currentClient.id
        }),
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Erro ao adicionar serviço');
      }

      toast({
        title: "Sucesso",
        description: "Serviço adicionado com sucesso!",
      });

      setShowNewServiceModal(false);
      setNewService({ name: '', description: '', duration: 0, price: 0 });
      
      // Recarregar a lista de serviços
      refetchServices();
    } catch (error) {
      console.error('Erro ao adicionar serviço:', error);
      toast({
        title: "Erro",
        description: "Não foi possível adicionar o serviço. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  // Função para download do relatório
  const handleDownloadReport = async () => {
    if (!currentClient?.id) return;

    try {
      const params = new URLSearchParams();

      if (selectedProfessionalId !== 'all') {
        params.append('professional_id', selectedProfessionalId);
      }

      if (selectedPeriod !== 'custom') {
        params.append('period', selectedPeriod);
      } else if (customStartDate && customEndDate) {
        params.append('start_date', customStartDate);
        params.append('end_date', customEndDate);
      }

      params.append('format', 'csv');

      const url = `/api/clients/${currentClient.id}/report?${params.toString()}`;

      // Criar link temporário para download
      const link = document.createElement('a');
      link.href = url;
      link.download = `relatorio_${selectedProfessionalId !== 'all' ? 'profissional' : 'todos'}_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

    } catch (error) {
      console.error('Erro ao baixar relatório:', error);
      alert('Erro ao gerar relatório. Tente novamente.');
    }
  };

  // Check authentication and get user data
  const { data: userData, isLoading: userLoading, error: userError } = useQuery({
    queryKey: ['user'],
    queryFn: async () => {
      const response = await fetch('/api/auth/user', {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error('Não autorizado');
      }
      return response.json();
    },
    retry: false
  });

  // Get current client data (company info)
  const { data: clientData, isLoading: clientLoading } = useQuery({
    queryKey: ['current-client'],
    queryFn: async () => {
      if (!userData?.email) return null;

      const response = await fetch('/api/clients', {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error('Erro ao buscar dados da empresa');
      }
      const clients = await response.json();

      // Find the client that matches the logged user email
      const client = clients.find((c: Client) => c.email === userData.email);
      return client || null;
    },
    enabled: !!userData?.email
  });

// Get services for the company
const { data: servicesData, isLoading: servicesLoading, refetch: refetchServices } = useQuery({
  queryKey: ['company-services', clientData?.id],
  queryFn: async () => {
    if (!clientData?.id) return [];
    const response = await fetch(`/api/services?clientId=${clientData.id}`, {
      credentials: 'include'
    });
    if (!response.ok) {
      throw new Error('Erro ao buscar serviços');
    }
    return response.json();
  },
  enabled: !!clientData?.id
});

  // Get professionals for the company
  const { data: professionalsData, isLoading: professionalsLoading } = useQuery({
    queryKey: ['company-professionals'],
    queryFn: async () => {
      const response = await fetch('/api/professionals', {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error('Erro ao buscar profissionais');
      }
      const data = await response.json();
      return data;
    },
    enabled: !!userData?.email
  });

  useEffect(() => {
    if (userError) {
      toast({
        title: "Erro de autenticação",
        description: "Você precisa fazer login para acessar esta página.",
        variant: "destructive",
      });
      setLocation('/login');
      return;
    }

    if (userData) {
      setUser(userData);

      // Check if user is authorized for admin area
      if (userData.userType !== 'Admin da Empresa') {
        toast({
          title: "Acesso negado",
          description: "Você não tem permissão para acessar esta área.",
          variant: "destructive",
        });
        setLocation('/login');
        return;
      }
    }
  }, [userData, userError, setLocation, toast]);

  useEffect(() => {
    if (clientData) {
      setCurrentClient(clientData);
    }
  }, [clientData]);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      });

      toast({
        title: "Logout realizado",
        description: "Você foi desconectado com sucesso.",
      });

      setLocation('/login');
    } catch (error) {
      console.error('Logout error:', error);
      toast({
        title: "Erro",
        description: "Erro ao fazer logout.",
        variant: "destructive",
      });
    }
  };

  // Query para buscar dados do dashboard da empresa
  const { data: dashboardData, isLoading: dashboardLoading } = useQuery({
    queryKey: ['company-dashboard', currentClient?.id, selectedProfessionalId, selectedPeriod, customStartDate, customEndDate],
    queryFn: async () => {
      if (!currentClient?.id) return null;

      const params = new URLSearchParams();

      if (selectedProfessionalId !== 'all') {
        params.append('professional_id', selectedProfessionalId);
      }

      if (selectedPeriod !== 'custom') {
        params.append('period', selectedPeriod);
      } else if (customStartDate && customEndDate) {
        params.append('start_date', customStartDate);
        params.append('end_date', customEndDate);
      }

      const url = `/api/clients/${currentClient.id}/usage${params.toString() ? `?${params.toString()}` : ''}`;

      console.log('🔍 Frontend - Making request to:', url);
      console.log('🔍 Frontend - Params:', {
        selectedProfessionalId,
        selectedPeriod,
        customStartDate,
        customEndDate,
        paramsString: params.toString()
      });

      const response = await fetch(url, {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error('Erro ao buscar dados do dashboard');
      }
      return response.json();
    },
    enabled: !!currentClient?.id
  });

  // Sidebar configuration for company admin (6 sections + configurations)
  const sidebarItems = [
    { section: "PRINCIPAL", items: [
      { name: "Agenda", icon: Calendar, active: activeSection === "Agenda" },
      { name: "Dashboard", icon: BarChart3, active: activeSection === "Dashboard" }
    ]},
    {
      section: "GERENCIAMENTO",
      items: [
        { name: "Profissionais", icon: Users, active: activeSection === "Profissionais" },
        { name: "Config. Profissionais", icon: Clock, active: activeSection === "Config. Profissionais" },
        { name: "Especialidades", icon: Tag, active: activeSection === "Especialidades" },
        { name: "Serviços", icon: Briefcase, active: activeSection === "Serviços" },
        { name: "Clientes", icon: UserCheck, active: activeSection === "Clientes" }
      ]
    },
    { section: "SISTEMA", items: [{ name: "Configurações", icon: Settings, active: activeSection === "Configurações" }] }
  ];

  const handleSidebarClick = (itemName: string) => {
    setActiveSection(itemName);
    setMobileMenuOpen(false);
  };

  if (userLoading || clientLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!user || !currentClient) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-96">
          <CardHeader>
            <CardTitle className="text-red-600">Erro de Acesso</CardTitle>
            <CardDescription>
              Não foi possível carregar os dados da empresa.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setLocation('/login')} className="w-full">
              Voltar ao Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Componente Sidebar reutilizável
  const SidebarContent = ({ onClose }: { onClose?: () => void }) => (
    <div className="flex flex-col h-full">
      <div className="p-4 flex-1">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold text-gray-800 dark:text-gray-200">
            {currentClient.name}
          </h1>
          <div className="flex items-center space-x-2">
            <ThemeToggle />

            {/* Menu de Conta - Desktop */}
            {!onClose && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="relative">
                    <User className="w-5 h-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>Admin da Empresa</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>
                    <User className="mr-2 h-4 w-4" />
                    <span>Perfil</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Key className="mr-2 h-4 w-4" />
                    <span>Alterar Senha</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Shield className="mr-2 h-4 w-4" />
                    <span>Segurança</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-red-600" onClick={handleLogout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Sair</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {onClose && (
              <Button variant="ghost" size="sm" onClick={onClose} className="lg:hidden">
                <X className="w-5 h-5" />
              </Button>
            )}
          </div>
        </div>

        {sidebarItems.map((section, index) => (
          <div key={section.section} className={index > 0 ? 'border-t border-gray-300 pt-4 mt-4' : ''}>
            <h3 className="text-xs font-bold uppercase tracking-wide mb-3" style={{ color: '#9CA3AF' }}>
              {section.section}
            </h3>
            <ul className="space-y-1">
              {section.items.map((item) => {
                const Icon = item.icon;
                return (
                  <li key={item.name}>
                    <button
                      className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${
                        item.active
                          ? 'bg-white text-gray-900 font-semibold shadow-sm'
                          : 'text-gray-600 hover:bg-gray-200 hover:text-gray-900'
                      }`}
                      style={{ fontSize: '14px' }}
                      onClick={() => {
                        handleSidebarClick(item.name);
                        if (onClose) onClose();
                      }}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{item.name}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>

      {/* Footer da sidebar */}
      <div className="p-4 border-t border-gray-300">
        <div className="text-xs text-gray-500 mb-3">
          <p className="font-medium">{user.name}</p>
          <p>{user.email}</p>
          <Badge variant="secondary" className="mt-2 bg-blue-100 text-blue-800">
            {currentClient.serviceType}
          </Badge>
        </div>

        {/* Botão de Sair Visível */}
        <Button
          variant="outline"
          size="sm"
          onClick={handleLogout}
          className="w-full text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300"
        >
          <LogOut className="mr-2 h-4 w-4" />
          Sair
        </Button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900 overflow-hidden">
      {/* Sidebar Desktop */}
      <div className="hidden lg:block w-60 bg-gray-100 dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-200">
        <SidebarContent />
      </div>

      {/* Mobile Sidebar Sheet */}
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent side="left" className="w-full sm:w-80 bg-gray-100 p-0 max-w-none h-full">
          <SheetHeader className="sr-only">
            <SheetTitle>Menu de Navegação</SheetTitle>
          </SheetHeader>
          <SidebarContent onClose={() => setMobileMenuOpen(false)} />
        </SheetContent>
      </Sheet>

      {/* Área Central */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header Mobile */}
        <div className="lg:hidden bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 p-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setMobileMenuOpen(true)}
              className="p-1"
            >
              <Menu className="w-6 h-6" />
            </Button>
            <h1 className="text-lg font-bold text-gray-800 dark:text-gray-200">
              {currentClient.name} - {activeSection}
            </h1>
          </div>
          <div className="flex items-center space-x-2">
            <ThemeToggle />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="relative">
                  <User className="w-5 h-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Minha Conta</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <User className="mr-2 h-4 w-4" />
                  <span>Perfil</span>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Key className="mr-2 h-4 w-4" />
                  <span>Alterar Senha</span>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Shield className="mr-2 h-4 w-4" />
                  <span>Segurança</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-red-600" onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sair</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Conteúdo Principal */}
        <div className={`flex-1 ${activeSection === 'Agenda' ? 'overflow-hidden' : 'p-6 overflow-y-auto'}`}>
          {activeSection === 'Agenda' && (
            <div className="h-full">
              {/* Renderizar o componente CalendarView para company_admin */}
              <CalendarView clientId={currentClient.id} />
            </div>
          )}

          {activeSection === 'Dashboard' && (
            <div className="p-6 space-y-6">
              <div className="max-w-7xl mx-auto">
                <div className="flex items-center justify-between mb-8">
                  <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Dashboard - {currentClient.name}</h1>
                  <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                    Métricas da Empresa
                  </Badge>
                </div>

                {/* Filtro por Profissional */}
                <Card className="mb-6">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Users className="w-5 h-5" />
                      <span>Filtros de Análise</span>
                    </CardTitle>
                    <CardDescription>
                      Visualize as métricas de faturamento por profissional e período
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
                      <div className="flex-1 min-w-[200px]">
                        <Label htmlFor="professional-select">Selecionar Profissional</Label>
                        <Select value={selectedProfessionalId} onValueChange={setSelectedProfessionalId} disabled={professionalsLoading}>
                          <SelectTrigger>
                            <SelectValue placeholder={professionalsLoading ? "Carregando profissionais..." : "Todos os profissionais"} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Todos os Profissionais</SelectItem>
                            {professionalsData && Array.isArray(professionalsData) && professionalsData.length > 0 ? (
                              professionalsData.map((professional: any) => (
                                <SelectItem key={professional.id} value={professional.id}>
                                  {professional.name} - {professional.specialtyName || 'Sem especialidade'}
                                </SelectItem>
                              ))
                            ) : dashboardData?.availableProfessionals && Array.isArray(dashboardData.availableProfessionals) ? (
                              dashboardData.availableProfessionals.map((professional: any) => (
                                <SelectItem key={professional.id} value={professional.id}>
                                  {professional.name} - {professional.specialtyName || 'Sem especialidade'}
                                </SelectItem>
                              ))
                            ) : (
                              <SelectItem value="no-professionals" disabled>
                                Nenhum profissional encontrado
                              </SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Seleção de Período */}
                      <div className="flex-1 min-w-[200px]">
                        <Label htmlFor="period-select">Período de Análise</Label>
                        <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecionar período" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="week">Semana Atual</SelectItem>
                            <SelectItem value="month">Mês Atual</SelectItem>
                            <SelectItem value="custom">Período Personalizado</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Botão de Download */}
                      <div className="min-w-[150px]">
                        <Label>Relatório</Label>
                        <Button
                          variant="outline"
                          className="w-full mt-2"
                          disabled={dashboardLoading}
                          onClick={handleDownloadReport}
                        >
                          <Download className="w-4 h-4 mr-2" />
                          Baixar CSV
                        </Button>
                      </div>
                    </div>

                    {/* Datas Personalizadas */}
                    {selectedPeriod === 'custom' && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 p-4 bg-gray-50 rounded-lg">
                        <div className="space-y-2">
                          <Label htmlFor="start-date">Data Inicial</Label>
                          <input
                            id="start-date"
                            type="date"
                            value={customStartDate}
                            onChange={(e) => setCustomStartDate(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="end-date">Data Final</Label>
                          <input
                            id="end-date"
                            type="date"
                            value={customEndDate}
                            onChange={(e) => setCustomEndDate(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </div>
                    )}

                    {/* Indicadores de Filtro Ativo */}
                    <div className="flex flex-wrap gap-2">
                      {dashboardData?.filter?.isFiltered && (
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                          👤 {dashboardData.filter.professionalName}
                        </Badge>
                      )}
                      {dashboardData?.period && (
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                          📅 {dashboardData.period.label}
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {dashboardLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <span className="ml-2 text-gray-600">Carregando métricas...</span>
                  </div>
                ) : (
                  <>
                    {/* Métricas Principais */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                      <Card>
                        <CardContent className="p-6">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-gray-600">
                                Receita Total {dashboardData?.filter?.isFiltered ? `- ${dashboardData.filter.professionalName}` : ''}
                              </p>
                              <p className="text-2xl font-bold text-green-600">
                                R$ {dashboardData?.grossRevenue?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}
                              </p>
                              <p className="text-xs text-gray-500">
                                {dashboardData?.filter?.isFiltered
                                  ? `Faturamento do profissional selecionado`
                                  : 'Baseado em agendamentos concluídos'
                                }
                              </p>
                            </div>
                            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                              <CreditCard className="w-6 h-6 text-green-600" />
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardContent className="p-6">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-gray-600">
                                Receita do Período {dashboardData?.filter?.isFiltered ? `- ${dashboardData.filter.professionalName}` : ''}
                              </p>
                              <p className="text-2xl font-bold text-blue-600">
                                R$ {dashboardData?.monthlyRevenue?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}
                              </p>
                              <p className="text-xs text-gray-500">
                                {dashboardData?.period?.label || 'Período atual'}
                                {dashboardData?.filter?.isFiltered && ' - Profissional selecionado'}
                              </p>
                            </div>
                            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                              <TrendingUp className="w-6 h-6 text-blue-600" />
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardContent className="p-6">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-gray-600">
                                Agendamentos {dashboardData?.filter?.isFiltered ? `- ${dashboardData.filter.professionalName}` : ''}
                              </p>
                              <p className="text-2xl font-bold text-purple-600">
                                {dashboardData?.totalAppointments || 0}
                              </p>
                              <p className="text-xs text-gray-500">
                                {dashboardData?.filter?.isFiltered
                                  ? `Agendamentos do profissional`
                                  : 'Total de agendamentos'
                                }
                              </p>
                            </div>
                            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                              <Calendar className="w-6 h-6 text-purple-600" />
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardContent className="p-6">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-gray-600">Profissionais</p>
                              <p className="text-2xl font-bold text-orange-600">
                                {dashboardData?.totalProfessionals || 0}
                              </p>
                              <p className="text-xs text-gray-500">Profissionais ativos</p>
                            </div>
                            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                              <Users className="w-6 h-6 text-orange-600" />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Informações do Profissional Filtrado */}
                    {dashboardData?.filter?.isFiltered && (
                      <Card className="mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
                        <CardHeader>
                          <CardTitle className="flex items-center space-x-2 text-blue-800">
                            <User className="w-5 h-5" />
                            <span>Métricas do Profissional: {dashboardData.filter.professionalName}</span>
                          </CardTitle>
                          <CardDescription className="text-blue-600">
                            Dados específicos de faturamento e performance deste profissional
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="text-center">
                              <p className="text-2xl font-bold text-green-600">
                                R$ {dashboardData?.grossRevenue?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}
                              </p>
                              <p className="text-sm text-gray-600">Faturamento Total</p>
                            </div>
                            <div className="text-center">
                              <p className="text-2xl font-bold text-blue-600">
                                {dashboardData?.totalAppointments || 0}
                              </p>
                              <p className="text-sm text-gray-600">Agendamentos</p>
                            </div>
                            <div className="text-center">
                              <p className="text-2xl font-bold text-purple-600">
                                R$ {dashboardData?.averageTicket?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}
                              </p>
                              <p className="text-sm text-gray-600">Ticket Médio</p>
                            </div>
                            <div className="text-center">
                              <p className="text-2xl font-bold text-orange-600">
                                {dashboardData?.conversionRate?.toFixed(1) || 0}%
                              </p>
                              <p className="text-sm text-gray-600">Taxa de Conversão</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Métricas Detalhadas */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                      <Card>
                        <CardHeader>
                          <CardTitle>Resumo Financeiro</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-4">
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-gray-600">Receita Bruta:</span>
                              <span className="font-semibold text-green-600">
                                R$ {dashboardData?.grossRevenue?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}
                              </span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-gray-600">Comissão Plataforma (10%):</span>
                              <span className="font-semibold text-red-600">
                                - R$ {dashboardData?.platformCommission?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}
                              </span>
                            </div>
                            <div className="border-t pt-2">
                              <div className="flex justify-between items-center">
                                <span className="text-sm font-medium text-gray-800">Receita Líquida:</span>
                                <span className="font-bold text-green-600">
                                  R$ {dashboardData?.netRevenue?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}
                                </span>
                              </div>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-gray-600">Ticket Médio:</span>
                              <span className="font-semibold text-blue-600">
                                R$ {dashboardData?.averageTicket?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}
                              </span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle>Estatísticas Gerais</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-4">
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-gray-600">Total de Clientes:</span>
                              <span className="font-semibold">{dashboardData?.totalCustomers || 0}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-gray-600">Serviços Oferecidos:</span>
                              <span className="font-semibold">{dashboardData?.totalServices || 0}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-gray-600">Agendamentos Concluídos:</span>
                              <span className="font-semibold text-green-600">{dashboardData?.completedAppointments || 0}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-gray-600">Taxa de Conversão:</span>
                              <span className="font-semibold text-blue-600">
                                {dashboardData?.conversionRate?.toFixed(1) || 0}%
                              </span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-gray-600">Agendamentos Mensais:</span>
                              <span className="font-semibold">{dashboardData?.monthlyAppointments || 0}</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {activeSection === 'Profissionais' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Profissionais</h2>
                <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                  {currentClient.name}
                </Badge>
              </div>
              <ProfessionalsManagement clientId={currentClient.id} clientName={currentClient.name} />
            </div>
          )}

          {activeSection === 'Config. Profissionais' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Config. Profissionais</h2>
                <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                  {currentClient.name}
                </Badge>
              </div>
              <ProfessionalScheduleConfig clientId={currentClient.id} />
            </div>
          )}

          {activeSection === 'Especialidades' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Especialidades</h2>
                <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                  {currentClient.name}
                </Badge>
              </div>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Tag className="h-5 w-5" />
                    <span>Especialidades</span>
                  </CardTitle>
                  <CardDescription>
                    Gerencie as especialidades oferecidas pela sua empresa
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8">
                    <Tag className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Especialidades</h3>
                    <p className="text-gray-500 mb-4">
                      Cadastre e gerencie especialidades de {currentClient.name}
                    </p>
                    <p className="text-sm text-gray-400">
                      Interface de especialidades em desenvolvimento...
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {activeSection === 'Serviços' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Serviços</h2>
                <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                  {currentClient?.name}
                </Badge>
              </div>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Briefcase className="h-5 w-5" />
                    <span>Serviços da Empresa</span>
                  </CardTitle>
                  <CardDescription>
                    Gerencie os serviços oferecidos por {currentClient?.name}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="mb-4">
                    <Button onClick={() => setShowNewServiceModal(true)}>
                      <Plus className="w-4 h-4 mr-2" />
                      Adicionar Novo Serviço
                    </Button>
                  </div>
                  {servicesLoading ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
                      <p className="mt-2 text-gray-500">Carregando serviços...</p>
                    </div>
                  ) : servicesData && servicesData.length > 0 ? (
                    <div className="space-y-4">
                      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {servicesData.map((service: any) => (
                          <Card key={service.id} className="border-l-4 border-l-blue-500">
                            <CardHeader className="pb-3">
                              <CardTitle className="text-lg">{service.name}</CardTitle>
                              <Badge variant="outline" className="w-fit">
                                {service.category}
                              </Badge>
                            </CardHeader>
                            <CardContent>
                              <p className="text-sm text-gray-600 mb-3">{service.description}</p>
                              <div className="flex justify-between items-center text-sm">
                                <span className="font-medium text-green-600">
                                  R$ {service.price?.toFixed(2)}
                                </span>
                                <span className="text-gray-500">
                                  {service.duration} min
                                </span>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                      <div className="text-center pt-4">
                        <p className="text-sm text-gray-500">
                          Total: {servicesData.length} serviço(s) cadastrado(s)
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Briefcase className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum serviço encontrado</h3>
                      <p className="text-gray-500 mb-4">
                        Ainda não há serviços cadastrados para {currentClient?.name}
                      </p>
                      <p className="text-sm text-gray-400">
                        Clique no botão "Adicionar Novo Serviço" para começar.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Modal para adicionar novo serviço */}
          <Dialog open={showNewServiceModal} onOpenChange={setShowNewServiceModal}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Adicionar Novo Serviço</DialogTitle>
                <DialogDescription>
                  Preencha os detalhes do novo serviço abaixo.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleNewServiceSubmit}>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="name">Nome do Serviço</Label>
                    <Input id="name" value={newService.name} onChange={(e) => setNewService({...newService, name: e.target.value})} required />
                  </div>
                  <div>
                    <Label htmlFor="description">Descrição</Label>
                    <Textarea id="description" value={newService.description} onChange={(e) => setNewService({...newService, description: e.target.value})} required />
                  </div>
                  <div>
                    <Label htmlFor="duration">Duração (minutos)</Label>
                    <Input id="duration" type="number" value={newService.duration} onChange={(e) => setNewService({...newService, duration: parseInt(e.target.value)})} required />
                  </div>
                  <div>
                    <Label htmlFor="price">Preço (R$)</Label>
                    <Input id="price" type="number" step="0.01" value={newService.price} onChange={(e) => setNewService({...newService, price: parseFloat(e.target.value)})} required />
                  </div>
                </div>
                <DialogFooter className="mt-6">
                  <Button type="button" variant="outline" onClick={() => setShowNewServiceModal(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit">Adicionar Serviço</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          {activeSection === 'Clientes' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Clientes</h2>
                <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                  {currentClient.name}
                </Badge>
              </div>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <UserCheck className="h-5 w-5" />
                    <span>Clientes</span>
                  </CardTitle>
                  <CardDescription>
                    Gerencie os clientes da sua empresa
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8">
                    <UserCheck className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Clientes</h3>
                    <p className="text-gray-500 mb-4">
                      Cadastre e gerencie os clientes de {currentClient.name}
                    </p>
                    <p className="text-sm text-gray-400">
                      Interface de clientes em desenvolvimento...
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {activeSection === 'Configurações' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Configurações</h2>
                <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                  {currentClient.name}
                </Badge>
              </div>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Settings className="h-5 w-5" />
                    <span>Configurações do Sistema</span>
                  </CardTitle>
                  <CardDescription>
                    Configure as preferências e configurações da sua empresa
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8">
                    <Settings className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Configurações</h3>
                    <p className="text-gray-500 mb-4">
                      Personalize as configurações do sistema para {currentClient.name}
                    </p>
                    <p className="text-sm text-gray-400">
                      Interface de configurações em desenvolvimento...
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminEmpresa;
