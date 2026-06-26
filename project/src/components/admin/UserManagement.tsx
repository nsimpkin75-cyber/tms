import React, { useState, useEffect } from 'react';
import { Plus, CreditCard as Edit2, Trash2, Search, Eye, KeyRound, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface PreviousRoleEntry {
  department: string;
  role: string;
  job_family_id?: string;
  start_date?: string;
  end_date?: string;
  reason?: string;
}

interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: 'employee' | 'manager' | 'leadership' | 'admin';
  admin_type: 'full_admin' | 'job_families_admin' | 'people_admin' | null;
  job_title: string | null;
  department: string | null;
  tenure: number | null;
  start_date: string | null;
  manager_id: string | null;
  job_family_id: string | null;
  previous_roles: PreviousRoleEntry[] | null;
  has_strategic_roadmap_access: boolean;
  active: boolean;
  confirmed_at: string | null;
  status: 'active' | 'pending' | 'inactive';
  created_at: string;
  competency_level: 'Employee' | 'Manager' | 'Senior Leader' | null;
}

interface AccessLevelType {
  id: string;
  name: string;
  description: string | null;
  permissions: any;
  is_active: boolean;
}

interface JobFamily {
  id: string;
  title: string;
  department: string;
  pathway: string | null;
  level: string;
}


