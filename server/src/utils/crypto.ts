import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

/**
 * Generate a SHA-256 hash for audit log entries.
 * The hash includes the entry data + previous_hash to form a chain.
 */
export function generateAuditHash(data: {
  agent: string;
  action: string;
  tool?: string | null;
  input?: string | null;
  output?: string | null;
  risk_score?: number;
  project?: string | null;
  approved_by?: string | null;
  previous_hash?: string | null;
}): string {
  const payload = JSON.stringify({
    agent: data.agent,
    action: data.action,
    tool: data.tool || '',
    input: data.input || '',
    output: data.output || '',
    risk_score: data.risk_score || 0,
    project: data.project || '',
    approved_by: data.approved_by || '',
    previous_hash: data.previous_hash || '',
    nonce: Date.now(),
  });
  return crypto.createHash('sha256').update(payload).digest('hex');
}

/**
 * Generate a random ID with optional prefix.
 */
export function generateId(prefix?: string): string {
  const random = crypto.randomBytes(8).toString('hex');
  return prefix ? `${prefix}-${random}` : random;
}

// ═══════════════════════════════════════════════════════════════
// Password Hashing - Both Sync and Async versions
// ═══════════════════════════════════════════════════════════════

/**
 * Hash a password using bcryptjs (SYNC - for backwards compatibility in tests/seed).
 * Prefer hashPassword() for production code.
 */
export function hashPasswordSync(password: string, rounds: number = 12): string {
  return bcrypt.hashSync(password, rounds);
}

/**
 * Hash a password using bcryptjs (ASYNC - preferred for production).
 * Non-blocking, won't freeze the event loop under load.
 */
export async function hashPassword(password: string, rounds: number = 12): Promise<string> {
  return bcrypt.hash(password, rounds);
}

/**
 * Compare a password with its hash (SYNC - for backwards compatibility).
 * Prefer comparePassword() for production code.
 */
export function comparePasswordSync(password: string, hash: string): boolean {
  return bcrypt.compareSync(password, hash);
}

/**
 * Compare a password with its hash (ASYNC - preferred for production).
 * Non-blocking, won't freeze the event loop under load.
 */
export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Generate JWT token
 */
export function generateToken(payload: object, secret: string, expiresIn: string = '7d'): string {
  return jwt.sign(payload, secret, { expiresIn });
}

/**
 * Verify JWT token
 */
export function verifyToken<T>(token: string, secret: string): T {
  return jwt.verify(token, secret) as T;
}
