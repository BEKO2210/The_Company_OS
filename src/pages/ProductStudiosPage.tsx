import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Cpu,
  ChevronRight,
  X,
  TreePine,
  Sun,
  Landmark,
  Check,
  AlertTriangle,
  Bug,
  Bot,
  TrendingUp,
  Shield,
  Rocket,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { productStudios } from '@/data/mockData';
import type { ProductStudio } from '@/data/models';

/* ── status helpers ── */
function statusConfig(status: ProductStudio['status']) {
  switch (status) {
    case 'building':
      return { label: 'In Entwicklung', badge: 'badge-yellow' };
    case 'qa':
      return { label: 'In QA', badge: 'badge-blue' };
    case 'deploying':
      return { label: 'Freigabe ausstehend', badge: 'badge-teal' };
    default:
      return { label: status, badge: 'badge-gray' };
  }
}

function qaStatusConfig(qa: ProductStudio['qaStatus']) {
  switch (qa) {
    case 'pending':
      return { label: 'Ausstehend', badge: 'badge-yellow', color: 'text-status-yellow' };
    case 'in-progress':
      return { label: 'Tests laufen', badge: 'badge-blue', color: 'text-accent-blue' };
    case 'passed':
      return { label: 'Abgeschlossen', badge: 'badge-green', color: 'text-status-green' };
    case 'failed':
      return { label: 'Fehlgeschlagen', badge: 'badge-red', color: 'text-status-red' };
    case 'veto':
      return { label: 'Veto', badge: 'badge-red', color: 'text-status-red' };
    default:
      return { label: qa, badge: 'badge-gray', color: 'text-text-muted' };
  }
}

function deployStatusConfig(ds: ProductStudio['deploymentStatus']) {
  switch (ds) {
    case 'not-started':
      return { label: 'Nicht bereit', badge: 'badge-red', color: 'text-status-red' };
    case 'staging':
      return { label: 'Bereit nach Freigabe', badge: 'badge-teal', color: 'text-accent-teal' };
    case 'ready':
      return { label: 'Freigabe erforderlich', badge: 'badge-yellow', color: 'text-status-yellow' };
    case 'deployed':
      return { label: 'Deployed', badge: 'badge-green', color: 'text-status-green' };
    case 'rolled-back':
      return { label: 'Rolled Back', badge: 'badge-red', color: 'text-status-red' };
    default:
      return { label: ds, badge: 'badge-gray', color: 'text-text-muted' };
  }
}

function budgetBarColor(percent: number) {
  if (percent >= 90) return 'bg-status-red';
  if (percent >= 70) return 'bg-status-yellow';
  return 'bg-status-green';
}

/* ── studio icons ── */
function StudioIcon({ name }: { name: string }) {
  const iconClass = "w-7 h-7 text-text-primary";
  switch (name) {
    case 'Studio Cedar':
      return <div className="w-14 h-14 rounded-full bg-gradient-to-br from-emerald-500/20 to-teal-500/10 border border-emerald-500/30 flex items-center justify-center"><TreePine className={iconClass} /></div>;
    case 'Studio Aurora':
      return <div className="w-14 h-14 rounded-full bg-gradient-to-br from-violet-500/20 to-purple-500/10 border border-violet-500/30 flex items-center justify-center"><Sun className={iconClass} /></div>;
    case 'Studio Bridge':
      return <div className="w-14 h-14 rounded-full bg-gradient-to-br from-orange-500/20 to-amber-500/10 border border-orange-500/30 flex items-center justify-center"><Landmark className={iconClass} /></div>;
    default:
      return <div className="w-14 h-14 rounded-full bg-bg-elevated border border-border-default flex items-center justify-center"><Cpu className={iconClass} /></div>;
  }
}

/* ── workflow steps ── */
const workflowSteps = ['Anforderungen', 'Design', 'Entwicklung', 'QA', 'Deployment'];

function getWorkflowStepIndex(studio: ProductStudio): number {
  if (studio.workflowStep.toLowerCase().includes('anforderung')) return 0;
  if (studio.workflowStep.toLowerCase().includes('design')) return 1;
  if (studio.workflowStep.toLowerCase().includes('build') || studio.workflowStep.toLowerCase().includes('entwicklung')) return 2;
  if (studio.workflowStep.toLowerCase().includes('qa') || studio.workflowStep.toLowerCase().includes('review')) return 3;
  if (studio.workflowStep.toLowerCase().includes('deploy') || studio.workflowStep.toLowerCase().includes('freigabe')) return 4;
  return 2;
}

