import { motion } from 'framer-motion';
import { TrendingUp, Bot, ClipboardCheck, ShieldAlert, Zap, Wallet } from 'lucide-react';
import { cn } from '@/lib/utils';

const kpiData = [
  {
    label: 'LIQUIDITAT',
    value: 'EUR 12.450',
    trend: '+3,2%',
    trendUp: true,
    subtitle: 'von EUR 20k Ziel',
    icon: Wallet,
    borderColor: 'border-status-green',
    barColor: 'bg-status-green',
    barPercent: 62,
    valueColor: 'text-text-primary',
  },
  {
    label: 'AKTIVE PROJEKTE',
    value: '5 / 12',
    subtitle: '3 in QA, 2 in Entwicklung',
    icon: null,
    borderColor: 'border-status-yellow',
    barColor: 'bg-status-yellow',
    barPercent: 42,
    valueColor: 'text-text-primary',
  },
  {
    label: 'OFFENE FREIGABEN',
    value: '7',
    subtitle: '2 kritisch, 3 hoch, 2 normal',
    icon: ClipboardCheck,
    borderColor: 'border-status-red',
    barColor: 'bg-status-red',
    barPercent: 70,
    valueColor: 'text-status-red',
    pulse: true,
  },
  {
    label: 'AKTIVE AGENTEN',
    value: '18 / 22',
    subtitle: '4 im Standby',
    icon: Bot,
    borderColor: 'border-accent-teal',
    barColor: 'bg-accent-teal',
    barPercent: 82,
    valueColor: 'text-text-primary',
  },
  {
    label: 'OFFENE RISIKEN',
    value: '12',
    subtitle: '2 kritisch',
    icon: ShieldAlert,
    borderColor: 'border-status-orange',
    barColor: 'bg-status-orange',
    barPercent: 38,
    valueColor: 'text-status-orange',
  },
  {
    label: 'AUTOMATISIERUNGSGRAD',
    value: '73%',
    subtitle: '+5% vs. letzte Woche',
    subtitleColor: 'text-status-green',
    icon: Zap,
    borderColor: 'border-accent-teal',
    barColor: 'bg-accent-teal',
    barPercent: 73,
    valueColor: 'text-accent-teal',
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
            {/* Label */}
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className="text-[10px] font-medium text-text-tertiary tracking-wider uppercase">
                {kpi.label}
              </span>
              {kpi.pulse && (
                <span className="w-2 h-2 rounded-full bg-status-red animate-pulse-red" />
              )}
            </div>

            {/* Value */}
            <div className="flex items-baseline gap-2">
              <span className={cn('text-base font-mono font-medium', kpi.valueColor)}>
                {kpi.value}
              </span>
              {kpi.trend && (
                <span className={cn(
                  'text-[10px] font-medium flex items-center gap-0.5',
                  kpi.trendUp ? 'text-status-green' : 'text-status-red'
                )}>
                  <TrendingUp className="w-3 h-3" />
                  {kpi.trend}
                </span>
              )}
            </div>

            {/* Subtitle */}
            <p className={cn(
              'text-[10px] mt-0.5',
              kpi.subtitleColor || 'text-text-tertiary'
            )}>
              {kpi.subtitle}
            </p>

            {/* Mini bar */}
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
