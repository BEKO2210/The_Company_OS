import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Boxes,
  Search,
  ChevronRight,
  X,
  TrendingUp,
  TrendingDown,
  Minus,
  Bot,
  Users,
  AlertTriangle,
  Layers,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { BusinessUnit } from '@/data/models';
import { useCompanyConfig } from '@/contexts/CompanyContext';
import { deriveBusinessUnits } from '@/lib/companyAdapter';

/* ── status helpers ── */
function statusConfig(status: BusinessUnit['status']) {
  switch (status) {
    case 'active':
      return { label: 'Aktiv', badge: 'badge-green', dot: 'status-dot-green', border: 'border-status-green' };
    case 'parked':
      return { label: 'Geparkt', badge: 'badge-yellow', dot: 'status-dot-yellow', border: 'border-border-subtle' };
    case 'internal-active':
      return { label: 'Intern Aktiv', badge: 'badge-blue', dot: 'bg-accent-blue', border: 'border-accent-blue' };
    default:
      return { label: status, badge: 'badge-gray', dot: 'status-dot-gray', border: 'border-border-subtle' };
  }
}

function riskScoreColor(score: number) {
  if (score <= 35) return { bar: 'bg-status-green', text: 'text-status-green', label: 'Niedrig' };
  if (score <= 55) return { bar: 'bg-status-yellow', text: 'text-status-yellow', label: 'Mittel' };
  if (score <= 70) return { bar: 'bg-status-orange', text: 'text-status-orange', label: 'Mittel-Hoch' };
  return { bar: 'bg-status-red', text: 'text-status-red', label: 'Hoch' };
}

function isUnitActive(unit: BusinessUnit) {
  return unit.status === 'active' || unit.status === 'internal-active';
}

function computeRiskScore(unit: BusinessUnit): number {
  const baseScores: Record<string, number> = {
    'unit-a': 35, 'unit-b': 55, 'unit-c': 65, 'unit-d': 50,
    'unit-e': 45, 'unit-f': 60, 'unit-g': 70, 'unit-h': 25,
  };
  return baseScores[unit.id] ?? 50;
}

function computeTopRisks(unit: BusinessUnit): string[] {
  const riskMap: Record<string, string[]> = {
    'unit-a': ['Wettbewerbsdruck im AI-Markt', 'Kundenzufriedenheit QA'],
    'unit-b': ['Ressourcenkonflikt mit Unit A', 'Markteintrittsstrategie unklar'],
    'unit-c': ['Lokale Operations-Komplexitat', 'Regulatorische Anforderungen'],
    'unit-d': ['Content-Qualitat ohne Human-Review', 'Kundenakquisitionsstrategie'],
    'unit-e': ['Qualitatssicherung externer Projekte', 'Expert-Verfugbarkeit'],
    'unit-f': ['Hohe Entwicklungskosten', 'Unklare Monetarisierung'],
    'unit-g': ['Physische Infrastruktur erforderlich', 'Regulatorische Komplexitat'],
    'unit-h': ['Tool-Abhangigkeit', 'Wartungsaufwand'],
  };
  return riskMap[unit.id] ?? unit.risks.slice(0, 2);
}

