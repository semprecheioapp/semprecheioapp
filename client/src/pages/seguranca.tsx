import React, { useState } from 'react';
import { ModernLayout, ModernPageHeader, ModernCard, ModernButton, ModernBadge } from '@/components/layout/ModernLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { 
  Shield, 
  ArrowLeft, 
  Smartphone, 
  Mail, 
  Clock, 
  AlertTriangle,
  CheckCircle,
  Key,
  Eye,
  Download
} from 'lucide-react';

export default function Seguranca() {
  const { toast } = useToast();
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [loginAlerts, setLoginAlerts] = useState(true);
  const [sessionTimeout, setSessionTimeout] = useState(true);

  const handleBack = () => {
    window.history.back();
  };

  const handleTwoFactorToggle = (enabled: boolean) => {
    setTwoFactorEnabled(enabled);
    toast({
      title: enabled ? "2FA Ativado" : "2FA Desativado",
      description: enabled 
        ? "Autenticação de dois fatores foi ativada com sucesso."
        : "Autenticação de dois fatores foi desativada.",
    });
  };

  const handleSettingToggle = (setting: string, enabled: boolean, setter: (value: boolean) => void) => {
    setter(enabled);
    toast({
      title: "Configuração atualizada",
      description: `${setting} foi ${enabled ? 'ativado' : 'desativado'}.`,
    });
  };

  // Dados simulados de sessões ativas
  const activeSessions = [
    {
      id: 1,
      device: "Chrome - Windows",
      location: "São Paulo, SP",
      lastActive: "Agora",
      current: true,
    },
    {
      id: 2,
      device: "Safari - iPhone",
      location: "São Paulo, SP", 
      lastActive: "2 horas atrás",
      current: false,
    },
  ];

  // Dados simulados de atividades recentes
  const recentActivities = [
    {
      id: 1,
      action: "Login realizado",
      device: "Chrome - Windows",
      time: "Agora",
      status: "success",
    },
    {
      id: 2,
      action: "Senha alterada",
      device: "Chrome - Windows",
      time: "2 dias atrás",
      status: "success",
    },
    {
      id: 3,
      action: "Tentativa de login falhada",
      device: "Desconhecido",
      time: "1 semana atrás",
      status: "warning",
    },
  ];

  return (
    <ModernLayout maxWidth="normal" padding="normal">
      <ModernPageHeader
        title="Segurança"
        subtitle="Gerencie as configurações de segurança da sua conta"
        action={
          <ModernButton
            variant="outline"
            onClick={handleBack}
            icon={<ArrowLeft className="w-4 h-4" />}
          >
            Voltar
          </ModernButton>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Configurações de Segurança */}
        <div className="space-y-6">
          {/* Autenticação de Dois Fatores */}
          <ModernCard>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Smartphone className="w-5 h-5" />
                Autenticação de Dois Fatores
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Ativar 2FA</Label>
                  <p className="text-sm text-muted-foreground">
                    Adicione uma camada extra de segurança
                  </p>
                </div>
                <Switch
                  checked={twoFactorEnabled}
                  onCheckedChange={handleTwoFactorToggle}
                />
              </div>
              
              {twoFactorEnabled && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span className="text-sm font-medium text-green-800">
                      2FA está ativo
                    </span>
                  </div>
                  <p className="text-xs text-green-700 mt-1">
                    Sua conta está protegida com autenticação de dois fatores
                  </p>
                </div>
              )}
              
              {!twoFactorEnabled && (
                <ModernButton variant="outline" className="w-full">
                  Configurar 2FA
                </ModernButton>
              )}
            </CardContent>
          </ModernCard>

          {/* Notificações de Segurança */}
          <ModernCard>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="w-5 h-5" />
                Notificações
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Alertas por Email</Label>
                  <p className="text-sm text-muted-foreground">
                    Receba emails sobre atividades suspeitas
                  </p>
                </div>
                <Switch
                  checked={emailNotifications}
                  onCheckedChange={(enabled) => 
                    handleSettingToggle("Alertas por email", enabled, setEmailNotifications)
                  }
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Alertas de Login</Label>
                  <p className="text-sm text-muted-foreground">
                    Notificações sobre novos logins
                  </p>
                </div>
                <Switch
                  checked={loginAlerts}
                  onCheckedChange={(enabled) => 
                    handleSettingToggle("Alertas de login", enabled, setLoginAlerts)
                  }
                />
              </div>
            </CardContent>
          </ModernCard>

          {/* Configurações de Sessão */}
          <ModernCard>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Sessões
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Timeout Automático</Label>
                  <p className="text-sm text-muted-foreground">
                    Desconectar após inatividade
                  </p>
                </div>
                <Switch
                  checked={sessionTimeout}
                  onCheckedChange={(enabled) => 
                    handleSettingToggle("Timeout automático", enabled, setSessionTimeout)
                  }
                />
              </div>
              
              <ModernButton variant="outline" className="w-full">
                Encerrar Todas as Sessões
              </ModernButton>
            </CardContent>
          </ModernCard>
        </div>

        {/* Atividades e Sessões */}
        <div className="space-y-6">
          {/* Sessões Ativas */}
          <ModernCard>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="w-5 h-5" />
                Sessões Ativas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {activeSessions.map((session) => (
                  <div key={session.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{session.device}</p>
                        {session.current && (
                          <ModernBadge variant="success" size="sm">
                            Atual
                          </ModernBadge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{session.location}</p>
                      <p className="text-xs text-muted-foreground">{session.lastActive}</p>
                    </div>
                    {!session.current && (
                      <ModernButton variant="outline" size="sm">
                        Encerrar
                      </ModernButton>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </ModernCard>

          {/* Atividades Recentes */}
          <ModernCard>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Atividades Recentes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentActivities.map((activity) => (
                  <div key={activity.id} className="flex items-start gap-3 p-3 border rounded-lg">
                    <div className="mt-1">
                      {activity.status === 'success' && (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      )}
                      {activity.status === 'warning' && (
                        <AlertTriangle className="w-4 h-4 text-yellow-500" />
                      )}
                    </div>
                    <div className="flex-1 space-y-1">
                      <p className="font-medium">{activity.action}</p>
                      <p className="text-sm text-muted-foreground">{activity.device}</p>
                      <p className="text-xs text-muted-foreground">{activity.time}</p>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="pt-4">
                <ModernButton variant="outline" className="w-full">
                  <Download className="w-4 h-4 mr-2" />
                  Baixar Relatório Completo
                </ModernButton>
              </div>
            </CardContent>
          </ModernCard>

          {/* Ações Rápidas */}
          <ModernCard>
            <CardHeader>
              <CardTitle>Ações Rápidas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <ModernButton
                  variant="outline"
                  onClick={() => window.location.href = '/alterar-senha'}
                  className="w-full justify-start"
                  icon={<Key className="w-4 h-4" />}
                >
                  Alterar Senha
                </ModernButton>
                <ModernButton
                  variant="outline"
                  onClick={() => window.location.href = '/perfil'}
                  className="w-full justify-start"
                >
                  Voltar ao Perfil
                </ModernButton>
              </div>
            </CardContent>
          </ModernCard>
        </div>
      </div>
    </ModernLayout>
  );
}
