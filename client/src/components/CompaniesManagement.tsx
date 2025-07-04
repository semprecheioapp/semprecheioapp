import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import {
  Building2,
  Users,
  Calendar,
  DollarSign,
  TrendingUp,
  Eye,
  BarChart3,
  PieChart,
  ArrowLeft
} from 'lucide-react';

interface CompanyMetrics {
  company: {
    id: string;
    name: string;
    email: string;
    createdAt: string;
  };
  metrics: {
    totalProfessionals: number;
    totalCustomers: number;
    totalServices: number;
    totalAppointments: number;
    completedAppointments: number;
    grossRevenue: number;
    platformCommission: number;
    netRevenue: number;
    monthlyRevenue: number;
    monthlyAppointments: number;
    conversionRate: number;
    averageTicket: number;
  };
  recentAppointments: any[];
}

interface CompaniesData {
  companies: CompanyMetrics[];
  summary: {
    totalCompanies: number;
    totalRevenue: number;
    totalCommission: number;
    totalAppointments: number;
  };
}

export function CompaniesManagement() {
  const [companiesData, setCompaniesData] = useState<CompaniesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCompany, setSelectedCompany] = useState<CompanyMetrics | null>(null);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    fetchCompaniesMetrics();
  }, []);

  const fetchCompaniesMetrics = async () => {
    try {
      const response = await fetch('/api/companies/metrics');
      if (response.ok) {
        const data = await response.json();
        setCompaniesData(data);
      }
    } catch (error) {
      console.error('Erro ao buscar métricas das empresas:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Carregando métricas das empresas...</p>
        </div>
      </div>
    );
  }

  if (!companiesData) {
    return (
      <div className="text-center p-8">
        <p>Erro ao carregar dados das empresas.</p>
        <Button onClick={fetchCompaniesMetrics} className="mt-4">
          Tentar Novamente
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Resumo Geral */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Empresas</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{companiesData.summary.totalCompanies}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receita Total</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(companiesData.summary.totalRevenue)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Comissão Plataforma</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(companiesData.summary.totalCommission)}</div>
            <p className="text-xs text-muted-foreground">10% sobre receita bruta</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Agendamentos</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{companiesData.summary.totalAppointments}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="details">Detalhes por Empresa</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4">
            {companiesData.companies.map((company) => (
              <Card key={company.company.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Building2 className="h-5 w-5" />
                        {company.company.name}
                      </CardTitle>
                      <CardDescription>{company.company.email}</CardDescription>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedCompany(company);
                        setActiveTab("details");
                      }}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Ver Detalhes
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {formatCurrency(company.metrics.monthlyRevenue)}
                      </div>
                      <p className="text-sm text-muted-foreground">Receita Mensal</p>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        {company.metrics.conversionRate?.toFixed(1) || 0}%
                      </div>
                      <p className="text-sm text-muted-foreground">Taxa de Conversão</p>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold">{company.metrics.totalAppointments}</div>
                      <p className="text-sm text-muted-foreground">Agendamentos</p>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold">{company.metrics.totalProfessionals}</div>
                      <p className="text-sm text-muted-foreground">Profissionais</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="text-center">
                      <div className="text-lg font-semibold text-green-600">
                        {formatCurrency(company.metrics.netRevenue)}
                      </div>
                      <p className="text-xs text-muted-foreground">Receita Líquida Total</p>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-semibold">
                        {formatCurrency(company.metrics.averageTicket || 0)}
                      </div>
                      <p className="text-xs text-muted-foreground">Ticket Médio</p>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-semibold">{company.metrics.totalCustomers}</div>
                      <p className="text-xs text-muted-foreground">Clientes</p>
                    </div>
                  </div>
                  
                  <div className="mt-4 flex items-center justify-between">
                    <Badge variant="secondary">
                      Cadastrada em {formatDate(company.company.createdAt)}
                    </Badge>
                    <div className="text-sm text-muted-foreground">
                      Comissão: {formatCurrency(company.metrics.platformCommission)}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="details" className="space-y-4">
          {selectedCompany ? (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Detalhes - {selectedCompany.company.name}</CardTitle>
                    <CardDescription>Análise completa da empresa</CardDescription>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setActiveTab("overview")}
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Voltar
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Receita Mensal</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-green-600">
                        {formatCurrency(selectedCompany.metrics.monthlyRevenue)}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {selectedCompany.metrics.monthlyAppointments} agendamentos este mês
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Taxa de Conversão</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-blue-600">
                        {selectedCompany.metrics.conversionRate?.toFixed(1) || 0}%
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {selectedCompany.metrics.completedAppointments} de {selectedCompany.metrics.totalAppointments} agendamentos
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Ticket Médio</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-purple-600">
                        {formatCurrency(selectedCompany.metrics.averageTicket || 0)}
                      </div>
                      <p className="text-sm text-muted-foreground">Por consulta</p>
                    </CardContent>
                  </Card>
                </div>

                <div>
                  <h4 className="text-lg font-semibold mb-3">Agendamentos Recentes</h4>
                  <div className="space-y-2">
                    {selectedCompany.recentAppointments.slice(0, 5).map((appointment, index) => (
                      <div key={appointment.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">{appointment.customerName}</p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(appointment.scheduledAt).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                        <Badge variant={
                          appointment.status === 'confirmed' || appointment.status === 'confirmado'
                            ? 'default'
                            : 'secondary'
                        }>
                          {appointment.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="text-center py-8">
                <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  Selecione uma empresa na aba "Visão Geral" para ver os detalhes
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
