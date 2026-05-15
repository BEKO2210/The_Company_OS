import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  GitBranch, Bot, ClipboardCheck, ShieldAlert, Zap, Activity,
  TrendingUp, Building2, ChevronRight, Check, X, Eye, Clock,
  DollarSign, FileText, Rocket, Receipt, User,
  Shield, Lock, Wallet, CheckCircle, Scale,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line,
} from 'recharts';
import { cn } from '@/lib/utils';
import {
  departments, approvals, auditLog, liquidityTrend, automationTrend,
} from '@/data';
import { AIInsights } from '@/components/ai';

const easeOut = [0.16, 1, 0.3, 1] as [number, number, number, number];

// ─── Animation Variants ───
const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.4, delay: i * 0.08, ease: easeOut },
  }),
};

const rowVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: (i: number) => ({
    opacity: 1, x: 0,
    transition: { duration: 0.4, delay: i * 0.1, ease: easeOut },
  }),
};

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06 } },
};

const staggerChild = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: easeOut } },
};

// ─── Project Pipeline Data ───
const projects = [
  { name: 'Studio Cedar MVP', status: 'In Entwicklung', phase: '3/5', progress: 60, color: 'text-status-yellow', bg: 'bg-status-yellow', badge: 'badge-yellow', risk: 'Niedrig' },
  { name: 'Studio Aurora Landingpage', status: 'In QA', phase: '4/5', progress: 80, color: 'text-accent-blue', bg: 'bg-accent-blue', badge: 'badge-blue', risk: 'Niedrig' },
  { name: 'Studio Bridge Prototyp', status: 'Freigabe', phase: '5/5', progress: 95, color: 'text-accent-teal', bg: 'bg-accent-teal', badge: 'badge-teal', risk: 'Mittel' },
  { name: 'Website Redesign', status: 'Planung', phase: '1/5', progress: 15, color: 'text-text-muted', bg: 'bg-text-muted', badge: 'badge-gray', risk: 'Niedrig' },
  { name: 'Agent-Registry v2', status: 'In Entwicklung', phase: '2/5', progress: 40, color: 'text-status-yellow', bg: 'bg-status-yellow', badge: 'badge-yellow', risk: 'Niedrig' },
];

// ─── Active Agents Data ───
const activeAgents = [
  { name: 'CEO-Agent', dept: 'Executive Council', status: 'active', action: 'Tagesbericht erstellt', time: '2m' },
  { name: 'CTO-Agent', dept: 'Engineering', status: 'active', action: 'Code-Review abgeschlossen', time: '5m' },
  { name: 'CFO-Agent', dept: 'Finance', status: 'active', action: 'Budget-Report generiert', time: '12m' },
  { name: 'QA-Agent', dept: 'QA', status: 'working', action: 'Test-Suite lauft', time: '1m' },
  { name: 'Marketing-Agent', dept: 'Marketing', status: 'active', action: 'Landingpage-Entwurf', time: '8m' },
  { name: 'Sales-Agent', dept: 'Sales', status: 'waiting', action: 'Auf Lead-Antwort', time: '25m' },
];

const statusDotMap: Record<string, string> = {
  active: 'status-dot-green',
  working: 'status-dot-yellow',
  waiting: 'status-dot-yellow',
};

// ─── Approval Icons ───
const approvalIcons: Record<string, { icon: typeof DollarSign; color: string }> = {
  payment: { icon: DollarSign, color: 'text-accent-blue bg-accent-blue/15' },
  contract: { icon: FileText, color: 'text-accent-purple bg-accent-purple/15' },
  deployment: { icon: Rocket, color: 'text-accent-teal bg-accent-teal/15' },
  invoice: { icon: Receipt, color: 'text-status-green bg-status-green/15' },
  freelancer: { icon: User, color: 'text-status-orange bg-status-orange/15' },
};

const riskBadgeMap: Record<string, string> = {
  'critical': 'badge-red',
  'high': 'badge-orange',
  'medium': 'badge-yellow',
  'low': 'badge-green',
};

