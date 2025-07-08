import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';

/**
 * Store para rastrear tentativas de login por IP
 */
const loginAttempts = new Map<string, { count: number; firstAttempt: number; blocked: boolean }>();

/**
 * Middleware de segurança completo para produção
 * Implementa todas as práticas de segurança necessárias
 */

/**
 * Rate limiting para login - Proteção contra brute force
 */
export const loginRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 10, // Máximo 10 tentativas por IP (mais realista)
  message: {
    error: 'Muitas tentativas de login',
    message: 'Você excedeu o limite de tentativas de login. Tente novamente em 15 minutos.',
    code: 'LOGIN_RATE_LIMIT_EXCEEDED',
    retryAfter: 15 * 60, // segundos
    maxAttempts: 10,
    windowMinutes: 15
  },
  standardHeaders: true, // Retorna rate limit info nos headers
  legacyHeaders: false, // Desabilita headers X-RateLimit-*
  // Aplicar apenas em rotas de login
  skip: (req) => !req.path.includes('/auth/login'),
  // Headers customizados
  keyGenerator: (req) => {
    // Usar IP real considerando proxies
    return req.ip || req.connection.remoteAddress || 'unknown';
  },
  // Handler customizado para resposta mais amigável
  handler: (req, res) => {
    res.status(429).json({
      error: 'Limite de tentativas de login excedido',
      message: 'Por segurança, você deve aguardar 15 minutos antes de tentar fazer login novamente.',
      code: 'LOGIN_RATE_LIMIT_EXCEEDED',
      retryAfter: 15 * 60,
      maxAttempts: 10,
      windowMinutes: 15,
      tip: 'Verifique se você está digitando a senha corretamente.'
    });
  }
});

/**
 * Rate limiting geral para APIs
 */
export const apiRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 500, // 500 requests por IP (mais generoso para uso normal)
  message: {
    error: 'Muitas requisições',
    message: 'Você excedeu o limite de requisições. Tente novamente em alguns minutos.',
    code: 'API_RATE_LIMIT_EXCEEDED',
    retryAfter: 15 * 60,
    maxRequests: 500,
    windowMinutes: 15
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Handler customizado
  handler: (req, res) => {
    res.status(429).json({
      error: 'Limite de requisições excedido',
      message: 'Você fez muitas requisições em pouco tempo. Aguarde 15 minutos e tente novamente.',
      code: 'API_RATE_LIMIT_EXCEEDED',
      retryAfter: 15 * 60,
      maxRequests: 500,
      windowMinutes: 15,
      tip: 'Este limite protege o sistema contra uso excessivo.'
    });
  }
});

/**
 * Rate limiting inteligente para login com escalação
 * 1-3 tentativas: Sem delay
 * 4-6 tentativas: 1 minuto de delay
 * 7-10 tentativas: 5 minutos de delay
 * 11+ tentativas: 15 minutos de delay
 */
export function intelligentLoginRateLimit(req: Request, res: Response, next: NextFunction) {
  const ip = req.ip || req.connection.remoteAddress || 'unknown';
  const now = Date.now();
  const windowMs = 15 * 60 * 1000; // 15 minutos

  // Limpar tentativas antigas
  for (const [key, data] of loginAttempts.entries()) {
    if (now - data.firstAttempt > windowMs) {
      loginAttempts.delete(key);
    }
  }

  let attempts = loginAttempts.get(ip);

  if (!attempts) {
    attempts = { count: 0, firstAttempt: now, blocked: false };
    loginAttempts.set(ip, attempts);
  }

  // Verificar se está bloqueado
  if (attempts.blocked) {
    const timeLeft = Math.ceil((attempts.firstAttempt + windowMs - now) / 1000 / 60);
    return res.status(429).json({
      error: 'IP temporariamente bloqueado',
      message: `Muitas tentativas de login falharam. Tente novamente em ${timeLeft} minutos.`,
      code: 'IP_BLOCKED',
      retryAfter: Math.ceil((attempts.firstAttempt + windowMs - now) / 1000),
      timeLeftMinutes: timeLeft
    });
  }

  // Verificar limites escalonados
  if (attempts.count >= 10) {
    attempts.blocked = true;
    return res.status(429).json({
      error: 'Limite máximo de tentativas excedido',
      message: 'Você excedeu o limite máximo de tentativas de login. Aguarde 15 minutos.',
      code: 'MAX_ATTEMPTS_EXCEEDED',
      retryAfter: 15 * 60,
      maxAttempts: 10
    });
  }

  // Delays escalonados
  let delayMs = 0;
  if (attempts.count >= 7) {
    delayMs = 5 * 60 * 1000; // 5 minutos
  } else if (attempts.count >= 4) {
    delayMs = 1 * 60 * 1000; // 1 minuto
  }

  if (delayMs > 0) {
    const lastAttempt = attempts.firstAttempt + (attempts.count * 30000); // Estimar último attempt
    const timeLeft = Math.ceil((lastAttempt + delayMs - now) / 1000);

    if (timeLeft > 0) {
      return res.status(429).json({
        error: 'Aguarde antes de tentar novamente',
        message: `Aguarde ${Math.ceil(timeLeft / 60)} minutos antes da próxima tentativa.`,
        code: 'TEMPORARY_DELAY',
        retryAfter: timeLeft,
        attempt: attempts.count + 1,
        maxAttempts: 10
      });
    }
  }

  next();
}

