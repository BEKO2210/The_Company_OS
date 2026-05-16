import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Building2,
  Bot,
  Boxes,
  Cpu,
  ClipboardCheck,
  ScrollText,
  ShieldAlert,
  Wallet,
  Users,
  GitBranch,
  Settings,
  Power,
  ChevronLeft,
  ChevronRight,
  Hexagon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { AIQueryPanel } from '@/components/ai';
import { useCompanyConfig } from '@/contexts/CompanyContext';
import { founderInitials } from '@/lib/companyAdapter';

const navItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/departments', label: 'Departments', icon: Building2 },
  { path: '/agents', label: 'Agent Registry', icon: Bot },
  { path: '/business-units', label: 'Business Units', icon: Boxes },
  { path: '/studios', label: 'Product Studios', icon: Cpu },
  { path: '/approvals', label: 'Approval Queue', icon: ClipboardCheck },
  { path: '/audit-log', label: 'Audit Log', icon: ScrollText },
  { path: '/risk-center', label: 'Risk Center', icon: ShieldAlert },
  { path: '/finance', label: 'Finance', icon: Wallet },
  { path: '/workforce', label: 'Human Workforce', icon: Users },
  { path: '/workflows', label: 'Workflows', icon: GitBranch },
  { path: '/settings', label: 'Settings', icon: Settings },
  { path: '/kill-switch', label: 'Kill Switch', icon: Power, danger: true },
];

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export default function Sidebar({ collapsed, onToggleCollapse }: SidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { config } = useCompanyConfig();
  const founderName = config.founderName || 'Founder';
  const founderRole = config.founderRole || 'CEO';
  const initials = founderInitials(config.founderName);

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 64 : 240 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
      className="fixed left-0 top-0 h-screen bg-bg-primary border-r border-border-subtle z-50 flex flex-col"
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 h-[72px] border-b border-border-subtle flex-shrink-0">
        <div className="w-8 h-8 rounded-lg bg-accent-teal/15 flex items-center justify-center flex-shrink-0">
          <Hexagon className="w-5 h-5 text-accent-teal" strokeWidth={2} />
        </div>
        <AnimatePresence>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <h1 className="text-sm font-semibold text-text-primary tracking-tight whitespace-nowrap">
                The Company OS
              </h1>
              <p className="text-[10px] font-medium text-accent-teal tracking-widest uppercase whitespace-nowrap">
                AI-NATIVE
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* AI Query Panel */}
      {!collapsed && (
        <div className="px-3 pt-3 pb-2">
          <AIQueryPanel
            onNavigate={(path) => navigate(path)}
          />
        </div>
      )}

      {/* Nav Items */}
      <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto overflow-x-hidden">
        {navItems.map((item, index) => {
          const Icon = item.icon;
          const active = isActive(item.path);
          const isDanger = item.danger;

          return (
            <motion.button
              key={item.path}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: index * 0.03, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
              onClick={() => navigate(item.path)}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-button text-sm font-medium transition-all duration-200 group relative',
                isDanger
                  ? 'text-status-red hover:bg-status-red/10'
                  : active
                    ? 'bg-accent-teal/10 text-accent-teal'
                    : 'text-text-secondary hover:bg-bg-tertiary hover:text-text-primary',
                collapsed && 'justify-center px-2'
              )}
            >
              {/* Active indicator */}
              {active && !isDanger && (
                <motion.div
                  layoutId="activeNav"
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 bg-accent-teal rounded-r-full"
                  transition={{ duration: 0.2 }}
                />
              )}

              <Icon
                className={cn(
                  'w-[18px] h-[18px] flex-shrink-0',
                  isDanger && 'text-status-red',
                  active && !isDanger && 'text-accent-teal'
                )}
                strokeWidth={active ? 2 : 1.5}
              />

              <AnimatePresence>
                {!collapsed && (
                  <motion.span
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: 'auto' }}
                    exit={{ opacity: 0, width: 0 }}
                    transition={{ duration: 0.2 }}
                    className="whitespace-nowrap overflow-hidden text-left"
                  >
                    {item.label}
                  </motion.span>
                )}
              </AnimatePresence>

              {/* Tooltip for collapsed */}
              {collapsed && (
                <div className="absolute left-full ml-2 px-2 py-1 bg-bg-elevated border border-border-default rounded-md text-xs text-text-primary whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 shadow-card">
                  {item.label}
                </div>
              )}
            </motion.button>
          );
        })}
      </nav>

      {/* Bottom: Collapse + Founder */}
      <div className="border-t border-border-subtle px-3 py-3 space-y-2 flex-shrink-0">
        {/* Collapse Toggle */}
        <button
          onClick={onToggleCollapse}
          className={cn(
            'w-full flex items-center gap-3 px-3 py-2 rounded-button text-xs text-text-tertiary hover:text-text-primary hover:bg-bg-tertiary transition-colors',
            collapsed && 'justify-center px-2'
          )}
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <>
              <ChevronLeft className="w-4 h-4" />
              <span>Einklappen</span>
            </>
          )}
        </button>

        {/* Founder Avatar */}
        <div
          className={cn(
            'flex items-center gap-3 px-3 py-2',
            collapsed && 'justify-center px-0'
          )}
        >
          <div className="w-7 h-7 rounded-full bg-accent-teal/15 border border-accent-teal/40 flex items-center justify-center flex-shrink-0">
            <span className="text-[10px] font-semibold text-accent-teal">{initials}</span>
          </div>
          <AnimatePresence>
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <p className="text-xs font-medium text-text-primary truncate">{founderName}</p>
                <p className="text-[10px] text-text-tertiary truncate">{founderRole}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.aside>
  );
}
