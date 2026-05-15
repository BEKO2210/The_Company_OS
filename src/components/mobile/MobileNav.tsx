/**
 * MobileNav
 * Bottom-Tab-Navigation fuer Mobile Geraete.
 * Ersetzt die Sidebar auf kleinen Bildschirmen.
 */

import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  ClipboardCheck,
  Bot,
  ShieldAlert,
  MoreHorizontal,
} from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import NotificationBadge from './NotificationBadge';

interface NavItem {
  path: string;
  label: string;
  icon: React.ElementType;
  badge?: number;
}

interface MobileNavProps {
  pendingApprovals?: number;
  activeRisks?: number;
  agentAlerts?: number;
}

const navItems: NavItem[] = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/approvals', label: 'Freigaben', icon: ClipboardCheck },
  { path: '/agents', label: 'Agenten', icon: Bot },
  { path: '/risk-center', label: 'Risiken', icon: ShieldAlert },
  { path: '/more', label: 'Mehr', icon: MoreHorizontal },
];

export default function MobileNav({
  pendingApprovals = 0,
  activeRisks = 0,
  agentAlerts = 0,
}: MobileNavProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  if (!isMobile) return null;

  const getBadge = (path: string): number => {
    switch (path) {
      case '/approvals':
        return pendingApprovals;
      case '/risk-center':
        return activeRisks;
      case '/agents':
        return agentAlerts;
      default:
        return 0;
    }
  };

  const isActive = (path: string) => {
    if (path === '/more') return false;
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const isMoreActive = !navItems
    .filter((i) => i.path !== '/more')
    .some((i) => isActive(i.path));

  return (
    <motion.nav
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className={cn(
        'fixed bottom-0 left-0 right-0 z-50',
        'bg-[#13131A]/95 backdrop-blur-xl',
        'border-t border-border-default',
        'safe-area-pb',
        'md:hidden'
      )}
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = item.path === '/more' ? isMoreActive : isActive(item.path);
          const badge = getBadge(item.path);

          return (
            <motion.button
              key={item.path}
              whileTap={{ scale: 0.9 }}
              onClick={() => {
                if (item.path === '/more') {
                  navigate('/settings');
                } else {
                  navigate(item.path);
                }
              }}
              className={cn(
                'relative flex flex-col items-center justify-center',
                'w-16 h-14 rounded-xl transition-colors duration-200',
                active
                  ? 'text-accent-teal'
                  : 'text-text-tertiary hover:text-text-secondary'
              )}
            >
              {/* Active indicator bar */}
              {active && (
                <motion.div
                  layoutId="mobileNavIndicator"
                  className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-8 h-[3px] bg-accent-teal rounded-b-full"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}

              {/* Icon with badge */}
              <div className="relative">
                <Icon
                  className={cn(
                    'w-5 h-5 transition-colors',
                    active ? 'text-accent-teal' : 'text-current'
                  )}
                  strokeWidth={active ? 2.5 : 1.5}
                />
                <NotificationBadge count={badge} size="sm" pulse={badge > 5} />
              </div>

              {/* Label */}
              <span
                className={cn(
                  'text-[10px] mt-0.5 font-medium transition-colors',
                  active ? 'text-accent-teal' : 'text-current'
                )}
              >
                {item.label}
              </span>
            </motion.button>
          );
        })}
      </div>
    </motion.nav>
  );
}

/**
 * MobileTopBar
 * Kompakte Top-Leiste fuer Mobile mit App-Name und Benachrichtigungen.
 */
export function MobileTopBar({
  title,
  subtitle,
  onBack,
}: {
  title: string;
  subtitle?: string;
  onBack?: () => void;
}) {
  return (
    <div className="md:hidden sticky top-0 z-40 bg-[#13131A]/95 backdrop-blur-xl border-b border-border-default">
      <div className="flex items-center gap-3 h-14 px-4">
        {onBack && (
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={onBack}
            className="p-1 -ml-1 text-text-secondary hover:text-text-primary"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </motion.button>
        )}
        <div className="flex-1 min-w-0">
          <h1 className="text-sm font-semibold text-text-primary truncate">{title}</h1>
          {subtitle && (
            <p className="text-[11px] text-text-tertiary truncate">{subtitle}</p>
          )}
        </div>
      </div>
    </div>
  );
}
