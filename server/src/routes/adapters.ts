import { Router } from 'express';
import { getAdapterService } from '../services/adapterService';
import { authMiddleware } from '../middleware/auth.js';
import { requireWriteAccess } from '../middleware/rbac.js';
// asyncHandler available if needed: import { asyncHandler } from '../middleware/errorHandler.js';

const router = Router();

// Apply auth middleware to all adapter routes
router.use(authMiddleware);

/**
 * GET /api/adapters - List all adapters with their status
 */
router.get('/', async (_req, res) => {
  try {
    const service = getAdapterService();
    const statuses = await service.getAllStatuses();

    res.json({
      success: true,
      count: statuses.length,
      adapters: statuses.map(s => ({
        name: s.name,
        enabled: s.enabled,
        connected: s.connected,
        mockMode: s.status.mockMode,
        status: s.status.status,
        lastError: s.status.lastError,
      })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ success: false, error: message });
  }
});

/**
 * GET /api/adapters/:name/status - Get status of a specific adapter
 */
router.get('/:name/status', async (req, res) => {
  try {
    const name = req.params.name as string;
    const service = getAdapterService();
    const adapterStatus = service.getStatus(name);

    if (!adapterStatus) {
      res.status(404).json({ success: false, error: `Adapter '${name}' not found` });
      return;
    }

    res.json({
      success: true,
      adapter: {
        name: adapterStatus.name,
        enabled: adapterStatus.enabled,
        connected: adapterStatus.connected,
        mockMode: adapterStatus.status.mockMode,
        status: adapterStatus.status.status,
        lastError: adapterStatus.status.lastError,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ success: false, error: message });
  }
});

/**
 * POST /api/adapters/:name/connect - Connect an adapter
 */
router.post('/:name/connect', requireWriteAccess, async (req, res) => {
  try {
    const name = req.params.name as string;
    const service = getAdapterService();
    const result = await service.connect(name);

    if (!result.success) {
      res.status(400).json({ success: false, error: result.message });
      return;
    }

    res.json({ success: true, message: result.message });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ success: false, error: message });
  }
});

/**
 * POST /api/adapters/:name/disconnect - Disconnect an adapter
 */
router.post('/:name/disconnect', requireWriteAccess, async (req, res) => {
  try {
    const name = req.params.name as string;
    const service = getAdapterService();
    const result = await service.disconnect(name);

    if (!result.success) {
      res.status(400).json({ success: false, error: result.message });
      return;
    }

    res.json({ success: true, message: result.message });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ success: false, error: message });
  }
});

/**
 * POST /api/adapters/:name/test - Test an adapter
 */
router.post('/:name/test', async (req, res) => {
  try {
    const name = req.params.name as string;
    const service = getAdapterService();
    const result = await service.test(name);

    if (!result.success) {
      res.status(400).json({ success: false, error: result.message, details: result.details });
      return;
    }

    res.json({ success: true, message: result.message, details: result.details });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ success: false, error: message });
  }
});

/**
 * PUT /api/adapters/:name/mock - Toggle mock mode
 * Body: { mock: boolean }
 */
router.put('/:name/mock', requireWriteAccess, async (req, res) => {
  try {
    const name = req.params.name as string;
    const { mock } = req.body;

    if (typeof mock !== 'boolean') {
      res.status(400).json({ success: false, error: "Body must contain 'mock' boolean field" });
      return;
    }

    const service = getAdapterService();
    const adapter = service.getAdapter(name);

    if (!adapter) {
      res.status(404).json({ success: false, error: `Adapter '${name}' not found` });
      return;
    }

    // Toggle mock mode via internal property
    (adapter as unknown as Record<string, unknown>).mockMode = mock;

    res.json({
      success: true,
      message: `Adapter '${name}' mock mode ${mock ? 'enabled' : 'disabled'}`,
      mockMode: mock,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ success: false, error: message });
  }
});

/**
 * POST /api/adapters/:name/enable - Enable an adapter
 */
router.post('/:name/enable', requireWriteAccess, async (req, res) => {
  try {
    const name = req.params.name as string;
    const service = getAdapterService();
    const success = service.enable(name);

    if (!success) {
      res.status(404).json({ success: false, error: `Adapter '${name}' not found` });
      return;
    }

    res.json({ success: true, message: `Adapter '${name}' enabled` });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ success: false, error: message });
  }
});

/**
 * POST /api/adapters/:name/disable - Disable an adapter
 */
