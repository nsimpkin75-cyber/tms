import { useState } from 'react';
import { Settings as SettingsIcon, Eye, Type, Lock, Shield, User } from 'lucide-react';
import { useAccessibility } from '../contexts/AccessibilityContext';
import { useAuth } from '../contexts/AuthContext';
import { ChangePassword } from '../components/account/ChangePassword';
import { SecurityAuditLog } from '../components/account/SecurityAuditLog';

type Tab = 'account' | 'security' | 'accessibility';

export function Settings() {
  const { highContrastMode, dyslexicMode, toggleHighContrast, toggleDyslexicMode } = useAccessibility();
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('account');

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'account', label: 'Account', icon: <User className="w-4 h-4" /> },
    { id: 'security', label: 'Security', icon: <Shield className="w-4 h-4" /> },
    { id: 'accessibility', label: 'Accessibility', icon: <Eye className="w-4 h-4" /> },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Account Centre</h1>
        <p className="text-slate-600 mt-2">Manage your account, password, and preferences</p>
      </div>

      {/* Tab navigation */}
      <div className="border-b border-slate-200">
        <div className="flex gap-0">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-slate-900 text-slate-900'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Account tab */}
      {activeTab === 'account' && (
        <div className="space-y-6">
          {/* Profile summary */}
          <div className="card">
            <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <User className="w-5 h-5 text-slate-500" />
              Profile
            </h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-slate-500">Full Name</p>
                <p className="font-medium text-slate-900 mt-0.5">{profile?.full_name || '—'}</p>
              </div>
              <div>
                <p className="text-slate-500">Email</p>
                <p className="font-medium text-slate-900 mt-0.5">{profile?.email || '—'}</p>
              </div>
              <div>
                <p className="text-slate-500">Department</p>
                <p className="font-medium text-slate-900 mt-0.5">{profile?.department || '—'}</p>
              </div>
              <div>
                <p className="text-slate-500">Role</p>
                <p className="font-medium text-slate-900 mt-0.5 capitalize">{profile?.role || '—'}</p>
              </div>
            </div>
          </div>

          {/* Change password */}
          <div className="card">
            <h2 className="text-lg font-semibold text-slate-900 mb-1 flex items-center gap-2">
              <Lock className="w-5 h-5 text-slate-500" />
              Change Password
            </h2>
            <p className="text-sm text-slate-500 mb-5">Choose a strong password you haven't used before.</p>
            <ChangePassword />
          </div>
        </div>
      )}

      {/* Security tab */}
      {activeTab === 'security' && (
        <div className="card">
          <SecurityAuditLog />
        </div>
      )}

      {/* Accessibility tab */}
      {activeTab === 'accessibility' && (
        <div className="space-y-6">
          <div className="card">
            <h2 className="text-xl font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <SettingsIcon className="w-5 h-5 text-slate-500" />
              Accessibility
            </h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Eye className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">High Contrast Mode</p>
                    <p className="text-sm text-slate-600">Enhance visibility with black and white theme</p>
                  </div>
                </div>
                <button
                  onClick={toggleHighContrast}
                  className={`relative w-14 h-8 rounded-full transition-colors ${highContrastMode ? 'bg-blue-600' : 'bg-slate-300'}`}
                >
                  <span className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full transition-transform ${highContrastMode ? 'translate-x-6' : ''}`} />
                </button>
              </div>
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Type className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">Dyslexic Font</p>
                    <p className="text-sm text-slate-600">Use OpenDyslexic font for better readability</p>
                  </div>
                </div>
                <button
                  onClick={toggleDyslexicMode}
                  className={`relative w-14 h-8 rounded-full transition-colors ${dyslexicMode ? 'bg-blue-600' : 'bg-slate-300'}`}
                >
                  <span className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full transition-transform ${dyslexicMode ? 'translate-x-6' : ''}`} />
                </button>
              </div>
            </div>
          </div>

          <div className="card">
            <h2 className="text-xl font-semibold text-slate-900 mb-4">Preferences</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Email Notifications</label>
                <select className="input-field">
                  <option>All notifications</option>
                  <option>Important only</option>
                  <option>None</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Default Review Type</label>
                <select className="input-field">
                  <option>Weekly Check-in</option>
                  <option>Monthly Review</option>
                  <option>Project Review</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