/* ── KPI display values (enriched beyond mock data) ── */
function getKpiDisplay(unit: BusinessUnit): { label: string; value: string; trend?: string; trendUp?: boolean }[] {
  const kpis = unit.kpis;
  switch (unit.id) {
    case 'unit-a':
      return [
        { label: 'MRR', value: 'EUR 3.200', trend: '+12%', trendUp: true },
        { label: 'Kunden', value: '14', trend: '+3', trendUp: true },
        { label: 'Churn', value: '2%', trend: '-1%', trendUp: true },
      ];
    case 'unit-b':
      return [
        { label: 'MRR', value: kpis[1]?.value ?? 'EUR 0', trend: undefined, trendUp: undefined },
        { label: 'Produkte in Pipeline', value: '3', trend: undefined, trendUp: undefined },
        { label: 'MRR Potential', value: 'EUR 2.500', trend: undefined, trendUp: undefined },
      ];
    case 'unit-c':
      return [
        { label: 'MRR', value: 'EUR 0', trend: undefined, trendUp: undefined },
        { label: 'MRR Potential', value: 'EUR 4.000', trend: undefined, trendUp: undefined },
        { label: 'Lokale Partner', value: '0', trend: undefined, trendUp: undefined },
      ];
    case 'unit-d':
      return [
        { label: 'MRR', value: 'EUR 0', trend: undefined, trendUp: undefined },
        { label: 'MRR Potential', value: 'EUR 3.500', trend: undefined, trendUp: undefined },
        { label: 'Kunden-Pipeline', value: '0', trend: undefined, trendUp: undefined },
      ];
    case 'unit-e':
      return [
        { label: 'MRR', value: 'EUR 0', trend: undefined, trendUp: undefined },
        { label: 'MRR Potential', value: 'EUR 5.000', trend: undefined, trendUp: undefined },
        { label: 'Expert-Network', value: '3', trend: undefined, trendUp: undefined },
      ];
    case 'unit-f':
      return [
        { label: 'MRR', value: 'EUR 0', trend: undefined, trendUp: undefined },
        { label: 'MRR Potential', value: 'EUR 2.000', trend: undefined, trendUp: undefined },
        { label: 'Prototypen', value: '1', trend: undefined, trendUp: undefined },
      ];
    case 'unit-g':
      return [
        { label: 'MRR', value: 'EUR 0', trend: undefined, trendUp: undefined },
        { label: 'MRR Potential', value: 'EUR 3.000', trend: undefined, trendUp: undefined },
        { label: 'Lokale Standorte', value: '0', trend: undefined, trendUp: undefined },
      ];
    case 'unit-h':
      return [
        { label: 'Automatisierung', value: '73%', trend: '+5%', trendUp: true },
        { label: 'Zeitersparnis/Woche', value: '32h', trend: '+4h', trendUp: true },
        { label: 'Kosten gespart/Mon', value: 'EUR 1.800', trend: '+12%', trendUp: true },
      ];
    default:
      return kpis.map((k) => ({ label: k.name, value: k.value }));
  }
}

function getDescription(unit: BusinessUnit): string {
  const descriptions: Record<string, string> = {
    'unit-a': 'Entwicklung und Vertrieb von AI-gestutzten Softwareprodukten. Hauptumsatztrager.',
    'unit-b': 'Entwicklung und Verkauf von digitalen Produkten, Templates und Tools. Aktivierung geplant fur Q3.',
    'unit-c': 'Vermittlung physischer Dienstleistungen uber digitale Plattform. Lokale Operationen erforderlich.',
    'unit-d': 'Vollautomatische Marketing-Agentur fur externe Kunden. Content-Erstellung, Kampagnenmanagement, Analytics.',
    'unit-e': 'Premium Engineering-Dienstleistungen fur externe Kunden. Architekturberatung, Code-Reviews, Systemdesign.',
    'unit-f': 'Entwicklung von Spielen, Medieninhalten und interaktiven Erlebnissen. Kreativstudio mit AI-Unterstutzung.',
    'unit-g': 'Lokales Operations-Netzwerk fur physische Services. Koordination von Partnern vor Ort.',
    'unit-h': 'Interne Werkzeuge, Automatisierungen und Infrastruktur. Kein externer Umsatz, aber kritisch fur Effizienz.',
  };
  return descriptions[unit.id] ?? unit.purpose;
}

/* ── filter types ── */
type StatusFilter = 'all' | 'active' | 'parked' | 'internal';
type RiskFilter = 'all' | 'low' | 'medium' | 'high';