router.post('/:name/disable', requireWriteAccess, async (req, res) => {
  try {
    const name = req.params.name as string;
    const service = getAdapterService();
    const success = service.disable(name);

    if (!success) {
      res.status(404).json({ success: false, error: `Adapter '${name}' not found` });
      return;
    }

    res.json({ success: true, message: `Adapter '${name}' disabled` });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ success: false, error: message });
  }
});

/**
 * GET /api/adapters/logs - Get adapter logs
 */
router.get('/logs/all', async (req, res) => {
  try {
    const service = getAdapterService();
    const adapter = req.query.adapter as string | undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
    const logs = service.getLogs(adapter, limit);

    res.json({
      success: true,
      count: logs.length,
      logs,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ success: false, error: message });
  }
});

/**
 * DELETE /api/adapters/logs - Clear adapter logs
 */
router.delete('/logs/all', requireWriteAccess, async (_req, res) => {
  try {
    const service = getAdapterService();
    service.clearLogs();

    res.json({ success: true, message: 'Adapter logs cleared' });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ success: false, error: message });
  }
});

// ============================================================
// Adapter-Specific Operation Routes
// ============================================================

// Email Adapter Routes
router.get('/email/inbox', async (_req, res) => {
  try {
    const service = getAdapterService();
    const adapter = service.getAdapter('email');
    if (!adapter) {
      res.status(404).json({ success: false, error: 'Email adapter not found' });
      return;
    }
    const { EmailAdapter: _EmailAdapter } = await import('../adapters');
    const emailAdapter = adapter as InstanceType<typeof _EmailAdapter>;
    const inbox = await emailAdapter.getInbox();
    res.json({ success: true, count: inbox.length, emails: inbox });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ success: false, error: message });
  }
});

router.get('/email/sent', async (_req, res) => {
  try {
    const service = getAdapterService();
    const adapter = service.getAdapter('email');
    if (!adapter) {
      res.status(404).json({ success: false, error: 'Email adapter not found' });
      return;
    }
    const { EmailAdapter: _EmailAdapter } = await import('../adapters');
    const emailAdapter = adapter as InstanceType<typeof _EmailAdapter>;
    const sent = await emailAdapter.getSent();
    res.json({ success: true, count: sent.length, emails: sent });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ success: false, error: message });
  }
});

router.post('/email/send', requireWriteAccess, async (req, res) => {
  try {
    const { to, subject, body, attachments } = req.body;
    if (!to || !subject || !body) {
      res.status(400).json({ success: false, error: 'Missing required fields: to, subject, body' });
      return;
    }
    const service = getAdapterService();
    const adapter = service.getAdapter('email');
    if (!adapter) {
      res.status(404).json({ success: false, error: 'Email adapter not found' });
      return;
    }
    const { EmailAdapter: _EmailAdapter } = await import('../adapters');
    const emailAdapter = adapter as InstanceType<typeof _EmailAdapter>;
    const result = await emailAdapter.sendEmail(to, subject, body, attachments);
    res.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ success: false, error: message });
  }
});

// LinkedIn Adapter Routes
router.get('/linkedin/profile', async (_req, res) => {
  try {
    const service = getAdapterService();
    const adapter = service.getAdapter('linkedin');
    if (!adapter) {
      res.status(404).json({ success: false, error: 'LinkedIn adapter not found' });
      return;
    }
    const { LinkedInAdapter: _LinkedInAdapter } = await import('../adapters');
    const liAdapter = adapter as InstanceType<typeof _LinkedInAdapter>;
    const profile = await liAdapter.getProfile();
    res.json({ success: true, profile });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ success: false, error: message });
  }
});

router.get('/linkedin/connections', async (req, res) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;
    const service = getAdapterService();
    const adapter = service.getAdapter('linkedin');
    if (!adapter) {
      res.status(404).json({ success: false, error: 'LinkedIn adapter not found' });
      return;
    }
    const { LinkedInAdapter: _LinkedInAdapter } = await import('../adapters');
    const liAdapter = adapter as InstanceType<typeof _LinkedInAdapter>;
    const connections = await liAdapter.getConnections(limit);
    res.json({ success: true, count: connections.length, connections });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ success: false, error: message });
  }
});

router.post('/linkedin/post', requireWriteAccess, async (req, res) => {
  try {
    const { content } = req.body;
    if (!content) {
      res.status(400).json({ success: false, error: 'Missing required field: content' });
      return;
    }
    const service = getAdapterService();
    const adapter = service.getAdapter('linkedin');
    if (!adapter) {
      res.status(404).json({ success: false, error: 'LinkedIn adapter not found' });
      return;
    }
    const { LinkedInAdapter: _LinkedInAdapter } = await import('../adapters');
    const liAdapter = adapter as InstanceType<typeof _LinkedInAdapter>;
    const result = await liAdapter.post(content);
    res.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ success: false, error: message });
  }
});

