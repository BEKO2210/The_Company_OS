import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bot,
  Search,
  ChevronDown,
  Plus,
  Download,
  Eye,
  X,
  Wallet,
  Wrench,
  Shield,
  UserCheck,
  BarChart3,
  Activity,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { agents } from '@/data/mockData';
import type { Agent } from '@/data/models';

/* ─── Status Helpers ─── */
const statusConfig: Record<string, { label: string; dotClass: string; badgeClass: string }> = {
  active: { label: 'aktiv', dotClass: 'status-dot-green', badgeClass: 'badge-green' },
  paused: { label: 'standby', dotClass: 'status-dot-yellow', badgeClass: 'badge-yellow' },
  quarantine: { label: 'blockiert', dotClass: 'status-dot-red', badgeClass: 'badge-red' },
  offline: { label: 'inaktiv', dotClass: 'status-dot-gray', badgeClass: 'badge-gray' },
};

/* ─── Risk Ceiling Helpers ─── */
const riskConfig: Record<string, { label: string; letter: string; badgeClass: string }> = {
  critical: { label: 'A (Strategisch)', letter: 'A', badgeClass: 'badge-purple' },
  high: { label: 'B (Taktisch)', letter: 'B', badgeClass: 'badge-blue' },
  medium: { label: 'C (Operational)', letter: 'C', badgeClass: 'badge-teal' },
  low: { label: 'D (Routiniert)', letter: 'D', badgeClass: 'badge-gray' },
};

/* ─── Role Helpers ─── */
function roleTier(role: string): string {
  if (role.includes('CEO') || role.includes('COO') || role.includes('CTO') || role.includes('CFO') || role.includes('CLO') || role.includes('CISO') || role.includes('CPO') || role.includes('CHRO'))
    return 'C-Level';
  if (role.includes('Director')) return 'Director';
  if (role.includes('VP')) return 'VP-Level';
  if (role.includes('Manager') || role.includes('Support') || role.includes('Procurement')) return 'Manager';
  if (role.includes('Human')) return 'Human';
  return 'Specialist';
}

const roleBadgeClass: Record<string, string> = {
  'C-Level': 'badge-purple',
  'VP-Level': 'badge-blue',
  Director: 'badge-teal',
  Manager: 'badge-yellow',
  Specialist: 'badge-green',
  Human: 'badge-orange',
};

/* ─── Filter Options ─── */
const statusOptions = ['all', 'active', 'paused', 'quarantine', 'offline'] as const;
const riskOptions = ['all', 'critical', 'high', 'medium', 'low'] as const;

const departmentOptions = ['all', ...new Set(agents.map((a) => a.department))] as const;

/* ─── Avatar Initials ─── */
function getInitials(name: string): string {
  if (name === 'Founder') return 'H';
  return name
    .split(/[-\s]+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

/* ─── Animation ─── */
const drawerEase = [0.16, 1, 0.3, 1] as [number, number, number, number];

const tableRowVariants = {
  hidden: { opacity: 0, x: -10 },
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: { duration: 0.3, delay: i * 0.03, ease: drawerEase },
  }),
};

