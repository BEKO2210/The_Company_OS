import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  GitBranch, Search, X, Check, Lock, ChevronRight,
  Filter, Clock, TrendingUp, Activity, BarChart3
} from 'lucide-react';
import { workflows } from '@/data/mockData';
import type { Workflow, WorkflowStep } from '@/data/models';
import { cn } from '@/lib/utils';

/* ─── Helpers ─── */
const categoryColors: Record<string, { bg: string; text: string }> = {
  Sales: { bg: 'bg-[#2DD4BF22]', text: 'text-[#2DD4BF]' },
  Marketing: { bg: 'bg-[#F9731622]', text: 'text-[#F97316]' },
  Product: { bg: 'bg-[#8B5CF622]', text: 'text-[#8B5CF6]' },
  Engineering: { bg: 'bg-[#3B82F622]', text: 'text-[#3B82F6]' },
  QA: { bg: 'bg-[#06B6D422]', text: 'text-[#06B6D4]' },
  Finance: { bg: 'bg-[#10B98122]', text: 'text-[#10B981]' },
  Legal: { bg: 'bg-[#EF444422]', text: 'text-[#EF4444]' },
  Support: { bg: 'bg-[#06B6D422]', text: 'text-[#06B6D4]' },
  Security: { bg: 'bg-[#EC489922]', text: 'text-[#EC4899]' },
  Audit: { bg: 'bg-[#F59E0B22]', text: 'text-[#F59E0B]' },
  Executive: { bg: 'bg-[#EC489922]', text: 'text-[#EC4899]' },
};

function getCategoryStyle(cat: string) {
  return categoryColors[cat] || { bg: 'bg-[#4B556322]', text: 'text-[#9CA3AF]' };
}

function getStatusStyle(status: string) {
  switch (status) {
    case 'active': return { bg: 'bg-[#10B98122]', text: 'text-[#10B981]', label: 'Aktiv' };
    case 'draft': return { bg: 'bg-[#4B556322]', text: 'text-[#9CA3AF]', label: 'Inaktiv' };
    case 'deprecated': return { bg: 'bg-[#EF444422]', text: 'text-[#EF4444]', label: 'Blockiert' };
    default: return { bg: 'bg-[#4B556322]', text: 'text-[#9CA3AF]', label: status };
  }
}

function getSuccessRateColor(rate: number) {
  if (rate >= 90) return 'bg-status-green';
  if (rate >= 70) return 'bg-status-yellow';
  return 'bg-status-red';
}

