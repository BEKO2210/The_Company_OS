import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  ChevronDown,
  Plus,
  Download,
  ArrowRight,
  Users,
  ClipboardList,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Minus,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Department } from '@/data/models';
import { useCompanyConfig } from '@/contexts/CompanyContext';
import { deriveAgents, deriveDepartments } from '@/lib/companyAdapter';

/* ─── Status Helpers ─── */
function getDepartmentHealth(dept: Department): 'healthy' | 'warning' | 'critical' {
  const openTasks = dept.currentTasks.filter((t) => t.status === 'pending').length;
  const hasCritical = dept.currentTasks.some((t) => t.priority === 'critical');
  if (hasCritical || dept.status === 'maintenance') return 'critical';
  if (openTasks >= 5) return 'warning';
  return 'healthy';
}

function healthLabel(health: string) {
  switch (health) {
    case 'healthy':
      return 'Gesund';
    case 'warning':
      return 'Warnung';
    case 'critical':
      return 'Kritisch';
    default:
      return 'Unbekannt';
  }
}

const healthBadgeClass: Record<string, string> = {
  healthy: 'badge-green',
  warning: 'badge-yellow',
  critical: 'badge-red',
};

const healthDotClass: Record<string, string> = {
  healthy: 'status-dot-green',
  warning: 'status-dot-yellow',
  critical: 'status-dot-red',
};

/* ─── Priority Helpers ─── */
function priorityLabel(p: string) {
  switch (p) {
    case 'critical':
      return 'Kritisch';
    case 'high':
      return 'Hoch';
    case 'medium':
      return 'Mittel';
    case 'low':
      return 'Niedrig';
    default:
      return p;
  }
}

const priorityBadgeClass: Record<string, string> = {
  critical: 'badge-red',
  high: 'badge-orange',
  medium: 'badge-blue',
  low: 'badge-gray',
};

function makeGetAgentName(agentList: { id: string; name: string }[]) {
  return (id: string) => agentList.find((ag) => ag.id === id)?.name ?? id;
}

/* ─── Sorting ─── */
type SortKey = 'name' | 'status' | 'agents' | 'tasks';
const sortOptions: { key: SortKey; label: string }[] = [
  { key: 'name', label: 'Name (A-Z)' },
  { key: 'status', label: 'Status' },
  { key: 'agents', label: 'Agenten (Anzahl)' },
  { key: 'tasks', label: 'Offene Tasks' },
];

/* ─── Stagger Animation ─── */
const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.05 },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
  },
};