function PreviousRolesEditor({
  entries,
  jobFamilies,
  onChange,
}: {
  entries: PreviousRoleEntry[];
  jobFamilies: JobFamily[];
  onChange: (entries: PreviousRoleEntry[]) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [newEntry, setNewEntry] = useState<PreviousRoleEntry>({ department: '', role: '' });

  const departments = [...new Set(jobFamilies.map(jf => jf.department).filter(Boolean))].sort();
  const rolesForDept = jobFamilies.filter(jf => jf.department === newEntry.department);

  const addEntry = () => {
    if (!newEntry.department || !newEntry.role) return;
    onChange([...entries, newEntry]);
    setNewEntry({ department: '', role: '' });
    setAdding(false);
  };

  const removeEntry = (idx: number) => {
    onChange(entries.filter((_, i) => i !== idx));
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="block text-sm font-medium text-gray-700">Previous Roles</label>
        <button type="button" onClick={() => setAdding(!adding)} className="text-xs text-blue-600 hover:text-blue-800">
          + Add entry
        </button>
      </div>
      {entries.length === 0 && !adding && (
        <p className="text-xs text-gray-400 mb-1">No previous roles recorded.</p>
      )}
      <div className="space-y-2">
        {entries.map((entry, idx) => (
          <div key={idx} className="flex items-start justify-between gap-2 p-2 bg-gray-50 rounded-lg border border-gray-200 text-xs">
            <div>
              <span className="font-medium text-gray-800">{entry.role}</span>
              <span className="text-gray-500"> · {entry.department}</span>
              {(entry.start_date || entry.end_date) && (
                <span className="text-gray-400 block">{entry.start_date || '?'} → {entry.end_date || 'present'}</span>
              )}
              {entry.reason && <span className="text-gray-400 block italic">{entry.reason}</span>}
            </div>
            <button type="button" onClick={() => removeEntry(idx)} className="text-gray-400 hover:text-red-500 flex-shrink-0">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
      {adding && (
        <div className="mt-2 p-3 border border-blue-200 rounded-lg bg-blue-50 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <select
              value={newEntry.department}
              onChange={(e) => setNewEntry({ ...newEntry, department: e.target.value, role: '', job_family_id: undefined })}
              className="px-2 py-1.5 border border-gray-300 rounded text-xs"
            >
              <option value="">Department</option>
              {departments.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
            <select
              value={newEntry.job_family_id || ''}
              onChange={(e) => {
                const jf = jobFamilies.find(j => j.id === e.target.value);
                setNewEntry({ ...newEntry, job_family_id: e.target.value, role: jf?.title || '' });
              }}
              disabled={!newEntry.department}
              className="px-2 py-1.5 border border-gray-300 rounded text-xs disabled:bg-gray-100"
            >
              <option value="">Role</option>
              {rolesForDept.map(jf => <option key={jf.id} value={jf.id}>{jf.title}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input type="date" placeholder="Start date" value={newEntry.start_date || ''} onChange={(e) => setNewEntry({ ...newEntry, start_date: e.target.value })} className="px-2 py-1.5 border border-gray-300 rounded text-xs" />
            <input type="date" placeholder="End date" value={newEntry.end_date || ''} onChange={(e) => setNewEntry({ ...newEntry, end_date: e.target.value })} className="px-2 py-1.5 border border-gray-300 rounded text-xs" />
          </div>
          <input type="text" placeholder="Reason for change (optional)" value={newEntry.reason || ''} onChange={(e) => setNewEntry({ ...newEntry, reason: e.target.value })} className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs" />
          <div className="flex gap-2">
            <button type="button" onClick={addEntry} disabled={!newEntry.department || !newEntry.role} className="flex-1 bg-blue-600 text-white py-1.5 rounded text-xs hover:bg-blue-700 disabled:bg-blue-300">Add</button>
            <button type="button" onClick={() => { setAdding(false); setNewEntry({ department: '', role: '' }); }} className="flex-1 bg-gray-200 text-gray-700 py-1.5 rounded text-xs hover:bg-gray-300">Cancel</button>
          </div>
        </div>
      )}
      <p className="text-xs text-gray-400 mt-1">For progression history only. Does not affect current role or access.</p>
    </div>
  );
}

export default function UserManagement() {
  const { profile: currentProfile, startViewAs } = useAuth();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [accessLevelTypes, setAccessLevelTypes] = useState<AccessLevelType[]>([]);
  const [userAccessLevels, setUserAccessLevels] = useState<Map<string, string[]>>(new Map());
  const [jobFamilies, setJobFamilies] = useState<JobFamily[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'pending' | 'inactive'>('active');
  const [deptFilter, setDeptFilter] = useState('');
  const [managerFilter, setManagerFilter] = useState('');
  const [accessLevelFilter, setAccessLevelFilter] = useState('');
  const [formData, setFormData] = useState({
    email: '',
    full_name: '',
    job_title: '',
    department: '',
    pathway: '',
    role: 'employee' as Profile['role'],
    admin_type: null as Profile['admin_type'],
    start_date: '',
    manager_id: '',
    job_family_id: '',
    previous_roles: [] as PreviousRoleEntry[],
    has_strategic_roadmap_access: false,
    access_level_ids: [] as string[],
    competency_level: 'Employee' as 'Employee' | 'Manager' | 'Senior Leader',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isFullAdmin = currentProfile?.role === 'admin' && (currentProfile as any)?.admin_type === 'full_admin';

  useEffect(() => {
    fetchProfiles();
    fetchAccessLevelTypes();
    fetchUserAccessLevels();
    fetchJobFamilies();
  }, []);

  const fetchProfiles = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('email', { ascending: true });

      if (error) throw error;

      const mappedProfiles = (data || []).map(profile => ({
        ...profile,
        status: profile.active ? 'active' : 'inactive',
        confirmed_at: profile.created_at,
      }));

      setProfiles(mappedProfiles as Profile[]);
    } catch (error) {
      console.error('Error fetching profiles:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAccessLevelTypes = async () => {
    try {
      const { data, error } = await supabase
        .from('access_level_types')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setAccessLevelTypes(data || []);
    } catch (error) {
      console.error('Error fetching access level types:', error);
    }
  };

  const fetchUserAccessLevels = async () => {
    try {
      const { data, error } = await supabase
        .from('user_access_levels')
        .select('user_id, access_level_id');

      if (error) throw error;

      const levelMap = new Map<string, string[]>();
      data?.forEach(item => {
        const existing = levelMap.get(item.user_id) || [];
        levelMap.set(item.user_id, [...existing, item.access_level_id]);
      });

      setUserAccessLevels(levelMap);
    } catch (error) {
      console.error('Error fetching user access levels:', error);
    }
  };

  const fetchJobFamilies = async () => {
    try {
      const { data, error } = await supabase
        .from('job_families')
        .select('id, title, department, level')
        .order('department', { ascending: true })
        .order('sort_order', { ascending: true });

      if (error) throw error;
      setJobFamilies(data || []);
    } catch (error) {
      console.error('Error fetching job families:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const isEditing = !!editingProfile;

    try {
      if (editingProfile) {
        // Auto-capture old dept/role into previous_roles when either changes
        const deptChanged = formData.department && formData.department !== editingProfile.department;
        const roleChanged = formData.job_family_id && formData.job_family_id !== editingProfile.job_family_id;
        let updatedPreviousRoles = [...formData.previous_roles];
        if ((deptChanged || roleChanged) && editingProfile.department && editingProfile.job_title) {
          const captured: PreviousRoleEntry = {
            department: editingProfile.department,
            role: editingProfile.job_title,
            job_family_id: editingProfile.job_family_id || undefined,
            end_date: new Date().toISOString().split('T')[0],
          };
          // Avoid duplicate entry for same dept+role
          const alreadyExists = updatedPreviousRoles.some(
            r => r.department === captured.department && r.role === captured.role
          );
          if (!alreadyExists) {
            updatedPreviousRoles = [captured, ...updatedPreviousRoles];
          }
        }

        const updateData: any = {
          full_name: formData.full_name,
          job_title: formData.job_title || null,
          department: formData.department || null,
          role: formData.role,
          start_date: formData.start_date || null,
          manager_id: formData.manager_id || null,
          job_family_id: formData.job_family_id || null,
          previous_roles: updatedPreviousRoles,
          has_strategic_roadmap_access: formData.has_strategic_roadmap_access,
          competency_level: formData.competency_level,
        };

        if (formData.role === 'admin') {
          updateData.admin_type = formData.admin_type;
        }

        const { data, error } = await supabase
          .from('profiles')
          .update(updateData)
          .eq('id', editingProfile.id)
          .select();

        if (error) {
          console.error('Profile update error:', error);
          throw new Error(`Failed to update profile: ${error.message} (Code: ${error.code})`);
        }

        await supabase
          .from('user_access_levels')
          .delete()
          .eq('user_id', editingProfile.id);

        if (formData.access_level_ids.length > 0) {
          const { data: { user } } = await supabase.auth.getUser();
          const accessLevelInserts = formData.access_level_ids.map(levelId => ({
            user_id: editingProfile.id,
            access_level_id: levelId,
            assigned_by: user?.id || null,
          }));

          await supabase
            .from('user_access_levels')
            .insert(accessLevelInserts);
        }

        console.log('Profile updated successfully:', data);
      } else {
        const bodyData: any = {
          email: formData.email,
          full_name: formData.full_name,
          job_title: formData.job_title || null,
          department: formData.department || null,
          role: formData.role,
          start_date: formData.start_date || null,
          manager_id: formData.manager_id || null,
          job_family_id: formData.job_family_id || null,
          previous_roles: formData.previous_roles,
          has_strategic_roadmap_access: formData.has_strategic_roadmap_access,
          competency_level: formData.competency_level,
        };

        if (formData.role === 'admin') {
          bodyData.admin_type = formData.admin_type;
        }

        const { data: result, error: fnError } = await supabase.functions.invoke('create-user', {
          body: bodyData,
        });

        if (fnError) {
          let errorMessage = fnError.message || 'Failed to create user';
          try {
            const context = (fnError as any).context;
            if (context) {
              const body = await context.json();
              if (body?.error) errorMessage = body.error;
            }
          } catch {}
          throw new Error(errorMessage);
        }

        if (!result?.success) {
          throw new Error(result?.error || 'Failed to create user');
        }

        if (result.user?.id && formData.access_level_ids.length > 0) {
          const { data: { user } } = await supabase.auth.getUser();
          const accessLevelInserts = formData.access_level_ids.map(levelId => ({
            user_id: result.user.id,
            access_level_id: levelId,
            assigned_by: user?.id || null,
          }));

          await supabase
            .from('user_access_levels')
            .insert(accessLevelInserts);
        }

        if (result.tempPassword) {
          alert(`User created successfully!\n\nEmail: ${formData.email}\nTemporary Password: ${result.tempPassword}\n\nPlease save this password and share it with the user securely.`);
        }
      }

      setShowModal(false);
      setEditingProfile(null);
      resetForm();
      await fetchProfiles();
      await fetchUserAccessLevels();
      if (isEditing) {
        alert('Profile updated successfully!');
      }
    } catch (error) {
      console.error('Error saving profile:', error);
      alert(error instanceof Error ? error.message : 'Failed to save profile');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    const confirmed = confirm('Are you sure you want to delete this user? This will permanently remove the user and all associated data.');
    if (!confirmed) return;

    // Check if this user has historical data and offer force delete
    let force = false;
    try {
      const { data: result, error: fnError } = await supabase.functions.invoke('delete-user', {
        body: { userId: id, force: false },
      });

      if (fnError) {
        let errorMessage = fnError.message || 'Failed to delete user';
        try {
          const context = (fnError as any).context;
          if (context) {
            const body = await context.json();
            if (body?.error) errorMessage = body.error;
          }
        } catch {}
        throw new Error(errorMessage);
      }

      if (result?.archived) {
        const forceConfirmed = confirm(
          'This user has historical review/meeting data and was archived instead of deleted.\n\nClick OK to permanently delete them and all their data, or Cancel to keep them archived.'
        );
        if (!forceConfirmed) {
          fetchProfiles();
          fetchUserAccessLevels();
          return;
        }
        force = true;
        // Re-invoke with force flag
        const { data: forceResult, error: forceError } = await supabase.functions.invoke('delete-user', {
          body: { userId: id, force: true },
        });
        if (forceError) {
          let errorMessage = forceError.message || 'Failed to delete user';
          try {
            const context = (forceError as any).context;
            if (context) {
              const body = await context.json();
              if (body?.error) errorMessage = body.error;
            }
          } catch {}
          throw new Error(errorMessage);
        }
        void forceResult;
      }

      alert(force ? 'User permanently deleted.' : 'User deleted successfully.');
      fetchProfiles();
      fetchUserAccessLevels();
    } catch (error) {
      console.error('Error deleting profile:', error);
      alert(error instanceof Error ? error.message : 'Failed to delete profile');
    }
  };

  const handleToggleActive = async (id: string, currentActive: boolean) => {
    const action = currentActive ? 'deactivate' : 'reactivate';
    if (!confirm(`Are you sure you want to ${action} this user?`)) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ active: !currentActive })
        .eq('id', id);

      if (error) throw error;
      fetchProfiles();
    } catch (error) {
      console.error('Error updating user status:', error);
      alert('Failed to update user status');
    }
  };

  const handlePasswordReset = async (email: string) => {
    if (!confirm(`Send a password reset email to ${email}?`)) return;

    try {
      const { data: result, error: fnError } = await supabase.functions.invoke('reset-user-password', {
        body: { email },
      });

      if (fnError) {
        let errorMessage = fnError.message || 'Failed to reset password';
        try {
          const context = (fnError as any).context;
          if (context) {
            const body = await context.json();
            if (body?.error) errorMessage = body.error;
          }
        } catch {}
        throw new Error(errorMessage);
      }

      if (result?.tempPassword) {
        alert(`Password reset successfully!\n\nEmail: ${email}\nNew Temporary Password: ${result.tempPassword}\n\nPlease save this password and share it with the user securely.`);
      } else {
        alert('Password reset email sent successfully');
      }
    } catch (error) {
      console.error('Error resetting password:', error);
      alert(error instanceof Error ? error.message : 'Failed to reset password');
    }
  };

  const handleViewAs = async (targetUserId: string) => {
    if (!confirm('You are about to view the system as this user. You will not be able to approve or amend data in this mode. Continue?')) {
      return;
    }

    try {
      await startViewAs(targetUserId);
      window.location.href = '/';
    } catch (error) {
      console.error('Error starting view-as session:', error);
      alert(error instanceof Error ? error.message : 'Failed to start view-as session');
    }
  };

  const openEditModal = async (profile: Profile) => {
    setEditingProfile(profile);

    const userLevels = userAccessLevels.get(profile.id) || [];

    const existingJf = jobFamilies.find(j => j.id === profile.job_family_id);
    setFormData({
      email: profile.email,
      full_name: profile.full_name,
      job_title: profile.job_title || '',
      department: profile.department || '',
      pathway: existingJf?.pathway || '',
      role: profile.role,
      admin_type: profile.admin_type || null,
      start_date: profile.start_date || '',
      manager_id: profile.manager_id || '',
      job_family_id: profile.job_family_id || '',
      previous_roles: Array.isArray((profile as any).previous_roles) ? (profile as any).previous_roles : [],
      has_strategic_roadmap_access: profile.has_strategic_roadmap_access || false,
      access_level_ids: userLevels,
      competency_level: profile.competency_level || 'Employee',
    });
    setShowModal(true);
  };

  const openAddModal = () => {
    setEditingProfile(null);
    resetForm();
    setShowModal(true);
  };

  const resetForm = () => {
    setFormData({
      email: '',
      full_name: '',
      job_title: '',
      department: '',
      pathway: '',
      role: 'employee',
      admin_type: null,
      start_date: '',
      manager_id: '',
      job_family_id: '',
      previous_roles: [],
      has_strategic_roadmap_access: false,
      access_level_ids: [],
      competency_level: 'Employee',
    });
  };

  const getManagerName = (managerId: string | null) => {
    if (!managerId) return '-';
    const manager = profiles.find(p => p.id === managerId);
    return manager?.full_name || '-';
  };

  const getJobFamilyTitle = (jobFamilyId: string | null) => {
    if (!jobFamilyId) return '-';
    const jobFamily = jobFamilies.find(jf => jf.id === jobFamilyId);
    return jobFamily ? `${jobFamily.title} (${jobFamily.level})` : '-';
  };

  const getUserAccessLevelNames = (userId: string) => {
    const levelIds = userAccessLevels.get(userId) || [];
    const names = levelIds
      .map(id => accessLevelTypes.find(alt => alt.id === id)?.name)
      .filter(Boolean);
    return names.length > 0 ? names.join(', ') : '-';
  };

  const getPotentialManagers = () => {
    return profiles.filter(p => {
      const levels = userAccessLevels.get(p.id) || [];
      const hasManagerLevel = levels.some(levelId => {
        const levelType = accessLevelTypes.find(alt => alt.id === levelId);
        return levelType?.name === 'Manager';
      });
      return (hasManagerLevel || p.role === 'manager' || p.role === 'leadership' || p.role === 'admin')
        && p.id !== editingProfile?.id
        && p.status === 'active';
    });
  };

  const handleAccessLevelToggle = (levelId: string) => {
    const current = formData.access_level_ids;
    if (current.includes(levelId)) {
      setFormData({ ...formData, access_level_ids: current.filter(id => id !== levelId) });
    } else {
      setFormData({ ...formData, access_level_ids: [...current, levelId] });
    }
  };


  const departments = [...new Set(profiles.map(p => p.department).filter(Boolean))].sort();
  const managers = profiles.filter(p => p.role === 'manager' || p.role === 'admin');

  const filteredProfiles = profiles.filter((profile) => {
    const matchesSearch =
      profile.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      profile.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      profile.department?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || profile.status === statusFilter;
    const matchesDept = !deptFilter || profile.department === deptFilter;
    const matchesManager = !managerFilter || profile.manager_id === managerFilter;
    const matchesAccess = !accessLevelFilter || (userAccessLevels.get(profile.id) || []).includes(accessLevelFilter);

    return matchesSearch && matchesStatus && matchesDept && matchesManager && matchesAccess;
  });

  const statusCounts = {
    all: profiles.length,
    active: profiles.filter(p => p.status === 'active').length,
    pending: profiles.filter(p => p.status === 'pending').length,
    inactive: profiles.filter(p => p.status === 'inactive').length,
  };

  return (
    <div>
      <div className="flex flex-wrap gap-3 items-center mb-4">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <select
          value={deptFilter}
          onChange={(e) => setDeptFilter(e.target.value)}
          className="py-2 px-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Departments</option>
          {departments.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
        <select
          value={managerFilter}
          onChange={(e) => setManagerFilter(e.target.value)}
          className="py-2 px-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Managers</option>
          {managers.map(m => <option key={m.id} value={m.id}>{m.full_name}</option>)}
        </select>
        <select
          value={accessLevelFilter}
          onChange={(e) => setAccessLevelFilter(e.target.value)}
          className="py-2 px-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Access Levels</option>
          {accessLevelTypes.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
        {(deptFilter || managerFilter || accessLevelFilter) && (
          <button
            onClick={() => { setDeptFilter(''); setManagerFilter(''); setAccessLevelFilter(''); }}
            className="text-sm text-gray-500 hover:text-gray-700 underline"
          >
            Clear filters
          </button>
        )}
        <button
          onClick={openAddModal}
          className="ml-auto flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Add User
        </button>
      </div>

      {statusFilter === 'pending' && statusCounts.pending > 0 && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-800">
            <strong>Pending users</strong> have been invited but haven't confirmed their email address yet. They will appear as "Active" once they set up their account.
          </p>
        </div>
      )}

      <div className="mb-6 flex gap-2 border-b border-gray-200">
        <button
          onClick={() => setStatusFilter('all')}
          className={`px-4 py-2 font-medium transition-colors ${
            statusFilter === 'all'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          All Users ({statusCounts.all})
        </button>
        <button
          onClick={() => setStatusFilter('active')}
          className={`px-4 py-2 font-medium transition-colors ${
            statusFilter === 'active'
              ? 'text-green-600 border-b-2 border-green-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Active ({statusCounts.active})
        </button>
        <button
          onClick={() => setStatusFilter('pending')}
          className={`px-4 py-2 font-medium transition-colors ${
            statusFilter === 'pending'
              ? 'text-yellow-600 border-b-2 border-yellow-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Pending ({statusCounts.pending})
        </button>
        <button
          onClick={() => setStatusFilter('inactive')}
          className={`px-4 py-2 font-medium transition-colors ${
            statusFilter === 'inactive'
              ? 'text-gray-600 border-b-2 border-gray-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Inactive ({statusCounts.inactive})
        </button>
      </div>

      {loading ? (
        <div className="text-center py-8">Loading...</div>
      ) : filteredProfiles.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">No users found</p>
          <p className="text-gray-400 text-sm mt-2">
            {searchTerm
              ? 'Try adjusting your search terms'
              : statusFilter !== 'all'
              ? `No ${statusFilter} users at the moment`
              : 'Click "Add User" to create your first user'}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Job Title</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Department</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Access Levels</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Manager</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredProfiles.map((profile) => (
                <tr key={profile.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{profile.full_name}</div>
                    <div className="text-sm text-gray-500">{profile.email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {profile.job_title || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {profile.department || '-'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {getUserAccessLevelNames(profile.id)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      profile.status === 'active'
                        ? 'bg-green-100 text-green-800'
                        : profile.status === 'pending'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {profile.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {getManagerName(profile.manager_id)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    {isFullAdmin && profile.status === 'active' && profile.id !== currentProfile?.id && (
                      <button
                        onClick={() => handleViewAs(profile.id)}
                        className="text-blue-600 hover:text-blue-900 mr-3"
                        title="View as this user"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => openEditModal(profile)}
                      className="text-blue-600 hover:text-blue-900 mr-3"
                      title="Edit user"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handlePasswordReset(profile.email)}
                      className="text-orange-600 hover:text-orange-900 mr-3"
                      title="Reset password"
                    >
                      <KeyRound className="w-4 h-4" />
                    </button>
                    {profile.status !== 'pending' && (
                      <button
                        onClick={() => handleToggleActive(profile.id, profile.active)}
                        className={`mr-3 ${
                          profile.active
                            ? 'text-yellow-600 hover:text-yellow-900'
                            : 'text-green-600 hover:text-green-900'
                        }`}
                        title={profile.active ? 'Deactivate user' : 'Reactivate user'}
                      >
                        {profile.active ? '⏸' : '▶'}
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(profile.id)}
                      className="text-red-600 hover:text-red-900"
                      title="Delete user"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">
              {editingProfile ? 'Edit User' : 'Add User'}
            </h3>
            {!editingProfile && (
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  The user will receive an email invitation to set up their password.
                </p>
              </div>
            )}
            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    disabled={!!editingProfile}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                  <input
                    type="text"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                  <select
                    value={formData.department}
                    onChange={(e) => {
                      const dept = e.target.value;
                      setFormData({ ...formData, department: dept, pathway: '', job_title: '', job_family_id: '' });
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select Department</option>
                    {[...new Set(jobFamilies.map(jf => jf.department).filter(Boolean))].sort().map(dept => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                </div>
                {/* Pathway dropdown — only show if selected department has pathways */}
                {formData.department && [...new Set(jobFamilies.filter(jf => jf.department === formData.department && jf.pathway).map(jf => jf.pathway))].length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Pathway</label>
                    <select
                      value={formData.pathway}
                      onChange={(e) => {
                        setFormData({ ...formData, pathway: e.target.value, job_title: '', job_family_id: '' });
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">All pathways</option>
                      {[...new Set(jobFamilies.filter(jf => jf.department === formData.department && jf.pathway).map(jf => jf.pathway))].sort().map(p => (
                        <option key={p!} value={p!}>{p}</option>
                      ))}
                    </select>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                  <select
                    value={formData.job_family_id}
                    onChange={(e) => {
                      const jfId = e.target.value;
                      const jf = jobFamilies.find(j => j.id === jfId);
                      setFormData({ ...formData, job_family_id: jfId, job_title: jf?.title || '', pathway: jf?.pathway || formData.pathway });
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    disabled={!formData.department}
                  >
                    <option value="">Select Role{!formData.department ? ' (select department first)' : ''}</option>
                    {jobFamilies
                      .filter(jf => jf.department === formData.department && (!formData.pathway || jf.pathway === formData.pathway || !jf.pathway))
                      .map(jf => (
                        <option key={jf.id} value={jf.id}>
                          {jf.title} ({jf.level}){jf.pathway ? ` — ${jf.pathway}` : ''}
                        </option>
                      ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Access Levels (Select multiple)</label>
                  <div className="space-y-2 max-h-48 overflow-y-auto border border-gray-300 rounded-lg p-3">
                    {accessLevelTypes.map((level) => (
                      <label key={level.id} className="flex items-start space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.access_level_ids.includes(level.id)}
                          onChange={() => handleAccessLevelToggle(level.id)}
                          className="mt-1 rounded border-gray-300 text-blue-600"
                        />
                        <div>
                          <div className="text-sm font-medium text-gray-900">{level.name}</div>
                          {level.description && (
                            <div className="text-xs text-gray-500">{level.description}</div>
                          )}
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Legacy Access Level (for backward compatibility)</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value as Profile['role'] })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="employee">Employee</option>
                    <option value="manager">Manager</option>
                    <option value="leadership">Leadership</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                {formData.role === 'admin' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Admin Type</label>
                    <select
                      value={formData.admin_type || ''}
                      onChange={(e) => setFormData({ ...formData, admin_type: e.target.value as Profile['admin_type'] })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      <option value="">Select Admin Type</option>
                      <option value="full_admin">Full Admin - Full system view and can view as others</option>
                      <option value="job_families_admin">Job Families Admin - Manage job families and competencies</option>
                      <option value="people_admin">People Admin - Manage users, passwords, and training</option>
                    </select>
                    <p className="text-xs text-gray-500 mt-1">
                      {formData.admin_type === 'full_admin' && 'Can view entire system and impersonate users, but cannot approve/amend in view-as mode'}
                      {formData.admin_type === 'job_families_admin' && 'Can access and modify all job family functionalities'}
                      {formData.admin_type === 'people_admin' && 'Can add users, reset passwords, and manage training modules'}
                    </p>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Manager</label>
                  <select
                    value={formData.manager_id}
                    onChange={(e) => setFormData({ ...formData, manager_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">No Manager</option>
                    {getPotentialManagers().map((manager) => (
                      <option key={manager.id} value={manager.id}>
                        {manager.full_name} ({manager.role})
                      </option>
                    ))}
                  </select>
                </div>
                <PreviousRolesEditor
                  entries={formData.previous_roles}
                  jobFamilies={jobFamilies}
                  onChange={(entries) => setFormData({ ...formData, previous_roles: entries })}
                />
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Competency Level</label>
                  <select
                    value={formData.competency_level}
                    onChange={(e) => setFormData({ ...formData, competency_level: e.target.value as 'Employee' | 'Manager' | 'Senior Leader' })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Employee">Employee</option>
                    <option value="Manager">Manager</option>
                    <option value="Senior Leader">Senior Leader</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">Determines which competency prompts and descriptions are shown in 1:1 reviews</p>
                </div>
                {(formData.role === 'leadership' || formData.role === 'admin') && (
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="strategic_roadmap"
                      checked={formData.has_strategic_roadmap_access}
                      onChange={(e) => setFormData({ ...formData, has_strategic_roadmap_access: e.target.checked })}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <label htmlFor="strategic_roadmap" className="ml-2 text-sm font-medium text-gray-700">
                      Grant Business Strategy Access
                    </label>
                  </div>
                )}
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-blue-400 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Saving...' : (editingProfile ? 'Update' : 'Create')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingProfile(null);
                    resetForm();
                  }}
                  disabled={isSubmitting}
                  className="flex-1 bg-gray-200 text-gray-800 py-2 rounded-lg hover:bg-gray-300 transition-colors disabled:bg-gray-100 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