/**
 * Middleware para registrar tentativa de login (sucesso ou falha)
 */
export function recordLoginAttempt(success: boolean) {
  return (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip || req.connection.remoteAddress || 'unknown';

    if (success) {
      // Login bem-sucedido, limpar tentativas
      loginAttempts.delete(ip);
    } else {
      // Login falhado, incrementar contador
      const attempts = loginAttempts.get(ip);
      if (attempts) {
        attempts.count++;
      }
    }

    next();
  };
}

/**
 * Configuração do Helmet para headers de segurança
 */
export const securityHeaders = helmet({
  // Content Security Policy
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'", "https://api.semprecheioapp.com.br"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null
    }
  },
  
  // Strict Transport Security (HTTPS)
  hsts: {
    maxAge: 63072000, // 2 anos
    includeSubDomains: true,
    preload: true
  },
  
  // Outras configurações de segurança
  noSniff: true, // X-Content-Type-Options: nosniff
  frameguard: { action: 'deny' }, // X-Frame-Options: DENY
  xssFilter: true, // X-XSS-Protection: 1; mode=block
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  
  // Remover headers que revelam tecnologia
  hidePoweredBy: true,
  
  // DNS Prefetch Control
  dnsPrefetchControl: { allow: false },
  
  // Expect-CT
  expectCt: {
    maxAge: 86400,
    enforce: true
  }
});

/**
 * Middleware para forçar HTTPS em produção
 */
export function forceHTTPS(req: Request, res: Response, next: NextFunction) {
  if (process.env.NODE_ENV === 'production') {
    // Verificar se a requisição não é HTTPS
    if (!req.secure && req.get('X-Forwarded-Proto') !== 'https') {
      // Redirecionamento permanente para HTTPS
      return res.redirect(301, `https://${req.get('Host')}${req.url}`);
    }
  }
  next();
}

/**
 * Middleware para sanitizar logs - Remove dados sensíveis
 */
export function sanitizeLogging(req: Request, res: Response, next: NextFunction) {
  // Lista de campos sensíveis que não devem aparecer em logs
  const sensitiveFields = ['password', 'token', 'secret', 'key', 'authorization'];
  
  // Interceptar console.log para filtrar dados sensíveis
  const originalLog = console.log;
  const originalError = console.error;
  const originalWarn = console.warn;
  
  const sanitizeLogData = (data: any): any => {
    if (typeof data === 'string') {
      // Mascarar possíveis tokens/senhas em strings
      return data.replace(/password["\s]*[:=]["\s]*[^,}\s]+/gi, 'password: "***"')
                 .replace(/token["\s]*[:=]["\s]*[^,}\s]+/gi, 'token: "***"');
    }
    
    if (typeof data === 'object' && data !== null) {
      const sanitized = { ...data };
      sensitiveFields.forEach(field => {
        if (sanitized[field]) {
          sanitized[field] = '***';
        }
      });
      return sanitized;
    }
    
    return data;
  };
  
  // Sobrescrever métodos de log temporariamente
  console.log = (...args) => originalLog(...args.map(sanitizeLogData));
  console.error = (...args) => originalError(...args.map(sanitizeLogData));
  console.warn = (...args) => originalWarn(...args.map(sanitizeLogData));
  
  // Restaurar logs originais após a requisição
  res.on('finish', () => {
    console.log = originalLog;
    console.error = originalError;
    console.warn = originalWarn;
  });
  
  next();
}

