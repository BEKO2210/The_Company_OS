import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Power,
  PowerOff,
  PauseCircle,
  ShieldOff,
  Octagon,
  AlertTriangle,
  Clock,
  Bot,
  GitBranch,
  Wallet,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Ban,
  RotateCcw,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Types ───
type KillLevel = 1 | 2 | 3 | 4;
type SystemStatus = 'normal' | 'warning' | 'critical' | 'emergency';

interface ActivationState {
  level: KillLevel | null;
  status: SystemStatus;
}

interface ProtocolEntry {
  id: string;
  date: string;
  time: string;
  event: string;
  level: string;
  triggeredBy: string;
  status: string;
}

// ─── Mock Data ───
const protocolLog: ProtocolEntry[] = [
  { id: '1', date: '01.04.', time: '14:00', event: 'Kill-Switch-Test', level: 'Level 1', triggeredBy: 'Human CEO', status: 'Abgeschlossen' },
  { id: '2', date: '15.03.', time: '09:30', event: 'Kill-Switch-Test', level: 'Level 3', triggeredBy: 'Human CEO', status: 'Abgeschlossen' },
  { id: '3', date: '01.03.', time: '12:00', event: 'Kill-Switch-Test', level: 'Level 2', triggeredBy: 'Human CEO', status: 'Abgeschlossen' },
  { id: '4', date: '15.02.', time: '10:00', event: 'Kill-Switch-Test', level: 'Level 1', triggeredBy: 'Human CEO', status: 'Abgeschlossen' },
];

// ─── Helpers ───
const levelStatusColor = (level: KillLevel): string => {
  switch (level) {
    case 1: return 'text-status-yellow';
    case 2: return 'text-status-orange';
    case 3: return 'text-status-red';
    case 4: return 'text-status-red';
    default: return 'text-text-tertiary';
  }
};

const levelBadgeBg = (level: KillLevel): string => {
  switch (level) {
    case 1: return 'badge-yellow';
    case 2: return 'badge-orange';
    case 3: return 'badge-red';
    case 4: return 'badge-red';
    default: return 'badge-gray';
  }
};

