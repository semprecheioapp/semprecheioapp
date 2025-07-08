import { Request, Response, NextFunction } from 'express';
import { applySanitization } from '../utils/dataSanitizer';

/**
 * Middleware global para sanitização automática de respostas
 * Intercepta res.json() e aplica sanitização baseada no contexto
 */

interface SanitizationOptions {
  enabled: boolean;
  logSanitization: boolean;
  strictMode: boolean;
}

const defaultOptions: SanitizationOptions = {
  enabled: process.env.NODE_ENV === 'production',
  logSanitization: process.env.NODE_ENV === 'development',
  strictMode: process.env.NODE_ENV === 'production'
};

/**
 * Detecta o tipo de dados baseado na URL e estrutura
 */
function detectDataType(url: string, data: any): 'user' | 'client' | 'professional' | 'appointment' | null {
  // Baseado na URL
  if (url.includes('/auth/') || url.includes('/user')) return 'user';
  if (url.includes('/clients')) return 'client';
  if (url.includes('/professionals')) return 'professional';
  if (url.includes('/appointments')) return 'appointment';
  
  // Baseado na estrutura dos dados
  if (data && typeof data === 'object') {
    if (data.user || (data.email && data.role)) return 'user';
    if (data.clientId || data.serviceType) return 'client';
    if (data.specialtyId || data.professionalId) return 'professional';
    if (data.startTime && data.endTime) return 'appointment';
  }
  
  return null;
}

/**
 * Verifica se os dados contêm informações sensíveis
 */
function containsSensitiveData(data: any): boolean {
  if (!data || typeof data !== 'object') return false;
  
  const sensitiveFields = [
    'password', 'promptIa', 'whatsappInstanceUrl', 'assistantId',
    'phone', 'email', 'cpf', 'cnpj', 'token', 'secret', 'key'
  ];
  
  const checkObject = (obj: any): boolean => {
    if (Array.isArray(obj)) {
      return obj.some(item => checkObject(item));
    }
    
    if (obj && typeof obj === 'object') {
      return Object.keys(obj).some(key => {
        if (sensitiveFields.includes(key.toLowerCase())) {
          return true;
        }
        return checkObject(obj[key]);
      });
    }
    
    return false;
  };
  
  return checkObject(data);
}

/**
 * Middleware de sanitização global
 */
export function sanitizationMiddleware(options: Partial<SanitizationOptions> = {}) {
  const config = { ...defaultOptions, ...options };
  
  return (req: Request, res: Response, next: NextFunction) => {
    // Se sanitização está desabilitada, pular
    if (!config.enabled) {
      return next();
    }
    
    // Interceptar res.json()
    const originalJson = res.json;
    
    res.json = function(data: any) {
      try {
        // Verificar se contém dados sensíveis
        if (!containsSensitiveData(data)) {
          if (config.logSanitization) {
            console.log(`[SANITIZATION] No sensitive data detected for ${req.url}`);
          }
          return originalJson.call(this, data);
        }
        
        // Detectar tipo de dados
        const dataType = detectDataType(req.url, data);
        
        if (config.logSanitization) {
          console.log(`[SANITIZATION] Sanitizing ${dataType || 'unknown'} data for ${req.url}`);
        }
        
        // Aplicar sanitização
        let sanitizedData = data;
        
        if (dataType) {
          if (Array.isArray(data)) {
            sanitizedData = data.map(item => applySanitization(item, dataType));
          } else if (data.user) {
            // Resposta de login com campo user
            sanitizedData = {
              ...data,
              user: applySanitization(data.user, 'user')
            };
          } else {
            sanitizedData = applySanitization(data, dataType);
          }
        } else {
          // Sanitização genérica para dados não identificados
          sanitizedData = sanitizeGeneric(data);
        }
        
        if (config.logSanitization) {
          console.log(`[SANITIZATION] Data sanitized successfully for ${req.url}`);
        }
        
        return originalJson.call(this, sanitizedData);
        
      } catch (error) {
        console.error('[SANITIZATION] Error during sanitization:', error);
        
        if (config.strictMode) {
          // Em modo estrito, retornar erro se sanitização falhar
          return originalJson.call(this, { 
            message: 'Erro de segurança: dados não podem ser exibidos',
            error: 'SANITIZATION_FAILED'
          });
        } else {
          // Em modo permissivo, retornar dados originais com warning
          console.warn('[SANITIZATION] Falling back to original data due to sanitization error');
          return originalJson.call(this, data);
        }
      }
    };
    
    next();
  };
}

/**
 * Sanitização genérica para dados não identificados
 */
function sanitizeGeneric(data: any): any {
  if (!data || typeof data !== 'object') return data;
  
  const sensitiveFields = [
    'password', 'promptIa', 'whatsappInstanceUrl', 'assistantId',
    'token', 'secret', 'key', 'apiKey', 'privateKey'
  ];
  
  const sanitizeObject = (obj: any): any => {
    if (Array.isArray(obj)) {
      return obj.map(item => sanitizeObject(item));
    }
    
    if (obj && typeof obj === 'object') {
      const sanitized: any = {};
      
      for (const [key, value] of Object.entries(obj)) {
        if (sensitiveFields.includes(key.toLowerCase())) {
          // Remover campos completamente sensíveis
          continue;
        } else if (key.toLowerCase().includes('email') && typeof value === 'string') {
          // Mascarar emails
          sanitized[key] = maskEmail(value);
        } else if (key.toLowerCase().includes('phone') && typeof value === 'string') {
          // Mascarar telefones
          sanitized[key] = maskPhone(value);
        } else {
          // Recursivamente sanitizar objetos aninhados
          sanitized[key] = sanitizeObject(value);
        }
      }
      
      return sanitized;
    }
    
    return obj;
  };
  
  return sanitizeObject(data);
}

/**
 * Utilitários de mascaramento (duplicados para evitar dependência circular)
 */
function maskEmail(email: string): string {
  if (!email || !email.includes('@')) return '***';
  
  const [localPart, domain] = email.split('@');
  if (localPart.length <= 1) return `*@${domain}`;
  
  return `${localPart[0]}***@${domain}`;
}

function maskPhone(phone: string): string {
  if (!phone) return '';
  
  const cleanPhone = phone.replace(/\D/g, '');
  if (cleanPhone.length < 4) return '***';
  
  const countryCode = cleanPhone.substring(0, 2);
  const lastDigits = cleanPhone.substring(cleanPhone.length - 4);
  
  return `${countryCode}***${lastDigits}`;
}

/**
 * Middleware específico para rotas de autenticação
 */
export const authSanitizationMiddleware = sanitizationMiddleware({
  enabled: true,
  logSanitization: true,
  strictMode: true
});

/**
 * Middleware específico para APIs públicas
 */
export const publicApiSanitizationMiddleware = sanitizationMiddleware({
  enabled: true,
  logSanitization: false,
  strictMode: true
});

/**
 * Middleware para desenvolvimento (menos restritivo)
 */
export const devSanitizationMiddleware = sanitizationMiddleware({
  enabled: process.env.NODE_ENV !== 'test',
  logSanitization: true,
  strictMode: false
});
