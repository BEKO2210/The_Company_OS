import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Load environment variables
if (process.env.NODE_ENV === 'test') {
  dotenv.config({ path: '.env.test' });
} else {
  dotenv.config();
}

import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { securityHeaders, sanitizeInput } from './middleware/security.js';

// Import routes
import authRoutes from './routes/auth.js';
import agentsRoutes from './routes/agents.js';
import departmentsRoutes from './routes/departments.js';
import businessUnitsRoutes from './routes/businessUnits.js';
import productStudiosRoutes from './routes/productStudios.js';
import approvalsRoutes from './routes/approvals.js';
import auditLogRoutes from './routes/auditLog.js';
import risksRoutes from './routes/risks.js';
import workflowsRoutes from './routes/workflows.js';
import financeRoutes from './routes/finance.js';
import workforceRoutes from './routes/workforce.js';
import settingsRoutes from './routes/settings.js';
import killSwitchRoutes from './routes/killSwitch.js';
import dashboardRoutes from './routes/dashboard.js';
import aiRoutes from './routes/ai.js';
import setupRoutes from './routes/setup.js';

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// ─── Express App Setup ───
export function createApp() {
  const app = express();

  // Security headers first (before any route handling)
  app.use(securityHeaders);

  // CORS - restrict to configured frontend origin
  const allowedOrigins = process.env.NODE_ENV === 'production'
    ? [FRONTEND_URL]
    : [FRONTEND_URL, 'http://localhost:3000', 'http://localhost:5173', 'http://localhost:4173'];
  
  app.use(cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g., mobile apps, curl)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }));

  // Body parsing with limits to prevent DoS
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  // Input sanitization to prevent XSS
  app.use(sanitizeInput);

  // Health check (no auth required)
  app.get('/health', (_req, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      env: process.env.NODE_ENV || 'development',
    });
  });

  // API routes
  app.use('/api/auth', authRoutes);
  app.use('/api/agents', agentsRoutes);
  app.use('/api/departments', departmentsRoutes);
  app.use('/api/business-units', businessUnitsRoutes);
  app.use('/api/product-studios', productStudiosRoutes);
  app.use('/api/approvals', approvalsRoutes);
  app.use('/api/audit-log', auditLogRoutes);
  app.use('/api/risks', risksRoutes);
  app.use('/api/workflows', workflowsRoutes);
  app.use('/api/workflow-instances', workflowsRoutes);
  app.use('/api/finance', financeRoutes);
  app.use('/api/workforce', workforceRoutes);
  app.use('/api/settings', settingsRoutes);
  app.use('/api/kill-switch', killSwitchRoutes);
  app.use('/api/dashboard', dashboardRoutes);
  app.use('/api/ai', aiRoutes);
  app.use('/api/setup', setupRoutes);

  // 404 handler
  app.use(notFoundHandler);

  // Central error handler (must be last)
  app.use(errorHandler);

  return app;
}

export const app = createApp();
