/**
 * QuickActions
 * Schnellzugriff-Buttons fuer haeufige Aktionen.
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ClipboardCheck,
  PauseCircle,
  Play,
  Power,
  Phone,
  AlertTriangle,
  Zap,
  X,
  ChevronDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { sendLocalNotification } from '@/pwa/notifications';
import { useNavigate } from 'react-router-dom';

interface QuickAction {
  id: string;
  label: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  onClick: () => void;
  danger?: boolean;
}

export default function QuickActions() {
  const [expanded, setExpanded] = useState(false);
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const navigate = useNavigate();

  const quickActions: QuickAction[] = [
    {
      id: 'approve',
      label: 'Freigabe',
      icon: ClipboardCheck,
      color: 'text-status-green',
      bgColor: 'bg-status-green/10 hover:bg-status-green/20',
      onClick: () => navigate('/approvals'),
    },
    {
      id: 'pause',
      label: 'Agent pause',
      icon: PauseCircle,
      color: 'text-status-yellow',
      bgColor: 'bg-status-yellow/10 hover:bg-status-yellow/20',
      onClick: () => setActiveModal('pause'),
    },
    {
      id: 'workflow',
      label: 'Workflow',
      icon: Play,
      color: 'text-accent-teal',
      bgColor: 'bg-accent-teal/10 hover:bg-accent-teal/20',
      onClick: () => navigate('/workflows'),
    },
    {
      id: 'killswitch',
      label: 'Kill Switch',
      icon: Power,
      color: 'text-status-red',
      bgColor: 'bg-status-red/10 hover:bg-status-red/20',
      danger: true,
      onClick: () => setActiveModal('killswitch'),
    },
    {
      id: 'emergency',
      label: 'Notfall',
      icon: Phone,
      color: 'text-status-red',
      bgColor: 'bg-status-red/10 hover:bg-status-red/20',
      danger: true,
      onClick: () => setActiveModal('emergency'),
    },
  ];

  const handleKillSwitch = () => {
    sendLocalNotification('NOT-AUS aktiviert!', {
      body: 'Kill Switch Level 1 wurde ausgeloest. Alle Agenten werden gestoppt.',
      tag: 'kill-switch-action',
      requireInteraction: true,
    });
    setActiveModal(null);
    navigate('/kill-switch');
  };

  const handleEmergency = () => {
    sendLocalNotification('Notfall-Kontakt', {
      body: 'Notfall-Protokoll wurde aktiviert. Alle Systemadministratoren werden benachrichtigt.',
      tag: 'emergency-contact',
      requireInteraction: true,
    });
    setActiveModal(null);
  };

  return (
    <div className="space-y-2">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center justify-between w-full px-1 py-1 text-text-secondary hover:text-text-primary transition-colors"
      >
        <div className="flex items-center gap-2">
          <Zap className="w-3.5 h-3.5 text-accent-teal" />
          <span className="text-xs font-medium uppercase tracking-wider">Schnellaktionen</span>
        </div>
        <motion.div
          animate={{ rotate: expanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown className="w-4 h-4" />
        </motion.div>
      </button>

      {/* Actions Grid */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="grid grid-cols-5 gap-2">
              {quickActions.map((action, index) => {
                const Icon = action.icon;
                return (
                  <motion.button
                    key={action.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    transition={{ delay: index * 0.05 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={action.onClick}
                    className={cn(
                      'flex flex-col items-center gap-1.5 py-3 px-1 rounded-xl transition-colors',
                      action.bgColor
                    )}
                  >
                    <Icon className={cn('w-5 h-5', action.color)} strokeWidth={2} />
                    <span className={cn('text-[10px] font-medium', action.color)}>
                      {action.label}
                    </span>
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Collapsed: show just icons */}
      {!expanded && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="grid grid-cols-5 gap-2"
        >
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <motion.button
                key={action.id}
                whileTap={{ scale: 0.9 }}
                onClick={action.onClick}
                className={cn(
                  'flex items-center justify-center py-2.5 rounded-xl transition-colors',
                  action.bgColor
                )}
              >
                <Icon className={cn('w-4 h-4', action.color)} strokeWidth={2} />
              </motion.button>
            );
          })}
        </motion.div>
      )}

      {/* Kill Switch Modal */}
      <AnimatePresence>
        {activeModal === 'killswitch' && (
          <Modal onClose={() => setActiveModal(null)} title="Kill Switch aktivieren?">
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 bg-status-red/10 rounded-lg">
                <AlertTriangle className="w-6 h-6 text-status-red flex-shrink-0" />
                <p className="text-sm text-text-primary">
                  Dies stoppt ALLE Agenten sofort. Sind Sie sicher?
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setActiveModal(null)}
                  className="py-2.5 rounded-lg bg-bg-tertiary text-text-secondary text-sm font-medium hover:bg-bg-card transition-colors"
                >
                  Abbrechen
                </button>
                <button
                  onClick={handleKillSwitch}
                  className="py-2.5 rounded-lg bg-status-red text-white text-sm font-medium hover:bg-status-red/90 transition-colors"
                >
                  NOT-AUS aktivieren
                </button>
              </div>
            </div>
          </Modal>
        )}
      </AnimatePresence>

      {/* Emergency Modal */}
      <AnimatePresence>
        {activeModal === 'emergency' && (
          <Modal onClose={() => setActiveModal(null)} title="Notfall-Kontakt">
            <div className="space-y-4">
              <div className="space-y-2">
                {[
                  { role: 'CEO / Founder', contact: 'founder@company-os.local' },
                  { role: 'CTO / Tech Lead', contact: 'tech@company-os.local' },
                  { role: 'Security Officer', contact: 'security@company-os.local' },
                ].map((c) => (
                  <div
                    key={c.role}
                    className="flex items-center justify-between p-3 bg-bg-tertiary rounded-lg"
                  >
                    <div>
                      <p className="text-xs font-medium text-text-primary">{c.role}</p>
                      <p className="text-[11px] text-text-tertiary">{c.contact}</p>
                    </div>
                    <Phone className="w-4 h-4 text-accent-teal" />
                  </div>
                ))}
              </div>
              <button
                onClick={handleEmergency}
                className="w-full py-2.5 rounded-lg bg-status-red text-white text-sm font-medium hover:bg-status-red/90 transition-colors"
              >
                Alle benachrichtigen
              </button>
            </div>
          </Modal>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * Modal-Komponente fuer Quick-Action-Dialoge.
 */
function Modal({
  children,
  onClose,
  title,
}: {
  children: React.ReactNode;
  onClose: () => void;
  title: string;
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
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        exit={{ y: 100 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="w-full max-w-lg bg-bg-primary border border-border-default rounded-t-2xl p-5 mx-4 mb-0"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-text-primary">{title}</h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-bg-tertiary transition-colors"
          >
            <X className="w-4 h-4 text-text-secondary" />
          </button>
        </div>
        {children}
      </motion.div>
    </motion.div>
  );
}
