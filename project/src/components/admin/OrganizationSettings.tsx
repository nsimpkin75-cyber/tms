import React, { useState, useEffect } from 'react';
import { Building, Briefcase, Shield, Plus, Trash2, Check, X, ChevronDown, ChevronUp, Lock, AlertCircle, CreditCard as Edit3 } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface Department {
  id: string;
  name: string;
  description: string | null;
  active: boolean;
}

interface JobTitle {
  id: string;
  title: string;
  description: string | null;
  active: boolean;
}

interface AccessLevelType {
  id: string;
  name: string;
  description: string | null;
  permissions: Record<string, boolean>;
  is_system: boolean;
  is_protected: boolean;
  is_active: boolean;
}

// ─── Permission definitions ────────────────────────────────────────────────

interface PermissionDef {
  key: string;
  label: string;
  description: string;
}

interface PermissionGroup {
  group: string;
  items: PermissionDef[];
}

const PERMISSION_GROUPS: PermissionGroup[] = [
  {
    group: 'Dashboards & Views',
    items: [
      { key: 'dashboard_employee', label: 'Employee dashboard', description: 'Access the employee personal dashboard' },
      { key: 'dashboard_manager', label: 'Manager dashboard (My Team)', description: 'Access the manager team dashboard' },
      { key: 'dashboard_dept_lead', label: 'Department Lead dashboard', description: 'Access the department overview dashboard' },
      { key: 'dashboard_admin', label: 'Admin / Organisation dashboard', description: 'Access the org-wide leadership dashboard' },
    ],
  },
  {
    group: 'Reviews',
    items: [
      { key: 'view_review_templates', label: 'View review templates', description: 'See the list of review templates' },
      { key: 'create_review_templates', label: 'Create & edit review templates', description: 'Create new templates and edit existing ones' },
      { key: 'delete_review_templates', label: 'Delete review templates', description: 'Permanently delete review templates' },
      { key: 'start_reviews', label: 'Start reviews', description: 'Schedule and launch review cycles' },
      { key: 'edit_submitted_reviews', label: 'Edit submitted reviews', description: 'Edit reviews within the allowed timeframe' },
      { key: 'view_completed_reviews', label: 'View completed reviews', description: 'Access completed review history' },
      { key: 'delete_reviews', label: 'Delete reviews (admin correction)', description: 'Permanently delete review records' },
    ],
  },
  {
    group: 'Career & Skills',
    items: [
      { key: 'access_career_pathways', label: 'Career pathways', description: 'Access the career pathways module' },
      { key: 'access_skills_matrix', label: 'Skills matrix', description: 'Access the skills matrix module' },
      { key: 'manage_assessment_templates', label: 'Assessment templates', description: 'Create, edit and delete assessment templates' },
    ],
  },
  {
    group: 'Team & Reporting',
    items: [
      { key: 'view_team', label: 'Team views', description: "View team members and direct reports" },
      { key: 'view_reporting', label: 'Reporting dashboards', description: 'Access reporting and analytics dashboards' },
      { key: 'view_nine_box', label: '9-box grid', description: 'View the 9-box talent grid' },
    ],
  },
  {
    group: 'Administration',
    items: [
      { key: 'manage_users', label: 'User management', description: 'Create, edit and deactivate users' },
      { key: 'manage_org_settings', label: 'Organisation settings', description: 'Edit organisation settings, departments and job titles' },
      { key: 'manage_access_levels', label: 'Access level management', description: 'Create, edit and delete access level types' },
      { key: 'manage_sera', label: 'SERA configuration', description: 'Configure SERA AI settings and thresholds' },
      { key: 'full_admin', label: 'Full Admin (unrestricted)', description: 'Grants all permissions. Reserved for Full Admin only.' },
    ],
  },
];

const ALL_PERMISSION_KEYS = PERMISSION_GROUPS.flatMap(g => g.items.map(i => i.key));

// ─── Component ─────────────────────────────────────────────────────────────

