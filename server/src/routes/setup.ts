// First-run setup endpoints. Self-locking: once SETUP_COMPLETED=true
// is present in server/.env, the write endpoint refuses further calls.

import { Router } from 'express';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { asyncHandler } from '../middleware/errorHandler.js';

// process.cwd() is the server/ directory when started via `npm run dev`.
const ENV_PATH = path.resolve(process.cwd(), '.env');
const ENV_BACKUP_PATH = `${ENV_PATH}.bak`;

const router = Router();

interface EnvPayload {
  env: string;          // raw .env body produced by the wizard
  configSummary?: {
    companyName?: string;
    adaptersEnabled?: string[];
  };
}

router.get('/status', asyncHandler(async (_req, res) => {
  const locked = await isLocked();
  res.json({
    success: true,
    data: {
      setupCompleted: locked,
      envPath: ENV_PATH,
    },
  });
}));

router.post('/save-env', asyncHandler(async (req, res) => {
  const locked = await isLocked();
  if (locked) {
    res.status(403).json({
      success: false,
      error: 'Setup already completed. Delete SETUP_COMPLETED from server/.env to re-run.',
    });
    return;
  }

  const body = req.body as Partial<EnvPayload>;
  if (!body?.env || typeof body.env !== 'string') {
    res.status(400).json({ success: false, error: 'Missing required field: env (string)' });
    return;
  }
  if (body.env.length > 64_000) {
    res.status(413).json({ success: false, error: '.env body too large (>64KB)' });
    return;
  }
  if (!body.env.includes('SETUP_COMPLETED=true')) {
    res.status(400).json({ success: false, error: 'Payload must include SETUP_COMPLETED=true to lock' });
    return;
  }

  try {
    // Backup existing .env (if any) so the user can recover.
    try {
      const existing = await fs.readFile(ENV_PATH, 'utf8');
      await fs.writeFile(ENV_BACKUP_PATH, existing, 'utf8');
    } catch {
      // no existing .env to backup
    }

    // Atomic write: write to temp then rename.
    const tmp = `${ENV_PATH}.tmp`;
    await fs.writeFile(tmp, body.env, 'utf8');
    await fs.rename(tmp, ENV_PATH);

    res.json({
      success: true,
      data: {
        envPath: ENV_PATH,
        bytesWritten: Buffer.byteLength(body.env, 'utf8'),
        backup: ENV_BACKUP_PATH,
        configSummary: body.configSummary || null,
        note: 'Restart the server to apply the new configuration.',
      },
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: `Failed to write .env: ${err instanceof Error ? err.message : 'unknown error'}`,
    });
  }
}));

async function isLocked(): Promise<boolean> {
  try {
    const content = await fs.readFile(ENV_PATH, 'utf8');
    return /^SETUP_COMPLETED\s*=\s*true/m.test(content);
  } catch {
    return false;
  }
}

export default router;
