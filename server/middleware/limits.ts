import { Request, Response, NextFunction } from 'express';
import { storage } from '../storage-clients-auth';

interface AuthRequest extends Request {
  user?: {
    id: number;
    name: string;
    email: string;
    role: string;
    createdAt: Date;
  };
}

interface ClientLimits {
  maxUsers: number;
  maxAppointments: number;
  maxStorage: number; // GB
  plan: string;
}

interface UsageStats {
  currentUsers: number;
  currentAppointments: number;
  currentStorage: number; // GB
}

class LimitsValidator {
  // Verificar se o cliente pode criar um novo recurso
  async checkResourceLimit(
    clientId: string,
    resourceType: 'users' | 'appointments' | 'storage',
    additionalAmount: number = 1
  ): Promise<{ allowed: boolean; message?: string; usage?: UsageStats; limits?: ClientLimits }> {
    try {
      const client = await storage.getClient(clientId);
      if (!client) {
        return { allowed: false, message: 'Cliente não encontrado' };
      }

      const limits: ClientLimits = {
        maxUsers: client.maxUsers || 5,
        maxAppointments: client.maxAppointments || 100,
        maxStorage: client.maxStorage || 1,
        plan: client.plan || 'basic'
      };

      const usage = await this.getCurrentUsage(clientId);

      switch (resourceType) {
        case 'users':
          const newUserCount = usage.currentUsers + additionalAmount;
          if (newUserCount > limits.maxUsers) {
            return {
              allowed: false,
              message: `Limite de usuários excedido. Plano ${limits.plan} permite até ${limits.maxUsers} usuários. Atual: ${usage.currentUsers}`,
              usage,
              limits
            };
          }
          break;

        case 'appointments':
          const newAppointmentCount = usage.currentAppointments + additionalAmount;
          if (newAppointmentCount > limits.maxAppointments) {
            return {
              allowed: false,
              message: `Limite de agendamentos excedido. Plano ${limits.plan} permite até ${limits.maxAppointments} agendamentos. Atual: ${usage.currentAppointments}`,
              usage,
              limits
            };
          }
          break;

        case 'storage':
          const newStorageUsage = usage.currentStorage + additionalAmount;
          if (newStorageUsage > limits.maxStorage) {
            return {
              allowed: false,
              message: `Limite de armazenamento excedido. Plano ${limits.plan} permite até ${limits.maxStorage}GB. Atual: ${usage.currentStorage.toFixed(2)}GB`,
              usage,
              limits
            };
          }
          break;
      }

      return { allowed: true, usage, limits };
    } catch (error) {
      console.error('Error checking resource limit:', error);
      return { allowed: false, message: 'Erro interno ao verificar limites' };
    }
  }

  // Obter uso atual dos recursos
  private async getCurrentUsage(clientId: string): Promise<UsageStats> {
    try {
      // Contar usuários (profissionais) da empresa
      const professionals = await storage.listProfessionalsByClient(clientId);
      const currentUsers = professionals.length;

      // Contar agendamentos do mês atual
      const currentDate = new Date();
      const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
      
      const appointments = await storage.listAppointments({
        clientId,
        startDate: startOfMonth,
        endDate: endOfMonth
      });
      const currentAppointments = appointments.length;

      // Calcular uso de armazenamento (simulado por enquanto)
      // TODO: Implementar cálculo real baseado em arquivos/documentos
      const currentStorage = Math.random() * 0.5; // Simulado: 0-500MB

      return {
        currentUsers,
        currentAppointments,
        currentStorage
      };
    } catch (error) {
      console.error('Error getting current usage:', error);
      return {
        currentUsers: 0,
        currentAppointments: 0,
        currentStorage: 0
      };
    }
  }

