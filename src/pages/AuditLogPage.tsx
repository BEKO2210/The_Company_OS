import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ScrollText,
  Search,
  Filter,
  ShieldCheck,
  Check,
  X,
  AlertTriangle,
  Bot,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { auditLog } from '@/data/mockData';
import type { AuditLogEntry } from '@/data/models';

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.04 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, x: -10 },
  show: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
  },
};

function formatTimestamp(iso: string): { time: string; date: string } {
  const d = new Date(iso);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  const time = d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
  const date = isToday ? 'Heute' : d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
  return { time, date };
}

function truncateHash(hash: string): string {
  if (hash.length <= 12) return hash;
  return `${hash.slice(0, 6)}...${hash.slice(-6)}`;
}

function getRiskLabel(score: number): { label: string; className: string } {
  if (score >= 70) return { label: 'Kritisch', className: 'badge-red' };
  if (score >= 40) return { label: 'Hoch', className: 'badge-orange' };
  if (score >= 20) return { label: 'Mittel', className: 'badge-yellow' };
  if (score > 0) return { label: 'Niedrig', className: 'badge-green' };
  return { label: 'Keines', className: 'badge-gray' };
}

function getActionBadge(action: string): string {
  const map: Record<string, string> = {
    'Tagesbericht generiert': 'badge-teal',
    'Budget-Report erstellt': 'badge-blue',
    'Test fehlgeschlagen': 'badge-red',
    'Deployment gestartet': 'badge-teal',
    'Lead qualifiziert': 'badge-green',
    'Landingpage-Entwurf': 'badge-purple',
    'Compliance-Prufung': 'badge-red',
    'Rechnung #1024 freigegeben': 'badge-green',
    'Wochenbericht generiert': 'badge-teal',
    'API-Key Rotation': 'badge-orange',
    'Vertrag gepruft': 'badge-blue',
    'Einkauf beantragt': 'badge-yellow',
    'Sicherheitsscan abgeschlossen': 'badge-green',
    'Dashboard aktualisiert': 'badge-blue',
    'Workflow optimiert': 'badge-teal',
    'Freelancer eingestellt': 'badge-purple',
    'Brand-Check ausgefuhrt': 'badge-purple',
    'Preisanpassung': 'badge-yellow',
    'Doku generiert': 'badge-blue',
    'Wissensbasis aktualisiert': 'badge-teal',
    'Ticket gelost': 'badge-green',
    'Einsatz koordiniert': 'badge-orange',
  };
  return map[action] || 'badge-gray';
}

function getDotColor(score: number): string {
  if (score >= 70) return 'bg-status-red shadow-glow-red';
  if (score >= 40) return 'bg-status-orange';
  if (score >= 20) return 'bg-status-yellow shadow-glow-yellow';
  if (score > 0) return 'bg-status-green shadow-glow-green';
  return 'bg-text-muted';
}