// Banking Adapter Routes (READ-ONLY)
router.get('/banking/balance', async (_req, res) => {
  try {
    const service = getAdapterService();
    const adapter = service.getAdapter('banking');
    if (!adapter) {
      res.status(404).json({ success: false, error: 'Banking adapter not found' });
      return;
    }
    const { BankingAdapter: _BankingAdapter } = await import('../adapters');
    const bankAdapter = adapter as InstanceType<typeof _BankingAdapter>;
    const balance = await bankAdapter.getBalance();
    res.json({ success: true, balance });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ success: false, error: message });
  }
});

router.get('/banking/transactions', async (req, res) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;
    const service = getAdapterService();
    const adapter = service.getAdapter('banking');
    if (!adapter) {
      res.status(404).json({ success: false, error: 'Banking adapter not found' });
      return;
    }
    const { BankingAdapter: _BankingAdapter } = await import('../adapters');
    const bankAdapter = adapter as InstanceType<typeof _BankingAdapter>;
    const transactions = await bankAdapter.getTransactions(limit);
    res.json({ success: true, count: transactions.length, transactions });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ success: false, error: message });
  }
});

router.get('/banking/account', async (_req, res) => {
  try {
    const service = getAdapterService();
    const adapter = service.getAdapter('banking');
    if (!adapter) {
      res.status(404).json({ success: false, error: 'Banking adapter not found' });
      return;
    }
    const { BankingAdapter: _BankingAdapter } = await import('../adapters');
    const bankAdapter = adapter as InstanceType<typeof _BankingAdapter>;
    const account = await bankAdapter.getAccountInfo();
    res.json({ success: true, account });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ success: false, error: message });
  }
});

// Accounting Adapter Routes
router.get('/accounting/invoices', async (req, res) => {
  try {
    const status = req.query.status as string | undefined;
    const service = getAdapterService();
    const adapter = service.getAdapter('accounting');
    if (!adapter) {
      res.status(404).json({ success: false, error: 'Accounting adapter not found' });
      return;
    }
    const { AccountingAdapter: _AccountingAdapter } = await import('../adapters');
    const accAdapter = adapter as InstanceType<typeof _AccountingAdapter>;
    const invoices = status
      ? await accAdapter.getInvoices(status as 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled')
      : await accAdapter.getInvoices();
    res.json({ success: true, count: invoices.length, invoices });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ success: false, error: message });
  }
});

router.post('/accounting/invoices', requireWriteAccess, async (req, res) => {
  try {
    const { customerName, customerEmail, items, currency, dueDays, notes } = req.body;
    if (!customerName || !customerEmail || !items) {
      res.status(400).json({ success: false, error: 'Missing required fields' });
      return;
    }
    const service = getAdapterService();
    const adapter = service.getAdapter('accounting');
    if (!adapter) {
      res.status(404).json({ success: false, error: 'Accounting adapter not found' });
      return;
    }
    const { AccountingAdapter: _AccountingAdapter } = await import('../adapters');
    const accAdapter = adapter as InstanceType<typeof _AccountingAdapter>;
    const result = await accAdapter.createInvoice({
      customerName,
      customerEmail,
      items,
      currency,
      dueDays,
      notes,
    });
    res.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ success: false, error: message });
  }
});

router.post('/accounting/invoices/:id/pay', requireWriteAccess, async (req, res) => {
  try {
    const id = req.params.id as string;
    const service = getAdapterService();
    const adapter = service.getAdapter('accounting');
    if (!adapter) {
      res.status(404).json({ success: false, error: 'Accounting adapter not found' });
      return;
    }
    const { AccountingAdapter: _AccountingAdapter } = await import('../adapters');
    const accAdapter = adapter as InstanceType<typeof _AccountingAdapter>;
    const result = await accAdapter.markAsPaid(id);
    res.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ success: false, error: message });
  }
});

router.get('/accounting/export', async (_req, res) => {
  try {
    const service = getAdapterService();
    const adapter = service.getAdapter('accounting');
    if (!adapter) {
      res.status(404).json({ success: false, error: 'Accounting adapter not found' });
      return;
    }
    const { AccountingAdapter: _AccountingAdapter } = await import('../adapters');
    const accAdapter = adapter as InstanceType<typeof _AccountingAdapter>;
    const result = await accAdapter.exportCSV();
    if (result.csv) {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=invoices.csv');
      res.send(result.csv);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ success: false, error: message });
  }
});

