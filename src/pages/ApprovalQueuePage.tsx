import { useState, useMemo, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ClipboardCheck,
  Check,
  X,
  Eye,
  Search,
  Filter,
  CreditCard,
  FileText,
  Rocket,
  Receipt,
  UserPlus,
  Edit3,
  Shield,
  Mail,
  ShoppingCart,
  ChevronDown,
  ChevronUp,
  Clock,
  AlertTriangle,
  User,
  Lock,
  Building,
  Ban,
  RotateCcw,
  AlertOctagon,
  HardHat,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { approvals as initialApprovals } from '@/data/mockData';
import type { Approval } from '@/data/models';
import { DecisionCard } from '@/components/ai';
import { analyzeApproval } from '@/ai';
import { RED_LINE_TYPES, type RedLineType } from '@/utils/redLineConfig';

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, x: -15 },
  show: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
  },
};

// ─── ALL approval types including 10 red lines ───
const typeConfig: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  // ─── 10 Red Line Types ───
  payment: { label: 'Zahlung', icon: CreditCard, color: 'text-status-red bg-status-red/15' },
  contract: { label: 'Vertrag', icon: FileText, color: 'text-status-orange bg-status-orange/15' },
  deployment: { label: 'Deployment', icon: Rocket, color: 'text-accent-teal bg-accent-teal/15' },
  invoice: { label: 'Rechnung', icon: Receipt, color: 'text-accent-blue bg-accent-blue/15' },
  freelancer: { label: 'Beauftragung', icon: UserPlus, color: 'text-accent-purple bg-accent-purple/15' },
  authority_communication: { label: 'Behörde', icon: Building, color: 'text-status-red bg-status-red/15' },
  termination: { label: 'Kündigung', icon: Ban, color: 'text-status-red bg-status-red/15' },
  refund: { label: 'Erstattung', icon: RotateCcw, color: 'text-status-red bg-status-red/15' },
  safety_veto_override: { label: 'Safety-Veto', icon: AlertOctagon, color: 'text-status-red bg-status-red/15' },
  physical_security: { label: 'Sicherheitseinsatz', icon: HardHat, color: 'text-status-red bg-status-red/15' },
  // ─── Non-Red-Line Types ───
  purchase: { label: 'Einkauf', icon: ShoppingCart, color: 'text-status-yellow bg-status-yellow/15' },
  communication: { label: 'Kommunikation', icon: Mail, color: 'text-status-green bg-status-green/15' },
  other: { label: 'Sonstiges', icon: Edit3, color: 'text-text-tertiary bg-text-tertiary/15' },
};

const riskConfig: Record<string, { label: string; className: string }> = {
  critical: { label: 'Kritisch', className: 'badge-red' },
  high: { label: 'Hoch', className: 'badge-orange' },
  medium: { label: 'Mittel', className: 'badge-yellow' },
  low: { label: 'Niedrig', className: 'badge-green' },
};

const statusConfig: Record<string, { label: string; className: string }> = {
  pending: { label: 'Ausstehend', className: 'badge-yellow' },
  approved: { label: 'Genehmigt', className: 'badge-green' },
  rejected: { label: 'Abgelehnt', className: 'badge-red' },
  escalated: { label: 'Eskaliert', className: 'badge-red' },
};

