import { useState } from 'react';
import { Calendar, ShieldCheck } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Training } from './Training';
import ComplianceHub from '../components/compliance/ComplianceHub';

type Tab = 'training' | 'compliance';

export default function TrainingCompetencePage() {
  const { effectiveProfile, profile } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('training');

  const isManager = effectiveProfile?.role === 'manager' || effectiveProfile?.role === 'dept_lead';
  const isLeadership = effectiveProfile?.role === 'leadership' || effectiveProfile?.role === 'senior';
  const isAdmin = profile?.role === 'admin' || profile?.admin_type != null;

  const tabs: { id: Tab; label: string; icon: any }[] = [
    { id: 'training', label: 'Training', icon: Calendar },
    { id: 'compliance', label: 'My Compliance & Skills', icon: ShieldCheck },
  ];

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-3 mb-1">
          <ShieldCheck className="w-7 h-7 text-blue-600" />
          <h1 className="text-3xl font-bold text-gray-900">Training & Competence</h1>
        </div>
        <p className="text-gray-500 ml-10">Manage your training, compliance certifications, and competency tracking</p>
      </div>

      <div className="flex flex-wrap gap-1 border-b border-gray-200">
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-3 font-medium text-sm transition-colors ${
                activeTab === tab.id ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      <div>
        {activeTab === 'training' && <Training />}
        {activeTab === 'compliance' && <ComplianceHub embedded />}
      </div>
    </div>
  );
}
