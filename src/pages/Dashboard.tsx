import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { EmployeeDashboard } from '../components/dashboard/EmployeeDashboard';
import { ManagerDashboard } from '../components/dashboard/ManagerDashboard';
import { LeadershipDashboard } from '../components/dashboard/LeadershipDashboard';
import { User, Users, Building2, BarChart3 } from 'lucide-react';

interface DashboardProps {
  onNavigate?: (path: string) => void;
}

type DashTab = 'employee' | 'manager' | 'dept_lead' | 'admin';

function getAvailableTabs(
  role: 'employee' | 'manager' | 'dept_lead' | 'admin',
  hasDirectReports: boolean,
): DashTab[] {
  switch (role) {
    case 'admin':
      return hasDirectReports
        ? ['admin', 'dept_lead', 'manager', 'employee']
        : ['admin', 'dept_lead', 'employee'];
    case 'dept_lead':
      return hasDirectReports ? ['dept_lead', 'manager', 'employee'] : ['dept_lead', 'employee'];
    case 'manager':
      return ['manager', 'employee'];
    default:
      return ['employee'];
  }
}

const TAB_META: Record<DashTab, { label: string; icon: React.ReactNode }> = {
  employee: { label: 'My Dashboard', icon: <User className="w-4 h-4" /> },
  manager: { label: 'My Team', icon: <Users className="w-4 h-4" /> },
  dept_lead: { label: 'Department', icon: <Building2 className="w-4 h-4" /> },
  admin: { label: 'Executive', icon: <BarChart3 className="w-4 h-4" /> },
};

export function Dashboard({ onNavigate }: DashboardProps = {}) {
  const { effectiveProfile, resolvedDashboardRole, viewedUserRole, isViewingAs } = useAuth();
  const [hasDirectReports, setHasDirectReports] = useState(false);
  const [checked, setChecked] = useState(false);
  const [activeTab, setActiveTab] = useState<DashTab | null>(null);

  // In View As mode show the viewed user's tabs; otherwise show the real user's tabs.
  const tabRole = isViewingAs ? viewedUserRole : resolvedDashboardRole;
  const needsReportCheck = tabRole !== 'employee';

  useEffect(() => {
    if (!needsReportCheck || !effectiveProfile?.id) {
      setChecked(true);
      return;
    }
    supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('manager_id', effectiveProfile.id)
      .eq('active', true)
      .then(({ count }) => {
        setHasDirectReports((count ?? 0) > 0);
        setChecked(true);
      });
  }, [effectiveProfile?.id, needsReportCheck]);

  // Set default tab once role + report check are resolved
  useEffect(() => {
    if (!checked) return;
    const tabs = getAvailableTabs(tabRole, hasDirectReports);
    setActiveTab(prev => (prev && tabs.includes(prev) ? prev : tabs[0]));
  }, [checked, tabRole, hasDirectReports]);

  if (!effectiveProfile || !checked || activeTab === null) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: 'var(--brand-primary)' }} />
      </div>
    );
  }

  const tabs = getAvailableTabs(tabRole, hasDirectReports);

  // Single-tab users get no tab bar
  if (tabs.length === 1) {
    return <EmployeeDashboard onNavigate={onNavigate} />;
  }

  return (
    <div>
      <div className="mb-6 overflow-x-auto -mx-4 px-4 lg:mx-0 lg:px-0">
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit min-w-max">
          {tabs.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                activeTab === tab
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-white/60'
              }`}
            >
              {TAB_META[tab].icon}
              {TAB_META[tab].label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'employee' && <EmployeeDashboard onNavigate={onNavigate} />}
      {activeTab === 'manager' && <ManagerDashboard onNavigate={onNavigate} />}
      {(activeTab === 'dept_lead' || activeTab === 'admin') && (
        <LeadershipDashboard onNavigate={onNavigate} />
      )}
    </div>
  );
}