/**
 * Middleware para validar origem das requisições (CSRF básico)
 */
export function validateOrigin(req: Request, res: Response, next: NextFunction) {
  const allowedOrigins = [
    'https://semprecheioapp.com.br',
    'https://www.semprecheioapp.com.br',
    'http://localhost:5173', // Para desenvolvimento
    'http://localhost:3000'  // Para desenvolvimento
  ];
  
  const origin = req.get('Origin') || req.get('Referer');
  
  // Em produção, validar origem
  if (process.env.NODE_ENV === 'production') {
    if (origin && !allowedOrigins.some(allowed => origin.startsWith(allowed))) {
      return res.status(403).json({
        error: 'Origem não autorizada',
        code: 'INVALID_ORIGIN'
      });
    }
  }
  
  next();
}

/**
 * Middleware para adicionar headers de segurança customizados
 */
export function customSecurityHeaders(req: Request, res: Response, next: NextFunction) {
  // Headers adicionais de segurança
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  
  // Em produção, adicionar headers mais restritivos
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
    res.setHeader('Expect-CT', 'max-age=86400, enforce');
  }
  
  // Remover headers que revelam informações do servidor
  res.removeHeader('X-Powered-By');
  res.removeHeader('Server');
  
  next();
}

/**
 * Middleware para detectar e bloquear ataques comuns
 */
export function detectAttacks(req: Request, res: Response, next: NextFunction) {
  const userAgent = req.get('User-Agent') || '';
  const url = req.url.toLowerCase();
  const body = JSON.stringify(req.body || {}).toLowerCase();
  
  // Padrões suspeitos
  const suspiciousPatterns = [
    /script[^>]*>.*<\/script>/i, // XSS
    /union.*select/i, // SQL Injection
    /drop.*table/i, // SQL Injection
    /\.\.\/.*\.\.\//, // Path Traversal
    /<iframe/i, // Iframe injection
    /javascript:/i, // JavaScript injection
    /vbscript:/i, // VBScript injection
    /onload=/i, // Event handler injection
    /onerror=/i // Event handler injection
  ];
  
  // User agents suspeitos
  const suspiciousUserAgents = [
    /sqlmap/i,
    /nikto/i,
    /nessus/i,
    /burp/i,
    /nmap/i
  ];
  
  // Verificar padrões suspeitos na URL e body
  const isSuspiciousContent = suspiciousPatterns.some(pattern => 
    pattern.test(url) || pattern.test(body)
  );
  
  // Verificar user agent suspeito
  const isSuspiciousUserAgent = suspiciousUserAgents.some(pattern => 
    pattern.test(userAgent)
  );
  
  if (isSuspiciousContent || isSuspiciousUserAgent) {
    console.warn(`Possível ataque detectado: ${req.ip} - ${req.method} ${req.url}`);
    return res.status(403).json({
      error: 'Requisição bloqueada por segurança',
      code: 'SECURITY_VIOLATION'
    });
  }
  
  next();
}

/**
 * Middleware combinado de segurança para aplicar em todas as rotas
 */
export function applySecurity() {
  return [
    forceHTTPS,
    securityHeaders,
    customSecurityHeaders,
    sanitizeLogging,
    detectAttacks,
    validateOrigin
  ];
}

/**
 * Middleware específico para rotas de autenticação
 */
export function applyAuthSecurity() {
  return [
    ...applySecurity(),
    loginRateLimit
  ];
}

/**
 * Configuração de CORS seguro
 */
export const secureCORS = {
  origin: function (origin: string | undefined, callback: Function) {
    const allowedOrigins = [
      'https://semprecheioapp.com.br',
      'https://www.semprecheioapp.com.br'
    ];
    
    // Permitir requisições sem origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    // Em desenvolvimento, permitir localhost
    if (process.env.NODE_ENV === 'development') {
      allowedOrigins.push('http://localhost:5173', 'http://localhost:3000');
    }
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Não permitido pelo CORS'));
    }
  },
  credentials: true, // Permitir cookies
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Set-Cookie']
};
