import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import KPIBar from './KPIBar';
import MobileNav from './mobile/MobileNav';
import { MobileTopBar } from './mobile/MobileNav';
import { useIsMobile } from '@/hooks/use-mobile';
import { approvals, risks } from '@/data/mockData';

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const isMobile = useIsMobile();
  const location = useLocation();

  // Get counts for mobile nav badges
  const pendingApprovalsCount = approvals?.filter((a) => a.status === 'pending').length || 0;
  const activeRisksCount = risks?.filter((r) => r.status === 'active').length || 0;

  // Get page title based on route
  const getPageTitle = () => {
    const titles: Record<string, string> = {
      '/': 'Dashboard',
      '/departments': 'Departments',
      '/agents': 'Agent Registry',
      '/business-units': 'Business Units',
      '/studios': 'Product Studios',
      '/approvals': 'Approval Queue',
      '/audit-log': 'Audit Log',
      '/risk-center': 'Risk Center',
      '/finance': 'Finance',
      '/workforce': 'Human Workforce',
      '/workflows': 'Workflows',
      '/settings': 'Settings',
      '/kill-switch': 'Kill Switch',
    };
    return titles[location.pathname] || 'The Company OS';
  };

  return (
    <div className="min-h-[100dvh] bg-bg-primary">
      {/* Desktop Sidebar - hidden on mobile */}
      <div className="hidden md:block">
        <Sidebar
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        />
      </div>

      {/* Mobile Top Bar */}
      {isMobile && <MobileTopBar title={getPageTitle()} />}

      {/* Main Content Area */}
      <div
        className="transition-all duration-300"
        style={{
          marginLeft: isMobile ? 0 : sidebarCollapsed ? 64 : 240,
        }}
      >
        {/* KPI Bar - hidden on mobile */}
        <div className="hidden md:block">
          <KPIBar />
        </div>

        {/* Page Content */}
        <main className={isMobile ? 'p-4 pt-2 pb-24' : 'p-6'}>
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <MobileNav
        pendingApprovals={pendingApprovalsCount}
        activeRisks={activeRisksCount}
        agentAlerts={0}
      />
    </div>
  );
}
