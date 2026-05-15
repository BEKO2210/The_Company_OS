/**
 * ApprovalCard
 * Kompakte Approval-Karte fuer Mobile-Ansicht.
 * Unterstuetzt Swipe-zum-Genehmigen und One-Click-Actions.
 */

import { useState, useRef } from 'react';
import { motion, useMotionValue, useTransform } from 'framer-motion';
import type { PanInfo } from 'framer-motion';
import {
  Check,
  X,
  AlertTriangle,
  ChevronRight,
  Clock,
  User,
  Euro,
} from 'lucide-react';
import type { Approval } from '@/data/models';
import { cn } from '@/lib/utils';
import { sendLocalNotification } from '@/pwa/notifications';

interface ApprovalCardProps {
  approval: Approval;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onView: (approval: Approval) => void;
  compact?: boolean;
}

const riskConfig = {
  low: { color: 'bg-status-green/15 text-status-green', label: 'Niedrig' },
  medium: { color: 'bg-status-yellow/15 text-status-yellow', label: 'Mittel' },
  high: { color: 'bg-status-orange/15 text-status-orange', label: 'Hoch' },
  critical: { color: 'bg-status-red/15 text-status-red', label: 'Kritisch' },
};

const typeIcons: Record<string, React.ReactNode> = {
  payment: <Euro className="w-3.5 h-3.5" />,
  contract: <User className="w-3.5 h-3.5" />,
  invoice: <Euro className="w-3.5 h-3.5" />,
  deployment: <ChevronRight className="w-3.5 h-3.5" />,
  freelancer: <User className="w-3.5 h-3.5" />,
  purchase: <Euro className="w-3.5 h-3.5" />,
  communication: <User className="w-3.5 h-3.5" />,
  other: <ChevronRight className="w-3.5 h-3.5" />,
};

