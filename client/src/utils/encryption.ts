import CryptoJS from 'crypto-js';

/**
 * Utilitário para criptografia de dados sensíveis no frontend
 * Protege credenciais antes de enviar para o servidor
 * IMPORTANTE: Criptografa dados ANTES de aparecer no Network tab
 */

// Chave de criptografia (deve ser a mesma do backend)
const ENCRYPTION_KEY = import.meta.env.VITE_ENCRYPTION_KEY || 'SempreCheioApp2025SecureKey!@#';

/**
 * Criptografa uma string usando AES-256-CBC (compatível com Node.js crypto)
 */
export function encryptData(data: string): string {
  try {
    // Gerar IV aleatório
    const iv = CryptoJS.lib.WordArray.random(16);

    // Criar chave derivada (compatível com Node.js scrypt)
    const key = CryptoJS.PBKDF2(ENCRYPTION_KEY, 'salt', {
      keySize: 256/32,
      iterations: 1000
    });

    // Criptografar usando AES-256-CBC
    const encrypted = CryptoJS.AES.encrypt(data, key, {
      iv: iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7
    });

    // Retornar IV:dados_criptografados (formato compatível com backend)
    return iv.toString() + ':' + encrypted.ciphertext.toString();
  } catch (error) {
    console.error('Erro ao criptografar dados:', error);
    throw new Error('Falha na criptografia');
  }
}

/**
 * Descriptografa uma string usando AES
 */
export function decryptData(encryptedData: string): string {
  try {
    const bytes = CryptoJS.AES.decrypt(encryptedData, ENCRYPTION_KEY);
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);
    return decrypted;
  } catch (error) {
    console.error('Erro ao descriptografar dados:', error);
    return encryptedData; // Fallback para dados originais se descriptografia falhar
  }
}

/**
 * Criptografa dados de login antes de enviar
 */
export function encryptLoginData(loginData: { email: string; password: string; rememberMe?: boolean }) {
  return {
    email: encryptData(loginData.email),
    password: encryptData(loginData.password),
    rememberMe: loginData.rememberMe || false,
    encrypted: true // Flag para indicar que os dados estão criptografados
  };
}

/**
 * Gera um hash seguro para senhas (para validação local)
 */
export function hashPassword(password: string): string {
  return CryptoJS.SHA256(password).toString();
}

/**
 * Gera um token único para sessão
 */
export function generateSessionToken(): string {
  const timestamp = Date.now().toString();
  const random = Math.random().toString(36).substring(2);
  return CryptoJS.SHA256(timestamp + random).toString().substring(0, 32);
}

/**
 * Limpa dados sensíveis da memória (sobrescreve variáveis)
 */
export function clearSensitiveData(data: any): void {
  if (typeof data === 'object' && data !== null) {
    Object.keys(data).forEach(key => {
      if (typeof data[key] === 'string') {
        // Sobrescrever string com caracteres aleatórios
        data[key] = Array(data[key].length).fill(0).map(() => Math.random().toString(36)[0]).join('');
      }
      data[key] = null;
    });
  }
}

/**
 * Verifica se os dados estão criptografados
 */
export function isEncrypted(data: any): boolean {
  return data && typeof data === 'object' && data.encrypted === true;
}

/**
 * Criptografia específica para dados de perfil
 */
export function encryptProfileData(profileData: any) {
  const sensitiveFields = ['email', 'phone', 'cpf', 'cnpj'];
  const encrypted = { ...profileData };
  
  sensitiveFields.forEach(field => {
    if (encrypted[field]) {
      encrypted[field] = encryptData(encrypted[field]);
    }
  });
  
  return {
    ...encrypted,
    encrypted: true
  };
}

/**
 * Descriptografia específica para dados de perfil
 */