// ─── Risk Icons ───
const riskCategoryIcons: Record<string, { icon: typeof Shield; color: string; bg: string }> = {
  'Compliance': { icon: Shield, color: 'text-accent-teal', bg: 'bg-accent-teal/15' },
  'Sicherheit': { icon: Lock, color: 'text-accent-blue', bg: 'bg-accent-blue/15' },
  'Finanzen': { icon: Wallet, color: 'text-status-green', bg: 'bg-status-green/15' },
  'Qualitat': { icon: CheckCircle, color: 'text-status-yellow', bg: 'bg-status-yellow/15' },
  'Rechtlich': { icon: Scale, color: 'text-accent-purple', bg: 'bg-accent-purple/15' },
};

const severityBorderMap: Record<string, { border: string; gradient: string; badge: string }> = {
  'Kritisch': { border: 'border-l-[3px] border-l-status-red', gradient: 'bg-gradient-to-r from-status-red/10 to-transparent', badge: 'badge-red' },
  'Hoch': { border: 'border-l-[3px] border-l-status-orange', gradient: '', badge: 'badge-orange' },
  'Mittel': { border: 'border-l-[3px] border-l-status-yellow', gradient: '', badge: 'badge-yellow' },
  'Niedrig': { border: 'border-l-[3px] border-l-text-muted', gradient: '', badge: 'badge-gray' },
};

// ─── Circular Gauge ───
function CircularGauge({ value, size = 120 }: { value: number; size?: number }) {
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#1A1A24" strokeWidth={strokeWidth} />
        <motion.circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke="#2DD4BF" strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.2, delay: 0.5, ease: easeOut }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-2xl font-mono font-medium text-accent-teal">{value}%</span>
      </div>
    </div>
  );
}

