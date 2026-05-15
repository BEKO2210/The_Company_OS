import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain, Wrench, Wallet, Shield, ChevronDown, ChevronUp
} from 'lucide-react';
import { systemSettings } from '@/data/mockData';
import type { SystemSettings } from '@/data/models';
import { cn } from '@/lib/utils';

/* ─── Types ─── */
type TabId = 'model-policies' | 'tool-permissions' | 'budget-limits' | 'rbac-config';

interface TabDef {
  id: TabId;
  label: string;
  icon: React.ElementType;
}

const tabs: TabDef[] = [
  { id: 'model-policies', label: 'Model Policies', icon: Brain },
  { id: 'tool-permissions', label: 'Tool Permissions', icon: Wrench },
  { id: 'budget-limits', label: 'Budget Limits', icon: Wallet },
  { id: 'rbac-config', label: 'RBAC Config', icon: Shield },
];

/* ─── Risk class helper ─── */
function riskClassStyle(riskClass: string) {
  switch (riskClass) {
    case 'green': return { bg: 'bg-[#10B98122]', text: 'text-[#10B981]', label: 'Niedrig' };
    case 'yellow': return { bg: 'bg-[#F59E0B22]', text: 'text-[#F59E0B]', label: 'Mittel' };
    case 'red': return { bg: 'bg-[#EF444422]', text: 'text-[#EF4444]', label: 'Hoch' };
    default: return { bg: 'bg-[#4B556322]', text: 'text-[#9CA3AF]', label: riskClass };
  }
}