// ─── Confirmation Modal ───
function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  level,
  confirmLabel,
  confirmCode,
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  level: KillLevel;
  confirmLabel: string;
  confirmCode?: string;
}) {
  const [codeInput, setCodeInput] = useState('');
  const codeRequiredValue = confirmCode || '';
  void codeRequiredValue;

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center p-4"
        style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
          className="bg-bg-tertiary border border-border-default rounded-card w-full max-w-md shadow-card overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className={cn('px-5 py-4 border-b', level === 4 ? 'border-status-red bg-status-red/10' : 'border-border-subtle')}>
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className={cn('w-5 h-5', levelStatusColor(level))} />
              <h3 className="text-lg font-semibold text-text-primary">{title}</h3>
            </div>
            <p className="text-sm text-text-secondary">{message}</p>
          </div>

          {/* Code input if required */}
          {confirmCode && (
            <div className="px-5 py-4">
              <label className="text-xs text-text-tertiary uppercase tracking-wider mb-2 block">
                Bestatigungscode eingeben
              </label>
              <input
                type="text"
                placeholder={`z.B. ${confirmCode}`}
                value={codeInput}
                onChange={(e) => setCodeInput(e.target.value)}
                className="w-full h-10 px-3 bg-bg-primary border border-border-subtle rounded-input text-sm text-text-primary placeholder:text-text-muted focus:border-status-red focus:outline-none transition-colors font-mono-data"
              />
              <p className="text-[11px] text-text-tertiary mt-1">
                Geben Sie <span className="font-mono-data text-status-red">{confirmCode}</span> ein, um fortzufahren
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="px-5 py-4 border-t border-border-subtle flex items-center justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-border-default text-text-primary text-xs font-medium rounded-button hover:bg-bg-tertiary transition-colors"
            >
              Abbrechen
            </button>
            <button
              onClick={onConfirm}
              disabled={!!(confirmCode && codeInput !== confirmCode)}
              className={cn(
                'px-4 py-2 text-white text-xs font-medium rounded-button transition-all disabled:opacity-40 disabled:cursor-not-allowed',
                level === 4
                  ? 'bg-status-red hover:bg-status-red/90 shadow-kill'
                  : 'bg-status-red hover:bg-status-red/90'
              )}
            >
              {confirmLabel}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ─── Press and Hold Button ───
function PressHoldButton({
  onActivate,
  duration,
  label,
  active,
}: {
  onActivate: () => void;
  duration: number;
  label: string;
  active: boolean;
}) {
  const [progress, setProgress] = useState(0);
  const [countdown, setCountdown] = useState(duration);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);

  const startHold = useCallback(() => {
    if (active) return;
    setProgress(0);
    setCountdown(duration);
    startTimeRef.current = Date.now();
    intervalRef.current = setInterval(() => {
      const elapsed = (Date.now() - startTimeRef.current) / 1000;
      const pct = Math.min(elapsed / duration, 1);
      setProgress(pct);
      setCountdown(Math.max(duration - Math.floor(elapsed), 0));
      if (pct >= 1) {
        if (intervalRef.current) clearInterval(intervalRef.current);
        onActivate();
      }
    }, 50);
  }, [active, duration, onActivate]);

  const stopHold = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setProgress(0);
    setCountdown(duration);
  }, [duration]);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative">
        {/* Progress ring SVG */}
        <svg className="absolute -inset-3 w-[calc(100%+24px)] h-[calc(100%+24px)]" viewBox="0 0 120 120">
          <circle
            cx="60"
            cy="60"
            r="54"
            fill="none"
            stroke="#2A2A36"
            strokeWidth="3"
          />
          <circle
            cx="60"
            cy="60"
            r="54"
            fill="none"
            stroke="#EF4444"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={`${2 * Math.PI * 54}`}
            strokeDashoffset={`${2 * Math.PI * 54 * (1 - progress)}`}
            transform="rotate(-90 60 60)"
            style={{ transition: 'stroke-dashoffset 0.05s linear' }}
          />
        </svg>
        <motion.button
          onPointerDown={startHold}
          onPointerUp={stopHold}
          onPointerLeave={stopHold}
          animate={
            active
              ? {}
              : {
                  boxShadow: [
                    '0 0 20px #EF444433',
                    '0 0 40px #EF444466',
                    '0 0 20px #EF444433',
                  ],
                }
          }
          transition={
            active
              ? {}
              : { duration: 1.5, repeat: Infinity, ease: 'easeInOut' }
          }
          className={cn(
            'relative select-none touch-none',
            'px-10 py-5 rounded-card font-bold text-white text-sm uppercase tracking-wider',
            'transition-transform active:scale-95',
            active
              ? 'bg-text-muted cursor-not-allowed'
              : 'bg-gradient-to-br from-[#DC2626] to-[#991B1B] border-[3px] border-status-red cursor-pointer'
          )}
          style={{
            boxShadow: active ? undefined : '0 0 30px #EF444466',
          }}
        >
          {active ? 'AKTIVIERT' : label}
        </motion.button>
      </div>
      {!active && progress > 0 && (
        <motion.span
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-xs font-mono-data text-status-red"
        >
          {countdown > 0 ? countdown : 'AKTIVIERT!'}
        </motion.span>
      )}
      {!active && progress === 0 && (
        <span className="text-[11px] text-text-tertiary">
          {duration === 5 ? '5 Sekunden gedruckt halten' : '3 Sekunden gedruckt halten'}
        </span>
      )}
    </div>
  );
}

