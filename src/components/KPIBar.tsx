import { motion } from 'framer-motion';
import { Bot, ClipboardCheck, ShieldAlert, Zap, Wallet, Boxes, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCompanyConfig } from '@/contexts/CompanyContext';

const eur = (n: number) =>
  new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);

export default function KPIBar() {
  const { config } = useCompanyConfig();
  const agentCount = config.agents.length;
  const buCount = config.businessUnit ? 1 : 0;
  const liquidityTarget = config.budget.liquidityTarget;

  const kpiData = [
    {
      label: 'LIQUIDITAT',
      value: eur(0),
      subtitle: liquidityTarget > 0 ? `Ziel: ${eur(liquidityTarget)}` : 'Kein Ziel definiert',
      icon: Wallet,
    },
    {
      label: 'AKTIVE PROJEKTE',
      value: `0 / ${buCount}`,
      subtitle: buCount > 0 ? `${buCount} Business Unit` : 'Keine Projekte',
      icon: Boxes,
    },
    {
      label: 'OFFENE FREIGABEN',
      value: '0',
      subtitle: 'Keine offenen Freigaben',
      icon: ClipboardCheck,
    },
    {
      label: 'AKTIVE AGENTEN',
      value: `${agentCount} / ${agentCount}`,
      subtitle: agentCount > 0 ? `${agentCount} aktiv` : 'Keine Agenten',
      icon: Bot,
    },
    {
      label: 'OFFENE RISIKEN',
      value: '0',
      subtitle: 'Keine Risiken',
      icon: ShieldAlert,
    },
    {
      label: 'AUTOMATISIERUNGSGRAD',
      value: '0%',
      subtitle: 'Keine Daten',
      icon: Zap,
    },
  ];

  return (
    <div className="h-[72px] bg-bg-secondary border-b border-border-subtle flex items-stretch sticky top-0 z-40">
      {kpiData.map((kpi, index) => {
        const Icon = kpi.icon || Activity;
        return (
          <motion.div
            key={kpi.label}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: index * 0.05, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
            className={cn(
              'flex-1 flex flex-col justify-center px-4 relative border-l-2 border-border-subtle',
              index < kpiData.length - 1 && 'border-r border-border-subtle/50',
            )}
          >
            <div className="flex items-center gap-1.5 mb-0.5">
              <Icon className="w-3 h-3 text-text-tertiary flex-shrink-0" />
              <span className="text-[10px] font-medium text-text-tertiary tracking-wider uppercase truncate">
                {kpi.label}
              </span>
            </div>

            <div className="flex items-baseline gap-2">
              <span className="text-base font-mono-data font-medium text-text-primary truncate">
                {kpi.value}
              </span>
            </div>

            <p className="text-[10px] mt-0.5 text-text-tertiary truncate">
              {kpi.subtitle}
            </p>

            <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-bg-tertiary">
              <div className="h-full w-0 bg-text-muted" />
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