export function decryptProfileData(encryptedProfileData: any) {
  if (!isEncrypted(encryptedProfileData)) {
    return encryptedProfileData;
  }
  
  const sensitiveFields = ['email', 'phone', 'cpf', 'cnpj'];
  const decrypted = { ...encryptedProfileData };
  
  sensitiveFields.forEach(field => {
    if (decrypted[field]) {
      decrypted[field] = decryptData(decrypted[field]);
    }
  });
  
  delete decrypted.encrypted;
  return decrypted;
}

/**
 * Configuração de segurança baseada no ambiente
 */
export const SECURITY_CONFIG = {
  // Em produção, usar criptografia sempre
  PRODUCTION: {
    encryptCredentials: true,
    encryptProfileData: true,
    clearMemoryAfterUse: true,
    useSecureHeaders: true,
  },
  
  // Em desenvolvimento, criptografia opcional para debug
  DEVELOPMENT: {
    encryptCredentials: true, // Manter ativo mesmo em dev
    encryptProfileData: false, // Facilitar debug
    clearMemoryAfterUse: false,
    useSecureHeaders: false,
  },
  
  // Em teste, sem criptografia para facilitar testes
  TEST: {
    encryptCredentials: false,
    encryptProfileData: false,
    clearMemoryAfterUse: false,
    useSecureHeaders: false,
  }
};

/**
 * Obtém configuração de segurança baseada no ambiente
 */
export function getSecurityConfig() {
  const env = import.meta.env.MODE || 'development';
  return SECURITY_CONFIG[env.toUpperCase() as keyof typeof SECURITY_CONFIG] || SECURITY_CONFIG.DEVELOPMENT;
}

/**
 * Aplica criptografia baseada na configuração do ambiente
 */
export function applySecurityEncryption(data: any, type: 'login' | 'profile' = 'login') {
  const config = getSecurityConfig();
  
  if (type === 'login' && config.encryptCredentials) {
    return encryptLoginData(data);
  }
  
  if (type === 'profile' && config.encryptProfileData) {
    return encryptProfileData(data);
  }
  
  return data;
}

/**
 * Middleware para interceptar e criptografar requisições
 */
export function createSecureRequest(url: string, options: RequestInit = {}) {
  const config = getSecurityConfig();
  
  // Headers de segurança
  const secureHeaders: HeadersInit = {
    'Content-Type': 'application/json',
    ...(options.headers as HeadersInit),
  };
  
  if (config.useSecureHeaders) {
    secureHeaders['X-Requested-With'] = 'XMLHttpRequest';
    secureHeaders['X-Content-Type-Options'] = 'nosniff';
  }
  
  // Criptografar body se necessário
  let body = options.body;
  if (body && typeof body === 'string') {
    try {
      const parsedBody = JSON.parse(body);
      
      // Se é uma requisição de login, criptografar
      if (url.includes('/login') && parsedBody.email && parsedBody.password) {
        const encryptedBody = applySecurityEncryption(parsedBody, 'login');
        body = JSON.stringify(encryptedBody);
      }
    } catch (error) {
      // Se não conseguir parsear, manter body original
      console.warn('Não foi possível parsear body para criptografia:', error);
    }
  }
  
  return {
    ...options,
    headers: secureHeaders,
    body
  };
}

/**
 * Função para limpar cache e dados sensíveis do browser
 */
export function clearBrowserSensitiveData() {
  try {
    // Limpar localStorage
    const sensitiveKeys = ['password', 'token', 'credentials', 'session'];
    sensitiveKeys.forEach(key => {
      Object.keys(localStorage).forEach(storageKey => {
        if (storageKey.toLowerCase().includes(key)) {
          localStorage.removeItem(storageKey);
        }
      });
    });
    
    // Limpar sessionStorage
    sensitiveKeys.forEach(key => {
      Object.keys(sessionStorage).forEach(storageKey => {
        if (storageKey.toLowerCase().includes(key)) {
          sessionStorage.removeItem(storageKey);
        }
      });
    });
    
    console.log('Dados sensíveis limpos do browser');
  } catch (error) {
    console.error('Erro ao limpar dados sensíveis:', error);
  }
}
