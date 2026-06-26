import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Plus, Trash2, User, Shield, ToggleLeft, ToggleRight, Gavel } from 'lucide-react';

interface Assignment {
  id: string;
  assignment_type: 'user' | 'access_level';
  user_id: string | null;
  access_level_id: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  user_profile?: { full_name: string; job_title: string; department: string } | null;
  access_level?: { name: string; description: string } | null;
}

interface Profile {
  id: string;
  full_name: string;
  job_title: string | null;
  department: string | null;
  role: string;
}

interface AccessLevel {
  id: string;
  name: string;
  description: string | null;
}

export default function ExecModeratorManagement() {
  const { effectiveProfile: profile } = useAuth();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [allProfiles, setAllProfiles] = useState<Profile[]>([]);
  const [accessLevels, setAccessLevels] = useState<AccessLevel[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [formType, setFormType] = useState<'user' | 'access_level'>('user');
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedAccessLevelId, setSelectedAccessLevelId] = useState('');
  const [formNotes, setFormNotes] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [{ data: assignData }, { data: profileData }, { data: levelData }] = await Promise.all([
        supabase
          .from('exec_moderator_assignments')
          .select('*')
          .order('created_at', { ascending: false }),
        supabase
          .from('profiles')
          .select('id, full_name, job_title, department, role')
          .eq('active', true)
          .order('full_name'),
        supabase
          .from('access_level_types')
          .select('id, name, description')
          .eq('is_active', true)
          .order('name'),
      ]);

      setAllProfiles(profileData || []);
      setAccessLevels(levelData || []);

      if (assignData) {
        const profileMap: Record<string, any> = {};
        const levelMap: Record<string, any> = {};
        (profileData || []).forEach(p => { profileMap[p.id] = p; });
        (levelData || []).forEach(l => { levelMap[l.id] = l; });

        setAssignments(assignData.map(a => ({
          ...a,
          user_profile: a.user_id ? (profileMap[a.user_id] || null) : null,
          access_level: a.access_level_id ? (levelMap[a.access_level_id] || null) : null,
        })));
      }
    } finally {
      setLoading(false);
    }
  }

  async function createAssignment() {
    if (!profile?.id) return;
    if (formType === 'user' && !selectedUserId) return;
    if (formType === 'access_level' && !selectedAccessLevelId) return;

    setSaving(true);
    try {
      await supabase.from('exec_moderator_assignments').insert({
        assignment_type: formType,
        user_id: formType === 'user' ? selectedUserId : null,
        access_level_id: formType === 'access_level' ? selectedAccessLevelId : null,
        assigned_by: profile.id,
        notes: formNotes.trim() || null,
        is_active: true,
      });
      setShowForm(false);
      setSelectedUserId('');
      setSelectedAccessLevelId('');
      setFormNotes('');
      await loadData();
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(a: Assignment) {
    await supabase
      .from('exec_moderator_assignments')
      .update({ is_active: !a.is_active })
      .eq('id', a.id);
    await loadData();
  }

  async function deleteAssignment(id: string) {
    if (!confirm('Remove this exec moderation assignment?')) return;
    await supabase.from('exec_moderator_assignments').delete().eq('id', id);
    await loadData();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="w-6 h-6 border-2 border-slate-300 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-slate-800 rounded-xl">
            <Gavel className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">Executive Moderator Access</h2>
            <p className="text-sm text-slate-500">
              Grant specific users or access levels permission to perform executive-level moderation.
              Users with org-level roles (Admin, Leadership, Senior) always have access.
            </p>
          </div>
        </div>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-700 transition-colors text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            Add Assignment
          </button>
        )}
      </div>

      {showForm && (
        <div className="p-5 bg-slate-50 border border-slate-200 rounded-xl space-y-4">
          <p className="text-sm font-semibold text-slate-800">New Exec Moderator Assignment</p>

          <div className="flex gap-2">
            <button
              onClick={() => setFormType('user')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-all ${
                formType === 'user'
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
              }`}
            >
              <User className="w-4 h-4" />
              Specific User
            </button>
            <button
              onClick={() => setFormType('access_level')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-all ${
                formType === 'access_level'
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
              }`}
            >
              <Shield className="w-4 h-4" />
              Access Level
            </button>
          </div>

          {formType === 'user' && (
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Select User</label>
              <select
                value={selectedUserId}
                onChange={e => setSelectedUserId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-slate-400"
              >
                <option value="">— choose a user —</option>
                {allProfiles.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.full_name}{p.job_title ? ` — ${p.job_title}` : ''}{p.department ? ` (${p.department})` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          {formType === 'access_level' && (
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Select Access Level</label>
              <select
                value={selectedAccessLevelId}
                onChange={e => setSelectedAccessLevelId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-slate-400"
              >
                <option value="">— choose an access level —</option>
                {accessLevels.map(l => (
                  <option key={l.id} value={l.id}>{l.name}{l.description ? ` — ${l.description}` : ''}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Notes (optional)</label>
            <input
              type="text"
              value={formNotes}
              onChange={e => setFormNotes(e.target.value)}
              placeholder="Reason for this assignment..."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-slate-400"
            />
          </div>

          <div className="flex items-center gap-3 pt-1">
            <button
              onClick={createAssignment}
              disabled={saving || (formType === 'user' ? !selectedUserId : !selectedAccessLevelId)}
              className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-700 text-sm font-medium disabled:opacity-50 transition-colors"
            >
              {saving ? 'Saving...' : 'Save Assignment'}
            </button>
            <button
              onClick={() => { setShowForm(false); setSelectedUserId(''); setSelectedAccessLevelId(''); setFormNotes(''); }}
              className="px-4 py-2 text-slate-600 hover:text-slate-900 text-sm font-medium"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {assignments.length === 0 ? (
        <div className="p-10 text-center border-2 border-dashed border-slate-200 rounded-xl">
          <Gavel className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="font-medium text-slate-600">No exec moderator assignments</p>
          <p className="text-sm text-slate-400 mt-1">
            Add assignments to grant exec moderation access to specific users or entire access levels.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {assignments.map(a => (
            <div
              key={a.id}
              className={`flex items-center justify-between p-4 rounded-xl border transition-opacity ${
                a.is_active ? 'bg-white border-slate-200' : 'bg-slate-50 border-slate-100 opacity-60'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className={`p-2 rounded-lg shrink-0 ${
                  a.assignment_type === 'user' ? 'bg-blue-100' : 'bg-teal-100'
                }`}>
                  {a.assignment_type === 'user'
                    ? <User className="w-4 h-4 text-blue-600" />
                    : <Shield className="w-4 h-4 text-teal-600" />
                  }
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900">
                    {a.assignment_type === 'user'
                      ? (a.user_profile?.full_name || a.user_id)
                      : (a.access_level?.name || a.access_level_id)
                    }
                  </p>
                  <p className="text-xs text-slate-500">
                    {a.assignment_type === 'user'
                      ? `${a.user_profile?.job_title || ''}${a.user_profile?.department ? ` · ${a.user_profile.department}` : ''}`
                      : 'Access Level'
                    }
                    {a.notes && ` · ${a.notes}`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0 ml-3">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  a.is_active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
                }`}>
                  {a.is_active ? 'Active' : 'Inactive'}
                </span>
                <button
                  onClick={() => toggleActive(a)}
                  className="p-1 text-slate-400 hover:text-slate-700"
                  title={a.is_active ? 'Deactivate' : 'Activate'}
                >
                  {a.is_active
                    ? <ToggleRight className="w-5 h-5 text-green-500" />
                    : <ToggleLeft className="w-5 h-5" />
                  }
                </button>
                <button
                  onClick={() => deleteAssignment(a.id)}
                  className="p-1 text-slate-400 hover:text-rose-600"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
