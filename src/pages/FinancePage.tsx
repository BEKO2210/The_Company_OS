import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Wallet, FileText, TrendingUp, AlertTriangle,
  Download, FileSpreadsheet, ChevronRight, AlertCircle,
  Send, CheckCircle, Clock, XCircle
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
  BarChart, Bar, ReferenceLine
} from 'recharts';
import { cn } from '@/lib/utils';
import { financeEntries, invoices, budgets, liquidityTrend } from '@/data/mockData';
import type { Invoice } from '@/data/models';
import { PredictionChart } from '@/components/ai';
import { useCompanyConfig } from '@/contexts/CompanyContext';

/* ─── helpers ─── */
const eur = (n: number) =>
  new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(n);

const statusIcon = (s: Invoice['status']) => {
  switch (s) {
    case 'draft': return <Clock className="w-3.5 h-3.5" />;
    case 'pending': return <AlertCircle className="w-3.5 h-3.5" />;
    case 'sent': return <Send className="w-3.5 h-3.5" />;
    case 'paid': return <CheckCircle className="w-3.5 h-3.5" />;
    case 'overdue': return <XCircle className="w-3.5 h-3.5" />;
  }
};

const statusBadge = (s: Invoice['status']) => {
  const map: Record<string, string> = {
    draft: 'badge-gray',
    pending: 'badge-yellow',
    sent: 'badge-blue',
    paid: 'badge-green',
    overdue: 'badge-red',
  };
  return map[s] || 'badge-gray';
};

const stagger = (i: number) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.35, delay: i * 0.06, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }
});

/* ─── Budget card ─── */
function BudgetCard({ budget, index }: { budget: typeof budgets[0]; index: number }) {
  const pct = budget.limit > 0 ? (budget.spent / budget.limit) * 100 : 0;
  const critical = pct >= (budget.criticalAt * 100);
  const warning = !critical && pct >= (budget.warningAt * 100);
  const barColor = critical ? 'bg-status-red' : warning ? 'bg-status-yellow' : 'bg-status-green';

  return (
    <motion.div key={budget.id} {...stagger(index)} className="data-card">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-text-primary">{budget.name}</h3>
        <span className={cn('text-[11px] font-medium px-2 py-0.5 rounded-full', statusBadge(pct >= 90 ? 'overdue' : pct >= 75 ? 'pending' : 'paid'))}>
          {pct.toFixed(0)}%
        </span>
      </div>
      <div className="font-mono-data text-xl font-medium text-text-primary mb-1">
        {eur(budget.spent)}
      </div>
      <div className="text-xs text-text-tertiary mb-3">
        von {eur(budget.limit)} — {eur(budget.remaining)} verfugbar
      </div>
      <div className="h-1.5 bg-bg-tertiary rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(pct, 100)}%` }}
          transition={{ duration: 0.8, delay: 0.3 + index * 0.1, ease: [0.4, 0, 0.2, 1] as [number, number, number, number] }}
          className={cn('h-full rounded-full', barColor)}
        />
      </div>
      {critical && (
        <div className="flex items-center gap-1.5 mt-2 text-[11px] text-status-red">
          <AlertTriangle className="w-3 h-3" />
          Kritischer Schwellenwert erreicht
        </div>
      )}
      {warning && !critical && (
        <div className="flex items-center gap-1.5 mt-2 text-[11px] text-status-yellow">
          <AlertTriangle className="w-3 h-3" />
          Warnschwelle erreicht
        </div>
      )}
    </motion.div>
  );
}

