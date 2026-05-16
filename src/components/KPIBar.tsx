import { motion } from 'framer-motion';
import { Bot, ClipboardCheck, ShieldAlert, Zap, Wallet } from 'lucide-react';
import { cn } from '@/lib/utils';

const kpiData = [
  {
    label: 'LIQUIDITAT',
    value: 'EUR 0',
    subtitle: 'Kein Ziel definiert',
    icon: Wallet,
    borderColor: 'border-border-subtle',
    barColor: 'bg-text-muted',
    barPercent: 0,
    valueColor: 'text-text-primary',
  },
  {
    label: 'AKTIVE PROJEKTE',
    value: '0 / 0',
    subtitle: 'Keine Projekte',
    icon: null,
    borderColor: 'border-border-subtle',
    barColor: 'bg-text-muted',
    barPercent: 0,
    valueColor: 'text-text-primary',
  },
  {
    label: 'OFFENE FREIGABEN',
    value: '0',
    subtitle: 'Keine offenen Freigaben',
    icon: ClipboardCheck,
    borderColor: 'border-border-subtle',
    barColor: 'bg-text-muted',
    barPercent: 0,
    valueColor: 'text-text-primary',
  },
  {
    label: 'AKTIVE AGENTEN',
    value: '0 / 0',
    subtitle: 'Keine Agenten',
    icon: Bot,
    borderColor: 'border-border-subtle',
    barColor: 'bg-text-muted',
    barPercent: 0,
    valueColor: 'text-text-primary',
  },
  {
    label: 'OFFENE RISIKEN',
    value: '0',
    subtitle: 'Keine Risiken',
    icon: ShieldAlert,
    borderColor: 'border-border-subtle',
    barColor: 'bg-text-muted',
    barPercent: 0,
    valueColor: 'text-text-primary',
  },
  {
    label: 'AUTOMATISIERUNGSGRAD',
    value: '0%',
    subtitle: 'Keine Daten',
    icon: Zap,
    borderColor: 'border-border-subtle',
    barColor: 'bg-text-muted',
    barPercent: 0,
    valueColor: 'text-text-primary',
  },
];

export default function KPIBar() {
  return (
    <div className="h-[72px] bg-bg-secondary border-b border-border-subtle flex items-stretch sticky top-0 z-40">
      {kpiData.map((kpi, index) => {
        return (
          <motion.div
            key={kpi.label}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: index * 0.05, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
            className={cn(
              'flex-1 flex flex-col justify-center px-4 relative border-l-2',
              kpi.borderColor,
              index < kpiData.length - 1 && 'border-r border-border-subtle/50'
            )}
          >
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className="text-[10px] font-medium text-text-tertiary tracking-wider uppercase">
                {kpi.label}
              </span>
            </div>

            <div className="flex items-baseline gap-2">
              <span className={cn('text-base font-mono font-medium', kpi.valueColor)}>
                {kpi.value}
              </span>
            </div>

            <p className="text-[10px] mt-0.5 text-text-tertiary">
              {kpi.subtitle}
            </p>

            <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-bg-tertiary">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${kpi.barPercent}%` }}
                transition={{ duration: 0.8, delay: 0.3 + index * 0.1, ease: [0.4, 0, 0.2, 1] as [number, number, number, number] }}
                className={cn('h-full', kpi.barColor)}
              />
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
