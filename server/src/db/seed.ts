import { db } from './connection.js';
import { hashPassword, generateAuditHash } from '../utils/crypto.js';

// ═══════════════════════════════════════════════════════════════
// Seed Script - Imports all data from frontend mockData
// ═══════════════════════════════════════════════════════════════

async function seed() {
  console.log('[SEED] Starting database seeding...');

  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
  if (userCount.count > 0) {
    console.log('[SEED] Database already has data, skipping seed');
    return;
  }

  // ─── 1. Users (Auth) ───
  console.log('[SEED] Creating users...');
  const founderPassword = process.env.FOUNDER_PASSWORD || 'TheCompany2025!';
  const founderHash = await hashPassword(founderPassword, 12);
  
  const insertUser = db.prepare(`
    INSERT INTO users (id, email, password_hash, name, role, is_active)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  
  insertUser.run('user-founder', 'founder@thecompany.de', founderHash, 'Gruender', 'founder', 1);
  
  const adminHash = await hashPassword('admin123', 12);
  insertUser.run('user-admin', 'admin@thecompany.de', adminHash, 'Admin', 'admin', 1);
  
  const viewerHash = await hashPassword('viewer123', 12);
  insertUser.run('user-viewer', 'viewer@thecompany.de', viewerHash, 'Viewer', 'viewer', 1);

  // ─── 2. Agents (22) ───
  console.log('[SEED] Creating 22 agents...');
  const insertAgent = db.prepare(`
    INSERT INTO agents (id, role, name, department, description, allowed_tools, budget_limit, budget_spent, risk_ceiling, autonomy_level, human_approval_rules, kpis, status, version, owner_human)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const agentsData = [
    { id: 'human-ceo', role: 'Human CEO/Founder', name: 'Founder', department: 'Executive Council', description: 'Human-in-the-loop decision maker, sole shareholder', allowed_tools: JSON.stringify(['all']), budget_limit: 1000000, budget_spent: 0, risk_ceiling: 'critical', autonomy_level: 'human-only', human_approval_rules: JSON.stringify(['All red-line decisions', 'Kill switch activation']), kpis: JSON.stringify([{ name: 'Decisions/Day', value: '12', target: '15' }]), status: 'active', version: '1.0', owner_human: 'Self' },
    { id: 'ceo-agent', role: 'CEO-Agent', name: 'CEO-Agent', department: 'Executive Council', description: 'Strategic planning, daily reports, kill-switch oversight', allowed_tools: JSON.stringify(['report-generator', 'dashboard', 'alert-system']), budget_limit: 50000, budget_spent: 12000, risk_ceiling: 'high', autonomy_level: 'supervised', human_approval_rules: JSON.stringify(['Budget > EUR 5k', 'Contract approvals']), kpis: JSON.stringify([{ name: 'Report Accuracy', value: '98%', target: '95%' }]), status: 'active', version: '2.1', owner_human: 'Founder' },
    { id: 'coo-agent', role: 'COO-Agent', name: 'COO-Agent', department: 'Operations', description: 'Operations management, process optimization', allowed_tools: JSON.stringify(['workflow-engine', 'task-manager', 'slack']), budget_limit: 25000, budget_spent: 8900, risk_ceiling: 'medium', autonomy_level: 'full', human_approval_rules: JSON.stringify(['Process changes']), kpis: JSON.stringify([{ name: 'Efficiency', value: '87%', target: '85%' }]), status: 'active', version: '1.8', owner_human: 'Founder' },
    { id: 'cto-agent', role: 'CTO-Agent', name: 'CTO-Agent', department: 'Engineering', description: 'Technical architecture, code review, deployments', allowed_tools: JSON.stringify(['github', 'deployment', 'ci-cd', 'code-review']), budget_limit: 30000, budget_spent: 15200, risk_ceiling: 'high', autonomy_level: 'supervised', human_approval_rules: JSON.stringify(['Production deployments', 'Architecture changes']), kpis: JSON.stringify([{ name: 'Deploy Success', value: '96%', target: '95%' }]), status: 'active', version: '3.2', owner_human: 'Founder' },
    { id: 'cfo-agent', role: 'CFO-Agent', name: 'CFO-Agent', department: 'Finance', description: 'Financial planning, invoicing, budget control', allowed_tools: JSON.stringify(['accounting', 'invoicing', 'budget-tool', 'reporting']), budget_limit: 20000, budget_spent: 8450, risk_ceiling: 'critical', autonomy_level: 'approval-required', human_approval_rules: JSON.stringify(['All payments > EUR 500', 'Budget allocations']), kpis: JSON.stringify([{ name: 'Budget Accuracy', value: '99%', target: '98%' }]), status: 'active', version: '2.0', owner_human: 'Founder' },
    { id: 'clo-agent', role: 'CLO-Agent', name: 'CLO-Agent', department: 'Legal/Compliance', description: 'Legal review, contracts, compliance checks', allowed_tools: JSON.stringify(['legal-db', 'contract-review', 'gdpr-tool']), budget_limit: 15000, budget_spent: 3200, risk_ceiling: 'high', autonomy_level: 'approval-required', human_approval_rules: JSON.stringify(['All contracts', 'Legal opinions']), kpis: JSON.stringify([{ name: 'Compliance Rate', value: '100%', target: '100%' }]), status: 'active', version: '1.5', owner_human: 'Founder' },
    { id: 'ciso-agent', role: 'CISO-Agent', name: 'CISO-Agent', department: 'Security', description: 'Security operations, threat detection, audits', allowed_tools: JSON.stringify(['security-scanner', 'siem', 'pen-test']), budget_limit: 20000, budget_spent: 6700, risk_ceiling: 'critical', autonomy_level: 'approval-required', human_approval_rules: JSON.stringify(['Security policy changes']), kpis: JSON.stringify([{ name: 'Threat Detection', value: '99.5%', target: '99%' }]), status: 'active', version: '2.3', owner_human: 'Founder' },
    { id: 'cpo-agent', role: 'CPO-Agent', name: 'CPO-Agent', department: 'Product', description: 'Product strategy, roadmap, feature prioritization', allowed_tools: JSON.stringify(['product-board', 'analytics', 'user-research']), budget_limit: 20000, budget_spent: 11400, risk_ceiling: 'medium', autonomy_level: 'supervised', human_approval_rules: JSON.stringify(['Product launches']), kpis: JSON.stringify([{ name: 'Feature Delivery', value: '92%', target: '90%' }]), status: 'active', version: '1.9', owner_human: 'Founder' },
    { id: 'chro-agent', role: 'CHRO-Agent', name: 'CHRO-Agent', department: 'Human Workforce', description: 'Workforce management, onboarding, freelancer coordination', allowed_tools: JSON.stringify(['hr-platform', 'onboarding', 'evaluation']), budget_limit: 10000, budget_spent: 5400, risk_ceiling: 'medium', autonomy_level: 'supervised', human_approval_rules: JSON.stringify(['Hiring decisions', 'Contract terminations']), kpis: JSON.stringify([{ name: 'Onboard Time', value: '2.3d', target: '3d' }]), status: 'active', version: '1.4', owner_human: 'Founder' },
    { id: 'brand-agent', role: 'Brand-Agent', name: 'Brand-Agent', department: 'Marketing', description: 'Brand management, brand consistency checks', allowed_tools: JSON.stringify(['brand-toolkit', 'design-review', 'social-media']), budget_limit: 8000, budget_spent: 2100, risk_ceiling: 'low', autonomy_level: 'full', human_approval_rules: JSON.stringify(['Brand changes']), kpis: JSON.stringify([{ name: 'Brand Consistency', value: '97%', target: '95%' }]), status: 'active', version: '1.2', owner_human: 'Founder' },
    { id: 'sales-agent', role: 'Sales-Agent', name: 'Sales-Agent', department: 'Sales', description: 'Lead qualification, CRM management, outreach', allowed_tools: JSON.stringify(['crm', 'email-automation', 'calendar']), budget_limit: 10000, budget_spent: 7200, risk_ceiling: 'low', autonomy_level: 'full', human_approval_rules: JSON.stringify(['Discount > 10%']), kpis: JSON.stringify([{ name: 'Lead Conv.', value: '14%', target: '12%' }]), status: 'active', version: '2.0', owner_human: 'Founder' },
    { id: 'procurement-agent', role: 'Procurement-Agent', name: 'Procurement-Agent', department: 'Finance', description: 'Procurement management, vendor evaluation', allowed_tools: JSON.stringify(['procurement-db', 'vendor-eval', 'contract-mgmt']), budget_limit: 15000, budget_spent: 3800, risk_ceiling: 'medium', autonomy_level: 'approval-required', human_approval_rules: JSON.stringify(['Purchases > EUR 1000']), kpis: JSON.stringify([{ name: 'Cost Savings', value: '18%', target: '15%' }]), status: 'active', version: '1.6', owner_human: 'Founder' },
    { id: 'qa-agent', role: 'QA-Agent', name: 'QA-Agent', department: 'QA', description: 'Quality assurance, test automation, QA reviews', allowed_tools: JSON.stringify(['test-suite', 'bug-tracker', 'ci-cd']), budget_limit: 12000, budget_spent: 4500, risk_ceiling: 'medium', autonomy_level: 'supervised', human_approval_rules: JSON.stringify(['Production releases']), kpis: JSON.stringify([{ name: 'Test Coverage', value: '78%', target: '80%' }]), status: 'active', version: '2.4', owner_human: 'Founder' },
    { id: 'cs-agent', role: 'Customer-Support-Agent', name: 'Customer-Support-Agent', department: 'Support', description: 'Customer support, ticket handling, satisfaction', allowed_tools: JSON.stringify(['ticketing', 'knowledge-base', 'chat']), budget_limit: 8000, budget_spent: 3100, risk_ceiling: 'low', autonomy_level: 'full', human_approval_rules: JSON.stringify(['Refunds > EUR 100']), kpis: JSON.stringify([{ name: 'CSAT', value: '4.6', target: '4.5' }]), status: 'active', version: '1.7', owner_human: 'Founder' },
    { id: 'field-ops-agent', role: 'Field-Operations-Agent', name: 'Field-Operations-Agent', department: 'Operations', description: 'Field operations, logistics, service delivery', allowed_tools: JSON.stringify(['logistics', 'scheduling', 'gps']), budget_limit: 10000, budget_spent: 5200, risk_ceiling: 'medium', autonomy_level: 'supervised', human_approval_rules: JSON.stringify(['Emergency dispatches']), kpis: JSON.stringify([{ name: 'On-Time Rate', value: '94%', target: '92%' }]), status: 'active', version: '1.3', owner_human: 'Founder' },
    { id: 'safety-agent', role: 'Safety-Agent', name: 'Safety-Agent', department: 'Security', description: 'Safety monitoring, incident response, veto power', allowed_tools: JSON.stringify(['incident-tracker', 'monitoring', 'alert-system']), budget_limit: 10000, budget_spent: 1800, risk_ceiling: 'critical', autonomy_level: 'approval-required', human_approval_rules: JSON.stringify(['Safety overrides']), kpis: JSON.stringify([{ name: 'Incidents', value: '0', target: '0' }]), status: 'active', version: '1.1', owner_human: 'Founder' },
    { id: 'audit-agent', role: 'Audit-Agent', name: 'Audit-Agent', department: 'Audit', description: 'Internal audit, compliance checks, reporting', allowed_tools: JSON.stringify(['audit-tool', 'log-analyzer', 'reporting']), budget_limit: 8000, budget_spent: 2900, risk_ceiling: 'high', autonomy_level: 'approval-required', human_approval_rules: JSON.stringify(['Audit findings']), kpis: JSON.stringify([{ name: 'Issues Found', value: '3', target: '<5' }]), status: 'active', version: '1.8', owner_human: 'Founder' },
    { id: 'knowledge-agent', role: 'Knowledge-Agent', name: 'Knowledge-Agent', department: 'Internal Tools', description: 'Knowledge base, documentation, training materials', allowed_tools: JSON.stringify(['wiki', 'doc-generator', 'search']), budget_limit: 5000, budget_spent: 980, risk_ceiling: 'low', autonomy_level: 'full', human_approval_rules: JSON.stringify([]), kpis: JSON.stringify([{ name: 'Doc Coverage', value: '85%', target: '80%' }]), status: 'active', version: '1.0', owner_human: 'Founder' },
    { id: 'pricing-agent', role: 'Pricing-Agent', name: 'Pricing-Agent', department: 'Sales', description: 'Dynamic pricing, competitor analysis, price optimization', allowed_tools: JSON.stringify(['pricing-engine', 'market-data', 'analytics']), budget_limit: 8000, budget_spent: 2400, risk_ceiling: 'medium', autonomy_level: 'supervised', human_approval_rules: JSON.stringify(['Price changes > 5%']), kpis: JSON.stringify([{ name: 'Margin', value: '42%', target: '40%' }]), status: 'active', version: '1.4', owner_human: 'Founder' },
    { id: 'doc-agent', role: 'Doc-Agent', name: 'Doc-Agent', department: 'Internal Tools', description: 'Documentation automation, API docs, user guides', allowed_tools: JSON.stringify(['doc-generator', 'api-tool', 'markdown']), budget_limit: 5000, budget_spent: 760, risk_ceiling: 'low', autonomy_level: 'full', human_approval_rules: JSON.stringify([]), kpis: JSON.stringify([{ name: 'Gen Speed', value: '45min', target: '60min' }]), status: 'active', version: '1.2', owner_human: 'Founder' },
    { id: 'marketing-agent', role: 'Marketing-Agent', name: 'Marketing-Agent', department: 'Marketing', description: 'Marketing campaigns, content creation, SEO', allowed_tools: JSON.stringify(['cms', 'seo-tool', 'analytics', 'social-media']), budget_limit: 12000, budget_spent: 5600, risk_ceiling: 'low', autonomy_level: 'full', human_approval_rules: JSON.stringify(['Campaign spend > EUR 500']), kpis: JSON.stringify([{ name: 'ROAS', value: '3.8x', target: '3.0x' }]), status: 'active', version: '2.1', owner_human: 'Founder' },
    { id: 'analytics-agent', role: 'Analytics-Agent', name: 'Analytics-Agent', department: 'Internal Tools', description: 'Data analytics, reporting, business intelligence', allowed_tools: JSON.stringify(['analytics', 'sql', 'dashboard', 'etl']), budget_limit: 8000, budget_spent: 2100, risk_ceiling: 'low', autonomy_level: 'full', human_approval_rules: JSON.stringify([]), kpis: JSON.stringify([{ name: 'Report Gen', value: '12/h', target: '10/h' }]), status: 'active', version: '1.6', owner_human: 'Founder' },
  ];

  for (const a of agentsData) {
    insertAgent.run(a.id, a.role, a.name, a.department, a.description, a.allowed_tools, a.budget_limit, a.budget_spent, a.risk_ceiling, a.autonomy_level, a.human_approval_rules, a.kpis, a.status, a.version, a.owner_human);
  }

  // ─── 3. Departments (14) ───
  console.log('[SEED] Creating 14 departments...');
  const insertDept = db.prepare(`
    INSERT INTO departments (id, name, description, status, lead_agent, agents, current_tasks, kpi_summary)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const depts = [
    { id: 'exec', name: 'Executive Council', description: 'Strategic leadership and oversight', status: 'active', lead_agent: 'ceo-agent', agents: JSON.stringify(['human-ceo', 'ceo-agent']), current_tasks: JSON.stringify([{ id: 't1', title: 'Weekly strategy review', status: 'in-progress', priority: 'high' }, { id: 't2', title: 'Budget allocation Q2', status: 'pending', priority: 'high' }, { id: 't3', title: 'Risk assessment', status: 'in-progress', priority: 'medium' }]), kpi_summary: JSON.stringify([{ metric: 'Decisions', value: '48', trend: 'up' }, { metric: 'Efficiency', value: '92%', trend: 'stable' }]) },
    { id: 'sales', name: 'Sales', description: 'Revenue generation and customer acquisition', status: 'active', lead_agent: 'sales-agent', agents: JSON.stringify(['sales-agent', 'pricing-agent']), current_tasks: JSON.stringify([{ id: 't4', title: 'Lead qualification pipeline', status: 'in-progress', priority: 'high' }, { id: 't5', title: 'Proposal drafting', status: 'in-progress', priority: 'medium' }, { id: 't6', title: 'CRM cleanup', status: 'pending', priority: 'low' }, { id: 't7', title: 'Pricing analysis', status: 'in-progress', priority: 'medium' }, { id: 't8', title: 'Follow-up outreach', status: 'pending', priority: 'medium' }]), kpi_summary: JSON.stringify([{ metric: 'Leads', value: '24', trend: 'up' }, { metric: 'Conv.', value: '14%', trend: 'up' }]) },
    { id: 'product', name: 'Product', description: 'Product management and roadmap', status: 'active', lead_agent: 'cpo-agent', agents: JSON.stringify(['cpo-agent']), current_tasks: JSON.stringify([{ id: 't9', title: 'Sprint planning', status: 'in-progress', priority: 'high' }, { id: 't10', title: 'Feature prioritization', status: 'pending', priority: 'medium' }]), kpi_summary: JSON.stringify([{ metric: 'Features', value: '8', trend: 'stable' }, { metric: 'Bugs', value: '3', trend: 'down' }]) },
    { id: 'engineering', name: 'Engineering', description: 'Software development and architecture', status: 'active', lead_agent: 'cto-agent', agents: JSON.stringify(['cto-agent']), current_tasks: JSON.stringify([{ id: 't11', title: 'Studio Cedar MVP build', status: 'in-progress', priority: 'high' }, { id: 't12', title: 'Code review backlog', status: 'in-progress', priority: 'high' }, { id: 't13', title: 'Infrastructure setup', status: 'in-progress', priority: 'medium' }, { id: 't14', title: 'Tech debt reduction', status: 'pending', priority: 'low' }, { id: 't15', title: 'Agent registry v2', status: 'in-progress', priority: 'medium' }]), kpi_summary: JSON.stringify([{ metric: 'Velocity', value: '34', trend: 'up' }, { metric: 'Bugs', value: '5', trend: 'down' }]) },
    { id: 'qa', name: 'QA', description: 'Quality assurance and testing', status: 'active', lead_agent: 'qa-agent', agents: JSON.stringify(['qa-agent']), current_tasks: JSON.stringify([{ id: 't19', title: 'Studio Aurora QA', status: 'in-progress', priority: 'high' }, { id: 't20', title: 'Test automation', status: 'in-progress', priority: 'medium' }, { id: 't21', title: 'Regression testing', status: 'pending', priority: 'high' }, { id: 't22', title: 'Bug triage', status: 'in-progress', priority: 'medium' }]), kpi_summary: JSON.stringify([{ metric: 'Coverage', value: '78%', trend: 'stable' }, { metric: 'Bugs', value: '12', trend: 'up' }]) },
    { id: 'finance', name: 'Finance', description: 'Financial planning and accounting', status: 'active', lead_agent: 'cfo-agent', agents: JSON.stringify(['cfo-agent', 'procurement-agent']), current_tasks: JSON.stringify([{ id: 't23', title: 'Monthly report', status: 'in-progress', priority: 'high' }, { id: 't24', title: 'Invoice processing', status: 'pending', priority: 'medium' }, { id: 't25', title: 'Budget review', status: 'in-progress', priority: 'high' }, { id: 't26', title: 'Tax preparation', status: 'pending', priority: 'medium' }, { id: 't27', title: 'Cash flow projection', status: 'in-progress', priority: 'high' }]), kpi_summary: JSON.stringify([{ metric: 'Liquidity', value: '12.4k', trend: 'up' }, { metric: 'Burn', value: '3.2k', trend: 'stable' }]) },
    { id: 'legal', name: 'Legal/Compliance', description: 'Legal affairs and compliance', status: 'active', lead_agent: 'clo-agent', agents: JSON.stringify(['clo-agent']), current_tasks: JSON.stringify([{ id: 't29', title: 'GDPR audit', status: 'in-progress', priority: 'critical' }, { id: 't30', title: 'Contract review', status: 'in-progress', priority: 'high' }, { id: 't31', title: 'NDA processing', status: 'pending', priority: 'medium' }, { id: 't32', title: 'Compliance checklist', status: 'in-progress', priority: 'high' }]), kpi_summary: JSON.stringify([{ metric: 'Compliance', value: '94%', trend: 'down' }, { metric: 'Open', value: '7', trend: 'up' }]) },
    { id: 'security', name: 'Security', description: 'Security operations and monitoring', status: 'active', lead_agent: 'ciso-agent', agents: JSON.stringify(['ciso-agent', 'safety-agent']), current_tasks: JSON.stringify([{ id: 't36', title: 'API key rotation', status: 'in-progress', priority: 'high' }, { id: 't37', title: 'Vulnerability scan', status: 'in-progress', priority: 'medium' }, { id: 't38', title: 'Access review', status: 'pending', priority: 'medium' }]), kpi_summary: JSON.stringify([{ metric: 'Threats', value: '0', trend: 'stable' }, { metric: 'Score', value: '96', trend: 'up' }]) },
    { id: 'operations', name: 'Operations', description: 'Daily operations and logistics', status: 'active', lead_agent: 'coo-agent', agents: JSON.stringify(['coo-agent', 'field-ops-agent']), current_tasks: JSON.stringify([{ id: 't39', title: 'Process optimization', status: 'in-progress', priority: 'medium' }, { id: 't40', title: 'Logistics coordination', status: 'pending', priority: 'medium' }]), kpi_summary: JSON.stringify([{ metric: 'Efficiency', value: '87%', trend: 'up' }, { metric: 'Delays', value: '2', trend: 'down' }]) },
    { id: 'human-workforce', name: 'Human Workforce', description: 'Freelancer and vendor management', status: 'active', lead_agent: 'chro-agent', agents: JSON.stringify(['chro-agent']), current_tasks: JSON.stringify([{ id: 't41', title: 'UX designer onboarding', status: 'in-progress', priority: 'medium' }, { id: 't42', title: 'Vendor evaluation', status: 'pending', priority: 'medium' }, { id: 't43', title: 'Contractor review', status: 'in-progress', priority: 'low' }]), kpi_summary: JSON.stringify([{ metric: 'Experts', value: '12', trend: 'up' }, { metric: 'Sat.', value: '4.6', trend: 'stable' }]) },
    { id: 'marketing', name: 'Marketing', description: 'Marketing and brand management', status: 'active', lead_agent: 'marketing-agent', agents: JSON.stringify(['marketing-agent', 'brand-agent']), current_tasks: JSON.stringify([{ id: 't45', title: 'Landing page draft', status: 'in-progress', priority: 'high' }, { id: 't46', title: 'Website redesign', status: 'in-progress', priority: 'medium' }, { id: 't47', title: 'SEO audit', status: 'pending', priority: 'medium' }]), kpi_summary: JSON.stringify([{ metric: 'Traffic', value: '+23%', trend: 'up' }, { metric: 'Leads', value: '24', trend: 'up' }]) },
    { id: 'support', name: 'Support', description: 'Customer support and service', status: 'active', lead_agent: 'cs-agent', agents: JSON.stringify(['cs-agent']), current_tasks: JSON.stringify([{ id: 't48', title: 'Ticket queue', status: 'in-progress', priority: 'medium' }, { id: 't49', title: 'Knowledge base update', status: 'pending', priority: 'low' }, { id: 't50', title: 'Escalation review', status: 'in-progress', priority: 'medium' }]), kpi_summary: JSON.stringify([{ metric: 'CSAT', value: '4.6', trend: 'stable' }, { metric: 'Tickets', value: '8', trend: 'down' }]) },
    { id: 'audit', name: 'Audit', description: 'Internal auditing and governance', status: 'active', lead_agent: 'audit-agent', agents: JSON.stringify(['audit-agent']), current_tasks: JSON.stringify([{ id: 't53', title: 'Weekly compliance check', status: 'in-progress', priority: 'high' }, { id: 't54', title: 'Log review', status: 'pending', priority: 'medium' }]), kpi_summary: JSON.stringify([{ metric: 'Findings', value: '3', trend: 'up' }, { metric: 'Resolved', value: '7', trend: 'up' }]) },
    { id: 'internal-tools', name: 'Internal Tools', description: 'Internal tooling and automation', status: 'active', lead_agent: 'knowledge-agent', agents: JSON.stringify(['knowledge-agent', 'analytics-agent', 'doc-agent']), current_tasks: JSON.stringify([{ id: 't55', title: 'Doc generation', status: 'in-progress', priority: 'medium' }, { id: 't56', title: 'Dashboard updates', status: 'pending', priority: 'low' }, { id: 't57', title: 'ETL pipeline', status: 'in-progress', priority: 'medium' }]), kpi_summary: JSON.stringify([{ metric: 'Uptime', value: '99.8%', trend: 'stable' }, { metric: 'Usage', value: '234', trend: 'up' }]) },
  ];

  for (const d of depts) {
    insertDept.run(d.id, d.name, d.description, d.status, d.lead_agent, d.agents, d.current_tasks, d.kpi_summary);
  }

  // ─── 4. Business Units (8) ───
  console.log('[SEED] Creating 8 business units...');
  const insertUnit = db.prepare(`
    INSERT INTO business_units (id, code, name, purpose, status, phase, products, revenue_model, required_agents, required_humans, risks, kpis, dependencies)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const units = [
    { id: 'unit-a', code: 'A', name: 'AI Software Studio', purpose: 'AI-powered software development and SaaS products', status: 'active', phase: 3, products: JSON.stringify(['Studio Cedar MVP']), revenue_model: 'SaaS subscriptions + project fees', required_agents: JSON.stringify(['CTO-Agent', 'QA-Agent', 'CPO-Agent']), required_humans: JSON.stringify(['UX Designer', 'Tech Lead']), risks: JSON.stringify(['Technical complexity', 'Market timing']), kpis: JSON.stringify([{ name: 'MRR', value: 'EUR 0', target: 'EUR 5k' }, { name: 'Users', value: '0', target: '50' }]), dependencies: JSON.stringify(['Unit H']) },
    { id: 'unit-b', code: 'B', name: 'Digital Product Factory', purpose: 'Rapid digital product development and MVPs', status: 'parked', phase: 1, products: JSON.stringify(['Studio Aurora Landingpage']), revenue_model: 'Project-based + recurring', required_agents: JSON.stringify(['CTO-Agent', 'Marketing-Agent']), required_humans: JSON.stringify(['Product Designer']), risks: JSON.stringify(['Resource constraints']), kpis: JSON.stringify([{ name: 'Projects', value: '1', target: '3' }, { name: 'Revenue', value: 'EUR 0', target: 'EUR 10k' }]), dependencies: JSON.stringify(['Unit A']) },
    { id: 'unit-c', code: 'C', name: 'Physical Services Marketplace', purpose: 'AI-mediated local services platform', status: 'parked', phase: 1, products: JSON.stringify(['Studio Bridge Prototype']), revenue_model: 'Transaction fees + subscriptions', required_agents: JSON.stringify(['CPO-Agent', 'Field-Operations-Agent']), required_humans: JSON.stringify(['Operations Manager']), risks: JSON.stringify(['Market fit', 'Logistics complexity']), kpis: JSON.stringify([{ name: 'Providers', value: '0', target: '20' }, { name: 'Transactions', value: '0', target: '100' }]), dependencies: JSON.stringify(['Unit A', 'Unit B']) },
    { id: 'unit-d', code: 'D', name: 'Autonomous Marketing Agency', purpose: 'AI-driven marketing and growth services', status: 'parked', phase: 1, products: JSON.stringify(['Website Redesign']), revenue_model: 'Retainer + performance', required_agents: JSON.stringify(['Marketing-Agent', 'Brand-Agent', 'Sales-Agent']), required_humans: JSON.stringify(['Creative Director']), risks: JSON.stringify(['Client acquisition']), kpis: JSON.stringify([{ name: 'Clients', value: '0', target: '5' }, { name: 'ROAS', value: '0', target: '3.0x' }]), dependencies: JSON.stringify(['Unit A']) },
    { id: 'unit-e', code: 'E', name: 'Premium Engineering Lab', purpose: 'High-end engineering and architecture services', status: 'parked', phase: 0, products: JSON.stringify([]), revenue_model: 'Hourly consulting + project fees', required_agents: JSON.stringify(['CTO-Agent', 'Analytics-Agent']), required_humans: JSON.stringify(['Senior Architect']), risks: JSON.stringify(['Talent availability']), kpis: JSON.stringify([{ name: 'Projects', value: '0', target: '2' }, { name: 'Rate', value: 'EUR 0', target: 'EUR 150/h' }]), dependencies: JSON.stringify(['Unit A', 'Unit H']) },
    { id: 'unit-f', code: 'F', name: 'Game/Media/Content Studio', purpose: 'Interactive media and content creation', status: 'parked', phase: 0, products: JSON.stringify([]), revenue_model: 'Licensing + direct sales', required_agents: JSON.stringify(['CPO-Agent', 'Brand-Agent']), required_humans: JSON.stringify(['Game Designer', 'Artist']), risks: JSON.stringify(['Long dev cycles']), kpis: JSON.stringify([{ name: 'Projects', value: '0', target: '1' }, { name: 'Revenue', value: 'EUR 0', target: 'EUR 20k' }]), dependencies: JSON.stringify(['Unit A']) },
    { id: 'unit-g', code: 'G', name: 'Local Operations Network', purpose: 'On-the-ground operations and logistics', status: 'parked', phase: 0, products: JSON.stringify([]), revenue_model: 'Service fees + subscriptions', required_agents: JSON.stringify(['Field-Operations-Agent', 'COO-Agent']), required_humans: JSON.stringify(['Regional Manager']), risks: JSON.stringify(['Operational complexity']), kpis: JSON.stringify([{ name: 'Regions', value: '0', target: '3' }, { name: 'Providers', value: '0', target: '50' }]), dependencies: JSON.stringify(['Unit C']) },
    { id: 'unit-h', code: 'H', name: 'Internal Tools & Automation', purpose: 'Internal tooling, automation, and infrastructure', status: 'internal-active', phase: 2, products: JSON.stringify(['Agent Registry v2']), revenue_model: 'Internal cost savings', required_agents: JSON.stringify(['CTO-Agent', 'Analytics-Agent', 'Knowledge-Agent', 'Doc-Agent']), required_humans: JSON.stringify(['DevOps Engineer']), risks: JSON.stringify(['Technical debt']), kpis: JSON.stringify([{ name: 'Automation', value: '73%', target: '80%' }, { name: 'Savings', value: 'EUR 2k', target: 'EUR 5k' }]), dependencies: JSON.stringify([]) },
  ];

  for (const u of units) {
    insertUnit.run(u.id, u.code, u.name, u.purpose, u.status, u.phase, u.products, u.revenue_model, u.required_agents, u.required_humans, u.risks, u.kpis, u.dependencies);
  }

  // ─── 5. Product Studios (3) ───
  console.log('[SEED] Creating 3 product studios...');
  const insertStudio = db.prepare(`
    INSERT INTO product_studios (id, name, business_unit, status, budget_total, budget_spent, budget_remaining, workflow_step, qa_status, deployment_status, customer, start_date, target_date, completion)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertStudio.run('studio-cedar', 'Studio Cedar', 'Unit A - AI Software Studio', 'building', 25000, 15000, 10000, 'Build Phase', 'pending', 'not-started', 'Internal', '2025-01-15', '2025-04-15', 60);
  insertStudio.run('studio-aurora', 'Studio Aurora', 'Unit B - Digital Product Factory', 'qa', 8000, 6400, 1600, 'QA Review', 'in-progress', 'staging', 'External', '2025-02-01', '2025-03-20', 80);
  insertStudio.run('studio-bridge', 'Studio Bridge', 'Unit C - Physical Services Marketplace', 'deploying', 15000, 14250, 750, 'Deployment', 'passed', 'ready', 'Pilot Partner', '2025-01-01', '2025-03-15', 95);

  // ─── 6. Approvals (7) ───
  console.log('[SEED] Creating 7 approvals...');
  const insertApproval = db.prepare(`
    INSERT INTO approvals (id, type, title, description, requester, risk_level, amount, recommendation, status, red_line)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertApproval.run('app-001', 'payment', 'Hosting-Rechnung EUR 240', 'Monthly hosting invoice from Hetzner for production servers', 'Procurement-Agent', 'high', 240, 'Freigeben', 'pending', 1);
  insertApproval.run('app-002', 'contract', 'Freelancer-NDA Studio Cedar', 'NDA contract for UX designer working on Studio Cedar MVP', 'CHRO-Agent', 'high', null, 'Freigeben', 'pending', 1);
  insertApproval.run('app-003', 'deployment', 'Studio Bridge -> Produktion', 'Deploy Studio Bridge prototype to production environment', 'CTO-Agent', 'critical', null, 'Prufen', 'pending', 1);
  insertApproval.run('app-004', 'invoice', 'Kundenrechnung #1024', 'Invoice to pilot partner for Studio Bridge milestone', 'CFO-Agent', 'medium', 5000, 'Freigeben', 'pending', 1);
  insertApproval.run('app-005', 'freelancer', 'UX-Designer Website', 'Contract engagement for website redesign project', 'CPO-Agent', 'high', 3500, 'Prufen', 'pending', 1);
  insertApproval.run('app-006', 'purchase', 'Figma Pro License (12 Monate)', 'Annual Figma Pro license for design team', 'Procurement-Agent', 'low', 144, 'Freigeben', 'pending', 0);
  insertApproval.run('app-007', 'communication', 'Kunden-Email Versand > 100 Empfanger', 'Bulk email to prospect list (127 recipients)', 'Marketing-Agent', 'medium', null, 'Prufen', 'pending', 0);

  // ─── 7. Audit Log (22 entries, append-only) ───
  console.log('[SEED] Creating 22 audit log entries...');
  const insertAudit = db.prepare(`
    INSERT INTO audit_log (id, timestamp, agent, action, tool, input, output, risk_score, project, approved_by, hash, previous_hash)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const auditEntries = [
    { id: 'log-001', timestamp: '2025-03-10T14:32:00Z', agent: 'CEO-Agent', action: 'Tagesbericht generiert', tool: 'report-generator', input: 'Daily data', output: 'Report OK', risk_score: 5, project: null, approved_by: 'Founder' },
    { id: 'log-002', timestamp: '2025-03-10T14:28:00Z', agent: 'CFO-Agent', action: 'Budget-Report erstellt', tool: 'budget-tool', input: 'Q1 data', output: 'EUR 12.4k', risk_score: 10, project: 'Studio Cedar', approved_by: 'Founder' },
    { id: 'log-003', timestamp: '2025-03-10T14:15:00Z', agent: 'QA-Agent', action: 'Test fehlgeschlagen', tool: 'test-suite', input: 'Regression', output: '3 failures', risk_score: 45, project: 'Studio Aurora', approved_by: null },
    { id: 'log-004', timestamp: '2025-03-10T14:10:00Z', agent: 'CTO-Agent', action: 'Deployment gestartet', tool: 'deployment', input: 'Studio Bridge', output: 'Staging OK', risk_score: 60, project: 'Studio Bridge', approved_by: 'Founder' },
    { id: 'log-005', timestamp: '2025-03-10T14:05:00Z', agent: 'Sales-Agent', action: 'Lead qualifiziert', tool: 'crm', input: 'Inbound lead', output: 'Qualified', risk_score: 5, project: null, approved_by: null },
    { id: 'log-006', timestamp: '2025-03-10T13:48:00Z', agent: 'Marketing-Agent', action: 'Landingpage-Entwurf', tool: 'cms', input: 'Brief', output: 'Draft v1', risk_score: 15, project: 'Website', approved_by: null },
    { id: 'log-007', timestamp: '2025-03-10T13:30:00Z', agent: 'Audit-Agent', action: 'Compliance-Prufung', tool: 'audit-tool', input: 'Studio Cedar', output: 'GDPR overdue', risk_score: 85, project: 'Studio Cedar', approved_by: 'Founder' },
    { id: 'log-008', timestamp: '2025-03-10T13:15:00Z', agent: 'CFO-Agent', action: 'Rechnung #1024 freigegeben', tool: 'invoicing', input: 'Invoice', output: 'Approved', risk_score: 20, project: null, approved_by: 'Founder' },
    { id: 'log-009', timestamp: '2025-03-10T13:00:00Z', agent: 'CEO-Agent', action: 'Wochenbericht generiert', tool: 'report-generator', input: 'Weekly data', output: 'Report OK', risk_score: 5, project: null, approved_by: null },
    { id: 'log-010', timestamp: '2025-03-10T12:45:00Z', agent: 'CISO-Agent', action: 'API-Key Rotation', tool: 'security-scanner', input: 'Rotate keys', output: 'Rotated', risk_score: 40, project: null, approved_by: 'Founder' },
    { id: 'log-011', timestamp: '2025-03-10T12:30:00Z', agent: 'CLO-Agent', action: 'Vertrag gepruft', tool: 'contract-review', input: 'NDA v3', output: 'Approved', risk_score: 25, project: null, approved_by: 'Founder' },
    { id: 'log-012', timestamp: '2025-03-10T12:15:00Z', agent: 'Procurement-Agent', action: 'Einkauf beantragt', tool: 'procurement-db', input: 'Figma license', output: 'Pending', risk_score: 10, project: null, approved_by: null },
    { id: 'log-013', timestamp: '2025-03-10T12:00:00Z', agent: 'Safety-Agent', action: 'Sicherheitsscan abgeschlossen', tool: 'monitoring', input: 'Full scan', output: 'Clean', risk_score: 15, project: null, approved_by: null },
    { id: 'log-014', timestamp: '2025-03-10T11:45:00Z', agent: 'Analytics-Agent', action: 'Dashboard aktualisiert', tool: 'dashboard', input: 'Metrics', output: 'Updated', risk_score: 5, project: null, approved_by: null },
    { id: 'log-015', timestamp: '2025-03-10T11:30:00Z', agent: 'COO-Agent', action: 'Workflow optimiert', tool: 'workflow-engine', input: 'Sales pipeline', output: '+12% eff.', risk_score: 20, project: null, approved_by: null },
    { id: 'log-016', timestamp: '2025-03-10T11:15:00Z', agent: 'CHRO-Agent', action: 'Freelancer eingestellt', tool: 'onboarding', input: 'UX Designer', output: 'Onboarding', risk_score: 30, project: null, approved_by: 'Founder' },
    { id: 'log-017', timestamp: '2025-03-10T11:00:00Z', agent: 'Brand-Agent', action: 'Brand-Check ausgefuhrt', tool: 'brand-toolkit', input: 'Landing page', output: '96% match', risk_score: 10, project: null, approved_by: null },
    { id: 'log-018', timestamp: '2025-03-10T10:45:00Z', agent: 'Pricing-Agent', action: 'Preisanpassung', tool: 'pricing-engine', input: 'Market data', output: '+3%', risk_score: 35, project: null, approved_by: null },
    { id: 'log-019', timestamp: '2025-03-10T10:30:00Z', agent: 'Doc-Agent', action: 'Doku generiert', tool: 'doc-generator', input: 'API spec', output: 'Doc OK', risk_score: 5, project: null, approved_by: null },
    { id: 'log-020', timestamp: '2025-03-10T10:15:00Z', agent: 'Knowledge-Agent', action: 'Wissensbasis aktualisiert', tool: 'wiki', input: 'New FAQ', output: 'Updated', risk_score: 5, project: null, approved_by: null },
    { id: 'log-021', timestamp: '2025-03-10T10:00:00Z', agent: 'CS-Agent', action: 'Ticket gelost', tool: 'ticketing', input: 'T-1023', output: 'Resolved', risk_score: 10, project: null, approved_by: null },
    { id: 'log-022', timestamp: '2025-03-10T09:45:00Z', agent: 'Field-Ops-Agent', action: 'Einsatz koordiniert', tool: 'logistics', input: 'Site B', output: 'Dispatched', risk_score: 20, project: null, approved_by: null },
  ];

  let prevHash: string | null = null;
  for (const entry of auditEntries) {
    const hash = generateAuditHash({ ...entry, previous_hash: prevHash });
    insertAudit.run(entry.id, entry.timestamp, entry.agent, entry.action, entry.tool, entry.input, entry.output, entry.risk_score, entry.project, entry.approved_by, hash, prevHash);
    prevHash = hash;
  }

  // ─── 8. Risks (32) ───
  console.log('[SEED] Creating 32 risks...');
  const insertRisk = db.prepare(`
    INSERT INTO risks (name, category, cause, impact, early_warning, mitigation, owner, probability, severity, score, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const risks = [
    { name: 'Technical debt accumulation', category: 'technical', cause: 'Rapid development without refactoring', impact: 'Slowed development, increased bugs', earlyWarning: 'Code complexity metrics rising', mitigation: '20% time for refactoring', owner: 'CTO-Agent', probability: 4, severity: 3, status: 'active' },
    { name: 'GDPR non-compliance', category: 'legal', cause: 'Inadequate data protection measures', impact: 'Fines up to 4% revenue', earlyWarning: 'Audit findings increasing', mitigation: 'Hire DPO, implement privacy by design', owner: 'CLO-Agent', probability: 3, severity: 5, status: 'active' },
    { name: 'Cash flow shortage', category: 'financial', cause: 'High burn rate, delayed revenue', impact: 'Inability to pay vendors/freelancers', earlyWarning: 'Liquidity below EUR 15k', mitigation: 'Reduce costs, accelerate invoicing', owner: 'CFO-Agent', probability: 3, severity: 4, status: 'active' },
    { name: 'Reputational damage from AI errors', category: 'reputational', cause: 'Autonomous agents making poor decisions', impact: 'Client churn, negative PR', earlyWarning: 'Customer satisfaction declining', mitigation: 'Human approval gates, monitoring', owner: 'CEO-Agent', probability: 3, severity: 4, status: 'monitoring' },
    { name: 'API security breach', category: 'security', cause: 'Weak authentication, exposed keys', impact: 'Data breach, service disruption', earlyWarning: 'Unusual API traffic patterns', mitigation: 'Key rotation, rate limiting, WAF', owner: 'CISO-Agent', probability: 2, severity: 5, status: 'active' },
    { name: 'Key freelancer unavailability', category: 'human', cause: 'Freelancer takes other work or sick', impact: 'Project delays', earlyWarning: 'Slowed response times', mitigation: 'Multiple freelancers per skill', owner: 'CHRO-Agent', probability: 4, severity: 3, status: 'monitoring' },
    { name: 'Vendor dependency', category: 'operational', cause: 'Single vendor for critical service', impact: 'Service disruption if vendor fails', earlyWarning: 'Vendor SLA breaches', mitigation: 'Multi-vendor strategy', owner: 'Procurement-Agent', probability: 3, severity: 3, status: 'monitoring' },
    { name: 'Model hallucination in production', category: 'technical', cause: 'LLM generating incorrect outputs', impact: 'Wrong decisions, client impact', earlyWarning: 'Accuracy metrics dropping', mitigation: 'Validation layers, human review', owner: 'CTO-Agent', probability: 4, severity: 4, status: 'active' },
    { name: 'Contract dispute', category: 'legal', cause: 'Ambiguous contract terms', impact: 'Legal costs, project delays', earlyWarning: 'Client complaints about terms', mitigation: 'Clear contracts, legal review', owner: 'CLO-Agent', probability: 3, severity: 3, status: 'monitoring' },
    { name: 'Over-budget project delivery', category: 'financial', cause: 'Scope creep, estimation errors', impact: 'Reduced margins, cash strain', earlyWarning: 'Burn rate exceeding forecast', mitigation: 'Fixed scopes, milestone payments', owner: 'CFO-Agent', probability: 4, severity: 3, status: 'active' },
    { name: 'Data loss', category: 'security', cause: 'Inadequate backups, human error', impact: 'Irretrievable work, compliance breach', earlyWarning: 'Backup failures', mitigation: '3-2-1 backup strategy', owner: 'CISO-Agent', probability: 2, severity: 5, status: 'mitigated' },
    { name: 'Agent version conflict', category: 'technical', cause: 'Different agent versions incompatible', impact: 'System errors, data corruption', earlyWarning: 'Integration test failures', mitigation: 'Version pinning, staging tests', owner: 'CTO-Agent', probability: 3, severity: 3, status: 'monitoring' },
    { name: 'Regulatory change', category: 'legal', cause: 'New AI regulation (EU AI Act)', impact: 'Compliance costs, feature restrictions', earlyWarning: 'Regulatory announcements', mitigation: 'Legal monitoring, adaptable design', owner: 'CLO-Agent', probability: 4, severity: 4, status: 'monitoring' },
    { name: 'Client payment delay', category: 'financial', cause: 'Client cash flow issues', impact: 'Revenue timing mismatch', earlyWarning: 'Payment patterns changing', mitigation: 'Upfront payments, penalties', owner: 'CFO-Agent', probability: 3, severity: 3, status: 'monitoring' },
    { name: 'Service downtime', category: 'operational', cause: 'Infrastructure failure', impact: 'SLA breaches, revenue loss', earlyWarning: 'Error rates increasing', mitigation: 'Redundancy, monitoring, runbooks', owner: 'COO-Agent', probability: 2, severity: 4, status: 'mitigated' },
    { name: 'Skill gap in workforce', category: 'human', cause: 'Required skills not available', impact: 'Quality issues, delays', earlyWarning: 'Training requests increasing', mitigation: 'Training budget, skill mapping', owner: 'CHRO-Agent', probability: 4, severity: 3, status: 'active' },
    { name: 'Intellectual property dispute', category: 'legal', cause: 'Using third-party code/assets', impact: 'Lawsuit, product halt', earlyWarning: 'IP audit findings', mitigation: 'Clean room development, licenses', owner: 'CLO-Agent', probability: 2, severity: 5, status: 'monitoring' },
    { name: 'Tool vendor price increase', category: 'financial', cause: 'Vendor changing pricing model', impact: 'Higher operating costs', earlyWarning: 'Vendor announcements', mitigation: 'Multi-tool strategy, negotiation', owner: 'Procurement-Agent', probability: 3, severity: 2, status: 'monitoring' },
    { name: 'Social media backlash', category: 'reputational', cause: 'AI-generated content controversy', impact: 'Brand damage, client churn', earlyWarning: 'Sentiment monitoring alerts', mitigation: 'Content review, response plan', owner: 'Brand-Agent', probability: 2, severity: 4, status: 'monitoring' },
    { name: 'Infrastructure scaling failure', category: 'technical', cause: 'Unexpected load patterns', impact: 'Service degradation', earlyWarning: 'Latency increasing', mitigation: 'Auto-scaling, load testing', owner: 'CTO-Agent', probability: 3, severity: 3, status: 'mitigated' },
    { name: 'Tax compliance error', category: 'legal', cause: 'Complex multi-jurisdiction tax', impact: 'Penalties, audits', earlyWarning: 'Filing discrepancies', mitigation: 'Tax advisor, automated filing', owner: 'CFO-Agent', probability: 3, severity: 4, status: 'monitoring' },
    { name: 'Insider threat', category: 'security', cause: 'Privileged access abuse', impact: 'Data theft, sabotage', earlyWarning: 'Unusual access patterns', mitigation: 'Least privilege, audit logging', owner: 'CISO-Agent', probability: 1, severity: 5, status: 'mitigated' },
    { name: 'Market competition', category: 'reputational', cause: 'Competitor with similar offering', impact: 'Price pressure, client loss', earlyWarning: 'Win rate declining', mitigation: 'Differentiation, speed to market', owner: 'CEO-Agent', probability: 4, severity: 3, status: 'monitoring' },
    { name: 'Onboarding bottleneck', category: 'human', cause: 'Complex onboarding process', impact: 'Delayed project starts', earlyWarning: 'Onboarding time increasing', mitigation: 'Streamlined process, templates', owner: 'CHRO-Agent', probability: 3, severity: 3, status: 'active' },
    { name: 'Backup system failure', category: 'operational', cause: 'Backup software/hardware failure', impact: 'No recovery capability', earlyWarning: 'Backup verification failures', mitigation: 'Regular restore tests', owner: 'COO-Agent', probability: 2, severity: 4, status: 'mitigated' },
    { name: 'API deprecation', category: 'technical', cause: 'Third-party API changes', impact: 'Integration breakage', earlyWarning: 'Deprecation notices', mitigation: 'Abstraction layer, monitoring', owner: 'CTO-Agent', probability: 3, severity: 3, status: 'monitoring' },
    { name: 'License compliance', category: 'legal', cause: 'Open source license violations', impact: 'Legal action, code rewrite', earlyWarning: 'License scan results', mitigation: 'License scanning, legal review', owner: 'CLO-Agent', probability: 2, severity: 4, status: 'monitoring' },
    { name: 'Currency fluctuation', category: 'financial', cause: 'EUR/USD exchange rate changes', impact: 'Cost variance', earlyWarning: 'FX rate alerts', mitigation: 'Hedging, EUR-denominated contracts', owner: 'CFO-Agent', probability: 3, severity: 2, status: 'monitoring' },
    { name: 'Brand inconsistency', category: 'reputational', cause: 'Multiple agents creating content', impact: 'Brand dilution', earlyWarning: 'Brand check scores dropping', mitigation: 'Brand guidelines, automated checks', owner: 'Brand-Agent', probability: 3, severity: 2, status: 'monitoring' },
    { name: 'Physical security incident', category: 'security', cause: 'Unauthorized access to premises', impact: 'Equipment theft, data exposure', earlyWarning: 'Access log anomalies', mitigation: 'Access controls, cameras', owner: 'CISO-Agent', probability: 1, severity: 3, status: 'mitigated' },
    { name: 'Communication breakdown', category: 'human', cause: 'Remote work coordination issues', impact: 'Project delays, errors', earlyWarning: 'Message response times', mitigation: 'Async protocols, standups', owner: 'COO-Agent', probability: 3, severity: 2, status: 'monitoring' },
    { name: 'Supply chain disruption', category: 'operational', cause: 'Vendor/supplier unavailable', impact: 'Project delays', earlyWarning: 'Delivery delays', mitigation: 'Multiple suppliers, buffer stock', owner: 'Procurement-Agent', probability: 2, severity: 3, status: 'monitoring' },
  ];

  for (const r of risks) {
    const score = r.probability * r.severity;
    insertRisk.run(r.name, r.category, r.cause, r.impact, r.earlyWarning, r.mitigation, r.owner, r.probability, r.severity, score, r.status);
  }

  // ─── 9. Workflows (18) ───
  console.log('[SEED] Creating 18 workflows...');
  const insertWorkflow = db.prepare(`
    INSERT INTO workflows (id, name, category, description, responsible_agents, inputs, outputs, risk_score, requires_approval, status, success_rate, avg_duration, steps)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const workflows = [
    { id: 'wf-001', name: 'Landingpage in 48h', category: 'Sales', description: 'Rapid landing page creation for leads', responsible_agents: JSON.stringify(['Sales-Agent', 'CLO-Agent', 'Marketing-Agent', 'QA-Agent', 'CTO-Agent']), inputs: JSON.stringify(['Lead data']), outputs: JSON.stringify(['Live landing page']), risk_score: 25, requires_approval: 1, status: 'active', success_rate: 94, avg_duration: '36h', steps: JSON.stringify([{ id: 's1', name: 'Lead Intake', description: 'Qualify lead and requirements', agent: 'Sales-Agent', status: 'completed', blockingGate: false, input: 'Lead data', output: 'Qualified brief' }, { id: 's2', name: 'Offer Creation', description: 'Create offer and proposal', agent: 'Sales-Agent', status: 'completed', blockingGate: false, input: 'Brief', output: 'Offer doc' }, { id: 's3', name: 'Contract Approval', description: 'Legal review and approval', agent: 'CLO-Agent', status: 'completed', blockingGate: true, input: 'Offer doc', output: 'Approved contract' }, { id: 's4', name: 'Landingpage Build', description: 'Build the landing page', agent: 'Marketing-Agent', status: 'in-progress', blockingGate: false, input: 'Contract', output: 'Landing page' }, { id: 's5', name: 'QA Review', description: 'Quality check', agent: 'QA-Agent', status: 'pending', blockingGate: true, input: 'Landing page', output: 'QA approval' }, { id: 's6', name: 'Deployment', description: 'Go live', agent: 'CTO-Agent', status: 'pending', blockingGate: true, input: 'QA approval', output: 'Live page' }]) },
    { id: 'wf-002', name: 'Lead Intake', category: 'Sales', description: 'Qualify and process incoming leads', responsible_agents: JSON.stringify(['Sales-Agent']), inputs: JSON.stringify(['Lead form']), outputs: JSON.stringify(['Assigned lead']), risk_score: 10, requires_approval: 0, status: 'active', success_rate: 98, avg_duration: '2h', steps: JSON.stringify([{ id: 's7', name: 'Receive Lead', description: 'Lead enters CRM', agent: 'Sales-Agent', status: 'completed', blockingGate: false, input: 'Lead form', output: 'Lead record' }, { id: 's8', name: 'Qualify', description: 'Assess fit and urgency', agent: 'Sales-Agent', status: 'completed', blockingGate: false, input: 'Lead record', output: 'Qualified lead' }, { id: 's9', name: 'Route', description: 'Route to appropriate handler', agent: 'Sales-Agent', status: 'in-progress', blockingGate: false, input: 'Qualified lead', output: 'Assigned lead' }]) },
    { id: 'wf-003', name: 'Offer Creation', category: 'Sales', description: 'Create and send offers to prospects', responsible_agents: JSON.stringify(['Sales-Agent', 'Pricing-Agent', 'CEO-Agent']), inputs: JSON.stringify(['Lead brief']), outputs: JSON.stringify(['Approved offer']), risk_score: 20, requires_approval: 1, status: 'active', success_rate: 92, avg_duration: '6h', steps: JSON.stringify([{ id: 's10', name: 'Gather Requirements', description: 'Collect project details', agent: 'Sales-Agent', status: 'completed', blockingGate: false, input: 'Lead brief', output: 'Requirements' }, { id: 's11', name: 'Pricing', description: 'Calculate pricing', agent: 'Pricing-Agent', status: 'completed', blockingGate: false, input: 'Requirements', output: 'Price quote' }, { id: 's12', name: 'Draft Offer', description: 'Create offer document', agent: 'Sales-Agent', status: 'in-progress', blockingGate: false, input: 'Price quote', output: 'Offer doc' }, { id: 's13', name: 'Review', description: 'Internal review', agent: 'CEO-Agent', status: 'pending', blockingGate: true, input: 'Offer doc', output: 'Approved offer' }]) },
    { id: 'wf-004', name: 'Contract Approval', category: 'Legal', description: 'Legal review and contract approval', responsible_agents: JSON.stringify(['CLO-Agent', 'CEO-Agent']), inputs: JSON.stringify(['Offer terms']), outputs: JSON.stringify(['Approved contract']), risk_score: 45, requires_approval: 1, status: 'active', success_rate: 88, avg_duration: '24h', steps: JSON.stringify([{ id: 's14', name: 'Draft Contract', description: 'Create contract from template', agent: 'CLO-Agent', status: 'completed', blockingGate: false, input: 'Offer terms', output: 'Draft contract' }, { id: 's15', name: 'Risk Check', description: 'Risk assessment', agent: 'CLO-Agent', status: 'completed', blockingGate: true, input: 'Draft contract', output: 'Risk report' }, { id: 's16', name: 'Approval', description: 'Founder approval', agent: 'CEO-Agent', status: 'pending', blockingGate: true, input: 'Risk report', output: 'Approved contract' }]) },
    { id: 'wf-005', name: 'Project Planning', category: 'Product', description: 'Plan new project execution', responsible_agents: JSON.stringify(['CPO-Agent', 'CTO-Agent', 'COO-Agent', 'CEO-Agent']), inputs: JSON.stringify(['Brief']), outputs: JSON.stringify(['Approved plan']), risk_score: 30, requires_approval: 1, status: 'active', success_rate: 90, avg_duration: '12h', steps: JSON.stringify([{ id: 's17', name: 'Requirements', description: 'Gather requirements', agent: 'CPO-Agent', status: 'completed', blockingGate: false, input: 'Brief', output: 'Requirements doc' }, { id: 's18', name: 'Estimation', description: 'Effort estimation', agent: 'CTO-Agent', status: 'completed', blockingGate: false, input: 'Requirements doc', output: 'Estimate' }, { id: 's19', name: 'Resource Plan', description: 'Allocate resources', agent: 'COO-Agent', status: 'in-progress', blockingGate: false, input: 'Estimate', output: 'Resource plan' }, { id: 's20', name: 'Approval', description: 'Founder sign-off', agent: 'CEO-Agent', status: 'pending', blockingGate: true, input: 'Resource plan', output: 'Approved plan' }]) },
    { id: 'wf-006', name: 'Staging Build', category: 'Engineering', description: 'Build and deploy to staging', responsible_agents: JSON.stringify(['CTO-Agent', 'QA-Agent']), inputs: JSON.stringify(['Feature branches']), outputs: JSON.stringify(['Staging deployment']), risk_score: 25, requires_approval: 0, status: 'active', success_rate: 96, avg_duration: '4h', steps: JSON.stringify([{ id: 's21', name: 'Code Merge', description: 'Merge feature branches', agent: 'CTO-Agent', status: 'completed', blockingGate: false, input: 'Feature branches', output: 'Merged code' }, { id: 's22', name: 'Build', description: 'CI/CD build', agent: 'CTO-Agent', status: 'completed', blockingGate: false, input: 'Merged code', output: 'Build artifact' }, { id: 's23', name: 'Deploy Staging', description: 'Deploy to staging env', agent: 'CTO-Agent', status: 'in-progress', blockingGate: false, input: 'Build artifact', output: 'Staging URL' }, { id: 's24', name: 'Smoke Test', description: 'Basic functionality test', agent: 'QA-Agent', status: 'pending', blockingGate: true, input: 'Staging URL', output: 'Smoke result' }]) },
    { id: 'wf-007', name: 'QA Review', category: 'QA', description: 'Full QA review process', responsible_agents: JSON.stringify(['QA-Agent']), inputs: JSON.stringify(['Requirements']), outputs: JSON.stringify(['QA sign-off']), risk_score: 35, requires_approval: 1, status: 'active', success_rate: 85, avg_duration: '24h', steps: JSON.stringify([{ id: 's25', name: 'Test Plan', description: 'Create test plan', agent: 'QA-Agent', status: 'completed', blockingGate: false, input: 'Requirements', output: 'Test plan' }, { id: 's26', name: 'Execute Tests', description: 'Run test suite', agent: 'QA-Agent', status: 'in-progress', blockingGate: false, input: 'Test plan', output: 'Test results' }, { id: 's27', name: 'Bug Review', description: 'Triage bugs', agent: 'QA-Agent', status: 'pending', blockingGate: true, input: 'Test results', output: 'Bug report' }, { id: 's28', name: 'Sign-off', description: 'QA approval', agent: 'QA-Agent', status: 'pending', blockingGate: true, input: 'Bug report', output: 'QA sign-off' }]) },
    { id: 'wf-008', name: 'Production Deployment Approval', category: 'Engineering', description: 'Approve production deployments', responsible_agents: JSON.stringify(['CTO-Agent', 'Safety-Agent', 'CEO-Agent']), inputs: JSON.stringify(['QA sign-off']), outputs: JSON.stringify(['Deployment approved']), risk_score: 60, requires_approval: 1, status: 'active', success_rate: 95, avg_duration: '2h', steps: JSON.stringify([{ id: 's29', name: 'Deploy Request', description: 'Request deployment', agent: 'CTO-Agent', status: 'completed', blockingGate: false, input: 'QA sign-off', output: 'Deploy request' }, { id: 's30', name: 'Safety Check', description: 'Safety agent veto check', agent: 'Safety-Agent', status: 'completed', blockingGate: true, input: 'Deploy request', output: 'Safety OK' }, { id: 's31', name: 'Founder Approval', description: 'Final approval', agent: 'CEO-Agent', status: 'pending', blockingGate: true, input: 'Safety OK', output: 'Deployment approved' }]) },
    { id: 'wf-009', name: 'Invoice Draft Approval', category: 'Finance', description: 'Approve outgoing invoices', responsible_agents: JSON.stringify(['CFO-Agent', 'CEO-Agent']), inputs: JSON.stringify(['Project data']), outputs: JSON.stringify(['Approved invoice']), risk_score: 30, requires_approval: 1, status: 'active', success_rate: 98, avg_duration: '4h', steps: JSON.stringify([{ id: 's32', name: 'Draft Invoice', description: 'Create invoice draft', agent: 'CFO-Agent', status: 'completed', blockingGate: false, input: 'Project data', output: 'Draft invoice' }, { id: 's33', name: 'Review', description: 'Accuracy check', agent: 'CFO-Agent', status: 'completed', blockingGate: false, input: 'Draft invoice', output: 'Reviewed invoice' }, { id: 's34', name: 'Approval', description: 'Founder approval', agent: 'CEO-Agent', status: 'pending', blockingGate: true, input: 'Reviewed invoice', output: 'Approved invoice' }]) },
    { id: 'wf-010', name: 'Support Ticket Handling', category: 'Support', description: 'Handle customer support tickets', responsible_agents: JSON.stringify(['CS-Agent']), inputs: JSON.stringify(['Customer message']), outputs: JSON.stringify(['Closed ticket']), risk_score: 15, requires_approval: 0, status: 'active', success_rate: 94, avg_duration: '6h', steps: JSON.stringify([{ id: 's35', name: 'Receive Ticket', description: 'Ticket enters queue', agent: 'CS-Agent', status: 'completed', blockingGate: false, input: 'Customer message', output: 'Ticket' }, { id: 's36', name: 'Classify', description: 'Categorize and prioritize', agent: 'CS-Agent', status: 'completed', blockingGate: false, input: 'Ticket', output: 'Classified ticket' }, { id: 's37', name: 'Resolve', description: 'Resolve the issue', agent: 'CS-Agent', status: 'in-progress', blockingGate: false, input: 'Classified ticket', output: 'Resolution' }, { id: 's38', name: 'Close', description: 'Close and follow up', agent: 'CS-Agent', status: 'pending', blockingGate: false, input: 'Resolution', output: 'Closed ticket' }]) },
    { id: 'wf-011', name: 'Project Retrospective', category: 'Operations', description: 'Post-project review and learning', responsible_agents: JSON.stringify(['Analytics-Agent', 'COO-Agent', 'CEO-Agent']), inputs: JSON.stringify(['Project data']), outputs: JSON.stringify(['Retrospective doc']), risk_score: 10, requires_approval: 0, status: 'active', success_rate: 100, avg_duration: '8h', steps: JSON.stringify([{ id: 's39', name: 'Gather Data', description: 'Collect project metrics', agent: 'Analytics-Agent', status: 'completed', blockingGate: false, input: 'Project data', output: 'Metrics report' }, { id: 's40', name: 'Analysis', description: 'Analyze results', agent: 'COO-Agent', status: 'completed', blockingGate: false, input: 'Metrics report', output: 'Analysis' }, { id: 's41', name: 'Action Items', description: 'Define improvements', agent: 'COO-Agent', status: 'in-progress', blockingGate: false, input: 'Analysis', output: 'Action items' }, { id: 's42', name: 'Report', description: 'Share with team', agent: 'CEO-Agent', status: 'pending', blockingGate: false, input: 'Action items', output: 'Retrospective doc' }]) },
    { id: 'wf-012', name: 'Human Expert Onboarding', category: 'Human Workforce', description: 'Onboard new freelancers/experts', responsible_agents: JSON.stringify(['CHRO-Agent', 'CLO-Agent']), inputs: JSON.stringify(['Skill req']), outputs: JSON.stringify(['Onboarded expert']), risk_score: 25, requires_approval: 1, status: 'active', success_rate: 91, avg_duration: '48h', steps: JSON.stringify([{ id: 's43', name: 'Skill Match', description: 'Match skills to needs', agent: 'CHRO-Agent', status: 'completed', blockingGate: false, input: 'Skill req', output: 'Match list' }, { id: 's44', name: 'Interview', description: 'Conduct async interview', agent: 'CHRO-Agent', status: 'completed', blockingGate: false, input: 'Match list', output: 'Interview result' }, { id: 's45', name: 'Contract', description: 'Send contract', agent: 'CLO-Agent', status: 'completed', blockingGate: true, input: 'Interview result', output: 'Signed contract' }, { id: 's46', name: 'Onboard', description: 'Setup and orientation', agent: 'CHRO-Agent', status: 'in-progress', blockingGate: false, input: 'Signed contract', output: 'Onboarded expert' }]) },
    { id: 'wf-013', name: 'Vendor Evaluation', category: 'Procurement', description: 'Evaluate and select vendors', responsible_agents: JSON.stringify(['Procurement-Agent', 'CEO-Agent']), inputs: JSON.stringify(['Procurement req']), outputs: JSON.stringify(['Selected vendor']), risk_score: 20, requires_approval: 1, status: 'active', success_rate: 95, avg_duration: '72h', steps: JSON.stringify([{ id: 's47', name: 'Requirements', description: 'Define vendor needs', agent: 'Procurement-Agent', status: 'completed', blockingGate: false, input: 'Procurement req', output: 'Vendor brief' }, { id: 's48', name: 'Research', description: 'Find potential vendors', agent: 'Procurement-Agent', status: 'completed', blockingGate: false, input: 'Vendor brief', output: 'Vendor shortlist' }, { id: 's49', name: 'Evaluate', description: 'Score and compare', agent: 'Procurement-Agent', status: 'in-progress', blockingGate: false, input: 'Vendor shortlist', output: 'Evaluation score' }, { id: 's50', name: 'Select', description: 'Final selection', agent: 'CEO-Agent', status: 'pending', blockingGate: true, input: 'Evaluation score', output: 'Selected vendor' }]) },
    { id: 'wf-014', name: 'Incident Response', category: 'Security', description: 'Handle security/operational incidents', responsible_agents: JSON.stringify(['Safety-Agent', 'CISO-Agent', 'Audit-Agent']), inputs: JSON.stringify(['Alert']), outputs: JSON.stringify(['Post-mortem']), risk_score: 70, requires_approval: 0, status: 'active', success_rate: 100, avg_duration: '4h', steps: JSON.stringify([{ id: 's51', name: 'Detect', description: 'Detect and classify incident', agent: 'Safety-Agent', status: 'completed', blockingGate: false, input: 'Alert', output: 'Incident classified' }, { id: 's52', name: 'Contain', description: 'Limit impact', agent: 'CISO-Agent', status: 'completed', blockingGate: false, input: 'Incident classified', output: 'Contained' }, { id: 's53', name: 'Resolve', description: 'Fix root cause', agent: 'CISO-Agent', status: 'in-progress', blockingGate: false, input: 'Contained', output: 'Resolved' }, { id: 's54', name: 'Post-mortem', description: 'Document and learn', agent: 'Audit-Agent', status: 'pending', blockingGate: false, input: 'Resolved', output: 'Post-mortem' }]) },
    { id: 'wf-015', name: 'Kill-or-Grow Review', category: 'Executive', description: 'Decide to continue or kill projects', responsible_agents: JSON.stringify(['Analytics-Agent', 'CEO-Agent']), inputs: JSON.stringify(['Project data']), outputs: JSON.stringify(['Kill or grow decision']), risk_score: 50, requires_approval: 1, status: 'active', success_rate: 100, avg_duration: '24h', steps: JSON.stringify([{ id: 's55', name: 'Data Collection', description: 'Gather project KPIs', agent: 'Analytics-Agent', status: 'completed', blockingGate: false, input: 'Project data', output: 'KPI report' }, { id: 's56', name: 'Analysis', description: 'Analyze viability', agent: 'CEO-Agent', status: 'completed', blockingGate: false, input: 'KPI report', output: 'Analysis' }, { id: 's57', name: 'Decision', description: 'Founder decides', agent: 'CEO-Agent', status: 'in-progress', blockingGate: true, input: 'Analysis', output: 'Kill or grow' }]) },
    { id: 'wf-016', name: 'Daily CEO Report', category: 'Executive', description: 'Generate daily founder report', responsible_agents: JSON.stringify(['Analytics-Agent', 'CEO-Agent']), inputs: JSON.stringify(['All systems']), outputs: JSON.stringify(['Daily report']), risk_score: 5, requires_approval: 0, status: 'active', success_rate: 99, avg_duration: '1h', steps: JSON.stringify([{ id: 's58', name: 'Collect Data', description: 'Gather all metrics', agent: 'Analytics-Agent', status: 'completed', blockingGate: false, input: 'All systems', output: 'Raw data' }, { id: 's59', name: 'Analyze', description: 'Analyze trends', agent: 'CEO-Agent', status: 'completed', blockingGate: false, input: 'Raw data', output: 'Analysis' }, { id: 's60', name: 'Generate Report', description: 'Create report', agent: 'CEO-Agent', status: 'in-progress', blockingGate: false, input: 'Analysis', output: 'Daily report' }, { id: 's61', name: 'Deliver', description: 'Send to founder', agent: 'CEO-Agent', status: 'pending', blockingGate: false, input: 'Daily report', output: 'Delivered' }]) },
    { id: 'wf-017', name: 'Weekly Audit Review', category: 'Audit', description: 'Weekly compliance and audit review', responsible_agents: JSON.stringify(['Audit-Agent']), inputs: JSON.stringify(['Weekly logs']), outputs: JSON.stringify(['Weekly audit report']), risk_score: 15, requires_approval: 0, status: 'active', success_rate: 100, avg_duration: '4h', steps: JSON.stringify([{ id: 's62', name: 'Log Analysis', description: 'Analyze audit logs', agent: 'Audit-Agent', status: 'completed', blockingGate: false, input: 'Weekly logs', output: 'Log analysis' }, { id: 's63', name: 'Compliance Check', description: 'Check compliance status', agent: 'Audit-Agent', status: 'completed', blockingGate: false, input: 'Log analysis', output: 'Compliance score' }, { id: 's64', name: 'Risk Report', description: 'Identify new risks', agent: 'Audit-Agent', status: 'in-progress', blockingGate: false, input: 'Compliance score', output: 'Risk report' }, { id: 's65', name: 'Report', description: 'Send to founder', agent: 'Audit-Agent', status: 'pending', blockingGate: false, input: 'Risk report', output: 'Weekly audit report' }]) },
    { id: 'wf-018', name: 'Red-Team Check', category: 'Security', description: 'Periodic security red team exercise', responsible_agents: JSON.stringify(['CISO-Agent', 'CTO-Agent', 'Safety-Agent']), inputs: JSON.stringify(['Threat model']), outputs: JSON.stringify(['Verified security']), risk_score: 55, requires_approval: 1, status: 'active', success_rate: 95, avg_duration: '48h', steps: JSON.stringify([{ id: 's66', name: 'Plan', description: 'Define attack scenarios', agent: 'CISO-Agent', status: 'completed', blockingGate: false, input: 'Threat model', output: 'Test plan' }, { id: 's67', name: 'Execute', description: 'Run security tests', agent: 'CISO-Agent', status: 'in-progress', blockingGate: false, input: 'Test plan', output: 'Test results' }, { id: 's68', name: 'Remediate', description: 'Fix findings', agent: 'CTO-Agent', status: 'pending', blockingGate: false, input: 'Test results', output: 'Remediated' }, { id: 's69', name: 'Verify', description: 'Verify fixes', agent: 'Safety-Agent', status: 'pending', blockingGate: true, input: 'Remediated', output: 'Verified' }]) },
  ];

  for (const w of workflows) {
    insertWorkflow.run(w.id, w.name, w.category, w.description, w.responsible_agents, w.inputs, w.outputs, w.risk_score, w.requires_approval, w.status, w.success_rate, w.avg_duration, w.steps);
  }

  // ─── 10. Human Experts (12) ───
  console.log('[SEED] Creating 12 human experts...');
  const insertExpert = db.prepare(`
    INSERT INTO human_experts (id, name, type, skills, rating, hourly_rate, availability, status, onboarding_progress, total_projects, completed_projects, contact_email)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const experts = [
    { id: 'exp-001', name: 'Sarah Chen', type: 'freelancer', skills: JSON.stringify(['UX Design', 'Figma', 'Prototyping']), rating: 4.8, hourlyRate: 85, availability: 'available', status: 'active', onboardingProgress: 100, totalProjects: 12, completedProjects: 11, contactEmail: 'sarah@design.io' },
    { id: 'exp-002', name: 'Marcus Weber', type: 'vendor', skills: JSON.stringify(['Backend Dev', 'Node.js', 'PostgreSQL']), rating: 4.6, hourlyRate: 95, availability: 'partial', status: 'active', onboardingProgress: 100, totalProjects: 8, completedProjects: 7, contactEmail: 'marcus@backend.dev' },
    { id: 'exp-003', name: 'Anna Kovacs', type: 'expert', skills: JSON.stringify(['Legal', 'GDPR', 'Contract Law']), rating: 4.9, hourlyRate: 150, availability: 'partial', status: 'active', onboardingProgress: 100, totalProjects: 5, completedProjects: 5, contactEmail: 'anna@legal.eu' },
    { id: 'exp-004', name: 'James Miller', type: 'freelancer', skills: JSON.stringify(['Copywriting', 'SEO', 'Content Strategy']), rating: 4.5, hourlyRate: 65, availability: 'available', status: 'active', onboardingProgress: 100, totalProjects: 15, completedProjects: 13, contactEmail: 'james@content.io' },
    { id: 'exp-005', name: 'DevOps Solutions GmbH', type: 'vendor', skills: JSON.stringify(['DevOps', 'AWS', 'CI/CD']), rating: 4.7, hourlyRate: 120, availability: 'busy', status: 'active', onboardingProgress: 100, totalProjects: 3, completedProjects: 3, contactEmail: 'ops@devops.de' },
    { id: 'exp-006', name: 'Lisa Yamamoto', type: 'freelancer', skills: JSON.stringify(['Frontend Dev', 'React', 'TypeScript']), rating: 4.4, hourlyRate: 80, availability: 'available', status: 'active', onboardingProgress: 100, totalProjects: 9, completedProjects: 8, contactEmail: 'lisa@frontend.dev' },
    { id: 'exp-007', name: 'Peter Schmidt', type: 'operator', skills: JSON.stringify(['Field Operations', 'Logistics', 'Support']), rating: 4.3, hourlyRate: 55, availability: 'available', status: 'active', onboardingProgress: 100, totalProjects: 20, completedProjects: 18, contactEmail: 'peter@field.de' },
    { id: 'exp-008', name: 'Nina Patel', type: 'freelancer', skills: JSON.stringify(['Data Analysis', 'SQL', 'Visualization']), rating: 4.7, hourlyRate: 90, availability: 'unavailable', status: 'inactive', onboardingProgress: 100, totalProjects: 6, completedProjects: 6, contactEmail: 'nina@data.io' },
    { id: 'exp-009', name: 'TechAudit AG', type: 'vendor', skills: JSON.stringify(['Security Audit', 'Penetration Testing', 'Compliance']), rating: 4.8, hourlyRate: 175, availability: 'partial', status: 'active', onboardingProgress: 100, totalProjects: 4, completedProjects: 4, contactEmail: 'audit@techaudit.de' },
    { id: 'exp-010', name: 'David Okafor', type: 'freelancer', skills: JSON.stringify(['Mobile Dev', 'React Native', 'Flutter']), rating: 4.2, hourlyRate: 75, availability: 'available', status: 'onboarding', onboardingProgress: 45, totalProjects: 0, completedProjects: 0, contactEmail: 'david@mobile.dev' },
    { id: 'exp-011', name: 'Elena Rossi', type: 'expert', skills: JSON.stringify(['Product Strategy', 'Market Research', 'Go-to-Market']), rating: 4.9, hourlyRate: 140, availability: 'partial', status: 'active', onboardingProgress: 100, totalProjects: 7, completedProjects: 6, contactEmail: 'elena@product.io' },
    { id: 'exp-012', name: 'CloudFirst Services', type: 'vendor', skills: JSON.stringify(['Cloud Architecture', 'Kubernetes', 'Azure']), rating: 4.5, hourlyRate: 130, availability: 'busy', status: 'active', onboardingProgress: 100, totalProjects: 2, completedProjects: 2, contactEmail: 'info@cloudfirst.de' },
  ];

  for (const e of experts) {
    insertExpert.run(e.id, e.name, e.type, e.skills, e.rating, e.hourlyRate, e.availability, e.status, e.onboardingProgress, e.totalProjects, e.completedProjects, e.contactEmail);
  }

  // ─── 11. Budgets (5) ───
  console.log('[SEED] Creating 5 budgets...');
  const insertBudget = db.prepare(`
    INSERT INTO budgets (id, name, category, limit_amount, spent, remaining, warning_at, critical_at, period)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertBudget.run('bud-001', 'Gesamtbudget Q1 2025', 'total', 50000, 27460, 22540, 75, 90, 'monthly');
  insertBudget.run('bud-002', 'Hosting & Infra', 'infrastructure', 5000, 2880, 2120, 80, 95, 'monthly');
  insertBudget.run('bud-003', 'Freelancer Pool', 'workforce', 15000, 8450, 6550, 70, 85, 'monthly');
  insertBudget.run('bud-004', 'Marketing', 'marketing', 5000, 2100, 2900, 80, 95, 'monthly');
  insertBudget.run('bud-005', 'Security & Compliance', 'security', 7000, 3950, 3050, 75, 90, 'monthly');

  // ─── 12. Invoices (5) ───
  console.log('[SEED] Creating 5 invoices...');
  const insertInvoice = db.prepare(`
    INSERT INTO invoices (id, studio, customer, amount, status, due_date, sent_at, paid_at, blocked)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertInvoice.run('inv-001', 'Studio Cedar', 'Internal', 5000, 'sent', '2025-03-25', '2025-03-10T10:00:00Z', null, 0);
  insertInvoice.run('inv-002', 'Studio Aurora', 'External', 3200, 'pending', '2025-03-30', null, null, 1);
  insertInvoice.run('inv-003', 'Studio Bridge', 'Pilot Partner', 7500, 'pending', '2025-04-05', null, null, 1);
  insertInvoice.run('inv-004', 'Internal', null, 0, 'draft', '2025-03-20', null, null, 0);
  insertInvoice.run('inv-005', 'Studio Cedar', 'Internal', 2800, 'overdue', '2025-02-28', '2025-02-15T10:00:00Z', null, 1);

  // ─── 13. Incidents (3) ───
  console.log('[SEED] Creating 3 incidents...');
  const insertIncident = db.prepare(`
    INSERT INTO incidents (id, severity, title, description, status, detected_at, resolved_at, affected_agents, mitigation)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertIncident.run('inc-001', 2, 'GDPR-Prufung uberfallig', 'Studio Cedar GDPR audit has been overdue for 2 days. Immediate action required.', 'open', '2025-03-08T09:00:00Z', null, JSON.stringify(['CLO-Agent', 'CISO-Agent', 'Audit-Agent']), 'Schedule audit within 24h, involve external DPO');
  insertIncident.run('inc-002', 3, 'API-Schlussel nicht rotiert', 'Production API keys have not been rotated in 90 days. Security policy violation.', 'contained', '2025-03-07T14:00:00Z', '2025-03-10T12:45:00Z', JSON.stringify(['CISO-Agent', 'CTO-Agent']), 'Automated key rotation implemented');
  insertIncident.run('inc-003', 2, 'QA-Testabdeckung unter 80%', 'Current test coverage at 78%, below 80% threshold for production deployment.', 'open', '2025-03-06T10:00:00Z', null, JSON.stringify(['QA-Agent', 'CTO-Agent']), 'Add integration tests for critical paths');

  // ─── 14. System Settings ───
  console.log('[SEED] Creating system settings...');
  const insertSetting = db.prepare(`
    INSERT INTO system_settings (key, value, description)
    VALUES (?, ?, ?)
  `);

  insertSetting.run('kill_switch_status', 'armed', 'Current kill switch status: armed/disarmed/active');
  insertSetting.run('kill_switch_level', '0', 'Current kill switch level (0-4)');
  insertSetting.run('automation_rate', '73', 'Current automation rate percentage');
  insertSetting.run('liquidity_eur', '12450', 'Current liquidity in EUR');
  insertSetting.run('company_name', 'The Company OS', 'Company name display');
  insertSetting.run('system_version', '1.0.0', 'System version');

  // ─── 15. Tool Permissions (8) ───
  console.log('[SEED] Creating 8 tool permissions...');
  const insertToolPerm = db.prepare(`
    INSERT INTO tool_permissions (id, tool_name, tool_id, risk_class, allowed_roles, param_limits)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  insertToolPerm.run('tp-001', 'GitHub', 'github', 'yellow', JSON.stringify(['CTO-Agent', 'QA-Agent']), 'Max 10 commits/hour');
  insertToolPerm.run('tp-002', 'Deployment', 'deployment', 'red', JSON.stringify(['CTO-Agent']), 'Requires safety + founder approval');
  insertToolPerm.run('tp-003', 'Invoicing', 'invoicing', 'red', JSON.stringify(['CFO-Agent']), 'Max EUR 5000/invoice');
  insertToolPerm.run('tp-004', 'Contract Review', 'contract-review', 'red', JSON.stringify(['CLO-Agent']), 'All contracts require founder approval');
  insertToolPerm.run('tp-005', 'Budget Tool', 'budget-tool', 'yellow', JSON.stringify(['CFO-Agent', 'CEO-Agent']), 'Read: all, Write: CFO only');
  insertToolPerm.run('tp-006', 'Security Scanner', 'security-scanner', 'green', JSON.stringify(['CISO-Agent', 'Safety-Agent']), 'Unlimited scans');
  insertToolPerm.run('tp-007', 'Slack', 'slack', 'green', JSON.stringify(['all']), 'Standard messaging');
  insertToolPerm.run('tp-008', 'CRM', 'crm', 'yellow', JSON.stringify(['Sales-Agent', 'CEO-Agent']), 'Max 100 contacts/day');

  // ─── 16. Model Policies (6) ───
  console.log('[SEED] Creating 6 model policies...');
  const insertModel = db.prepare(`
    INSERT INTO model_policies (id, name, enabled, description)
    VALUES (?, ?, ?, ?)
  `);

  insertModel.run('mp-001', 'GPT-4o', 1, 'Primary model for most agents');
  insertModel.run('mp-002', 'GPT-4o-mini', 1, 'Cost-effective model for simple tasks');
  insertModel.run('mp-003', 'Claude 3.5 Sonnet', 1, 'Complex reasoning tasks');
  insertModel.run('mp-004', 'Claude 3 Haiku', 0, 'Fast responses, experimental');
  insertModel.run('mp-005', 'o1-preview', 1, 'Planning and strategy tasks');
  insertModel.run('mp-006', 'o1-mini', 0, 'Lightweight reasoning');

  // ─── 17. Workflow Instances (3 running) ───
  console.log('[SEED] Creating 3 workflow instances...');
  const insertInstance = db.prepare(`
    INSERT INTO workflow_instances (id, workflow_id, status, current_step, context, result)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  insertInstance.run('wi-001', 'wf-001', 'running', 3, JSON.stringify({ leadId: 'lead-42', studio: 'Studio Cedar' }), null);
  insertInstance.run('wi-002', 'wf-006', 'running', 2, JSON.stringify({ branch: 'feature/auth-v2' }), null);
  insertInstance.run('wi-003', 'wf-010', 'running', 2, JSON.stringify({ ticketId: 'T-1024' }), null);

  console.log('[SEED] Database seeding completed successfully!');
  console.log('[SEED] Summary:');
  console.log('  - 3 Users (founder, admin, viewer)');
  console.log('  - 22 Agents');
  console.log('  - 14 Departments');
  console.log('  - 8 Business Units');
  console.log('  - 3 Product Studios');
  console.log('  - 7 Approvals');
  console.log('  - 22 Audit Log entries');
  console.log('  - 32 Risks');
  console.log('  - 18 Workflows');
  console.log('  - 3 Workflow Instances');
  console.log('  - 12 Human Experts');
  console.log('  - 5 Budgets');
  console.log('  - 5 Invoices');
  console.log('  - 3 Incidents');
  console.log('  - 6 System Settings');
  console.log('  - 8 Tool Permissions');
  console.log('  - 6 Model Policies');
}

// Run seed if executed directly
if (typeof require !== 'undefined' && require.main === module) {
  seed().catch(console.error);
}

export { seed };
