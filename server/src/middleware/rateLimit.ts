import type { Request, Response, NextFunction } from 'express';

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

// In-memory store for rate limiting (use Redis in production)
const rateLimitStore = new Map<string, RateLimitEntry>();

/**
 * Clean up expired entries periodically.
 * Disabled in test env so Jest can exit cleanly and tests aren't rate-limited.
 */
if (process.env.NODE_ENV !== 'test') {
  const cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of rateLimitStore.entries()) {
      if (entry.resetTime < now) {
        rateLimitStore.delete(key);
      }
    }
  }, 60000); // Clean up every minute
  // Allow process to exit if this is the only thing keeping it alive
  cleanupTimer.unref?.();
}

/** Reset the rate-limit store (used by tests). */
export function _resetRateLimitStore(): void {
  rateLimitStore.clear();
}

interface RateLimitOptions {
  windowMs?: number;    // Time window in milliseconds (default: 15 minutes)
  maxRequests?: number; // Max requests per window (default: 5)
  message?: string;
}

/**
 * Rate limiting middleware.
 * Limits requests per IP address within a time window.
 */
export function rateLimit(options: RateLimitOptions = {}) {
  const windowMs = options.windowMs || 15 * 60 * 1000; // 15 minutes
  const maxRequests = options.maxRequests || 5;
  const message = options.message || 'Too many requests, please try again later.';

  return (req: Request, res: Response, next: NextFunction): void => {
    if (process.env.NODE_ENV === 'test') {
      next();
      return;
    }
    const identifier = req.ip || req.socket.remoteAddress || 'unknown';
    const key = `${req.path}:${identifier}`;
    const now = Date.now();

    const entry = rateLimitStore.get(key);

    if (!entry || entry.resetTime < now) {
      // First request or window expired
      rateLimitStore.set(key, {
        count: 1,
        resetTime: now + windowMs,
      });
      next();
      return;
    }

    if (entry.count >= maxRequests) {
      const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
      res.status(429).json({
        success: false,
        error: message,
        retryAfter,
      });
      return;
    }

    entry.count++;
    next();
  };
}

/**
 * Stricter rate limit for authentication endpoints.
 * Prevents brute-force attacks on login/register.
 */
export function authRateLimit(options: RateLimitOptions = {}) {
  return rateLimit({
    windowMs: options.windowMs || 15 * 60 * 1000, // 15 minutes
    maxRequests: options.maxRequests || 5,          // 5 attempts per 15 min
    message: options.message || 'Too many authentication attempts. Please try again later.',
  });
}
