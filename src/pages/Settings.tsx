import { Settings as SettingsIcon, Eye, Type } from 'lucide-react';
import { useAccessibility } from '../contexts/AccessibilityContext';

export function Settings() {
  const { highContrastMode, dyslexicMode, toggleHighContrast, toggleDyslexicMode } =
    useAccessibility();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Settings</h1>
        <p className="text-slate-600 mt-2">Customize your experience</p>
      </div>

      <div className="card">
        <h2 className="text-xl font-semibold text-slate-900 mb-4">Accessibility</h2>

        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Eye className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="font-medium text-slate-900">High Contrast Mode</p>
                <p className="text-sm text-slate-600">
                  Enhance visibility with black and white theme
                </p>
              </div>
            </div>
            <button
              onClick={toggleHighContrast}
              className={`relative w-14 h-8 rounded-full transition-colors ${
                highContrastMode ? 'bg-blue-600' : 'bg-slate-300'
              }`}
            >
              <span
                className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full transition-transform ${
                  highContrastMode ? 'translate-x-6' : ''
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Type className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="font-medium text-slate-900">Dyslexic Font</p>
                <p className="text-sm text-slate-600">
                  Use OpenDyslexic font for better readability
                </p>
              </div>
            </div>
            <button
              onClick={toggleDyslexicMode}
              className={`relative w-14 h-8 rounded-full transition-colors ${
                dyslexicMode ? 'bg-purple-600' : 'bg-slate-300'
              }`}
            >
              <span
                className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full transition-transform ${
                  dyslexicMode ? 'translate-x-6' : ''
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      <div className="card">
        <h2 className="text-xl font-semibold text-slate-900 mb-4">Preferences</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Email Notifications
            </label>
            <select className="input-field">
              <option>All notifications</option>
              <option>Important only</option>
              <option>None</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Default Review Type
            </label>
            <select className="input-field">
              <option>Weekly Check-in</option>
              <option>Monthly Review</option>
              <option>Project Review</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}
