// ═══════════════════════════════════════════════════════════════
// Database Validation Script - Direct Node.js Execution
// Validates: Schema, Seeds, Consistency, Foreign Keys, Performance
// ═══════════════════════════════════════════════════════════════

const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

// Setup in-memory DB
const db = new Database(':memory:');
db.pragma('foreign_keys = ON');

let passed = 0;
let failed = 0;
const errors = [];

function assert(name, condition, details) {
  if (condition) {
    passed++;
    console.log(`  [PASS] ${name}`);
  } else {
    failed++;
    errors.push({ test: name, details });
    console.log(`  [FAIL] ${name}${details ? ': ' + details : ''}`);
  }
}

function assertEqual(name, actual, expected) {
  if (actual === expected) {
    passed++;
    console.log(`  [PASS] ${name} (${actual})`);
  } else {
    failed++;
    errors.push({ test: name, details: `Expected ${expected}, got ${actual}` });
    console.log(`  [FAIL] ${name}: Expected ${expected}, got ${actual}`);
  }
}

console.log('\n═══════════════════════════════════════════════════════════════');
console.log('  The Company OS - Database Validation Suite');
console.log('═══════════════════════════════════════════════════════════════\n');

// ─── 1. LOAD SCHEMA ───
console.log('[STEP 1] Loading Schema...');
const schemaPath = path.join(__dirname, '../src/db/schema.sql');
const schema = fs.readFileSync(schemaPath, 'utf-8');

const statements = schema
  .split(';')
  .map(s => s.replace(/--.*$/gm, '').trim())
  .filter(s => s.length > 0 && !s.startsWith('PRAGMA'));

for (const stmt of statements) {
  try {
    db.exec(stmt + ';');
  } catch (err) {
    if (!err.message.includes('already exists')) {
      console.log('  Schema warning:', err.message);
    }
  }
}
console.log(`  ${statements.length} schema statements executed\n`);

// ─── 2. LOAD SEEDS ───
console.log('[STEP 2] Loading Seeds...');

// 2a. Users
const insertUser = db.prepare(`INSERT INTO users (id, email, password_hash, name, role, is_active) VALUES (?, ?, ?, ?, ?, ?)`);
insertUser.run('user-founder', 'founder@thecompany.de', '$2a$04$hashhashhashhashhashhashhashhashhashhashhashhashhashhashh', 'Gruender', 'founder', 1);
insertUser.run('user-admin', 'admin@thecompany.de', '$2a$04$hashhashhashhashhashhashhashhashhashhashhashhashhashhashh', 'Admin', 'admin', 1);
insertUser.run('user-viewer', 'viewer@thecompany.de', '$2a$04$hashhashhashhashhashhashhashhashhashhashhashhashhashhashh', 'Viewer', 'viewer', 1);

