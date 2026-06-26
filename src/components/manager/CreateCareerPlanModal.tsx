import { useState, useEffect } from 'react';
import { X, Target, User, Plus, Trash2, Calendar, ChevronRight, CheckCircle, Save } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface Employee {
  id: string;
  full_name: string;
  job_title: string | null;
  department: string | null;
}

interface JobFamily {
  id: string;
  title: string;
  department: string;
  level: string;
}

interface ActionDraft {
  title: string;
  description: string;
  owner_name: string;
  due_date: string;
}

interface Props {
  onClose: () => void;
  onCreated: () => void;
}

const EMPTY_ACTION: ActionDraft = { title: '', description: '', owner_name: '', due_date: '' };

type Step = 'details' | 'wayforward';

export default function CreateCareerPlanModal({ onClose, onCreated }: Props) {
  const { profile, user } = useAuth();
  const isAdmin = profile?.role === 'admin';
  const isDeptLead = profile?.role === 'leadership' || profile?.role === 'dept_lead';

  const [step, setStep] = useState<Step>('details');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [jobFamilies, setJobFamilies] = useState<JobFamily[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Details step
  const [employeeId, setEmployeeId] = useState('');
  const [targetJobFamilyId, setTargetJobFamilyId] = useState('');
  const [planTitle, setPlanTitle] = useState('');
  const [planDescription, setPlanDescription] = useState('');
  const [goalRoleTitle, setGoalRoleTitle] = useState('');
  const [timelineMonths, setTimelineMonths] = useState(12);
  const [notes, setNotes] = useState('');

  // Way Forward step
  const [objectives, setObjectives] = useState<string[]>(['']);
  const [actions, setActions] = useState<ActionDraft[]>([{ ...EMPTY_ACTION }]);
  const [wfNotes, setWfNotes] = useState('');

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    if (!profile?.id) return;
    setLoading(true);
    try {
      let empQuery = supabase
        .from('profiles')
        .select('id, full_name, job_title, department')
        .eq('active', true)
        .order('full_name');

      if (isAdmin) {
        // all active employees
      } else if (isDeptLead && profile.department) {
        empQuery = empQuery.eq('department', profile.department);
      } else {
        empQuery = empQuery.eq('manager_id', profile.id);
      }

      const [empRes, jfRes] = await Promise.all([
        empQuery,
        supabase.from('job_families').select('id, title, department, level').order('department').order('title'),
      ]);

      setEmployees(empRes.data || []);
      setJobFamilies(jfRes.data || []);
    } catch (err) {
      console.error('CreateCareerPlanModal load error:', err);
    } finally {
      setLoading(false);
    }
  }

  function handleJobFamilyChange(jfId: string) {
    setTargetJobFamilyId(jfId);
    const jf = jobFamilies.find(j => j.id === jfId);
    if (jf) {
      setGoalRoleTitle(jf.title);
      if (!planTitle) setPlanTitle(`${jf.title} Career Plan`);
    }
  }

  function canProceedToWayForward() {
    return !!employeeId && !!targetJobFamilyId && !!planTitle.trim();
  }

  async function save(targetStatus: 'draft' | 'active') {
    if (!employeeId || !targetJobFamilyId || !profile?.id || !user?.id) return;
    setSaving(true);
    try {
      const jf = jobFamilies.find(j => j.id === targetJobFamilyId);
      const filledObjectives = objectives.filter(o => o.trim());
      const createdByRole = isAdmin ? 'admin' : isDeptLead ? 'manager' : 'manager';

      const { data: newPlan, error } = await supabase.from('career_plans').insert({
        user_id: employeeId,
        profile_id: employeeId,
        target_job_family_id: targetJobFamilyId,
        plan_title: planTitle.trim() || null,
        plan_description: planDescription.trim() || null,
        goal_role_title: goalRoleTitle || jf?.title || '',
        goal_role_custom_title: goalRoleTitle || jf?.title || '',
        target_level: jf?.level || '',
        target_department: jf?.department || '',
        recommended_timeline_months: timelineMonths || null,
        status: targetStatus,
        started_from: createdByRole,
        current_owner_stage: targetStatus === 'active' ? 'completed' : 'manager',
        manager_id: !isAdmin ? profile.id : null,
        created_by_role: createdByRole,
        created_by_user_id: profile.id,
        created_by_name: profile.full_name || '',
        initiator_notes: notes.trim() || null,
        is_manual: true,
        skills_gaps: [],
        recommended_training: [],
        way_forward_objectives: filledObjectives.length > 0 ? filledObjectives : [],
        way_forward_notes: wfNotes.trim() || null,
        way_forward_confirmed_at: targetStatus === 'active' ? new Date().toISOString() : null,
        way_forward_confirmed_by: targetStatus === 'active' ? profile.id : null,
        manager_comments: notes.trim() || null,
      }).select('id').maybeSingle();

      if (error) throw error;

      // Insert actions
      const validActions = actions.filter(a => a.title.trim());
      if (newPlan?.id && validActions.length > 0) {
        await supabase.from('career_plan_actions').insert(
          validActions.map(a => ({
            plan_id: newPlan.id,
            title: a.title.trim(),
            description: a.description.trim() || null,
            owner_name: a.owner_name.trim() || null,
            due_date: a.due_date || null,
            source: 'manager',
            added_by: user.id,
          }))
        );
      }

      // Notify the employee when plan goes active
      if (newPlan?.id && targetStatus === 'active') {
        await supabase.from('career_plan_notifications').insert({
          career_plan_id: newPlan.id,
          recipient_id: employeeId,
          sender_id: user.id,
          notification_type: 'way_forward_confirmed',
          message: `${profile.full_name || 'Your manager'} has created and activated a Career Plan for you targeting ${goalRoleTitle || jf?.title || 'a new role'}.`,
        });
      }

      onCreated();
    } catch (err) {
      console.error('Failed to create career plan:', err);
      alert('Failed to create career plan. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  const selectedEmployee = employees.find(e => e.id === employeeId);
  const selectedJf = jobFamilies.find(j => j.id === targetJobFamilyId);

  const deptGroups = [...new Set(jobFamilies.map(j => j.department))].sort();

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-teal-50 rounded-lg">
              <Target className="w-4 h-4 text-teal-600" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900">Create Career Plan</h2>
              <p className="text-xs text-gray-400 mt-0.5">
                {step === 'details' ? 'Step 1 of 2 — Plan Details' : 'Step 2 of 2 — Way Forward'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {/* Step indicator */}
        <div className="px-6 pt-4 pb-0 flex-shrink-0">
          <div className="flex items-center gap-2">
            {(['details', 'wayforward'] as Step[]).map((s, i) => (
              <div key={s} className="flex items-center gap-2">
                {i > 0 && <div className="w-6 h-px bg-gray-200" />}
                <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                  step === s
                    ? 'bg-teal-100 text-teal-700'
                    : step === 'wayforward' && s === 'details'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-400'
                }`}>
                  {step === 'wayforward' && s === 'details'
                    ? <CheckCircle className="w-3 h-3" />
                    : <span>{i + 1}</span>}
                  {s === 'details' ? 'Plan Details' : 'Way Forward'}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 border-2 border-teal-200 border-t-teal-600 rounded-full animate-spin" />
            </div>
          ) : employees.length === 0 ? (
            <div className="text-center py-6 text-gray-500 text-sm">
              No team members found in your {isDeptLead ? 'department' : 'direct reports'}.
            </div>
          ) : step === 'details' ? (
            <div className="space-y-4">
              {/* Employee */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Employee <span className="text-red-500">*</span>
                </label>
                <select
                  value={employeeId}
                  onChange={e => setEmployeeId(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  <option value="">Select a team member…</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>
                      {emp.full_name}{emp.job_title ? ` — ${emp.job_title}` : ''}
                    </option>
                  ))}
                </select>
                {selectedEmployee?.department && (
                  <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                    <User className="w-3 h-3" />
                    {selectedEmployee.department}
                  </p>
                )}
              </div>

              {/* Target Role */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Target Role <span className="text-red-500">*</span>
                </label>
                <select
                  value={targetJobFamilyId}
                  onChange={e => handleJobFamilyChange(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  <option value="">Select a target role…</option>
                  {deptGroups.map(dept => (
                    <optgroup key={dept} label={dept}>
                      {jobFamilies.filter(j => j.department === dept).map(jf => (
                        <option key={jf.id} value={jf.id}>{jf.title}{jf.level ? ` (${jf.level})` : ''}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
                {selectedJf && (
                  <p className="text-xs text-gray-400 mt-1">{selectedJf.department} · {selectedJf.level}</p>
                )}
              </div>

              {/* Plan Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Plan Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={planTitle}
                  onChange={e => setPlanTitle(e.target.value)}
                  placeholder="e.g. Product Manager Career Plan 2026"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              {/* Role Title Override */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Target Role Title</label>
                <input
                  type="text"
                  value={goalRoleTitle}
                  onChange={e => setGoalRoleTitle(e.target.value)}
                  placeholder="Auto-filled from role selection"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              {/* Plan Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Plan Description</label>
                <textarea
                  value={planDescription}
                  onChange={e => setPlanDescription(e.target.value)}
                  rows={2}
                  placeholder="Brief description of this career plan and its goals…"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
                />
              </div>

              {/* Timeline */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Suggested Timeline (months)</label>
                <input
                  type="number"
                  value={timelineMonths}
                  onChange={e => setTimelineMonths(Number(e.target.value))}
                  min={1} max={60}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Notes (optional)</label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  rows={2}
                  placeholder="Any context, motivation or background for this plan…"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
                />
              </div>
            </div>
          ) : (
            /* Way Forward step */
            <div className="space-y-6">
              {/* Summary banner */}
              <div className="bg-teal-50 border border-teal-200 rounded-lg px-4 py-3 flex items-center gap-3">
                <Target className="w-4 h-4 text-teal-600 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-teal-900 truncate">{planTitle}</p>
                  <p className="text-xs text-teal-700">
                    {selectedEmployee?.full_name} → {goalRoleTitle || selectedJf?.title}
                  </p>
                </div>
              </div>

              {/* Objectives */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-semibold text-gray-900">Objectives</label>
                  <button
                    type="button"
                    onClick={() => setObjectives(p => [...p, ''])}
                    className="text-xs text-teal-600 hover:text-teal-800 font-medium flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" /> Add objective
                  </button>
                </div>
                <div className="space-y-2">
                  {objectives.map((obj, i) => (
                    <div key={i} className="flex gap-2">
                      <input
                        type="text"
                        value={obj}
                        onChange={e => setObjectives(p => p.map((o, j) => j === i ? e.target.value : o))}
                        placeholder={`Objective ${i + 1}…`}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                      />
                      {objectives.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setObjectives(p => p.filter((_, j) => j !== i))}
                          className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-semibold text-gray-900">Actions</label>
                  <button
                    type="button"
                    onClick={() => setActions(p => [...p, { ...EMPTY_ACTION }])}
                    className="text-xs text-teal-600 hover:text-teal-800 font-medium flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" /> Add action
                  </button>
                </div>
                <div className="space-y-3">
                  {actions.map((action, i) => (
                    <div key={i} className="bg-gray-50 border border-gray-200 rounded-lg p-3 space-y-2">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={action.title}
                          onChange={e => setActions(p => p.map((a, j) => j === i ? { ...a, title: e.target.value } : a))}
                          placeholder="Action title…"
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 bg-white"
                        />
                        {actions.length > 1 && (
                          <button
                            type="button"
                            onClick={() => setActions(p => p.filter((_, j) => j !== i))}
                            className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                      <input
                        type="text"
                        value={action.description}
                        onChange={e => setActions(p => p.map((a, j) => j === i ? { ...a, description: e.target.value } : a))}
                        placeholder="Description (optional)…"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 bg-white"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <div className="flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                          <input
                            type="text"
                            value={action.owner_name}
                            onChange={e => setActions(p => p.map((a, j) => j === i ? { ...a, owner_name: e.target.value } : a))}
                            placeholder="Owner name…"
                            className="flex-1 px-2.5 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 bg-white"
                          />
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                          <input
                            type="date"
                            value={action.due_date}
                            onChange={e => setActions(p => p.map((a, j) => j === i ? { ...a, due_date: e.target.value } : a))}
                            className="flex-1 px-2.5 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 bg-white"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Way Forward notes */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-1.5">Way Forward Notes (optional)</label>
                <textarea
                  value={wfNotes}
                  onChange={e => setWfNotes(e.target.value)}
                  rows={2}
                  placeholder="Summarise the agreed way forward, any conditions or key milestones…"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 resize-none"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex-shrink-0">
          {step === 'details' ? (
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => setStep('wayforward')}
                disabled={!canProceedToWayForward()}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next: Way Forward
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setStep('details')}
                className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                ← Back
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => save('draft')}
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {saving ? 'Saving…' : 'Save Draft'}
                </button>
                <button
                  type="button"
                  onClick={() => save('active')}
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50"
                >
                  <CheckCircle className="w-4 h-4" />
                  {saving ? 'Saving…' : 'Confirm Plan'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
