/**
 * Utilitário para sanitizar dados sensíveis antes de enviar para o frontend
 * Protege contra exposição de informações confidenciais e garante conformidade LGPD
 */

interface UserData {
  id?: string;
  name?: string;
  email?: string;
  phone?: string;
  whatsappInstanceUrl?: string;
  promptIa?: string;
  assistantId?: string;
  settings?: any;
  [key: string]: any;
}

/**
 * Mascara email mantendo apenas primeiros caracteres e domínio
 * Exemplo: joao.silva@gmail.com -> j***@gmail.com
 */
function maskEmail(email: string): string {
  if (!email || !email.includes('@')) return '***';
  
  const [localPart, domain] = email.split('@');
  if (localPart.length <= 1) return `*@${domain}`;
  
  return `${localPart[0]}***@${domain}`;
}

/**
 * Mascara telefone mantendo apenas código do país e últimos dígitos
 * Exemplo: 5511999999999 -> 55***9999
 */
function maskPhone(phone: string): string {
  if (!phone) return '';
  
  // Remove caracteres não numéricos
  const cleanPhone = phone.replace(/\D/g, '');
  
  if (cleanPhone.length < 4) return '***';
  
  // Mantém código do país (2 dígitos) e últimos 4 dígitos
  const countryCode = cleanPhone.substring(0, 2);
  const lastDigits = cleanPhone.substring(cleanPhone.length - 4);
  
  return `${countryCode}***${lastDigits}`;
}

/**
 * Mascara URLs sensíveis mantendo apenas parte não confidencial
 */
function maskSensitiveUrl(url: string): string {
  if (!url) return '';
  
  // Para WhatsApp instances, manter apenas prefixo
  if (url.includes('megacode-')) {
    return 'megacode-***';
  }
  
  return '***';
}

/**
 * Remove ou mascara campos sensíveis do objeto de usuário
 */
export function sanitizeUserData(userData: UserData): UserData {
  if (!userData) return {};

  const sanitized: UserData = {
    // Dados essenciais para funcionamento (mantidos)
    id: userData.id, // Necessário para identificação de sessão
    name: userData.name, // Nome pode ser exibido
    role: userData.role || userData.userType,
    serviceType: userData.serviceType,
    userType: userData.userType,
    redirectPath: userData.redirectPath,
    isActive: userData.isActive,
    
    // Dados sensíveis mascarados
    email: userData.email ? maskEmail(userData.email) : '',
    phone: userData.phone ? maskPhone(userData.phone) : '',
    
    // Dados confidenciais removidos completamente
    // whatsappInstanceUrl: removido
    // promptIa: removido  
    // assistantId: removido
    // settings: removido se contiver dados sensíveis
    
    // Timestamps podem ser mantidos (não são sensíveis)
    createdAt: userData.createdAt,
    updatedAt: userData.updatedAt,
  };

  // Remove campos undefined/null para limpar response
  Object.keys(sanitized).forEach(key => {
    if (sanitized[key] === undefined || sanitized[key] === null) {
      delete sanitized[key];
    }
  });

  return sanitized;
}

/**
 * Sanitiza dados de cliente/empresa
 */
export function sanitizeClientData(clientData: any): any {
  if (!clientData) return {};

  return {
    id: clientData.id,
    name: clientData.name,
    serviceType: clientData.serviceType,
    isActive: clientData.isActive,
    createdAt: clientData.createdAt,
    
    // Dados sensíveis mascarados
    email: clientData.email ? maskEmail(clientData.email) : '',
    phone: clientData.phone ? maskPhone(clientData.phone) : '',
    
    // Remover dados confidenciais
    // password: removido
    // whatsappInstanceUrl: removido
    // promptIa: removido
  };
}

/**
 * Sanitiza arrays de dados
 */
export function sanitizeArray<T>(data: T[], sanitizeFunction: (item: T) => T): T[] {
  if (!Array.isArray(data)) return [];
  
  return data.map(item => sanitizeFunction(item));
}

/**
 * Sanitiza dados de profissionais
 */
export function sanitizeProfessionalData(professional: any): any {
  if (!professional) return {};

  return {
    id: professional.id,
    name: professional.name,
    specialtyId: professional.specialtyId,
    clientId: professional.clientId,
    isActive: professional.isActive,
    createdAt: professional.createdAt,
    
    // Dados sensíveis mascarados
    email: professional.email ? maskEmail(professional.email) : '',
    phone: professional.phone ? maskPhone(professional.phone) : '',
  };
}

/**
 * Sanitiza dados de agendamentos
 */
export function sanitizeAppointmentData(appointment: any): any {
  if (!appointment) return {};

  return {
    id: appointment.id,
    date: appointment.date,
    startTime: appointment.startTime,
    endTime: appointment.endTime,
    status: appointment.status,
    serviceId: appointment.serviceId,
    professionalId: appointment.professionalId,
    clientId: appointment.clientId,
    createdAt: appointment.createdAt,
    
    // Dados do cliente mascarados
    clientName: appointment.clientName,
    clientEmail: appointment.clientEmail ? maskEmail(appointment.clientEmail) : '',
    clientPhone: appointment.clientPhone ? maskPhone(appointment.clientPhone) : '',
  };
}

/**
 * Configuração de ambiente para controlar nível de sanitização
 */
export const SANITIZATION_CONFIG = {
  // Em produção, sanitização máxima
  PRODUCTION: {
    maskEmails: true,
    maskPhones: true,
    removeConfidentialData: true,
    removeSensitiveUrls: true,
  },
  
  // Em desenvolvimento, sanitização moderada
  DEVELOPMENT: {
    maskEmails: false, // Para facilitar debug
    maskPhones: true,
    removeConfidentialData: true,
    removeSensitiveUrls: true,
  },
  
  // Para testes, sem sanitização
  TEST: {
    maskEmails: false,
    maskPhones: false,
    removeConfidentialData: false,
    removeSensitiveUrls: false,
  }
};

/**
 * Aplica sanitização baseada no ambiente
 */
export function applySanitization(data: any, type: 'user' | 'client' | 'professional' | 'appointment' = 'user'): any {
  const env = process.env.NODE_ENV || 'development';
  const config = SANITIZATION_CONFIG[env.toUpperCase() as keyof typeof SANITIZATION_CONFIG] || SANITIZATION_CONFIG.DEVELOPMENT;
  
  // Se sanitização está desabilitada (apenas em teste), retorna dados originais
  if (!config.removeConfidentialData) {
    return data;
  }
  
  // Aplica sanitização apropriada baseada no tipo
  switch (type) {
    case 'user':
      return sanitizeUserData(data);
    case 'client':
      return sanitizeClientData(data);
    case 'professional':
      return sanitizeProfessionalData(data);
    case 'appointment':
      return sanitizeAppointmentData(data);
    default:
      return sanitizeUserData(data);
  }
}