// ─── Main Component ───
export default function Home() {
  const navigate = useNavigate();

  return (
    <div className="max-w-container mx-auto space-y-4">
      {/* ── AI Insights Row ── */}
      <AIInsights onNavigate={(path) => navigate(path)} />

      {/* ── Row 1: Project Pipeline (2/3) + Active Agents (1/3) ── */}
      <div className="grid grid-cols-3 gap-4">
        {/* Project Pipeline */}
        <motion.div
          custom={0} variants={cardVariants} initial="hidden" animate="visible"
          className="col-span-2 data-card"
        >
          <div className="flex items-center gap-2 mb-1">
            <GitBranch className="w-4 h-4 text-accent-teal" />
            <h2 className="text-sm font-semibold text-text-primary tracking-wide">PROJEKT-PIPELINE</h2>
          </div>
          <p className="text-xs text-text-tertiary mb-4">Aktuelle Projekte und deren Status</p>

          <div className="space-y-3">
            {projects.map((p, i) => (
              <motion.div
                key={p.name}
                custom={i} variants={rowVariants} initial="hidden" animate="visible"
                className="flex items-center gap-4 group cursor-pointer hover:bg-bg-tertiary/40 rounded-lg px-2 py-2 -mx-2 transition-colors"
              >
                {/* Status + Name */}
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <span className={cn('w-2 h-2 rounded-full', p.bg, 'shadow-glow-' + p.badge.split('-')[1])} />
                  <span className="text-sm font-medium text-text-primary truncate">{p.name}</span>
                  <span className={cn('text-[10px] px-1.5 py-0.5 rounded', p.badge)}>{p.status}</span>
                </div>

                {/* Progress */}
                <div className="w-24 flex-shrink-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] text-text-tertiary">{p.phase}</span>
                    <span className="text-[10px] text-text-tertiary">{p.progress}%</span>
                  </div>
                  <div className="h-1.5 bg-bg-tertiary rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${p.progress}%` }}
                      transition={{ duration: 0.6, delay: 0.4 + i * 0.1, ease: [0.4, 0, 0.2, 1] as [number, number, number, number] }}
                      className={cn('h-full rounded-full', p.bg)}
                    />
                  </div>
                </div>

                {/* Risk */}
                <span className="text-[10px] text-text-tertiary w-14 text-right flex-shrink-0">{p.risk}</span>
                <ChevronRight className="w-3.5 h-3.5 text-text-muted group-hover:text-text-secondary transition-colors flex-shrink-0" />
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Active Agents */}
        <motion.div
          custom={1} variants={cardVariants} initial="hidden" animate="visible"
          className="data-card"
        >
          <div className="flex items-center gap-2 mb-1">
            <Bot className="w-4 h-4 text-accent-teal" />
            <h2 className="text-sm font-semibold text-text-primary tracking-wide">AGENTEN-STATUS</h2>
          </div>
          <p className="text-xs text-text-tertiary mb-4">Echtzeit-Status aller Agenten</p>

          <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="space-y-3">
            {activeAgents.map((agent) => (
              <motion.div key={agent.name} variants={staggerChild} className="flex items-center gap-3">
                {/* Avatar */}
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-accent-teal to-accent-blue flex items-center justify-center flex-shrink-0">
                  <span className="text-[10px] font-bold text-bg-primary">
                    {agent.name.split('-').map(w => w[0]).join('').substring(0, 2)}
                  </span>
                </div>
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-text-primary truncate">{agent.name}</span>
                    <span className={cn('w-1.5 h-1.5 rounded-full', statusDotMap[agent.status], agent.status === 'active' && 'animate-pulse-status')} />
                  </div>
                  <span className="text-[10px] text-text-tertiary">{agent.dept}</span>
                </div>
                {/* Time */}
                <div className="text-right flex-shrink-0">
                  <span className="text-[10px] text-text-tertiary">{agent.action}</span>
                  <div className="flex items-center gap-1 justify-end">
                    <Clock className="w-2.5 h-2.5 text-text-muted" />
                    <span className="text-[10px] text-text-muted">{agent.time}</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>

          <button
            onClick={() => navigate('/agents')}
            className="mt-4 text-xs text-accent-teal hover:text-accent-teal/80 transition-colors flex items-center gap-1"
          >
            Alle 22 Agenten anzeigen <ChevronRight className="w-3 h-3" />
          </button>
        </motion.div>
      </div>

      {/* ── Row 2: Pending Approvals (1/2) + Risk Alerts (1/2) ── */}
      <div className="grid grid-cols-2 gap-4">
        {/* Pending Approvals */}
        <motion.div
          custom={2} variants={cardVariants} initial="hidden" animate="visible"
          className="data-card"
        >
          <div className="flex items-center gap-2 mb-1">
            <ClipboardCheck className="w-4 h-4 text-accent-teal" />
            <h2 className="text-sm font-semibold text-text-primary tracking-wide">OFFENE FREIGABEN</h2>
          </div>
          <p className="text-xs text-text-tertiary mb-4">Ausstehende Entscheidungen</p>

          <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="space-y-2">
            {approvals.slice(0, 5).map((app) => {
              const iconData = approvalIcons[app.type] || { icon: FileText, color: 'text-text-muted bg-bg-tertiary' };
              const IconComp = iconData.icon;
              return (
                <motion.div
                  key={app.id} variants={staggerChild}
                  className={cn(
                    'flex items-center gap-3 p-2 rounded-lg transition-colors group',
                    app.redLine && 'border-l-2 border-l-status-red bg-status-red/[0.02] hover:bg-status-red/[0.06]',
                    !app.redLine && 'hover:bg-bg-tertiary/40',
                    app.riskLevel === 'critical' && app.redLine && 'animate-pulse-red'
                  )}
                >
                  {/* Icon */}
                  <div className={cn('w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0', iconData.color)}>
                    <IconComp className="w-3.5 h-3.5" />
                  </div>
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-bg-tertiary text-text-tertiary capitalize">
                      {app.type}
                    </span>
                    <p className="text-xs text-text-primary mt-0.5 truncate">{app.title}</p>
                  </div>
                  {/* Risk */}
                  <span className={cn('text-[10px] px-1.5 py-0.5 rounded flex-shrink-0', riskBadgeMap[app.riskLevel])}>
                    {app.riskLevel}
                  </span>
                  {/* Actions */}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                    <button className="w-6 h-6 rounded bg-status-green/15 text-status-green hover:bg-status-green/25 flex items-center justify-center transition-colors">
                      <Check className="w-3 h-3" />
                    </button>
                    <button className="w-6 h-6 rounded bg-status-red/15 text-status-red hover:bg-status-red/25 flex items-center justify-center transition-colors">
                      <X className="w-3 h-3" />
                    </button>
                    <button className="w-6 h-6 rounded bg-accent-blue/15 text-accent-blue hover:bg-accent-blue/25 flex items-center justify-center transition-colors">
                      <Eye className="w-3 h-3" />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>

          <button
            onClick={() => navigate('/approvals')}
            className="mt-4 text-xs text-accent-teal hover:text-accent-teal/80 transition-colors flex items-center gap-1"
          >
            Alle 7 Freigaben anzeigen <ChevronRight className="w-3 h-3" />
          </button>
        </motion.div>

        {/* Risk Alerts */}
        <motion.div
          custom={3} variants={cardVariants} initial="hidden" animate="visible"
          className="data-card"
        >
          <div className="flex items-center gap-2 mb-1">
            <ShieldAlert className="w-4 h-4 text-accent-teal" />
            <h2 className="text-sm font-semibold text-text-primary tracking-wide">RISIKEN & WARNUNGEN</h2>
          </div>
          <p className="text-xs text-text-tertiary mb-4">Compliance-Warnungen und Risiken</p>

          <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="space-y-2">
            {[
              { category: 'Compliance', desc: 'GDPR-Prufung Studio Cedar uberfallig', severity: 'Kritisch', since: '2 Tg' },
              { category: 'Sicherheit', desc: 'API-Key Rotation erforderlich', severity: 'Hoch', since: '1 Tg' },
              { category: 'Finanzen', desc: 'Liquiditat unter 15k Schwelle', severity: 'Hoch', since: '5h' },
              { category: 'Qualitat', desc: 'QA-Testabdeckung unter 80%', severity: 'Mittel', since: '3 Tg' },
              { category: 'Rechtlich', desc: 'Vertragsklausel unvollstandig', severity: 'Niedrig', since: '1 W' },
            ].map((risk, i) => {
              const catIcon = riskCategoryIcons[risk.category] || { icon: Shield, color: 'text-text-muted', bg: 'bg-bg-tertiary' };
              const IconComp = catIcon.icon;
              const sevStyle = severityBorderMap[risk.severity];
              return (
                <motion.div
                  key={i} variants={staggerChild}
                  className={cn(
                    'flex items-center gap-3 p-2 rounded-lg transition-colors hover:bg-bg-tertiary/40',
                    sevStyle.border, sevStyle.gradient
                  )}
                >
                  <div className={cn('w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0', catIcon.bg)}>
                    <IconComp className={cn('w-3.5 h-3.5', catIcon.color)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className={cn('text-[10px] px-1.5 py-0.5 rounded', sevStyle.badge)}>{risk.category}</span>
                    <p className="text-xs text-text-primary mt-0.5 truncate">{risk.desc}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span className={cn('text-[10px] px-1.5 py-0.5 rounded', sevStyle.badge)}>{risk.severity}</span>
                    <p className="text-[10px] text-text-tertiary mt-0.5">{risk.since}</p>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>

          <button
            onClick={() => navigate('/risk-center')}
            className="mt-4 text-xs text-accent-teal hover:text-accent-teal/80 transition-colors flex items-center gap-1"
          >
            Risiko-Center offnen <ChevronRight className="w-3 h-3" />
          </button>
        </motion.div>
      </div>

      {/* ── Row 3: Automation Rate (1/3) + Recent Activity (2/3) ── */}
      <div className="grid grid-cols-3 gap-4">
        {/* Automation Gauge */}
        <motion.div
          custom={4} variants={cardVariants} initial="hidden" animate="visible"
          className="data-card"
        >
          <div className="flex items-center gap-2 mb-1">
            <Zap className="w-4 h-4 text-accent-teal" />
            <h2 className="text-sm font-semibold text-text-primary tracking-wide">AUTOMATISIERUNGSGRAD</h2>
          </div>

          <div className="flex flex-col items-center mt-4">
            <CircularGauge value={73} size={130} />
            <p className="text-xs text-status-green mt-2 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" /> +5% vs. letzte Woche
            </p>
          </div>

          {/* Sparkline */}
          <div className="mt-4 h-16">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={automationTrend}>
                <Line
                  type="monotone" dataKey="value" stroke="#2DD4BF" strokeWidth={2}
                  dot={false}
                  animationDuration={800}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Driver Bars */}
          <div className="mt-4 space-y-3">
            {[
              { label: 'Workflow-Automatisierung', value: 85, color: 'bg-status-green' },
              { label: 'Approval-Automatisierung', value: 45, color: 'bg-status-yellow' },
              { label: 'Berichtserstellung', value: 92, color: 'bg-status-green' },
            ].map((driver) => (
              <div key={driver.label}>
                <div className="flex justify-between text-[10px] mb-1">
                  <span className="text-text-secondary">{driver.label}</span>
                  <span className="text-text-primary font-mono">{driver.value}%</span>
                </div>
                <div className="h-1.5 bg-bg-tertiary rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${driver.value}%` }}
                    transition={{ duration: 0.4, delay: 1.2, ease: [0.4, 0, 0.2, 1] as [number, number, number, number] }}
                    className={cn('h-full rounded-full', driver.color)}
                  />
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={() => navigate('/workflows')}
            className="mt-4 text-xs text-accent-teal hover:text-accent-teal/80 transition-colors flex items-center gap-1"
          >
            Workflows anzeigen <ChevronRight className="w-3 h-3" />
          </button>
        </motion.div>

        {/* Recent Activity */}
        <motion.div
          custom={5} variants={cardVariants} initial="hidden" animate="visible"
          className="col-span-2 data-card"
        >
          <div className="flex items-center gap-2 mb-1">
            <Activity className="w-4 h-4 text-accent-teal" />
            <h2 className="text-sm font-semibold text-text-primary tracking-wide">AKTIVITATSLOG</h2>
          </div>
          <p className="text-xs text-text-tertiary mb-4">Letzte Aktionen im System</p>

          <div className="relative">
            {/* Timeline line */}
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: '100%' }}
              transition={{ duration: 0.8, delay: 0.5, ease: easeOut }}
              className="absolute left-[52px] top-0 bottom-0 w-px border-l border-dashed border-border-default"
            />

            <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="space-y-0">
              {auditLog.slice(0, 10).map((entry, i) => {
                const initials = entry.agent.split('-').map(w => w[0]).join('').substring(0, 2);
                return (
                  <motion.div key={entry.id} variants={staggerChild} className="flex items-start gap-4 py-2 relative">
                    {/* Time */}
                    <span className="text-[11px] text-text-tertiary font-mono w-10 text-right flex-shrink-0 pt-1">
                      {entry.timestamp.substring(11, 16)}
                    </span>
                    {/* Dot */}
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ duration: 0.2, delay: 0.6 + i * 0.06 }}
                      className="w-5 h-5 rounded-full bg-bg-elevated border border-border-default flex items-center justify-center z-10 flex-shrink-0 mt-0"
                    >
                      <span className="text-[8px] font-bold text-accent-teal">{initials}</span>
                    </motion.div>
                    {/* Content */}
                    <div className="flex-1 min-w-0 flex items-center gap-3">
                      <div className="flex-1">
                        <span className="text-xs font-medium text-text-primary">{entry.agent}</span>
                        <span className="text-xs text-text-secondary ml-2">{entry.action}</span>
                      </div>
                      {entry.project && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-bg-tertiary text-text-tertiary flex-shrink-0">
                          {entry.project}
                        </span>
                      )}
                      {entry.riskScore > 50 && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded badge-red flex-shrink-0">
                          {entry.riskScore > 80 ? 'Kritisch' : entry.riskScore > 50 ? 'Hoch' : 'Mittel'}
                        </span>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          </div>
        </motion.div>
      </div>

      {/* ── Row 4: Liquidity Trend (1/2) + Department Health (1/2) ── */}
      <div className="grid grid-cols-2 gap-4">
        {/* Liquidity Trend */}
        <motion.div
          custom={6} variants={cardVariants} initial="hidden" animate="visible"
          className="data-card"
        >
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 text-accent-teal" />
            <h2 className="text-sm font-semibold text-text-primary tracking-wide">LIQUIDITATSTREND</h2>
          </div>

          {/* Current Value */}
          <div className="flex items-baseline gap-3 mb-4">
            <span className="text-xl font-mono font-medium text-text-primary">EUR 12.450</span>
            <span className="text-xs text-text-tertiary">10.03.2025</span>
          </div>

          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={liquidityTrend} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                <defs>
                  <linearGradient id="liquidityGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2DD4BF" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#2DD4BF" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="warningGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#EF4444" stopOpacity={0.1} />
                    <stop offset="100%" stopColor="#EF4444" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1A1A24" />
                <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#6B7280' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#6B7280' }} axisLine={false} tickLine={false} domain={[0, 20000]} />
                <Tooltip
                  contentStyle={{
                    background: '#22222E', border: '1px solid #3A3A4A', borderRadius: '8px',
                    fontSize: '12px', color: '#F0F0F5',
                  }}
                  formatter={(value: number) => [`EUR ${value.toLocaleString()}`, 'Liquiditat']}
                />
                {/* Warning zone below EUR 5000 */}
                <Area type="monotone" dataKey="value" stroke="#2DD4BF" strokeWidth={2} fill="url(#liquidityGrad)" animationDuration={1000} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 mt-3">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-accent-teal rounded" />
              <span className="text-[10px] text-text-tertiary">Liquiditat</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-status-yellow rounded border-dashed" style={{ background: 'repeating-linear-gradient(90deg, #F59E0B 0px, #F59E0B 3px, transparent 3px, transparent 5px)' }} />
              <span className="text-[10px] text-text-tertiary">Break-even (EUR 8k)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-status-red/15" />
              <span className="text-[10px] text-text-tertiary">Warnung &lt; EUR 5k</span>
            </div>
          </div>
        </motion.div>

        {/* Department Health */}
        <motion.div
          custom={7} variants={cardVariants} initial="hidden" animate="visible"
          className="data-card"
        >
          <div className="flex items-center gap-2 mb-1">
            <Building2 className="w-4 h-4 text-accent-teal" />
            <h2 className="text-sm font-semibold text-text-primary tracking-wide">ABTEILUNGS-STATUS</h2>
          </div>
          <p className="text-xs text-text-tertiary mb-4">Gesundheit aller 14 Abteilungen</p>

          <motion.div
            variants={staggerContainer} initial="hidden" animate="visible"
            className="grid grid-cols-2 gap-2"
          >
            {departments.map((dept) => {
              const statusColors: Record<string, string> = {
                active: 'bg-status-green shadow-glow-green',
                inactive: 'bg-text-muted',
                maintenance: 'bg-status-yellow shadow-glow-yellow',
              };
              const taskCount = dept.currentTasks.length;
              const taskColor = taskCount >= 6 ? 'bg-status-red/15 text-status-red' : taskCount >= 3 ? 'bg-status-yellow/15 text-status-yellow' : 'bg-status-green/15 text-status-green';

              return (
                <motion.button
                  key={dept.id}
                  variants={staggerChild}
                  onClick={() => navigate('/departments')}
                  className="flex items-center gap-2 bg-bg-tertiary hover:border-border-default border border-transparent rounded-lg px-3 py-2 transition-colors text-left group"
                >
                  <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', statusColors[dept.status] || 'bg-text-muted')} />
                  <span className="text-[11px] font-medium text-text-primary flex-1 truncate">{dept.name}</span>
                  <span className="text-[10px] text-text-tertiary flex-shrink-0">{dept.agents.length}</span>
                  <span className={cn('text-[10px] px-1 py-0.5 rounded flex-shrink-0', taskColor)}>
                    {taskCount}
                  </span>
                </motion.button>
              );
            })}
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
