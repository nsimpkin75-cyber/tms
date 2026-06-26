import React, { useState } from 'react';
import { Users, GraduationCap, Award, Briefcase, FileText, History, Target, CheckCircle, Map, Bot, ClipboardList, Globe, Grid3x3, Menu, X, Building2, ShieldCheck, RefreshCw, BarChart2, DatabaseBackup, Gavel, MessageSquare, PenLine } from 'lucide-react';
import UserManagement from '../components/admin/UserManagement';
import TrainingManagement from '../components/admin/TrainingManagement';
import CareerPlansManagement from '../components/admin/CareerPlansManagement';
import JobFamiliesManagement from '../components/admin/JobFamiliesManagement';
import ReportsExport from '../components/admin/ReportsExport';
import JobHistoryReport from '../components/admin/JobHistoryReport';
import { ProgressionCriteriaManagement } from '../components/admin/ProgressionCriteriaManagement';
import StrategicRoadmapManagement from '../components/admin/StrategicRoadmapManagement';
import CopilotConfigManagement from '../components/admin/CopilotConfigManagement';
import ReviewTemplateManagement from '../components/admin/ReviewTemplateManagement';
import CompetencyFrameworkManagement from '../components/admin/CompetencyFrameworkManagement';
import LanguageSettings from '../components/admin/LanguageSettings';
import OrganizationSettings from '../components/admin/OrganizationSettings';
import ModerationWorkflowBuilder from '../components/admin/ModerationWorkflowBuilder';
import ExecModeratorManagement from '../components/admin/ExecModeratorManagement';
import ReviewCyclesManagement from '../components/admin/ReviewCyclesManagement';
import ReviewStatusReport from '../components/admin/ReviewStatusReport';
import BackfillOneToOne from '../components/admin/BackfillOneToOne';
import SeraCareerFeedback from '../components/admin/SeraCareerFeedback';
import RoleProfileRecommendations from '../components/admin/RoleProfileRecommendations';
import SkillsMatrixAdmin from '../components/skills-matrix/SkillsMatrixAdmin';

type TabType = 'users' | 'org-settings' | 'training' | 'plans' | 'jobs' | 'reports' | 'history' | 'criteria' | 'roadmap' | 'marti' | 'review-templates' | 'competencies' | 'language' | 'sm-admin' | 'moderation-workflow' | 'exec-moderators' | 'review-cycles' | 'review-report' | 'backfill-oto' | 'sera-career-feedback' | 'role-recommendations';

interface NavSection {
  title: string;
  items: Array<{
    id: TabType;
    label: string;
    icon: any;
  }>;
}

