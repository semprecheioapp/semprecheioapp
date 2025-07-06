/**
 * Utilitários para tratamento de mensagens de erro de forma amigável
 */

export interface ErrorDisplayOptions {
  showIcon?: boolean;
  maxLength?: number;
  fallbackMessage?: string;
}

/**
 * Converte erros técnicos em mensagens amigáveis para o usuário
 */
export function getErrorMessage(error: any, options: ErrorDisplayOptions = {}): string {
  const {
    fallbackMessage = "Erro inesperado. Tente novamente.",
    maxLength = 200
  } = options;

  if (!error) return fallbackMessage;
  
  // Se é uma string simples, usar diretamente
  if (typeof error === 'string') {
    return truncateMessage(error, maxLength);
  }
  
  // Se tem message, extrair apenas o texto limpo
  if (error.message) {
    let message = error.message;
    
    // Remover códigos de status HTTP (ex: "401: ", "500: ")
    message = message.replace(/^\d{3}:\s*/, '');
    
    // Se contém JSON, extrair apenas a mensagem
    if (message.includes('{"message"')) {
      try {
        const jsonMatch = message.match(/\{"message":"([^"]+)"\}/);
        if (jsonMatch) {
          return truncateMessage(jsonMatch[1], maxLength);
        }
      } catch (e) {
        // Se falhar ao extrair JSON, continuar com limpeza manual
      }
    }
    
    // Mensagens específicas mais amigáveis
    const cleanMessage = getCleanErrorMessage(message);
    return truncateMessage(cleanMessage, maxLength);
  }
  
  return fallbackMessage;
}

/**
 * Converte mensagens técnicas em mensagens amigáveis
 */
function getCleanErrorMessage(message: string): string {
  const lowerMessage = message.toLowerCase();
  
  // Erros de autenticação
  if (lowerMessage.includes('credenciais inválidas') || 
      lowerMessage.includes('invalid credentials') ||
      lowerMessage.includes('unauthorized') ||
      lowerMessage.includes('401')) {
    return "E-mail ou senha inválidos. Verifique suas credenciais e tente novamente.";
  }
  
  // Erros de usuário já existente
  if (lowerMessage.includes('email already exists') || 
      lowerMessage.includes('já existe') ||
      lowerMessage.includes('already registered')) {
    return "Este e-mail já está cadastrado. Tente fazer login ou use outro e-mail.";
  }
  
  // Erros de rede
  if (lowerMessage.includes('network') || 
      lowerMessage.includes('fetch') ||
      lowerMessage.includes('connection') ||
      lowerMessage.includes('timeout')) {
    return "Erro de conexão. Verifique sua internet e tente novamente.";
  }
  
  // Erros de servidor
  if (lowerMessage.includes('internal server error') ||
      lowerMessage.includes('500') ||
      lowerMessage.includes('server error')) {
    return "Erro interno do servidor. Tente novamente em alguns instantes.";
  }
  
  // Erros de permissão
  if (lowerMessage.includes('forbidden') ||
      lowerMessage.includes('403') ||
      lowerMessage.includes('access denied')) {
    return "Você não tem permissão para realizar esta ação.";
  }
  
  // Erros de não encontrado
  if (lowerMessage.includes('not found') ||
      lowerMessage.includes('404')) {
    return "Recurso não encontrado. Verifique se a informação está correta.";
  }
  
  // Erros de validação
  if (lowerMessage.includes('validation') ||
      lowerMessage.includes('invalid') ||
      lowerMessage.includes('required')) {
    return "Dados inválidos. Verifique as informações e tente novamente.";
  }
  
  // Se não conseguiu identificar, retornar a mensagem original limpa
  return message;
}

/**
 * Trunca mensagem se for muito longa
 */
function truncateMessage(message: string, maxLength: number): string {
  if (message.length <= maxLength) return message;
  return message.substring(0, maxLength - 3) + '...';
}

/**
 * Formata erro para exibição com ícone opcional
 */
export function formatErrorForDisplay(error: any, options: ErrorDisplayOptions = {}): {
  message: string;
  icon?: string;
} {
  const message = getErrorMessage(error, options);
  
  if (!options.showIcon) {
    return { message };
  }
  
  // Determinar ícone baseado no tipo de erro
  const lowerMessage = message.toLowerCase();
  
  if (lowerMessage.includes('conexão') || lowerMessage.includes('rede')) {
    return { message, icon: '🌐' };
  }
  
  if (lowerMessage.includes('permissão') || lowerMessage.includes('acesso')) {
    return { message, icon: '🔒' };
  }
  
  if (lowerMessage.includes('não encontrado')) {
    return { message, icon: '🔍' };
  }
  
  if (lowerMessage.includes('servidor')) {
    return { message, icon: '⚠️' };
  }
  
  // Ícone padrão para erros
  return { message, icon: '❌' };
}

/**
 * Hook personalizado para toast com tratamento de erro amigável
 */
export function createErrorToast(error: any, title: string = "Erro", options: ErrorDisplayOptions = {}) {
  const { message, icon } = formatErrorForDisplay(error, { ...options, showIcon: true });
  
  return {
    title: icon ? `${icon} ${title}` : title,
    description: message,
    variant: "destructive" as const,
  };
}
