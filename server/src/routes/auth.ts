import { Router } from 'express';
import crypto from 'crypto';
import { db } from '../db/connection.js';
import { hashPassword, comparePassword } from '../utils/crypto.js';
import { generateToken } from '../utils/crypto.js';
import { loginSchema, registerSchema } from '../utils/validators.js';
import { authMiddleware } from '../middleware/auth.js';
import { authRateLimit } from '../middleware/rateLimit.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = Router();
// Lazy: env may not be loaded when this module is imported.
const getJwtSecret = (): string => {
  const s = process.env.JWT_SECRET;
  if (!s) throw new Error('FATAL: JWT_SECRET environment variable is required');
  return s;
};
const getJwtExpiry = (): string => process.env.JWT_EXPIRES_IN || '7d';
const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || '12', 10);

// POST /api/auth/login - with rate limiting to prevent brute force
router.post('/login', authRateLimit({ windowMs: 15 * 60 * 1000, maxRequests: 5 }), asyncHandler(async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: parsed.error.errors[0].message });
    return;
  }

  const { email, password } = parsed.data;

  // Normalize email to lowercase for consistent lookup
  const normalizedEmail = email.toLowerCase().trim();

  const user = db.prepare('SELECT * FROM users WHERE email = ? AND is_active = 1').get(normalizedEmail) as {
    id: string;
    email: string;
    password_hash: string;
    name: string;
    role: string;
  } | undefined;

  if (!user) {
    // Use same timing to prevent user enumeration attacks
    await comparePassword(password, '$2a$12$invalid.hash.to.prevent.timing.attacks.123456789012');
    res.status(401).json({ success: false, error: 'Invalid credentials' });
    return;
  }

  const isValid = await comparePassword(password, user.password_hash);
  if (!isValid) {
    res.status(401).json({ success: false, error: 'Invalid credentials' });
    return;
  }

  const token = generateToken(
    { userId: user.id, email: user.email, role: user.role },
    getJwtSecret(),
    getJwtExpiry()
  );

  res.json({
    success: true,
    data: {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    },
  });
}));

// POST /api/auth/logout
router.post('/logout', authMiddleware, asyncHandler(async (_req, res) => {
  // In a stateless JWT system, logout is handled client-side
  // Token should be removed from client storage
  // TODO: Add token to a blacklist (Redis) for immediate invalidation
  res.json({ success: true, message: 'Logged out successfully' });
}));

// POST /api/auth/register (founder only, with rate limiting)
router.post('/register', authMiddleware, authRateLimit({ windowMs: 60 * 60 * 1000, maxRequests: 10 }), asyncHandler(async (req, res) => {
  // Only founder can register new users
  if (req.user!.role !== 'founder') {
    res.status(403).json({ success: false, error: 'Only founder can register new users' });
    return;
  }

  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: parsed.error.errors[0].message });
    return;
  }

  const { email, password, name, role } = parsed.data;

  // Normalize email
  const normalizedEmail = email.toLowerCase().trim();

  // Check if email already exists
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(normalizedEmail);
  if (existing) {
    res.status(409).json({ success: false, error: 'Email already registered' });
    return;
  }

  const passwordHash = await hashPassword(password, BCRYPT_ROUNDS);
  const id = `user-${crypto.randomUUID()}`;

  db.prepare(`
    INSERT INTO users (id, email, password_hash, name, role, is_active)
    VALUES (?, ?, ?, ?, ?, 1)
  `).run(id, normalizedEmail, passwordHash, name, role);

  res.status(201).json({
    success: true,
    data: { id, email: normalizedEmail, name, role },
  });
}));

// GET /api/auth/me
router.get('/me', authMiddleware, asyncHandler(async (req, res) => {
  const user = db.prepare('SELECT id, email, name, role, is_active, created_at FROM users WHERE id = ?').get(req.user!.userId) as {
    id: string;
    email: string;
    name: string;
    role: string;
    is_active: number;
    created_at: string;
  } | undefined;

  if (!user) {
    res.status(404).json({ success: false, error: 'User not found' });
    return;
  }

  res.json({
    success: true,
    data: user,
  });
}));

export default router;