export default function DepartmentsPage() {
  const { config } = useCompanyConfig();
  const agents = useMemo(() => deriveAgents(config), [config]);
  const departments = useMemo(() => deriveDepartments(config), [config]);
  const getAgentName = useMemo(() => makeGetAgentName(agents), [agents]);

  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [statusFilter, setStatusFilter] = useState<'all' | 'healthy' | 'warning' | 'critical'>('all');
  const [sortOpen, setSortOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);

  /* ── Filtered & Sorted ── */
  const filteredDepts = useMemo(() => {
    let list = [...departments];

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (d) =>
          d.name.toLowerCase().includes(q) ||
          getAgentName(d.leadAgent).toLowerCase().includes(q) ||
          d.currentTasks.some((t) => t.title.toLowerCase().includes(q))
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      list = list.filter((d) => getDepartmentHealth(d) === statusFilter);
    }

    // Sort
    list.sort((a, b) => {
      switch (sortKey) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'status': {
          const order = { critical: 0, warning: 1, healthy: 2 };
          return order[getDepartmentHealth(a)] - order[getDepartmentHealth(b)];
        }
        case 'agents':
          return b.agents.length - a.agents.length;
        case 'tasks':
          return b.currentTasks.length - a.currentTasks.length;
        default:
          return 0;
      }
    });

    return list;
  }, [departments, search, sortKey, statusFilter, getAgentName]);

  const totalAgents = departments.reduce((sum, d) => sum + d.agents.length, 0);
  const selectedSortLabel = sortOptions.find((o) => o.key === sortKey)?.label ?? 'Name';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
      className="max-w-container mx-auto"
    >
      {/* ═══ Page Header ═══ */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
        className="mb-6"
      >
        {/* Breadcrumb */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2, delay: 0.1 }}
          className="text-xs text-text-tertiary mb-1"
        >
          Dashboard / Abteilungen
        </motion.p>

        {/* Title Row */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-display font-bold text-text-primary tracking-tight">ABTEILUNGEN</h1>
            <p className="text-sm text-text-secondary mt-1">
              {departments.length} aktive Abteilungen mit {totalAgents} zugewiesenen Agenten
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              disabled
              title="Nur CEO kann Abteilungen erstellen"
              className="flex items-center gap-2 px-4 py-2 rounded-button bg-accent-teal text-bg-primary text-sm font-medium opacity-50 cursor-not-allowed"
            >
              <Plus className="w-4 h-4" />
              Neue Abteilung
            </button>
            <button className="flex items-center gap-2 px-4 py-2 rounded-button border border-border-default text-text-primary text-sm font-medium hover:bg-bg-tertiary transition-colors">
              <Download className="w-4 h-4" />
              Export
            </button>
          </div>
        </div>
      </motion.div>

      {/* ═══ Filter Bar ═══ */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, delay: 0.15 }}
        className="bg-bg-secondary border border-border-subtle rounded-lg px-4 py-3 mb-6 flex items-center gap-4 flex-wrap"
      >
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input
            type="text"
            placeholder="Abteilung oder Agent suchen..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-bg-tertiary border border-border-subtle rounded-input text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-default transition-colors"
          />
        </div>

        {/* Sort Dropdown */}
        <div className="relative">
          <button
            onClick={() => setSortOpen(!sortOpen)}
            className="flex items-center gap-2 px-3 py-2 bg-bg-tertiary border border-border-subtle rounded-input text-sm text-text-secondary hover:text-text-primary transition-colors min-w-[160px]"
          >
            <span className="text-text-muted text-xs">Sort:</span>
            <span className="flex-1 text-left">{selectedSortLabel}</span>
            <ChevronDown className={cn('w-3.5 h-3.5 transition-transform', sortOpen && 'rotate-180')} />
          </button>
          <AnimatePresence>
            {sortOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setSortOpen(false)} />
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 top-full mt-1 bg-bg-elevated border border-border-default rounded-lg shadow-card z-20 py-1 min-w-[180px]"
                >
                  {sortOptions.map((opt) => (
                    <button
                      key={opt.key}
                      onClick={() => {
                        setSortKey(opt.key);
                        setSortOpen(false);
                      }}
                      className={cn(
                        'w-full text-left px-3 py-2 text-sm hover:bg-bg-tertiary transition-colors',
                        sortKey === opt.key ? 'text-accent-teal' : 'text-text-secondary'
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>

        {/* Status Filter Dropdown */}
        <div className="relative">
          <button
            onClick={() => setStatusOpen(!statusOpen)}
            className="flex items-center gap-2 px-3 py-2 bg-bg-tertiary border border-border-subtle rounded-input text-sm text-text-secondary hover:text-text-primary transition-colors min-w-[140px]"
          >
            <span className="text-text-muted text-xs">Status:</span>
            <span className="flex-1 text-left">
              {statusFilter === 'all' ? 'Alle' : healthLabel(statusFilter)}
            </span>
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
                  className="absolute right-0 top-full mt-1 bg-bg-elevated border border-border-default rounded-lg shadow-card z-20 py-1 min-w-[160px]"
                >
                  {(['all', 'healthy', 'warning', 'critical'] as const).map((s) => (
                    <button
                      key={s}
                      onClick={() => {
                        setStatusFilter(s);
                        setStatusOpen(false);
                      }}
                      className={cn(
                        'w-full text-left px-3 py-2 text-sm hover:bg-bg-tertiary transition-colors flex items-center gap-2',
                        statusFilter === s ? 'text-accent-teal' : 'text-text-secondary'
                      )}
                    >
                      {s !== 'all' && (
                        <span className={cn('status-dot', healthDotClass[s])} />
                      )}
                      {s === 'all' ? 'Alle' : healthLabel(s)}
                    </button>
                  ))}
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>

        {/* Result count */}
        <span className="text-xs text-text-tertiary ml-auto">
          {filteredDepts.length} von {departments.length}
        </span>
      </motion.div>

      {/* ═══ Card Grid ═══ */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"
      >
        {filteredDepts.map((dept) => {
          const health = getDepartmentHealth(dept);
          const openTasks = dept.currentTasks.filter((t) => t.status === 'pending').length;
          const inProgressTasks = dept.currentTasks.filter((t) => t.status === 'in-progress').length;
          const riskCount = dept.kpiSummary.find((k) => k.metric.toLowerCase().includes('risk') || k.metric.toLowerCase().includes('open'));
          const leadName = getAgentName(dept.leadAgent);
          const visibleTasks = dept.currentTasks.slice(0, 3);
          const remainingTasks = dept.currentTasks.length - 3;
          const isCritical = health === 'critical';

          return (
            <motion.div
              key={dept.id}
              variants={cardVariants}
              layout
              whileHover={{ y: -2, transition: { duration: 0.2 } }}
              className={cn(
                'bg-bg-secondary rounded-card p-4 border transition-all duration-200 cursor-pointer',
                isCritical
                  ? 'border-status-red shadow-[0_0_12px_#EF444422]'
                  : 'border-border-subtle hover:border-border-default hover:shadow-[0_4px_16px_rgba(0,0,0,0.3)]'
              )}
            >
              {/* ── Card Header ── */}
              <div className="flex items-center gap-3 mb-3">
                <span className={cn('status-dot w-[10px] h-[10px]', healthDotClass[health])} />
                <h3 className="text-base font-semibold text-text-primary flex-1 truncate">
                  {dept.name}
                </h3>
                <span
                  className={cn(
                    'text-[11px] font-medium px-2 py-0.5 rounded-full',
                    healthBadgeClass[health]
                  )}
                >
                  {healthLabel(health)}
                </span>
              </div>

              {/* ── Lead Agent ── */}
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 rounded-full bg-accent-teal/15 flex items-center justify-center flex-shrink-0">
                  <Users className="w-3 h-3 text-accent-teal" />
                </div>
                <span className="text-sm text-text-secondary">{leadName}</span>
                <span className="text-[10px] text-text-tertiary ml-1">Zustandig</span>
              </div>

              {/* ── Stats Row ── */}
              <div className="grid grid-cols-3 gap-2 mb-3">
                <div className="bg-bg-tertiary/50 rounded-lg p-2 text-center">
                  <p className="text-lg font-semibold text-text-primary font-mono-data">
                    {openTasks}
                  </p>
                  <p className="text-[10px] text-text-tertiary uppercase tracking-wide">Offene Tasks</p>
                </div>
                <div className="bg-bg-tertiary/50 rounded-lg p-2 text-center">
                  <p className="text-lg font-semibold text-text-primary font-mono-data">
                    {inProgressTasks}
                  </p>
                  <p className="text-[10px] text-text-tertiary uppercase tracking-wide">Laufend</p>
                </div>
                <div className="bg-bg-tertiary/50 rounded-lg p-2 text-center">
                  <p
                    className={cn(
                      'text-lg font-semibold font-mono-data',
                      riskCount && parseInt(riskCount.value) > 0
                        ? 'text-status-red'
                        : 'text-text-primary'
                    )}
                  >
                    {riskCount ? riskCount.value : '0'}
                  </p>
                  <p className="text-[10px] text-text-tertiary uppercase tracking-wide">Risiken</p>
                </div>
              </div>

              {/* ── Active Tasks ── */}
              <div className="mb-3">
                <p className="text-[10px] text-text-tertiary uppercase tracking-wide mb-2 flex items-center gap-1">
                  <ClipboardList className="w-3 h-3" />
                  Aktive Tasks
                </p>
                <div className="space-y-1.5">
                  {visibleTasks.map((task) => (
                    <div
                      key={task.id}
                      className="flex items-center gap-2 text-sm py-1 px-2 rounded-md bg-bg-tertiary/30"
                    >
                      <span
                        className={cn(
                          'status-dot',
                          task.status === 'in-progress'
                            ? 'status-dot-yellow'
                            : task.status === 'pending'
                              ? 'status-dot-green'
                              : 'status-dot-gray'
                        )}
                      />
                      <span className="flex-1 truncate text-text-secondary text-xs">
                        {task.title}
                      </span>
                      <span
                        className={cn(
                          'text-[10px] font-medium px-1.5 py-0.5 rounded-full',
                          priorityBadgeClass[task.priority] || 'badge-gray'
                        )}
                      >
                        {priorityLabel(task.priority)}
                      </span>
                    </div>
                  ))}
                  {remainingTasks > 0 && (
                    <p className="text-xs text-text-tertiary pl-2">+{remainingTasks} weitere</p>
                  )}
                </div>
              </div>

              {/* ── KPI Summary ── */}
              <div className="flex items-center gap-3 mb-3 pt-2 border-t border-border-subtle">
                {dept.kpiSummary.map((kpi) => (
                  <div key={kpi.metric} className="flex items-center gap-1">
                    {kpi.trend === 'up' && <TrendingUp className="w-3 h-3 text-status-green" />}
                    {kpi.trend === 'down' && <TrendingDown className="w-3 h-3 text-status-red" />}
                    {kpi.trend === 'stable' && <Minus className="w-3 h-3 text-text-tertiary" />}
                    <span className="text-[11px] text-text-secondary">
                      <strong className="text-text-primary font-mono-data">{kpi.value}</strong>{' '}
                      {kpi.metric}
                    </span>
                  </div>
                ))}
              </div>

              {/* ── Card Footer ── */}
              <div className="flex items-center justify-between pt-2 border-t border-border-subtle">
                <span className="flex items-center gap-1 text-xs text-accent-teal font-medium cursor-pointer hover:underline">
                  Details anzeigen
                  <ArrowRight className="w-3 h-3" />
                </span>
                <span className="text-[10px] text-text-tertiary">vor 5m aktiv</span>
              </div>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Empty state */}
      {filteredDepts.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center py-24"
        >
          <AlertTriangle className="w-10 h-10 text-text-muted mb-3" />
          <p className="text-text-secondary text-sm">Keine Abteilungen gefunden</p>
          <button
            onClick={() => {
              setSearch('');
              setStatusFilter('all');
            }}
            className="mt-3 text-xs text-accent-teal hover:underline"
          >
            Filter zurucksetzen
          </button>
        </motion.div>
      )}
    </motion.div>
  );
}