export default function ApprovalCard({
  approval,
  onApprove,
  onReject,
  onView,
  compact = false,
}: ApprovalCardProps) {
  const [status, setStatus] = useState<'idle' | 'approving' | 'rejecting'>('idle');
  const x = useMotionValue(0);
  const opacity = useTransform(x, [-150, 0, 150], [0.5, 1, 0.5]);
  const scale = useTransform(x, [-150, 0, 150], [0.95, 1, 0.95]);
  const bgApprove = useTransform(x, [0, 100], ['rgba(34,197,94,0)', 'rgba(34,197,94,0.15)']);
  const bgReject = useTransform(x, [-100, 0], ['rgba(239,68,68,0.15)', 'rgba(239,68,68,0)']);
  const cardRef = useRef<HTMLDivElement>(null);

  const risk = riskConfig[approval.riskLevel];

  const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (info.offset.x > 80) {
      setStatus('approving');
      onApprove(approval.id);
      sendLocalNotification('Freigabe genehmigt', {
        body: `${approval.title} wurde genehmigt`,
        tag: `approval-approved-${approval.id}`,
      });
    } else if (info.offset.x < -80) {
      setStatus('rejecting');
      onReject(approval.id);
      sendLocalNotification('Freigabe abgelehnt', {
        body: `${approval.title} wurde abgelehnt`,
        tag: `approval-rejected-${approval.id}`,
      });
    }
  };

  const handleQuickApprove = (e: React.MouseEvent) => {
    e.stopPropagation();
    setStatus('approving');
    onApprove(approval.id);
  };

  const handleQuickReject = (e: React.MouseEvent) => {
    e.stopPropagation();
    setStatus('rejecting');
    onReject(approval.id);
  };

  if (status !== 'idle') {
    return (
      <motion.div
        initial={{ opacity: 1 }}
        animate={{
          opacity: 0,
          height: 0,
          marginBottom: 0,
          padding: 0,
        }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="overflow-hidden"
      />
    );
  }

  if (compact) {
    return (
      <motion.div
        ref={cardRef}
        style={{ x, opacity, scale }}
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.3}
        onDragEnd={handleDragEnd}
        whileTap={{ scale: 0.98 }}
        onClick={() => onView(approval)}
        className={cn(
          'relative bg-bg-card border border-border-default rounded-xl p-3',
          'active:bg-bg-elevated transition-colors',
          'touch-pan-y'
        )}
      >
        <div className="flex items-start gap-3">
          {/* Type Icon */}
          <div className="w-9 h-9 rounded-lg bg-bg-tertiary flex items-center justify-center flex-shrink-0 text-text-secondary">
            {typeIcons[approval.type] || <ChevronRight className="w-3.5 h-3.5" />}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-medium text-text-primary truncate">
                {approval.title}
              </h3>
              {approval.redLine && (
                <AlertTriangle className="w-3.5 h-3.5 text-status-red flex-shrink-0" />
              )}
            </div>
            <p className="text-[11px] text-text-tertiary mt-0.5 truncate">
              {approval.requester}
            </p>
            <div className="flex items-center gap-2 mt-1.5">
              <span className={cn('text-[10px] px-1.5 py-0.5 rounded-md font-medium', risk.color)}>
                {risk.label}
              </span>
              {approval.amount && (
                <span className="text-[11px] text-text-secondary font-medium">
                  {approval.amount.toLocaleString('de-DE')} EUR
                </span>
              )}
            </div>
          </div>

          {/* Quick actions */}
          <div className="flex flex-col gap-1 flex-shrink-0">
            <motion.button
              whileTap={{ scale: 0.85 }}
              onClick={handleQuickApprove}
              className="w-8 h-8 rounded-lg bg-status-green/15 text-status-green flex items-center justify-center"
            >
              <Check className="w-4 h-4" />
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.85 }}
              onClick={handleQuickReject}
              className="w-8 h-8 rounded-lg bg-status-red/15 text-status-red flex items-center justify-center"
            >
              <X className="w-4 h-4" />
            </motion.button>
          </div>
        </div>

        {/* Swipe hint overlay */}
        <motion.div
          style={{ backgroundColor: bgApprove }}
          className="absolute inset-0 rounded-xl pointer-events-none flex items-center justify-end pr-4"
        >
          <motion.div style={{ opacity: useTransform(x, [20, 80], [0, 1]) }}>
            <Check className="w-8 h-8 text-status-green" />
          </motion.div>
        </motion.div>
        <motion.div
          style={{ backgroundColor: bgReject }}
          className="absolute inset-0 rounded-xl pointer-events-none flex items-center pl-4"
        >
          <motion.div style={{ opacity: useTransform(x, [-80, -20], [1, 0]) }}>
            <X className="w-8 h-8 text-status-red" />
          </motion.div>
        </motion.div>
      </motion.div>
    );
  }

  // Full variant
  return (
    <motion.div
      layout
      ref={cardRef}
      style={{ x, opacity, scale }}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.3}
      onDragEnd={handleDragEnd}
      whileTap={{ scale: 0.98 }}
      onClick={() => onView(approval)}
      className={cn(
        'relative bg-bg-card border border-border-default rounded-xl p-4',
        'active:bg-bg-elevated transition-colors'
      )}
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-bg-tertiary flex items-center justify-center flex-shrink-0 text-text-secondary">
          {typeIcons[approval.type] || <ChevronRight className="w-4 h-4" />}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-text-primary">
              {approval.title}
            </h3>
            {approval.redLine && (
              <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-status-red/15 text-status-red">
                <AlertTriangle className="w-3 h-3" />
                <span className="text-[10px] font-medium">Red Line</span>
              </div>
            )}
          </div>

          <p className="text-xs text-text-secondary mt-1 line-clamp-2">
            {approval.description}
          </p>

          <div className="flex flex-wrap items-center gap-2 mt-2">
            <span className={cn('text-[10px] px-2 py-0.5 rounded-md font-medium', risk.color)}>
              {risk.label}
            </span>
            <span className="flex items-center gap-1 text-[11px] text-text-tertiary">
              <User className="w-3 h-3" />
              {approval.requester}
            </span>
            <span className="flex items-center gap-1 text-[11px] text-text-tertiary">
              <Clock className="w-3 h-3" />
              {new Date(approval.createdAt).toLocaleDateString('de-DE')}
            </span>
            {approval.amount && (
              <span className="text-[11px] font-semibold text-text-primary">
                {approval.amount.toLocaleString('de-DE')} EUR
              </span>
            )}
          </div>

          {/* Recommendation */}
          <div className="mt-2 p-2 bg-bg-tertiary rounded-lg text-[11px] text-text-secondary">
            <span className="font-medium text-text-primary">Empfehlung: </span>
            {approval.recommendation}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 mt-3">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleQuickApprove}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-status-green/15 text-status-green text-xs font-medium active:bg-status-green/25 transition-colors"
            >
              <Check className="w-3.5 h-3.5" />
              Genehmigen
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleQuickReject}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-status-red/15 text-status-red text-xs font-medium active:bg-status-red/25 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
              Ablehnen
            </motion.button>
          </div>
        </div>
      </div>

      {/* Swipe overlays */}
      <motion.div
        style={{ backgroundColor: bgApprove }}
        className="absolute inset-0 rounded-xl pointer-events-none flex items-center justify-end pr-6"
      >
        <motion.div style={{ opacity: useTransform(x, [20, 80], [0, 1]) }}>
          <Check className="w-10 h-10 text-status-green" />
        </motion.div>
      </motion.div>
      <motion.div
        style={{ backgroundColor: bgReject }}
        className="absolute inset-0 rounded-xl pointer-events-none flex items-center pl-6"
      >
        <motion.div style={{ opacity: useTransform(x, [-80, -20], [1, 0]) }}>
          <X className="w-10 h-10 text-status-red" />
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
