import type { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/crypto.js';
import { db } from '../db/connection.js';
import type { JWTPayload } from '../types/index.js';

// Extend Express Request
declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
    }
  }
}

const JWT_SECRET = process.env.JWT_SECRET!;
if (!JWT_SECRET) {
  throw new Error('FATAL: JWT_SECRET environment variable is required');
}

/**
 * JWT Authentication Middleware.
 * Verifies the Authorization: Bearer <token> header.
 */
export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ success: false, error: 'Unauthorized: No token provided' });
    return;
  }

  const token = authHeader.substring(7);

  try {
    const payload = verifyToken<JWTPayload>(token, JWT_SECRET);
    
    // Check if user still exists and is active
    const user = db.prepare('SELECT id, email, role, is_active FROM users WHERE id = ?').get(payload.userId) as {
      id: string; email: string; role: string; is_active: number;
    } | undefined;

    if (!user) {
      res.status(401).json({ success: false, error: 'Unauthorized: User not found' });
      return;
    }

    if (!user.is_active) {
      res.status(401).json({ success: false, error: 'Unauthorized: User is deactivated' });
      return;
    }

    req.user = payload;
    next();
  } catch (_err) {
    res.status(401).json({ success: false, error: 'Unauthorized: Invalid token' });
  }
}

/**
 * Optional auth middleware - doesn't fail if no token.
 */
export function optionalAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    try {
      const payload = verifyToken<JWTPayload>(token, JWT_SECRET);
      req.user = payload;
    } catch {
      // ignore invalid token for optional auth
    }
  }
  
  next();
}