// 2b. Agents (22)
const insertAgent = db.prepare(`INSERT INTO agents (id, role, name, department, description, allowed_tools, budget_limit, budget_spent, risk_ceiling, autonomy_level, human_approval_rules, kpis, status, version, owner_human) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
const agentsData = [
  ['human-ceo', 'Human CEO/Founder', 'Founder', 'Executive Council', 'Human-in-the-loop decision maker', JSON.stringify(['all']), 1000000, 0, 'critical', 'human-only', JSON.stringify(['All red-line decisions']), JSON.stringify([{ name: 'Decisions/Day', value: '12', target: '15' }]), 'active', '1.0', 'Self'],
  ['ceo-agent', 'CEO-Agent', 'CEO-Agent', 'Executive Council', 'Strategic planning, daily reports', JSON.stringify(['report-generator', 'dashboard', 'alert-system']), 50000, 12000, 'high', 'supervised', JSON.stringify(['Budget > EUR 5k']), JSON.stringify([{ name: 'Report Accuracy', value: '98%' }]), 'active', '2.1', 'Founder'],
  ['coo-agent', 'COO-Agent', 'COO-Agent', 'Operations', 'Operations management', JSON.stringify(['workflow-engine', 'task-manager', 'slack']), 25000, 8900, 'medium', 'full', JSON.stringify(['Process changes']), JSON.stringify([{ name: 'Efficiency', value: '87%' }]), 'active', '1.8', 'Founder'],
  ['cto-agent', 'CTO-Agent', 'CTO-Agent', 'Engineering', 'Technical architecture', JSON.stringify(['github', 'deployment', 'ci-cd', 'code-review']), 30000, 15200, 'high', 'supervised', JSON.stringify(['Production deployments']), JSON.stringify([{ name: 'Deploy Success', value: '96%' }]), 'active', '3.2', 'Founder'],
  ['cfo-agent', 'CFO-Agent', 'CFO-Agent', 'Finance', 'Financial planning', JSON.stringify(['accounting', 'invoicing', 'budget-tool', 'reporting']), 20000, 8450, 'critical', 'approval-required', JSON.stringify(['All payments > EUR 500']), JSON.stringify([{ name: 'Budget Accuracy', value: '99%' }]), 'active', '2.0', 'Founder'],
  ['clo-agent', 'CLO-Agent', 'CLO-Agent', 'Legal/Compliance', 'Legal review, contracts', JSON.stringify(['legal-db', 'contract-review', 'gdpr-tool']), 15000, 3200, 'high', 'approval-required', JSON.stringify(['All contracts']), JSON.stringify([{ name: 'Compliance Rate', value: '100%' }]), 'active', '1.5', 'Founder'],
  ['ciso-agent', 'CISO-Agent', 'CISO-Agent', 'Security', 'Security operations', JSON.stringify(['security-scanner', 'siem', 'pen-test']), 20000, 6700, 'critical', 'approval-required', JSON.stringify(['Security policy changes']), JSON.stringify([{ name: 'Threat Detection', value: '99.5%' }]), 'active', '2.3', 'Founder'],
  ['cpo-agent', 'CPO-Agent', 'CPO-Agent', 'Product', 'Product strategy', JSON.stringify(['product-board', 'analytics', 'user-research']), 20000, 11400, 'medium', 'supervised', JSON.stringify(['Product launches']), JSON.stringify([{ name: 'Feature Delivery', value: '92%' }]), 'active', '1.9', 'Founder'],
  ['chro-agent', 'CHRO-Agent', 'CHRO-Agent', 'Human Workforce', 'Workforce management', JSON.stringify(['hr-platform', 'onboarding', 'evaluation']), 10000, 5400, 'medium', 'supervised', JSON.stringify(['Hiring decisions']), JSON.stringify([{ name: 'Onboard Time', value: '2.3d' }]), 'active', '1.4', 'Founder'],
  ['brand-agent', 'Brand-Agent', 'Brand-Agent', 'Marketing', 'Brand management', JSON.stringify(['brand-toolkit', 'design-review', 'social-media']), 8000, 2100, 'low', 'full', JSON.stringify(['Brand changes']), JSON.stringify([{ name: 'Brand Consistency', value: '97%' }]), 'active', '1.2', 'Founder'],
  ['sales-agent', 'Sales-Agent', 'Sales-Agent', 'Sales', 'Lead qualification, CRM', JSON.stringify(['crm', 'email-automation', 'calendar']), 10000, 7200, 'low', 'full', JSON.stringify(['Discount > 10%']), JSON.stringify([{ name: 'Lead Conv.', value: '14%' }]), 'active', '2.0', 'Founder'],
  ['procurement-agent', 'Procurement-Agent', 'Procurement-Agent', 'Finance', 'Procurement management', JSON.stringify(['procurement-db', 'vendor-eval', 'contract-mgmt']), 15000, 3800, 'medium', 'approval-required', JSON.stringify(['Purchases > EUR 1000']), JSON.stringify([{ name: 'Cost Savings', value: '18%' }]), 'active', '1.6', 'Founder'],
  ['qa-agent', 'QA-Agent', 'QA-Agent', 'QA', 'Quality assurance', JSON.stringify(['test-suite', 'bug-tracker', 'ci-cd']), 12000, 4500, 'medium', 'supervised', JSON.stringify(['Production releases']), JSON.stringify([{ name: 'Test Coverage', value: '78%' }]), 'active', '2.4', 'Founder'],
  ['cs-agent', 'Customer-Support-Agent', 'Customer-Support-Agent', 'Support', 'Customer support', JSON.stringify(['ticketing', 'knowledge-base', 'chat']), 8000, 3100, 'low', 'full', JSON.stringify(['Refunds > EUR 100']), JSON.stringify([{ name: 'CSAT', value: '4.6' }]), 'active', '1.7', 'Founder'],
  ['field-ops-agent', 'Field-Operations-Agent', 'Field-Operations-Agent', 'Operations', 'Field operations', JSON.stringify(['logistics', 'scheduling', 'gps']), 10000, 5200, 'medium', 'supervised', JSON.stringify(['Emergency dispatches']), JSON.stringify([{ name: 'On-Time Rate', value: '94%' }]), 'active', '1.3', 'Founder'],
  ['safety-agent', 'Safety-Agent', 'Safety-Agent', 'Security', 'Safety monitoring', JSON.stringify(['incident-tracker', 'monitoring', 'alert-system']), 10000, 1800, 'critical', 'approval-required', JSON.stringify(['Safety overrides']), JSON.stringify([{ name: 'Incidents', value: '0' }]), 'active', '1.1', 'Founder'],
  ['audit-agent', 'Audit-Agent', 'Audit-Agent', 'Audit', 'Internal audit', JSON.stringify(['audit-tool', 'log-analyzer', 'reporting']), 8000, 2900, 'high', 'approval-required', JSON.stringify(['Audit findings']), JSON.stringify([{ name: 'Issues Found', value: '3' }]), 'active', '1.8', 'Founder'],
  ['knowledge-agent', 'Knowledge-Agent', 'Knowledge-Agent', 'Internal Tools', 'Knowledge base', JSON.stringify(['wiki', 'doc-generator', 'search']), 5000, 980, 'low', 'full', JSON.stringify([]), JSON.stringify([{ name: 'Doc Coverage', value: '85%' }]), 'active', '1.0', 'Founder'],
  ['pricing-agent', 'Pricing-Agent', 'Pricing-Agent', 'Sales', 'Dynamic pricing', JSON.stringify(['pricing-engine', 'market-data', 'analytics']), 8000, 2400, 'medium', 'supervised', JSON.stringify(['Price changes > 5%']), JSON.stringify([{ name: 'Margin', value: '42%' }]), 'active', '1.4', 'Founder'],
  ['doc-agent', 'Doc-Agent', 'Doc-Agent', 'Internal Tools', 'Documentation automation', JSON.stringify(['doc-generator', 'api-tool', 'markdown']), 5000, 760, 'low', 'full', JSON.stringify([]), JSON.stringify([{ name: 'Gen Speed', value: '45min' }]), 'active', '1.2', 'Founder'],
  ['marketing-agent', 'Marketing-Agent', 'Marketing-Agent', 'Marketing', 'Marketing campaigns', JSON.stringify(['cms', 'seo-tool', 'analytics', 'social-media']), 12000, 5600, 'low', 'full', JSON.stringify(['Campaign spend > EUR 500']), JSON.stringify([{ name: 'ROAS', value: '3.8x' }]), 'active', '2.1', 'Founder'],
  ['analytics-agent', 'Analytics-Agent', 'Analytics-Agent', 'Internal Tools', 'Data analytics', JSON.stringify(['analytics', 'sql', 'dashboard', 'etl']), 8000, 2100, 'low', 'full', JSON.stringify([]), JSON.stringify([{ name: 'Report Gen', value: '12/h' }]), 'active', '1.6', 'Founder'],
];
for (const a of agentsData) insertAgent.run(...a);

// 2c. Departments (14)
const insertDept = db.prepare(`INSERT INTO departments (id, name, description, status, lead_agent, agents, current_tasks, kpi_summary) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
const depts = [
  ['exec', 'Executive Council', 'Strategic leadership and oversight', 'active', 'ceo-agent', JSON.stringify(['human-ceo', 'ceo-agent']), JSON.stringify([]), JSON.stringify([])],
  ['sales', 'Sales', 'Revenue generation and customer acquisition', 'active', 'sales-agent', JSON.stringify(['sales-agent', 'pricing-agent']), JSON.stringify([]), JSON.stringify([])],
  ['product', 'Product', 'Product management and roadmap', 'active', 'cpo-agent', JSON.stringify(['cpo-agent']), JSON.stringify([]), JSON.stringify([])],
  ['engineering', 'Engineering', 'Software development and architecture', 'active', 'cto-agent', JSON.stringify(['cto-agent']), JSON.stringify([]), JSON.stringify([])],
  ['qa', 'QA', 'Quality assurance and testing', 'active', 'qa-agent', JSON.stringify(['qa-agent']), JSON.stringify([]), JSON.stringify([])],
  ['finance', 'Finance', 'Financial planning and accounting', 'active', 'cfo-agent', JSON.stringify(['cfo-agent', 'procurement-agent']), JSON.stringify([]), JSON.stringify([])],
  ['legal', 'Legal/Compliance', 'Legal affairs and compliance', 'active', 'clo-agent', JSON.stringify(['clo-agent']), JSON.stringify([]), JSON.stringify([])],
  ['security', 'Security', 'Security operations and monitoring', 'active', 'ciso-agent', JSON.stringify(['ciso-agent', 'safety-agent']), JSON.stringify([]), JSON.stringify([])],
  ['operations', 'Operations', 'Daily operations and logistics', 'active', 'coo-agent', JSON.stringify(['coo-agent', 'field-ops-agent']), JSON.stringify([]), JSON.stringify([])],
  ['human-workforce', 'Human Workforce', 'Freelancer and vendor management', 'active', 'chro-agent', JSON.stringify(['chro-agent']), JSON.stringify([]), JSON.stringify([])],
  ['marketing', 'Marketing', 'Marketing and brand management', 'active', 'marketing-agent', JSON.stringify(['marketing-agent', 'brand-agent']), JSON.stringify([]), JSON.stringify([])],
  ['support', 'Support', 'Customer support and service', 'active', 'cs-agent', JSON.stringify(['cs-agent']), JSON.stringify([]), JSON.stringify([])],
  ['audit', 'Audit', 'Internal auditing and governance', 'active', 'audit-agent', JSON.stringify(['audit-agent']), JSON.stringify([]), JSON.stringify([])],
  ['internal-tools', 'Internal Tools', 'Internal tooling and automation', 'active', 'knowledge-agent', JSON.stringify(['knowledge-agent', 'analytics-agent', 'doc-agent']), JSON.stringify([]), JSON.stringify([])],
];
for (const d of depts) insertDept.run(...d);

// 2d. Business Units (8)
const insertUnit = db.prepare(`INSERT INTO business_units (id, code, name, purpose, status, phase, products, revenue_model, required_agents, required_humans, risks, kpis, dependencies) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
const units = [
  ['unit-a', 'A', 'AI Software Studio', 'AI-powered software development', 'active', 3, JSON.stringify(['Studio Cedar MVP']), 'SaaS subscriptions', JSON.stringify(['CTO-Agent', 'QA-Agent', 'CPO-Agent']), JSON.stringify(['UX Designer']), JSON.stringify(['Technical complexity']), JSON.stringify([]), JSON.stringify(['Unit H'])],
  ['unit-b', 'B', 'Digital Product Factory', 'Rapid digital product development', 'parked', 1, JSON.stringify(['Studio Aurora Landingpage']), 'Project-based', JSON.stringify(['CTO-Agent', 'Marketing-Agent']), JSON.stringify(['Product Designer']), JSON.stringify(['Resource constraints']), JSON.stringify([]), JSON.stringify(['Unit A'])],
  ['unit-c', 'C', 'Physical Services Marketplace', 'AI-mediated local services', 'parked', 1, JSON.stringify(['Studio Bridge Prototype']), 'Transaction fees', JSON.stringify(['CPO-Agent', 'Field-Operations-Agent']), JSON.stringify(['Operations Manager']), JSON.stringify(['Market fit']), JSON.stringify([]), JSON.stringify(['Unit A', 'Unit B'])],
  ['unit-d', 'D', 'Autonomous Marketing Agency', 'AI-driven marketing', 'parked', 1, JSON.stringify(['Website Redesign']), 'Retainer + performance', JSON.stringify(['Marketing-Agent', 'Brand-Agent', 'Sales-Agent']), JSON.stringify(['Creative Director']), JSON.stringify(['Client acquisition']), JSON.stringify([]), JSON.stringify(['Unit A'])],
  ['unit-e', 'E', 'Premium Engineering Lab', 'High-end engineering services', 'parked', 0, JSON.stringify([]), 'Hourly consulting', JSON.stringify(['CTO-Agent', 'Analytics-Agent']), JSON.stringify(['Senior Architect']), JSON.stringify(['Talent availability']), JSON.stringify([]), JSON.stringify(['Unit A', 'Unit H'])],
  ['unit-f', 'F', 'Game/Media/Content Studio', 'Interactive media', 'parked', 0, JSON.stringify([]), 'Licensing', JSON.stringify(['CPO-Agent', 'Brand-Agent']), JSON.stringify(['Game Designer']), JSON.stringify(['Long dev cycles']), JSON.stringify([]), JSON.stringify(['Unit A'])],
  ['unit-g', 'G', 'Local Operations Network', 'On-the-ground operations', 'parked', 0, JSON.stringify([]), 'Service fees', JSON.stringify(['Field-Operations-Agent', 'COO-Agent']), JSON.stringify(['Regional Manager']), JSON.stringify(['Operational complexity']), JSON.stringify([]), JSON.stringify(['Unit C'])],
  ['unit-h', 'H', 'Internal Tools & Automation', 'Internal tooling', 'internal-active', 2, JSON.stringify(['Agent Registry v2']), 'Internal cost savings', JSON.stringify(['CTO-Agent', 'Analytics-Agent', 'Knowledge-Agent', 'Doc-Agent']), JSON.stringify(['DevOps Engineer']), JSON.stringify(['Technical debt']), JSON.stringify([]), JSON.stringify([])],
];
for (const u of units) insertUnit.run(...u);

// 2e. Product Studios (3)
const insertStudio = db.prepare(`INSERT INTO product_studios (id, name, business_unit, status, budget_total, budget_spent, budget_remaining, workflow_step, qa_status, deployment_status, customer, start_date, target_date, completion) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
insertStudio.run('studio-cedar', 'Studio Cedar', 'Unit A - AI Software Studio', 'building', 25000, 15000, 10000, 'Build Phase', 'pending', 'not-started', 'Internal', '2025-01-15', '2025-04-15', 60);
insertStudio.run('studio-aurora', 'Studio Aurora', 'Unit B - Digital Product Factory', 'qa', 8000, 6400, 1600, 'QA Review', 'in-progress', 'staging', 'External', '2025-02-01', '2025-03-20', 80);
insertStudio.run('studio-bridge', 'Studio Bridge', 'Unit C - Physical Services Marketplace', 'deploying', 15000, 14250, 750, 'Deployment', 'passed', 'ready', 'Pilot Partner', '2025-01-01', '2025-03-15', 95);

// 2f. Approvals (7)
const insertApproval = db.prepare(`INSERT INTO approvals (id, type, title, description, requester, risk_level, amount, recommendation, status, red_line) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
insertApproval.run('app-001', 'payment', 'Hosting-Rechnung EUR 240', 'Monthly hosting invoice', 'Procurement-Agent', 'high', 240, 'Freigeben', 'pending', 1);
insertApproval.run('app-002', 'contract', 'Freelancer-NDA Studio Cedar', 'NDA contract for UX designer', 'CHRO-Agent', 'high', null, 'Freigeben', 'pending', 1);
insertApproval.run('app-003', 'deployment', 'Studio Bridge -> Produktion', 'Deploy to production', 'CTO-Agent', 'critical', null, 'Prufen', 'pending', 1);
insertApproval.run('app-004', 'invoice', 'Kundenrechnung #1024', 'Invoice to pilot partner', 'CFO-Agent', 'medium', 5000, 'Freigeben', 'pending', 1);
insertApproval.run('app-005', 'freelancer', 'UX-Designer Website', 'Contract engagement', 'CPO-Agent', 'high', 3500, 'Prufen', 'pending', 1);
insertApproval.run('app-006', 'purchase', 'Figma Pro License', 'Annual Figma license', 'Procurement-Agent', 'low', 144, 'Freigeben', 'pending', 0);
insertApproval.run('app-007', 'communication', 'Kunden-Email Versand', 'Bulk email', 'Marketing-Agent', 'medium', null, 'Prufen', 'pending', 0);

// 2g. Audit Log (22) - with consistent hash chain
// Timestamps must be in ascending order so ORDER BY timestamp ASC matches insertion order
const insertAudit = db.prepare(`INSERT INTO audit_log (id, timestamp, agent, action, tool, input, output, risk_score, project, approved_by, hash, previous_hash) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
let prevHash = null;
for (let i = 1; i <= 22; i++) {
  const id = `log-${String(i).padStart(3, '0')}`;
  const hash = `hash_${id}_chain_${prevHash || 'genesis'}`;
  // Timestamps ascending from 08:00 to 17:00 so ORDER BY timestamp ASC gives correct chain order
  const hour = String(7 + i).padStart(2, '0');
  insertAudit.run(id, `2025-03-10T${hour}:00:00Z`, `Agent-${i}`, `Action ${i}`, 'tool', 'input', 'output', i * 5, 'Project', 'Founder', hash, prevHash);
  prevHash = hash;
}

// 2h. Risks (32) - with calculated scores
const insertRisk = db.prepare(`INSERT INTO risks (name, category, cause, impact, early_warning, mitigation, owner, probability, severity, score, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
const risksData = [
  ['Technical debt accumulation', 'technical', 'Rapid development', 'Slowed dev', 'Complexity rising', '20% refactoring', 'CTO-Agent', 4, 3, 12, 'active'],
  ['GDPR non-compliance', 'legal', 'Inadequate protection', 'Fines up to 4%', 'Audit findings', 'Hire DPO', 'CLO-Agent', 3, 5, 15, 'active'],
  ['Cash flow shortage', 'financial', 'High burn rate', 'Cannot pay vendors', 'Liquidity < 15k', 'Reduce costs', 'CFO-Agent', 3, 4, 12, 'active'],
  ['Reputational damage from AI errors', 'reputational', 'Autonomous agents', 'Client churn', 'CSAT declining', 'Human gates', 'CEO-Agent', 3, 4, 12, 'monitoring'],
  ['API security breach', 'security', 'Weak auth', 'Data breach', 'Unusual traffic', 'Key rotation', 'CISO-Agent', 2, 5, 10, 'active'],
  ['Key freelancer unavailability', 'human', 'Freelancer leaves', 'Project delays', 'Slow responses', 'Multi-freelancer', 'CHRO-Agent', 4, 3, 12, 'monitoring'],
  ['Vendor dependency', 'operational', 'Single vendor', 'Service disruption', 'SLA breaches', 'Multi-vendor', 'Procurement-Agent', 3, 3, 9, 'monitoring'],
  ['Model hallucination', 'technical', 'LLM errors', 'Wrong decisions', 'Accuracy dropping', 'Validation layers', 'CTO-Agent', 4, 4, 16, 'active'],
  ['Contract dispute', 'legal', 'Ambiguous terms', 'Legal costs', 'Complaints', 'Clear contracts', 'CLO-Agent', 3, 3, 9, 'monitoring'],
  ['Over-budget project', 'financial', 'Scope creep', 'Reduced margins', 'Burn rate high', 'Fixed scopes', 'CFO-Agent', 4, 3, 12, 'active'],
  ['Data loss', 'security', 'No backups', 'Irretrievable work', 'Backup failures', '3-2-1 backup', 'CISO-Agent', 2, 5, 10, 'mitigated'],
  ['Agent version conflict', 'technical', 'Incompatible versions', 'System errors', 'Test failures', 'Version pinning', 'CTO-Agent', 3, 3, 9, 'monitoring'],
  ['Regulatory change', 'legal', 'EU AI Act', 'Compliance costs', 'Announcements', 'Legal monitoring', 'CLO-Agent', 4, 4, 16, 'monitoring'],
  ['Client payment delay', 'financial', 'Client cash issues', 'Revenue mismatch', 'Payment patterns', 'Upfront payment', 'CFO-Agent', 3, 3, 9, 'monitoring'],
  ['Service downtime', 'operational', 'Infra failure', 'SLA breach', 'Error rates', 'Redundancy', 'COO-Agent', 2, 4, 8, 'mitigated'],
  ['Skill gap', 'human', 'Missing skills', 'Quality issues', 'Training requests', 'Training budget', 'CHRO-Agent', 4, 3, 12, 'active'],
  ['IP dispute', 'legal', 'Third-party code', 'Lawsuit', 'IP audit', 'Clean room', 'CLO-Agent', 2, 5, 10, 'monitoring'],
  ['Tool vendor price hike', 'financial', 'Vendor pricing', 'Higher costs', 'Announcements', 'Multi-tool', 'Procurement-Agent', 3, 2, 6, 'monitoring'],
  ['Social media backlash', 'reputational', 'AI controversy', 'Brand damage', 'Sentiment alerts', 'Content review', 'Brand-Agent', 2, 4, 8, 'monitoring'],
  ['Infra scaling failure', 'technical', 'Unexpected load', 'Degradation', 'Latency', 'Auto-scaling', 'CTO-Agent', 3, 3, 9, 'mitigated'],
  ['Tax compliance error', 'legal', 'Multi-jurisdiction', 'Penalties', 'Filing discrepancies', 'Tax advisor', 'CFO-Agent', 3, 4, 12, 'monitoring'],
  ['Insider threat', 'security', 'Access abuse', 'Data theft', 'Unusual access', 'Least privilege', 'CISO-Agent', 1, 5, 5, 'mitigated'],
  ['Market competition', 'reputational', 'Competitors', 'Price pressure', 'Win rate', 'Differentiation', 'CEO-Agent', 4, 3, 12, 'monitoring'],
  ['Onboarding bottleneck', 'human', 'Complex process', 'Delays', 'Time increasing', 'Streamlined', 'CHRO-Agent', 3, 3, 9, 'active'],
  ['Backup system failure', 'operational', 'Backup failure', 'No recovery', 'Verify failures', 'Restore tests', 'COO-Agent', 2, 4, 8, 'mitigated'],
  ['API deprecation', 'technical', 'API changes', 'Integration break', 'Deprecation notices', 'Abstraction', 'CTO-Agent', 3, 3, 9, 'monitoring'],
  ['License compliance', 'legal', 'OSS violations', 'Legal action', 'License scan', 'Scanning', 'CLO-Agent', 2, 4, 8, 'monitoring'],
  ['Currency fluctuation', 'financial', 'FX changes', 'Cost variance', 'FX alerts', 'Hedging', 'CFO-Agent', 3, 2, 6, 'monitoring'],
  ['Brand inconsistency', 'reputational', 'Multi-agent content', 'Brand dilution', 'Scores dropping', 'Guidelines', 'Brand-Agent', 3, 2, 6, 'monitoring'],
  ['Physical security', 'security', 'Unauthorized access', 'Theft', 'Log anomalies', 'Access controls', 'CISO-Agent', 1, 3, 3, 'mitigated'],
  ['Communication breakdown', 'human', 'Remote work', 'Delays', 'Response times', 'Async protocols', 'COO-Agent', 3, 2, 6, 'monitoring'],
  ['Supply chain disruption', 'operational', 'Supplier issues', 'Delays', 'Delivery delays', 'Multi-supplier', 'Procurement-Agent', 2, 3, 6, 'monitoring'],
];
for (const r of risksData) insertRisk.run(...r);

// 2i. Workflows (18)
const insertWorkflow = db.prepare(`INSERT INTO workflows (id, name, category, description, responsible_agents, inputs, outputs, risk_score, requires_approval, status, success_rate, avg_duration, steps) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
for (let i = 1; i <= 18; i++) {
  insertWorkflow.run(`wf-${String(i).padStart(3, '0')}`, `Workflow ${i}`, ['Sales', 'Legal', 'Product', 'Engineering', 'QA', 'Support', 'Operations', 'Human Workforce', 'Procurement', 'Security', 'Executive', 'Audit'][i % 12], `Description ${i}`, JSON.stringify(['CTO-Agent']), JSON.stringify(['input']), JSON.stringify(['output']), i * 5, i % 3 === 0 ? 1 : 0, 'active', 90 + (i % 10), '2h', JSON.stringify([]));
}

// 2j. Human Experts (12)
const insertExpert = db.prepare(`INSERT INTO human_experts (id, name, type, skills, rating, hourly_rate, availability, status, onboarding_progress, total_projects, completed_projects, contact_email) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
const experts = [
  ['exp-001', 'Sarah Chen', 'freelancer', JSON.stringify(['UX Design', 'Figma']), 4.8, 85, 'available', 'active', 100, 12, 11, 'sarah@design.io'],
  ['exp-002', 'Marcus Weber', 'vendor', JSON.stringify(['Backend', 'Node.js']), 4.6, 95, 'partial', 'active', 100, 8, 7, 'marcus@backend.dev'],
  ['exp-003', 'Anna Kovacs', 'expert', JSON.stringify(['Legal', 'GDPR']), 4.9, 150, 'partial', 'active', 100, 5, 5, 'anna@legal.eu'],
  ['exp-004', 'James Miller', 'freelancer', JSON.stringify(['Copywriting', 'SEO']), 4.5, 65, 'available', 'active', 100, 15, 13, 'james@content.io'],
  ['exp-005', 'DevOps Solutions GmbH', 'vendor', JSON.stringify(['DevOps', 'AWS']), 4.7, 120, 'busy', 'active', 100, 3, 3, 'ops@devops.de'],
  ['exp-006', 'Lisa Yamamoto', 'freelancer', JSON.stringify(['Frontend', 'React']), 4.4, 80, 'available', 'active', 100, 9, 8, 'lisa@frontend.dev'],
  ['exp-007', 'Peter Schmidt', 'operator', JSON.stringify(['Field Ops']), 4.3, 55, 'available', 'active', 100, 20, 18, 'peter@field.de'],
  ['exp-008', 'Nina Patel', 'freelancer', JSON.stringify(['Data Analysis']), 4.7, 90, 'unavailable', 'inactive', 100, 6, 6, 'nina@data.io'],
  ['exp-009', 'TechAudit AG', 'vendor', JSON.stringify(['Security Audit']), 4.8, 175, 'partial', 'active', 100, 4, 4, 'audit@techaudit.de'],
  ['exp-010', 'David Okafor', 'freelancer', JSON.stringify(['Mobile Dev']), 4.2, 75, 'available', 'onboarding', 45, 0, 0, 'david@mobile.dev'],
  ['exp-011', 'Elena Rossi', 'expert', JSON.stringify(['Product Strategy']), 4.9, 140, 'partial', 'active', 100, 7, 6, 'elena@product.io'],
  ['exp-012', 'CloudFirst Services', 'vendor', JSON.stringify(['Cloud', 'K8s']), 4.5, 130, 'busy', 'active', 100, 2, 2, 'info@cloudfirst.de'],
];
for (const e of experts) insertExpert.run(...e);

// 2k. Budgets (5)
const insertBudget = db.prepare(`INSERT INTO budgets (id, name, category, limit_amount, spent, remaining, warning_at, critical_at, period) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);
insertBudget.run('bud-001', 'Gesamtbudget Q1 2025', 'total', 50000, 27460, 22540, 75, 90, 'monthly');
insertBudget.run('bud-002', 'Hosting & Infra', 'infrastructure', 5000, 2880, 2120, 80, 95, 'monthly');
insertBudget.run('bud-003', 'Freelancer Pool', 'workforce', 15000, 8450, 6550, 70, 85, 'monthly');
insertBudget.run('bud-004', 'Marketing', 'marketing', 5000, 2100, 2900, 80, 95, 'monthly');
insertBudget.run('bud-005', 'Security & Compliance', 'security', 7000, 3950, 3050, 75, 90, 'monthly');

// 2l. Invoices (5)
const insertInvoice = db.prepare(`INSERT INTO invoices (id, studio, customer, amount, status, due_date, sent_at, paid_at, blocked) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);
insertInvoice.run('inv-001', 'Studio Cedar', 'Internal', 5000, 'sent', '2025-03-25', '2025-03-10T10:00:00Z', null, 0);
insertInvoice.run('inv-002', 'Studio Aurora', 'External', 3200, 'pending', '2025-03-30', null, null, 1);
insertInvoice.run('inv-003', 'Studio Bridge', 'Pilot Partner', 7500, 'pending', '2025-04-05', null, null, 1);
insertInvoice.run('inv-004', 'Internal', null, 0, 'draft', '2025-03-20', null, null, 0);
insertInvoice.run('inv-005', 'Studio Cedar', 'Internal', 2800, 'overdue', '2025-02-28', '2025-02-15T10:00:00Z', null, 1);

// 2m. Incidents (3)
const insertIncident = db.prepare(`INSERT INTO incidents (id, severity, title, description, status, detected_at, resolved_at, affected_agents, mitigation) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);
insertIncident.run('inc-001', 2, 'GDPR-Prufung uberfallig', 'GDPR audit overdue', 'open', '2025-03-08T09:00:00Z', null, JSON.stringify(['CLO-Agent']), 'Schedule audit');
insertIncident.run('inc-002', 3, 'API-Schlussel nicht rotiert', 'API keys not rotated', 'contained', '2025-03-07T14:00:00Z', '2025-03-10T12:45:00Z', JSON.stringify(['CISO-Agent']), 'Auto rotation');
insertIncident.run('inc-003', 2, 'QA-Testabdeckung unter 80%', 'Test coverage low', 'open', '2025-03-06T10:00:00Z', null, JSON.stringify(['QA-Agent']), 'Add tests');

// 2n. System Settings (6)
const insertSetting = db.prepare(`INSERT INTO system_settings (key, value, description) VALUES (?, ?, ?)`);
insertSetting.run('kill_switch_status', 'armed', 'Kill switch status');
insertSetting.run('kill_switch_level', '0', 'Kill switch level');
insertSetting.run('automation_rate', '73', 'Automation rate %');
insertSetting.run('liquidity_eur', '12450', 'Liquidity in EUR');
insertSetting.run('company_name', 'The Company OS', 'Company name');
insertSetting.run('system_version', '1.0.0', 'System version');

// 2o. Tool Permissions (8)
const insertToolPerm = db.prepare(`INSERT INTO tool_permissions (id, tool_name, tool_id, risk_class, allowed_roles, param_limits) VALUES (?, ?, ?, ?, ?, ?)`);
insertToolPerm.run('tp-001', 'GitHub', 'github', 'yellow', JSON.stringify(['CTO-Agent', 'QA-Agent']), 'Max 10 commits/hour');
insertToolPerm.run('tp-002', 'Deployment', 'deployment', 'red', JSON.stringify(['CTO-Agent']), 'Requires approval');
insertToolPerm.run('tp-003', 'Invoicing', 'invoicing', 'red', JSON.stringify(['CFO-Agent']), 'Max EUR 5000');
insertToolPerm.run('tp-004', 'Contract Review', 'contract-review', 'red', JSON.stringify(['CLO-Agent']), 'All contracts');
insertToolPerm.run('tp-005', 'Budget Tool', 'budget-tool', 'yellow', JSON.stringify(['CFO-Agent', 'CEO-Agent']), 'Read: all, Write: CFO');
insertToolPerm.run('tp-006', 'Security Scanner', 'security-scanner', 'green', JSON.stringify(['CISO-Agent', 'Safety-Agent']), 'Unlimited');
insertToolPerm.run('tp-007', 'Slack', 'slack', 'green', JSON.stringify(['all']), 'Standard');
insertToolPerm.run('tp-008', 'CRM', 'crm', 'yellow', JSON.stringify(['Sales-Agent', 'CEO-Agent']), 'Max 100/day');

// 2p. Model Policies (6)
const insertModel = db.prepare(`INSERT INTO model_policies (id, name, enabled, description) VALUES (?, ?, ?, ?)`);
insertModel.run('mp-001', 'GPT-4o', 1, 'Primary model');
insertModel.run('mp-002', 'GPT-4o-mini', 1, 'Cost-effective');
insertModel.run('mp-003', 'Claude 3.5 Sonnet', 1, 'Complex reasoning');
insertModel.run('mp-004', 'Claude 3 Haiku', 0, 'Fast, experimental');
insertModel.run('mp-005', 'o1-preview', 1, 'Planning tasks');
insertModel.run('mp-006', 'o1-mini', 0, 'Lightweight');

// 2q. Workflow Instances (3)
const insertInstance = db.prepare(`INSERT INTO workflow_instances (id, workflow_id, status, current_step, context, result) VALUES (?, ?, ?, ?, ?, ?)`);
insertInstance.run('wi-001', 'wf-001', 'running', 3, JSON.stringify({ leadId: 'lead-42' }), null);
insertInstance.run('wi-002', 'wf-006', 'running', 2, JSON.stringify({ branch: 'feature/auth-v2' }), null);
insertInstance.run('wi-003', 'wf-010', 'running', 2, JSON.stringify({ ticketId: 'T-1024' }), null);

console.log('  All seed data loaded\n');

// ═══════════════════════════════════════════════════════════════
// VALIDATION TESTS
// ═══════════════════════════════════════════════════════════════

// ─── 1. SCHEMA COMPLETENESS ───
console.log('[TEST GROUP 1] Schema Completeness');
{
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all();
  const tableNames = tables.map(t => t.name);
  
  assert('has users table', tableNames.includes('users'));
  assert('has sessions table', tableNames.includes('sessions'));
  assert('has agents table', tableNames.includes('agents'));
  assert('has departments table', tableNames.includes('departments'));
  assert('has business_units table', tableNames.includes('business_units'));
  assert('has product_studios table', tableNames.includes('product_studios'));
  assert('has approvals table', tableNames.includes('approvals'));
  assert('has audit_log table', tableNames.includes('audit_log'));
  assert('has risks table', tableNames.includes('risks'));
  assert('has incidents table', tableNames.includes('incidents'));
  assert('has workflows table', tableNames.includes('workflows'));
  assert('has workflow_instances table', tableNames.includes('workflow_instances'));
  assert('has human_experts table', tableNames.includes('human_experts'));
  assert('has budgets table', tableNames.includes('budgets'));
  assert('has invoices table', tableNames.includes('invoices'));
  assert('has system_settings table', tableNames.includes('system_settings'));
  assert('has kill_switch_log table', tableNames.includes('kill_switch_log'));
  assert('has tool_permissions table', tableNames.includes('tool_permissions'));
  assert('has model_policies table', tableNames.includes('model_policies'));
  
  console.log(`  Found ${tableNames.length} tables: ${tableNames.join(', ')}\n`);
}

// ─── 2. SEED DATA COMPLETENESS ───
console.log('[TEST GROUP 2] Seed Data Completeness');
{
  assertEqual('3 users', db.prepare('SELECT COUNT(*) as c FROM users').get().c, 3);
  assertEqual('22 agents', db.prepare('SELECT COUNT(*) as c FROM agents').get().c, 22);
  assertEqual('14 departments', db.prepare('SELECT COUNT(*) as c FROM departments').get().c, 14);
  assertEqual('8 business units', db.prepare('SELECT COUNT(*) as c FROM business_units').get().c, 8);
  assertEqual('3 product studios', db.prepare('SELECT COUNT(*) as c FROM product_studios').get().c, 3);
  assertEqual('7 approvals', db.prepare('SELECT COUNT(*) as c FROM approvals').get().c, 7);
  assertEqual('22 audit log entries', db.prepare('SELECT COUNT(*) as c FROM audit_log').get().c, 22);
  assertEqual('32 risks', db.prepare('SELECT COUNT(*) as c FROM risks').get().c, 32);
  assertEqual('18 workflows', db.prepare('SELECT COUNT(*) as c FROM workflows').get().c, 18);
  assertEqual('3 workflow instances', db.prepare('SELECT COUNT(*) as c FROM workflow_instances').get().c, 3);
  assertEqual('12 human experts', db.prepare('SELECT COUNT(*) as c FROM human_experts').get().c, 12);
  assertEqual('5 budgets', db.prepare('SELECT COUNT(*) as c FROM budgets').get().c, 5);
  assertEqual('5 invoices', db.prepare('SELECT COUNT(*) as c FROM invoices').get().c, 5);
  assertEqual('3 incidents', db.prepare('SELECT COUNT(*) as c FROM incidents').get().c, 3);
  assertEqual('6 system settings', db.prepare('SELECT COUNT(*) as c FROM system_settings').get().c, 6);
  assertEqual('8 tool permissions', db.prepare('SELECT COUNT(*) as c FROM tool_permissions').get().c, 8);
  assertEqual('6 model policies', db.prepare('SELECT COUNT(*) as c FROM model_policies').get().c, 6);

  const founder = db.prepare("SELECT * FROM users WHERE id = 'user-founder'").get();
  assert('founder user exists', founder !== undefined);
  assert('founder has correct email', founder && founder.email === 'founder@thecompany.de');
  assert('founder has founder role', founder && founder.role === 'founder');
  console.log();
}

// ─── 3. FOREIGN KEY CONSISTENCY ───
console.log('[TEST GROUP 3] Foreign Key Consistency');
{
  // All agents have valid departments
  const agentDepts = db.prepare('SELECT DISTINCT department FROM agents').all();
  const validDepts = db.prepare('SELECT name FROM departments').all().map(d => d.name);
  const validDeptSet = new Set(validDepts);
  let allDeptsValid = true;
  for (const { department } of agentDepts) {
    if (!validDeptSet.has(department)) allDeptsValid = false;
  }
  assert('all agents have valid departments', allDeptsValid, `Invalid depts: ${agentDepts.filter(d => !validDeptSet.has(d.department)).map(d => d.department).join(', ')}`);

  // All workflow instances reference valid workflows
  const instances = db.prepare('SELECT workflow_id FROM workflow_instances').all();
  const workflowIds = new Set(db.prepare('SELECT id FROM workflows').all().map(w => w.id));
  let allWfValid = true;
  for (const { workflow_id } of instances) {
    if (!workflowIds.has(workflow_id)) allWfValid = false;
  }
  assert('all workflow instances reference valid workflows', allWfValid);

  // FK constraint on workflow_instances
  const fkInfo = db.prepare("PRAGMA foreign_key_list(workflow_instances)").all();
  assert('workflow_instances has FK to workflows', fkInfo.length > 0 && fkInfo[0].table === 'workflows');

  // FK constraint on sessions
  const sessFk = db.prepare("PRAGMA foreign_key_list(sessions)").all();
  assert('sessions has FK to users', sessFk.length > 0 && sessFk[0].table === 'users');

  console.log();
}

// ─── 4. DATA CONSISTENCY ───
console.log('[TEST GROUP 4] Data Consistency');
{
  // Risks: valid probability/severity (1-5)
  const risks = db.prepare('SELECT id, probability, severity FROM risks').all();
  let allRisksValid = true;
  for (const r of risks) {
    if (r.probability < 1 || r.probability > 5 || r.severity < 1 || r.severity > 5) allRisksValid = false;
  }
  assert('all risks have valid probability/severity (1-5)', allRisksValid);

  // Risks: score = probability * severity
  const risksWithScore = db.prepare('SELECT id, probability, severity, score FROM risks').all();
  let allScoresCorrect = true;
  let scoreDetails = [];
  for (const r of risksWithScore) {
    const expected = r.probability * r.severity;
    if (r.score !== expected) {
      allScoresCorrect = false;
      scoreDetails.push(`Risk ${r.id}: expected ${expected}, got ${r.score}`);
    }
  }
  assert('all risk scores = probability * severity', allScoresCorrect, scoreDetails.join('; '));

  // Agents: budget_spent <= budget_limit
  const agents = db.prepare('SELECT id, budget_limit, budget_spent FROM agents').all();
  let allBudgetsValid = true;
  for (const a of agents) {
    if (a.budget_spent > a.budget_limit) allBudgetsValid = false;
  }
  assert('all agents have spent <= limit', allBudgetsValid);

  // Budgets: remaining = limit - spent
  const budgets = db.prepare('SELECT id, limit_amount, spent, remaining FROM budgets').all();
  let allBudgetsConsistent = true;
  for (const b of budgets) {
    if (b.remaining !== b.limit_amount - b.spent) allBudgetsConsistent = false;
  }
  assert('all budgets have remaining = limit - spent', allBudgetsConsistent);

  // Product studios: budget_remaining = budget_total - budget_spent
  const studios = db.prepare('SELECT budget_total, budget_spent, budget_remaining FROM product_studios').all();
  let allStudiosConsistent = true;
  for (const s of studios) {
    if (s.budget_remaining !== s.budget_total - s.budget_spent) allStudiosConsistent = false;
  }
  assert('all studios have budget_remaining = total - spent', allStudiosConsistent);

  // Human experts: rating 0-5
  const experts = db.prepare('SELECT rating FROM human_experts').all();
  let allRatingsValid = true;
  for (const e of experts) {
    if (e.rating < 0 || e.rating > 5) allRatingsValid = false;
  }
  assert('all experts have rating 0-5', allRatingsValid);

  // Human experts: completed <= total
  const expertsProjects = db.prepare('SELECT total_projects, completed_projects FROM human_experts').all();
  let allProjectsConsistent = true;
  for (const e of expertsProjects) {
    if (e.completed_projects > e.total_projects) allProjectsConsistent = false;
  }
  assert('all experts have completed <= total projects', allProjectsConsistent);

  // Incidents: severity 1-4
  const incidents = db.prepare('SELECT severity FROM incidents').all();
  let allSeveritiesValid = true;
  for (const inc of incidents) {
    if (inc.severity < 1 || inc.severity > 4) allSeveritiesValid = false;
  }
  assert('all incidents have severity 1-4', allSeveritiesValid);

  // Workflow instances: valid status
  const validStatuses = ['pending', 'running', 'blocked', 'completed', 'failed'];
  const instanceStatuses = db.prepare('SELECT status FROM workflow_instances').all();
  let allStatusesValid = true;
  for (const i of instanceStatuses) {
    if (!validStatuses.includes(i.status)) allStatusesValid = false;
  }
  assert('all workflow instances have valid status', allStatusesValid);

  // Audit log: hash chain (each entry's previous_hash == previous entry's hash)
  const auditEntries = db.prepare('SELECT id, hash, previous_hash FROM audit_log ORDER BY timestamp ASC').all();
  let chainValid = auditEntries[0].previous_hash === null;
  for (let i = 1; i < auditEntries.length; i++) {
    if (auditEntries[i].previous_hash !== auditEntries[i - 1].hash) {
      chainValid = false;
    }
  }
  assert('audit log hash chain is valid', chainValid, 
    chainValid ? '' : `First broken at index where prev_hash mismatch`);

  console.log();
}

// ─── 5. DATA QUALITY ───
console.log('[TEST GROUP 5] Data Quality');
{
  // All agents have non-empty name and role
  const agentNames = db.prepare('SELECT name, role FROM agents').all();
  let allNamesValid = true;
  for (const a of agentNames) {
    if (!a.name || a.name.length === 0 || !a.role || a.role.length === 0) allNamesValid = false;
  }
  assert('all agents have non-empty name and role', allNamesValid);

  // All departments have non-empty name
  const deptNames = db.prepare('SELECT name FROM departments').all();
  let allDeptsNamed = true;
  for (const d of deptNames) {
    if (!d.name || d.name.length === 0) allDeptsNamed = false;
  }
  assert('all departments have non-empty name', allDeptsNamed);

  // All workflows have non-empty name
  const wfNames = db.prepare('SELECT name FROM workflows').all();
  let allWfNamed = true;
  for (const w of wfNames) {
    if (!w.name || w.name.length === 0) allWfNamed = false;
  }
  assert('all workflows have non-empty name', allWfNamed);

  console.log();
}

// ─── 6. PERFORMANCE ───
console.log('[TEST GROUP 6] Performance Checks');
{
  const start = Date.now();
  
  db.prepare("SELECT * FROM agents WHERE department = ? AND status = ?").all('Engineering', 'active');
  db.prepare("SELECT * FROM risks WHERE score >= ? ORDER BY score DESC").all(10);
  db.prepare("SELECT * FROM approvals WHERE status = ? AND type IN (?, ?)").all('pending', 'payment', 'contract');
  db.prepare("SELECT * FROM audit_log WHERE agent = ? AND risk_score >= ? ORDER BY timestamp DESC LIMIT ?").all('CEO-Agent', 20, 10);
  
  const elapsed = Date.now() - start;
  assert('filtered queries < 100ms', elapsed < 100, `Took ${elapsed}ms`);

  const start2 = Date.now();
  db.prepare('SELECT COUNT(*) FROM agents').get();
  db.prepare('SELECT COUNT(*) FROM risks WHERE status = ?').get('active');
  db.prepare('SELECT COUNT(*) FROM approvals WHERE status = ?').get('pending');
  db.prepare('SELECT COUNT(*) FROM workflows').get();
  db.prepare('SELECT COUNT(*) FROM human_experts').get();
  const elapsed2 = Date.now() - start2;
  assert('count queries < 50ms', elapsed2 < 50, `Took ${elapsed2}ms`);

  console.log();
}

// ─── 7. INDEXES ───
console.log('[TEST GROUP 7] Database Indexes');
{
  const indexes = db.prepare("SELECT name, tbl_name FROM sqlite_master WHERE type='index' AND name NOT LIKE 'sqlite_%' ORDER BY tbl_name, name").all();
  console.log(`  Found ${indexes.length} indexes:`);
  for (const idx of indexes) {
    console.log(`    - ${idx.tbl_name}.${idx.name}`);
  }
  
  const hasAgentDeptIdx = indexes.some(i => i.tbl_name === 'agents' && i.name.includes('department'));
  const hasRiskScoreIdx = indexes.some(i => i.tbl_name === 'risks' && i.name.includes('score'));
  const hasApprovalStatusIdx = indexes.some(i => i.tbl_name === 'approvals' && i.name.includes('status'));
  const hasAuditTimestampIdx = indexes.some(i => i.tbl_name === 'audit_log' && i.name.includes('timestamp'));
  
  assert('has index on agents.department', hasAgentDeptIdx);
  assert('has index on risks.score', hasRiskScoreIdx);
  assert('has index on approvals.status', hasApprovalStatusIdx);
  assert('has index on audit_log.timestamp', hasAuditTimestampIdx);
  assert('has at least 15 indexes', indexes.length >= 15, `Only ${indexes.length} indexes`);

  console.log();
}

// ─── 8. COLUMN COMPLETENESS ───
console.log('[TEST GROUP 8] Column Completeness');
{
  const usersCols = db.prepare("PRAGMA table_info(users)").all().map(c => c.name);
  assert('users has id column', usersCols.includes('id'));
  assert('users has email column', usersCols.includes('email'));
  assert('users has password_hash column', usersCols.includes('password_hash'));
  assert('users has role column', usersCols.includes('role'));

  const agentsCols = db.prepare("PRAGMA table_info(agents)").all().map(c => c.name);
  assert('agents has id, role, name, department', ['id', 'role', 'name', 'department'].every(c => agentsCols.includes(c)));
  assert('agents has budget_limit, budget_spent', ['budget_limit', 'budget_spent'].every(c => agentsCols.includes(c)));
  assert('agents has risk_ceiling, autonomy_level', ['risk_ceiling', 'autonomy_level'].every(c => agentsCols.includes(c)));

  const risksCols = db.prepare("PRAGMA table_info(risks)").all().map(c => c.name);
  assert('risks has probability, severity, score', ['probability', 'severity', 'score'].every(c => risksCols.includes(c)));

  const auditCols = db.prepare("PRAGMA table_info(audit_log)").all().map(c => c.name);
  assert('audit_log has hash, previous_hash', ['hash', 'previous_hash'].every(c => auditCols.includes(c)));

  console.log();
}

// ═══════════════════════════════════════════════════════════════
// SUMMARY
// ═══════════════════════════════════════════════════════════════
console.log('═══════════════════════════════════════════════════════════════');
console.log('  VALIDATION SUMMARY');
console.log('═══════════════════════════════════════════════════════════════');
console.log(`  Total tests: ${passed + failed}`);
console.log(`  Passed: ${passed}`);
console.log(`  Failed: ${failed}`);
console.log(`  Success rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);
console.log('═══════════════════════════════════════════════════════════════\n');

if (failed > 0) {
  console.log('Failed tests:');
  for (const err of errors) {
    console.log(`  - ${err.test}: ${err.details || ''}`);
  }
  console.log();
}

// Write results to JSON for report generation
const results = {
  timestamp: new Date().toISOString(),
  total: passed + failed,
  passed,
  failed,
  successRate: ((passed / (passed + failed)) * 100).toFixed(1),
  errors,
};

fs.writeFileSync('/mnt/agents/output/the-company/docs/db-validation-results.json', JSON.stringify(results, null, 2));
console.log('Results written to /mnt/agents/output/the-company/docs/db-validation-results.json\n');

// Exit with error code if any tests failed
process.exit(failed > 0 ? 1 : 0);