// ─── Level Card ───
function LevelCard({
  level,
  title,
  description,
  icon: Icon,
  impacts,
  triggerConditions,
  active,
  onActivate,
  status: _status,
}: {
  level: KillLevel;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  impacts: string[];
  triggerConditions: string[];
  active: boolean;
  onActivate: () => void;
  status: SystemStatus;
}) {
  void _status;
  const [showConfirm, setShowConfirm] = useState(false);
  const [showCodeConfirm, setShowCodeConfirm] = useState(false);

  const isLevel4 = level === 4;
  const isLevel3 = level === 3;
  const requiresCode = isLevel3 || isLevel4;
  const confirmCode = isLevel4 ? 'KILL-SWITCH-2025' : isLevel3 ? 'NOTFALL-1234' : undefined;

  const handleActivate = () => {
    if (requiresCode) {
      setShowCodeConfirm(true);
    } else {
      setShowConfirm(true);
    }
  };

  const doActivate = () => {
    onActivate();
    setShowConfirm(false);
    setShowCodeConfirm(false);
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          duration: 0.3,
          delay: level * 0.05,
          ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
        }}
        className={cn(
          'rounded-card p-6 min-h-[220px] flex flex-col transition-all duration-300',
          active
            ? 'bg-bg-tertiary border-2 border-status-red shadow-[0_0_24px_#EF444433]'
            : 'bg-bg-secondary border border-border-subtle hover:border-border-default'
        )}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className={cn('p-2 rounded-lg', isLevel4 ? 'bg-status-red/15' : 'bg-bg-tertiary')}>
              <Icon className={cn('w-8 h-8', levelStatusColor(level))} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-text-tertiary font-medium">
                  LEVEL {level} {isLevel4 ? '— NUKLEARE OPTION' : ''}
                </span>
              </div>
              <h3 className={cn(
                'font-semibold',
                isLevel4 ? 'text-xl text-status-red' : 'text-lg text-text-primary'
              )}>
                {title}
              </h3>
            </div>
          </div>
          <span className={cn('badge text-[11px] px-2 py-0.5 rounded-md', levelBadgeBg(level))}>
            {active ? 'AKTIV' : 'Standby'}
          </span>
        </div>

        {/* Description */}
        <p className={cn('text-sm mb-4', isLevel4 ? 'text-status-red/80' : 'text-text-secondary')}>
          {description}
        </p>

        {/* Impacts */}
        <div className="mb-4 flex-1">
          <p className="text-[11px] text-text-tertiary uppercase tracking-wider mb-2">Auswirkungen</p>
          <ul className="space-y-1.5">
            {impacts.map((impact, idx) => (
              <li
                key={idx}
                className={cn(
                  'flex items-start gap-2 text-xs',
                  isLevel4 ? 'text-status-red' : 'text-text-secondary'
                )}
              >
                <Ban className={cn(
                  'w-3 h-3 mt-0.5 flex-shrink-0',
                  isLevel4 ? 'text-status-red' : 'text-status-orange'
                )} />
                {impact}
              </li>
            ))}
          </ul>
        </div>

        {/* Trigger conditions */}
        <div className="mb-4">
          <p className="text-[11px] text-text-tertiary uppercase tracking-wider mb-2">Trigger-Bedingungen</p>
          <ul className="space-y-1">
            {triggerConditions.map((cond, idx) => (
              <li key={idx} className="text-[11px] text-text-tertiary flex items-start gap-1.5">
                <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0 text-status-yellow" />
                {cond}
              </li>
            ))}
          </ul>
        </div>

        {/* Activation */}
        <div className="mt-auto pt-3 border-t border-border-subtle">
          {isLevel4 ? (
            <PressHoldButton
              onActivate={doActivate}
              duration={5}
              label={title + ' AKTIVIEREN'}
              active={active}
            />
          ) : (
            <button
              onClick={handleActivate}
              disabled={active}
              className={cn(
                'w-full py-2.5 px-4 rounded-button text-xs font-medium transition-all',
                active
                  ? 'bg-text-muted text-text-muted cursor-not-allowed border border-border-subtle'
                  : level === 1
                    ? 'border border-status-red text-status-red hover:bg-status-red/10'
                    : 'bg-status-red text-white hover:bg-status-red/90'
              )}
            >
              {active ? 'AKTIVIERT' : title + ' AKTIVIEREN'}
            </button>
          )}
        </div>
      </motion.div>

      {/* Confirmation modals */}
      <ConfirmModal
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={doActivate}
        title={`${title} aktivieren?`}
        message={`Sind Sie sicher, dass Sie ${title} aktivieren mochten? Dies kann Auswirkungen auf laufende Operationen haben.`}
        level={level}
        confirmLabel="Aktivieren"
      />
      <ConfirmModal
        isOpen={showCodeConfirm}
        onClose={() => setShowCodeConfirm(false)}
        onConfirm={doActivate}
        title={`${title} aktivieren?`}
        message={`Diese Aktion erfordert zusatzliche Bestatigung. Geben Sie den Code ein, um ${title} zu aktivieren.`}
        level={level}
        confirmLabel="Aktivieren"
        confirmCode={confirmCode}
      />
    </>
  );
}

