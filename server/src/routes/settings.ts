import { Router } from 'express';
import { db } from '../db/connection.js';
import { authMiddleware } from '../middleware/auth.js';
import { requireFounder } from '../middleware/rbac.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import type { SystemSetting, ToolPermission, ModelPolicy } from '../types/index.js';

const router = Router();

// GET /api/settings - System Settings
router.get('/', authMiddleware, asyncHandler(async (_req, res) => {
  const settings = db.prepare('SELECT * FROM system_settings').all() as SystemSetting[];
  const toolPermissions = db.prepare('SELECT * FROM tool_permissions').all() as ToolPermission[];
  const modelPolicies = db.prepare('SELECT * FROM model_policies').all() as ModelPolicy[];

  // Format settings as key-value map
  const settingsMap: Record<string, string> = {};
  for (const s of settings) {
    settingsMap[s.key] = s.value;
  }

  res.json({
    success: true,
    data: {
      settings: settingsMap,
      toolPermissions,
      modelPolicies,
    },
  });
}));

// PUT /api/settings - Update settings (founder only)
router.put('/', authMiddleware, requireFounder, asyncHandler(async (req, res) => {
  const updates = req.body as Record<string, string>;
  const stmt = db.prepare('UPDATE system_settings SET value = ?, updated_at = CURRENT_TIMESTAMP WHERE key = ?');

  const updated: string[] = [];
  for (const [key, value] of Object.entries(updates)) {
    const result = stmt.run(value, key);
    if (result.changes > 0) {
      updated.push(key);
    }
  }

  res.json({ success: true, data: { updated } });
}));

// GET /api/settings/tool-permissions
router.get('/tool-permissions', authMiddleware, asyncHandler(async (_req, res) => {
  const permissions = db.prepare('SELECT * FROM tool_permissions').all() as ToolPermission[];
  res.json({ success: true, data: permissions });
}));

// GET /api/settings/model-policies
router.get('/model-policies', authMiddleware, asyncHandler(async (_req, res) => {
  const policies = db.prepare('SELECT * FROM model_policies').all() as ModelPolicy[];
  res.json({ success: true, data: policies });
}));

export default router;
