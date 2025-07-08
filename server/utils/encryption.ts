import crypto from 'crypto';

/**
 * Utilitário de criptografia para o backend
 * Descriptografa dados enviados pelo frontend
 */

// Chave de criptografia (deve ser a mesma do frontend)
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'SempreCheioApp2025SecureKey!@#';

// Algoritmo de criptografia
const ALGORITHM = 'aes-256-cbc';

/**
 * Descriptografa dados usando AES-256-CBC
 */
export function decryptData(encryptedData: string): string {
  try {
    // Separar IV e dados criptografados
    const parts = encryptedData.split(':');
    if (parts.length !== 2) {
      throw new Error('Formato de dados criptografados inválido');
    }
    
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = Buffer.from(parts[1], 'hex');
    
    // Criar chave derivada compatível com frontend (PBKDF2)
    const key = crypto.pbkdf2Sync(ENCRYPTION_KEY, 'salt', 1000, 32, 'sha256');
    
    // Descriptografar
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    let decrypted = decipher.update(encrypted, undefined, 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('Erro ao descriptografar dados:', error);
    throw new Error('Falha na descriptografia');
  }
}

/**
 * Criptografa dados usando AES-256-CBC (para testes)
 */
export function encryptData(data: string): string {
  try {
    // Gerar IV aleatório
    const iv = crypto.randomBytes(16);
    
    // Criar chave derivada compatível com frontend (PBKDF2)
    const key = crypto.pbkdf2Sync(ENCRYPTION_KEY, 'salt', 1000, 32, 'sha256');
    
    // Criptografar
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    // Retornar IV:dados_criptografados
    return iv.toString('hex') + ':' + encrypted;
  } catch (error) {
    console.error('Erro ao criptografar dados:', error);
    throw new Error('Falha na criptografia');
  }
}

/**
 * Descriptografa dados de login
 */
export function decryptLoginData(encryptedLoginData: any) {
  try {
    // Verificar se os dados estão marcados como criptografados
    if (!encryptedLoginData.encrypted) {
      // Dados não criptografados, retornar como estão (fallback)
      return encryptedLoginData;
    }
    
    return {
      email: decryptData(encryptedLoginData.email),
      password: decryptData(encryptedLoginData.password),
      rememberMe: encryptedLoginData.rememberMe || false
    };
  } catch (error) {
    console.error('Erro ao descriptografar dados de login:', error);
    throw new Error('Dados de login inválidos');
  }
}

/**
 * Verifica se os dados estão criptografados
 */
export function isEncrypted(data: any): boolean {
  return data && typeof data === 'object' && data.encrypted === true;
}

/**
 * Middleware para descriptografar automaticamente dados de login
 */
export function decryptLoginMiddleware(req: any, res: any, next: any) {
  try {
    // Aplicar apenas em rotas de login
    if (!req.path.includes('/auth/login')) {
      return next();
    }
    
    // Verificar se os dados estão criptografados
    if (req.body && isEncrypted(req.body)) {
      console.log('🔓 Descriptografando dados de login...');
      req.body = decryptLoginData(req.body);
      console.log('✅ Dados descriptografados com sucesso');
    }
    
    next();
  } catch (error) {
    console.error('❌ Erro na descriptografia:', error);
    res.status(400).json({
      error: 'Dados de login inválidos',
      message: 'Falha na descriptografia dos dados',
      code: 'DECRYPTION_FAILED'
    });
  }
}

/**
 * Sanitiza logs removendo dados sensíveis mesmo descriptografados
 */
export function sanitizeLoginLogs(req: any, res: any, next: any) {
  if (req.path.includes('/auth/login')) {
    // Interceptar console.log temporariamente
    const originalLog = console.log;
    const originalError = console.error;
    
    console.log = (...args) => {
      const sanitizedArgs = args.map(arg => {
        if (typeof arg === 'string') {
          return arg.replace(/password["\s]*[:=]["\s]*[^,}\s]+/gi, 'password: "***"')
                    .replace(/email["\s]*[:=]["\s]*[^,}\s]+/gi, 'email: "***"');
        }
        if (typeof arg === 'object' && arg !== null) {
          const sanitized = { ...arg };
          if (sanitized.password) sanitized.password = '***';
          if (sanitized.email) sanitized.email = '***';
          return sanitized;
        }
        return arg;
      });
      originalLog(...sanitizedArgs);
    };
    
    console.error = (...args) => {
      const sanitizedArgs = args.map(arg => {
        if (typeof arg === 'string') {
          return arg.replace(/password["\s]*[:=]["\s]*[^,}\s]+/gi, 'password: "***"');
        }
        return arg;
      });
      originalError(...sanitizedArgs);
    };
    
    // Restaurar após a requisição
    res.on('finish', () => {
      console.log = originalLog;
      console.error = originalError;
    });
  }
  
  next();
}

/**
 * Gera chave de criptografia segura
 */
export function generateEncryptionKey(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Valida se a chave de criptografia é segura
 */
export function validateEncryptionKey(key: string): boolean {
  return key && key.length >= 32;
}

/**
 * Configuração de criptografia por ambiente
 */
export const ENCRYPTION_CONFIG = {
  production: {
    enabled: true,
    keyLength: 32,
    algorithm: 'aes-256-cbc',
    requireEncryption: true
  },
  development: {
    enabled: true, // Manter ativo mesmo em dev para testar
    keyLength: 32,
    algorithm: 'aes-256-cbc',
    requireEncryption: false // Permitir dados não criptografados para debug
  },
  test: {
    enabled: false,
    keyLength: 16,
    algorithm: 'aes-128-cbc',
    requireEncryption: false
  }
};

/**
 * Obtém configuração baseada no ambiente
 */
export function getEncryptionConfig() {
  const env = process.env.NODE_ENV || 'development';
  return ENCRYPTION_CONFIG[env as keyof typeof ENCRYPTION_CONFIG] || ENCRYPTION_CONFIG.development;
}