// GitHub Adapter Routes
router.get('/github/repos', async (_req, res) => {
  try {
    const service = getAdapterService();
    const adapter = service.getAdapter('github');
    if (!adapter) {
      res.status(404).json({ success: false, error: 'GitHub adapter not found' });
      return;
    }
    const { GitHubAdapter: _GitHubAdapter } = await import('../adapters');
    const ghAdapter = adapter as InstanceType<typeof _GitHubAdapter>;
    const repos = await ghAdapter.getRepos();
    res.json({ success: true, count: repos.length, repos });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ success: false, error: message });
  }
});

router.post('/github/repos', requireWriteAccess, async (req, res) => {
  try {
    const { name, description, isPrivate = true } = req.body;
    if (!name) {
      res.status(400).json({ success: false, error: 'Missing required field: name' });
      return;
    }
    const service = getAdapterService();
    const adapter = service.getAdapter('github');
    if (!adapter) {
      res.status(404).json({ success: false, error: 'GitHub adapter not found' });
      return;
    }
    const { GitHubAdapter: _GitHubAdapter } = await import('../adapters');
    const ghAdapter = adapter as InstanceType<typeof _GitHubAdapter>;
    const result = await ghAdapter.createRepo(name, description, isPrivate);
    res.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ success: false, error: message });
  }
});

// Hosting Adapter Routes
router.get('/hosting/deployments', async (req, res) => {
  try {
    const project = req.query.project as string | undefined;
    const service = getAdapterService();
    const adapter = service.getAdapter('hosting');
    if (!adapter) {
      res.status(404).json({ success: false, error: 'Hosting adapter not found' });
      return;
    }
    const { HostingAdapter: _HostingAdapter } = await import('../adapters');
    const hostAdapter = adapter as InstanceType<typeof _HostingAdapter>;
    const deployments = await hostAdapter.getDeployments(project);
    res.json({ success: true, count: deployments.length, deployments });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ success: false, error: message });
  }
});

router.post('/hosting/deploy', requireWriteAccess, async (req, res) => {
  try {
    const { project, env = 'production' } = req.body;
    if (!project) {
      res.status(400).json({ success: false, error: 'Missing required field: project' });
      return;
    }
    const service = getAdapterService();
    const adapter = service.getAdapter('hosting');
    if (!adapter) {
      res.status(404).json({ success: false, error: 'Hosting adapter not found' });
      return;
    }
    const { HostingAdapter: _HostingAdapter } = await import('../adapters');
    const hostAdapter = adapter as InstanceType<typeof _HostingAdapter>;
    const result = await hostAdapter.deploy(project, env);
    res.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ success: false, error: message });
  }
});

router.post('/hosting/rollback/:deploymentId', requireWriteAccess, async (req, res) => {
  try {
    const deploymentId = req.params.deploymentId as string;
    const service = getAdapterService();
    const adapter = service.getAdapter('hosting');
    if (!adapter) {
      res.status(404).json({ success: false, error: 'Hosting adapter not found' });
      return;
    }
    const { HostingAdapter: _HostingAdapter } = await import('../adapters');
    const hostAdapter = adapter as InstanceType<typeof _HostingAdapter>;
    const result = await hostAdapter.rollback(deploymentId);
    res.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ success: false, error: message });
  }
});

// Calendar Adapter Routes
router.get('/calendar/events', async (req, res) => {
  try {
    const start = req.query.start ? new Date(req.query.start as string) : new Date();
    const end = req.query.end
      ? new Date(req.query.end as string)
      : new Date(Date.now() + 7 * 86400000);
    const service = getAdapterService();
    const adapter = service.getAdapter('calendar');
    if (!adapter) {
      res.status(404).json({ success: false, error: 'Calendar adapter not found' });
      return;
    }
    const { CalendarAdapter: _CalendarAdapter } = await import('../adapters');
    const calAdapter = adapter as InstanceType<typeof _CalendarAdapter>;
    const events = await calAdapter.getEvents(start, end);
    res.json({ success: true, count: events.length, events });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ success: false, error: message });
  }
});

router.post('/calendar/events', requireWriteAccess, async (req, res) => {
  try {
    const { title, description, location, startTime, endTime, attendees, color } = req.body;
    if (!title || !startTime || !endTime) {
      res.status(400).json({ success: false, error: 'Missing required fields: title, startTime, endTime' });
      return;
    }
    const service = getAdapterService();
    const adapter = service.getAdapter('calendar');
    if (!adapter) {
      res.status(404).json({ success: false, error: 'Calendar adapter not found' });
      return;
    }
    const { CalendarAdapter: _CalendarAdapter } = await import('../adapters');
    const calAdapter = adapter as InstanceType<typeof _CalendarAdapter>;
    const result = await calAdapter.createEvent({
      title,
      description,
      location,
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      attendees,
      color,
    });
    res.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ success: false, error: message });
  }
});