/* ─── Main Page ─── */
export default function FinancePage() {
  const { config } = useCompanyConfig();
  const monthlyBudget = config.budget.monthly;
  const liquidityTarget = config.budget.liquidityTarget;

  const [invoiceFilter, setInvoiceFilter] = useState<string>('all');

  /* Summary calculations */
  const openInvoices = invoices.filter(i => i.status !== 'paid');
  const openAmount = openInvoices.reduce((s, i) => s + i.amount, 0);
  const overdueCount = invoices.filter(i => i.status === 'overdue').length;

  const donutData = useMemo(() => [] as { name: string; value: number; color: string }[], []);

  const breakEvenTarget = config.budget.breakEvenTarget;
  const currentMRR = 0;
  const breakEvenProgress = breakEvenTarget > 0 ? Math.min((currentMRR / breakEvenTarget) * 100, 100) : 0;

  const projectionData = useMemo(() => [] as { month: string; projected: number }[], []);

  const costStructureData: { name: string; amount: number; pct: string }[] = [];

  const filteredInvoices = invoiceFilter === 'all'
    ? invoices
    : invoices.filter(i => i.status === invoiceFilter);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="max-w-container mx-auto"
    >
      {/* ── Page Header ── */}
      <motion.div {...stagger(0)} className="mb-6">
        <div className="flex items-center gap-2 text-xs text-text-tertiary mb-1">
          <span>Dashboard</span>
          <ChevronRight className="w-3 h-3" />
          <span className="text-text-secondary">Finanzen</span>
        </div>
        <div className="flex items-end justify-between">
          <div>
            <h1 className="text-[2rem] font-bold text-text-primary tracking-tight">FINANZEN</h1>
            <p className="text-sm text-text-secondary mt-0.5">Finanzkontrolle & Liquiditatsmanagement</p>
          </div>
          <div className="flex gap-2">
            <button className="flex items-center gap-2 px-3 py-2 rounded-button border border-border-default text-sm text-text-secondary hover:bg-bg-tertiary transition-colors">
              <FileSpreadsheet className="w-4 h-4" />
              Finanz-Report
            </button>
            <button className="flex items-center gap-2 px-3 py-2 rounded-button border border-border-default text-sm text-text-secondary hover:bg-bg-tertiary transition-colors">
              <Download className="w-4 h-4" />
              Export
            </button>
          </div>
        </div>
      </motion.div>

      {/* ── Summary Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Liquiditat */}
        <motion.div {...stagger(0)} className="data-card">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold tracking-wider text-text-tertiary uppercase">Liquiditat</span>
            <span className="badge-green text-[11px] font-medium px-2 py-0.5 rounded-full">OK</span>
          </div>
          <div className="font-mono-data text-2xl font-medium text-text-primary mb-1">
            {eur(0)}
          </div>
          <div className="text-[11px] text-text-tertiary">
            {liquidityTarget > 0 ? `Ziel: ${eur(liquidityTarget)}` : 'Kein Ziel definiert'}
          </div>
        </motion.div>

        {/* Monatsbudget */}
        <motion.div {...stagger(1)} className="data-card">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold tracking-wider text-text-tertiary uppercase">Monatsbudget</span>
          </div>
          <div className="font-mono-data text-lg font-medium text-text-primary mb-1">
            {eur(0)} / {eur(monthlyBudget)}
          </div>
          <div className="h-1.5 bg-bg-tertiary rounded-full overflow-hidden mb-2">
            <div className="h-full w-0 bg-text-muted rounded-full" />
          </div>
          <div className="text-[11px] text-text-tertiary">
            {monthlyBudget > 0 ? `${eur(monthlyBudget)} verfuegbar` : 'Kein Budget definiert'}
          </div>
        </motion.div>

        {/* Offene Rechnungen */}
        <motion.div {...stagger(2)} className="data-card">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold tracking-wider text-text-tertiary uppercase">Offene Rechnungen</span>
            {overdueCount > 0 && (
              <span className="badge-red text-[11px] font-medium px-2 py-0.5 rounded-full">{overdueCount} uberfallig</span>
            )}
          </div>
          <div className="font-mono-data text-2xl font-medium text-status-yellow mb-1">
            {eur(openAmount)}
          </div>
          <div className="text-xs text-text-secondary mb-1">{openInvoices.length} Rechnungen</div>
          <div className="text-[11px] text-text-tertiary">Keine erwarteten Eingange</div>
        </motion.div>

        {/* Break-Even */}
        <motion.div {...stagger(3)} className="data-card">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold tracking-wider text-text-tertiary uppercase">Break-Even</span>
          </div>
          <div className="font-mono-data text-lg font-medium text-text-primary mb-1">
            {eur(breakEvenTarget)}/Monat
          </div>
          <div className="text-xs text-text-secondary mb-1">{eur(0)} MRR aktuell</div>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-bg-tertiary rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${breakEvenProgress}%` }}
                transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] as [number, number, number, number] }}
                className="h-full bg-status-yellow rounded-full"
              />
            </div>
            <span className="text-[11px] text-text-tertiary">{breakEvenProgress.toFixed(0)}%</span>
          </div>
          <div className="text-xs text-text-tertiary mt-1">-{eur(0)}</div>
        </motion.div>
      </div>

      {/* ── AI Prediction Chart ── */}
      <div className="mb-6">
        <PredictionChart />
      </div>

      {/* ── Liquidity Chart + Budget Donut ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        {/* Liquidity Trend */}
        <motion.div {...stagger(4)} className="data-card lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-text-primary tracking-tight">LIQUIDITATSTREND — 30 TAGE</h2>
          </div>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={liquidityTrend} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <defs>
                  <linearGradient id="liquidityGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2DD4BF" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#2DD4BF" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1A1A24" vertical={false} />
                <XAxis
                  dataKey="day"
                  tick={{ fill: '#6B7280', fontSize: 11 }}
                  axisLine={{ stroke: '#2A2A36' }}
                  tickLine={false}
                  interval={4}
                />
                <YAxis
                  tick={{ fill: '#6B7280', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                  domain={[8000, 20000]}
                />
                <Tooltip
                  contentStyle={{
                    background: '#1A1A24',
                    border: '1px solid #3A3A4A',
                    borderRadius: 8,
                    fontSize: 12,
                    color: '#F0F0F5',
                  }}
                  formatter={(value: number) => [eur(value), 'Liquiditat']}
                  labelFormatter={(label) => `Tag ${label}`}
                />
                <ReferenceLine y={15000} stroke="#10B981" strokeDasharray="4 4" strokeOpacity={0.6} />
                <ReferenceLine y={8000} stroke="#F59E0B" strokeDasharray="4 4" strokeOpacity={0.6} />
                <ReferenceLine y={5000} stroke="#EF4444" strokeDasharray="4 4" strokeOpacity={0.6} />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#2DD4BF"
                  strokeWidth={2}
                  fill="url(#liquidityGrad)"
                  animationDuration={1200}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center gap-4 mt-3 text-[11px] text-text-tertiary">
            <div className="flex items-center gap-1.5"><div className="w-3 h-0 border-t border-dashed border-status-green" /> Ziel {eur(15000)}</div>
            <div className="flex items-center gap-1.5"><div className="w-3 h-0 border-t border-dashed border-status-yellow" /> Break-Even {eur(8000)}</div>
            <div className="flex items-center gap-1.5"><div className="w-3 h-0 border-t border-dashed border-status-red" /> Warnung {eur(5000)}</div>
          </div>
        </motion.div>

        {/* Budget Donut */}
        <motion.div {...stagger(5)} className="data-card">
          <h2 className="text-sm font-semibold text-text-primary tracking-tight mb-4">BUDGET-AUFSCHLUSSELUNG</h2>
          <div className="flex items-center justify-center mb-4">
            <div className="relative w-[140px] h-[140px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={donutData}
                    cx="50%"
                    cy="50%"
                    innerRadius={42}
                    outerRadius={65}
                    paddingAngle={2}
                    dataKey="value"
                    stroke="none"
                    animationBegin={300}
                    animationDuration={800}
                  >
                    {donutData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="font-mono-data text-base font-medium text-text-primary">{eur(0)}</span>
              </div>
            </div>
          </div>
          <div className="space-y-2">
            {donutData.map((d, i) => (
              <motion.div
                key={d.name}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 + i * 0.05 }}
                className="flex items-center gap-2"
              >
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: d.color }} />
                <span className="text-xs text-text-secondary flex-1">{d.name}</span>
                <span className="font-mono-data text-xs text-text-primary">{eur(d.value)}</span>
                <span className="text-[11px] text-text-tertiary w-8 text-right">0%</span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* ── Invoice Queue ── */}
      <motion.div {...stagger(6)} className="data-card mb-6">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-accent-teal" />
            <h2 className="text-sm font-semibold text-text-primary tracking-tight">RECHNUNGSSTATUS</h2>
          </div>
          <div className="flex gap-1">
            {['all', 'draft', 'pending', 'sent', 'paid', 'overdue'].map(f => (
              <button
                key={f}
                onClick={() => setInvoiceFilter(f)}
                className={cn(
                  'px-2.5 py-1 rounded-button text-[11px] font-medium transition-colors',
                  invoiceFilter === f
                    ? 'bg-accent-teal/15 text-accent-teal'
                    : 'text-text-tertiary hover:text-text-secondary hover:bg-bg-tertiary'
                )}
              >
                {f === 'all' ? 'Alle' : f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border-subtle">
                <th className="text-left text-[11px] font-semibold text-text-tertiary uppercase tracking-wider py-2.5 px-3">ID</th>
                <th className="text-left text-[11px] font-semibold text-text-tertiary uppercase tracking-wider py-2.5 px-3">Studio</th>
                <th className="text-right text-[11px] font-semibold text-text-tertiary uppercase tracking-wider py-2.5 px-3">Betrag</th>
                <th className="text-center text-[11px] font-semibold text-text-tertiary uppercase tracking-wider py-2.5 px-3">Status</th>
                <th className="text-left text-[11px] font-semibold text-text-tertiary uppercase tracking-wider py-2.5 px-3">Fallig</th>
                <th className="text-center text-[11px] font-semibold text-text-tertiary uppercase tracking-wider py-2.5 px-3">Blockiert</th>
              </tr>
            </thead>
            <tbody>
              {filteredInvoices.map((inv, i) => (
                <motion.tr
                  key={inv.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.08 }}
                  className={cn(
                    'border-b border-border-subtle/50 hover:bg-bg-tertiary/50 transition-colors',
                    inv.blocked && 'bg-status-red/5'
                  )}
                >
                  <td className="py-2.5 px-3 text-xs font-mono-data text-text-secondary">{inv.id}</td>
                  <td className="py-2.5 px-3 text-xs text-text-primary">{inv.studio}</td>
                  <td className="py-2.5 px-3 text-xs font-mono-data text-text-primary text-right">{eur(inv.amount)}</td>
                  <td className="py-2.5 px-3 text-center">
                    <span className={cn('inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full', statusBadge(inv.status))}>
                      {statusIcon(inv.status)}
                      {inv.status.charAt(0).toUpperCase() + inv.status.slice(1)}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-xs text-text-secondary">{inv.dueDate}</td>
                  <td className="py-2.5 px-3 text-center">
                    {inv.blocked ? (
                      <span className="inline-flex items-center gap-1 text-[11px] text-status-red">
                        <AlertTriangle className="w-3 h-3" /> Ja
                      </span>
                    ) : (
                      <span className="text-[11px] text-text-muted">—</span>
                    )}
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* ── Budget Cards ── */}
      <div className="mb-6">
        <motion.h2 {...stagger(7)} className="text-sm font-semibold text-text-primary tracking-tight mb-3 flex items-center gap-2">
          <Wallet className="w-4 h-4 text-accent-teal" />
          BUDGET-Ubersicht
        </motion.h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {budgets.map((b, i) => (
            <BudgetCard key={b.id} budget={b} index={i} />
          ))}
        </div>
      </div>

      {/* ── Break-Even + Cost Structure ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        {/* Break-Even */}
        <motion.div {...stagger(8)} className="data-card">
          <h2 className="text-sm font-semibold text-text-primary tracking-tight mb-4">BREAK-EVEN ANALYSE</h2>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div>
              <div className="text-[11px] text-text-tertiary uppercase mb-1">Aktueller MRR</div>
              <div className="font-mono-data text-xl font-medium text-accent-teal">{eur(currentMRR)}</div>
            </div>
            <div>
              <div className="text-[11px] text-text-tertiary uppercase mb-1">Break-Even</div>
              <div className="font-mono-data text-xl font-medium text-status-yellow">{eur(breakEvenTarget)}</div>
            </div>
            <div>
              <div className="text-[11px] text-text-tertiary uppercase mb-1">Gap</div>
              <div className="font-mono-data text-xl font-medium text-text-tertiary">{eur(0)}</div>
            </div>
          </div>

          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs text-text-secondary">Fortschritt zum Break-Even</span>
            <span className="text-xs text-text-tertiary">{breakEvenProgress.toFixed(0)}%</span>
          </div>
          <div className="h-2.5 bg-bg-tertiary rounded-full overflow-hidden mb-4">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${breakEvenProgress}%` }}
              transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] as [number, number, number, number] }}
              className="h-full bg-status-yellow rounded-full"
            />
          </div>

          <div className="h-[180px] mb-3">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={projectionData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                <defs>
                  <linearGradient id="projGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10B981" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="#10B981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1A1A24" vertical={false} />
                <XAxis dataKey="month" tick={{ fill: '#6B7280', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#6B7280', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <ReferenceLine y={breakEvenTarget} stroke="#F59E0B" strokeDasharray="4 4" strokeOpacity={0.6} />
                <Area type="monotone" dataKey="projected" stroke="#10B981" strokeWidth={2} fill="url(#projGrad)" animationDuration={1000} />
                <Tooltip
                  contentStyle={{ background: '#1A1A24', border: '1px solid #3A3A4A', borderRadius: 8, fontSize: 12, color: '#F0F0F5' }}
                  formatter={(value: number) => [eur(value), 'Projiziert']}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="text-[11px] text-text-tertiary space-y-0.5">
            <div>Monatliches Wachstum: {eur(0)}</div>
            <div>Churn-Rate: 0%</div>
            <div>Durchschnittlicher ACV: {eur(0)}</div>
          </div>
        </motion.div>

        {/* Cost Structure */}
        <motion.div {...stagger(9)} className="data-card">
          <h2 className="text-sm font-semibold text-text-primary tracking-tight mb-4">KOSTENSTRUKTUR</h2>
          <div className="overflow-x-auto mb-4">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border-subtle">
                  <th className="text-left text-[11px] font-semibold text-text-tertiary uppercase py-2 px-2">Kategorie</th>
                  <th className="text-right text-[11px] font-semibold text-text-tertiary uppercase py-2 px-2">Betrag</th>
                  <th className="text-right text-[11px] font-semibold text-text-tertiary uppercase py-2 px-2">%</th>
                </tr>
              </thead>
              <tbody>
                {costStructureData.map((c, i) => (
                  <motion.tr
                    key={c.name}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4 + i * 0.05 }}
                    className="border-b border-border-subtle/50 hover:bg-bg-tertiary/50 transition-colors"
                  >
                    <td className="py-2 px-2 text-xs text-text-primary">{c.name}</td>
                    <td className="py-2 px-2 text-xs font-mono-data text-text-primary text-right">{eur(c.amount)}</td>
                    <td className="py-2 px-2 text-xs text-text-tertiary text-right">{c.pct}</td>
                  </motion.tr>
                ))}
                <tr className="bg-bg-tertiary/40">
                  <td className="py-2 px-2 text-xs font-semibold text-text-primary">Gesamt</td>
                  <td className="py-2 px-2 text-xs font-mono-data font-semibold text-text-primary text-right">{eur(costStructureData.reduce((s, c) => s + c.amount, 0))}</td>
                  <td className="py-2 px-2 text-xs font-semibold text-text-tertiary text-right">{costStructureData.length > 0 ? '100%' : '0%'}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* 6-month cost bar chart */}
          <div className="h-[140px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={[] as { month: string; cost: number }[]} margin={{ top: 5, right: 5, left: -15, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1A1A24" vertical={false} />
                <XAxis dataKey="month" tick={{ fill: '#6B7280', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#6B7280', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={{ background: '#1A1A24', border: '1px solid #3A3A4A', borderRadius: 8, fontSize: 12, color: '#F0F0F5' }}
                  formatter={(value: number) => [eur(value), 'Kosten']}
                />
                <Bar dataKey="cost" fill="#2DD4BF" radius={[4, 4, 0, 0]} animationDuration={600} animationBegin={300} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>

      {/* ── Finance Entries Table ── */}
      <motion.div {...stagger(10)} className="data-card">
        <h2 className="text-sm font-semibold text-text-primary tracking-tight mb-4">KATEGORIE-Details</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border-subtle">
                <th className="text-left text-[11px] font-semibold text-text-tertiary uppercase tracking-wider py-2.5 px-3">Kategorie</th>
                <th className="text-right text-[11px] font-semibold text-text-tertiary uppercase tracking-wider py-2.5 px-3">Budget</th>
                <th className="text-right text-[11px] font-semibold text-text-tertiary uppercase tracking-wider py-2.5 px-3">Ausgegeben</th>
                <th className="text-right text-[11px] font-semibold text-text-tertiary uppercase tracking-wider py-2.5 px-3">Prognose</th>
                <th className="text-right text-[11px] font-semibold text-text-tertiary uppercase tracking-wider py-2.5 px-3">Varianz</th>
                <th className="text-center text-[11px] font-semibold text-text-tertiary uppercase tracking-wider py-2.5 px-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {financeEntries.map((fe, i) => {
                const pct = fe.budget > 0 ? (fe.spent / fe.budget) * 100 : 0;
                const isOver = fe.projected > fe.budget;
                return (
                  <motion.tr
                    key={fe.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 + i * 0.05 }}
                    className="border-b border-border-subtle/50 hover:bg-bg-tertiary/50 transition-colors"
                  >
                    <td className="py-2.5 px-3 text-xs text-text-primary">{fe.category}</td>
                    <td className="py-2.5 px-3 text-xs font-mono-data text-text-primary text-right">{eur(fe.budget)}</td>
                    <td className="py-2.5 px-3 text-xs font-mono-data text-text-primary text-right">{eur(fe.spent)}</td>
                    <td className={cn('py-2.5 px-3 text-xs font-mono-data text-right', isOver ? 'text-status-red' : 'text-text-primary')}>
                      {eur(fe.projected)}
                    </td>
                    <td className={cn('py-2.5 px-3 text-xs font-mono-data text-right', fe.variance < 0 ? 'text-status-red' : 'text-status-green')}>
                      {fe.variance > 0 ? '+' : ''}{eur(fe.variance)}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span className={cn('text-[11px] font-medium px-2 py-0.5 rounded-full',
                        pct >= 95 ? 'badge-red' : pct >= 75 ? 'badge-yellow' : 'badge-green'
                      )}>
                        {pct.toFixed(0)}%
                      </span>
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </motion.div>
    </motion.div>
  );
}