/* ── Detail Drawer ── */
function DetailDrawer({ unit, onClose }: { unit: BusinessUnit; onClose: () => void }) {
  const cfg = statusConfig(unit.status);
  const riskScore = computeRiskScore(unit);
  const riskCol = riskScoreColor(riskScore);
  const topRisks = computeTopRisks(unit);
  const kpis = getKpiDisplay(unit);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-[100] flex justify-end"
      onClick={onClose}
    >
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-[4px]" />

      {/* Drawer */}
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
            <span className={cn('text-xs font-bold px-2 py-1 rounded-md uppercase tracking-wider', cfg.badge)}>
              UNIT {unit.code}
            </span>
            <h2 className="text-lg font-semibold text-text-primary tracking-tight">{unit.name}</h2>
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
          {/* Status & Phase */}
          <div className="flex items-center gap-3 flex-wrap">
            <span className={cn('text-xs font-semibold px-2.5 py-1 rounded-md', cfg.badge)}>
              {cfg.label}
            </span>
            <span className="text-xs text-text-tertiary bg-bg-elevated px-2.5 py-1 rounded-md">
              Phase {unit.phase}
            </span>
            <span className="text-xs text-text-tertiary bg-bg-elevated px-2.5 py-1 rounded-md">
              {unit.revenueModel}
            </span>
          </div>

          {/* Purpose */}
          <div>
            <h3 className="text-sm font-semibold text-text-primary mb-2 flex items-center gap-2">
              <Layers className="w-4 h-4 text-accent-teal" />
              Beschreibung
            </h3>
            <p className="text-sm text-text-secondary leading-relaxed">{getDescription(unit)}</p>
          </div>

          {/* KPIs */}
          <div>
            <h3 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2">
              <Zap className="w-4 h-4 text-accent-teal" />
              KPIs
            </h3>
            <div className="grid grid-cols-3 gap-3">
              {kpis.map((kpi) => (
                <div key={kpi.label} className="bg-bg-secondary border border-border-subtle rounded-card p-3">
                  <p className="text-[10px] text-text-tertiary uppercase tracking-wider mb-1">{kpi.label}</p>
                  <p className="text-base font-mono font-medium text-text-primary">{kpi.value}</p>
                  {kpi.trend && (
                    <p className={cn('text-[10px] mt-0.5', kpi.trendUp ? 'text-status-green' : 'text-status-red')}>
                      {kpi.trendUp ? '+' : ''}{kpi.trend}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Products */}
          <div>
            <h3 className="text-sm font-semibold text-text-primary mb-2 flex items-center gap-2">
              <Boxes className="w-4 h-4 text-accent-teal" />
              Produkte
            </h3>
            {unit.products.length > 0 ? (
              <ul className="space-y-1.5">
                {unit.products.map((p) => (
                  <li key={p} className="text-sm text-text-secondary flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-accent-teal flex-shrink-0" />
                    {p}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-text-muted">Keine aktiven Produkte</p>
            )}
          </div>

          {/* Required Agents & Humans */}
          <div>
            <h3 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2">
              <Bot className="w-4 h-4 text-accent-teal" />
              Benotigte Agenten
            </h3>
            <div className="flex flex-wrap gap-2 mb-4">
              {unit.requiredAgents.map((agent) => (
                <span key={agent} className="text-xs bg-bg-elevated text-text-secondary px-2.5 py-1 rounded-md border border-border-subtle">
                  {agent}
                </span>
              ))}
            </div>
            <h3 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2">
              <Users className="w-4 h-4 text-accent-teal" />
              Benotigte Humans
            </h3>
            <div className="flex flex-wrap gap-2">
              {unit.requiredHumans.map((human) => (
                <span key={human} className="text-xs bg-bg-elevated text-text-secondary px-2.5 py-1 rounded-md border border-border-subtle">
                  {human}
                </span>
              ))}
            </div>
          </div>

          {/* Risks */}
          <div>
            <h3 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-status-orange" />
              Risiken
            </h3>
            <div className="bg-bg-secondary border border-border-subtle rounded-card p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-text-tertiary">Risk Score</span>
                <span className={cn('text-sm font-mono font-semibold', riskCol.text)}>
                  {riskScore}/100 ({riskCol.label})
                </span>
              </div>
              <div className="w-full h-1.5 bg-bg-elevated rounded-full overflow-hidden mb-3">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${riskScore}%` }}
                  transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] as [number, number, number, number] }}
                  className={cn('h-full rounded-full', riskCol.bar)}
                />
              </div>
              <div className="space-y-2">
                {topRisks.map((risk, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <AlertTriangle className="w-3.5 h-3.5 text-status-yellow mt-0.5 flex-shrink-0" />
                    <span className="text-xs text-text-secondary">{risk}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Dependencies */}
          {unit.dependencies.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-text-primary mb-2">Abhangigkeiten</h3>
              <div className="flex flex-wrap gap-2">
                {unit.dependencies.map((dep) => (
                  <span key={dep} className="text-xs bg-bg-elevated text-text-secondary px-2.5 py-1 rounded-md border border-border-subtle">
                    {dep}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ── Main Page ── */
export default function BusinessUnitsPage() {
  const { config } = useCompanyConfig();
  const businessUnits = useMemo(() => deriveBusinessUnits(config), [config]);

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [riskFilter, setRiskFilter] = useState<RiskFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUnit, setSelectedUnit] = useState<BusinessUnit | null>(null);

  const activeCount = businessUnits.filter((u) => u.status === 'active').length;
  const parkedCount = businessUnits.filter((u) => u.status === 'parked').length;
  const internalCount = businessUnits.filter((u) => u.status === 'internal-active').length;

  const filtered = useMemo(() => {
    return businessUnits.filter((unit) => {
      if (statusFilter === 'active' && unit.status !== 'active') return false;
      if (statusFilter === 'parked' && unit.status !== 'parked') return false;
      if (statusFilter === 'internal' && unit.status !== 'internal-active') return false;
      if (riskFilter !== 'all') {
        const score = computeRiskScore(unit);
        if (riskFilter === 'low' && score > 35) return false;
        if (riskFilter === 'medium' && (score <= 35 || score > 65)) return false;
        if (riskFilter === 'high' && score <= 65) return false;
      }
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          unit.name.toLowerCase().includes(q) ||
          unit.code.toLowerCase().includes(q) ||
          unit.purpose.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [businessUnits, statusFilter, riskFilter, searchQuery]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
      className="max-w-container mx-auto"
    >
      {/* ── Page Header ── */}
      <div className="mb-6">
        <nav className="text-xs text-text-tertiary mb-2 flex items-center gap-1.5">
          <span>Dashboard</span>
          <ChevronRight className="w-3 h-3" />
          <span className="text-text-secondary">Business Units</span>
        </nav>
        <div className="flex items-end justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-[2rem] font-bold text-text-primary tracking-[-0.03em] leading-[1.1]">
              BUSINESS UNITS
            </h1>
            <p className="text-sm text-text-tertiary mt-1.5">
              8 Units — Strategisches Portfolio der Holding
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-medium px-2.5 py-1 rounded-md badge-green">
              {activeCount} aktiv
            </span>
            <span className="text-[11px] font-medium px-2.5 py-1 rounded-md badge-yellow">
              {parkedCount} geparkt
            </span>
            <span className="text-[11px] font-medium px-2.5 py-1 rounded-md badge-blue">
              {internalCount} intern
            </span>
            <span className="text-[11px] font-medium px-2.5 py-1 rounded-md badge-gray">
              5 in Pipeline
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3 mt-4">
          <button disabled className="px-4 py-2 rounded-button text-sm font-medium bg-accent-teal text-bg-primary opacity-50 cursor-not-allowed">
            Neue Unit
          </button>
          <button className="px-4 py-2 rounded-button text-sm font-medium border border-border-default text-text-primary hover:bg-bg-tertiary transition-colors">
            Portfolio-Report
          </button>
        </div>
      </div>

      {/* ── Filter Bar ── */}
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input
            type="text"
            placeholder="Suche Units..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-bg-secondary border border-border-subtle rounded-input pl-9 pr-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-border-default focus:outline-none transition-colors"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
          className="bg-bg-secondary border border-border-subtle rounded-input px-3 py-2 text-sm text-text-primary focus:border-border-default focus:outline-none transition-colors cursor-pointer"
        >
          <option value="all">Alle Status</option>
          <option value="active">Aktiv</option>
          <option value="parked">Geparkt</option>
          <option value="internal">Intern</option>
        </select>
        <select
          value={riskFilter}
          onChange={(e) => setRiskFilter(e.target.value as RiskFilter)}
          className="bg-bg-secondary border border-border-subtle rounded-input px-3 py-2 text-sm text-text-primary focus:border-border-default focus:outline-none transition-colors cursor-pointer"
        >
          <option value="all">Alle Risiken</option>
          <option value="low">Niedrig</option>
          <option value="medium">Mittel</option>
          <option value="high">Hoch</option>
        </select>
      </div>

      {/* ── Cards Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filtered.map((unit, index) => {
          const cfg = statusConfig(unit.status);
          const riskScore = computeRiskScore(unit);
          const riskCol = riskScoreColor(riskScore);
          const topRisks = computeTopRisks(unit);
          const kpis = getKpiDisplay(unit);
          const active = isUnitActive(unit);

          return (
            <motion.div
              key={unit.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.4,
                delay: index * 0.08,
                ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
              }}
              onClick={() => setSelectedUnit(unit)}
              className={cn(
                'data-card cursor-pointer group',
                active && 'border-l-2',
                active && cfg.border,
                unit.status === 'parked' && 'opacity-80'
              )}
              style={{ borderLeftColor: active ? undefined : undefined }}
            >
              {/* Card Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className={cn('text-[11px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider', cfg.badge)}>
                    UNIT {unit.code}
                  </span>
                  <h3 className="text-[1.25rem] font-semibold text-text-primary tracking-[-0.015em]">
                    {unit.name}
                  </h3>
                </div>
                <span className={cn('text-[11px] font-semibold px-2 py-0.5 rounded-md', cfg.badge)}>
                  {cfg.label}
                </span>
              </div>

              {/* Revenue Model & Phase */}
              <div className="flex items-center gap-2 mb-2.5 flex-wrap">
                <span className="text-[10px] text-text-tertiary bg-bg-elevated px-2 py-0.5 rounded-md">
                  {unit.revenueModel}
                </span>
                <span className="text-[10px] text-text-tertiary bg-bg-elevated px-2 py-0.5 rounded-md">
                  Phase {unit.phase}
                </span>
              </div>

              {/* Description */}
              <p className="text-sm text-text-secondary leading-relaxed mb-4">
                {getDescription(unit)}
              </p>

              {/* KPIs */}
              <div className="grid grid-cols-3 gap-3 mb-4">
                {kpis.map((kpi) => (
                  <div key={kpi.label}>
                    <p className="text-[10px] text-text-tertiary uppercase tracking-wider mb-1">{kpi.label}</p>
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-mono font-medium text-text-primary">{kpi.value}</span>
                      {kpi.trend && (
                        <span className="flex items-center">
                          {kpi.trendUp ? (
                            <TrendingUp className="w-3 h-3 text-status-green" />
                          ) : (
                            <TrendingDown className="w-3 h-3 text-status-red" />
                          )}
                          <span className={cn('text-[10px] ml-0.5', kpi.trendUp ? 'text-status-green' : 'text-status-red')}>
                            {kpi.trend}
                          </span>
                        </span>
                      )}
                      {!kpi.trend && <Minus className="w-3 h-3 text-text-muted" />}
                    </div>
                  </div>
                ))}
              </div>

              {/* Risk Score Bar */}
              <div className="mb-3">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <AlertTriangle className="w-3 h-3 text-status-orange" />
                    <span className="text-[10px] text-text-tertiary uppercase tracking-wider">Risiko</span>
                  </div>
                  <span className={cn('text-[11px] font-mono font-semibold', riskCol.text)}>
                    {riskScore}/100
                  </span>
                </div>
                <div className="w-full h-1.5 bg-bg-elevated rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${riskScore}%` }}
                    transition={{
                      duration: 0.6,
                      delay: index * 0.08 + 0.2,
                      ease: [0.4, 0, 0.2, 1] as [number, number, number, number],
                    }}
                    className={cn('h-full rounded-full', riskCol.bar)}
                  />
                </div>
              </div>

              {/* Risk Tags */}
              <div className="flex flex-wrap gap-1.5 mb-4">
                {topRisks.map((risk, i) => (
                  <span
                    key={i}
                    className="text-[10px] text-text-secondary bg-bg-elevated border border-border-subtle px-2 py-0.5 rounded-md"
                  >
                    {risk}
                  </span>
                ))}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between pt-3 border-t border-border-subtle">
                <div className="flex items-center gap-1.5">
                  {unit.requiredAgents.slice(0, 4).map((agent) => (
                    <div
                      key={agent}
                      className="w-6 h-6 rounded-full bg-bg-elevated border border-border-default flex items-center justify-center"
                      title={agent}
                    >
                      <span className="text-[8px] font-semibold text-text-tertiary">
                        {agent.split('-')[0][0]}
                      </span>
                    </div>
                  ))}
                  {unit.requiredAgents.length > 4 && (
                    <span className="text-[10px] text-text-muted ml-0.5">+{unit.requiredAgents.length - 4}</span>
                  )}
                </div>
                <span className="text-xs text-accent-teal group-hover:underline flex items-center gap-1">
                  Details anzeigen
                  <ChevronRight className="w-3 h-3" />
                </span>
              </div>
            </motion.div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="data-card flex flex-col items-center justify-center py-24">
          <Boxes className="w-10 h-10 text-text-muted mb-3" />
          <p className="text-sm text-text-secondary">Keine Units gefunden</p>
        </div>
      )}

      {/* ── Detail Drawer ── */}
      <AnimatePresence>
        {selectedUnit && (
          <DetailDrawer unit={selectedUnit} onClose={() => setSelectedUnit(null)} />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
