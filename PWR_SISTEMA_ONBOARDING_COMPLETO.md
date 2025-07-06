# PWR: Sistema de Onboarding Completo - SempreCheioApp

## 📋 Resumo Executivo

Este documento apresenta um plano abrangente para implementar um sistema completo de onboarding de clientes no SempreCheioApp, incluindo registro de empresas, autenticação multi-tenant, gestão de assinaturas com Asaas, e funcionalidades completas de dashboard.

## 🎯 Objetivos

1. **Sistema de Registro de Empresas**: Permitir que novas empresas se cadastrem no sistema
2. **Autenticação Multi-tenant**: Separar dados por empresa com controle de acesso
3. **Gestão de Assinaturas**: Integração com Asaas para cobrança e pagamentos
4. **Dashboard Personalizado**: Interface específica para cada tipo de usuário
5. **Sistema de Onboarding**: Guiar novos usuários através da configuração inicial

## 🏗️ Arquitetura Atual

### ✅ Já Implementado
- ✅ Estrutura de banco de dados completa (Supabase)
- ✅ Schemas TypeScript bem definidos
- ✅ Sistema de autenticação básico
- ✅ Interface de registro de empresas
- ✅ Rotas de API para CRUD de entidades
- ✅ Middleware de auditoria e limites
- ✅ Integração básica com Asaas
- ✅ Sistema de roles (super_admin, company_admin)

### ⚠️ Problemas Identificados
- ⚠️ Erros de TypeScript em `server/storage-clients-auth.ts`
- ⚠️ Problemas de "acesso negado" na autenticação
- ⚠️ Inconsistências de tipos entre schemas e implementação
- ⚠️ Falta de validação robusta de sessões

## 🚀 Plano de Implementação

### 1. **CORREÇÃO DE BUGS CRÍTICOS** (Prioridade Máxima)

#### 1.1 Correção de Tipos TypeScript
**Arquivo**: `server/storage-clients-auth.ts`

**Problemas**:
- Propriedades inexistentes em tipos vazios (`{}`)
- Conversão incorreta de tipos (string → number)
- Interfaces não alinhadas com objetos reais

**Ações**:
```typescript
// Corrigir todas as interfaces Insert* para incluir propriedades opcionais
interface InsertClientFixed {
  name: string;
  email: string;
  phone?: string;
  password?: string;
  serviceType?: string;
  // ... todas as outras propriedades
}

// Garantir conversões de tipo consistentes
const planId = parseInt(planIdStr, 10);
if (isNaN(planId)) {
  throw new Error("Invalid plan ID");
}
```

#### 1.2 Correção do Sistema de Autenticação
**Arquivo**: `server/routes.ts`

**Problemas**:
- Lógica de `requireAuth` inconsistente
- Validação de sessão falhando
- Roles não sendo atribuídos corretamente

**Ações**:
```typescript
const requireAuth = async (req: AuthRequest, res: Response, next: Function) => {
  try {
    const sessionId = req.cookies?.sessionId;
    
    if (!sessionId) {
      return res.status(401).json({ message: "Não autorizado" });
    }
    
    // Validação robusta de sessão
    const user = await storage.getUserBySessionId(sessionId);
    if (!user) {
      return res.status(401).json({ message: "Sessão inválida" });
    }
    
    // Garantir que role está definido
    req.user = {
      ...user,
      role: user.role || 'company_admin'
    };
    
    next();
  } catch (error) {
    console.error("Auth error:", error);
    res.status(500).json({ message: "Erro de autenticação" });
  }
};
```

### 2. **SISTEMA DE ONBOARDING COMPLETO**

#### 2.1 Fluxo de Registro Aprimorado
**Arquivos**: `client/src/pages/register.tsx`, `server/services/client-service.ts`

**Funcionalidades**:
- ✅ Formulário de registro já implementado
- 🔄 Adicionar validação de domínio de email
- 🔄 Verificação de email obrigatória
- 🔄 Configuração inicial automática

