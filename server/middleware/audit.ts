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

interface AuditLogData {
  clientId?: string;
  userId: string;
  action: string;
  resource: string;
  resourceId?: string;
  oldValues?: any;
  newValues?: any;
  ipAddress?: string;
  userAgent?: string;
  success: boolean;
  errorMessage?: string;
}

class AuditLogger {
  async log(data: AuditLogData): Promise<void> {
    try {
      // Implementar quando tivermos a função no storage
      console.log('AUDIT LOG:', JSON.stringify(data, null, 2));
    } catch (error) {
      console.error('Failed to log audit entry:', error);
    }
  }

  // Middleware para capturar dados da requisição
  middleware() {
    return (req: AuthRequest, res: Response, next: NextFunction) => {
      const originalSend = res.send;
      const originalJson = res.json;
      
      // Capturar dados da requisição
      const requestData = {
        method: req.method,
        url: req.url,
        body: req.body,
        query: req.query,
        params: req.params,
        user: req.user,
        ip: req.ip || req.connection.remoteAddress,
        userAgent: req.get('User-Agent')
      };

      // Interceptar resposta para determinar sucesso/erro
      res.send = function(body: any) {
        // Log da ação se for uma operação importante
        if (shouldAudit(req)) {
          const auditData = createAuditData(req, res, body, requestData);
          auditLogger.log(auditData);
        }
        return originalSend.call(this, body);
      };

      res.json = function(body: any) {
        // Log da ação se for uma operação importante
        if (shouldAudit(req)) {
          const auditData = createAuditData(req, res, body, requestData);
          auditLogger.log(auditData);
        }
        return originalJson.call(this, body);
      };

      next();
    };
  }
}

// Determinar se a requisição deve ser auditada
function shouldAudit(req: AuthRequest): boolean {
  const method = req.method;
  const url = req.url;

  // Auditar operações de escrita (POST, PUT, DELETE)
  if (['POST', 'PUT', 'DELETE'].includes(method)) {
    return true;
  }

  // Auditar login/logout
  if (url.includes('/auth/login') || url.includes('/auth/logout')) {
    return true;
  }

  // Auditar acesso a dados sensíveis
  if (url.includes('/api/clients') || url.includes('/api/users')) {
    return true;
  }

  return false;
}

// Criar dados de auditoria baseado na requisição
function createAuditData(req: AuthRequest, res: Response, responseBody: any, requestData: any): AuditLogData {
  const action = getActionFromRequest(req);
  const resource = getResourceFromRequest(req);
  const resourceId = getResourceIdFromRequest(req, responseBody);
  
  // Determinar client_id baseado no usuário ou dados da requisição
  let clientId: string | undefined;
  if (req.user?.role === 'company_admin') {
    // Para admins de empresa, usar o client_id do usuário
    clientId = req.body?.clientId || req.query?.clientId as string;
  }

  return {
    clientId,
    userId: req.user?.email || 'anonymous',
    action,
    resource,
    resourceId,
    oldValues: req.method === 'PUT' ? requestData.body?.oldValues : undefined,
    newValues: req.method !== 'GET' ? requestData.body : undefined,
    ipAddress: requestData.ip,
    userAgent: requestData.userAgent,
    success: res.statusCode >= 200 && res.statusCode < 400,
    errorMessage: res.statusCode >= 400 ? responseBody?.message : undefined
  };
}

// Extrair ação da requisição
function getActionFromRequest(req: AuthRequest): string {
  const method = req.method;
  const url = req.url;

  if (url.includes('/auth/login')) return 'LOGIN';
  if (url.includes('/auth/logout')) return 'LOGOUT';
  if (url.includes('/auth/register')) return 'REGISTER';

  switch (method) {
    case 'POST': return 'CREATE';
    case 'PUT': return 'UPDATE';
    case 'DELETE': return 'DELETE';
    case 'GET': return 'READ';
    default: return method;
  }
}

// Extrair recurso da requisição
function getResourceFromRequest(req: AuthRequest): string {
  const url = req.url;
  
  if (url.includes('/api/clients')) return 'clients';
  if (url.includes('/api/professionals')) return 'professionals';
  if (url.includes('/api/appointments')) return 'appointments';
  if (url.includes('/api/customers')) return 'customers';
  if (url.includes('/api/services')) return 'services';
  if (url.includes('/api/specialties')) return 'specialties';
  if (url.includes('/api/connections')) return 'connections';
  if (url.includes('/api/users')) return 'users';
  if (url.includes('/auth')) return 'auth';
  
  return 'unknown';
}

// Extrair ID do recurso da requisição ou resposta
function getResourceIdFromRequest(req: AuthRequest, responseBody: any): string | undefined {
  // Tentar extrair do parâmetro da URL
  if (req.params?.id) return req.params.id;
  
  // Tentar extrair do corpo da resposta
  if (responseBody?.id) return responseBody.id;
  
  // Tentar extrair do corpo da requisição
  if (req.body?.id) return req.body.id;
  
  return undefined;
}

// Instância global do audit logger
export const auditLogger = new AuditLogger();

// Middleware para usar nas rotas
export const auditMiddleware = auditLogger.middleware();

// Função para log manual de auditoria
export async function logAudit(data: Partial<AuditLogData>): Promise<void> {
  const fullData: AuditLogData = {
    userId: 'system',
    action: 'UNKNOWN',
    resource: 'unknown',
    success: true,
    ...data
  };
  
  await auditLogger.log(fullData);
}

// Tipos para exportação
export type { AuditLogData };
