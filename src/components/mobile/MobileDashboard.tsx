/**
 * MobileDashboard
 * Mobile-optimierte Dashboard-Ansicht.
 * - Swipeable KPI-Karten
 * - Kompakte Approval-Liste
 * - Pull-to-Refresh
 * - Touch-optimiert
 */

import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import {
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Minus,
  ShieldAlert,
  ClipboardCheck,
  ChevronRight,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Approval, Risk } from '@/data/models';
import ApprovalCard from './ApprovalCard';
import QuickActions from './QuickActions';
import NotificationBadge from './NotificationBadge';
import { useNavigate } from 'react-router-dom';

interface KPICard {
  key: string;
  label: string;
  value: string;
  change: string;
  trend: 'up' | 'down' | 'stable';
  icon: React.ElementType;
  color: string;
}

interface MobileDashboardProps {
  kpis: KPICard[];
  approvals: Approval[];
  risks: Risk[];
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onRefresh: () => Promise<void>;
}

export default function MobileDashboard({
  kpis,
  approvals,
  risks,
  onApprove,
  onReject,
  onRefresh,
}: MobileDashboardProps) {
  const [refreshing, setRefreshing] = useState(false);
  const [selectedApproval, setSelectedApproval] = useState<Approval | null>(null);
  const navigate = useNavigate();
  const pullStartY = useRef(0);
  const pullY = useMotionValue(0);
  // Pull progress mapped to 0-1 range (for potential future use)
  const refreshOpacity = useTransform(pullY, [60, 120], [0, 1]);
  const refreshRotate = useTransform(pullY, [0, 120], [0, 360]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (window.scrollY === 0) {
      pullStartY.current = e.touches[0].clientY;
    }
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (window.scrollY === 0 && pullStartY.current > 0) {
      const diff = e.touches[0].clientY - pullStartY.current;
      if (diff > 0) {
        pullY.set(Math.min(diff * 0.5, 120));
      }
    }
  }, [pullY]);

  const handleTouchEnd = useCallback(async () => {
    const currentPull = pullY.get();
    if (currentPull > 80 && !refreshing) {
      setRefreshing(true);
      try {
        await onRefresh();
      } finally {
        setRefreshing(false);
      }
    }
    pullY.set(0);
    pullStartY.current = 0;
  }, [pullY, refreshing, onRefresh]);

  return (
    <div
      className="md:hidden pb-24"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull to Refresh Indicator */}
      <motion.div
        style={{ opacity: refreshOpacity }}
        className="flex items-center justify-center py-2 pointer-events-none"
      >
        <motion.div style={{ rotate: refreshRotate }}>
          {refreshing ? (
            <Loader2 className="w-5 h-5 text-accent-teal animate-spin" />
          ) : (
            <RefreshCw className="w-5 h-5 text-accent-teal" />
          )}
        </motion.div>
        <span className="ml-2 text-xs text-text-tertiary">
          {refreshing ? 'Aktualisiere...' : 'Zum Aktualisieren loslassen'}
        </span>
      </motion.div>

      {/* KPI Carousel */}
      <KPICarousel kpis={kpis} />

      {/* Quick Actions */}
      <div className="px-4 mt-4">
        <QuickActions />
      </div>

      {/* Pending Approvals */}
      <div className="px-4 mt-5">
        <SectionHeader
          title="Freigaben"
          count={approvals.filter((a) => a.status === 'pending').length}
          onClick={() => navigate('/approvals')}
        />
        <div className="space-y-2 mt-2">
          {approvals
            .filter((a) => a.status === 'pending')
            .slice(0, 5)
            .map((approval) => (
              <ApprovalCard
                key={approval.id}
                approval={approval}
                onApprove={onApprove}
                onReject={onReject}
                onView={setSelectedApproval}
                compact
              />
            ))}
          {approvals.filter((a) => a.status === 'pending').length === 0 && (
            <EmptyState
              icon={ClipboardCheck}
              title="Keine offenen Freigaben"
              subtitle="Alle Freigaben wurden bearbeitet"
            />
          )}
        </div>
      </div>

      {/* Active Risks */}
      <div className="px-4 mt-5">
        <SectionHeader
          title="Aktive Risiken"
          count={risks.filter((r) => r.status === 'active').length}
          onClick={() => navigate('/risk-center')}
        />
        <div className="space-y-2 mt-2">
          {risks
            .filter((r) => r.status === 'active')
            .slice(0, 3)
            .map((risk) => (
              <RiskCard key={risk.id} risk={risk} />
            ))}
          {risks.filter((r) => r.status === 'active').length === 0 && (
            <EmptyState
              icon={ShieldAlert}
              title="Keine aktiven Risiken"
              subtitle="Alles im gruenen Bereich"
            />
          )}
        </div>
      </div>

      {/* Approval Detail Bottom Sheet */}
      <AnimatePresence>
        {selectedApproval && (
          <ApprovalDetailSheet
            approval={selectedApproval}
            onApprove={() => {
              onApprove(selectedApproval.id);
              setSelectedApproval(null);
            }}
            onReject={() => {
              onReject(selectedApproval.id);
              setSelectedApproval(null);
            }}
            onClose={() => setSelectedApproval(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * Swipeable KPI-Carousel.
 */
function KPICarousel({ kpis }: { kpis: KPICard[] }) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const handleDragEnd = (_evt: MouseEvent | TouchEvent | PointerEvent, info: { offset: { x: number } }) => {
    if (info.offset.x < -50 && currentIndex < kpis.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else if (info.offset.x > 50 && currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  return (
    <div className="px-4 mt-2">
      <motion.div
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.2}
        onDragEnd={handleDragEnd}
        className="overflow-hidden"
      >
        <motion.div
          animate={{ x: -currentIndex * 100 + '%' }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="flex"
        >
          {kpis.map((kpi) => {
            const Icon = kpi.icon;
            const TrendIcon = kpi.trend === 'up' ? TrendingUp : kpi.trend === 'down' ? TrendingDown : Minus;
            const trendColor = kpi.trend === 'up' ? 'text-status-green' : kpi.trend === 'down' ? 'text-status-red' : 'text-text-tertiary';

            return (
              <div key={kpi.key} className="w-full flex-shrink-0 pr-2">
                <div className="bg-bg-card border border-border-default rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', kpi.color)}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <span className="text-xs text-text-tertiary">{kpi.label}</span>
                    </div>
                    <div className={cn('flex items-center gap-0.5', trendColor)}>
                      <TrendIcon className="w-3 h-3" />
                      <span className="text-[11px] font-medium">{kpi.change}</span>
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-text-primary mt-2">{kpi.value}</p>
                </div>
              </div>
            );
          })}
        </motion.div>
      </motion.div>

      {/* Pagination Dots */}
      <div className="flex items-center justify-center gap-1.5 mt-3">
        {kpis.map((_, i) => (
          <motion.div
            key={i}
            animate={{
              width: i === currentIndex ? 20 : 6,
              backgroundColor: i === currentIndex ? '#2DD4BF' : '#3F3F46',
            }}
            className="h-1.5 rounded-full"
          />
        ))}
      </div>
    </div>
  );
}

/**
 * Risiko-Karte fuer Mobile.
 */
function RiskCard({ risk }: { risk: Risk }) {
  const scorePercent = (risk.score / 25) * 100;
  const scoreColor =
    risk.score >= 15 ? 'bg-status-red' : risk.score >= 8 ? 'bg-status-yellow' : 'bg-status-green';

  return (
    <motion.div
      whileTap={{ scale: 0.98 }}
      className="bg-bg-card border border-border-default rounded-xl p-3.5"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-medium text-text-primary truncate">{risk.name}</h4>
          <p className="text-[11px] text-text-tertiary mt-0.5 capitalize">{risk.category}</p>
        </div>
        <span
          className={cn(
            'text-xs font-bold px-2 py-0.5 rounded-md',
            scoreColor + '/15',
            scoreColor.replace('bg-', 'text-')
          )}
        >
          {risk.score}
        </span>
      </div>
      <div className="mt-2 h-1.5 bg-bg-tertiary rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${scorePercent}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className={cn('h-full rounded-full', scoreColor)}
        />
      </div>
      <p className="text-[11px] text-text-tertiary mt-1.5 line-clamp-2">{risk.earlyWarning}</p>
    </motion.div>
  );
}

/**
 * Section-Header mit Navigation.
 */
function SectionHeader({
  title,
  count,
  onClick,
}: {
  title: string;
  count: number;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center justify-between w-full group"
    >
      <div className="flex items-center gap-2">
        <h2 className="text-sm font-semibold text-text-primary">{title}</h2>
        {count > 0 && <NotificationBadge count={count} size="sm" />}
      </div>
      <ChevronRight className="w-4 h-4 text-text-tertiary group-hover:text-text-primary transition-colors" />
    </button>
  );
}

/**
 * Approval-Detail Bottom Sheet.
 */
function ApprovalDetailSheet({
  approval,
  onApprove,
  onReject,
  onClose,
}: {
  approval: Approval;
  onApprove: () => void;
  onReject: () => void;
  onClose: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="w-full max-w-lg bg-bg-primary border-t border-border-default rounded-t-2xl p-5 mx-0"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag Handle */}
        <div className="flex justify-center mb-4">
          <div className="w-10 h-1 rounded-full bg-border-default" />
        </div>

        <ApprovalCard
          approval={approval}
          onApprove={onApprove}
          onReject={onReject}
          onView={() => {}}
        />

        <button
          onClick={onClose}
          className="w-full mt-4 py-3 rounded-xl bg-bg-tertiary text-text-secondary text-sm font-medium hover:bg-bg-card transition-colors"
        >
          Schliessen
        </button>
      </motion.div>
    </motion.div>
  );
}

/**
 * Empty-State-Komponente.
 */
function EmptyState({
  icon: Icon,
  title,
  subtitle,
}: {
  icon: React.ElementType;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="flex flex-col items-center py-6 text-center">
      <div className="w-12 h-12 rounded-xl bg-bg-tertiary flex items-center justify-center mb-3">
        <Icon className="w-5 h-5 text-text-tertiary" />
      </div>
      <p className="text-sm font-medium text-text-secondary">{title}</p>
      <p className="text-xs text-text-tertiary mt-0.5">{subtitle}</p>
    </div>
  );
}
