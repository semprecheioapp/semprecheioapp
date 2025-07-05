import type { Request, Response, NextFunction } from "express";

export interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

export class ApiError extends Error implements AppError {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string, statusCode: number = 500, isOperational: boolean = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    
    Error.captureStackTrace(this, this.constructor);
  }
}

// Middleware de tratamento de erros centralizado
export const errorHandler = (
  error: AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { statusCode = 500, message } = error;

  // Log do erro para debugging
  console.error(`[${new Date().toISOString()}] Error ${statusCode}:`, {
    message,
    url: req.url,
    method: req.method,
    stack: error.stack,
    body: req.body
  });

  // Resposta padronizada de erro
  res.status(statusCode).json({
    success: false,
    message: statusCode === 500 ? "Erro interno do servidor" : message,
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
  });
};

// Middleware para capturar erros assíncronos
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Middleware para rotas não encontradas
export const notFoundHandler = (req: Request, res: Response, next: NextFunction) => {
  const error = new ApiError(`Rota ${req.originalUrl} não encontrada`, 404);
  next(error);
};