**Implementação**:
```typescript
// Adicionar ao ClientService
async registerClientWithOnboarding(data: ClientRegisterRequest) {
  // 1. Criar cliente
  const client = await this.registerClient(data);
  
  // 2. Criar assinatura trial
  await this.createTrialSubscription(client.id);
  
  // 3. Configurar dados iniciais
  await this.setupInitialData(client.id);
  
  // 4. Enviar email de boas-vindas
  await this.sendWelcomeEmail(client.email);
  
  return client;
}
```

#### 2.2 Wizard de Configuração Inicial
**Arquivo**: `client/src/pages/onboarding-wizard.tsx` (NOVO)

**Etapas**:
1. **Verificação de Email**
2. **Configuração da Empresa**
3. **Cadastro do Primeiro Profissional**
4. **Configuração de Serviços**
5. **Configuração de Horários**
6. **Integração WhatsApp** (opcional)
7. **Configuração de Pagamentos**

```typescript
const OnboardingWizard = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [onboardingData, setOnboardingData] = useState({});
  
  const steps = [
    { id: 1, title: "Verificação de Email", component: EmailVerification },
    { id: 2, title: "Dados da Empresa", component: CompanySetup },
    { id: 3, title: "Primeiro Profissional", component: ProfessionalSetup },
    { id: 4, title: "Serviços", component: ServicesSetup },
    { id: 5, title: "Horários", component: ScheduleSetup },
    { id: 6, title: "WhatsApp", component: WhatsAppSetup },
    { id: 7, title: "Pagamentos", component: PaymentSetup },
  ];
  
  return (
    <OnboardingLayout>
      <ProgressIndicator steps={steps} currentStep={currentStep} />
      <StepContent step={currentStep} data={onboardingData} />
      <NavigationButtons onNext={handleNext} onPrev={handlePrev} />
    </OnboardingLayout>
  );
};
```

#### 2.3 Sistema de Templates e Configurações Padrão
**Arquivo**: `server/services/onboarding-service.ts` (NOVO)

```typescript
export class OnboardingService {
  async setupInitialData(clientId: string, serviceType: string) {
    // Criar especialidades padrão baseadas no tipo de serviço
    const defaultSpecialties = this.getDefaultSpecialties(serviceType);
    for (const specialty of defaultSpecialties) {
      await storage.createSpecialty({ ...specialty, clientId });
    }
    
    // Criar serviços padrão
    const defaultServices = this.getDefaultServices(serviceType);
    for (const service of defaultServices) {
      await storage.createService({ ...service, clientId });
    }
    
    // Configurar horários padrão
    await this.setupDefaultSchedule(clientId);
  }
  
  private getDefaultSpecialties(serviceType: string) {
    const templates = {
      'clinica': [
        { name: 'Clínica Geral', color: '#3B82F6' },
        { name: 'Pediatria', color: '#10B981' },
        { name: 'Cardiologia', color: '#F59E0B' }
      ],
      'salao': [
        { name: 'Corte e Escova', color: '#EC4899' },
        { name: 'Coloração', color: '#8B5CF6' },
        { name: 'Tratamentos', color: '#06B6D4' }
      ],
      // ... outros tipos
    };
    
    return templates[serviceType] || templates['clinica'];
  }
}
```

### 3. **SISTEMA DE ASSINATURAS E PAGAMENTOS**

#### 3.1 Planos de Assinatura
**Arquivo**: `server/services/subscription-service.ts` (NOVO)

**Planos Propostos**:
```typescript
const defaultPlans = [
  {
    name: "Starter",
    price: 49.90,
    maxUsers: 2,
    maxAppointments: 100,
    features: ["Dashboard básico", "Agendamentos", "WhatsApp"]
  },
  {
    name: "Professional",
    price: 99.90,
    maxUsers: 5,
    maxAppointments: 500,
    features: ["Tudo do Starter", "Relatórios", "API", "Suporte prioritário"]
  },
  {
    name: "Enterprise",
    price: 199.90,
    maxUsers: -1, // ilimitado
    maxAppointments: -1,
    features: ["Tudo do Professional", "White-label", "Integrações customizadas"]
  }
];
```

#### 3.2 Integração Asaas Completa
**Arquivo**: `server/asaas-service.ts` (APRIMORAR)