router.get('/calendar/freeslots', async (req, res) => {
  try {
    const date = req.query.date ? new Date(req.query.date as string) : new Date();
    const duration = req.query.duration ? parseInt(req.query.duration as string, 10) : 60;
    const service = getAdapterService();
    const adapter = service.getAdapter('calendar');
    if (!adapter) {
      res.status(404).json({ success: false, error: 'Calendar adapter not found' });
      return;
    }
    const { CalendarAdapter: _CalendarAdapter } = await import('../adapters');
    const calAdapter = adapter as InstanceType<typeof _CalendarAdapter>;
    const slots = await calAdapter.getFreeSlots(date, duration);
    res.json({ success: true, count: slots.length, slots });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ success: false, error: message });
  }
});

router.delete('/calendar/events/:id', requireWriteAccess, async (req, res) => {
  try {
    const id = req.params.id as string;
    const service = getAdapterService();
    const adapter = service.getAdapter('calendar');
    if (!adapter) {
      res.status(404).json({ success: false, error: 'Calendar adapter not found' });
      return;
    }
    const { CalendarAdapter: _CalendarAdapter } = await import('../adapters');
    const calAdapter = adapter as InstanceType<typeof _CalendarAdapter>;
    const result = await calAdapter.deleteEvent(id);
    res.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ success: false, error: message });
  }
});

// Freelancer Adapter Routes
router.get('/freelancer/search', async (req, res) => {
  try {
    const skills = req.query.skills ? (req.query.skills as string).split(',') : undefined;
    const service = getAdapterService();
    const adapter = service.getAdapter('freelancer');
    if (!adapter) {
      res.status(404).json({ success: false, error: 'Freelancer adapter not found' });
      return;
    }
    const { FreelancerPlatformAdapter: _FreelancerPlatformAdapter } = await import('../adapters');
    const flAdapter = adapter as InstanceType<typeof _FreelancerPlatformAdapter>;
    const freelancers = await flAdapter.searchFreelancers(skills);
    res.json({ success: true, count: freelancers.length, freelancers });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ success: false, error: message });
  }
});

router.get('/freelancer/hires', async (req, res) => {
  try {
    const status = req.query.status as 'active' | 'completed' | 'cancelled' | undefined;
    const service = getAdapterService();
    const adapter = service.getAdapter('freelancer');
    if (!adapter) {
      res.status(404).json({ success: false, error: 'Freelancer adapter not found' });
      return;
    }
    const { FreelancerPlatformAdapter: _FreelancerPlatformAdapter } = await import('../adapters');
    const flAdapter = adapter as InstanceType<typeof _FreelancerPlatformAdapter>;
    const hires = await flAdapter.getHires(status);
    res.json({ success: true, count: hires.length, hires });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ success: false, error: message });
  }
});

router.post('/freelancer/hire', requireWriteAccess, async (req, res) => {
  try {
    const { freelancerId, project, description, budget } = req.body;
    if (!freelancerId || !project) {
      res.status(400).json({ success: false, error: 'Missing required fields: freelancerId, project' });
      return;
    }
    const service = getAdapterService();
    const adapter = service.getAdapter('freelancer');
    if (!adapter) {
      res.status(404).json({ success: false, error: 'Freelancer adapter not found' });
      return;
    }
    const { FreelancerPlatformAdapter: _FreelancerPlatformAdapter } = await import('../adapters');
    const flAdapter = adapter as InstanceType<typeof _FreelancerPlatformAdapter>;
    const result = await flAdapter.hire(freelancerId, project, description, budget);
    res.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ success: false, error: message });
  }
});

router.post('/freelancer/rate', requireWriteAccess, async (req, res) => {
  try {
    const { freelancerId, score, comment, categories } = req.body;
    if (!freelancerId || score === undefined) {
      res.status(400).json({ success: false, error: 'Missing required fields: freelancerId, score' });
      return;
    }
    const service = getAdapterService();
    const adapter = service.getAdapter('freelancer');
    if (!adapter) {
      res.status(404).json({ success: false, error: 'Freelancer adapter not found' });
      return;
    }
    const { FreelancerPlatformAdapter: _FreelancerPlatformAdapter } = await import('../adapters');
    const flAdapter = adapter as InstanceType<typeof _FreelancerPlatformAdapter>;
    const result = await flAdapter.rate({ freelancerId, score, comment, categories });
    res.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ success: false, error: message });
  }
});

export default router;
