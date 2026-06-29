import { useState } from 'react';
import {
  LayoutDashboard,
  FileText,
  TrendingUp,
  Calendar,
  Settings,
  LogOut,
  Menu,
  X,
  MessageSquare,
  Shield,
  Map,
  Award,
  Users,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface SidebarProps {
  currentPath: string;
  onNavigate: (path: string) => void;
}

export function Sidebar({ currentPath, onNavigate }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { profile, effectiveProfile, isViewingAs, signOut } = useAuth();

  const navItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
    { icon: FileText, label: 'Reviews', path: '/reviews' },
    { icon: TrendingUp, label: 'Career Pathways', path: '/pathways' },
    { icon: Award, label: 'Competencies', path: '/competencies' },
    { icon: Users, label: 'Skills Matrix', path: '/skills-matrix' },
    { icon: Calendar, label: 'Training', path: '/training' },
    { icon: MessageSquare, label: 'Opal', path: '/marti' },
  ];

  const roadmapNavItem = { icon: Map, label: 'Strategies', path: '/strategies' };
  const adminNavItem = { icon: Shield, label: 'Admin', path: '/admin' };

  const displayProfile = effectiveProfile || profile;
  // In View As mode, nav items reflect the viewed user's permissions.
  // Outside of View As mode, use the real admin's profile.
  const navProfile = isViewingAs ? (effectiveProfile || profile) : (profile || effectiveProfile);
  const hasRoadmapAccess = navProfile?.role === 'admin' ||
                           navProfile?.role === 'leadership' ||
                           navProfile?.has_strategic_roadmap_access === true;
  // Admin nav is only shown to the real admin when NOT in View As mode
  const showAdminNav = profile?.role === 'admin' && !isViewingAs;

  async function handleSignOut() {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  }

  const sidebarContent = (
    <div className="flex flex-col h-full">
      <div className="p-6 border-b border-slate-700">
        <div className="flex items-center gap-3">
          {!collapsed && (
            <>
              <div className="w-10 h-10 bg-cyan-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                EV
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-white font-semibold truncate">Evolo</h2>
                <p className="text-slate-400 text-xs truncate">The People Operating System</p>
              </div>
            </>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-2 hover:bg-slate-700 rounded-lg transition-colors lg:block hidden"
          >
            {collapsed ? (
              <Menu className="w-5 h-5 text-slate-400" />
            ) : (
              <X className="w-5 h-5 text-slate-400" />
            )}
          </button>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {navItems.map((item) => (
          <button
            key={item.path}
            onClick={() => {
              onNavigate(item.path);
              setMobileOpen(false);
            }}
            className={`w-full sidebar-item ${
              currentPath === item.path ? 'sidebar-item-active' : ''
            }`}
          >
            <item.icon className="w-5 h-5 flex-shrink-0" />
            {!collapsed && <span className="truncate">{item.label}</span>}
          </button>
        ))}

        {hasRoadmapAccess && (
          <button
            key={roadmapNavItem.path}
            onClick={() => {
              onNavigate(roadmapNavItem.path);
              setMobileOpen(false);
            }}
            className={`w-full sidebar-item ${
              currentPath === roadmapNavItem.path ? 'sidebar-item-active' : ''
            }`}
          >
            <roadmapNavItem.icon className="w-5 h-5 flex-shrink-0" />
            {!collapsed && <span className="truncate">{roadmapNavItem.label}</span>}
          </button>
        )}

        {showAdminNav && (
          <button
            key={adminNavItem.path}
            onClick={() => {
              onNavigate(adminNavItem.path);
              setMobileOpen(false);
            }}
            className={`w-full sidebar-item ${
              currentPath === adminNavItem.path ? 'sidebar-item-active' : ''
            }`}
          >
            <adminNavItem.icon className="w-5 h-5 flex-shrink-0" />
            {!collapsed && <span className="truncate">{adminNavItem.label}</span>}
          </button>
        )}
      </nav>

      <div className="p-4 border-t border-slate-700 space-y-2">
        {displayProfile && (
          <div
            className={`${
              collapsed ? 'flex justify-center' : 'flex items-center gap-3'
            } mb-4 p-3 ${isViewingAs ? 'bg-orange-800' : 'bg-slate-700'} rounded-lg`}
          >
            <div className={`w-10 h-10 ${isViewingAs ? 'bg-orange-500' : 'bg-blue-600'} rounded-full flex items-center justify-center text-white font-medium flex-shrink-0`}>
              {displayProfile.full_name.charAt(0).toUpperCase()}
            </div>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium truncate">{displayProfile.full_name}</p>
                <p className={`${isViewingAs ? 'text-orange-300' : 'text-slate-400'} text-xs truncate capitalize`}>{displayProfile.role.replace('_', ' ')}</p>
              </div>
            )}
          </div>
        )}

        <button
          onClick={() => onNavigate('/settings')}
          className={`w-full sidebar-item ${currentPath === '/settings' ? 'sidebar-item-active' : ''}`}
        >
          <Settings className="w-5 h-5 flex-shrink-0" />
          {!collapsed && <span>Settings</span>}
        </button>

        <button onClick={handleSignOut} className="w-full sidebar-item text-red-400 hover:bg-red-900/20">
          <LogOut className="w-5 h-5 flex-shrink-0" />
          {!collapsed && <span>Sign Out</span>}
        </button>
      </div>
    </div>
  );

  return (
    <>
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-slate-800 text-white rounded-lg"
      >
        <Menu className="w-6 h-6" />
      </button>

      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={`${
          collapsed ? 'lg:w-20' : 'lg:w-64'
        } ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        } fixed lg:static inset-y-0 left-0 z-40 bg-slate-800 transition-all duration-300`}
      >
        {sidebarContent}
      </aside>
    </>
  );
}
