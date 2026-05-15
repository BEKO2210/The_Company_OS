import { Router } from 'express';
import { getAllAgents, getAgentById, updateAgent, getAgentsByDepartment } from '../services/agentService.js';
import { agentFilterSchema, agentUpdateSchema } from '../utils/validators.js';
import { authMiddleware } from '../middleware/auth.js';
import { requireWriteAccess } from '../middleware/rbac.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = Router();

// GET /api/agents - List with filters (read-only, any authenticated user)
router.get('/', authMiddleware, asyncHandler(async (req, res) => {
  const parsed = agentFilterSchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: parsed.error.errors[0].message });
    return;
  }

  const { role, department, status, riskCeiling } = parsed.data;
  const agents = getAllAgents({ role, department, status, riskCeiling });

  res.json({
    success: true,
    data: agents,
    pagination: {
      total: agents.length,
      page: 1,
      limit: agents.length,
    },
  });
}));

// GET /api/agents/departments/:dept - Get agents by department (read-only)
router.get('/departments/:dept', authMiddleware, asyncHandler(async (req, res) => {
  const dept = req.params.dept as string;
  const agents = getAgentsByDepartment(dept);
  res.json({ success: true, data: agents });
}));

// GET /api/agents/:id - Detail (read-only)
router.get('/:id', authMiddleware, asyncHandler(async (req, res) => {
  const agent = getAgentById(req.params.id as string);
  if (!agent) {
    res.status(404).json({ success: false, error: 'Agent not found' });
    return;
  }
  res.json({ success: true, data: agent });
}));

// PUT /api/agents/:id - Update (requires write access: admin or founder)
router.put('/:id', authMiddleware, requireWriteAccess, asyncHandler(async (req, res) => {
  const parsed = agentUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: parsed.error.errors[0].message });
    return;
  }

  // Prevent viewers from modifying sensitive fields
  if (req.user!.role === 'viewer') {
    res.status(403).json({ success: false, error: 'Forbidden: Viewer cannot update agents' });
    return;
  }

  const agent = updateAgent(req.params.id as string, parsed.data as Record<string, unknown>);
  if (!agent) {
    res.status(404).json({ success: false, error: 'Agent not found' });
    return;
  }
  res.json({ success: true, data: agent });
}));

export default router;
