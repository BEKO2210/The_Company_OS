import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  TrendingDown,
  TrendingUp,
  Minus,
  AlertTriangle,
  CheckCircle2,
  Shield,
  Search,
  ChevronDown,
  ArrowUpDown,
  Clock,
  Bot,
  Ban,
} from 'lucide-react';
import { risks, incidents } from '@/data/mockData';
import type { Risk, Incident } from '@/data/models';
import { cn } from '@/lib/utils';

// ─── Helpers ───
const riskScoreColor = (score: number): string => {
  if (score >= 15) return 'text-status-red';
  if (score >= 10) return 'text-status-orange';
  if (score >= 5) return 'text-status-yellow';
  return 'text-status-green';
};

const riskScoreBg = (score: number): string => {
  if (score >= 15) return 'bg-status-red';
  if (score >= 10) return 'bg-status-orange';
  if (score >= 5) return 'bg-status-yellow';
  return 'bg-status-green';
};

const _riskScoreBorder = (score: number): string => {
  if (score >= 15) return 'border-status-red';
  if (score >= 10) return 'border-status-orange';
  if (score >= 5) return 'border-status-yellow';
  return 'border-status-green';
};
void _riskScoreBorder;

const riskScoreBadgeBg = (score: number): string => {
  if (score >= 15) return 'badge-red';
  if (score >= 10) return 'badge-orange';
  if (score >= 5) return 'badge-yellow';
  return 'badge-green';
};

const categoryColors: Record<string, string> = {
  technical: 'badge-blue',
  legal: 'badge-teal',
  financial: 'badge-green',
  reputational: 'badge-orange',
  security: 'badge-red',
  human: 'badge-purple',
  operational: 'badge-yellow',
};

const categoryLabel = (cat: string): string => {
  const map: Record<string, string> = {
    technical: 'Technologie',
    legal: 'Rechtlich',
    financial: 'Finanzen',
    reputational: 'Markt',
    security: 'Sicherheit',
    human: 'Human',
    operational: 'Operation',
  };
  return map[cat] || cat;
};

const statusBadge = (status: string): string => {
  switch (status) {
    case 'active': return 'badge-yellow';
    case 'mitigated': return 'badge-green';
    case 'monitoring': return 'badge-blue';
    case 'closed': return 'badge-gray';
    default: return 'badge-gray';
  }
};

const statusLabel = (status: string): string => {
  switch (status) {
    case 'active': return 'aktiv';
    case 'mitigated': return 'gemildert';
    case 'monitoring': return 'uberwacht';
    case 'closed': return 'geschlossen';
    default: return status;
  }
};

const severityLabel = (sev: number): string => {
  switch (sev) {
    case 1: return 'Niedrig';
    case 2: return 'Mittel';
    case 3: return 'Hoch';
    case 4: return 'Kritisch';
    default: return 'Unbekannt';
  }
};

const incidentSeverityBadge = (sev: number): string => {
  switch (sev) {
    case 1: return 'badge-green';
    case 2: return 'badge-yellow';
    case 3: return 'badge-orange';
    case 4: return 'badge-red';
    default: return 'badge-gray';
  }
};

const incidentStatusBadge = (status: string): string => {
  switch (status) {
    case 'open': return 'badge-red';
    case 'contained': return 'badge-yellow';
    case 'resolved': return 'badge-green';
    case 'closed': return 'badge-gray';
    default: return 'badge-gray';
  }
};

const incidentStatusLabel = (status: string): string => {
  switch (status) {
    case 'open': return 'Offen';
    case 'contained': return 'In Bearbeitung';
    case 'resolved': return 'Gelost';
    case 'closed': return 'Geschlossen';
    default: return status;
  }
};

const formatId = (id: number): string => `R-${String(id).padStart(2, '0')}`;

const cellBgColor = (p: number, s: number): string => {
  const score = p * s;
  if (score >= 15) return 'bg-status-red/15';
  if (score >= 10) return 'bg-status-orange/15';
  if (score >= 5) return 'bg-status-yellow/15';
  return 'bg-status-green/15';
};

const cellBorderColor = (p: number, s: number): string => {
  const score = p * s;
  if (score >= 15) return 'border-status-red/40';
  if (score >= 10) return 'border-status-orange/40';
  if (score >= 5) return 'border-status-yellow/40';
  return 'border-status-green/40';
};

// ─── Components ───

