import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';

/**
 * Middleware de segurança completo para produção
 * Implementa todas as práticas de segurança necessárias
 */

/**
 * Rate limiting para login - Proteção contra brute force
 */
export const loginRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // Máximo 5 tentativas por IP
  message: {
    error: 'Muitas tentativas de login',
    message: 'Tente novamente em 15 minutos',
    code: 'RATE_LIMIT_EXCEEDED',
    retryAfter: 15 * 60 // segundos
  },
  standardHeaders: true, // Retorna rate limit info nos headers
  legacyHeaders: false, // Desabilita headers X-RateLimit-*
  // Aplicar apenas em rotas de login
  skip: (req) => !req.path.includes('/auth/login'),
  // Headers customizados
  keyGenerator: (req) => {
    // Usar IP real considerando proxies
    return req.ip || req.connection.remoteAddress || 'unknown';
  }
});

/**
 * Rate limiting geral para APIs
 */
export const apiRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // 100 requests por IP
  message: {
    error: 'Muitas requisições',
    message: 'Limite de requisições excedido',
    code: 'API_RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false
});

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