/* ─── Detail Drawer Component ─── */
function AgentDetailDrawer({
  agent,
  onClose,
}: {
  agent: Agent | null;
  onClose: () => void;
}) {
  const [activeTab, setActiveTab] = useState<'profile' | 'tasks' | 'approvals' | 'activity'>('profile');

  if (!agent) return null;

  const status = statusConfig[agent.status] ?? statusConfig.active;
  const risk = riskConfig[agent.riskCeiling] ?? riskConfig.low;
  const tier = roleTier(agent.role);
  const isHuman = agent.id === 'human-ceo';
  const budgetFormatted = new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(agent.budgetLimit);

  const tabs: { key: typeof activeTab; label: string }[] = [
    { key: 'profile', label: 'Profil' },
    { key: 'tasks', label: 'Aufgaben' },
    { key: 'approvals', label: 'Genehmigungen' },
    { key: 'activity', label: 'Aktivitat' },
  ];

  return (
    <>
      {/* Overlay */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/60 backdrop-blur-[4px] z-[60]"
      />
      {/* Drawer */}
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ duration: 0.25, ease: drawerEase }}
        className="fixed right-0 top-0 h-full w-full max-w-[480px] bg-bg-tertiary border-l border-border-default z-[70] flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="flex-shrink-0 p-6 border-b border-border-subtle">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-4">
              {/* Avatar */}
              <div
                className={cn(
                  'w-16 h-16 rounded-full flex items-center justify-center flex-shrink-0',
                  isHuman
                    ? 'bg-[#F97316]'
                    : 'bg-[#2DD4BF]'
                )}
              >
                <span className="text-lg font-semibold text-white">{getInitials(agent.name)}</span>
              </div>
              <div>
                <h2 className="text-xl font-bold text-text-primary tracking-tight">{agent.name}</h2>
                <p className="text-xs text-text-tertiary font-mono-data mt-0.5">
                  {isHuman ? 'H-001' : agent.id.replace(/-/g, '-').toUpperCase()}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-button text-text-tertiary hover:text-text-primary hover:bg-bg-elevated transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Badges */}
          <div className="flex items-center gap-2 mb-4">
            <span className={cn('text-[11px] font-medium px-2.5 py-1 rounded-full', roleBadgeClass[tier] || 'badge-gray')}>
              {tier}
            </span>
            <span className="text-xs text-text-secondary bg-bg-elevated px-2.5 py-1 rounded-full">
              {agent.department}
            </span>
          </div>

          {/* Tabs */}
          <div className="flex gap-1">
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                className={cn(
                  'px-3 py-1.5 rounded-button text-xs font-medium transition-colors',
                  activeTab === t.key
                    ? 'bg-accent-teal/15 text-accent-teal'
                    : 'text-text-tertiary hover:text-text-secondary hover:bg-bg-elevated'
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <AnimatePresence mode="wait">
            {activeTab === 'profile' && (
              <motion.div
                key="profile"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                {/* Status */}
                <div>
                  <p className="text-[10px] text-text-tertiary uppercase tracking-wide mb-2 flex items-center gap-1">
                    <Activity className="w-3 h-3" />
                    Status
                  </p>
                  <div className="flex items-center gap-2">
                    <span className={cn('status-dot w-3 h-3', status.dotClass)} />
                    <span className="text-sm text-text-primary font-medium">{status.label}</span>
                  </div>
                </div>

                {/* Risk Ceiling */}
                <div>
                  <p className="text-[10px] text-text-tertiary uppercase tracking-wide mb-2 flex items-center gap-1">
                    <Shield className="w-3 h-3" />
                    Risk Ceiling
                  </p>
                  <div className="flex items-center gap-2">
                    <span className={cn('text-sm font-semibold px-3 py-1 rounded-full', risk.badgeClass)}>
                      {risk.letter}
                    </span>
                    <span className="text-sm text-text-secondary">{risk.label}</span>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <p className="text-[10px] text-text-tertiary uppercase tracking-wide mb-2">Beschreibung</p>
                  <p className="text-sm text-text-secondary leading-relaxed">{agent.description}</p>
                </div>

                {/* Budget */}
                <div>
                  <p className="text-[10px] text-text-tertiary uppercase tracking-wide mb-2 flex items-center gap-1">
                    <Wallet className="w-3 h-3" />
                    Budget-Limit
                  </p>
                  <p className="text-lg font-mono-data font-medium text-text-primary">{budgetFormatted}</p>
                </div>

                {/* Allowed Tools */}
                <div>
                  <p className="text-[10px] text-text-tertiary uppercase tracking-wide mb-2 flex items-center gap-1">
                    <Wrench className="w-3 h-3" />
                    Erlaubte Tools
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {agent.allowedTools.map((tool) => (
                      <span
                        key={tool}
                        className="text-xs bg-bg-elevated text-text-secondary px-2.5 py-1 rounded-md border border-border-subtle"
                      >
                        {tool}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Human Approval Rules */}
                {agent.humanApprovalRules.length > 0 && (
                  <div>
                    <p className="text-[10px] text-text-tertiary uppercase tracking-wide mb-2 flex items-center gap-1">
                      <UserCheck className="w-3 h-3" />
                      Human-Approval erforderlich
                    </p>
                    <div className="space-y-1.5">
                      {agent.humanApprovalRules.map((rule, i) => (
                        <div
                          key={i}
                          className="flex items-start gap-2 text-sm text-text-secondary bg-bg-elevated/50 p-2.5 rounded-lg border border-border-subtle"
                        >
                          <Shield className="w-3.5 h-3.5 text-status-red flex-shrink-0 mt-0.5" />
                          {rule}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* KPIs */}
                <div>
                  <p className="text-[10px] text-text-tertiary uppercase tracking-wide mb-2 flex items-center gap-1">
                    <BarChart3 className="w-3 h-3" />
                    KPIs
                  </p>
                  <div className="space-y-2">
                    {agent.kpis.map((kpi) => (
                      <div key={kpi.name} className="bg-bg-elevated/50 rounded-lg p-3 border border-border-subtle">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-text-secondary">{kpi.name}</span>
                          <span className="text-xs font-mono-data text-text-primary font-medium">{kpi.value}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-bg-tertiary rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{
                                width: `${Math.min(100, (parseFloat(kpi.value.replace(/[^0-9.]/g, '')) / parseFloat(kpi.target.replace(/[^0-9.]/g, ''))) * 100 || 50)}%`,
                              }}
                              transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] as [number, number, number, number] }}
                              className="h-full bg-accent-teal rounded-full"
                            />
                          </div>
                          <span className="text-[10px] text-text-tertiary">Ziel: {kpi.target}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Version & Meta */}
                <div className="pt-2 border-t border-border-subtle">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-[10px] text-text-tertiary uppercase tracking-wide mb-1">Version</p>
                      <p className="text-sm font-mono-data text-text-primary">{agent.version}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-text-tertiary uppercase tracking-wide mb-1">Owner</p>
                      <p className="text-sm text-text-secondary">{agent.ownerHuman}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-text-tertiary uppercase tracking-wide mb-1">Autonomie</p>
                      <p className="text-sm text-text-secondary capitalize">{agent.autonomyLevel.replace(/-/g, ' ')}</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'tasks' && (
              <motion.div
                key="tasks"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="space-y-3"
              >
                <p className="text-sm text-text-secondary">
                  Zugewiesene Aufgaben und aktuelle Projekte fur {agent.name}.
                </p>
                {/* Placeholder tasks */}
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="bg-bg-elevated/50 rounded-lg p-3 border border-border-subtle"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="status-dot status-dot-yellow" />
                      <span className="text-sm font-medium text-text-primary">Task {i}</span>
                      <span className="text-[10px] badge-yellow ml-auto">Hoch</span>
                    </div>
                    <p className="text-xs text-text-tertiary">In Bearbeitung - Vor {i * 10}m aktualisiert</p>
                  </div>
                ))}
              </motion.div>
            )}

            {activeTab === 'approvals' && (
              <motion.div
                key="approvals"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                <div className="bg-bg-elevated/50 rounded-lg p-4 border border-border-subtle">
                  <p className="text-sm font-medium text-text-primary mb-2">Genehmigungsgrenzen</p>
                  <p className="text-sm text-text-secondary">{agent.name} kann folgende Entscheidungen treffen:</p>
                  <ul className="mt-2 space-y-1.5">
                    {agent.humanApprovalRules.length > 0 ? (
                      agent.humanApprovalRules.map((rule, i) => (
                        <li key={i} className="text-sm text-text-secondary flex items-start gap-2">
                          <span className="text-accent-teal mt-1">-</span>
                          {rule}
                        </li>
                      ))
                    ) : (
                      <li className="text-sm text-text-secondary flex items-start gap-2">
                        <span className="text-accent-teal mt-1">-</span>
                        Keine spezifischen Genehmigungsgrenzen definiert
                      </li>
                    )}
                  </ul>
                </div>
              </motion.div>
            )}

            {activeTab === 'activity' && (
              <motion.div
                key="activity"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="space-y-3"
              >
                <p className="text-sm text-text-secondary">
                  Aktivitatslog fur {agent.name}.
                </p>
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-border-default mt-1.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm text-text-secondary">Aktion durchgefuhrt</p>
                      <p className="text-xs text-text-tertiary">Vor {i * 15}m</p>
                    </div>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 p-4 border-t border-border-subtle flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-button border border-border-default text-text-secondary text-sm hover:bg-bg-elevated transition-colors"
          >
            Schliessen
          </button>
          <button className="px-4 py-2 rounded-button bg-accent-teal text-bg-primary text-sm font-medium hover:opacity-90 transition-opacity">
            Bearbeiten
          </button>
        </div>
      </motion.div>
    </>
  );
}

export default function AgentRegistryPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<typeof statusOptions[number]>('all');
  const [deptFilter, setDeptFilter] = useState<typeof departmentOptions[number]>('all');
  const [riskFilter, setRiskFilter] = useState<typeof riskOptions[number]>('all');
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);

  /* ── Dropdown states ── */
  const [statusOpen, setStatusOpen] = useState(false);
  const [deptOpen, setDeptOpen] = useState(false);
  const [riskOpen, setRiskOpen] = useState(false);

  /* ── Filtered agents ── */
  const filteredAgents = useMemo(() => {
    let list = [...agents];

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (a) =>
          a.name.toLowerCase().includes(q) ||
          a.role.toLowerCase().includes(q) ||
          a.department.toLowerCase().includes(q)
      );
    }

    if (statusFilter !== 'all') {
      list = list.filter((a) => a.status === statusFilter);
    }

    if (deptFilter !== 'all') {
      list = list.filter((a) => a.department === deptFilter);
    }

    if (riskFilter !== 'all') {
      list = list.filter((a) => a.riskCeiling === riskFilter);
    }

    return list;
  }, [search, statusFilter, deptFilter, riskFilter]);

  const activeCount = agents.filter((a) => a.status === 'active').length;
  const pausedCount = agents.filter((a) => a.status === 'paused').length;
  const quarantineCount = agents.filter((a) => a.status === 'quarantine').length;
  const humanCount = agents.filter((a) => a.autonomyLevel === 'human-only').length;
  const aiCount = agents.length - humanCount;
  1;
  const cLevelCount = agents.filter((a) => roleTier(a.role) === 'C-Level').length;

  const hasFilters = search || statusFilter !== 'all' || deptFilter !== 'all' || riskFilter !== 'all';

  const statusLabel = (s: string) => statusConfig[s]?.label ?? s;
  const riskLabel = (r: string) => riskConfig[r]?.label ?? r;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3, ease: drawerEase }}
      className="max-w-container mx-auto"
    >
      {/* ═══ Page Header ═══ */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: drawerEase }}
        className="mb-6"
      >
        <p className="text-xs text-text-tertiary mb-1">Dashboard / Agenten</p>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-display font-bold text-text-primary tracking-tight">AGENT REGISTRY</h1>
            <div className="flex items-center gap-3 mt-1">
              <p className="text-sm text-text-secondary">
                {agents.length} Agenten - {humanCount} Human, {aiCount} AI-Agenten
              </p>
              {/* Summary pills */}
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] badge-green px-2 py-0.5 rounded-full">
                  {activeCount} aktiv
                </span>
                <span className="text-[11px] badge-yellow px-2 py-0.5 rounded-full">
                  {pausedCount} standby
                </span>
                <span className="text-[11px] badge-red px-2 py-0.5 rounded-full">
                  {quarantineCount} blockiert
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              disabled
              title="Nur CEO kann Agenten hinzufugen"
              className="flex items-center gap-2 px-4 py-2 rounded-button bg-accent-teal text-bg-primary text-sm font-medium opacity-50 cursor-not-allowed"
            >
              <Plus className="w-4 h-4" />
              Agent Hinzufugen
            </button>
            <button className="flex items-center gap-2 px-4 py-2 rounded-button border border-border-default text-text-primary text-sm font-medium hover:bg-bg-tertiary transition-colors">
              <Download className="w-4 h-4" />
              Export CSV
            </button>
          </div>
        </div>
      </motion.div>

      {/* ═══ Filter Bar ═══ */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, delay: 0.1 }}
        className="bg-bg-secondary border border-border-subtle rounded-lg px-4 py-3 mb-6 flex items-center gap-4 flex-wrap"
      >
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input
            type="text"
            placeholder="Agent suchen..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-bg-tertiary border border-border-subtle rounded-input text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-default transition-colors"
          />
        </div>

        {/* Status Dropdown */}
        <div className="relative">
          <button
            onClick={() => setStatusOpen(!statusOpen)}
            className="flex items-center gap-2 px-3 py-2 bg-bg-tertiary border border-border-subtle rounded-input text-sm text-text-secondary hover:text-text-primary transition-colors min-w-[120px]"
          >
            <span className="text-text-muted text-xs">Status</span>
            <span className="flex-1 text-left">{statusFilter === 'all' ? 'Alle' : statusLabel(statusFilter)}</span>
            <ChevronDown className={cn('w-3.5 h-3.5 transition-transform', statusOpen && 'rotate-180')} />
          </button>
          <AnimatePresence>
            {statusOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setStatusOpen(false)} />
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 top-full mt-1 bg-bg-elevated border border-border-default rounded-lg shadow-card z-20 py-1 min-w-[140px]"
                >
                  {statusOptions.map((s) => (
                    <button
                      key={s}
                      onClick={() => { setStatusFilter(s); setStatusOpen(false); }}
                      className={cn(
                        'w-full text-left px-3 py-2 text-sm hover:bg-bg-tertiary transition-colors flex items-center gap-2',
                        statusFilter === s ? 'text-accent-teal' : 'text-text-secondary'
                      )}
                    >
                      {s !== 'all' && <span className={cn('status-dot', statusConfig[s]?.dotClass)} />}
                      {s === 'all' ? 'Alle' : statusLabel(s)}
                    </button>
                  ))}
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>

        {/* Department Dropdown */}
        <div className="relative">
          <button
            onClick={() => setDeptOpen(!deptOpen)}
            className="flex items-center gap-2 px-3 py-2 bg-bg-tertiary border border-border-subtle rounded-input text-sm text-text-secondary hover:text-text-primary transition-colors min-w-[140px]"
          >
            <span className="text-text-muted text-xs">Dept</span>
            <span className="flex-1 text-left">{deptFilter === 'all' ? 'Alle' : deptFilter}</span>
            <ChevronDown className={cn('w-3.5 h-3.5 transition-transform', deptOpen && 'rotate-180')} />
          </button>
          <AnimatePresence>
            {deptOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setDeptOpen(false)} />
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 top-full mt-1 bg-bg-elevated border border-border-default rounded-lg shadow-card z-20 py-1 min-w-[180px] max-h-[240px] overflow-y-auto"
                >
                  {departmentOptions.map((d) => (
                    <button
                      key={d}
                      onClick={() => { setDeptFilter(d); setDeptOpen(false); }}
                      className={cn(
                        'w-full text-left px-3 py-2 text-sm hover:bg-bg-tertiary transition-colors',
                        deptFilter === d ? 'text-accent-teal' : 'text-text-secondary'
                      )}
                    >
                      {d === 'all' ? 'Alle' : d}
                    </button>
                  ))}
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>

        {/* Risk Ceiling Dropdown */}
        <div className="relative">
          <button
            onClick={() => setRiskOpen(!riskOpen)}
            className="flex items-center gap-2 px-3 py-2 bg-bg-tertiary border border-border-subtle rounded-input text-sm text-text-secondary hover:text-text-primary transition-colors min-w-[140px]"
          >
            <span className="text-text-muted text-xs">Risk</span>
            <span className="flex-1 text-left">{riskFilter === 'all' ? 'Alle' : riskLabel(riskFilter)}</span>
            <ChevronDown className={cn('w-3.5 h-3.5 transition-transform', riskOpen && 'rotate-180')} />
          </button>
          <AnimatePresence>
            {riskOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setRiskOpen(false)} />
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 top-full mt-1 bg-bg-elevated border border-border-default rounded-lg shadow-card z-20 py-1 min-w-[180px]"
                >
                  {riskOptions.map((r) => (
                    <button
                      key={r}
                      onClick={() => { setRiskFilter(r); setRiskOpen(false); }}
                      className={cn(
                        'w-full text-left px-3 py-2 text-sm hover:bg-bg-tertiary transition-colors flex items-center gap-2',
                        riskFilter === r ? 'text-accent-teal' : 'text-text-secondary'
                      )}
                    >
                      {r !== 'all' && (
                        <span className={cn('text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center', riskConfig[r]?.badgeClass)}>
                          {riskConfig[r]?.letter}
                        </span>
                      )}
                      {r === 'all' ? 'Alle' : riskLabel(r)}
                    </button>
                  ))}
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>

        {/* Reset */}
        {hasFilters && (
          <motion.button
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={() => {
              setSearch('');
              setStatusFilter('all');
              setDeptFilter('all');
              setRiskFilter('all');
            }}
            className="text-xs text-text-tertiary hover:text-status-red transition-colors"
          >
            Zurucksetzen
          </motion.button>
        )}

        <span className="text-xs text-text-tertiary ml-auto">
          {filteredAgents.length} von {agents.length}
        </span>
      </motion.div>

      {/* ═══ Data Table ═══ */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.2 }}
        className="bg-bg-secondary border border-border-subtle rounded-card overflow-hidden"
      >
        {/* Table Header */}
        <div className="grid grid-cols-[220px_140px_160px_100px_100px_90px_80px] bg-bg-tertiary border-b border-border-subtle">
          {['Name', 'Rolle', 'Department', 'Status', 'Risk Ceiling', 'Budget', 'Aktion'].map((h) => (
            <div
              key={h}
              className="px-4 py-3 text-[11px] font-semibold text-text-tertiary uppercase tracking-[0.05em]"
            >
              {h}
            </div>
          ))}
        </div>

        {/* Table Body */}
        {filteredAgents.map((agent, index) => {
          const status = statusConfig[agent.status] ?? statusConfig.active;
          const risk = riskConfig[agent.riskCeiling] ?? riskConfig.low;
          const tier = roleTier(agent.role);
          const isHuman = agent.id === 'human-ceo';
          const budgetFormatted = new Intl.NumberFormat('de-DE', {
            style: 'currency',
            currency: 'EUR',
            maximumFractionDigits: 0,
          }).format(agent.budgetLimit);

          return (
            <motion.div
              key={agent.id}
              custom={index}
              variants={tableRowVariants}
              initial="hidden"
              animate="visible"
              whileHover={{ backgroundColor: 'rgba(26,26,36,0.8)' }}
              onClick={() => setSelectedAgent(agent)}
              className={cn(
                'grid grid-cols-[220px_140px_160px_100px_100px_90px_80px] border-b border-border-subtle cursor-pointer transition-colors',
                index % 2 === 1 ? 'bg-[#0D0D14]' : 'bg-bg-secondary'
              )}
            >
              {/* Name + Avatar */}
              <div className="px-4 py-3 flex items-center gap-3">
                <div
                  className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0',
                    isHuman ? 'bg-[#F97316]' : 'bg-[#2DD4BF]'
                  )}
                >
                  <span className="text-xs font-semibold text-white">{getInitials(agent.name)}</span>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-text-primary truncate">{agent.name}</p>
                  <p className="text-[10px] text-text-tertiary font-mono-data truncate">
                    {isHuman ? 'H-001' : agent.id.toUpperCase()}
                  </p>
                </div>
              </div>

              {/* Role */}
              <div className="px-4 py-3 flex items-center">
                <span className={cn('text-[11px] font-medium px-2.5 py-1 rounded-full', roleBadgeClass[tier] || 'badge-gray')}>
                  {tier}
                </span>
              </div>

              {/* Department */}
              <div className="px-4 py-3 flex items-center">
                <span className="text-sm text-text-secondary">{agent.department}</span>
              </div>

              {/* Status */}
              <div className="px-4 py-3 flex items-center gap-2">
                <span className={cn('status-dot', status.dotClass)} />
                <span className="text-sm text-text-secondary">{status.label}</span>
              </div>

              {/* Risk Ceiling */}
              <div className="px-4 py-3 flex items-center">
                <span className={cn('text-xs font-semibold px-2.5 py-1 rounded-full', risk.badgeClass)}>
                  {risk.letter}
                </span>
              </div>

              {/* Budget */}
              <div className="px-4 py-3 flex items-center">
                <span className="text-sm font-mono-data text-text-secondary">{budgetFormatted}</span>
              </div>

              {/* Actions */}
              <div className="px-4 py-3 flex items-center">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedAgent(agent);
                  }}
                  className="p-1.5 rounded-button text-text-tertiary hover:text-accent-teal hover:bg-bg-tertiary transition-colors"
                >
                  <Eye className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          );
        })}

        {/* Empty state */}
        {filteredAgents.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16">
            <Bot className="w-10 h-10 text-text-muted mb-3" />
            <p className="text-text-secondary text-sm">Keine Agenten gefunden</p>
          </div>
        )}
      </motion.div>

      {/* ═══ Bottom Summary Bar ═══ */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.3, ease: drawerEase }}
        className="sticky bottom-0 mt-6 bg-bg-secondary border-t border-border-subtle rounded-t-lg px-6 py-3 flex items-center gap-3 flex-wrap z-30"
      >
        <span className="text-[11px] badge-gray px-2.5 py-1 rounded-full">
          {agents.length} Agenten gesamt
        </span>
        <span className="text-[11px] badge-green px-2.5 py-1 rounded-full">
          {activeCount} aktiv
        </span>
        <span className="text-[11px] badge-yellow px-2.5 py-1 rounded-full">
          {pausedCount} standby
        </span>
        <span className="text-[11px] badge-red px-2.5 py-1 rounded-full">
          {quarantineCount} blockiert
        </span>
        <span className="text-[11px] badge-orange px-2.5 py-1 rounded-full">
          {humanCount} Human
        </span>
        <span className="text-[11px] badge-teal px-2.5 py-1 rounded-full">
          {aiCount} AI
        </span>
        <span className="text-[11px] badge-purple px-2.5 py-1 rounded-full">
          {cLevelCount} C-Level
        </span>
        <span className="text-[11px] badge-red px-2.5 py-1 rounded-full animate-pulse-red">
          2 Human-Approval erforderlich
        </span>
      </motion.div>

      {/* ═══ Detail Drawer ═══ */}
      <AnimatePresence>
        {selectedAgent && (
          <AgentDetailDrawer agent={selectedAgent} onClose={() => setSelectedAgent(null)} />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