function SummaryCards({
  totalScore,
  criticalCount,
  openIncidents,
  activeVetos,
}: {
  totalScore: number;
  criticalCount: number;
  openIncidents: number;
  activeVetos: number;
}) {
  const cards = [
    {
      label: 'GESAMTRISIKO',
      value: `${totalScore}/100`,
      subtitle: totalScore > 60 ? 'Hohes Risikoniveau' : totalScore > 30 ? 'Mittleres Risikoniveau' : 'Niedriges Risikoniveau',
      trend: '-3% vs. letzte Woche',
      trendUp: false,
      trendPositive: true,
      color: totalScore > 60 ? 'text-status-red' : totalScore > 30 ? 'text-status-yellow' : 'text-status-green',
      barPercent: totalScore,
      barColor: totalScore > 60 ? 'bg-status-red' : totalScore > 30 ? 'bg-status-yellow' : 'bg-status-green',
    },
    {
      label: 'KRITISCHE RISIKEN',
      value: String(criticalCount),
      subtitle: 'Sofortige Aktion erforderlich',
      trend: '+1 vs. letzte Woche',
      trendUp: true,
      trendPositive: false,
      color: 'text-status-red',
      barPercent: (criticalCount / 5) * 100,
      barColor: 'bg-status-red',
    },
    {
      label: 'OFFENE INCIDENTS',
      value: String(openIncidents),
      subtitle: 'In Bearbeitung',
      trend: 'Unverandert',
      trendUp: false,
      trendPositive: true,
      color: 'text-status-orange',
      barPercent: (openIncidents / 5) * 100,
      barColor: 'bg-status-orange',
    },
    {
      label: 'SAFETY VETOS',
      value: String(activeVetos),
      subtitle: activeVetos === 0 ? 'Keine aktiven Vetos' : `${activeVetos} Veto(s) aktiv`,
      trend: '-',
      trendUp: false,
      trendPositive: true,
      color: 'text-status-green',
      barPercent: 0,
      barColor: 'bg-status-green',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
      {cards.map((card, i) => (
        <motion.div
          key={card.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: i * 0.06, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
          className="data-card"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-medium text-text-tertiary tracking-wider uppercase">
              {card.label}
            </span>
            {card.trend && (
              <span className={cn(
                'text-[11px] font-medium flex items-center gap-1',
                card.trendPositive ? 'text-status-green' : 'text-status-red'
              )}>
                {card.trendUp ? <TrendingUp className="w-3 h-3" /> : card.trend === '-' ? <Minus className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {card.trend}
              </span>
            )}
          </div>
          <div className={cn('font-mono-data text-2xl font-medium mb-1', card.color)}>
            {card.value}
          </div>
          <p className="text-xs text-text-secondary mb-3">{card.subtitle}</p>
          <div className="h-1.5 bg-bg-tertiary rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(card.barPercent, 100)}%` }}
              transition={{ duration: 0.8, delay: 0.3 + i * 0.06, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
              className={cn('h-full rounded-full', card.barColor)}
            />
          </div>
        </motion.div>
      ))}
    </div>
  );
}

function RiskMatrix({ filteredRisks }: { filteredRisks: Risk[] }) {
  const activeRisks = filteredRisks.filter((r) => r.status !== 'closed');

  // Count risks per cell
  const cellCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (let p = 1; p <= 5; p++) {
      for (let s = 1; s <= 5; s++) {
        counts[`${p}-${s}`] = 0;
      }
    }
    activeRisks.forEach((r) => {
      const key = `${r.probability}-${r.severity}`;
      if (counts[key] !== undefined) counts[key]++;
    });
    return counts;
  }, [activeRisks]);

  // Risks per cell for dots
  const risksByCell = useMemo(() => {
    const map: Record<string, Risk[]> = {};
    for (let p = 1; p <= 5; p++) {
      for (let s = 1; s <= 5; s++) {
        map[`${p}-${s}`] = [];
      }
    }
    activeRisks.forEach((r) => {
      const key = `${r.probability}-${r.severity}`;
      if (map[key] !== undefined) map[key].push(r);
    });
    return map;
  }, [activeRisks]);

  const probLabels = ['', 'Sehr niedrig', 'Niedrig', 'Mittel', 'Hoch', 'Sehr hoch'];
  void probLabels;
  const sevLabels = ['', 'Sehr niedrig', 'Niedrig', 'Mittel', 'Hoch', 'Sehr hoch'];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3, delay: 0.2 }}
      className="data-card"
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-text-primary">Risiko-Matrix</h2>
          <p className="text-xs text-text-tertiary mt-0.5">Wahrscheinlichkeit vs. Auswirkung</p>
        </div>
        <div className="flex items-center gap-4 text-[11px]">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-status-green/20 border border-status-green/40" />
            <span className="text-text-tertiary">Niedrig (1-4)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-status-yellow/20 border border-status-yellow/40" />
            <span className="text-text-tertiary">Mittel (5-9)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-status-orange/20 border border-status-orange/40" />
            <span className="text-text-tertiary">Hoch (10-14)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-status-red/20 border border-status-red/40" />
            <span className="text-text-tertiary">Kritisch (15-25)</span>
          </div>
        </div>
      </div>

      <div className="flex">
        {/* Y-axis label */}
        <div className="flex flex-col justify-center mr-3">
          <span
            className="text-[10px] text-text-tertiary tracking-widest uppercase whitespace-nowrap"
            style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
          >
            Wahrscheinlichkeit
          </span>
        </div>

        <div className="flex-1">
          {/* Grid */}
          <div className="grid grid-cols-5 gap-1">
            {/* Header row - severity labels */}
            {[1, 2, 3, 4, 5].map((s) => (
              <div key={`h-${s}`} className="text-center text-[10px] text-text-tertiary pb-1">
                {s} - {sevLabels[s].split(' ')[0]}
              </div>
            ))}

            {/* Matrix cells */}
            {[5, 4, 3, 2, 1].map((p) => (
              <>
                {[1, 2, 3, 4, 5].map((s) => {
                  const key = `${p}-${s}`;
                  const count = cellCounts[key];
                  const cellRisks = risksByCell[key];
                  return (
                    <motion.div
                      key={key}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{
                        duration: 0.2,
                        delay: (5 - p + s - 1) * 0.05,
                        ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
                      }}
                      className={cn(
                        'relative border rounded-md aspect-square flex flex-col items-center justify-center gap-1 overflow-hidden',
                        cellBgColor(p, s),
                        cellBorderColor(p, s)
                      )}
                    >
                      {count > 0 && (
                        <span className="text-[10px] text-text-tertiary font-medium">
                          {count}
                        </span>
                      )}
                      {/* Risk dots */}
                      <div className="flex flex-wrap gap-0.5 justify-center px-1">
                        {cellRisks.slice(0, 6).map((r, idx) => (
                          <motion.div
                            key={r.id}
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{
                              duration: 0.2,
                              delay: 0.3 + idx * 0.08,
                              ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
                            }}
                            title={`${r.name} (Score: ${r.score})`}
                            className={cn(
                              'w-3 h-3 rounded-full cursor-pointer border border-white/20',
                              riskScoreBg(r.score)
                            )}
                          />
                        ))}
                        {cellRisks.length > 6 && (
                          <span className="text-[8px] text-text-tertiary">+{cellRisks.length - 6}</span>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </>
            ))}
          </div>

          {/* X-axis label */}
          <div className="text-center mt-2">
            <span className="text-[10px] text-text-tertiary tracking-widest uppercase">
              Auswirkung (Impact)
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function RiskRegisterTable({ filteredRisks, sortBy, onSort }: {
  filteredRisks: Risk[];
  sortBy: { field: string; dir: 'asc' | 'desc' };
  onSort: (field: string) => void;
}) {
  const sorted = useMemo(() => {
    const sorted = [...filteredRisks];
    if (sortBy.field) {
      sorted.sort((a, b) => {
        let va: number | string = 0;
        let vb: number | string = 0;
        if (sortBy.field === 'score') { va = a.score; vb = b.score; }
        else if (sortBy.field === 'probability') { va = a.probability; vb = b.probability; }
        else if (sortBy.field === 'severity') { va = a.severity; vb = b.severity; }
        else if (sortBy.field === 'id') { va = a.id; vb = b.id; }
        else { va = a.name; vb = b.name; }
        if (va < vb) return sortBy.dir === 'asc' ? -1 : 1;
        if (va > vb) return sortBy.dir === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return sorted;
  }, [filteredRisks, sortBy]);

  const SortBtn = ({ field, children }: { field: string; children: React.ReactNode }) => (
    <button
      onClick={() => onSort(field)}
      className="flex items-center gap-1 hover:text-text-primary transition-colors"
    >
      {children}
      <ArrowUpDown className="w-3 h-3" />
    </button>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.3 }}
      className="data-card overflow-hidden"
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-text-primary">Risiko-Register</h2>
          <p className="text-xs text-text-tertiary mt-0.5">{sorted.length} Risiken — sortierbar und filterbar</p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-bg-tertiary text-left">
              <th className="px-4 py-3 text-[11px] font-semibold text-text-tertiary uppercase tracking-wider whitespace-nowrap">
                <SortBtn field="id">ID</SortBtn>
              </th>
              <th className="px-4 py-3 text-[11px] font-semibold text-text-tertiary uppercase tracking-wider whitespace-nowrap">
                <SortBtn field="name">Name</SortBtn>
              </th>
              <th className="px-4 py-3 text-[11px] font-semibold text-text-tertiary uppercase tracking-wider whitespace-nowrap">
                Kategorie
              </th>
              <th className="px-4 py-3 text-[11px] font-semibold text-text-tertiary uppercase tracking-wider whitespace-nowrap text-center">
                <SortBtn field="probability">W</SortBtn>
              </th>
              <th className="px-4 py-3 text-[11px] font-semibold text-text-tertiary uppercase tracking-wider whitespace-nowrap text-center">
                <SortBtn field="severity">A</SortBtn>
              </th>
              <th className="px-4 py-3 text-[11px] font-semibold text-text-tertiary uppercase tracking-wider whitespace-nowrap text-center">
                <SortBtn field="score">Score</SortBtn>
              </th>
              <th className="px-4 py-3 text-[11px] font-semibold text-text-tertiary uppercase tracking-wider whitespace-nowrap">
                Status
              </th>
              <th className="px-4 py-3 text-[11px] font-semibold text-text-tertiary uppercase tracking-wider whitespace-nowrap">
                Owner
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((risk, idx) => (
              <motion.tr
                key={risk.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.2, delay: idx * 0.015 }}
                className={cn(
                  'border-b border-border-subtle hover:bg-bg-tertiary/50 transition-colors',
                  risk.score >= 15 && 'border-l-2 border-l-status-red'
                )}
              >
                <td className="px-4 py-2.5 text-xs font-mono-data text-text-tertiary whitespace-nowrap">
                  {formatId(risk.id)}
                </td>
                <td className="px-4 py-2.5 text-xs text-text-primary whitespace-nowrap max-w-[200px] truncate">
                  {risk.name}
                </td>
                <td className="px-4 py-2.5 whitespace-nowrap">
                  <span className={cn('badge px-2 py-0.5 rounded-md text-[11px] font-medium', categoryColors[risk.category] || 'badge-gray')}>
                    {categoryLabel(risk.category)}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-center">
                  <span className="text-xs font-mono-data text-text-secondary">{risk.probability}</span>
                </td>
                <td className="px-4 py-2.5 text-center">
                  <span className="text-xs font-mono-data text-text-secondary">{risk.severity}</span>
                </td>
                <td className="px-4 py-2.5 text-center">
                  <span className={cn(
                    'badge px-2 py-0.5 rounded-md text-[11px] font-medium',
                    riskScoreBadgeBg(risk.score)
                  )}>
                    {risk.score}
                  </span>
                </td>
                <td className="px-4 py-2.5 whitespace-nowrap">
                  <span className={cn('badge px-2 py-0.5 rounded-md text-[11px] font-medium', statusBadge(risk.status))}>
                    {statusLabel(risk.status)}
                  </span>
                </td>
                <td className="px-4 py-2.5 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <Bot className="w-3.5 h-3.5 text-text-tertiary" />
                    <span className="text-xs text-text-secondary">{risk.owner}</span>
                  </div>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}

function IncidentsPanel({ incidentsData }: { incidentsData: Incident[] }) {
  const openIncidents = incidentsData.filter((inc) => inc.status === 'open' || inc.status === 'contained');

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.4 }}
      className="data-card"
    >
      <div className="flex items-center gap-2 mb-4">
        <AlertTriangle className="w-4 h-4 text-status-yellow" />
        <h2 className="text-lg font-semibold text-text-primary">Aktive Incidents</h2>
        <span className="badge badge-yellow text-[11px] px-2 py-0.5 rounded-md ml-auto">
          {openIncidents.length} offen
        </span>
      </div>

      <div className="space-y-3">
        {openIncidents.map((inc, idx) => (
          <motion.div
            key={inc.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.5 + idx * 0.1 }}
            className="bg-bg-tertiary border border-border-subtle rounded-lg p-3"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono-data text-text-tertiary">{inc.id.toUpperCase()}</span>
                <span className="font-medium text-sm text-text-primary">{inc.title}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={cn('badge text-[10px] px-1.5 py-0.5 rounded', incidentSeverityBadge(inc.severity))}>
                  {severityLabel(inc.severity)}
                </span>
                <span className={cn('badge text-[10px] px-1.5 py-0.5 rounded', incidentStatusBadge(inc.status))}>
                  {incidentStatusLabel(inc.status)}
                </span>
              </div>
            </div>
            <p className="text-xs text-text-secondary mb-2">{inc.description}</p>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bot className="w-3 h-3 text-text-tertiary" />
                <span className="text-[11px] text-text-tertiary">
                  {inc.affectedAgents.join(', ')}
                </span>
              </div>
              <div className="flex items-center gap-1 text-text-tertiary">
                <Clock className="w-3 h-3" />
                <span className="text-[11px]">
                  {inc.status === 'open' ? 'Seit 2 Tg' : 'Seit 1 Tg'}
                </span>
              </div>
            </div>
          </motion.div>
        ))}

        {openIncidents.length === 0 && (
          <div className="text-center py-6 text-text-muted text-sm">
            <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-status-green" />
            Keine aktiven Incidents
          </div>
        )}
      </div>
    </motion.div>
  );
}

function SafetyVetoPanel() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.5 }}
      className="data-card"
    >
      <div className="flex items-center gap-2 mb-4">
        <Shield className="w-4 h-4 text-status-green" />
        <h2 className="text-lg font-semibold text-text-primary">Safety Veto Status</h2>
        <span className="badge badge-green text-[11px] px-2 py-0.5 rounded-md ml-auto">
          Keine Vetos
        </span>
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-status-green/15 flex items-center justify-center">
            <Bot className="w-4 h-4 text-status-green" />
          </div>
          <div>
            <p className="text-sm font-medium text-text-primary">Safety-Agent</p>
            <p className="text-xs text-text-tertiary">Status: Aktiv — Veto-Befugnis</p>
          </div>
        </div>

        <p className="text-xs text-text-secondary leading-relaxed">
          Safety-Agent kann bei Safety-kritischen Risiken sofort alle Vorgange stoppen.
        </p>

        <div className="bg-bg-tertiary rounded-lg p-3">
          <p className="text-[11px] font-medium text-text-tertiary uppercase tracking-wider mb-2">
            Befugnisse
          </p>
          <ul className="space-y-1.5">
            {[
              'Workflow-Stopp (sofort)',
              'Agent-Quarantane (temporar)',
              'Human-Alert (automatisch)',
              'Incident-Erstellung (automatisch)',
            ].map((item) => (
              <li key={item} className="flex items-center gap-2 text-xs text-text-secondary">
                <CheckCircle2 className="w-3 h-3 text-status-green flex-shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="flex items-center justify-between text-[11px] text-text-tertiary pt-1">
          <span>Letzte Ausubung:</span>
          <span className="text-text-secondary">Noch nie ausgeubt</span>
        </div>

        <button className="w-full py-2 px-4 rounded-button border border-status-red/40 text-status-red text-xs font-medium hover:bg-status-red/10 transition-colors flex items-center justify-center gap-2">
          <Ban className="w-3.5 h-3.5" />
          Safety Veto simulieren
        </button>
      </div>
    </motion.div>
  );
}

// ─── Main Page ───
export default function RiskCenterPage() {
  const [sortBy, setSortBy] = useState<{ field: string; dir: 'asc' | 'desc' }>({ field: 'score', dir: 'desc' });
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterOwner, setFilterOwner] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Derive filter options
  const categories = useMemo(() => [...new Set(risks.map((r) => r.category))].sort(), []);
  const owners = useMemo(() => [...new Set(risks.map((r) => r.owner))].sort(), []);
  const statuses = useMemo(() => [...new Set(risks.map((r) => r.status))].sort(), []);

  // Stats
  const activeRisks = useMemo(() => risks.filter((r) => r.status !== 'closed'), []);
  const criticalCount = activeRisks.filter((r) => r.score >= 15).length;
  const openIncidentsCount = incidents.filter((inc) => inc.status === 'open' || inc.status === 'contained').length;
  const totalScore = useMemo(() => {
    if (activeRisks.length === 0) return 0;
    const maxPossible = 25 * activeRisks.length;
    const actual = activeRisks.reduce((sum, r) => sum + r.score, 0);
    return Math.round((actual / maxPossible) * 100);
  }, [activeRisks]);

  // Filtered risks
  const filteredRisks = useMemo(() => {
    return risks.filter((r) => {
      if (filterCategory !== 'all' && r.category !== filterCategory) return false;
      if (filterStatus !== 'all' && r.status !== filterStatus) return false;
      if (filterOwner !== 'all' && r.owner !== filterOwner) return false;
      if (searchQuery && !r.name.toLowerCase().includes(searchQuery.toLowerCase()) && !formatId(r.id).toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    });
  }, [filterCategory, filterStatus, filterOwner, searchQuery]);

  const handleSort = (field: string) => {
    setSortBy((prev) => ({
      field,
      dir: prev.field === field && prev.dir === 'desc' ? 'asc' : 'desc',
    }));
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="max-w-container mx-auto space-y-6"
    >
      {/* Page Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
      >
        <div className="flex items-center gap-2 text-[11px] text-text-tertiary mb-1">
          <span>Dashboard</span>
          <span>/</span>
          <span className="text-text-secondary">Risk Center</span>
        </div>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-[2rem] font-bold text-text-primary tracking-tight leading-tight">
              RISK CENTER
            </h1>
            <p className="text-sm text-text-secondary mt-1">
              Risikomanagement — {activeRisks.length} registrierte Risiken, {openIncidentsCount} aktive Incidents
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-[11px] text-text-tertiary uppercase tracking-wider">Gesamtscore</p>
              <p className={cn('font-mono-data text-2xl font-medium', riskScoreColor(totalScore))}>
                {totalScore}/100
              </p>
            </div>
            <div className="h-10 w-px bg-border-subtle" />
            <div className="flex gap-2">
              <button
                disabled
                className="px-3 py-2 bg-accent-teal text-bg-primary text-xs font-medium rounded-button opacity-50 cursor-not-allowed"
              >
                Neues Risiko
              </button>
              <button className="px-3 py-2 border border-border-default text-text-primary text-xs font-medium rounded-button hover:bg-bg-tertiary transition-colors">
                Risiko-Report
              </button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Summary Cards */}
      <SummaryCards
        totalScore={totalScore}
        criticalCount={criticalCount}
        openIncidents={openIncidentsCount}
        activeVetos={0}
      />

      {/* Risk Matrix */}
      <RiskMatrix filteredRisks={filteredRisks} />

      {/* Filter Bar */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.25 }}
        className="flex flex-wrap items-center gap-3"
      >
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input
            type="text"
            placeholder="Risiken suchen..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-9 pl-9 pr-4 bg-bg-tertiary border border-border-subtle rounded-input text-sm text-text-primary placeholder:text-text-muted focus:border-border-default focus:outline-none transition-colors"
          />
        </div>

        <div className="relative">
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="h-9 pl-3 pr-8 bg-bg-tertiary border border-border-subtle rounded-input text-sm text-text-primary focus:border-border-default focus:outline-none appearance-none cursor-pointer transition-colors"
          >
            <option value="all">Alle Kategorien</option>
            {categories.map((c) => (
              <option key={c} value={c}>{categoryLabel(c)}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
        </div>

        <div className="relative">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="h-9 pl-3 pr-8 bg-bg-tertiary border border-border-subtle rounded-input text-sm text-text-primary focus:border-border-default focus:outline-none appearance-none cursor-pointer transition-colors"
          >
            <option value="all">Alle Status</option>
            {statuses.map((s) => (
              <option key={s} value={s}>{statusLabel(s)}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
        </div>

        <div className="relative">
          <select
            value={filterOwner}
            onChange={(e) => setFilterOwner(e.target.value)}
            className="h-9 pl-3 pr-8 bg-bg-tertiary border border-border-subtle rounded-input text-sm text-text-primary focus:border-border-default focus:outline-none appearance-none cursor-pointer transition-colors"
          >
            <option value="all">Alle Owners</option>
            {owners.map((o) => (
              <option key={o} value={o}>{o}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
        </div>

        <button
          onClick={() => {
            setFilterCategory('all');
            setFilterStatus('all');
            setFilterOwner('all');
            setSearchQuery('');
          }}
          className="h-9 px-3 text-xs text-text-tertiary hover:text-text-primary border border-border-subtle rounded-button hover:bg-bg-tertiary transition-colors"
        >
          Zurucksetzen
        </button>
      </motion.div>

      {/* Risk Register Table */}
      <RiskRegisterTable filteredRisks={filteredRisks} sortBy={sortBy} onSort={handleSort} />

      {/* Incidents + Safety Veto */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <IncidentsPanel incidentsData={incidents} />
        <SafetyVetoPanel />
      </div>
    </motion.div>
  );
}