**Funcionalidades**:
- ✅ Criação de clientes já implementada
- 🔄 Webhooks para status de pagamento
- 🔄 Gestão de trial periods
- 🔄 Suspensão automática por inadimplência
- 🔄 Reativação de contas

```typescript
export class AsaasService {
  async handleWebhook(event: string, data: any) {
    switch (event) {
      case 'PAYMENT_RECEIVED':
        await this.activateSubscription(data.subscription);
        break;
      case 'PAYMENT_OVERDUE':
        await this.suspendSubscription(data.subscription);
        break;
      case 'PAYMENT_DELETED':
        await this.cancelSubscription(data.subscription);
        break;
    }
  }
  
  async createTrialSubscription(clientId: string) {
    const trialEnd = new Date();
    trialEnd.setDate(trialEnd.getDate() + 14); // 14 dias de trial
    
    return await storage.createSubscription({
      clientId,
      planId: 1, // Plano Starter
      status: 'TRIAL',
      trialStart: new Date(),
      trialEnd,
      currentPeriodStart: new Date(),
      currentPeriodEnd: trialEnd
    });
  }
}
```

### 4. **DASHBOARD E INTERFACE**

#### 4.1 Dashboard Multi-tenant
**Arquivo**: `client/src/pages/admin.tsx` (APRIMORAR)

**Funcionalidades**:
- ✅ Métricas básicas já implementadas
- 🔄 Filtros por período
- 🔄 Gráficos interativos
- 🔄 Alertas de limite de uso
- 🔄 Status da assinatura

#### 4.2 Sistema de Notificações
**Arquivo**: `client/src/components/notification-system.tsx` (NOVO)

```typescript
const NotificationSystem = () => {
  const { notifications } = useNotifications();
  
  return (
    <div className="notification-container">
      {notifications.map(notification => (
        <NotificationCard 
          key={notification.id}
          type={notification.type}
          message={notification.message}
          actions={notification.actions}
        />
      ))}
    </div>
  );
};
```

#### 4.3 Configurações da Empresa
**Arquivo**: `client/src/pages/company-settings.tsx` (NOVO)

**Seções**:
- Informações básicas
- Configurações de horário
- Integrações (WhatsApp, Asaas)
- Usuários e permissões
- Plano e faturamento
- Backup e segurança

### 5. **SISTEMA DE LIMITES E CONTROLE**

#### 5.1 Middleware de Limites Aprimorado
**Arquivo**: `server/middleware/limits.ts` (APRIMORAR)

```typescript
export const checkSubscriptionLimits = async (req: AuthRequest, res: Response, next: Function) => {
  try {
    const client = await storage.getClientByEmail(req.user.email);
    const subscription = await storage.getActiveSubscription(client.id);
    
    if (!subscription || subscription.status !== 'ACTIVE') {
      return res.status(403).json({ 
        message: "Assinatura inativa. Renove para continuar usando o sistema.",
        code: "SUBSCRIPTION_INACTIVE"
      });
    }
    
    // Verificar limites específicos baseados na rota
    const route = req.route.path;
    if (route.includes('/appointments') && req.method === 'POST') {
      const appointmentCount = await storage.getAppointmentCount(client.id);
      if (appointmentCount >= subscription.plan.maxAppointments) {
        return res.status(403).json({
          message: "Limite de agendamentos atingido. Faça upgrade do seu plano.",
          code: "APPOINTMENT_LIMIT_REACHED"
        });
      }
    }
    
    next();
  } catch (error) {
    next(error);
  }
};
```

### 6. **SISTEMA DE COMUNICAÇÃO**

#### 6.1 Email Service
**Arquivo**: `server/services/email-service.ts` (NOVO)

```typescript
export class EmailService {
  async sendWelcomeEmail(clientEmail: string, clientName: string) {
    const template = await this.getTemplate('welcome');
    const html = this.renderTemplate(template, { clientName });
    
    return await this.sendEmail({
      to: clientEmail,
      subject: 'Bem-vindo ao SempreCheioApp!',
      html
    });
  }
  
  async sendTrialExpiringEmail(clientEmail: string, daysLeft: number) {
    // Implementar notificação de trial expirando
  }
  
  async sendPaymentFailedEmail(clientEmail: string, invoiceUrl: string) {
    // Implementar notificação de pagamento falhado
  }
}
```

