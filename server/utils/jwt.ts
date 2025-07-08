import jwt from 'jsonwebtoken';
import { Request, Response } from 'express';

// Configurações de segurança JWT
const JWT_SECRET = process.env.JWT_SECRET || 'SempreCheioApp2025SecureJWTKey!@#$%';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '12h';
const REFRESH_TOKEN_EXPIRES_IN = process.env.REFRESH_TOKEN_EXPIRES_IN || '7d';

export interface JWTPayload {
  sub: string; // User ID
  email: string;
  role: string;
  userType: string;
  iat?: number;
  exp?: number;
}

/**
 * Gera token JWT para autenticação
 */
export function generateAccessToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
    issuer: 'semprecheioapp',
    audience: 'semprecheioapp-users'
  });
}

/**
 * Gera refresh token para renovação
 */
export function generateRefreshToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: REFRESH_TOKEN_EXPIRES_IN,
    issuer: 'semprecheioapp',
    audience: 'semprecheioapp-refresh'
  });
}

/**
 * Verifica e decodifica token JWT
 */
export function verifyToken(token: string): JWTPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      issuer: 'semprecheioapp',
      audience: ['semprecheioapp-users', 'semprecheioapp-refresh']
    }) as JWTPayload;
    
    return decoded;
  } catch (error) {
    console.error('JWT verification failed:', error);
    return null;
  }
}

/**
 * Define cookie seguro com token JWT
 */
export function setSecureCookie(res: Response, name: string, token: string, maxAge?: number) {
  const isProduction = process.env.NODE_ENV === 'production';
  
  res.cookie(name, token, {
    httpOnly: true, // Não acessível via JavaScript
    secure: isProduction, // HTTPS apenas em produção
    sameSite: 'strict', // Proteção CSRF
    maxAge: maxAge || 12 * 60 * 60 * 1000, // 12 horas em ms
    path: '/', // Disponível em todo o site
    domain: isProduction ? '.semprecheioapp.com.br' : undefined // Domínio em produção
  });
}

/**
 * Remove cookies de autenticação
 */
export function clearAuthCookies(res: Response) {
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict' as const,
    path: '/',
    domain: process.env.NODE_ENV === 'production' ? '.semprecheioapp.com.br' : undefined
  };
  
  res.clearCookie('access_token', cookieOptions);
  res.clearCookie('refresh_token', cookieOptions);
}

/**
 * Extrai token do cookie da requisição
 */
export function extractTokenFromCookie(req: Request): string | null {
  return req.cookies?.access_token || null;
}

/**
 * Middleware de autenticação JWT
 */
export function authenticateJWT(req: any, res: Response, next: any) {
  const token = extractTokenFromCookie(req);
  
  if (!token) {
    return res.status(401).json({ 
      message: 'Token de acesso não encontrado',
      code: 'NO_TOKEN'
    });
  }
  
  const payload = verifyToken(token);
  
  if (!payload) {
    // Token inválido, limpar cookies
    clearAuthCookies(res);
    return res.status(401).json({ 
      message: 'Token inválido ou expirado',
      code: 'INVALID_TOKEN'
    });
  }
  
  // Anexar dados do usuário à requisição
  req.user = {
    id: payload.sub,
    email: payload.email,
    role: payload.role,
    userType: payload.userType
  };
  
  next();
}

/**
 * Middleware para verificar roles específicos
 */
export function requireRole(allowedRoles: string[]) {
  return (req: any, res: Response, next: any) => {
    if (!req.user) {
      return res.status(401).json({ 
        message: 'Usuário não autenticado',
        code: 'NOT_AUTHENTICATED'
      });
    }
    
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        message: 'Acesso negado para este recurso',
        code: 'INSUFFICIENT_PERMISSIONS'
      });
    }
    
    next();
  };
}

/**
 * Middleware para super admin apenas
 */
export const requireSuperAdmin = requireRole(['super_admin']);

/**
 * Middleware para admin de empresa apenas
 */
export const requireCompanyAdmin = requireRole(['admin', 'company_admin']);

/**
 * Middleware para qualquer admin (super ou empresa)
 */
export const requireAnyAdmin = requireRole(['super_admin', 'admin', 'company_admin']);

/**
 * Gera par de tokens (access + refresh)
 */
export function generateTokenPair(user: any) {
  const payload = {
    sub: user.id.toString(),
    email: user.email,
    role: user.role || (user.email === 'semprecheioapp@gmail.com' ? 'super_admin' : 'admin'),
    userType: user.userType || (user.email === 'semprecheioapp@gmail.com' ? 'Super Admin' : 'Admin da Empresa')
  };
  
  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);
  
  return { accessToken, refreshToken };
}

/**
 * Configura cookies de autenticação após login
 */
export function setAuthCookies(res: Response, user: any) {
  const { accessToken, refreshToken } = generateTokenPair(user);
  
  // Cookie do access token (12 horas)
  setSecureCookie(res, 'access_token', accessToken, 12 * 60 * 60 * 1000);
  
  // Cookie do refresh token (7 dias)
  setSecureCookie(res, 'refresh_token', refreshToken, 7 * 24 * 60 * 60 * 1000);
  
  return { accessToken, refreshToken };
}

/**
 * Renova token usando refresh token
 */
export function refreshAccessToken(req: Request, res: Response) {
  const refreshToken = req.cookies?.refresh_token;
  
  if (!refreshToken) {
    return res.status(401).json({ 
      message: 'Refresh token não encontrado',
      code: 'NO_REFRESH_TOKEN'
    });
  }
  
  const payload = verifyToken(refreshToken);
  
  if (!payload) {
    clearAuthCookies(res);
    return res.status(401).json({ 
      message: 'Refresh token inválido',
      code: 'INVALID_REFRESH_TOKEN'
    });
  }
  
  // Gerar novo access token
  const newAccessToken = generateAccessToken({
    sub: payload.sub,
    email: payload.email,
    role: payload.role,
    userType: payload.userType
  });
  
  // Definir novo cookie
  setSecureCookie(res, 'access_token', newAccessToken);
  
  return res.json({ 
    message: 'Token renovado com sucesso',
    user: {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
      userType: payload.userType
    }
  });
}

/**
 * Configurações de segurança para diferentes ambientes
 */
export const SECURITY_CONFIG = {
  production: {
    cookieSecure: true,
    cookieDomain: '.semprecheioapp.com.br',
    jwtExpiresIn: '12h',
    refreshExpiresIn: '7d',
    requireHttps: true
  },
  development: {
    cookieSecure: false,
    cookieDomain: undefined,
    jwtExpiresIn: '24h',
    refreshExpiresIn: '30d',
    requireHttps: false
  },
  test: {
    cookieSecure: false,
    cookieDomain: undefined,
    jwtExpiresIn: '1h',
    refreshExpiresIn: '1d',
    requireHttps: false
  }
};

/**
 * Obtém configuração baseada no ambiente
 */
export function getSecurityConfig() {
  const env = process.env.NODE_ENV || 'development';
  return SECURITY_CONFIG[env as keyof typeof SECURITY_CONFIG] || SECURITY_CONFIG.development;
}
