import React, { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { ModernLayout, ModernPageHeader, ModernCard, ModernButton, ModernInput } from '@/components/layout/ModernLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { User, Mail, Building, Calendar, Save, ArrowLeft } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const profileSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  email: z.string().email('Email inválido'),
  phone: z.string().optional(),
  company: z.string().optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

export default function Perfil() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user?.name || '',
      email: user?.email || '',
      phone: '',
      company: '',
    },
  });

  const onSubmit = async (data: ProfileFormData) => {
    setIsSaving(true);
    try {
      // Simular salvamento (implementar API real depois)
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast({
        title: "Perfil atualizado",
        description: "Suas informações foram salvas com sucesso.",
      });
      
      setIsEditing(false);
    } catch (error) {
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível atualizar o perfil. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleBack = () => {
    window.history.back();
  };

  if (!user) {
    return null;
  }

  return (
    <ModernLayout maxWidth="narrow" padding="normal">
      <ModernPageHeader
        title="Meu Perfil"
        subtitle="Gerencie suas informações pessoais"
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

      <div className="space-y-6">
        {/* Informações Básicas */}
        <ModernCard>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Informações Pessoais
            </CardTitle>
            {!isEditing && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditing(true)}
              >
                Editar
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {isEditing ? (
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <ModernInput
                  label="Nome completo"
                  {...form.register('name')}
                  error={form.formState.errors.name?.message}
                />
                
                <ModernInput
                  label="Email"
                  type="email"
                  {...form.register('email')}
                  error={form.formState.errors.email?.message}
                />
                
                <ModernInput
                  label="Telefone (opcional)"
                  {...form.register('phone')}
                  placeholder="(11) 99999-9999"
                />
                
                <ModernInput
                  label="Empresa (opcional)"
                  {...form.register('company')}
                />

                <div className="flex gap-3 pt-4">
                  <ModernButton
                    type="submit"
                    loading={isSaving}
                    icon={<Save className="w-4 h-4" />}
                  >
                    Salvar Alterações
                  </ModernButton>
                  <ModernButton
                    type="button"
                    variant="outline"
                    onClick={() => setIsEditing(false)}
                    disabled={isSaving}
                  >
                    Cancelar
                  </ModernButton>
                </div>
              </form>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Nome</Label>
                    <p className="text-base font-medium">{user.name}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Email</Label>
                    <p className="text-base">{user.email}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Tipo de Conta</Label>
                    <Badge variant="secondary" className="mt-1">
                      {user.role === 'super_admin' ? 'Super Administrador' : 'Administrador'}
                    </Badge>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Status</Label>
                    <Badge variant="default" className="mt-1 bg-green-100 text-green-800">
                      Ativo
                    </Badge>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </ModernCard>

        {/* Informações da Conta */}
        <ModernCard>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="w-5 h-5" />
              Informações da Conta
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium text-muted-foreground">ID do Usuário</Label>
                <p className="text-base font-mono">{user.id}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Tipo de Serviço</Label>
                <p className="text-base">{user.serviceType}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Data de Criação</Label>
                <p className="text-base">Não disponível</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Último Acesso</Label>
                <p className="text-base">Agora</p>
              </div>
            </div>
          </CardContent>
        </ModernCard>

        {/* Ações Rápidas */}
        <ModernCard>
          <CardHeader>
            <CardTitle>Ações Rápidas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <ModernButton
                variant="outline"
                onClick={() => window.location.href = '/alterar-senha'}
                className="justify-start"
              >
                Alterar Senha
              </ModernButton>
              <ModernButton
                variant="outline"
                onClick={() => window.location.href = '/seguranca'}
                className="justify-start"
              >
                Configurações de Segurança
              </ModernButton>
            </div>
          </CardContent>
        </ModernCard>
      </div>
    </ModernLayout>
  );
}