  // Middleware para verificar limites antes de criar recursos
  checkLimitsMiddleware(resourceType: 'users' | 'appointments' | 'storage') {
    return async (req: AuthRequest, res: Response, next: NextFunction) => {
      try {
        // Só aplicar limites para admins de empresa
        if (req.user?.role !== 'company_admin') {
          return next();
        }

        // Obter client_id do usuário
        const client = await storage.getClientByEmail(req.user.email);
        if (!client) {
          return res.status(403).json({ message: 'Cliente não encontrado' });
        }

        // Verificar limites
        const result = await this.checkResourceLimit(client.id, resourceType);
        
        if (!result.allowed) {
          return res.status(429).json({
            message: result.message,
            usage: result.usage,
            limits: result.limits,
            upgradeRequired: true
          });
        }

        // Adicionar informações de uso à requisição para uso posterior
        (req as any).clientLimits = result.limits;
        (req as any).clientUsage = result.usage;

        next();
      } catch (error) {
        console.error('Error in limits middleware:', error);
        res.status(500).json({ message: 'Erro interno do servidor' });
      }
    };
  }

  // Obter estatísticas de uso para dashboard
  async getUsageStats(clientId: string): Promise<{
    usage: UsageStats;
    limits: ClientLimits;
    percentages: {
      users: number;
      appointments: number;
      storage: number;
    };
  } | null> {
    try {
      const client = await storage.getClient(clientId);
      if (!client) return null;

      const limits: ClientLimits = {
        maxUsers: client.maxUsers || 5,
        maxAppointments: client.maxAppointments || 100,
        maxStorage: client.maxStorage || 1,
        plan: client.plan || 'basic'
      };

      const usage = await this.getCurrentUsage(clientId);

      const percentages = {
        users: Math.round((usage.currentUsers / limits.maxUsers) * 100),
        appointments: Math.round((usage.currentAppointments / limits.maxAppointments) * 100),
        storage: Math.round((usage.currentStorage / limits.maxStorage) * 100)
      };

      return {
        usage,
        limits,
        percentages
      };
    } catch (error) {
      console.error('Error getting usage stats:', error);
      return null;
    }
  }

  // Verificar se o cliente pode fazer upgrade de plano
  getAvailableUpgrades(currentPlan: string): Array<{
    plan: string;
    name: string;
    maxUsers: number;
    maxAppointments: number;
    maxStorage: number;
    price: number;
    features: string[];
  }> {
    const plans = [
      {
        plan: 'basic',
        name: 'Básico',
        maxUsers: 5,
        maxAppointments: 100,
        maxStorage: 1,
        price: 97,
        features: ['Agenda básica', 'WhatsApp', 'Suporte email']
      },
      {
        plan: 'pro',
        name: 'Profissional',
        maxUsers: 15,
        maxAppointments: 500,
        maxStorage: 5,
        price: 197,
        features: ['Agenda avançada', 'WhatsApp + IA', 'Relatórios', 'Suporte prioritário']
      },
      {
        plan: 'enterprise',
        name: 'Empresarial',
        maxUsers: 50,
        maxAppointments: 2000,
        maxStorage: 20,
        price: 397,
        features: ['Recursos ilimitados', 'IA avançada', 'API personalizada', 'Suporte 24/7']
      }
    ];

    // Retornar apenas planos superiores ao atual
    const currentIndex = plans.findIndex(p => p.plan === currentPlan);
    return plans.slice(currentIndex + 1);
  }
}

// Instância global do validador de limites
export const limitsValidator = new LimitsValidator();

// Middlewares específicos para cada tipo de recurso
export const checkUserLimits = limitsValidator.checkLimitsMiddleware('users');
export const checkAppointmentLimits = limitsValidator.checkLimitsMiddleware('appointments');
export const checkStorageLimits = limitsValidator.checkLimitsMiddleware('storage');

// Função para verificar limites manualmente
export async function checkResourceLimit(
  clientId: string,
  resourceType: 'users' | 'appointments' | 'storage',
  amount: number = 1
) {
  return limitsValidator.checkResourceLimit(clientId, resourceType, amount);
}

// Função para obter estatísticas de uso
export async function getClientUsageStats(clientId: string) {
  return limitsValidator.getUsageStats(clientId);
}

// Tipos para exportação
export type { ClientLimits, UsageStats };