export default function OrganizationSettings() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [jobTitles, setJobTitles] = useState<JobTitle[]>([]);
  const [accessLevelTypes, setAccessLevelTypes] = useState<AccessLevelType[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'departments' | 'job_titles' | 'access_levels'>('departments');

  // Dept state
  const [newDeptName, setNewDeptName] = useState('');
  const [newDeptDesc, setNewDeptDesc] = useState('');
  const [showAddDept, setShowAddDept] = useState(false);

  // Job title state
  const [newTitleName, setNewTitleName] = useState('');
  const [newTitleDesc, setNewTitleDesc] = useState('');
  const [showAddTitle, setShowAddTitle] = useState(false);

  // Access level state
  const [showAddAccessLevel, setShowAddAccessLevel] = useState(false);
  const [newLevelName, setNewLevelName] = useState('');
  const [newLevelDesc, setNewLevelDesc] = useState('');
  const [newLevelPerms, setNewLevelPerms] = useState<Record<string, boolean>>({});
  const [expandedLevel, setExpandedLevel] = useState<string | null>(null);
  const [editingLevel, setEditingLevel] = useState<string | null>(null);
  const [editPerms, setEditPerms] = useState<Record<string, boolean>>({});
  const [editDesc, setEditDesc] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    await Promise.all([fetchDepartments(), fetchJobTitles(), fetchAccessLevelTypes()]);
    setLoading(false);
  };

  const fetchDepartments = async () => {
    try {
      const { data, error } = await supabase.from('departments_org').select('*').order('name');
      if (error) throw error;
      setDepartments(data || []);
    } catch (e) { console.error(e); }
  };

  const fetchJobTitles = async () => {
    try {
      const { data, error } = await supabase.from('job_titles_org').select('*').order('title');
      if (error) throw error;
      setJobTitles(data || []);
    } catch (e) { console.error(e); }
  };

  const fetchAccessLevelTypes = async () => {
    try {
      const { data, error } = await supabase.from('access_level_types').select('*').order('name');
      if (error) throw error;
      setAccessLevelTypes((data || []).map((r: any) => ({
        ...r,
        permissions: r.permissions || {},
        is_protected: r.is_protected ?? false,
      })));
    } catch (e) { console.error(e); }
  };

  // ─── Department handlers ──────────────────────────────────────────────────

  const handleAddDepartment = async () => {
    if (!newDeptName.trim()) return;
    try {
      const { error } = await supabase.from('departments_org').insert({
        name: newDeptName.trim(), description: newDeptDesc.trim() || null, active: true,
      });
      if (error) throw error;
      setNewDeptName(''); setNewDeptDesc(''); setShowAddDept(false);
      await fetchDepartments();
    } catch { alert('Failed to add department'); }
  };

  const handleToggleDeptActive = async (id: string, current: boolean) => {
    try {
      const { error } = await supabase.from('departments_org').update({ active: !current }).eq('id', id);
      if (error) throw error;
      await fetchDepartments();
    } catch { alert('Failed to update department'); }
  };

  const handleDeleteDept = async (id: string) => {
    if (!confirm('Delete this department?')) return;
    try {
      const { error } = await supabase.from('departments_org').delete().eq('id', id);
      if (error) throw error;
      await fetchDepartments();
    } catch { alert('Failed to delete department'); }
  };

  // ─── Job title handlers ───────────────────────────────────────────────────

  const handleAddJobTitle = async () => {
    if (!newTitleName.trim()) return;
    try {
      const { error } = await supabase.from('job_titles_org').insert({
        title: newTitleName.trim(), description: newTitleDesc.trim() || null, active: true,
      });
      if (error) throw error;
      setNewTitleName(''); setNewTitleDesc(''); setShowAddTitle(false);
      await fetchJobTitles();
    } catch { alert('Failed to add job title'); }
  };

  const handleToggleTitleActive = async (id: string, current: boolean) => {
    try {
      const { error } = await supabase.from('job_titles_org').update({ active: !current }).eq('id', id);
      if (error) throw error;
      await fetchJobTitles();
    } catch { alert('Failed to update job title'); }
  };

  const handleDeleteTitle = async (id: string) => {
    if (!confirm('Delete this job title?')) return;
    try {
      const { error } = await supabase.from('job_titles_org').delete().eq('id', id);
      if (error) throw error;
      await fetchJobTitles();
    } catch { alert('Failed to delete job title'); }
  };

  // ─── Access level handlers ────────────────────────────────────────────────

  const handleAddAccessLevel = async () => {
    if (!newLevelName.trim()) return;
    // Always include employee baseline
    const permsToSave = { dashboard_employee: true, ...newLevelPerms };
    try {
      const { error } = await supabase.from('access_level_types').insert({
        name: newLevelName.trim(),
        description: newLevelDesc.trim() || null,
        permissions: permsToSave,
        is_system: false,
        is_protected: false,
        is_active: true,
      });
      if (error) throw error;
      setNewLevelName(''); setNewLevelDesc(''); setNewLevelPerms({});
      setShowAddAccessLevel(false);
      await fetchAccessLevelTypes();
    } catch { alert('Failed to add access level'); }
  };

  const startEditLevel = (level: AccessLevelType) => {
    setEditingLevel(level.id);
    setEditPerms({ ...level.permissions });
    setEditDesc(level.description || '');
    setExpandedLevel(level.id);
  };

  const handleSaveEdit = async (level: AccessLevelType) => {
    setSaving(true);
    try {
      // Always keep dashboard_employee for non-full-admin levels
      const permsToSave = level.name === 'Full Admin'
        ? editPerms
        : { dashboard_employee: true, ...editPerms };

      const { error } = await supabase.from('access_level_types').update({
        description: editDesc.trim() || null,
        permissions: permsToSave,
        updated_at: new Date().toISOString(),
      }).eq('id', level.id);
      if (error) throw error;
      setEditingLevel(null);
      await fetchAccessLevelTypes();
    } catch { alert('Failed to save changes'); }
    finally { setSaving(false); }
  };

  const handleDeleteAccessLevel = async (level: AccessLevelType) => {
    if (level.is_protected) {
      alert(`"${level.name}" is a protected access level and cannot be deleted.`);
      return;
    }
    if (!confirm(`Delete access level "${level.name}"? Users assigned this level will lose it.`)) return;
    try {
      const { error } = await supabase.from('access_level_types').delete().eq('id', level.id);
      if (error) throw error;
      await fetchAccessLevelTypes();
    } catch { alert('Failed to delete access level'); }
  };

  const togglePerm = (
    key: string,
    current: Record<string, boolean>,
    set: React.Dispatch<React.SetStateAction<Record<string, boolean>>>
  ) => {
    set(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const countPerms = (perms: Record<string, boolean>) =>
    ALL_PERMISSION_KEYS.filter(k => perms[k]).length;

  if (loading) return <div className="text-center py-8 text-slate-500">Loading...</div>;

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-900">Organisation Settings</h2>
        <p className="text-slate-500 mt-1">Manage departments, job titles and access level configurations</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-0 border-b border-slate-200 mb-6">
        {([
          { key: 'departments', icon: Building, label: 'Departments' },
          { key: 'job_titles', icon: Briefcase, label: 'Job Titles' },
          { key: 'access_levels', icon: Shield, label: 'Access Level Types' },
        ] as const).map(({ key, icon: Icon, label }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex items-center gap-2 px-5 py-3 font-medium text-sm transition-colors border-b-2 -mb-px ${
              activeTab === key
                ? 'text-blue-600 border-blue-600'
                : 'text-slate-500 border-transparent hover:text-slate-800'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* ── Departments ─────────────────────────────────────────── */}
      {activeTab === 'departments' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-slate-900">Departments</h3>
            <button onClick={() => setShowAddDept(true)} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium transition-colors">
              <Plus className="w-4 h-4" /> Add Department
            </button>
          </div>

          {showAddDept && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-3">
              <input type="text" placeholder="Department name" value={newDeptName} onChange={e => setNewDeptName(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
              <input type="text" placeholder="Description (optional)" value={newDeptDesc} onChange={e => setNewDeptDesc(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
              <div className="flex gap-2">
                <button onClick={handleAddDepartment} className="flex items-center gap-2 bg-green-600 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-green-700"><Check className="w-3.5 h-3.5" /> Save</button>
                <button onClick={() => { setShowAddDept(false); setNewDeptName(''); setNewDeptDesc(''); }} className="flex items-center gap-2 bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg text-sm hover:bg-slate-300"><X className="w-3.5 h-3.5" /> Cancel</button>
              </div>
            </div>
          )}

          <div className="grid gap-2">
            {departments.map(dept => (
              <div key={dept.id} className={`bg-white border rounded-xl p-4 flex items-center justify-between ${dept.active ? 'border-slate-200' : 'border-slate-300 opacity-60'}`}>
                <div>
                  <p className="font-medium text-slate-900">{dept.name}</p>
                  {dept.description && <p className="text-sm text-slate-500 mt-0.5">{dept.description}</p>}
                  {!dept.active && <span className="text-xs bg-slate-200 text-slate-600 px-2 py-0.5 rounded mt-1 inline-block">Inactive</span>}
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => handleToggleDeptActive(dept.id, dept.active)} className={`px-3 py-1 rounded-lg text-xs font-medium ${dept.active ? 'bg-amber-100 text-amber-800 hover:bg-amber-200' : 'bg-green-100 text-green-800 hover:bg-green-200'}`}>{dept.active ? 'Deactivate' : 'Activate'}</button>
                  <button onClick={() => handleDeleteDept(dept.id)} className="text-red-500 hover:text-red-700 p-1.5"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Job Titles ───────────────────────────────────────────── */}
      {activeTab === 'job_titles' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-slate-900">Job Titles</h3>
            <button onClick={() => setShowAddTitle(true)} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium transition-colors">
              <Plus className="w-4 h-4" /> Add Job Title
            </button>
          </div>

          {showAddTitle && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-3">
              <input type="text" placeholder="Job title" value={newTitleName} onChange={e => setNewTitleName(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
              <input type="text" placeholder="Description (optional)" value={newTitleDesc} onChange={e => setNewTitleDesc(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
              <div className="flex gap-2">
                <button onClick={handleAddJobTitle} className="flex items-center gap-2 bg-green-600 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-green-700"><Check className="w-3.5 h-3.5" /> Save</button>
                <button onClick={() => { setShowAddTitle(false); setNewTitleName(''); setNewTitleDesc(''); }} className="flex items-center gap-2 bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg text-sm hover:bg-slate-300"><X className="w-3.5 h-3.5" /> Cancel</button>
              </div>
            </div>
          )}

          <div className="grid gap-2">
            {jobTitles.map(title => (
              <div key={title.id} className={`bg-white border rounded-xl p-4 flex items-center justify-between ${title.active ? 'border-slate-200' : 'border-slate-300 opacity-60'}`}>
                <div>
                  <p className="font-medium text-slate-900">{title.title}</p>
                  {title.description && <p className="text-sm text-slate-500 mt-0.5">{title.description}</p>}
                  {!title.active && <span className="text-xs bg-slate-200 text-slate-600 px-2 py-0.5 rounded mt-1 inline-block">Inactive</span>}
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => handleToggleTitleActive(title.id, title.active)} className={`px-3 py-1 rounded-lg text-xs font-medium ${title.active ? 'bg-amber-100 text-amber-800 hover:bg-amber-200' : 'bg-green-100 text-green-800 hover:bg-green-200'}`}>{title.active ? 'Deactivate' : 'Activate'}</button>
                  <button onClick={() => handleDeleteTitle(title.id)} className="text-red-500 hover:text-red-700 p-1.5"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Access Level Types ───────────────────────────────────── */}
      {activeTab === 'access_levels' && (
        <div className="space-y-5">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Access Level Types</h3>
              <p className="text-sm text-slate-500 mt-0.5">Configure which views and features each access level can access. Employee access is the baseline for all users.</p>
            </div>
            <button
              onClick={() => { setShowAddAccessLevel(true); setNewLevelPerms({}); }}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium transition-colors"
            >
              <Plus className="w-4 h-4" /> New Access Level
            </button>
          </div>

          {/* ── New access level form ── */}
          {showAddAccessLevel && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 space-y-4">
              <h4 className="font-semibold text-slate-800">New Access Level</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="text"
                  placeholder="Name (e.g. Senior Manager)"
                  value={newLevelName}
                  onChange={e => setNewLevelName(e.target.value)}
                  className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
                <input
                  type="text"
                  placeholder="Description (optional)"
                  value={newLevelDesc}
                  onChange={e => setNewLevelDesc(e.target.value)}
                  className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
              <PermissionsChecklist
                perms={newLevelPerms}
                locked={{ dashboard_employee: true }}
                onChange={(key) => togglePerm(key, newLevelPerms, setNewLevelPerms)}
              />
              <div className="flex gap-2 pt-1">
                <button onClick={handleAddAccessLevel} disabled={!newLevelName.trim()} className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-40 transition-colors"><Check className="w-4 h-4" /> Create</button>
                <button onClick={() => { setShowAddAccessLevel(false); setNewLevelName(''); setNewLevelDesc(''); setNewLevelPerms({}); }} className="flex items-center gap-2 bg-slate-200 text-slate-700 px-4 py-2 rounded-lg text-sm hover:bg-slate-300"><X className="w-4 h-4" /> Cancel</button>
              </div>
            </div>
          )}

          {/* ── Access level cards ── */}
          <div className="space-y-3">
            {accessLevelTypes.map(level => {
              const isExpanded = expandedLevel === level.id;
              const isEditing = editingLevel === level.id;
              const grantedCount = countPerms(level.permissions);
              const isFullAdmin = level.name === 'Full Admin';

              return (
                <div key={level.id} className={`bg-white border rounded-xl overflow-hidden transition-shadow ${isExpanded ? 'shadow-sm border-slate-300' : 'border-slate-200'}`}>
                  {/* Card header */}
                  <button
                    className="w-full text-left px-5 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
                    onClick={() => {
                      if (isEditing) return;
                      setExpandedLevel(isExpanded ? null : level.id);
                    }}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`p-2 rounded-lg ${isFullAdmin ? 'bg-slate-800' : 'bg-blue-50'}`}>
                        {isFullAdmin ? <Lock className="w-4 h-4 text-white" /> : <Shield className="w-4 h-4 text-blue-600" />}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-slate-900">{level.name}</span>
                          {level.is_protected && (
                            <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium border border-slate-200">Protected</span>
                          )}
                          {level.is_system && !level.is_protected && (
                            <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-medium border border-blue-200">System</span>
                          )}
                          {!level.is_active && (
                            <span className="text-xs bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full">Inactive</span>
                          )}
                        </div>
                        {level.description && <p className="text-sm text-slate-500 mt-0.5 truncate">{level.description}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0 ml-3">
                      <span className="text-xs text-slate-400 font-medium">{grantedCount} permission{grantedCount !== 1 ? 's' : ''}</span>
                      {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                    </div>
                  </button>

                  {/* Expanded permissions */}
                  {isExpanded && (
                    <div className="border-t border-slate-100 px-5 pb-5 pt-4 bg-slate-50/40 space-y-4">
                      {isEditing ? (
                        <>
                          <div>
                            <label className="text-xs font-medium text-slate-600 mb-1 block">Description</label>
                            <input
                              type="text"
                              value={editDesc}
                              onChange={e => setEditDesc(e.target.value)}
                              placeholder="Optional description"
                              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-400 focus:outline-none"
                            />
                          </div>
                          {isFullAdmin ? (
                            <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
                              <AlertCircle className="w-4 h-4 shrink-0" />
                              Full Admin has all permissions by design and cannot be restricted.
                            </div>
                          ) : (
                            <PermissionsChecklist
                              perms={editPerms}
                              locked={{ dashboard_employee: true }}
                              onChange={(key) => togglePerm(key, editPerms, setEditPerms)}
                            />
                          )}
                          <div className="flex gap-2 pt-1">
                            <button onClick={() => handleSaveEdit(level)} disabled={saving} className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-700 disabled:opacity-40 transition-colors">
                              {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Check className="w-4 h-4" />}
                              Save changes
                            </button>
                            <button onClick={() => setEditingLevel(null)} className="flex items-center gap-2 bg-slate-200 text-slate-700 px-4 py-2 rounded-lg text-sm hover:bg-slate-300"><X className="w-4 h-4" /> Cancel</button>
                          </div>
                        </>
                      ) : (
                        <>
                          {/* Read-only permission summary */}
                          <div className="space-y-3">
                            {PERMISSION_GROUPS.map(group => {
                              const granted = group.items.filter(i => level.permissions[i.key]);
                              if (granted.length === 0) return null;
                              return (
                                <div key={group.group}>
                                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">{group.group}</p>
                                  <div className="flex flex-wrap gap-1.5">
                                    {granted.map(item => (
                                      <span key={item.key} className="text-xs bg-green-50 text-green-800 border border-green-200 px-2 py-0.5 rounded-full">
                                        {item.label}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              );
                            })}
                            {grantedCount === 0 && (
                              <p className="text-sm text-slate-400 italic">No permissions configured yet.</p>
                            )}
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
                            <button
                              onClick={() => startEditLevel(level)}
                              className="flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors"
                            >
                              <Edit3 className="w-4 h-4" /> Edit permissions
                            </button>
                            {!level.is_protected && (
                              <button
                                onClick={() => handleDeleteAccessLevel(level)}
                                className="flex items-center gap-1.5 text-sm font-medium text-red-500 hover:text-red-700 transition-colors ml-auto"
                              >
                                <Trash2 className="w-4 h-4" /> Delete
                              </button>
                            )}
                            {level.is_protected && (
                              <span className="flex items-center gap-1.5 text-xs text-slate-400 ml-auto">
                                <Lock className="w-3.5 h-3.5" /> Cannot be deleted
                              </span>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Permissions checklist sub-component ──────────────────────────────────

interface PermissionsChecklistProps {
  perms: Record<string, boolean>;
  locked: Record<string, boolean>;
  onChange: (key: string) => void;
}

function PermissionsChecklist({ perms, locked, onChange }: PermissionsChecklistProps) {
  return (
    <div className="space-y-4">
      {PERMISSION_GROUPS.map(group => (
        <div key={group.group}>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">{group.group}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            {group.items.map(item => {
              const isLocked = locked[item.key];
              const isChecked = isLocked || !!perms[item.key];
              return (
                <label
                  key={item.key}
                  className={`flex items-start gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-colors ${
                    isLocked
                      ? 'bg-slate-50 border-slate-200 opacity-70 cursor-not-allowed'
                      : isChecked
                      ? 'bg-blue-50 border-blue-200 hover:bg-blue-100'
                      : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    disabled={isLocked}
                    onChange={() => !isLocked && onChange(item.key)}
                    className="mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-400 shrink-0"
                  />
                  <div className="min-w-0">
                    <p className={`text-sm font-medium ${isChecked ? 'text-slate-900' : 'text-slate-600'}`}>{item.label}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{item.description}</p>
                  </div>
                </label>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
