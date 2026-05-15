import type { Request, Response, NextFunction } from 'express';
import { createEntry } from '../services/auditService.js';

/**
 * Audit Log Middleware.
 * Automatically logs API actions to the audit log.
 * Attach after auth middleware so req.user is available.
 */
export function auditLogMiddleware(action: string, options?: { logBody?: boolean; project?: string }) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const originalSend = res.json.bind(res);
    
    // Capture the response
    res.json = function(body: unknown) {
      // Log to audit log (fire and forget)
      try {
        const agent = req.user?.email || 'anonymous';
        const method = req.method;
        const path = req.path;
        const input = options?.logBody ? JSON.stringify(req.body) : `${method} ${path}`;
        const output = typeof body === 'object' && body !== null && 'success' in body 
          ? String((body as Record<string, unknown>).success) 
          : 'unknown';
        const riskScore = res.statusCode >= 400 ? 10 : 1;

        createEntry({
          agent,
          action: `${action} (${method} ${path})`,
          input: input.substring(0, 500),
          output: output.substring(0, 500),
          risk_score: riskScore,
          project: options?.project || null,
          approved_by: req.user?.email || null,
        });
      } catch {
        // Audit logging should not break the API
      }

      return originalSend(body);
    };

    next();
  };
}
