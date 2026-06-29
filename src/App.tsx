import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AccessibilityProvider } from './contexts/AccessibilityContext';
import { LanguageProvider } from './contexts/LanguageContext';
import { BrandingProvider } from './contexts/BrandingContext';
import { Sidebar } from './components/Sidebar';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import ReviewsNew from './pages/ReviewsNew';
import { Pathways } from './pages/Pathways';
import { Training } from './pages/Training';
import { Copilot as MARTI } from './pages/Copilot';
import { Settings } from './pages/Settings';
import Admin from './pages/Admin';
import Strategies from './pages/Strategies';
import CompetencyFramework from './pages/CompetencyFramework';
import SkillsMatrix from './pages/SkillsMatrix';
import AICareerQuiz from './pages/AICareerQuiz';
import CareerCoach from './pages/CareerCoach';

function AppContent() {
  const { user, loading, isViewingAs, viewAsProfile, endViewAs } = useAuth();
  const [currentPath, setCurrentPath] = useState('/dashboard');
  const [viewAsBlockedVisible, setViewAsBlockedVisible] = useState(false);

  useEffect(() => {
    function handleBlocked() {
      setViewAsBlockedVisible(true);
      setTimeout(() => setViewAsBlockedVisible(false), 3500);
    }
    window.addEventListener('viewas:blocked', handleBlocked);
    return () => window.removeEventListener('viewas:blocked', handleBlocked);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  function renderPage() {
    switch (currentPath) {
      case '/dashboard':
        return <Dashboard onNavigate={setCurrentPath} />;
      case '/reviews':
        return <ReviewsNew />;
      case '/pathways':
        return <Pathways onNavigate={setCurrentPath} />;
      case '/training':
        return <Training />;
      case '/competencies':
        return <CompetencyFramework />;
      case '/skills-matrix':
        return <SkillsMatrix />;
      case '/marti':
        return <MARTI onNavigate={setCurrentPath} />;
      case '/career-quiz':
        return <AICareerQuiz onNavigate={setCurrentPath} />;
      case '/career-coach':
        return <CareerCoach onNavigate={setCurrentPath} />;
      case '/strategies':
        return <Strategies />;
      case '/admin':
        return <Admin />;
      case '/settings':
        return <Settings />;
      default:
        return <Dashboard onNavigate={setCurrentPath} />;
    }
  }

  const handleExitViewAs = async () => {
    try {
      await endViewAs();
      window.location.reload();
    } catch (error) {
      console.error('Error exiting view-as mode:', error);
      alert('Failed to exit view-as mode');
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-100">
      {isViewingAs && viewAsProfile && (
        <div className="bg-orange-600 text-white px-6 py-3 flex items-center justify-between shadow-lg z-50">
          <div className="flex items-center gap-3">
            <div className="bg-white text-orange-600 px-3 py-1 rounded font-bold text-sm">
              VIEW-AS MODE
            </div>
            <span className="font-medium">
              Viewing as: <strong>{viewAsProfile.full_name}</strong> ({viewAsProfile.email})
            </span>
            <span className="text-orange-200 text-sm">
              You cannot approve or amend data in this mode
            </span>
          </div>
          <button
            onClick={handleExitViewAs}
            className="bg-white text-orange-600 px-4 py-2 rounded font-semibold hover:bg-orange-50 transition-colors"
          >
            Exit View-As Mode
          </button>
        </div>
      )}
      {viewAsBlockedVisible && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 bg-slate-900 text-white text-sm font-medium rounded-xl shadow-2xl flex items-center gap-2 animate-fade-in">
          <span className="text-orange-400 font-bold">VIEW-AS</span>
          View As mode is read-only. No changes can be made.
        </div>
      )}
      <div className="flex flex-1">
        <Sidebar currentPath={currentPath} onNavigate={setCurrentPath} />
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto p-6 lg:p-8">{renderPage()}</div>
        </main>
      </div>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrandingProvider>
        <LanguageProvider>
          <AccessibilityProvider>
            <AppContent />
          </AccessibilityProvider>
        </LanguageProvider>
      </BrandingProvider>
    </AuthProvider>
  );
}

export default App;
