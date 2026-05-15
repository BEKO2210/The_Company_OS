/**
 * NotificationBadge
 * Zeigt Badge-Zaehler auf Icons an (z.B. fuer Freigaben).
 */

import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface NotificationBadgeProps {
  count: number;
  maxCount?: number;
  size?: 'sm' | 'md' | 'lg';
  pulse?: boolean;
  className?: string;
}

export default function NotificationBadge({
  count,
  maxCount = 99,
  size = 'md',
  pulse = false,
  className,
}: NotificationBadgeProps) {
  if (count <= 0) return null;

  const displayCount = count > maxCount ? `${maxCount}+` : String(count);

  const sizeClasses = {
    sm: 'min-w-[16px] h-4 text-[10px] px-1',
    md: 'min-w-[20px] h-5 text-[11px] px-1.5',
    lg: 'min-w-[24px] h-6 text-xs px-2',
  };

  return (
    <AnimatePresence>
      <motion.span
        key={count}
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0 }}
        transition={{ type: 'spring', stiffness: 500, damping: 25 }}
        className={cn(
          'absolute -top-1.5 -right-1.5',
          'inline-flex items-center justify-center',
          'rounded-full bg-status-red text-white font-bold',
          sizeClasses[size],
          pulse && 'animate-pulse',
          className
        )}
      >
        {displayCount}
      </motion.span>
    </AnimatePresence>
  );
}

/**
 * Dot-Variante fuer Status-Indikatoren.
 */
export function StatusDot({
  status,
  size = 'md',
  className,
}: {
  status: 'active' | 'warning' | 'error' | 'neutral';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const colorClasses = {
    active: 'bg-status-green',
    warning: 'bg-status-yellow',
    error: 'bg-status-red',
    neutral: 'bg-text-tertiary',
  };

  const sizeClasses = {
    sm: 'w-1.5 h-1.5',
    md: 'w-2 h-2',
    lg: 'w-2.5 h-2.5',
  };

  return (
    <span
      className={cn(
        'rounded-full inline-block',
        colorClasses[status],
        sizeClasses[size],
        status === 'active' && 'animate-pulse',
        className
      )}
    />
  );
}