function getTeamForStudio(studio: ProductStudio): string[] {
  const teamMap: Record<string, string[]> = {
    'studio-cedar': ['CTO-Agent', 'QA-Agent', 'CPO-Agent'],
    'studio-aurora': ['QA-Agent', 'CTO-Agent'],
    'studio-bridge': ['CPO-Agent', 'CTO-Agent', 'CLO-Agent'],
  };
  return teamMap[studio.id] ?? ['CTO-Agent'];
}

function getQaDetails(studio: ProductStudio): { coverage: number; openBugs: number; criticalBugs: number; lastRun: string } {
  const details: Record<string, { coverage: number; openBugs: number; criticalBugs: number; lastRun: string }> = {
    'studio-cedar': { coverage: 67, openBugs: 4, criticalBugs: 1, lastRun: 'vor 17m' },
    'studio-aurora': { coverage: 82, openBugs: 2, criticalBugs: 0, lastRun: 'vor 1m' },
    'studio-bridge': { coverage: 91, openBugs: 0, criticalBugs: 0, lastRun: 'vor 2h' },
  };
  return details[studio.id] ?? { coverage: 0, openBugs: 0, criticalBugs: 0, lastRun: '—' };
}

function getBudgetWarning(studio: ProductStudio): string | null {
  const pct = (studio.budget.spent / studio.budget.total) * 100;
  if (pct >= 95) return 'Budget fast erschopft';
  if (pct >= 80) return 'Budget kritisch';
  return null;
}

function getDeployDetails(studio: ProductStudio): { blocker?: string; targetEnv: string; estimate: string } {
  const details: Record<string, { blocker?: string; targetEnv: string; estimate: string }> = {
    'studio-cedar': { blocker: 'QA-Tests unvollstandig', targetEnv: 'Production', estimate: '+3 Tage' },
    'studio-aurora': { blocker: '1 offene Freigabe', targetEnv: 'Production', estimate: '+1 Tag nach Freigabe' },
    'studio-bridge': { blocker: '2 offene Freigaben', targetEnv: 'Production', estimate: 'Sofort nach Freigabe' },
  };
  return details[studio.id] ?? { targetEnv: 'Production', estimate: '—' };
}

function getBurnRate(studio: ProductStudio): string {
  const rates: Record<string, string> = {
    'studio-cedar': 'EUR 320/Tag',
    'studio-aurora': 'EUR 85/Tag',
    'studio-bridge': 'EUR 150/Tag',
  };
  return rates[studio.id] ?? 'EUR 0/Tag';
}

function getStudioDescription(studio: ProductStudio): string {
  const descs: Record<string, string> = {
    'studio-cedar': 'Core MVP des AI Software Studios. Hauptprodukt der Holding.',
    'studio-aurora': 'Landingpage-Studio fur schnelle Web-Projekte.',
    'studio-bridge': 'Prototyp fur physische Services-Marketplace. Frihe Phase.',
  };
  return descs[studio.id] ?? studio.businessUnit;
}

function getStudioSummaryStatus(studio: ProductStudio): { label: string; color: string } {
  const summaries: Record<string, { label: string; color: string }> = {
    'studio-cedar': { label: '1 in Entwicklung', color: 'text-status-yellow' },
    'studio-aurora': { label: '1 in QA', color: 'text-accent-blue' },
    'studio-bridge': { label: '1 in Freigabe', color: 'text-accent-teal' },
  };
  return summaries[studio.id] ?? { label: studio.status, color: 'text-text-muted' };
}

