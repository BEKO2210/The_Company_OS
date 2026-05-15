import type { Request, Response, NextFunction } from 'express';

interface ApiError extends Error {
  statusCode?: number;
  code?: string;
}

/**
 * Central Error Handler Middleware.
 * Catches all errors and returns a consistent JSON response.
 * Never leaks stack traces or internal details in production.
 */
export function errorHandler(err: ApiError, _req: Request, res: Response, _next?: NextFunction): void {
  const statusCode = err.statusCode || 500;
  const message = statusCode >= 500 
    ? 'Internal Server Error' 
    : (err.message || 'An error occurred');

  // Log error in non-test environments
  if (process.env.NODE_ENV !== 'test') {
    console.error(`[ERROR] ${statusCode}: ${err.message || 'Unknown error'}`);
    if (process.env.NODE_ENV === 'development' && err.stack) {
      console.error(err.stack);
    }
  }

  // Never expose stack traces or internal error details in production
  const isDev = process.env.NODE_ENV === 'development';
  const response: Record<string, unknown> = {
    success: false,
    error: message,
  };

  // Only include stack trace in development
  if (isDev && err.stack) {
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
}

/**
 * 404 Not Found Handler.
 */
export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    success: false,
    error: `Route not found: ${req.method} ${req.path}`,
  });
}

/**
 * Async handler wrapper - catches errors in async route handlers.
 */
export function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