/* ─── Step Tracker Component ─── */
function StepTracker({ steps }: { steps: WorkflowStep[] }) {
  return (
    <div className="flex items-center gap-1 mt-3">
      {steps.map((step, index) => {
        const isCompleted = step.status === 'completed';
        const isActive = step.status === 'in-progress';
        const isBlocked = step.status === 'blocked';
        const isPending = step.status === 'pending' || step.status === 'skipped';

        return (
          <div key={step.id} className="flex items-center flex-1">
            {/* Connector line */}
            {index > 0 && (
              <div className={cn(
                'h-[2px] flex-1 mx-1 rounded',
                isCompleted ? 'bg-status-green' :
                (isActive || isBlocked) ? 'bg-status-yellow/50 border-t-2 border-dashed border-status-yellow' :
                'bg-border-subtle'
              )} />
            )}
            {/* Step node */}
            <div className="flex flex-col items-center relative">
              <div className={cn(
                'w-6 h-6 rounded-full flex items-center justify-center border-2 transition-all duration-200',
                isCompleted ? 'bg-status-green border-status-green' :
                isActive ? 'bg-status-yellow border-status-yellow animate-pulse-status' :
                isBlocked ? 'bg-status-red border-status-red' :
                'bg-bg-tertiary border-border-subtle'
              )}>
                {isCompleted && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                {isActive && <div className="w-2 h-2 bg-white rounded-full" />}
                {isBlocked && <Lock className="w-3 h-3 text-white" strokeWidth={2} />}
                {isPending && <div className="w-1.5 h-1.5 bg-text-muted rounded-full" />}
              </div>
              {/* Step name tooltip */}
              <span className={cn(
                'absolute -bottom-5 left-1/2 -translate-x-1/2 text-[9px] font-medium whitespace-nowrap',
                isCompleted ? 'text-status-green' :
                isActive ? 'text-status-yellow' :
                isBlocked ? 'text-status-red' :
                'text-text-muted'
              )}>
                {step.name.length > 8 ? step.name.slice(0, 8) + '...' : step.name}
              </span>
              {/* Blocking gate badge */}
              {step.blockingGate && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 flex items-center gap-0.5">
                  <Lock className="w-2.5 h-2.5 text-status-red" />
                  <span className="text-[7px] font-bold text-status-red uppercase tracking-wider">Gate</span>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ─── Detail Drawer ─── */
function DetailDrawer({ workflow, onClose }: { workflow: Workflow; onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-[100] flex justify-end"
    >
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-[4px]"
        onClick={onClose}
      />
      {/* Drawer */}
      <motion.div
        initial={{ x: 480 }}
        animate={{ x: 0 }}
        exit={{ x: 480 }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
        className="relative w-full max-w-[480px] h-full bg-bg-tertiary border-l border-border-default overflow-y-auto shadow-card z-10"
      >
        {/* Header */}
        <div className="sticky top-0 bg-bg-tertiary border-b border-border-subtle px-6 py-4 flex items-start justify-between z-10">
          <div>
            <p className="text-xs font-mono text-text-tertiary mb-1">{workflow.id.toUpperCase()}</p>
            <h2 className="text-lg font-semibold text-text-primary">{workflow.name}</h2>
            <div className="flex items-center gap-2 mt-2">
              <span className={cn('text-[11px] font-medium px-2 py-0.5 rounded', getCategoryStyle(workflow.category).bg, getCategoryStyle(workflow.category).text)}>
                {workflow.category}
              </span>
              <StatusBadge status={workflow.status} />
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-bg-elevated text-text-tertiary hover:text-text-primary transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-5 space-y-6">
          {/* Description */}
          <section>
            <h3 className="text-sm font-semibold text-text-primary mb-2">Beschreibung</h3>
            <p className="text-sm text-text-secondary leading-relaxed">{workflow.description}</p>
          </section>

          {/* Stats */}
          <section className="grid grid-cols-3 gap-3">
            <StatCard label="Erfolgsquote" value={`${workflow.successRate}%`} color="text-status-green" />
            <StatCard label="Durchlaufe" value={String(workflow.steps.filter(s => s.status === 'completed').length)} color="text-accent-teal" />
            <StatCard label="Dauer" value={workflow.avgDuration} color="text-accent-blue" />
          </section>

          {/* Steps Detail */}
          <section>
            <h3 className="text-sm font-semibold text-text-primary mb-3">Workflow Steps</h3>
            <div className="space-y-2">
              {workflow.steps.map((step, idx) => (
                <div
                  key={step.id}
                  className={cn(
                    'border border-border-subtle rounded-card p-3 transition-colors',
                    step.status === 'in-progress' && 'border-status-yellow bg-status-yellow/[0.05]',
                    step.status === 'blocked' && 'border-status-red bg-status-red/[0.05]',
                    step.status === 'completed' && 'bg-bg-secondary'
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono text-text-muted w-5">{idx + 1}</span>
                      <StepDot status={step.status} />
                      <span className="text-sm font-medium text-text-primary">{step.name}</span>
                      {step.blockingGate && (
                        <span className="flex items-center gap-1 text-[10px] font-bold text-status-red bg-status-red/10 px-1.5 py-0.5 rounded">
                          <Lock className="w-2.5 h-2.5" />
                          GATE
                        </span>
                      )}
                    </div>
                    <span className={cn(
                      'text-[11px] font-medium',
                      step.status === 'completed' && 'text-status-green',
                      step.status === 'in-progress' && 'text-status-yellow',
                      step.status === 'blocked' && 'text-status-red',
                      step.status === 'pending' && 'text-text-muted'
                    )}>
                      {step.status === 'completed' ? 'Abgeschlossen' :
                       step.status === 'in-progress' ? 'Aktiv' :
                       step.status === 'blocked' ? 'Blockiert' : 'Ausstehend'}
                    </span>
                  </div>
                  <p className="text-xs text-text-secondary mt-1 ml-7">{step.description}</p>
                  <div className="flex items-center gap-4 mt-2 ml-7 text-[11px] text-text-tertiary">
                    <span>Agent: <span className="text-text-secondary">{step.agent}</span></span>
                    <span>Input: <span className="text-text-secondary">{step.input}</span></span>
                    <span>Output: <span className="text-text-secondary">{step.output}</span></span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Responsible Agents */}
          <section>
            <h3 className="text-sm font-semibold text-text-primary mb-3">Zustandige Agenten</h3>
            <div className="flex flex-wrap gap-2">
              {workflow.responsibleAgents.map((agent) => (
                <span
                  key={agent}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-button bg-bg-elevated border border-border-subtle text-sm text-text-primary"
                >
                  <div className="w-5 h-5 rounded-full bg-accent-teal/15 flex items-center justify-center">
                    <span className="text-[9px] font-bold text-accent-teal">{agent.charAt(0)}</span>
                  </div>
                  {agent}
                </span>
              ))}
            </div>
          </section>

          {/* Risk & Approval */}
          <section className="border border-border-subtle rounded-card p-4 bg-bg-secondary">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-text-tertiary">Risiko-Score</p>
                <p className={cn(
                  'text-lg font-semibold font-mono',
                  workflow.riskScore > 50 ? 'text-status-red' :
                  workflow.riskScore > 30 ? 'text-status-yellow' : 'text-status-green'
                )}>
                  {workflow.riskScore}/100
                </p>
              </div>
              <div>
                <p className="text-xs text-text-tertiary">Approval erforderlich</p>
                <p className="text-lg font-semibold text-text-primary">
                  {workflow.requiresApproval ? 'Ja' : 'Nein'}
                </p>
              </div>
              <div>
                <p className="text-xs text-text-tertiary">Inputs</p>
                <p className="text-sm text-text-secondary">{workflow.inputs.join(', ')}</p>
              </div>
            </div>
          </section>
        </div>
      </motion.div>
    </motion.div>
  );
}

function StepDot({ status }: { status: string }) {
  return (
    <div className={cn(
      'w-2.5 h-2.5 rounded-full',
      status === 'completed' && 'bg-status-green',
      status === 'in-progress' && 'bg-status-yellow',
      status === 'blocked' && 'bg-status-red',
      status === 'pending' && 'bg-text-muted'
    )} />
  );
}

function StatusBadge({ status }: { status: string }) {
  const style = getStatusStyle(status);
  return (
    <span className={cn('text-[11px] font-medium px-2 py-0.5 rounded', style.bg, style.text)}>
      {style.label}
    </span>
  );
}

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="bg-bg-secondary border border-border-subtle rounded-card p-3 text-center">
      <p className={cn('text-lg font-semibold font-mono', color)}>{value}</p>
      <p className="text-[11px] text-text-tertiary mt-0.5">{label}</p>
    </div>
  );
}

/* ─── Main Page ─── */
export default function WorkflowsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [agentFilter, setAgentFilter] = useState('all');
  const [selectedWorkflow, setSelectedWorkflow] = useState<Workflow | null>(null);

  const allCategories = useMemo(() => {
    const cats = new Set(workflows.map(w => w.category));
    return ['all', ...Array.from(cats)];
  }, []);

  const allAgents = useMemo(() => {
    const ags = new Set<string>();
    workflows.forEach(w => w.responsibleAgents.forEach(a => ags.add(a)));
    return ['all', ...Array.from(ags).sort()];
  }, []);

  const filteredWorkflows = useMemo(() => {
    return workflows.filter(wf => {
      if (searchQuery && !wf.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
          !wf.description.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      if (categoryFilter !== 'all' && wf.category !== categoryFilter) return false;
      if (statusFilter !== 'all' && wf.status !== statusFilter) return false;
      if (agentFilter !== 'all' && !wf.responsibleAgents.includes(agentFilter)) return false;
      return true;
    });
  }, [searchQuery, categoryFilter, statusFilter, agentFilter]);

  // Stats
  const totalWorkflows = workflows.length;
  const activeWorkflows = workflows.filter(w => w.status === 'active').length;
  const avgSuccessRate = Math.round(workflows.reduce((sum, w) => sum + w.successRate, 0) / workflows.length);
  const avgDurationHours = Math.round(workflows.reduce((sum, w) => {
    const h = parseFloat(w.avgDuration);
    return sum + (isNaN(h) ? 0 : h);
  }, 0) / workflows.length);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
      className="max-w-container mx-auto"
    >
      {/* Page Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-text-tertiary mb-1">Dashboard / Workflows</p>
            <h1 className="text-display font-bold text-text-primary tracking-tight">WORKFLOWS</h1>
            <p className="text-sm text-text-secondary mt-1">18 Kernworkflows &mdash; Operation Playbook</p>
          </div>
          <div className="flex items-center gap-2">
            <button className="px-4 py-2 rounded-button text-sm font-medium bg-accent-teal text-bg-primary hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed" disabled>
              Neuer Workflow
            </button>
            <button className="px-4 py-2 rounded-button text-sm font-medium border border-border-default text-text-primary hover:bg-bg-tertiary transition-all">
              Playbook Export
            </button>
          </div>
        </div>

        {/* Summary Pills */}
        <div className="flex items-center gap-2 mt-3">
          <span className="text-[11px] font-medium px-2.5 py-1 rounded bg-[#10B98122] text-[#10B981]">
            {activeWorkflows} aktiv
          </span>
          <span className="text-[11px] font-medium px-2.5 py-1 rounded bg-[#EF444422] text-[#EF4444]">
            {workflows.filter(w => w.status === 'deprecated').length} blockiert
          </span>
          <span className="text-[11px] font-medium px-2.5 py-1 rounded bg-[#4B556322] text-[#9CA3AF]">
            {workflows.filter(w => w.status === 'draft').length} inaktiv
          </span>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <StatCardFull icon={<BarChart3 className="w-4 h-4" />} label="Gesamt" value={String(totalWorkflows)} />
        <StatCardFull icon={<Activity className="w-4 h-4" />} label="Aktiv" value={String(activeWorkflows)} color="text-status-green" />
        <StatCardFull icon={<TrendingUp className="w-4 h-4" />} label="Erfolgsquote" value={`${avgSuccessRate}%`} color="text-accent-teal" />
        <StatCardFull icon={<Clock className="w-4 h-4" />} label="Durchschn. Dauer" value={`${avgDurationHours}h`} color="text-accent-blue" />
      </div>

      {/* Filter Bar */}
      <div className="bg-bg-secondary border border-border-subtle rounded-card p-4 mb-6">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 text-text-tertiary">
            <Filter className="w-4 h-4" />
            <span className="text-xs font-medium uppercase tracking-wider">Filter</span>
          </div>
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input
              type="text"
              placeholder="Workflow suchen..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-bg-tertiary border border-border-subtle rounded-input pl-9 pr-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-default transition-colors"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          {/* Category */}
          <select
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            className="bg-bg-tertiary border border-border-subtle rounded-input px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-border-default cursor-pointer"
          >
            <option value="all">Alle Kategorien</option>
            {allCategories.filter(c => c !== 'all').map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          {/* Status */}
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="bg-bg-tertiary border border-border-subtle rounded-input px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-border-default cursor-pointer"
          >
            <option value="all">Alle Status</option>
            <option value="active">Aktiv</option>
            <option value="draft">Inaktiv</option>
            <option value="deprecated">Blockiert</option>
          </select>
          {/* Agent */}
          <select
            value={agentFilter}
            onChange={e => setAgentFilter(e.target.value)}
            className="bg-bg-tertiary border border-border-subtle rounded-input px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-border-default cursor-pointer"
          >
            <option value="all">Alle Agenten</option>
            {allAgents.filter(a => a !== 'all').map(a => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
          {/* Reset */}
          {(searchQuery || categoryFilter !== 'all' || statusFilter !== 'all' || agentFilter !== 'all') && (
            <button
              onClick={() => { setSearchQuery(''); setCategoryFilter('all'); setStatusFilter('all'); setAgentFilter('all'); }}
              className="text-xs text-text-tertiary hover:text-text-primary transition-colors"
            >
              Zurucksetzen
            </button>
          )}
        </div>
      </div>

      {/* Workflow Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        <AnimatePresence mode="popLayout">
          {filteredWorkflows.map((workflow, index) => (
            <WorkflowCard
              key={workflow.id}
              workflow={workflow}
              index={index}
              onClick={() => setSelectedWorkflow(workflow)}
            />
          ))}
        </AnimatePresence>
      </div>

      {filteredWorkflows.length === 0 && (
        <div className="text-center py-16">
          <GitBranch className="w-10 h-10 text-text-muted mx-auto mb-3" />
          <p className="text-sm text-text-secondary">Keine Workflows gefunden</p>
          <button
            onClick={() => { setSearchQuery(''); setCategoryFilter('all'); setStatusFilter('all'); setAgentFilter('all'); }}
            className="text-xs text-accent-teal hover:underline mt-2"
          >
            Filter zurucksetzen
          </button>
        </div>
      )}

      {/* Detail Drawer */}
      <AnimatePresence>
        {selectedWorkflow && (
          <DetailDrawer workflow={selectedWorkflow} onClose={() => setSelectedWorkflow(null)} />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ─── Workflow Card ─── */
function WorkflowCard({ workflow, index, onClick }: { workflow: Workflow; index: number; onClick: () => void }) {
  const catStyle = getCategoryStyle(workflow.category);
  const statusStyle = getStatusStyle(workflow.status);
  const completedSteps = workflow.steps.filter(s => s.status === 'completed').length;
  const totalSteps = workflow.steps.length;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.3, delay: index * 0.05, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
      onClick={onClick}
      className="bg-bg-secondary border border-border-subtle rounded-card p-4 cursor-pointer hover:border-border-default hover:-translate-y-[2px] hover:shadow-card transition-all duration-200 group"
    >
      {/* Card Header */}
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-mono text-text-tertiary">{workflow.id.toUpperCase()}</span>
            <span className={cn('text-[11px] font-medium px-1.5 py-0.5 rounded', catStyle.bg, catStyle.text)}>
              {workflow.category}
            </span>
          </div>
          <h3 className="text-base font-semibold text-text-primary truncate">{workflow.name}</h3>
          <p className="text-xs text-text-secondary mt-1 line-clamp-2">{workflow.description}</p>
        </div>
        <span className={cn('ml-2 shrink-0 text-[11px] font-medium px-2 py-0.5 rounded', statusStyle.bg, statusStyle.text)}>
          {statusStyle.label}
        </span>
      </div>

      {/* Step Tracker */}
      <div className="mt-4 mb-5">
        <StepTracker steps={workflow.steps} />
        <div className="flex items-center justify-between mt-5">
          <span className="text-[11px] text-text-tertiary">
            {completedSteps}/{totalSteps} Steps
          </span>
          <span className="text-[11px] text-text-tertiary">
            {workflow.steps.filter(s => s.blockingGate).length} Gates
          </span>
        </div>
      </div>

      {/* Progress & Stats */}
      <div className="space-y-2 mb-3">
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-text-tertiary">Erfolgsquote</span>
          <span className="text-[11px] font-mono font-medium text-text-primary">{workflow.successRate}%</span>
        </div>
        <div className="w-full h-1.5 bg-bg-tertiary rounded-full overflow-hidden">
          <div
            className={cn('h-full rounded-full transition-all duration-500', getSuccessRateColor(workflow.successRate))}
            style={{ width: `${workflow.successRate}%` }}
          />
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-border-subtle">
        <div className="flex items-center gap-3 text-[11px] text-text-tertiary">
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {workflow.avgDuration}
          </span>
        </div>

        {/* Agent avatars */}
        <div className="flex -space-x-1.5">
          {workflow.responsibleAgents.slice(0, 4).map((agent) => (
            <div
              key={agent}
              className="w-5 h-5 rounded-full bg-bg-elevated border border-border-subtle flex items-center justify-center"
              title={agent}
            >
              <span className="text-[8px] font-bold text-accent-teal">{agent.charAt(0)}</span>
            </div>
          ))}
          {workflow.responsibleAgents.length > 4 && (
            <div className="w-5 h-5 rounded-full bg-bg-elevated border border-border-subtle flex items-center justify-center">
              <span className="text-[7px] font-medium text-text-tertiary">+{workflow.responsibleAgents.length - 4}</span>
            </div>
          )}
        </div>
      </div>

      {/* View Details */}
      <div className="flex items-center justify-end mt-2">
        <span className="text-[11px] text-accent-teal flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          Details anzeigen <ChevronRight className="w-3 h-3" />
        </span>
      </div>
    </motion.div>
  );
}

function StatCardFull({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color?: string }) {
  return (
    <div className="bg-bg-secondary border border-border-subtle rounded-card p-4 flex items-center gap-3">
      <div className={cn('text-accent-teal', color)}>{icon}</div>
      <div>
        <p className={cn('text-xl font-semibold font-mono text-text-primary', color)}>{value}</p>
        <p className="text-[11px] text-text-tertiary">{label}</p>
      </div>
    </div>
  );
}