function formatAmount(amount: number | undefined): string {
  if (amount === undefined) return '\u2014';
  return `EUR ${amount.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// ─── API client ───
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

async function apiApprove(id: string, token: string): Promise<{ success: boolean; data?: Approval; error?: string }> {
  const res = await fetch(`${API_BASE}/approvals/${id}/approve`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  });
  return res.json();
}

async function apiReject(id: string, token: string, reason?: string): Promise<{ success: boolean; data?: Approval; error?: string }> {
  const res = await fetch(`${API_BASE}/approvals/${id}/reject`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason }),
  });
  return res.json();
}

// ─── User role hook ───
function useUserRole(): { role: string; isFounder: boolean; isAdmin: boolean; isViewer: boolean } {
  // In production: read from auth context / JWT
  // For demo: check localStorage or default to viewer (safe default)
  const [role, setRole] = useState<string>('viewer');

  useEffect(() => {
    const stored = localStorage.getItem('user_role');
    if (stored === 'founder' || stored === 'admin' || stored === 'viewer') {
      setRole(stored);
    }
  }, []);

  return {
    role,
    isFounder: role === 'founder',
    isAdmin: role === 'admin',
    isViewer: role === 'viewer',
  };
}

// ─── Check if a type is a red line ───
function isRedLineType(type: string): boolean {
  return RED_LINE_TYPES.includes(type as RedLineType);
}

// ─── Can user act on this approval? ───
function canUserAct(approval: Approval, userRole: string): { canApprove: boolean; reason?: string } {
  if (approval.status !== 'pending') {
    return { canApprove: false, reason: 'Nicht ausstehend' };
  }
  if (isRedLineType(approval.type) && userRole !== 'founder') {
    return { canApprove: false, reason: `ROTE LINIE: Nur Founder kann ${typeConfig[approval.type]?.label || approval.type} freigeben` };
  }
  if (userRole === 'viewer') {
    return { canApprove: false, reason: 'Viewer kann nicht freigeben' };
  }
  return { canApprove: true };
}

export default function ApprovalQueuePage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterRisk, setFilterRisk] = useState<string>('all');
  const [filterRecommendation, setFilterRecommendation] = useState<string>('all');
  const [showRedLineOnly, setShowRedLineOnly] = useState(false);
  const [detailApproval, setDetailApproval] = useState<Approval | null>(null);
  const [historyExpanded, setHistoryExpanded] = useState(false);
  const [localApprovals, setLocalApprovals] = useState<Approval[]>(initialApprovals);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const { role, isFounder } = useUserRole();

  // Clear messages after 5 seconds
  useEffect(() => {
    if (actionError || actionSuccess) {
      const timer = setTimeout(() => {
        setActionError(null);
        setActionSuccess(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [actionError, actionSuccess]);

  // ─── API Actions ───
  const handleApprove = useCallback(async (id: string) => {
    setActionError(null);
    setActionSuccess(null);

    const approval = localApprovals.find(a => a.id === id);
    if (!approval) return;

    const check = canUserAct(approval, role);
    if (!check.canApprove) {
      setActionError(check.reason || 'Nicht autorisiert');
      return;
    }

    try {
      const token = localStorage.getItem('auth_token') || '';
      const result = await apiApprove(id, token);
      if (result.success) {
        setLocalApprovals(prev => prev.map(a => a.id === id ? { ...a, status: 'approved' as const } : a));
        setActionSuccess(`Freigabe ${id} genehmigt`);
      } else {
        setActionError(result.error || 'Freigabe fehlgeschlagen');
      }
    } catch {
      // Fallback: update local state for demo
      setLocalApprovals(prev => prev.map(a => a.id === id ? { ...a, status: 'approved' as const } : a));
      setActionSuccess(`Freigabe ${id} genehmigt (lokal)`);
    }
  }, [localApprovals, role]);

  const handleReject = useCallback(async (id: string) => {
    setActionError(null);
    setActionSuccess(null);

    const approval = localApprovals.find(a => a.id === id);
    if (!approval) return;

    const check = canUserAct(approval, role);
    if (!check.canApprove) {
      setActionError(check.reason || 'Nicht autorisiert');
      return;
    }

    try {
      const token = localStorage.getItem('auth_token') || '';
      const result = await apiReject(id, token);
      if (result.success) {
        setLocalApprovals(prev => prev.map(a => a.id === id ? { ...a, status: 'rejected' as const } : a));
        setActionSuccess(`Freigabe ${id} abgelehnt`);
      } else {
        setActionError(result.error || 'Ablehnung fehlgeschlagen');
      }
    } catch {
      // Fallback: update local state for demo
      setLocalApprovals(prev => prev.map(a => a.id === id ? { ...a, status: 'rejected' as const } : a));
      setActionSuccess(`Freigabe ${id} abgelehnt (lokal)`);
    }
  }, [localApprovals, role]);

  const filteredApprovals = useMemo(() => {
    return localApprovals.filter((a) => {
      if (filterType !== 'all' && a.type !== filterType) return false;
      if (filterRisk !== 'all' && a.riskLevel !== filterRisk) return false;
      if (filterRecommendation !== 'all' && a.recommendation !== filterRecommendation) return false;
      if (showRedLineOnly && !a.redLine) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          a.title.toLowerCase().includes(q) ||
          a.requester.toLowerCase().includes(q) ||
          a.description.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [localApprovals, searchQuery, filterType, filterRisk, filterRecommendation, showRedLineOnly]);

  const pendingApprovals = localApprovals.filter((a) => a.status === 'pending');
  const redLineCount = pendingApprovals.filter((a) => a.redLine).length;
  const highRiskCount = pendingApprovals.filter(
    (a) => a.riskLevel === 'high' || a.riskLevel === 'critical'
  ).length;
  const approvedTodayCount = localApprovals.filter((a) => a.status === 'approved').length;

  const criticalCount = pendingApprovals.filter((a) => a.riskLevel === 'critical').length;
  const highOnlyCount = pendingApprovals.filter((a) => a.riskLevel === 'high').length;
  const mediumCount = pendingApprovals.filter((a) => a.riskLevel === 'medium').length;
  const lowCount = pendingApprovals.filter((a) => a.riskLevel === 'low').length;

  const typeOptions = [
    { value: 'all', label: 'Alle Typen' },
    { value: 'payment', label: 'Zahlung (RL)' },
    { value: 'contract', label: 'Vertrag (RL)' },
    { value: 'deployment', label: 'Deployment (RL)' },
    { value: 'invoice', label: 'Rechnung (RL)' },
    { value: 'freelancer', label: 'Beauftragung (RL)' },
    { value: 'authority_communication', label: 'Behörde (RL)' },
    { value: 'termination', label: 'Kündigung (RL)' },
    { value: 'refund', label: 'Erstattung (RL)' },
    { value: 'safety_veto_override', label: 'Safety-Veto (RL)' },
    { value: 'physical_security', label: 'Sicherheitseinsatz (RL)' },
    { value: 'purchase', label: 'Einkauf' },
    { value: 'communication', label: 'Kommunikation' },
    { value: 'other', label: 'Sonstiges' },
  ];

  const riskOptions = [
    { value: 'all', label: 'Alle Risiken' },
    { value: 'critical', label: 'Kritisch' },
    { value: 'high', label: 'Hoch' },
    { value: 'medium', label: 'Mittel' },
    { value: 'low', label: 'Niedrig' },
  ];

  const recommendationOptions = [
    { value: 'all', label: 'Alle' },
    { value: 'Freigeben', label: 'Freigeben' },
    { value: 'Prufen', label: 'Pr\u00fcfen' },
    { value: 'Ablehnen', label: 'Ablehnen' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
      className="max-w-container mx-auto"
    >
      {/* ─── Flash Messages ─── */}
      <AnimatePresence>
        {actionError && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="mb-4 p-4 rounded-card bg-status-red/10 border border-status-red/30 flex items-center gap-3"
          >
            <AlertTriangle className="w-5 h-5 text-status-red flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-status-red">{actionError}</p>
              {!isFounder && actionError.includes('ROTE LINIE') && (
                <p className="text-xs text-status-red/70 mt-1">
                  Dies ist eine Rote Linie – nur der Founder kann diese Freigabe erteilen.
                </p>
              )}
            </div>
            <button onClick={() => setActionError(null)} className="ml-auto">
              <X className="w-4 h-4 text-status-red" />
            </button>
          </motion.div>
        )}
        {actionSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="mb-4 p-4 rounded-card bg-status-green/10 border border-status-green/30 flex items-center gap-3"
          >
            <Check className="w-5 h-5 text-status-green flex-shrink-0" />
            <p className="text-sm font-semibold text-status-green">{actionSuccess}</p>
            <button onClick={() => setActionSuccess(null)} className="ml-auto">
              <X className="w-4 h-4 text-status-green" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Page Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[2rem] font-bold text-text-primary tracking-[-0.03em] leading-[1.1]">
              FREIGABE-QUEUE
            </h1>
            <p className="text-sm text-text-tertiary mt-1">
              Dashboard / Freigaben
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Role indicator */}
            <span className={cn(
              'px-3 py-1 rounded-full text-xs font-medium border',
              isFounder ? 'border-status-green text-status-green bg-status-green/10' : 'border-status-yellow text-status-yellow bg-status-yellow/10'
            )}>
              Rolle: {role}
              {!isFounder && ' (keine Roten Linien)'}
            </span>
            <button className="px-4 py-2 rounded-button bg-accent-teal text-[#0A0A0F] text-sm font-medium hover:opacity-90 hover:-translate-y-px transition-all disabled:opacity-40 disabled:cursor-not-allowed">
              Batch-Freigabe
            </button>
            <button className="px-4 py-2 rounded-button border border-border-default text-text-primary text-sm font-medium hover:bg-bg-tertiary transition-all">
              Export
            </button>
          </div>
        </div>
        <p className="text-sm text-text-secondary mt-2">
          {pendingApprovals.length} ausstehende Entscheidungen erfordern Ihre Aufmerksamkeit
        </p>

        {/* Summary Pills */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="flex items-center gap-2 mt-3 flex-wrap"
        >
          {criticalCount > 0 && (
            <motion.span
              variants={itemVariants}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium badge-red animate-pulse-red"
            >
              <AlertTriangle className="w-3 h-3" />
              {criticalCount} kritisch
            </motion.span>
          )}
          {highOnlyCount > 0 && (
            <motion.span
              variants={itemVariants}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium badge-orange"
            >
              {highOnlyCount} hoch
            </motion.span>
          )}
          {mediumCount > 0 && (
            <motion.span
              variants={itemVariants}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium badge-yellow"
            >
              {mediumCount} mittel
            </motion.span>
          )}
          {lowCount > 0 && (
            <motion.span
              variants={itemVariants}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium badge-green"
            >
              {lowCount} niedrig
            </motion.span>
          )}
        </motion.div>
      </div>

      {/* Stats Cards */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6"
      >
        {[
          {
            label: 'Total Pending',
            value: pendingApprovals.length.toString(),
            color: 'text-text-primary',
            border: 'border-l-status-yellow',
          },
          {
            label: 'Red Line Items',
            value: redLineCount.toString(),
            color: 'text-status-red',
            border: 'border-l-status-red',
            pulse: true,
          },
          {
            label: 'High Risk',
            value: highRiskCount.toString(),
            color: 'text-status-orange',
            border: 'border-l-status-orange',
          },
          {
            label: 'Approved Today',
            value: approvedTodayCount.toString(),
            color: 'text-status-green',
            border: 'border-l-status-green',
          },
        ].map((stat) => (
          <motion.div
            key={stat.label}
            variants={itemVariants}
            className={cn(
              'data-card border-l-2',
              stat.border
            )}
          >
            <p className="text-xs text-text-tertiary uppercase tracking-wider mb-1">{stat.label}</p>
            <p className={cn('text-2xl font-semibold font-mono-data', stat.color)}>
              {stat.value}
            </p>
          </motion.div>
        ))}
      </motion.div>

      {/* AI Decision Cards for pending approvals */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-6"
      >
        {pendingApprovals.slice(0, 3).map((approval) => (
          <motion.div key={approval.id} variants={itemVariants}>
            <DecisionCard
              decision={analyzeApproval(approval)}
              onAccept={(id) => handleApprove(id)}
              onReject={(id) => handleReject(id)}
              onReview={(id) => console.log('Review:', id)}
            />
          </motion.div>
        ))}
      </motion.div>

      {/* Filter Bar */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.3 }}
        className="data-card mb-6"
      >
        <div className="flex flex-col lg:flex-row items-start lg:items-center gap-3">
          <div className="flex items-center gap-2 text-text-tertiary">
            <Filter className="w-4 h-4" />
            <span className="text-xs uppercase tracking-wider font-medium">Filter</span>
          </div>

          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input
              type="text"
              placeholder="Suche nach Titel, Requester, Beschreibung..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-bg-tertiary border border-border-subtle rounded-input text-sm text-text-primary placeholder:text-text-muted focus:border-border-default focus:outline-none transition-colors"
            />
          </div>

          {/* Type filter */}
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-3 py-2 bg-bg-tertiary border border-border-subtle rounded-input text-sm text-text-primary focus:border-border-default focus:outline-none cursor-pointer min-w-[140px]"
          >
            {typeOptions.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>

          {/* Risk filter */}
          <select
            value={filterRisk}
            onChange={(e) => setFilterRisk(e.target.value)}
            className="px-3 py-2 bg-bg-tertiary border border-border-subtle rounded-input text-sm text-text-primary focus:border-border-default focus:outline-none cursor-pointer min-w-[140px]"
          >
            {riskOptions.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>

          {/* Recommendation filter */}
          <select
            value={filterRecommendation}
            onChange={(e) => setFilterRecommendation(e.target.value)}
            className="px-3 py-2 bg-bg-tertiary border border-border-subtle rounded-input text-sm text-text-primary focus:border-border-default focus:outline-none cursor-pointer min-w-[140px]"
          >
            {recommendationOptions.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>

          {/* Red Line Toggle */}
          <button
            onClick={() => setShowRedLineOnly(!showRedLineOnly)}
            className={cn(
              'flex items-center gap-2 px-3 py-2 rounded-button text-xs font-medium transition-all border',
              showRedLineOnly
                ? 'border-status-red text-status-red bg-status-red/10'
                : 'border-border-subtle text-text-tertiary hover:border-border-default'
            )}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            Nur Rote Linien
          </button>
        </div>
      </motion.div>

      {/* ─── Red Line Warning Banner for non-founders ─── */}
      {!isFounder && redLineCount > 0 && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="mb-4 p-4 rounded-card bg-status-red/5 border border-status-red/20 flex items-center gap-3"
        >
          <Lock className="w-5 h-5 text-status-red flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-status-red">
              Rote Linien gesperrt
            </p>
            <p className="text-xs text-text-secondary">
              Sie haben die Rolle „{role}". {redLineCount} Freigabe{redLineCount !== 1 ? 'n' : ''} erfordern die Founder-Rolle.
              Bitte wenden Sie sich an den Founder.
            </p>
          </div>
        </motion.div>
      )}

      {/* Approval Table */}
      <div className="data-card overflow-hidden mb-6">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-bg-tertiary border-b border-border-subtle">
                <th className="text-left text-xs font-semibold text-text-tertiary uppercase tracking-[0.05em] px-4 py-3 w-[100px]">
                  Typ
                </th>
                <th className="text-left text-xs font-semibold text-text-tertiary uppercase tracking-[0.05em] px-4 py-3">
                  Betreff
                </th>
                <th className="text-left text-xs font-semibold text-text-tertiary uppercase tracking-[0.05em] px-4 py-3 w-[140px]">
                  Requester
                </th>
                <th className="text-left text-xs font-semibold text-text-tertiary uppercase tracking-[0.05em] px-4 py-3 w-[120px]">
                  Betrag
                </th>
                <th className="text-left text-xs font-semibold text-text-tertiary uppercase tracking-[0.05em] px-4 py-3 w-[100px]">
                  Risiko
                </th>
                <th className="text-left text-xs font-semibold text-text-tertiary uppercase tracking-[0.05em] px-4 py-3 w-[140px]">
                  Empfehlung
                </th>
                <th className="text-left text-xs font-semibold text-text-tertiary uppercase tracking-[0.05em] px-4 py-3 w-[100px]">
                  Status
                </th>
                <th className="text-left text-xs font-semibold text-text-tertiary uppercase tracking-[0.05em] px-4 py-3 w-[200px]">
                  Aktionen
                </th>
              </tr>
            </thead>
            <motion.tbody
              variants={containerVariants}
              initial="hidden"
              animate="show"
            >
              <AnimatePresence>
                {filteredApprovals.map((approval) => {
                  const tcfg = typeConfig[approval.type] || typeConfig.other;
                  const TIcon = tcfg.icon;
                  const rcfg = riskConfig[approval.riskLevel] || riskConfig.low;
                  const scfg = statusConfig[approval.status] || statusConfig.pending;
                  const isRedLine = approval.redLine || isRedLineType(approval.type);
                  const actionCheck = canUserAct(approval, role);
                  const canAct = actionCheck.canApprove;
                  const isBlockedByRedLine = isRedLine && !isFounder;

                  return (
                    <motion.tr
                      key={approval.id}
                      variants={itemVariants}
                      layout
                      exit={{ opacity: 0, x: 50, transition: { duration: 0.3 } }}
                      className={cn(
                        'border-b border-border-subtle transition-colors duration-200 group hover:bg-bg-tertiary/50',
                        isRedLine && 'border-l-[3px] border-l-status-red',
                        isRedLine && 'bg-gradient-to-r from-[#EF444408] to-transparent',
                        approval.riskLevel === 'critical' && 'bg-[#EF444005]'
                      )}
                    >
                      {/* Type */}
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1">
                          {isRedLine && (
                            <span className="text-[9px] font-semibold uppercase tracking-wider text-status-red">
                              ROTE LINIE
                            </span>
                          )}
                          <div className={cn('inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium', tcfg.color)}>
                            <TIcon className="w-3.5 h-3.5" />
                            {tcfg.label}
                          </div>
                        </div>
                      </td>

                      {/* Title */}
                      <td className="px-4 py-3">
                        <div>
                          <p className="text-sm font-medium text-text-primary">{approval.title}</p>
                          <p className="text-xs text-text-tertiary mt-0.5 line-clamp-1">{approval.description}</p>
                        </div>
                      </td>

                      {/* Requester */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-bg-tertiary border border-border-subtle flex items-center justify-center flex-shrink-0">
                            <User className="w-3 h-3 text-text-tertiary" />
                          </div>
                          <span className="text-sm text-text-secondary">{approval.requester}</span>
                        </div>
                      </td>

                      {/* Amount */}
                      <td className="px-4 py-3 font-mono-data text-sm text-text-primary">
                        {formatAmount(approval.amount)}
                      </td>

                      {/* Risk */}
                      <td className="px-4 py-3">
                        <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium', rcfg.className)}>
                          {rcfg.label}
                        </span>
                      </td>

                      {/* Recommendation */}
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            'text-sm font-medium',
                            approval.recommendation === 'Freigeben' && 'text-status-green',
                            approval.recommendation === 'Prufen' && 'text-status-yellow',
                            approval.recommendation === 'Ablehnen' && 'text-status-red'
                          )}
                        >
                          {approval.recommendation}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3">
                        <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium', scfg.className)}>
                          {scfg.label}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                          {/* ─── Approve Button ─── */}
                          <button
                            onClick={() => handleApprove(approval.id)}
                            disabled={!canAct}
                            title={actionCheck.reason || 'Freigeben'}
                            className={cn(
                              'inline-flex items-center gap-1 px-2.5 py-1.5 rounded-button text-xs font-medium border transition-colors',
                              canAct
                                ? 'text-status-green border-status-green/40 hover:bg-status-green/10'
                                : 'text-text-muted border-border-subtle cursor-not-allowed opacity-40'
                            )}
                          >
                            {isBlockedByRedLine ? <Lock className="w-3 h-3" /> : <Check className="w-3 h-3" />}
                            Freigeben
                          </button>

                          {/* ─── Reject Button ─── */}
                          <button
                            onClick={() => handleReject(approval.id)}
                            disabled={!canAct}
                            title={actionCheck.reason || 'Ablehnen'}
                            className={cn(
                              'inline-flex items-center gap-1 px-2.5 py-1.5 rounded-button text-xs font-medium border transition-colors',
                              canAct
                                ? 'text-status-red border-status-red/40 hover:bg-status-red/10'
                                : 'text-text-muted border-border-subtle cursor-not-allowed opacity-40'
                            )}
                          >
                            {isBlockedByRedLine ? <Lock className="w-3 h-3" /> : <X className="w-3 h-3" />}
                            Ablehnen
                          </button>

                          {/* ─── Details Button ─── */}
                          <button
                            onClick={() => setDetailApproval(approval)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-button text-xs font-medium text-accent-blue border border-accent-blue/40 hover:bg-accent-blue/10 transition-colors"
                          >
                            <Eye className="w-3 h-3" />
                            Details
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
              </AnimatePresence>
            </motion.tbody>
          </table>
        </div>

        {filteredApprovals.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16">
            <ClipboardCheck className="w-10 h-10 text-text-muted mb-3" />
            <p className="text-sm text-text-secondary">Keine Freigaben gefunden</p>
            <p className="text-xs text-text-tertiary mt-1">Passen Sie die Filter an</p>
          </div>
        )}
      </div>

      {/* Approval History */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4, duration: 0.3 }}
        className="data-card"
      >
        <button
          onClick={() => setHistoryExpanded(!historyExpanded)}
          className="w-full flex items-center justify-between py-2"
        >
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-text-tertiary" />
            <span className="text-sm font-semibold text-text-primary uppercase tracking-wider">
              Genehmigungs-History
            </span>
            <span className="text-xs text-text-tertiary">(letzte 3 Entscheidungen)</span>
          </div>
          {historyExpanded ? (
            <ChevronUp className="w-4 h-4 text-text-tertiary" />
          ) : (
            <ChevronDown className="w-4 h-4 text-text-tertiary" />
          )}
        </button>

        <AnimatePresence>
          {historyExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
              className="overflow-hidden"
            >
              <table className="w-full mt-3">
                <thead>
                  <tr className="border-b border-border-subtle">
                    <th className="text-left text-xs font-semibold text-text-tertiary uppercase tracking-[0.05em] px-3 py-2">Datum</th>
                    <th className="text-left text-xs font-semibold text-text-tertiary uppercase tracking-[0.05em] px-3 py-2">Typ</th>
                    <th className="text-left text-xs font-semibold text-text-tertiary uppercase tracking-[0.05em] px-3 py-2">Betreff</th>
                    <th className="text-left text-xs font-semibold text-text-tertiary uppercase tracking-[0.05em] px-3 py-2">Entscheidung</th>
                    <th className="text-left text-xs font-semibold text-text-tertiary uppercase tracking-[0.05em] px-3 py-2">Entschieden von</th>
                    <th className="text-left text-xs font-semibold text-text-tertiary uppercase tracking-[0.05em] px-3 py-2">Risiko</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { date: '15.04.2025', type: 'Deployment', subject: 'Cedar Staging', decision: 'Genehmigt', by: 'Human CEO', risk: 'low' },
                    { date: '10.04.2025', type: 'Vertrag', subject: 'Design-Tool Lizenz', decision: 'Abgelehnt', by: 'Human CEO', risk: 'medium' },
                    { date: '08.04.2025', type: 'Zahlung', subject: 'AWS S3 Q2', decision: 'Genehmigt', by: 'Human CEO', risk: 'low' },
                  ].map((h, i) => (
                    <tr key={i} className="border-b border-border-subtle/50 hover:bg-bg-tertiary/30 transition-colors">
                      <td className="px-3 py-2 text-sm text-text-secondary">{h.date}</td>
                      <td className="px-3 py-2 text-sm text-text-secondary">{h.type}</td>
                      <td className="px-3 py-2 text-sm text-text-primary">{h.subject}</td>
                      <td className="px-3 py-2">
                        <span className={cn(
                          'inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium',
                          h.decision === 'Genehmigt' ? 'badge-green' : 'badge-red'
                        )}>
                          {h.decision}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-sm text-text-secondary">{h.by}</td>
                      <td className="px-3 py-2">
                        <span className={cn(
                          'inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium',
                          riskConfig[h.risk]?.className || 'badge-gray'
                        )}>
                          {riskConfig[h.risk]?.label || h.risk}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Detail Drawer */}
      <AnimatePresence>
        {detailApproval && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex justify-end"
            onClick={() => setDetailApproval(null)}
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
                      {(() => {
                        const tc = typeConfig[detailApproval.type] || typeConfig.other;
                        const TI = tc.icon;
                        return (
                          <div className={cn('inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium', tc.color)}>
                            <TI className="w-3.5 h-3.5" />
                            {tc.label}
                          </div>
                        );
                      })()}
                      {(() => {
                        const isRedLineDetail = detailApproval.redLine || isRedLineType(detailApproval.type);
                        return isRedLineDetail ? (
                          <span className="text-[9px] font-semibold uppercase tracking-wider text-status-red border border-status-red/30 px-1.5 py-0.5 rounded">
                            ROTE LINIE
                          </span>
                        ) : null;
                      })()}
                    </div>
                    <h2 className="text-xl font-semibold text-text-primary tracking-[-0.015em]">
                      {detailApproval.title}
                    </h2>
                    {detailApproval.amount !== undefined && (
                      <p className="text-2xl font-mono-data font-medium text-text-primary mt-2">
                        {formatAmount(detailApproval.amount)}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => setDetailApproval(null)}
                    className="p-1.5 rounded-md hover:bg-bg-elevated text-text-tertiary hover:text-text-primary transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="flex items-center gap-2 mt-3">
                  <span className={cn(
                    'inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium',
                    riskConfig[detailApproval.riskLevel]?.className
                  )}>
                    {riskConfig[detailApproval.riskLevel]?.label}
                  </span>
                  <span className={cn(
                    'inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium',
                    statusConfig[detailApproval.status]?.className
                  )}>
                    {statusConfig[detailApproval.status]?.label}
                  </span>
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 px-6 py-5 space-y-5">
                {/* Description */}
                <div>
                  <h3 className="text-xs font-semibold text-text-tertiary uppercase tracking-wider mb-2">
                    Beschreibung
                  </h3>
                  <p className="text-sm text-text-secondary leading-relaxed">
                    {detailApproval.description}
                  </p>
                </div>

                {/* Recommendation */}
                <div className="p-4 rounded-card border border-border-subtle bg-bg-secondary">
                  <h3 className="text-xs font-semibold text-text-tertiary uppercase tracking-wider mb-2">
                    KI-Empfehlung
                  </h3>
                  <p
                    className={cn(
                      'text-lg font-semibold',
                      detailApproval.recommendation === 'Freigeben' && 'text-status-green',
                      detailApproval.recommendation === 'Prufen' && 'text-status-yellow',
                      detailApproval.recommendation === 'Ablehnen' && 'text-status-red'
                    )}
                  >
                    {detailApproval.recommendation}
                  </p>
                </div>

                {/* Requester */}
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-bg-elevated border border-border-default flex items-center justify-center">
                    <User className="w-5 h-5 text-text-tertiary" />
                  </div>
                  <div>
                    <p className="text-xs text-text-tertiary">Beantragt von</p>
                    <p className="text-sm font-medium text-text-primary">{detailApproval.requester}</p>
                  </div>
                  <div className="ml-auto text-right">
                    <p className="text-xs text-text-tertiary">Zeitstempel</p>
                    <p className="text-sm font-mono-data text-text-secondary">
                      {new Date(detailApproval.createdAt).toLocaleString('de-DE')}
                    </p>
                  </div>
                </div>

                {/* Red Line Info */}
                <div className="p-3 rounded-card border border-border-subtle">
                  <div className="flex items-center gap-2">
                    <Shield className={cn('w-4 h-4', (detailApproval.redLine || isRedLineType(detailApproval.type)) ? 'text-status-red' : 'text-status-green')} />
                    <span className="text-sm text-text-secondary">
                      Rote Linie: {(detailApproval.redLine || isRedLineType(detailApproval.type)) ? 'Ja \u2014 Erfordert Founder-Freigabe' : 'Nein'}
                    </span>
                  </div>
                  {(detailApproval.redLine || isRedLineType(detailApproval.type)) && !isFounder && (
                    <div className="mt-2 p-2 rounded bg-status-red/5 border border-status-red/10 flex items-center gap-2">
                      <Lock className="w-3.5 h-3.5 text-status-red" />
                      <span className="text-xs text-status-red">
                        Sie können diese Freigabe nicht erteilen (Rolle: {role}). Nur der Founder kann rote Linien freigeben.
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Footer Actions */}
              <div className="sticky bottom-0 bg-bg-tertiary border-t border-border-subtle px-6 py-4 flex items-center gap-3">
                {(() => {
                  const detailCheck = canUserAct(detailApproval, role);
                  const detailBlocked = !detailCheck.canApprove;
                  return (
                    <>
                      <button
                        onClick={() => { handleApprove(detailApproval.id); setDetailApproval(null); }}
                        disabled={detailBlocked}
                        className={cn(
                          'flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-button text-sm font-medium transition-opacity',
                          detailBlocked
                            ? 'bg-text-muted/20 text-text-muted cursor-not-allowed'
                            : 'bg-status-green text-white hover:opacity-90'
                        )}
                      >
                        {detailBlocked && isRedLineType(detailApproval.type) && !isFounder ? <Lock className="w-4 h-4" /> : <Check className="w-4 h-4" />}
                        Freigeben
                      </button>
                      <button
                        onClick={() => { handleReject(detailApproval.id); setDetailApproval(null); }}
                        disabled={detailBlocked}
                        className={cn(
                          'flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-button text-sm font-medium transition-opacity',
                          detailBlocked
                            ? 'bg-text-muted/20 text-text-muted cursor-not-allowed'
                            : 'bg-status-red text-white hover:opacity-90'
                        )}
                      >
                        {detailBlocked && isRedLineType(detailApproval.type) && !isFounder ? <Lock className="w-4 h-4" /> : <X className="w-4 h-4" />}
                        Ablehnen
                      </button>
                      <button
                        onClick={() => setDetailApproval(null)}
                        className="px-4 py-2.5 rounded-button border border-border-default text-text-primary text-sm font-medium hover:bg-bg-elevated transition-colors"
                      >
                        Zur\u00fcckstellen
                      </button>
                    </>
                  );
                })()}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}