/* ─── Main Page ─── */
export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<TabId>('model-policies');

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
      className="max-w-container mx-auto"
    >
      {/* Page Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <p className="text-xs text-text-tertiary mb-1">Dashboard / Einstellungen</p>
            <h1 className="text-display font-bold text-text-primary tracking-tight">EINSTELLUNGEN</h1>
            <p className="text-sm text-text-secondary mt-1">System-Konfiguration, Governance &amp; Zugriffskontrolle</p>
          </div>
          <div className="flex items-center gap-2">
            <button className="px-4 py-2 rounded-button text-sm font-medium bg-accent-teal text-bg-primary hover:opacity-90 transition-all disabled:opacity-50" disabled>
              Anderungen speichern
            </button>
            <button className="px-4 py-2 rounded-button text-sm font-medium text-text-tertiary hover:text-text-primary hover:bg-bg-tertiary transition-all">
              Zurucksetzen
            </button>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-bg-secondary border border-border-subtle rounded-[8px] p-1 flex gap-1 mb-6">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-[6px] text-sm font-medium transition-all duration-150',
                isActive
                  ? 'bg-[#2DD4BF22] text-accent-teal'
                  : 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary'
              )}
            >
              <Icon className="w-4 h-4" strokeWidth={isActive ? 2 : 1.5} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
        >
          {activeTab === 'model-policies' && <ModelPoliciesTab policies={systemSettings.modelPolicy} />}
          {activeTab === 'tool-permissions' && <ToolPermissionsTab permissions={systemSettings.toolPermissions} />}
          {activeTab === 'budget-limits' && <BudgetLimitsTab limits={systemSettings.budgetLimits} />}
          {activeTab === 'rbac-config' && <RBACConfigTab />}
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
}

/* ════════════════════════════════════
   TAB 1: Model Policies
   ════════════════════════════════════ */
function ModelPoliciesTab({ policies }: { policies: SystemSettings['modelPolicy'] }) {
  const [policyStates, setPolicyStates] = useState(
    policies.map(p => ({ ...p, enabled: p.enabled }))
  );

  const togglePolicy = (index: number) => {
    setPolicyStates(prev => prev.map((p, i) => i === index ? { ...p, enabled: !p.enabled } : p));
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <AnimatePresence>
        {policyStates.map((policy, index) => (
          <motion.div
            key={policy.name}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: index * 0.05, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
            className="bg-bg-secondary border border-border-subtle rounded-card p-4 flex items-start gap-4 hover:border-border-default transition-colors"
          >
            {/* Toggle */}
            <button
              onClick={() => togglePolicy(index)}
              className={cn(
                'relative w-9 h-5 rounded-full transition-colors duration-200 shrink-0 mt-0.5',
                policy.enabled ? 'bg-accent-teal' : 'bg-bg-elevated'
              )}
            >
              <div
                className={cn(
                  'absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-200',
                  policy.enabled ? 'left-[18px]' : 'left-0.5'
                )}
              />
            </button>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-text-primary">{policy.name}</h3>
              <p className="text-xs text-text-secondary mt-0.5 leading-relaxed">{policy.description}</p>
            </div>

            {/* Status */}
            <span className={cn(
              'shrink-0 text-[11px] font-medium px-2 py-0.5 rounded',
              policy.enabled ? 'bg-[#10B98122] text-[#10B981]' : 'bg-[#4B556322] text-[#9CA3AF]'
            )}>
              {policy.enabled ? 'Aktiv' : 'Deaktiviert'}
            </span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

/* ════════════════════════════════════
   TAB 2: Tool Permissions
   ════════════════════════════════════ */
function ToolPermissionsTab({ permissions }: { permissions: SystemSettings['toolPermissions'] }) {
  // Augment to 10 tools
  const allTools = [
    ...permissions,
    {
      toolId: 'analytics',
      toolName: 'Analytics',
      riskClass: 'green' as const,
      allowedRoles: ['CEO-Agent', 'CFO-Agent', 'Analytics-Agent'],
      paramLimits: 'Unlimited reads',
    },
    {
      toolId: 'communication',
      toolName: 'Communication',
      riskClass: 'yellow' as const,
      allowedRoles: ['Sales-Agent', 'CEO-Agent', 'CS-Agent'],
      paramLimits: 'Max 500 msg/day',
    },
  ];

  const roles = ['CEO-Agent', 'CTO-Agent', 'CFO-Agent', 'CLO-Agent', 'CISO-Agent', 'COO-Agent', 'CPO-Agent', 'CHRO-Agent', 'Sales-Agent', 'QA-Agent', 'Marketing-Agent', 'CS-Agent'];

  return (
    <div className="space-y-4">
      {/* Legend */}
      <div className="flex items-center gap-4 flex-wrap">
        <span className="text-xs text-text-tertiary font-medium uppercase tracking-wider">Legende:</span>
        <LegendItem bg="bg-[#10B98122]" text="text-[#10B981]" label="RW - Read/Write" />
        <LegendItem bg="bg-[#3B82F622]" text="text-[#3B82F6]" label="R - Read-only" />
        <LegendItem bg="bg-[#F59E0B22]" text="text-[#F59E0B]" label="RO - Read-Only +" />
        <LegendItem bg="bg-transparent" text="text-[#4B5563]" label="— - No access" />
      </div>

      {/* Permission Table */}
      <div className="bg-bg-secondary border border-border-subtle rounded-card overflow-x-auto">
        <table className="w-full min-w-[800px]">
          <thead>
            <tr className="border-b border-border-subtle bg-bg-tertiary">
              <th className="text-left px-4 py-3 text-[11px] font-semibold text-text-tertiary uppercase tracking-wider">Tool</th>
              <th className="text-left px-4 py-3 text-[11px] font-semibold text-text-tertiary uppercase tracking-wider">Risiko</th>
              <th className="text-left px-4 py-3 text-[11px] font-semibold text-text-tertiary uppercase tracking-wider">Erlaubte Rollen</th>
              <th className="text-left px-4 py-3 text-[11px] font-semibold text-text-tertiary uppercase tracking-wider">Parameter-Limits</th>
            </tr>
          </thead>
          <tbody>
            {allTools.map((tool, index) => {
              const rc = riskClassStyle(tool.riskClass);
              return (
                <motion.tr
                  key={tool.toolId}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.2, delay: index * 0.02 }}
                  className="border-b border-border-subtle last:border-0 hover:bg-bg-tertiary/50 transition-colors"
                >
                  <td className="px-4 py-3">
                    <span className="text-sm font-medium text-text-primary">{tool.toolName}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn('text-[11px] font-medium px-2 py-0.5 rounded', rc.bg, rc.text)}>
                      {rc.label}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {tool.allowedRoles.map(role => {
                        const isAll = role === 'all';
                        return (
                          <span
                            key={role}
                            className={cn(
                              'text-[11px] px-1.5 py-0.5 rounded border',
                              isAll
                                ? 'bg-accent-teal/10 text-accent-teal border-accent-teal/30'
                                : 'bg-bg-elevated text-text-secondary border-border-subtle'
                            )}
                          >
                            {isAll ? 'Alle' : role}
                          </span>
                        );
                      })}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-text-secondary">{tool.paramLimits}</td>
                </motion.tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Permission Matrix */}
      <div className="bg-bg-secondary border border-border-subtle rounded-card overflow-x-auto">
        <table className="w-full min-w-[900px]">
          <thead>
            <tr className="border-b border-border-subtle bg-bg-tertiary">
              <th className="text-left px-3 py-3 text-[11px] font-semibold text-text-tertiary uppercase tracking-wider sticky left-0 bg-bg-tertiary">Tool / Rolle</th>
              {roles.map(role => (
                <th key={role} className="text-center px-2 py-3 text-[11px] font-semibold text-text-tertiary uppercase tracking-wider">{role.replace('-Agent', '')}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {allTools.map((tool) => (
              <tr key={tool.toolId} className="border-b border-border-subtle last:border-0 hover:bg-bg-tertiary/50 transition-colors">
                <td className="px-3 py-2.5 sticky left-0 bg-bg-secondary">
                  <span className="text-xs font-medium text-text-primary">{tool.toolName}</span>
                </td>
                {roles.map(role => {
                  const perm = getPermissionLevel(tool, role);
                  return (
                    <td key={role} className="px-2 py-2.5 text-center">
                      <PermissionCell level={perm} />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function LegendItem({ bg, text, label }: { bg: string; text: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className={cn('w-4 h-4 rounded text-[9px] font-bold flex items-center justify-center', bg, text)}>
        {label.startsWith('RW') ? 'RW' : label.startsWith('R -') ? 'R' : label.startsWith('RO') ? 'RO' : '—'}
      </span>
      <span className="text-[11px] text-text-tertiary">{label}</span>
    </div>
  );
}

function PermissionCell({ level }: { level: string }) {
  switch (level) {
    case 'RW':
      return <span className="inline-flex items-center justify-center w-8 h-6 rounded text-[10px] font-bold bg-[#10B98122] text-[#10B981]">RW</span>;
    case 'R':
      return <span className="inline-flex items-center justify-center w-8 h-6 rounded text-[10px] font-bold bg-[#3B82F622] text-[#3B82F6]">R</span>;
    case 'RO':
      return <span className="inline-flex items-center justify-center w-8 h-6 rounded text-[10px] font-bold bg-[#F59E0B22] text-[#F59E0B]">RO</span>;
    default:
      return <span className="inline-flex items-center justify-center w-8 h-6 rounded text-[10px] font-bold text-[#4B5563]">—</span>;
  }
}

function getPermissionLevel(tool: SystemSettings['toolPermissions'][0], role: string): string {
  if (tool.allowedRoles.includes('all')) return 'RW';
  if (tool.allowedRoles.includes(role)) {
    if (tool.toolId === 'github' && role === 'CTO-Agent') return 'RW';
    if (tool.toolId === 'github' && role === 'QA-Agent') return 'R';
    if (tool.toolId === 'deployment' && role === 'CTO-Agent') return 'RW';
    if (tool.toolId === 'invoicing' && role === 'CFO-Agent') return 'RW';
    if (tool.toolId === 'contract-review' && role === 'CLO-Agent') return 'RW';
    if (tool.toolId === 'budget-tool' && role === 'CFO-Agent') return 'RW';
    if (tool.toolId === 'budget-tool' && role === 'CEO-Agent') return 'R';
    if (tool.toolId === 'security-scanner' && (role === 'CISO-Agent' || role === 'Safety-Agent')) return 'RW';
    if (tool.toolId === 'slack') return 'RW';
    if (tool.toolId === 'crm' && (role === 'Sales-Agent' || role === 'CEO-Agent')) return 'RW';
    if (tool.toolId === 'analytics' && role === 'Analytics-Agent') return 'RW';
    if (tool.toolId === 'analytics' && (role === 'CEO-Agent' || role === 'CFO-Agent')) return 'R';
    if (tool.toolId === 'communication' && role === 'CS-Agent') return 'RW';
    if (tool.toolId === 'communication' && (role === 'Sales-Agent' || role === 'CEO-Agent')) return 'R';
    return 'R';
  }
  return '—';
}

/* ════════════════════════════════════
   TAB 3: Budget Limits
   ════════════════════════════════════ */
function BudgetLimitsTab({ limits }: { limits: SystemSettings['budgetLimits'] }) {
  // Additional guardrails
  const guardrails = [
    { label: 'Monatliches Gesamtbudget', value: 'EUR 12.000', current: 'EUR 8.200 verbraucht (68%)', percent: 68, alertAt: '90% — EUR 10.800', color: 'bg-status-yellow' },
    { label: 'Max. Budget pro Projekt', value: 'EUR 5.000', description: 'Kein Projekt darf mehr als EUR 5.000 ohne gesonderte Freigabe verbrauchen.' },
    { label: 'Auto-Freigabe Schwelle', value: 'EUR 100', description: 'Ausgaben unter diesem Betrag werden automatisch genehmigt.' },
    { label: 'Notfallreserve', value: 'EUR 2.000', description: 'Dieser Betrag ist fur Notfalle reserviert und erfordert immer Human-Approval.', untouched: true },
  ];

  // Per-agent budget
  const agentBudgets = [
    { agent: 'CEO-Agent', monthly: 500, spent: 0, status: 'OK', statusColor: 'text-status-green' },
    { agent: 'CTO-Agent', monthly: 2000, spent: 1800, status: 'WARNUNG', statusColor: 'text-status-yellow' },
    { agent: 'CFO-Agent', monthly: 1000, spent: 600, status: 'OK', statusColor: 'text-status-green' },
    { agent: 'Marketing-Agent', monthly: 800, spent: 450, status: 'OK', statusColor: 'text-status-green' },
    { agent: 'Sales-Agent', monthly: 300, spent: 120, status: 'OK', statusColor: 'text-status-green' },
  ];

  return (
    <div className="space-y-6">
      {/* Guardrail Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {guardrails.map((g, index) => (
          <motion.div
            key={g.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: index * 0.05 }}
            className="bg-bg-secondary border border-border-subtle rounded-card p-4 hover:border-border-default transition-colors"
          >
            <div className="flex items-start justify-between mb-2">
              <div>
                <p className="text-[11px] text-text-tertiary uppercase tracking-wider">{g.label}</p>
                <p className="text-lg font-semibold font-mono text-text-primary mt-1">{g.value}</p>
              </div>
              {g.untouched && (
                <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-[#10B98122] text-[#10B981]">
                  Nicht angetastet
                </span>
              )}
            </div>

            {'percent' in g && (
              <>
                <div className="w-full h-2 bg-bg-tertiary rounded-full overflow-hidden mt-2">
                  <div className={cn('h-full rounded-full transition-all duration-500', g.color)} style={{ width: `${g.percent}%` }} />
                </div>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-[11px] text-text-tertiary">{g.current}</span>
                  <span className="text-[11px] text-text-muted">Alert: {g.alertAt}</span>
                </div>
              </>
            )}

            {g.description && (
              <p className="text-xs text-text-secondary mt-2">{g.description}</p>
            )}
          </motion.div>
        ))}
      </div>

      {/* Category Limits */}
      <div>
        <h3 className="text-sm font-semibold text-text-primary mb-3">Kategorie-Limits</h3>
        <div className="bg-bg-secondary border border-border-subtle rounded-card overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4">
            {limits.map((limit, index) => {
              const percent = Math.round((limit.limit > 0 ? 0.4 : 0) * 100); // Mock percent
              return (
                <motion.div
                  key={limit.category}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: index * 0.05 }}
                  className="border border-border-subtle rounded-card p-3 bg-bg-secondary"
                >
                  <p className="text-[11px] text-text-tertiary uppercase tracking-wider">{limit.category}</p>
                  <p className="text-base font-semibold font-mono text-text-primary mt-1">
                    EUR {limit.limit.toLocaleString()}
                  </p>
                  <p className="text-[11px] text-text-tertiary mt-0.5 capitalize">{limit.period}</p>
                  <div className="w-full h-1.5 bg-bg-tertiary rounded-full overflow-hidden mt-2">
                    <div className="h-full bg-accent-teal rounded-full transition-all duration-500" style={{ width: `${Math.min(percent + 30, 100)}%` }} />
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Per-Agent Budget Table */}
      <div>
        <h3 className="text-sm font-semibold text-text-primary mb-3">Budget pro Agent</h3>
        <div className="bg-bg-secondary border border-border-subtle rounded-card overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border-subtle bg-bg-tertiary">
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-text-tertiary uppercase tracking-wider">Agent</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-text-tertiary uppercase tracking-wider">Monatlich</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-text-tertiary uppercase tracking-wider">Verbraucht</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-text-tertiary uppercase tracking-wider">Verfugbar</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-text-tertiary uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody>
              {agentBudgets.map((ab) => (
                <tr key={ab.agent} className="border-b border-border-subtle last:border-0 hover:bg-bg-tertiary/50 transition-colors">
                  <td className="px-4 py-3 text-sm font-medium text-text-primary">{ab.agent}</td>
                  <td className="px-4 py-3 text-sm font-mono text-text-primary">EUR {ab.monthly.toLocaleString()}</td>
                  <td className="px-4 py-3 text-sm font-mono text-text-secondary">EUR {ab.spent.toLocaleString()}</td>
                  <td className="px-4 py-3 text-sm font-mono text-text-primary">EUR {(ab.monthly - ab.spent).toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <span className={cn('text-[11px] font-medium', ab.statusColor)}>{ab.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════
   TAB 4: RBAC Config
   ════════════════════════════════════ */
function RBACConfigTab() {
  const [expandedRoles, setExpandedRoles] = useState<Set<string>>(new Set());

  const toggleRole = (id: string) => {
    setExpandedRoles(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const roleHierarchy = [
    {
      id: 'human-ceo', name: 'Human CEO (Gründer)', level: 'Root', color: 'text-accent-teal', borderColor: 'border-accent-teal',
      permissions: ['Vollzugriff', 'Kill Switch', 'Alle Approvals'],
      children: [
        {
          id: 'ceo-agent', name: 'CEO-Agent', level: 'C-Level', color: 'text-accent-purple', borderColor: 'border-accent-purple',
          permissions: ['Strategie', 'Reporting', 'Budget-Approval >5k'],
          children: [
            { id: 'coo-agent', name: 'COO-Agent', level: 'C-Level', color: 'text-accent-purple', borderColor: 'border-accent-purple', permissions: ['Operations', 'Workflows', 'Task-Management'] },
            { id: 'cto-agent', name: 'CTO-Agent', level: 'C-Level', color: 'text-accent-purple', borderColor: 'border-accent-purple', permissions: ['Engineering', 'Deployment', 'Code-Review'] },
            { id: 'cfo-agent', name: 'CFO-Agent', level: 'C-Level', color: 'text-accent-purple', borderColor: 'border-accent-purple', permissions: ['Finanzen', 'Budget', 'Invoicing'] },
            { id: 'clo-agent', name: 'CLO-Agent', level: 'C-Level', color: 'text-accent-purple', borderColor: 'border-accent-purple', permissions: ['Legal', 'Contracts', 'Compliance'] },
            { id: 'ciso-agent', name: 'CISO-Agent', level: 'C-Level', color: 'text-accent-purple', borderColor: 'border-accent-purple', permissions: ['Security', 'Threat-Response', 'Policy'] },
            { id: 'cpo-agent', name: 'CPO-Agent', level: 'C-Level', color: 'text-accent-purple', borderColor: 'border-accent-purple', permissions: ['Product', 'Roadmap', 'Feature-Prio'] },
            { id: 'chro-agent', name: 'CHRO-Agent', level: 'C-Level', color: 'text-accent-purple', borderColor: 'border-accent-purple', permissions: ['Workforce', 'Onboarding', 'HR'] },
          ],
        },
        {
          id: 'directors', name: 'Department Directors', level: 'Director', color: 'text-accent-blue', borderColor: 'border-accent-blue',
          permissions: ['Department-Scope'],
          isGroup: true,
          children: [
            { id: 'brand-agent', name: 'Brand-Agent', level: 'Director', color: 'text-accent-blue', borderColor: 'border-accent-blue', permissions: ['Branding', 'Design-System'] },
            { id: 'sales-agent', name: 'Sales-Agent', level: 'Director', color: 'text-accent-blue', borderColor: 'border-accent-blue', permissions: ['Sales', 'CRM', 'Lead-Mgmt'] },
            { id: 'qa-agent', name: 'QA-Agent', level: 'Director', color: 'text-accent-blue', borderColor: 'border-accent-blue', permissions: ['QA', 'Testing', 'Coverage-Check'] },
            { id: 'safety-agent', name: 'Safety-Agent', level: 'Director', color: 'text-accent-blue', borderColor: 'border-accent-blue', permissions: ['Safety-Veto', 'Kill-Switch-Trigger', 'Risk-Assessment'] },
            { id: 'audit-agent', name: 'Audit-Agent', level: 'Director', color: 'text-accent-blue', borderColor: 'border-accent-blue', permissions: ['Audit', 'Compliance-Check', 'Logging'] },
            { id: 'marketing-agent', name: 'Marketing-Agent', level: 'Director', color: 'text-accent-blue', borderColor: 'border-accent-blue', permissions: ['Marketing', 'Content', 'Campaigns'],
              children: [
                { id: 'procurement-agent', name: 'Procurement-Agent', level: 'Manager', color: 'text-status-green', borderColor: 'border-status-green', permissions: ['Purchasing', 'Vendor-Mgmt'] },
                { id: 'cs-agent', name: 'Customer-Support-Agent', level: 'Manager', color: 'text-status-green', borderColor: 'border-status-green', permissions: ['Support', 'Tickets', 'Chat'] },
                { id: 'field-ops-agent', name: 'Field-Operations-Agent', level: 'Manager', color: 'text-status-green', borderColor: 'border-status-green', permissions: ['Field-Ops', 'Logistics'] },
                { id: 'knowledge-agent', name: 'Knowledge-Agent', level: 'Manager', color: 'text-status-green', borderColor: 'border-status-green', permissions: ['Knowledge-Base', 'Docs'] },
                { id: 'pricing-agent', name: 'Pricing-Agent', level: 'Specialist', color: 'text-text-tertiary', borderColor: 'border-text-tertiary', permissions: ['Pricing', 'Analysis'] },
                { id: 'doc-agent', name: 'Doc-Agent', level: 'Specialist', color: 'text-text-tertiary', borderColor: 'border-text-tertiary', permissions: ['Documentation', 'Generation'] },
                { id: 'analytics-agent', name: 'Analytics-Agent', level: 'Specialist', color: 'text-text-tertiary', borderColor: 'border-text-tertiary', permissions: ['Analytics', 'Reporting'] },
              ],
            },
          ],
        },
      ],
    },
  ];

  const levelColors: Record<string, { bg: string; text: string }> = {
    'Root': { bg: 'bg-[#2DD4BF22]', text: 'text-[#2DD4BF]' },
    'C-Level': { bg: 'bg-[#8B5CF622]', text: 'text-[#8B5CF6]' },
    'Director': { bg: 'bg-[#3B82F622]', text: 'text-[#3B82F6]' },
    'Manager': { bg: 'bg-[#10B98122]', text: 'text-[#10B981]' },
    'Specialist': { bg: 'bg-[#6B728022]', text: 'text-[#6B7280]' },
  };

  return (
    <div className="space-y-4">
      {/* Level Legend */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-xs text-text-tertiary font-medium uppercase tracking-wider">Berechtigungsstufen:</span>
        {Object.entries(levelColors).map(([level, colors]) => (
          <div key={level} className="flex items-center gap-1.5">
            <span className={cn('w-3 h-3 rounded-full', colors.bg.replace('22', '44'))} />
            <span className={cn('text-[11px] font-medium', colors.text)}>{level}</span>
          </div>
        ))}
      </div>

      {/* Role Tree */}
      <div className="bg-bg-secondary border border-border-subtle rounded-card p-6">
        {roleHierarchy.map(role => (
          <RoleNode
            key={role.id}
            role={role}
            expandedRoles={expandedRoles}
            toggleRole={toggleRole}
            levelColors={levelColors}
            depth={0}
          />
        ))}
      </div>
    </div>
  );
}

/* ─── Role Node (recursive) ─── */
interface RoleNodeData {
  id: string;
  name: string;
  level: string;
  color: string;
  borderColor: string;
  permissions: string[];
  isGroup?: boolean;
  children?: RoleNodeData[];
}

function RoleNode({
  role,
  expandedRoles,
  toggleRole,
  levelColors,
  depth,
}: {
  role: RoleNodeData;
  expandedRoles: Set<string>;
  toggleRole: (id: string) => void;
  levelColors: Record<string, { bg: string; text: string }>;
  depth: number;
}) {
  const isExpanded = expandedRoles.has(role.id);
  const hasChildren = role.children && role.children.length > 0;
  const lc = levelColors[role.level] || { bg: 'bg-[#4B556322]', text: 'text-[#9CA3AF]' };

  return (
    <div className={cn(depth > 0 && 'ml-4 border-l border-border-subtle pl-4')}> {/* CHANGED: ml-6 to ml-4, pl-6 to pl-4 */}
      <motion.div
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.2 }}
        className={cn(
          'flex items-center gap-3 py-2 px-3 rounded-card border transition-all duration-200 mb-1',
          'bg-bg-secondary border-border-subtle hover:border-border-default',
          depth === 0 && 'border-l-4',
          depth === 0 && role.borderColor
        )}
      >
        {/* Expand toggle */}
        {hasChildren ? (
          <button
            onClick={() => toggleRole(role.id)}
            className="text-text-tertiary hover:text-text-primary transition-colors shrink-0"
          >
            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
        ) : (
          <div className="w-4 shrink-0" />
        )}

        {/* Role info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-text-primary">{role.name}</span>
            <span className={cn('text-[10px] font-medium px-1.5 py-0.5 rounded', lc.bg, lc.text)}>
              {role.level}
            </span>
          </div>
        </div>

        {/* Permissions summary */}
        <div className="hidden md:flex items-center gap-1 flex-wrap">
          {role.permissions.slice(0, 3).map(p => (
            <span key={p} className="text-[10px] text-text-tertiary bg-bg-elevated px-1.5 py-0.5 rounded border border-border-subtle">
              {p}
            </span>
          ))}
          {role.permissions.length > 3 && (
            <span className="text-[10px] text-text-muted">+{role.permissions.length - 3}</span>
          )}
        </div>

        {/* Direct reports count */}
        {hasChildren && (
          <span className="text-[11px] text-text-tertiary shrink-0">
            {role.children!.length} {role.children!.length === 1 ? 'Report' : 'Reports'}
          </span>
        )}
      </motion.div>

      {/* Children */}
      <AnimatePresence>
        {hasChildren && isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            {role.children!.map(child => (
              <RoleNode
                key={child.id}
                role={child}
                expandedRoles={expandedRoles}
                toggleRole={toggleRole}
                levelColors={levelColors}
                depth={depth + 1}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
