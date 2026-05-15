import type { Request, Response, NextFunction } from 'express';
import { ROLE_HIERARCHY, ROLES } from '../utils/constants.js';

/**
 * Role-Based Access Control Middleware.
 * Requires user to have at least the specified role level.
 */
export function requireRole(minRole: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Unauthorized: Authentication required' });
      return;
    }

    const userLevel = ROLE_HIERARCHY[req.user.role] || 0;
    const requiredLevel = ROLE_HIERARCHY[minRole] || 0;

    if (userLevel < requiredLevel) {
      res.status(403).json({ success: false, error: `Forbidden: ${minRole} role required` });
      return;
    }

    next();
  };
}

/**
 * Middleware that requires 'founder' role.
 */
export function requireFounder(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ success: false, error: 'Unauthorized: Authentication required' });
    return;
  }

  if (req.user.role !== ROLES.FOUNDER) {
    res.status(403).json({ success: false, error: 'Forbidden: Founder role required' });
    return;
  }

  next();
}

/**
 * Middleware that requires 'admin' or 'founder' role (write access).
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  requireRole(ROLES.ADMIN)(req, res, next);
}

/**
 * Middleware that blocks 'viewer' role from write operations.
 */
export function requireWriteAccess(req: Request, res: Response, next: NextFunction): void {
  requireRole(ROLES.ADMIN)(req, res, next);
}
