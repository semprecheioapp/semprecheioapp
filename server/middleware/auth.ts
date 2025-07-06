import type { Request, Response, NextFunction } from "express";
import { storage } from "../storage-clients-auth";

interface AuthRequest extends Request {
  user?: {
    id: number;
    name: string;
    email: string;
    role: string;
    createdAt: Date;
  };
}

// Middleware básico de autenticação
export const requireAuth = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const sessionId = req.cookies?.sessionId;
    
    if (!sessionId) {
      return res.status(401).json({ message: "Não autorizado" });
    }
    
    // Verificação especial para super admin
    if (sessionId === "super-admin-session-permanent") {
      const superAdminClient = await storage.getClientByEmail("semprecheioapp@gmail.com");
      if (superAdminClient) {
        req.user = {
          id: 165,
          name: superAdminClient.name,
          email: superAdminClient.email,
          role: 'super_admin',
          createdAt: superAdminClient.createdAt || new Date()
        };
        return next();
      }
    }
    
    // Validação de sessão regular
    const user = await storage.getUserBySessionId(sessionId);
    if (!user) {
      return res.status(401).json({ message: "Sessão inválida" });
    }
    
    // Determinar role baseado no email e dados do usuário
    let role = 'admin'; // padrão
    
    if (user.email === 'semprecheioapp@gmail.com') {
      role = 'super_admin';
    } else if (user.role) {
      role = user.role;
    }
    
    req.user = {
      ...user,
      role
    };
    
    next();
  } catch (error) {
    console.error("Auth error:", error);
    res.status(500).json({ message: "Erro de autenticação" });
  }
};

// Middleware para verificar se é super admin
export const requireSuperAdmin = async (req: AuthRequest, res: Response, next: NextFunction) => {
  // Primeiro verificar autenticação
  await requireAuth(req, res, () => {
    if (!req.user) {
      return res.status(401).json({ message: "Não autorizado" });
    }
    
    // Verificar se é super admin
    if (req.user.email !== 'semprecheioapp@gmail.com' && req.user.role !== 'super_admin') {
      return res.status(403).json({ 
        message: "Acesso negado. Apenas super administradores podem acessar este recurso." 
      });
    }
    
    next();
  });
};

// Middleware para verificar se é admin (não super admin)
export const requireAdmin = async (req: AuthRequest, res: Response, next: NextFunction) => {
  // Primeiro verificar autenticação
  await requireAuth(req, res, () => {
    if (!req.user) {
      return res.status(401).json({ message: "Não autorizado" });
    }
    
    // Verificar se é admin (não super admin)
    if (req.user.email === 'semprecheioapp@gmail.com' || req.user.role === 'super_admin') {
      return res.status(403).json({ 
        message: "Acesso negado. Este recurso é apenas para administradores de empresa." 
      });
    }
    
    next();
  });
};

// Middleware para verificar se o usuário pode acessar dados de um cliente específico
export const requireClientAccess = (clientIdParam: string = 'client_id') => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    await requireAuth(req, res, async () => {
      if (!req.user) {
        return res.status(401).json({ message: "Não autorizado" });
      }
      
      // Super admin pode acessar qualquer cliente
      if (req.user.email === 'semprecheioapp@gmail.com' || req.user.role === 'super_admin') {
        return next();
      }
      
      // Para admins de empresa, verificar se o client_id corresponde ao seu cliente
      const requestedClientId = req.params[clientIdParam] || req.query[clientIdParam] || req.body[clientIdParam];
      
      if (!requestedClientId) {
        return res.status(400).json({ message: "Client ID é obrigatório" });
      }
      
      // Buscar o cliente do usuário atual
      const userClient = await storage.getClientByEmail(req.user.email);
      if (!userClient || userClient.id !== requestedClientId) {
        return res.status(403).json({ 
          message: "Acesso negado. Você só pode acessar dados da sua própria empresa." 
        });
      }
      
      next();
    });
  };
};

// Função auxiliar para determinar o role do usuário
export function getUserRole(user: any): 'super_admin' | 'admin' {
  if (user.email === 'semprecheioapp@gmail.com') {
    return 'super_admin';
  }
  
  if (user.role === 'super_admin') {
    return 'super_admin';
  }
  
  return 'admin';
}

// Função auxiliar para verificar se o usuário pode acessar dados de um cliente
export async function canAccessClient(userEmail: string, clientId: string): Promise<boolean> {
  // Super admin pode acessar qualquer cliente
  if (userEmail === 'semprecheioapp@gmail.com') {
    return true;
  }
  
  // Para outros usuários, verificar se o clientId corresponde ao seu cliente
  const userClient = await storage.getClientByEmail(userEmail);
  return userClient?.id === clientId;
}

export type { AuthRequest };
