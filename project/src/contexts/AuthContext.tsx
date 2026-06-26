import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase, Profile } from '../lib/supabase';

interface ViewAsSession {
  sessionId: string;
  targetUserId: string;
  targetEmail: string;
  targetName: string;
  startedAt: string;
}

/**
 * Merged permissions object derived from all access levels assigned to the user.
 * Keys come from access_level_types.permissions jsonb.
 * A key is true if any assigned access level grants it.
 */
export type AccessLevelPermissions = Record<string, boolean>;

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  viewAsProfile: Profile | null;
  effectiveProfile: Profile | null;
  isViewingAs: boolean;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, firstName: string, lastName: string) => Promise<void>;
  signOut: () => Promise<void>;
  startViewAs: (targetUserId: string) => Promise<void>;
  endViewAs: () => Promise<void>;
  hasPermission: (permission: string) => boolean;
  /**
   * Call at the start of any write/action handler.
   * If currently in View As mode, shows a read-only notice and returns true (blocked).
   * Returns false when the action may proceed normally.
   */
  guardViewAs: () => boolean;
  /** Access level names assigned to the effective user, e.g. ["Manager"]. Empty when none set. */
  accessLevelNames: string[];
  /** Merged permissions from all assigned access levels for the effective user. */
  accessLevelPermissions: AccessLevelPermissions;
  /**
   * The dashboard role to use for view selection.
   * When isViewingAs, this reflects the REAL admin's role — admins always keep
   * full visibility. Use viewedUserRole if you need the target user's role.
   * Derived from accessLevelPermissions first; falls back to profile.role.
   * Returns 'manager', 'employee', 'dept_lead', or 'admin'.
   */
  resolvedDashboardRole: 'manager' | 'employee' | 'dept_lead' | 'admin';
  /**
   * When isViewingAs, the target user's resolved dashboard role.
   * Used by components that want to render the viewed user's perspective (read-only).
   * Equals resolvedDashboardRole when not in View As mode.
   */
  viewedUserRole: 'manager' | 'employee' | 'dept_lead' | 'admin';
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/** Derives dashboard role from merged permissions jsonb keys. */
function permissionsToDashboardRole(perms: AccessLevelPermissions): 'manager' | 'employee' | 'dept_lead' | 'admin' {
  if (perms.full_admin || perms.dashboard_admin) return 'admin';
  if (perms.dashboard_dept_lead) return 'dept_lead';
  if (perms.dashboard_manager) return 'manager';
  return 'employee';
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [viewAsProfile, setViewAsProfile] = useState<Profile | null>(null);
  const [viewAsSessionId, setViewAsSessionId] = useState<string | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [accessLevelNames, setAccessLevelNames] = useState<string[]>([]);
  const [accessLevelPermissions, setAccessLevelPermissions] = useState<AccessLevelPermissions>({});
  const [viewAsAccessLevelNames, setViewAsAccessLevelNames] = useState<string[]>([]);
  const [viewAsAccessLevelPermissions, setViewAsAccessLevelPermissions] = useState<AccessLevelPermissions>({});
  const [loading, setLoading] = useState(true);

  const isViewingAs = viewAsProfile !== null;
  const effectiveProfile = viewAsProfile || profile;

  // Effective access level data for the viewed user (used for displaying their perspective)
  const effectiveAccessLevelNames = isViewingAs ? viewAsAccessLevelNames : accessLevelNames;
  const effectiveAccessLevelPermissions = isViewingAs ? viewAsAccessLevelPermissions : accessLevelPermissions;

  // Helper: resolve a dashboard role from a profile + its access level data
  function resolveDashboardRole(
    p: Profile | null,
    levelNames: string[],
    levelPerms: AccessLevelPermissions,
  ): 'manager' | 'employee' | 'dept_lead' | 'admin' {
    if (!p) return 'employee';
    if (levelNames.length > 0) return permissionsToDashboardRole(levelPerms);
    if (p.role === 'manager') return 'manager';
    if (p.role === 'dept_lead') return 'dept_lead';
    if (p.role === 'admin' || p.role === 'leadership' || p.role === 'senior') return 'admin';
    return 'employee';
  }

  // resolvedDashboardRole always reflects the REAL signed-in admin's role.
  // In View As mode admins keep full admin visibility — only actions become read-only.
  const resolvedDashboardRole = resolveDashboardRole(profile, accessLevelNames, accessLevelPermissions);

  // viewedUserRole reflects the TARGET user's role when in View As mode.
  // Components that want to render the viewed user's perspective use this.
  const viewedUserRole = isViewingAs
    ? resolveDashboardRole(viewAsProfile, viewAsAccessLevelNames, viewAsAccessLevelPermissions)
    : resolvedDashboardRole;

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        loadProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      (async () => {
        setUser(session?.user ?? null);
        if (session?.user) {
          await loadProfile(session.user.id);
        } else {
          setProfile(null);
          setLoading(false);
        }
      })();
    });

    return () => subscription.unsubscribe();
  }, []);

  async function loadProfile(userId: string) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) throw error;
      setProfile(data);

      if (data) {
        await loadPermissions(data.id);
        const { names, perms } = await loadAccessLevelData(data.id);
        setAccessLevelNames(names);
        setAccessLevelPermissions(perms);
        await checkActiveViewAsSession(data.id);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadPermissions(userId: string) {
    try {
      const { data, error } = await supabase
        .from('user_admin_permissions')
        .select('permission_name')
        .eq('user_id', userId);

      if (error) throw error;
      setPermissions(data?.map(p => p.permission_name) || []);
    } catch (error) {
      console.error('Error loading permissions:', error);
    }
  }

  async function loadAccessLevelData(userId: string): Promise<{ names: string[]; perms: AccessLevelPermissions }> {
    try {
      const { data, error } = await supabase
        .from('user_access_levels')
        .select('access_level_types!user_access_levels_access_level_id_fkey(name, permissions)')
        .eq('user_id', userId);

      if (error) throw error;

      const names: string[] = [];
      const merged: AccessLevelPermissions = {};

      for (const row of (data || []) as any[]) {
        const alt = Array.isArray(row.access_level_types) ? row.access_level_types[0] : row.access_level_types;
        if (!alt) continue;
        if (alt.name) names.push(alt.name);
        if (alt.permissions && typeof alt.permissions === 'object') {
          for (const [key, val] of Object.entries(alt.permissions)) {
            if (val === true) merged[key] = true;
          }
        }
      }

      return { names, perms: merged };
    } catch (error) {
      console.error('Error loading access level data:', error);
      return { names: [], perms: {} };
    }
  }

  async function checkActiveViewAsSession(adminUserId: string) {
    try {
      const { data, error } = await supabase.rpc('get_active_view_as_session', {
        admin_user_id: adminUserId
      });

      if (error) throw error;

      if (data && data.length > 0) {
        const session = data[0];
        setViewAsSessionId(session.session_id);

        const { data: targetProfile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.target_user_id)
          .maybeSingle();

        if (!profileError && targetProfile) {
          setViewAsProfile(targetProfile);
          const { names, perms } = await loadAccessLevelData(session.target_user_id);
          setViewAsAccessLevelNames(names);
          setViewAsAccessLevelPermissions(perms);
        }
      }
    } catch (error) {
      console.error('Error checking view-as session:', error);
    }
  }

  async function startViewAs(targetUserId: string) {
    if (!profile || profile.role !== 'admin' || (profile as any).admin_type !== 'full_admin') {
      throw new Error('Only full admins can use view-as functionality');
    }

    try {
      const { data: targetProfile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', targetUserId)
        .maybeSingle();

      if (profileError) throw profileError;
      if (!targetProfile) throw new Error('Target user not found');

      const { data: session, error: sessionError } = await supabase
        .from('view_as_sessions')
        .insert({
          admin_id: profile.id,
          target_user_id: targetUserId,
        })
        .select()
        .single();

      if (sessionError) throw sessionError;

      setViewAsSessionId(session.id);
      setViewAsProfile(targetProfile);
      const { names, perms } = await loadAccessLevelData(targetUserId);
      setViewAsAccessLevelNames(names);
      setViewAsAccessLevelPermissions(perms);
    } catch (error) {
      console.error('Error starting view-as session:', error);
      throw error;
    }
  }

  async function endViewAs() {
    if (!viewAsSessionId) return;

    try {
      const { error } = await supabase
        .from('view_as_sessions')
        .update({ ended_at: new Date().toISOString() })
        .eq('id', viewAsSessionId);

      if (error) throw error;

      setViewAsSessionId(null);
      setViewAsProfile(null);
      setViewAsAccessLevelNames([]);
      setViewAsAccessLevelPermissions({});
    } catch (error) {
      console.error('Error ending view-as session:', error);
      throw error;
    }
  }

  function hasPermission(permission: string): boolean {
    // When viewing as, always check the real admin's permissions — View As is read-only audit mode,
    // not a role switch. The caller is still the admin; only their actions become read-only.
    return permissions.includes(permission);
  }

  function guardViewAs(): boolean {
    if (!isViewingAs) return false;
    window.dispatchEvent(new CustomEvent('viewas:blocked'));
    return true;
  }

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }

  async function signUp(email: string, password: string, firstName: string, lastName: string) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { first_name: firstName, last_name: lastName } }
    });
    if (error) throw error;

    if (data.user) {
      const fullName = `${firstName} ${lastName}`;
      const { error: profileError } = await supabase.from('profiles').insert({
        id: data.user.id,
        email,
        full_name: fullName,
        role: 'employee',
        department: null,
        job_title: null,
        start_date: null
      });
      if (profileError) throw profileError;
    }
  }

  async function signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        viewAsProfile,
        effectiveProfile,
        isViewingAs,
        loading,
        signIn,
        signUp,
        signOut,
        startViewAs,
        endViewAs,
        hasPermission,
        guardViewAs,
        accessLevelNames: effectiveAccessLevelNames,
        accessLevelPermissions: effectiveAccessLevelPermissions,
        resolvedDashboardRole,
        viewedUserRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