export default function Admin() {
  const [activeTab, setActiveTab] = useState<TabType>(() => {
    const pending = sessionStorage.getItem('adminPendingTab') as TabType | null;
    if (pending) {
      sessionStorage.removeItem('adminPendingTab');
      return pending;
    }
    return 'users';
  });
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navSections: NavSection[] = [
    {
      title: 'Organization',
      items: [
        { id: 'users' as TabType, label: 'Users', icon: Users },
        { id: 'org-settings' as TabType, label: 'Organization Settings', icon: Building2 },
      ],
    },
    {
      title: 'Career & Development',
      items: [
        { id: 'jobs' as TabType, label: 'Pathways', icon: Briefcase },
        { id: 'role-recommendations' as TabType, label: 'Role Profile Edit Recommendations', icon: PenLine },
        { id: 'plans' as TabType, label: 'Career Plans', icon: Target },
        { id: 'criteria' as TabType, label: 'Progression Criteria', icon: CheckCircle },
        { id: 'competencies' as TabType, label: 'Competencies', icon: Award },
        { id: 'sm-admin' as TabType, label: 'Skills Matrix Builder', icon: Grid3x3 },
      ],
    },
    {
      title: 'Training & Reviews',
      items: [
        { id: 'training' as TabType, label: 'Training', icon: GraduationCap },
        { id: 'review-cycles' as TabType, label: 'Review Templates', icon: RefreshCw },
        { id: 'review-report' as TabType, label: 'Review Status Report', icon: BarChart2 },
        { id: 'backfill-oto' as TabType, label: 'Backfill One-to-Ones', icon: DatabaseBackup },
      ],
    },
    {
      title: 'Strategy & Planning',
      items: [
        { id: 'roadmap' as TabType, label: 'Business Strategy', icon: Map },
      ],
    },
    {
      title: 'System',
      items: [
        { id: 'marti' as TabType, label: 'SERA Configuration', icon: Bot },
        { id: 'sera-career-feedback' as TabType, label: 'SERA Career Feedback', icon: MessageSquare },
        { id: 'moderation-workflow' as TabType, label: 'Moderation Workflows', icon: ShieldCheck },
        { id: 'exec-moderators' as TabType, label: 'Exec Moderator Access', icon: Gavel },
        { id: 'language' as TabType, label: 'Language', icon: Globe },
        { id: 'history' as TabType, label: 'Job History', icon: History },
        { id: 'reports' as TabType, label: 'Reports & Export', icon: FileText },
      ],
    },
  ];

  const handleTabChange = (tabId: TabType) => {
    setActiveTab(tabId);
    setSidebarOpen(false);
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 overflow-y-auto
        transform transition-transform duration-200 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="p-4 sm:p-6 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-gray-900">Admin Panel</h1>
            <p className="text-xs sm:text-sm text-gray-600 mt-1">System Management</p>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="p-2 text-gray-400 hover:text-gray-600 lg:hidden"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="p-4">
          {navSections.map((section) => (
            <div key={section.title} className="mb-6">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-3">
                {section.title}
              </h3>
              <div className="space-y-1">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleTabChange(item.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        activeTab === item.id
                          ? 'bg-blue-50 text-blue-700'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <Icon className="w-5 h-5 flex-shrink-0" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </aside>

      <main className="flex-1 overflow-y-auto">
        <div className="lg:hidden p-4 border-b border-gray-200 bg-white sticky top-0 z-30">
          <button
            onClick={() => setSidebarOpen(true)}
            className="flex items-center gap-2 text-gray-700 font-medium"
          >
            <Menu className="w-5 h-5" />
            <span>Menu</span>
          </button>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
          {activeTab === 'users' && <UserManagement />}
          {activeTab === 'org-settings' && <OrganizationSettings />}
          {activeTab === 'training' && <TrainingManagement />}
          {activeTab === 'plans' && <CareerPlansManagement />}
          {activeTab === 'criteria' && <ProgressionCriteriaManagement />}
          {activeTab === 'competencies' && <CompetencyFrameworkManagement />}
          {activeTab === 'roadmap' && <StrategicRoadmapManagement />}
          {activeTab === 'marti' && <CopilotConfigManagement />}
          {activeTab === 'language' && <LanguageSettings />}
          {activeTab === 'jobs' && <JobFamiliesManagement />}
          {activeTab === 'history' && <JobHistoryReport />}
          {activeTab === 'reports' && <ReportsExport />}
          {activeTab === 'review-templates' && <ReviewTemplateManagement />}
          {activeTab === 'moderation-workflow' && <ModerationWorkflowBuilder />}
          {activeTab === 'exec-moderators' && <ExecModeratorManagement />}
          {activeTab === 'sera-career-feedback' && <SeraCareerFeedback />}
          {activeTab === 'review-cycles' && <ReviewCyclesManagement />}
          {activeTab === 'review-report' && <ReviewStatusReport />}
          {activeTab === 'backfill-oto' && <BackfillOneToOne />}
          {activeTab === 'role-recommendations' && <RoleProfileRecommendations />}
          {activeTab === 'sm-admin' && <SkillsMatrixAdmin />}
        </div>
      </main>
    </div>
  );
}
