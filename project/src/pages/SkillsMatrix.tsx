import { useState } from 'react';
import { Grid3x3, BarChart2, ClipboardList, Settings } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import SkillsMatrixDashboard from '../components/skills-matrix/SkillsMatrixDashboard';
import SkillsMatrixAssessment from '../components/skills-matrix/SkillsMatrixAssessment';
import SkillsMatrixAdmin from '../components/skills-matrix/SkillsMatrixAdmin';

type Tab = 'dashboard' | 'assessment' | 'admin';

interface AssessmentTarget {
  cycleId: string;
  employeeId: string;
  assessorType: 'employee' | 'manager';
}

export default function SkillsMatrix() {
  // profile = real signed-in user; effectiveProfile = impersonated user in View As
  // viewedUserRole = role of the *viewed* user (used for tab visibility)
  // resolvedDashboardRole = real user's role (used for admin-only tabs which admins keep)
  const { profile, effectiveProfile, viewedUserRole, resolvedDashboardRole } = useAuth();

  // Manage Matrix tab: only available when the REAL user is a full admin (admin_type set).
  // Admins retain this tab even in View As mode — it operates on global config, not user data.
  const isFullAdmin = profile?.admin_type != null && profile.admin_type !== '';

  // For the Assessments tab we check the *viewed* user's role so View As correctly
  // shows/hides it based on who is being impersonated.
  const viewedProfile = effectiveProfile;
  const viewedIsExec =
    viewedUserRole === 'admin' &&
    (viewedProfile?.admin_type == null || viewedProfile?.admin_type === '');

  // Exec users (no admin_type) see only the dashboard — no personal assessments
  const showAssessmentTab = !viewedIsExec;

  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [assessmentTarget, setAssessmentTarget] = useState<AssessmentTarget | null>(null);

  const handleStartAssessment = (cycleId: string, employeeId: string, assessorType: 'employee' | 'manager') => {
    setAssessmentTarget({ cycleId, employeeId, assessorType });
    setActiveTab('assessment');
  };

  const handleAssessmentComplete = () => {
    setAssessmentTarget(null);
    setActiveTab('dashboard');
  };

  const tabs = [
    { id: 'dashboard' as Tab, label: 'Dashboard', icon: BarChart2 },
    ...(showAssessmentTab ? [{ id: 'assessment' as Tab, label: 'Assessments', icon: ClipboardList }] : []),
    ...(isFullAdmin ? [{ id: 'admin' as Tab, label: 'Manage Matrix', icon: Settings }] : []),
  ];

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-3 mb-1">
          <Grid3x3 className="w-7 h-7 text-blue-600" />
          <h1 className="text-3xl font-bold text-gray-900">Skills Matrix</h1>
        </div>
        <p className="text-gray-500 ml-10">Track competency across the organisation by Type, Category and Topic</p>
      </div>

      <div className="flex flex-wrap gap-1 border-b border-gray-200">
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                if (tab.id !== 'assessment') setAssessmentTarget(null);
              }}
              className={`flex items-center gap-2 px-5 py-3 font-medium text-sm transition-colors ${
                activeTab === tab.id
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      <div>
        {activeTab === 'dashboard' && (
          <SkillsMatrixDashboard onStartAssessment={handleStartAssessment} />
        )}

        {activeTab === 'assessment' && assessmentTarget && (
          <SkillsMatrixAssessment
            cycleId={assessmentTarget.cycleId}
            employeeId={assessmentTarget.employeeId}
            assessorType={assessmentTarget.assessorType}
            onComplete={handleAssessmentComplete}
          />
        )}

        {activeTab === 'assessment' && !assessmentTarget && (
          <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
            <ClipboardList className="w-14 h-14 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No assessment selected</h3>
            <p className="text-gray-500 mb-6">Go to your Dashboard to start or continue an assessment.</p>
            <button
              onClick={() => setActiveTab('dashboard')}
              className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
            >
              Go to Dashboard
            </button>
          </div>
        )}

        {activeTab === 'admin' && isFullAdmin && <SkillsMatrixAdmin />}
      </div>
    </div>
  );
}