export default function AuditLogPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterAgent, setFilterAgent] = useState<string>('all');
  const [filterAction, setFilterAction] = useState<string>('all');
  const [filterRisk, setFilterRisk] = useState<string>('all');
  const [filterProject, setFilterProject] = useState<string>('all');
  const [detailEntry, setDetailEntry] = useState<AuditLogEntry | null>(null);

  // Unique filter options derived from data
  const agents = useMemo(() => {
    const set = new Set(auditLog.map((e) => e.agent));
    return ['all', ...Array.from(set).sort()];
  }, []);

  const actions = useMemo(() => {
    const set = new Set(auditLog.map((e) => e.action));
    return ['all', ...Array.from(set).sort()];
  }, []);

  const projects = useMemo(() => {
    const set = new Set(auditLog.filter((e) => e.project).map((e) => e.project!));
    return ['all', ...Array.from(set).sort()];
  }, []);

  const filteredEntries = useMemo(() => {
    return auditLog.filter((entry) => {
      if (filterAgent !== 'all' && entry.agent !== filterAgent) return false;
      if (filterAction !== 'all' && entry.action !== filterAction) return false;
      if (filterProject !== 'all' && entry.project !== filterProject) return false;
      if (filterRisk !== 'all') {
        const label = getRiskLabel(entry.riskScore).label;
        if (label.toLowerCase() !== filterRisk) return false;
      }
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          entry.action.toLowerCase().includes(q) ||
          entry.agent.toLowerCase().includes(q) ||
          (entry.project?.toLowerCase().includes(q) ?? false) ||
          entry.tool?.toLowerCase().includes(q) ||
          entry.hash.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [searchQuery, filterAgent, filterAction, filterRisk, filterProject]);

  const totalCount = auditLog.length;
  const lastHash = auditLog[0]?.hash || '';
  const criticalCount = auditLog.filter((e) => e.riskScore >= 70).length;
  const highCount = auditLog.filter((e) => e.riskScore >= 40 && e.riskScore < 70).length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
      className="max-w-container mx-auto"
    >
      {/* Page Header */}
      <div className="mb-6">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-[2rem] font-bold text-text-primary tracking-[-0.03em] leading-[1.1]">
              AUDIT LOG
            </h1>
            <p className="text-sm text-text-tertiary mt-1">Dashboard / Audit Log</p>
            <p className="text-sm text-text-secondary mt-2">
              Unver\u00e4nderliches Aktivit\u00e4tsprotokoll \u2014 Append-Only
            </p>
          </div>

          {/* Ledger Stats */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2, duration: 0.4 }}
            className="flex items-center gap-6"
          >
            <div className="text-right">
              <p className="text-xs text-text-tertiary">Eintr\u00e4ge</p>
              <p className="text-sm font-mono-data text-text-primary">{totalCount.toLocaleString('de-DE')}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-text-tertiary">Letzter Hash</p>
              <p className="text-sm font-mono-data text-accent-teal">{truncateHash(lastHash)}</p>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full badge-green">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span className="text-[11px] font-medium">Verifiziert</span>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Ledger Integrity Header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.3 }}
        className="mb-6 bg-[#0D0D14] border border-border-subtle rounded-lg px-4 py-3 flex items-center justify-between flex-wrap gap-3"
      >
        <div className="flex items-center gap-4 flex-wrap">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-widest text-text-tertiary mb-0.5">
              Ledger Integrit\u00e4t
            </p>
            <p className="text-xs font-mono-data text-accent-teal">
              Hash-Chain: {truncateHash(lastHash)}
            </p>
          </div>
          <div className="text-xs text-text-secondary">
            Letzter Block: vor 2 Minuten
          </div>
        </div>
        <div className="flex items-center gap-4 flex-wrap">
          <div className="text-right">
            <p className="text-xs font-mono-data text-text-primary">{totalCount.toLocaleString('de-DE')} Eintr\u00e4ge</p>
            <p className="text-xs text-text-tertiary">Seit: 01.01.2025</p>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full badge-green">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span className="text-[11px] font-medium">Verifiziert</span>
          </div>
        </div>
      </motion.div>

      {/* Risk Summary Pills */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="flex items-center gap-2 mb-6 flex-wrap"
      >
        {criticalCount > 0 && (
          <motion.span variants={itemVariants} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium badge-red">
            <AlertTriangle className="w-3 h-3" />
            {criticalCount} Kritisch
          </motion.span>
        )}
        {highCount > 0 && (
          <motion.span variants={itemVariants} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium badge-orange">
            {highCount} Hoch
          </motion.span>
        )}
        <motion.span variants={itemVariants} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium badge-blue">
          <Bot className="w-3 h-3" />
          {agents.length - 1} Agents
        </motion.span>
        <motion.span variants={itemVariants} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium badge-gray">
          <ScrollText className="w-3 h-3" />
          {totalCount} Total
        </motion.span>
      </motion.div>

      {/* Filter Bar */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25, duration: 0.3 }}
        className="data-card mb-6"
      >
        <div className="flex flex-col lg:flex-row items-start lg:items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 text-text-tertiary">
            <Filter className="w-4 h-4" />
            <span className="text-xs uppercase tracking-wider font-medium">Filter</span>
          </div>

          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input
              type="text"
              placeholder="Suche nach Aktion, Agent, Hash..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-bg-tertiary border border-border-subtle rounded-input text-sm text-text-primary placeholder:text-text-muted focus:border-border-default focus:outline-none transition-colors"
            />
          </div>

          {/* Agent filter */}
          <select
            value={filterAgent}
            onChange={(e) => setFilterAgent(e.target.value)}
            className="px-3 py-2 bg-bg-tertiary border border-border-subtle rounded-input text-sm text-text-primary focus:border-border-default focus:outline-none cursor-pointer min-w-[150px]"
          >
            <option value="all">Alle Agents</option>
            {agents.filter((a) => a !== 'all').map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>

          {/* Action filter */}
          <select
            value={filterAction}
            onChange={(e) => setFilterAction(e.target.value)}
            className="px-3 py-2 bg-bg-tertiary border border-border-subtle rounded-input text-sm text-text-primary focus:border-border-default focus:outline-none cursor-pointer min-w-[150px]"
          >
            <option value="all">Alle Aktionen</option>
            {actions.filter((a) => a !== 'all').map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>

          {/* Risk filter */}
          <select
            value={filterRisk}
            onChange={(e) => setFilterRisk(e.target.value)}
            className="px-3 py-2 bg-bg-tertiary border border-border-subtle rounded-input text-sm text-text-primary focus:border-border-default focus:outline-none cursor-pointer min-w-[140px]"
          >
            <option value="all">Alle Risiken</option>
            <option value="kritisch">Kritisch</option>
            <option value="hoch">Hoch</option>
            <option value="mittel">Mittel</option>
            <option value="niedrig">Niedrig</option>
            <option value="keines">Keines</option>
          </select>

          {/* Project filter */}
          <select
            value={filterProject}
            onChange={(e) => setFilterProject(e.target.value)}
            className="px-3 py-2 bg-bg-tertiary border border-border-subtle rounded-input text-sm text-text-primary focus:border-border-default focus:outline-none cursor-pointer min-w-[140px]"
          >
            <option value="all">Alle Projekte</option>
            {projects.filter((p) => p !== 'all').map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>
      </motion.div>

      {/* Audit Log Entries - Ledger Style */}
      <div className="data-card overflow-hidden relative">
        {/* Vertical timeline connector line */}
        <div
          className="absolute left-[76px] top-0 bottom-0 w-px border-l border-dashed border-border-subtle/60 pointer-events-none"
          aria-hidden="true"
        />

        {/* Table Header */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-bg-tertiary border-b border-border-subtle">
                <th className="text-left text-xs font-semibold text-text-tertiary uppercase tracking-[0.05em] px-4 py-3 w-[80px]">
                  Zeit
                </th>
                <th className="text-left text-xs font-semibold text-text-tertiary uppercase tracking-[0.05em] px-4 py-3 w-[24px]">
                  {/* Timeline dot column */}
                </th>
                <th className="text-left text-xs font-semibold text-text-tertiary uppercase tracking-[0.05em] px-4 py-3 w-[120px]">
                  Agent
                </th>
                <th className="text-left text-xs font-semibold text-text-tertiary uppercase tracking-[0.05em] px-4 py-3 w-[160px]">
                  Aktion
                </th>
                <th className="text-left text-xs font-semibold text-text-tertiary uppercase tracking-[0.05em] px-4 py-3 w-[100px]">
                  Tool
                </th>
                <th className="text-left text-xs font-semibold text-text-tertiary uppercase tracking-[0.05em] px-4 py-3 w-[100px]">
                  Risiko
                </th>
                <th className="text-left text-xs font-semibold text-text-tertiary uppercase tracking-[0.05em] px-4 py-3 w-[120px]">
                  Projekt
                </th>
                <th className="text-left text-xs font-semibold text-text-tertiary uppercase tracking-[0.05em] px-4 py-3">
                  Hash
                </th>
              </tr>
            </thead>
            <motion.tbody
              variants={containerVariants}
              initial="hidden"
              animate="show"
            >
              <AnimatePresence>
                {filteredEntries.map((entry) => {
                  const { time, date } = formatTimestamp(entry.timestamp);
                  const riskInfo = getRiskLabel(entry.riskScore);
                  const actionBadgeClass = getActionBadge(entry.action);
                  const dotClass = getDotColor(entry.riskScore);
                  const isHighRisk = entry.riskScore >= 40;

                  return (
                    <motion.tr
                      key={entry.id}
                      variants={itemVariants}
                      layout
                      onClick={() => setDetailEntry(entry)}
                      className={cn(
                        'border-b border-border-subtle/60 transition-colors duration-200 cursor-pointer group relative',
                        'hover:bg-bg-tertiary/50',
                        isHighRisk && 'bg-[#EF444403]',
                        entry.riskScore >= 70 && 'bg-[#EF444408]'
                      )}
                    >
                      {/* Time */}
                      <td className="px-4 py-3 align-top">
                        <div className="flex flex-col">
                          <span className="font-mono-data text-xs text-text-tertiary">{time}</span>
                          <span className="font-mono-data text-[10px] text-text-muted">{date}</span>
                        </div>
                      </td>

                      {/* Timeline Dot */}
                      <td className="px-0 py-3 align-top relative">
                        <div className="flex justify-center">
                          <div
                            className={cn(
                              'w-2 h-2 rounded-full status-dot z-10 relative',
                              dotClass
                            )}
                          />
                        </div>
                      </td>

                      {/* Agent */}
                      <td className="px-4 py-3 align-top">
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 rounded-full bg-bg-elevated border border-border-default flex items-center justify-center flex-shrink-0">
                            <Bot className="w-3 h-3 text-text-tertiary" />
                          </div>
                          <span className="text-sm font-semibold text-text-primary">{entry.agent}</span>
                        </div>
                      </td>

                      {/* Action */}
                      <td className="px-4 py-3 align-top">
                        <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium', actionBadgeClass)}>
                          {entry.action}
                        </span>
                      </td>

                      {/* Tool */}
                      <td className="px-4 py-3 align-top">
                        <span className="text-xs text-text-secondary font-mono-data">
                          {entry.tool || '\u2014'}
                        </span>
                      </td>

                      {/* Risk Score */}
                      <td className="px-4 py-3 align-top">
                        <div className="flex items-center gap-2">
                          <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium', riskInfo.className)}>
                            {riskInfo.label}
                          </span>
                          <span className="font-mono-data text-xs text-text-muted">{entry.riskScore}</span>
                        </div>
                      </td>

                      {/* Project */}
                      <td className="px-4 py-3 align-top">
                        {entry.project ? (
                          <span className="text-xs text-accent-teal font-medium">{entry.project}</span>
                        ) : (
                          <span className="text-xs text-text-muted">\u2014</span>
                        )}
                      </td>

                      {/* Hash */}
                      <td className="px-4 py-3 align-top">
                        <span
                          className="font-mono-data text-xs text-text-muted group-hover:text-text-tertiary transition-colors"
                          title={entry.hash}
                        >
                          0x{truncateHash(entry.hash)}
                        </span>
                      </td>
                    </motion.tr>
                  );
                })}
              </AnimatePresence>
            </motion.tbody>
          </table>
        </div>

        {filteredEntries.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16">
            <ScrollText className="w-10 h-10 text-text-muted mb-3" />
            <p className="text-sm text-text-secondary">Keine Eintr\u00e4ge gefunden</p>
            <p className="text-xs text-text-tertiary mt-1">Passen Sie die Filter an</p>
          </div>
        )}
      </div>

      {/* Entry count */}
      <div className="mt-4 flex items-center justify-between">
        <p className="text-xs text-text-tertiary">
          Zeige {filteredEntries.length} von {totalCount} Eintr\u00e4gen
        </p>
        <div className="flex items-center gap-1 text-xs text-text-tertiary">
          <ShieldCheck className="w-3.5 h-3.5 text-status-green" />
          Integrit\u00e4t verifiziert
        </div>
      </div>

      {/* Detail Drawer */}
      <AnimatePresence>
        {detailEntry && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex justify-end"
            onClick={() => setDetailEntry(null)}
          >
            {/* Overlay */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-[4px]" />

            {/* Drawer */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-[480px] h-full bg-bg-tertiary border-l border-border-default flex flex-col overflow-y-auto"
            >
              {/* Header */}
              <div className="sticky top-0 z-10 bg-bg-tertiary border-b border-border-subtle px-6 py-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium', getActionBadge(detailEntry.action))}>
                        {detailEntry.action}
                      </span>
                      <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium', getRiskLabel(detailEntry.riskScore).className)}>
                        {getRiskLabel(detailEntry.riskScore).label}
                      </span>
                    </div>
                    <h2 className="text-xl font-semibold text-text-primary tracking-[-0.015em]">
                      {detailEntry.action}
                    </h2>
                    <div className="flex items-center gap-2 mt-2">
                      <Bot className="w-4 h-4 text-text-tertiary" />
                      <span className="text-sm text-text-secondary">{detailEntry.agent}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => setDetailEntry(null)}
                    className="p-1.5 rounded-md hover:bg-bg-elevated text-text-tertiary hover:text-text-primary transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 px-6 py-5 space-y-5">
                {/* Timestamp */}
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <p className="text-xs text-text-tertiary uppercase tracking-wider mb-1">Zeitstempel</p>
                    <p className="text-sm font-mono-data text-text-primary">
                      {new Date(detailEntry.timestamp).toLocaleString('de-DE')}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-text-tertiary uppercase tracking-wider mb-1">Block-Hash</p>
                    <p className="text-sm font-mono-data text-accent-teal">0x{detailEntry.hash}</p>
                  </div>
                </div>

                {/* Input / Output */}
                <div className="p-4 rounded-card border border-border-subtle bg-bg-secondary space-y-3">
                  <div>
                    <p className="text-xs text-text-tertiary uppercase tracking-wider mb-1">Input</p>
                    <p className="text-sm text-text-primary font-mono-data">{detailEntry.input || '\u2014'}</p>
                  </div>
                  <div className="border-t border-border-subtle pt-3">
                    <p className="text-xs text-text-tertiary uppercase tracking-wider mb-1">Output</p>
                    <p className="text-sm text-text-primary font-mono-data">{detailEntry.output || '\u2014'}</p>
                  </div>
                </div>

                {/* Tool */}
                <div>
                  <p className="text-xs text-text-tertiary uppercase tracking-wider mb-1">Verwendetes Tool</p>
                  <p className="text-sm font-mono-data text-text-primary">{detailEntry.tool || '\u2014'}</p>
                </div>

                {/* Project */}
                {detailEntry.project && (
                  <div>
                    <p className="text-xs text-text-tertiary uppercase tracking-wider mb-1">Projekt</p>
                    <p className="text-sm text-accent-teal">{detailEntry.project}</p>
                  </div>
                )}

                {/* Risk Score */}
                <div className="p-4 rounded-card border border-border-subtle">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-text-tertiary uppercase tracking-wider mb-1">Risiko-Score</p>
                      <div className="flex items-center gap-3">
                        <span className={cn('text-2xl font-semibold font-mono-data', detailEntry.riskScore >= 70 ? 'text-status-red' : detailEntry.riskScore >= 40 ? 'text-status-orange' : detailEntry.riskScore >= 20 ? 'text-status-yellow' : 'text-status-green')}>
                          {detailEntry.riskScore}
                        </span>
                        <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium', getRiskLabel(detailEntry.riskScore).className)}>
                          {getRiskLabel(detailEntry.riskScore).label}
                        </span>
                      </div>
                    </div>
                    {/* Risk bar */}
                    <div className="w-32">
                      <div className="h-2 bg-bg-elevated rounded-full overflow-hidden">
                        <div
                          className={cn(
                            'h-full rounded-full transition-all',
                            detailEntry.riskScore >= 70 ? 'bg-status-red' :
                            detailEntry.riskScore >= 40 ? 'bg-status-orange' :
                            detailEntry.riskScore >= 20 ? 'bg-status-yellow' :
                            'bg-status-green'
                          )}
                          style={{ width: `${Math.min(detailEntry.riskScore, 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Approved By */}
                {detailEntry.approvedBy && (
                  <div className="flex items-center gap-2 p-3 rounded-card border border-status-green/30 bg-status-green/5">
                    <Check className="w-4 h-4 text-status-green" />
                    <span className="text-sm text-status-green">
                      Genehmigt von {detailEntry.approvedBy}
                    </span>
                  </div>
                )}

                {/* Hash */}
                <div className="p-3 rounded-card border border-border-subtle bg-bg-secondary">
                  <p className="text-xs text-text-tertiary uppercase tracking-wider mb-1">Kryptographischer Hash</p>
                  <p className="text-sm font-mono-data text-text-muted break-all">0x{detailEntry.hash}</p>
                </div>
              </div>

              {/* Footer */}
              <div className="sticky bottom-0 bg-bg-tertiary border-t border-border-subtle px-6 py-4">
                <button
                  onClick={() => setDetailEntry(null)}
                  className="w-full px-4 py-2.5 rounded-button border border-border-default text-text-primary text-sm font-medium hover:bg-bg-elevated transition-colors"
                >
                  Schlie\u00dfen
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