// ─── Status Dashboard ───
function StatusDashboard({ activation }: { activation: ActivationState }) {
  const statusItems = [
    {
      title: 'AGENTEN STATUS',
      icon: Bot,
      color: 'text-accent-teal',
      items: [
        { label: '18 aktiv', count: 18, total: 22, color: 'bg-status-green' },
        { label: '3 pausiert', count: 3, total: 22, color: 'bg-status-yellow' },
        { label: '1 blockiert', count: 1, total: 22, color: 'bg-status-red' },
        { label: '0 deaktiviert', count: 0, total: 22, color: 'bg-text-muted' },
      ],
    },
    {
      title: 'WORKFLOW STATUS',
      icon: GitBranch,
      color: 'text-accent-blue',
      items: [
        { label: '5 aktiv', count: 5, total: 18, color: 'bg-status-green' },
        { label: '3 blockiert', count: 3, total: 18, color: 'bg-status-red' },
        { label: '10 inaktiv', count: 10, total: 18, color: 'bg-text-muted' },
        { label: '0 gestoppt', count: 0, total: 18, color: 'bg-text-muted' },
      ],
    },
    {
      title: 'FINANZ STATUS',
      icon: Wallet,
      color: 'text-status-green',
      items: [
        { label: 'Liquiditat: EUR 12.450', count: 62, total: 100, color: 'bg-status-green' },
        { label: 'Monatsbudget: 68%', count: 68, total: 100, color: 'bg-status-yellow' },
        { label: 'Notfallreserve: EUR 2.000', count: 100, total: 100, color: 'bg-status-green' },
      ],
    },
    {
      title: 'SECURITY STATUS',
      icon: ShieldCheck,
      color: 'text-accent-purple',
      items: [
        { label: 'Sicher', count: 100, total: 100, color: 'bg-status-green' },
        { label: 'Letzter Scan: vor 1h', count: 100, total: 100, color: 'bg-status-green' },
        { label: 'Offene Vorfalle: 0', count: 0, total: 100, color: 'bg-status-green' },
        { label: 'API-Key: Aktuell', count: 100, total: 100, color: 'bg-status-green' },
      ],
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {statusItems.map((item, idx) => (
        <motion.div
          key={item.title}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.3,
            delay: 0.5 + idx * 0.08,
            ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
          }}
          className={cn(
            'data-card',
            activation.status !== 'normal' && 'opacity-60'
          )}
        >
          <div className="flex items-center gap-2 mb-3">
            <item.icon className={cn('w-4 h-4', item.color)} />
            <h3 className="text-[11px] font-semibold text-text-tertiary tracking-wider uppercase">
              {item.title}
            </h3>
          </div>
          <div className="space-y-2.5">
            {item.items.map((sub, sidx) => (
              <div key={sidx}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-text-secondary">{sub.label}</span>
                </div>
                {sub.total > 1 && (
                  <div className="h-1 bg-bg-tertiary rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${(sub.count / sub.total) * 100}%` }}
                      transition={{ duration: 0.5, delay: 0.6 + idx * 0.08 + sidx * 0.05 }}
                      className={cn('h-full rounded-full', sub.color)}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </motion.div>
      ))}
    </div>
  );
}

// ─── Protocol Log ───
function ProtocolLog() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.6 }}
      className="data-card"
    >
      <div className="flex items-center gap-2 mb-4">
        <Clock className="w-4 h-4 text-accent-teal" />
        <h2 className="text-lg font-semibold text-text-primary">Notfall-Protokoll</h2>
        <span className="text-[11px] text-text-tertiary ml-auto">{protocolLog.length} Eintrage</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-bg-tertiary text-left">
              <th className="px-4 py-2.5 text-[11px] font-semibold text-text-tertiary uppercase tracking-wider">Zeit</th>
              <th className="px-4 py-2.5 text-[11px] font-semibold text-text-tertiary uppercase tracking-wider">Ereignis</th>
              <th className="px-4 py-2.5 text-[11px] font-semibold text-text-tertiary uppercase tracking-wider">Level</th>
              <th className="px-4 py-2.5 text-[11px] font-semibold text-text-tertiary uppercase tracking-wider">Ausgelost von</th>
              <th className="px-4 py-2.5 text-[11px] font-semibold text-text-tertiary uppercase tracking-wider">Status</th>
            </tr>
          </thead>
          <tbody>
            {protocolLog.map((entry, idx) => (
              <motion.tr
                key={entry.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.2, delay: 0.7 + idx * 0.06 }}
                className="border-b border-border-subtle hover:bg-bg-tertiary/30 transition-colors"
              >
                <td className="px-4 py-2.5 text-xs text-text-tertiary whitespace-nowrap">
                  {entry.date} {entry.time}
                </td>
                <td className="px-4 py-2.5 text-xs text-text-primary">{entry.event}</td>
                <td className="px-4 py-2.5 text-xs">
                  <span className="badge badge-blue text-[10px] px-1.5 py-0.5 rounded">{entry.level}</span>
                </td>
                <td className="px-4 py-2.5 text-xs text-text-secondary">{entry.triggeredBy}</td>
                <td className="px-4 py-2.5 text-xs">
                  <span className="badge badge-green text-[10px] px-1.5 py-0.5 rounded">{entry.status}</span>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}

// ─── Recovery Procedure ───
function RecoveryProcedure() {
  const [expanded, setExpanded] = useState(false);

  const steps = [
    {
      level: 'Circuit Breaker',
      action: 'Human CEO klickt "Deaktivieren" + PIN eingeben',
      icon: PauseCircle,
      color: 'text-status-yellow',
    },
    {
      level: 'Quarantane aufheben',
      action: 'Human CEO review + "Freigeben" pro Agent',
      icon: ShieldOff,
      color: 'text-status-orange',
    },
    {
      level: 'Workflows neu starten',
      action: 'Human CEO "Workflows fortsetzen" + Bestatigung',
      icon: RotateCcw,
      color: 'text-status-red',
    },
    {
      level: 'System neu starten',
      action: 'Human CEO "System Reboot" + 10-min Countdown + Finalbestatigung',
      icon: Power,
      color: 'text-status-red',
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.7 }}
      className="data-card"
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between"
      >
        <div className="flex items-center gap-2">
          <RotateCcw className="w-4 h-4 text-accent-teal" />
          <h2 className="text-lg font-semibold text-text-primary">Wiederherstellungs-Protokoll</h2>
        </div>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-text-tertiary" />
        ) : (
          <ChevronDown className="w-4 h-4 text-text-tertiary" />
        )}
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
            className="overflow-hidden"
          >
            <div className="mt-4 space-y-3 pt-4 border-t border-border-subtle">
              {steps.map((step, idx) => (
                <div key={idx} className="flex items-start gap-3">
                  <div className={cn('w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0', step.color, 'bg-bg-tertiary')}>
                    {idx + 1}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-text-primary">{step.level}</p>
                    <p className="text-xs text-text-secondary">{step.action}</p>
                  </div>
                  <step.icon className={cn('w-4 h-4 flex-shrink-0', step.color)} />
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Main Page ───
export default function KillSwitchPage() {
  const [activation, setActivation] = useState<ActivationState>({
    level: null,
    status: 'normal',
  });

  const [bannerVisible, setBannerVisible] = useState(false);

  const activateLevel = (level: KillLevel) => {
    setActivation({ level, status: level === 4 ? 'emergency' : level === 3 ? 'critical' : 'warning' });
    setBannerVisible(true);
  };

  const dismissBanner = () => {
    setBannerVisible(false);
  };

  const systemStatusLabel = () => {
    switch (activation.status) {
      case 'normal': return 'SYSTEM NORMAL';
      case 'warning': return 'SYSTEM WARNUNG';
      case 'critical': return 'SYSTEM KRITISCH';
      case 'emergency': return 'NOTFALLMODUS';
      default: return 'SYSTEM NORMAL';
    }
  };

  const systemStatusColor = () => {
    switch (activation.status) {
      case 'normal': return 'status-dot-green';
      case 'warning': return 'status-dot-yellow';
      case 'critical': return 'status-dot-red animate-pulse-red';
      case 'emergency': return 'status-dot-red animate-pulse-red';
      default: return 'status-dot-green';
    }
  };

  const systemStatusTextColor = () => {
    switch (activation.status) {
      case 'normal': return 'text-status-green';
      case 'warning': return 'text-status-yellow';
      case 'critical': return 'text-status-red';
      case 'emergency': return 'text-status-red';
      default: return 'text-status-green';
    }
  };

  const levelData = [
    {
      level: 1 as KillLevel,
      title: 'CIRCUIT BREAKER',
      description: 'Sofortiger Stopp aller nicht-kritischen Operationen. Kritische Funktionen (Security, Finance) laufen weiter.',
      icon: PauseCircle,
      impacts: [
        'Nicht-kritische Agenten pausiert',
        'Neue Projekte blockiert',
        'Automatische Zahlungen gestoppt',
        'Marketing-Kampagnen pausiert',
      ],
      triggerConditions: [
        'Liquiditat < EUR 3.000',
        '3+ kritische Risiken gleichzeitig',
        'Security-Incident Level 2',
      ],
    },
    {
      level: 2 as KillLevel,
      title: 'AGENT QUARANTANE',
      description: 'Verdachtige Agenten werden isoliert. Ihre Aktionen werden protokolliert aber nicht ausgefuhrt. Human-Review erforderlich.',
      icon: ShieldOff,
      impacts: [
        'Agent-Aktionen erfordern Human-Approval',
        'Agent-Kommunikation blockiert',
        'Audit-Trail wird erweitert',
        'Agent kann nicht auf Tools zugreifen',
      ],
      triggerConditions: [
        'Circuit Breaker aktiv + weitere Eskalation',
        'Agent-Verhalten-Anomalie erkannt',
        'Safety-Agent Veto ausgelost',
      ],
    },
    {
      level: 3 as KillLevel,
      title: 'WORKFLOW STOPP',
      description: 'Alle Workflows werden sofort gestoppt. Keine automatischen Prozesse laufen mehr. Manuelle Interventions nur.',
      icon: Octagon,
      impacts: [
        'Alle 18 Workflows gestoppt',
        'Keine automatischen Genehmigungen',
        'Keine Agent-Aktionen ohne Human-Trigger',
        'Nur lesender Zugriff auf Daten',
      ],
      triggerConditions: [
        'Agent Quarantane + weiterer Vorfall',
        'Kritischer Finanz-Vorfall',
        'Mehrfache Security-Verletzung',
      ],
    },
    {
      level: 4 as KillLevel,
      title: 'GLOBALER KILL SWITCH',
      description: 'Kompletter System-Shutdown. Alle Operationen werden beendet. Daten werden gesichert. Keine Agent-Aktivitat mehr.',
      icon: PowerOff,
      impacts: [
        'ALLE Agenten deaktiviert',
        'ALLE Workflows gestoppt',
        'ALLE Zahlungen blockiert',
        'ALLE Deployments verhindert',
        'Datensicherung wird gestartet',
        'Nur Human CEO kann System neu starten',
      ],
      triggerConditions: [
        'Workflow Stopp + weiterer kritischer Vorfall',
        'Liquiditat < EUR 500',
        'Kritischer Security-Breach',
        'Safety-Agent entscheidet: Total-Shutdown',
      ],
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="max-w-container mx-auto space-y-6"
    >
      {/* Warning Banner */}
      <AnimatePresence>
        {bannerVisible && activation.level && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 48, opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
            className="bg-status-red rounded-lg flex items-center justify-between px-4 overflow-hidden"
          >
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-white" />
              <motion.span
                animate={{ opacity: [0.8, 1, 0.8] }}
                transition={{ duration: 1, repeat: Infinity, ease: 'easeInOut' }}
                className="text-sm font-semibold text-white"
              >
                NOTFALLMODUS AKTIV — {levelData[activation.level - 1].title} wurde ausgelost
              </motion.span>
            </div>
            <button
              onClick={dismissBanner}
              className="text-white/80 hover:text-white transition-colors"
              title="Nur Human CEO kann entlassen"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Page Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
      >
        <div className="flex items-center gap-2 text-[11px] text-text-tertiary mb-1">
          <span>Dashboard</span>
          <span>/</span>
          <span className="text-text-secondary">Kill Switch</span>
        </div>
        <h1 className="text-[2rem] font-bold text-text-primary tracking-tight leading-tight">
          KILL SWITCH
        </h1>
        <p className="text-sm text-text-secondary mt-1">
          4-Level Notabschaltung — Nur im Notfall verwenden
        </p>
      </motion.div>

      {/* System Status Bar */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="data-card flex flex-wrap items-center justify-between gap-4"
      >
        <div className="flex items-center gap-3">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.2, delay: 0.2 }}
            className={cn('status-dot w-2.5 h-2.5', systemStatusColor())}
          />
          <h2 className={cn('text-base font-semibold', systemStatusTextColor())}>
            {systemStatusLabel()}
          </h2>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-[11px] text-text-tertiary">Letzter Kill-Switch-Test</p>
            <p className="text-xs text-text-secondary">Noch nicht durchgefuehrt</p>
          </div>
          <button className="px-3 py-1.5 border border-border-default text-text-primary text-xs font-medium rounded-button hover:bg-bg-tertiary transition-colors">
            Testlauf starten
          </button>
        </div>
      </motion.div>

      {/* 4-Level Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {levelData.map((data) => (
          <LevelCard
            key={data.level}
            {...data}
            active={activation.level === data.level}
            onActivate={() => activateLevel(data.level)}
            status={activation.status}
          />
        ))}
      </div>

      {/* Status Dashboard */}
      <StatusDashboard activation={activation} />

      {/* Protocol Log */}
      <ProtocolLog />

      {/* Recovery Procedure */}
      <RecoveryProcedure />

      {/* Activation Overlay Effect */}
      <AnimatePresence>
        {activation.level !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.05 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 pointer-events-none z-[90]"
            style={{
              background: 'radial-gradient(ellipse at center, #EF4444 0%, transparent 70%)',
            }}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