#### 6.2 WhatsApp Integration
**Arquivo**: `server/services/whatsapp-service.ts` (NOVO)

```typescript
export class WhatsAppService {
  async sendAppointmentConfirmation(phone: string, appointmentData: any) {
    const message = this.formatAppointmentMessage(appointmentData);
    return await this.sendMessage(phone, message);
  }
  
  async sendAppointmentReminder(phone: string, appointmentData: any) {
    const message = this.formatReminderMessage(appointmentData);
    return await this.sendMessage(phone, message);
  }
}
```

## 📊 Cronograma de Implementação

### Fase 1: Correções Críticas (1-2 dias)
- [ ] Corrigir erros TypeScript
- [ ] Resolver problemas de autenticação
- [ ] Testar fluxo de registro básico

### Fase 2: Sistema de Onboarding (3-5 dias)
- [ ] Implementar wizard de configuração
- [ ] Criar templates de dados iniciais
- [ ] Sistema de verificação de email
- [ ] Configuração automática de trial

### Fase 3: Assinaturas e Pagamentos (3-4 dias)
- [ ] Completar integração Asaas
- [ ] Implementar webhooks
- [ ] Sistema de limites por plano
- [ ] Interface de gestão de assinatura

### Fase 4: Dashboard e UX (2-3 dias)
- [ ] Aprimorar dashboard
- [ ] Sistema de notificações
- [ ] Configurações da empresa
- [ ] Testes de usabilidade

### Fase 5: Comunicação e Automação (2-3 dias)
- [ ] Email service
- [ ] WhatsApp integration
- [ ] Automações de onboarding
- [ ] Documentação

## 🧪 Testes e Validação

### Testes Unitários
- [ ] Testes para todos os services
- [ ] Testes de autenticação
- [ ] Testes de limites e validações

### Testes de Integração
- [ ] Fluxo completo de registro
- [ ] Integração Asaas
- [ ] Webhooks e notificações

### Testes de Usabilidade
- [ ] Onboarding de novos usuários
- [ ] Navegação entre funcionalidades
- [ ] Responsividade mobile

## 📈 Métricas de Sucesso

### Técnicas
- [ ] 0 erros TypeScript
- [ ] Tempo de resposta < 500ms
- [ ] 99.9% uptime
- [ ] Cobertura de testes > 80%

### Negócio
- [ ] Taxa de conversão trial → pago > 20%
- [ ] Tempo de onboarding < 10 minutos
- [ ] NPS > 8.0
- [ ] Churn rate < 5%

## 🔒 Segurança e Compliance

### Implementações Necessárias
- [ ] Criptografia de dados sensíveis
- [ ] Logs de auditoria completos
- [ ] Rate limiting
- [ ] Validação de entrada robusta
- [ ] Backup automático
- [ ] LGPD compliance

## 📚 Documentação

### Para Desenvolvedores
- [ ] API documentation
- [ ] Guias de setup
- [ ] Arquitetura do sistema
- [ ] Troubleshooting guide

### Para Usuários
- [ ] Manual de onboarding
- [ ] Tutoriais em vídeo
- [ ] FAQ
- [ ] Suporte técnico

## 🎯 Próximos Passos Imediatos

1. **Revisar e aprovar este PWR**
2. **Configurar ambiente de desenvolvimento**
3. **Iniciar Fase 1: Correções Críticas**
4. **Setup de CI/CD para deploys automáticos**
5. **Configurar monitoramento e alertas**

---

**Estimativa Total**: 11-17 dias de desenvolvimento
**Recursos Necessários**: 1-2 desenvolvedores full-stack
**Investimento**: Médio-Alto
**ROI Esperado**: Alto (sistema completo de SaaS)

Este PWR serve como roadmap completo para transformar o SempreCheioApp em uma plataforma SaaS robusta e escalável.
