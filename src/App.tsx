import { HashRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import SetupWizard from './components/wizard/SetupWizard';
import { useFirstRun } from './hooks/useFirstRun';
import Home from './pages/Home';
import DepartmentsPage from './pages/DepartmentsPage';
import AgentRegistryPage from './pages/AgentRegistryPage';
import BusinessUnitsPage from './pages/BusinessUnitsPage';
import ProductStudiosPage from './pages/ProductStudiosPage';
import ApprovalQueuePage from './pages/ApprovalQueuePage';
import AuditLogPage from './pages/AuditLogPage';
import RiskCenterPage from './pages/RiskCenterPage';
import FinancePage from './pages/FinancePage';
import HumanWorkforcePage from './pages/HumanWorkforcePage';
import WorkflowsPage from './pages/WorkflowsPage';
import SettingsPage from './pages/SettingsPage';
import KillSwitchPage from './pages/KillSwitchPage';

export default function App() {
  const { needsSetup, completeSetup } = useFirstRun();
  return (
    <HashRouter>
      {needsSetup && <SetupWizard onComplete={completeSetup} />}
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/departments" element={<DepartmentsPage />} />
          <Route path="/agents" element={<AgentRegistryPage />} />
          <Route path="/business-units" element={<BusinessUnitsPage />} />
          <Route path="/studios" element={<ProductStudiosPage />} />
          <Route path="/approvals" element={<ApprovalQueuePage />} />
          <Route path="/audit-log" element={<AuditLogPage />} />
          <Route path="/risk-center" element={<RiskCenterPage />} />
          <Route path="/finance" element={<FinancePage />} />
          <Route path="/workforce" element={<HumanWorkforcePage />} />
          <Route path="/workflows" element={<WorkflowsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/kill-switch" element={<KillSwitchPage />} />
        </Routes>
      </Layout>
    </HashRouter>
  );
}