/* ── Workflow Timeline ── */
function WorkflowTimeline({ studio }: { studio: ProductStudio }) {
  const currentStep = getWorkflowStepIndex(studio);
  return (
    <div className="flex items-center justify-between gap-1 mt-4 px-2">
      {workflowSteps.map((step, i) => {
        const isCompleted = i < currentStep;
        const isActive = i === currentStep;
        const isPending = i > currentStep;

        return (
          <div key={step} className="flex items-center flex-1 last:flex-initial">
            <div className="flex flex-col items-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.2, delay: i * 0.15 + 0.3 }}
                className={cn(
                  'w-7 h-7 rounded-full flex items-center justify-center border-2 flex-shrink-0',
                  isCompleted && 'bg-status-green border-status-green',
                  isActive && 'bg-status-yellow border-status-yellow animate-pulse-status',
                  isPending && 'bg-bg-elevated border-border-default'
                )}
              >
                {isCompleted && <Check className="w-3.5 h-3.5 text-bg-primary" strokeWidth={3} />}
                {isActive && <span className="w-2 h-2 rounded-full bg-status-yellow" />}
                {isPending && <span className="w-1.5 h-1.5 rounded-full bg-border-default" />}
              </motion.div>
              <span
                className={cn(
                  'text-[10px] mt-1.5 font-medium whitespace-nowrap',
                  isCompleted && 'text-status-green',
                  isActive && 'text-status-yellow font-semibold',
                  isPending && 'text-text-muted'
                )}
              >
                {String(i + 1).padStart(2, '0')} {step}
              </span>
            </div>
            {i < workflowSteps.length - 1 && (
              <motion.div
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 0.2, delay: i * 0.15 + 0.4 }}
                className={cn(
                  'h-[2px] flex-1 mx-2 origin-left',
                  i < currentStep && 'bg-status-green',
                  i === currentStep && 'bg-status-yellow',
                  i > currentStep && 'border-t-2 border-dashed border-border-default bg-transparent'
                )}
                style={{ marginTop: '-14px' }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ── Comparison Table ── */
function ComparisonTable({ studios }: { studios: ProductStudio[] }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.5, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
      className="data-card overflow-x-auto"
    >
      <h3 className="text-sm font-semibold text-text-primary mb-4 tracking-tight">Studio Vergleich</h3>
      <table className="w-full min-w-[700px]">
        <thead>
          <tr className="border-b border-border-subtle">
            {['Studio', 'Status', 'Budget', 'QA', 'Bugs', 'Deployment', 'Risiko', 'Release'].map((h) => (
              <th key={h} className="text-left text-[10px] font-semibold text-text-tertiary uppercase tracking-wider py-2 px-3">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {studios.map((studio, i) => {
            const budgetPct = Math.round((studio.budget.spent / studio.budget.total) * 100);
            const qa = getQaDetails(studio);
            const deploy = deployStatusConfig(studio.deploymentStatus);
            const stCfg = statusConfig(studio.status);
            const budgetColor = budgetBarColor(budgetPct);

            return (
              <motion.tr
                key={studio.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3, delay: i * 0.1 }}
                className="border-b border-border-subtle last:border-b-0 hover:bg-bg-tertiary/50 transition-colors"
              >
                <td className="py-3 px-3">
                  <span className="text-sm font-semibold text-text-primary">{studio.name}</span>
                </td>
                <td className="py-3 px-3">
                  <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-md', stCfg.badge)}>
                    {stCfg.label}
                  </span>
                </td>
                <td className="py-3 px-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-text-primary">{budgetPct}%</span>
                    <div className="w-16 h-1.5 bg-bg-elevated rounded-full overflow-hidden">
                      <div className={cn('h-full rounded-full', budgetColor)} style={{ width: `${budgetPct}%` }} />
                    </div>
                  </div>
                </td>
                <td className="py-3 px-3">
                  <span className={cn('text-xs font-mono', qa.coverage >= 80 ? 'text-status-green' : 'text-status-yellow')}>
                    {qa.coverage}%
                  </span>
                </td>
                <td className="py-3 px-3">
                  <span className="text-xs">
                    <span className={cn('font-mono', qa.openBugs > 0 ? 'text-status-yellow' : 'text-status-green')}>
                      {qa.openBugs}
                    </span>
                    {qa.criticalBugs > 0 && (
                      <span className="text-status-red ml-1">({qa.criticalBugs}k)</span>
                    )}
                    {qa.criticalBugs === 0 && qa.openBugs > 0 && (
                      <span className="text-status-green ml-1">(0k)</span>
                    )}
                  </span>
                </td>
                <td className="py-3 px-3">
                  <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-md', deploy.badge)}>
                    {deploy.label}
                  </span>
                </td>
                <td className="py-3 px-3">
                  <span className={cn('text-xs', budgetPct >= 95 ? 'text-status-red' : 'text-status-green')}>
                    {budgetPct >= 95 ? 'Mittel' : 'Niedrig'}
                  </span>
                </td>
                <td className="py-3 px-3">
                  <span className="text-xs font-mono text-text-secondary">
                    {studio.id === 'studio-cedar' ? '+3 Tg' : studio.id === 'studio-aurora' ? '+1 Tg' : 'Sofort'}
                  </span>
                </td>
              </motion.tr>
            );
          })}
        </tbody>
      </table>
    </motion.div>
  );
}

/* ── Detail Drawer ── */
function DetailDrawer({ studio, onClose }: { studio: ProductStudio; onClose: () => void }) {
  const stCfg = statusConfig(studio.status);
  const qaCfg = qaStatusConfig(studio.qaStatus);
  const deployCfg = deployStatusConfig(studio.deploymentStatus);
  const qa = getQaDetails(studio);
  const budgetPct = Math.round((studio.budget.spent / studio.budget.total) * 100);
  const budgetWarning = getBudgetWarning(studio);
  const deployDetails = getDeployDetails(studio);
  const burnRate = getBurnRate(studio);
  const team = getTeamForStudio(studio);
  const currentStep = getWorkflowStepIndex(studio);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-[100] flex justify-end"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-[4px]" />

      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
        className="relative w-full max-w-[480px] h-full bg-bg-tertiary border-l border-border-default flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-subtle flex-shrink-0">
          <div className="flex items-center gap-3">
            <StudioIcon name={studio.name} />
            <div>
              <h2 className="text-lg font-semibold text-text-primary tracking-tight">{studio.name}</h2>
              <span className="text-xs text-text-tertiary">{studio.businessUnit}</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-button hover:bg-bg-elevated text-text-tertiary hover:text-text-primary transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Status */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className={cn('text-xs font-semibold px-2.5 py-1 rounded-md', stCfg.badge)}>
              {stCfg.label}
            </span>
            <span className="text-xs text-text-tertiary bg-bg-elevated px-2.5 py-1 rounded-md">
              {studio.customer}
            </span>
            <span className="text-xs text-text-tertiary bg-bg-elevated px-2.5 py-1 rounded-md">
              {Math.round(studio.completion)}% abgeschlossen
            </span>
          </div>

          {/* Description */}
          <p className="text-sm text-text-secondary leading-relaxed">
            {getStudioDescription(studio)}
          </p>

          {/* Budget */}
          <div className="bg-bg-secondary border border-border-subtle rounded-card p-4">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-4 h-4 text-accent-teal" />
              <h3 className="text-xs font-semibold text-text-primary uppercase tracking-wider">Budget</h3>
            </div>
            <p className="text-lg font-mono font-medium text-text-primary mb-2">
              EUR {studio.budget.spent.toLocaleString()} / EUR {studio.budget.total.toLocaleString()}
            </p>
            <div className="w-full h-2 bg-bg-elevated rounded-full overflow-hidden mb-2">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${budgetPct}%` }}
                transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] as [number, number, number, number] }}
                className={cn('h-full rounded-full', budgetBarColor(budgetPct))}
              />
            </div>
            <div className="flex items-center justify-between text-xs text-text-tertiary">
              <span>Verbraucht: EUR {studio.budget.spent.toLocaleString()}</span>
              <span>Verfugbar: EUR {studio.budget.remaining.toLocaleString()}</span>
            </div>
            <p className="text-xs text-text-tertiary mt-1.5">Burn rate: {burnRate}</p>
            {budgetWarning && (
              <span className="inline-block mt-2 text-[10px] font-semibold px-2 py-0.5 rounded-md badge-red">
                {budgetWarning}
              </span>
            )}
          </div>

          {/* QA Status */}
          <div className="bg-bg-secondary border border-border-subtle rounded-card p-4">
            <div className="flex items-center gap-2 mb-3">
              <Shield className="w-4 h-4 text-accent-blue" />
              <h3 className="text-xs font-semibold text-text-primary uppercase tracking-wider">QA-Status</h3>
            </div>
            <div className="flex items-center gap-2 mb-3">
              <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-md', qaCfg.badge)}>
                {qaCfg.label}
              </span>
            </div>
            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-text-tertiary">Testabdeckung</span>
                  <span className={cn('text-xs font-mono font-semibold', qa.coverage >= 80 ? 'text-status-green' : 'text-status-yellow')}>
                    {qa.coverage}%
                  </span>
                </div>
                <div className="w-full h-1.5 bg-bg-elevated rounded-full overflow-hidden">
                  <div
                    className={cn('h-full rounded-full', qa.coverage >= 80 ? 'bg-status-green' : 'bg-status-yellow')}
                    style={{ width: `${qa.coverage}%` }}
                  />
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <Bug className="w-3.5 h-3.5 text-status-yellow" />
                  <span className="text-xs text-text-secondary">Offene Bugs: <span className="font-mono font-semibold">{qa.openBugs}</span></span>
                </div>
                <div className="flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-status-red" />
                  <span className="text-xs text-text-secondary">Kritisch: <span className={cn('font-mono font-semibold', qa.criticalBugs > 0 ? 'text-status-red' : 'text-status-green')}>{qa.criticalBugs}</span></span>
                </div>
              </div>
              <p className="text-xs text-text-tertiary">Letzter Testlauf: {qa.lastRun}</p>
            </div>
          </div>

          {/* Deployment */}
          <div className="bg-bg-secondary border border-border-subtle rounded-card p-4">
            <div className="flex items-center gap-2 mb-3">
              <Rocket className="w-4 h-4 text-accent-teal" />
              <h3 className="text-xs font-semibold text-text-primary uppercase tracking-wider">Deployment</h3>
            </div>
            <div className="flex items-center gap-2 mb-2">
              <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-md', deployCfg.badge)}>
                {deployCfg.label}
              </span>
            </div>
            {deployDetails.blocker && (
              <p className="text-xs text-status-red mb-2">{deployDetails.blocker}</p>
            )}
            <div className="space-y-1">
              <p className="text-xs text-text-secondary">Ziel-Umgebung: <span className="text-text-primary">{deployDetails.targetEnv}</span></p>
              <p className="text-xs text-text-tertiary">Voraussichtlich: {deployDetails.estimate}</p>
            </div>
          </div>

          {/* Team */}
          <div>
            <h3 className="text-xs font-semibold text-text-primary uppercase tracking-wider mb-3 flex items-center gap-2">
              <Bot className="w-4 h-4 text-accent-teal" />
              Team
            </h3>
            <div className="flex items-center gap-2 flex-wrap">
              {team.map((agent) => (
                <div
                  key={agent}
                  className="flex items-center gap-2 bg-bg-secondary border border-border-subtle rounded-button px-3 py-1.5"
                >
                  <div className="w-6 h-6 rounded-full bg-bg-elevated border border-border-default flex items-center justify-center">
                    <span className="text-[9px] font-semibold text-text-tertiary">{agent[0]}</span>
                  </div>
                  <span className="text-xs text-text-secondary">{agent}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Workflow */}
          <div>
            <h3 className="text-xs font-semibold text-text-primary uppercase tracking-wider mb-3">Workflow</h3>
            <div className="bg-bg-secondary border border-border-subtle rounded-card p-4">
              <div className="flex items-center justify-between">
                {workflowSteps.map((step, i) => (
                  <div key={step} className="flex items-center">
                    <div className="flex flex-col items-center">
                      <div
                        className={cn(
                          'w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold',
                          i < currentStep && 'bg-status-green text-bg-primary',
                          i === currentStep && 'bg-status-yellow text-bg-primary',
                          i > currentStep && 'bg-bg-elevated text-text-muted border border-border-default'
                        )}
                      >
                        {i < currentStep ? <Check className="w-3 h-3" /> : i + 1}
                      </div>
                      <span
                        className={cn(
                          'text-[9px] mt-1 font-medium whitespace-nowrap',
                          i <= currentStep ? 'text-text-secondary' : 'text-text-muted'
                        )}
                      >
                        {step}
                      </span>
                    </div>
                    {i < workflowSteps.length - 1 && (
                      <div
                        className={cn(
                          'w-6 h-[2px] mx-0.5 mb-4',
                          i < currentStep ? 'bg-status-green' : 'bg-border-subtle'
                        )}
                      />
                    )}
                  </div>
                ))}
              </div>
              <p className="text-xs text-text-tertiary mt-3 pt-2 border-t border-border-subtle">
                Schritt {currentStep + 1}/5 — {studio.workflowStep}
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ── Studio Card ── */
function StudioCard({ studio, index }: { studio: ProductStudio; index: number }) {
  const [selected, setSelected] = useState<ProductStudio | null>(null);
  const stCfg = statusConfig(studio.status);
  const qaCfg = qaStatusConfig(studio.qaStatus);
  const deployCfg = deployStatusConfig(studio.deploymentStatus);
  const qa = getQaDetails(studio);
  const budgetPct = Math.round((studio.budget.spent / studio.budget.total) * 100);
  const budgetWarning = getBudgetWarning(studio);
  const deployDetails = getDeployDetails(studio);
  const burnRate = getBurnRate(studio);
  const team = getTeamForStudio(studio);

  return (
    <>
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{
          duration: 0.4,
          delay: index * 0.2,
          ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
        }}
        onClick={() => setSelected(studio)}
        className="data-card cursor-pointer group"
      >
        {/* Horizontal Layout: Left | Center | Right */}
        <div className="flex flex-col lg:flex-row gap-5">
          {/* Left Column - 40% */}
          <div className="lg:w-[40%] flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <StudioIcon name={studio.name} />
              <div>
                <h3 className="text-xl font-semibold text-text-primary tracking-tight">{studio.name}</h3>
                <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-md inline-block mt-1', stCfg.badge)}>
                  {stCfg.label}
                </span>
              </div>
            </div>
            <span className="text-xs text-text-tertiary bg-bg-elevated px-2.5 py-1 rounded-md w-fit">
              {studio.businessUnit}
            </span>
            <p className="text-sm text-text-secondary leading-relaxed">
              {getStudioDescription(studio)}
            </p>
          </div>

          {/* Center Column - 35% */}
          <div className="lg:w-[35%] flex flex-col gap-4">
            {/* Budget */}
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <TrendingUp className="w-3.5 h-3.5 text-text-tertiary" />
                <span className="text-[10px] font-semibold text-text-tertiary uppercase tracking-wider">Budget</span>
              </div>
              <p className="text-base font-mono font-medium text-text-primary mb-2">
                EUR {studio.budget.spent.toLocaleString()} / EUR {studio.budget.total.toLocaleString()}
              </p>
              <div className="w-full h-1.5 bg-bg-elevated rounded-full overflow-hidden mb-2">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${budgetPct}%` }}
                  transition={{
                    duration: 0.6,
                    delay: index * 0.2 + 0.3,
                    ease: [0.4, 0, 0.2, 1] as [number, number, number, number],
                  }}
                  className={cn('h-full rounded-full', budgetBarColor(budgetPct))}
                />
              </div>
              <div className="flex items-center justify-between text-[11px] text-text-tertiary">
                <span>Verbraucht: EUR {studio.budget.spent.toLocaleString()}</span>
                <span>Verfugbar: EUR {studio.budget.remaining.toLocaleString()}</span>
              </div>
              <p className="text-[11px] text-text-tertiary mt-1">Burn rate: {burnRate}</p>
              {budgetWarning && (
                <span className="inline-block mt-1.5 text-[10px] font-semibold px-2 py-0.5 rounded-md badge-red">
                  {budgetWarning}
                </span>
              )}
            </div>

            {/* QA Status */}
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <Shield className="w-3.5 h-3.5 text-text-tertiary" />
                <span className="text-[10px] font-semibold text-text-tertiary uppercase tracking-wider">QA-Status</span>
              </div>
              <div className="flex items-center gap-2 mb-2">
                <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-md', qaCfg.badge)}>
                  {qaCfg.label}
                </span>
              </div>
              <div className="space-y-2">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] text-text-tertiary">Testabdeckung</span>
                    <span className={cn('text-[11px] font-mono font-semibold', qa.coverage >= 80 ? 'text-status-green' : 'text-status-yellow')}>
                      {qa.coverage}%
                    </span>
                  </div>
                  <div className="w-full h-1 bg-bg-elevated rounded-full overflow-hidden">
                    <div
                      className={cn('h-full rounded-full', qa.coverage >= 80 ? 'bg-status-green' : 'bg-status-yellow')}
                      style={{ width: `${qa.coverage}%` }}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1">
                    <Bug className="w-3 h-3 text-status-yellow" />
                    <span className="text-[11px] text-text-secondary">Offene: <span className="font-mono font-semibold">{qa.openBugs}</span></span>
                  </div>
                  <div className="flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3 text-status-red" />
                    <span className="text-[11px] text-text-secondary">Kritisch: <span className={cn('font-mono font-semibold', qa.criticalBugs > 0 ? 'text-status-red' : 'text-status-green')}>{qa.criticalBugs}</span></span>
                  </div>
                </div>
                <p className="text-[11px] text-text-tertiary">Letzter Testlauf: {qa.lastRun}</p>
              </div>
            </div>
          </div>

          {/* Right Column - 25% */}
          <div className="lg:w-[25%] flex flex-col gap-4">
            {/* Deployment */}
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <Rocket className="w-3.5 h-3.5 text-text-tertiary" />
                <span className="text-[10px] font-semibold text-text-tertiary uppercase tracking-wider">Deployment</span>
              </div>
              <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-md inline-block mb-2', deployCfg.badge)}>
                {deployCfg.label}
              </span>
              {deployDetails.blocker && (
                <p className={cn('text-[11px] mb-1.5', deployCfg.color)}>{deployDetails.blocker}</p>
              )}
              <div className="space-y-0.5">
                <p className="text-[11px] text-text-secondary">Ziel: <span className="text-text-primary">{deployDetails.targetEnv}</span></p>
                <p className="text-[11px] text-text-tertiary">{deployDetails.estimate}</p>
              </div>
            </div>

            {/* Team */}
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <Bot className="w-3.5 h-3.5 text-text-tertiary" />
                <span className="text-[10px] font-semibold text-text-tertiary uppercase tracking-wider">Team</span>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                {team.map((agent) => (
                  <div
                    key={agent}
                    className="w-7 h-7 rounded-full bg-bg-elevated border border-border-default flex items-center justify-center"
                    title={agent}
                  >
                    <span className="text-[9px] font-semibold text-text-tertiary">{agent[0]}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Progress */}
            <div>
              <span className="text-[10px] font-semibold text-text-tertiary uppercase tracking-wider">Fortschritt</span>
              <div className="flex items-center gap-2 mt-1.5">
                <div className="flex-1 h-1.5 bg-bg-elevated rounded-full overflow-hidden">
                  <div
                    className="h-full bg-accent-teal rounded-full"
                    style={{ width: `${Math.round(studio.completion)}%` }}
                  />
                </div>
                <span className="text-[11px] font-mono text-text-primary">{Math.round(studio.completion)}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Workflow Timeline */}
        <div className="mt-5 pt-4 border-t border-border-subtle">
          <WorkflowTimeline studio={studio} />
        </div>
      </motion.div>

      {/* Detail Drawer */}
      <AnimatePresence>
        {selected && (
          <DetailDrawer studio={selected} onClose={() => setSelected(null)} />
        )}
      </AnimatePresence>
    </>
  );
}

/* ── Main Page ── */
export default function ProductStudiosPage() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
      className="max-w-container mx-auto space-y-5"
    >
      {/* ── Page Header ── */}
      <div className="mb-2">
        <nav className="text-xs text-text-tertiary mb-2 flex items-center gap-1.5">
          <span>Dashboard</span>
          <ChevronRight className="w-3 h-3" />
          <span className="text-text-secondary">Product Studios</span>
        </nav>
        <div className="flex items-end justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-[2rem] font-bold text-text-primary tracking-[-0.03em] leading-[1.1]">
              PRODUCT STUDIOS
            </h1>
            <p className="text-sm text-text-tertiary mt-1.5">
              {productStudios.length === 0
                ? 'Keine Studios - Lege ein neues Studio an'
                : `${productStudios.length} ${productStudios.length === 1 ? 'Studio' : 'Studios'} - Entwicklungsstatus und Lifecycle`}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {productStudios.map((s) => {
              const sum = getStudioSummaryStatus(s);
              return (
                <span key={s.id} className={cn('text-[11px] font-medium px-2.5 py-1 rounded-md', sum.color.replace('text-', 'badge-').replace('accent-', 'badge-'))}>
                  {sum.label}
                </span>
              );
            })}
          </div>
        </div>
        <div className="flex items-center gap-3 mt-4">
          <button disabled className="px-4 py-2 rounded-button text-sm font-medium bg-accent-teal text-bg-primary opacity-50 cursor-not-allowed">
            Neues Studio
          </button>
          <button className="px-4 py-2 rounded-button text-sm font-medium border border-border-default text-text-primary hover:bg-bg-tertiary transition-colors">
            Studio-Report
          </button>
        </div>
      </div>

      {/* ── Studio Cards ── */}
      {productStudios.map((studio, index) => (
        <StudioCard key={studio.id} studio={studio} index={index} />
      ))}

      {/* ── Comparison Table ── */}
      <ComparisonTable studios={productStudios} />
    </motion.div>
  );
}
