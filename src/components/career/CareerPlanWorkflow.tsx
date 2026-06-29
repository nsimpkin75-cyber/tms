import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { CheckCircle, Plus, X, CreditCard as Edit2, Save, Calendar, MessageSquare, Sparkles, TrendingUp, AlertCircle, User, ArrowRight, Flag, ClipboardCheck, Lock } from 'lucide-react';

interface CareerPlan {
  id: string;
  user_id: string | null;
  profile_id: string;
  goal_role_title: string | null;
  goal_role_custom_title: string | null;
  target_department: string | null;
  status: string;
  confirmed_at: string | null;
  sent_to_manager_at: string | null;
  manager_reviewed_at: string | null;
  manager_comments: string | null;
  dept_lead_notes: string | null;
  sera_readiness_result: any;
  sera_recommendations: any[];
  skills_gaps: string[];
  reality_data: any;
  started_from: string | null;
  initiator_notes: string | null;
  way_forward_objectives: any[];
  way_forward_notes: string | null;
  way_forward_confirmed_at: string | null;
  target_job_family: { title: string; department: string; level: string } | null;
  employee: { full_name: string; job_title: string | null; department: string | null } | null;
}

interface ActionRow {
  title: string;
  description: string;
  owner_id: string;
  due_date: string;
}

interface Action {
  id: string;
  plan_id: string;
  title: string;
  description: string | null;
  source: 'sera' | 'manager' | 'employee' | 'dept_lead';
  due_date: string | null;
  completed_at: string | null;
  completed_by: string | null;
  notes: string | null;
  added_by: string;
  owner_id: string | null;
  owner_name: string | null;
}

interface SelectableUser {
  id: string;
  full_name: string;
  role: string;
}

interface CareerPlanWorkflowProps {
  planId: string;
  viewerRole: 'employee' | 'manager' | 'dept_lead' | 'admin';
  onClose?: () => void;
}

const SOURCE_LABELS: Record<string, string> = {
  sera: 'Opal',
  manager: 'Manager',
  employee: 'Employee',
  dept_lead: 'Dept Lead',
};

const SOURCE_COLORS: Record<string, string> = {
  sera: 'bg-teal-100 text-teal-700',
  manager: 'bg-blue-100 text-blue-700',
  employee: 'bg-green-100 text-green-700',
  dept_lead: 'bg-amber-100 text-amber-700',
};

export function CareerPlanWorkflow({ planId, viewerRole, onClose }: CareerPlanWorkflowProps) {
  const { user, profile } = useAuth();
  const [plan, setPlan] = useState<CareerPlan | null>(null);
  const [actions, setActions] = useState<Action[]>([]);
  const [selectableUsers, setSelectableUsers] = useState<SelectableUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Add action form
  const [showAddAction, setShowAddAction] = useState(false);
  const [newActionTitle, setNewActionTitle] = useState('');
  const [newActionDesc, setNewActionDesc] = useState('');
  const [newActionDue, setNewActionDue] = useState('');
  const [newActionOwnerId, setNewActionOwnerId] = useState('');

  // Edit action
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editDue, setEditDue] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editOwnerId, setEditOwnerId] = useState('');

  // Manager notes
  const [managerNotes, setManagerNotes] = useState('');
  const [editingManagerNotes, setEditingManagerNotes] = useState(false);

  // Dept lead notes
  const [deptLeadNotes, setDeptLeadNotes] = useState('');
  const [editingDeptNotes, setEditingDeptNotes] = useState(false);

  // Way Forward confirmation
  const [showWayForwardPanel, setShowWayForwardPanel] = useState(false);
  const [wfObjectives, setWfObjectives] = useState<string[]>(['']);
  const [wfNotes, setWfNotes] = useState('');
  const [confirmingWayForward, setConfirmingWayForward] = useState(false);

  // Plan confirmation (admin-created)
  const [showConfirmationPanel, setShowConfirmationPanel] = useState(false);
  const [confirmObjectives, setConfirmObjectives] = useState<string[]>(['']);
  const [confirmActions, setConfirmActions] = useState<ActionRow[]>([{ title: '', description: '', owner_id: '', due_date: '' }]);
  const [confirmNotes, setConfirmNotes] = useState('');
  const [confirmingPlan, setConfirmingPlan] = useState(false);

  useEffect(() => {
    loadPlan();
    loadActions();
    loadSelectableUsers();
  }, [planId]);

  const loadPlan = async () => {
    const { data } = await supabase
      .from('career_plans')
      .select(`
        *,
        target_job_family:job_families!career_plans_target_job_family_id_fkey(title, department, level),
        employee:profiles!career_plans_profile_id_fkey(full_name, job_title, department)
      `)
      .eq('id', planId)
      .single();

    if (data) {
      setPlan(data as unknown as CareerPlan);
      setManagerNotes(data.manager_comments || '');
      setDeptLeadNotes(data.dept_lead_notes || '');
      if (Array.isArray(data.way_forward_objectives) && data.way_forward_objectives.length > 0) {
        setWfObjectives(data.way_forward_objectives);
        setConfirmObjectives(data.way_forward_objectives.length > 0 ? [...data.way_forward_objectives] : ['']);
      }
      setWfNotes(data.way_forward_notes || '');
      if (data.way_forward_notes) setConfirmNotes(data.way_forward_notes);
    }
    setLoading(false);
  };

  const loadActions = async () => {
    const { data } = await supabase
      .from('career_plan_actions')
      .select('id, plan_id, title, description, source, due_date, completed_at, completed_by, notes, added_by, owner_id, owner_name')
      .eq('plan_id', planId)
      .order('created_at', { ascending: true });
    setActions((data || []) as Action[]);
  };

  const loadSelectableUsers = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, role')
      .eq('active', true)
      .order('full_name');
    setSelectableUsers((data || []) as SelectableUser[]);
  };

  // After any action change, re-compute progress and auto-complete plan if needed
  const updatePlanProgress = async (updatedActions: Action[]) => {
    if (!plan) return;
    const total = updatedActions.length;
    const completed = updatedActions.filter(a => a.completed_at).length;
    if (total === 0) return;

    const isAllDone = completed === total;
    const currentlyActive = plan.status === 'active' || plan.status === 'in_progress';

    if (isAllDone && currentlyActive) {
      await supabase
        .from('career_plans')
        .update({ status: 'completed', updated_at: new Date().toISOString() })
        .eq('id', planId);
      await loadPlan();
    }
  };

  const addAction = async () => {
    if (!newActionTitle.trim() || !user?.id) return;
    if (!newActionOwnerId) { alert('Please assign an Owner for this action.'); return; }
    setSaving(true);
    try {
      const ownerUser = selectableUsers.find(u => u.id === newActionOwnerId);
      await supabase.from('career_plan_actions').insert({
        plan_id: planId,
        title: newActionTitle.trim(),
        description: newActionDesc.trim() || null,
        due_date: newActionDue || null,
        source: viewerRole === 'dept_lead' ? 'dept_lead' : viewerRole === 'manager' ? 'manager' : 'employee',
        added_by: user.id,
        owner_id: newActionOwnerId,
        owner_name: ownerUser?.full_name || null,
      });
      setNewActionTitle('');
      setNewActionDesc('');
      setNewActionDue('');
      setNewActionOwnerId('');
      setShowAddAction(false);
      await loadActions();
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (action: Action) => {
    setEditingId(action.id);
    setEditTitle(action.title);
    setEditDesc(action.description || '');
    setEditDue(action.due_date || '');
    setEditNotes(action.notes || '');
    setEditOwnerId(action.owner_id || '');
  };

  const saveEdit = async () => {
    if (!editingId) return;
    setSaving(true);
    try {
      const ownerUser = selectableUsers.find(u => u.id === editOwnerId);
      await supabase
        .from('career_plan_actions')
        .update({
          title: editTitle.trim(),
          description: editDesc.trim() || null,
          due_date: editDue || null,
          notes: editNotes.trim() || null,
          owner_id: editOwnerId || null,
          owner_name: ownerUser?.full_name || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editingId);
      setEditingId(null);
      await loadActions();
    } finally {
      setSaving(false);
    }
  };

  const toggleComplete = async (action: Action) => {
    if (!user?.id) return;
    // Only the assigned owner may mark complete; uncompleting is also owner-only
    const isOwner = action.owner_id === user.id;
    const isAdmin = viewerRole === 'admin';
    if (!isOwner && !isAdmin) return;

    setSaving(true);
    try {
      const nowCompleted = !action.completed_at;
      await supabase
        .from('career_plan_actions')
        .update({
          completed_at: nowCompleted ? new Date().toISOString() : null,
          completed_by: nowCompleted ? user.id : null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', action.id);
      const refreshed = await supabase
        .from('career_plan_actions')
        .select('id, plan_id, title, description, source, due_date, completed_at, completed_by, notes, added_by, owner_id, owner_name')
        .eq('plan_id', planId)
        .order('created_at', { ascending: true });
      const updated = (refreshed.data || []) as Action[];
      setActions(updated);
      await updatePlanProgress(updated);
    } finally {
      setSaving(false);
    }
  };

  const deleteAction = async (id: string) => {
    if (!confirm('Remove this action?')) return;
    await supabase.from('career_plan_actions').delete().eq('id', id);
    await loadActions();
  };

  const saveManagerNotes = async () => {
    setSaving(true);
    try {
      await supabase
        .from('career_plans')
        .update({ manager_comments: managerNotes, manager_reviewed_at: new Date().toISOString() })
        .eq('id', planId);
      setEditingManagerNotes(false);
      await loadPlan();
    } finally {
      setSaving(false);
    }
  };

  const saveDeptNotes = async () => {
    setSaving(true);
    try {
      await supabase
        .from('career_plans')
        .update({ dept_lead_notes: deptLeadNotes, dept_lead_reviewed_at: new Date().toISOString() })
        .eq('id', planId);
      setEditingDeptNotes(false);
      await loadPlan();
    } finally {
      setSaving(false);
    }
  };

  const approvePlan = async () => {
    if (!confirm('Approve this career plan?')) return;
    setSaving(true);
    try {
      await supabase
        .from('career_plans')
        .update({
          status: 'manager_approved',
          manager_reviewed_at: new Date().toISOString(),
          manager_comments: managerNotes || null,
        })
        .eq('id', planId);
      await loadPlan();
    } finally {
      setSaving(false);
    }
  };

  const confirmWayForward = async () => {
    if (!user?.id) return;
    const filledObjectives = wfObjectives.filter(o => o.trim());
    if (filledObjectives.length === 0) {
      alert('Please add at least one objective before confirming the Way Forward.');
      return;
    }
    setConfirmingWayForward(true);
    try {
      await supabase.from('career_plans').update({
        status: 'in_progress',
        current_owner_stage: 'completed',
        way_forward_objectives: filledObjectives,
        way_forward_notes: wfNotes.trim() || null,
        way_forward_confirmed_at: new Date().toISOString(),
        way_forward_confirmed_by: user.id,
        manager_comments: managerNotes || null,
        manager_reviewed_at: new Date().toISOString(),
      }).eq('id', planId);

      if (plan?.profile_id) {
        await supabase.from('career_plan_notifications').insert({
          career_plan_id: planId,
          recipient_id: plan.profile_id,
          sender_id: user.id,
          notification_type: 'way_forward_confirmed',
          message: `${profile?.full_name || 'Your manager'} has confirmed the Way Forward for your career plan. Your plan is now active!`,
        });
      }

      setShowWayForwardPanel(false);
      await loadPlan();
    } catch (err) {
      console.error('confirmWayForward error:', err);
      alert('Failed to confirm Way Forward. Please try again.');
    } finally {
      setConfirmingWayForward(false);
    }
  };

  const confirmPlan = async () => {
    if (!user?.id) return;
    const filledObjectives = confirmObjectives.filter(o => o.trim());
    if (filledObjectives.length === 0) {
      alert('Please add at least one objective before confirming the plan.');
      return;
    }
    setConfirmingPlan(true);
    try {
      await supabase.from('career_plans').update({
        status: 'active',
        current_owner_stage: 'completed',
        way_forward_objectives: filledObjectives,
        way_forward_notes: confirmNotes.trim() || null,
        way_forward_confirmed_at: new Date().toISOString(),
        way_forward_confirmed_by: user.id,
        manager_comments: managerNotes || null,
        manager_reviewed_at: new Date().toISOString(),
      }).eq('id', planId);

      const newActs = confirmActions.filter(a => a.title.trim());
      if (newActs.length > 0) {
        await supabase.from('career_plan_actions').insert(
          newActs.map(a => {
            const ownerUser = selectableUsers.find(u => u.id === a.owner_id);
            return {
              plan_id: planId,
              title: a.title.trim(),
              description: a.description.trim() || null,
              owner_id: a.owner_id || null,
              owner_name: ownerUser?.full_name || null,
              due_date: a.due_date || null,
              source: 'manager',
              added_by: user.id,
            };
          })
        );
      }

      if (plan?.profile_id) {
        await supabase.from('career_plan_notifications').insert({
          career_plan_id: planId,
          recipient_id: plan.profile_id,
          sender_id: user.id,
          notification_type: 'plan_confirmed',
          message: `${profile?.full_name || 'Your manager'} has confirmed your career plan. Your plan is now active!`,
        });
      }

      setShowConfirmationPanel(false);
      await loadPlan();
      await loadActions();
    } catch (err) {
      console.error('confirmPlan error:', err);
      alert('Failed to confirm plan. Please try again.');
    } finally {
      setConfirmingPlan(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="inline-block w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!plan) return null;

  const completedCount = actions.filter(a => a.completed_at).length;
  const totalCount = actions.length;
  const progressPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const readiness = plan.sera_readiness_result;
  const canEdit = viewerRole !== 'dept_lead';
  const isManager = viewerRole === 'manager' || viewerRole === 'admin';
  const isDeptLead = viewerRole === 'dept_lead' || viewerRole === 'admin';
  const isPendingWayForward = plan.status === 'pending_manager_wayforward';
  const isPendingConfirmation = plan.status === 'pending_manager_confirmation';
  const isInProgress = plan.status === 'in_progress' || plan.status === 'completed' || plan.status === 'active';

  const ownerName = (action: Action) => {
    if (action.owner_name) return action.owner_name;
    if (action.owner_id) return selectableUsers.find(u => u.id === action.owner_id)?.full_name || 'Unknown';
    return null;
  };

  const canComplete = (action: Action) =>
    viewerRole === 'admin' || action.owner_id === user?.id;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-teal-600 p-5 text-white">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-sm text-blue-100 mb-1">Career Plan · Way Forward</div>
              <h2 className="text-xl font-bold">{plan.goal_role_title || plan.goal_role_custom_title || plan.target_job_family?.title || 'Career Plan'}</h2>
              <div className="text-blue-100 text-sm mt-1">{plan.target_department || plan.target_job_family?.department} · {plan.target_job_family?.level}</div>
            </div>
            <div className="flex items-center gap-3">
              <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                plan.status === 'manager_approved' || plan.status === 'active' ? 'bg-green-100 text-green-800' :
                plan.status === 'sent_to_manager' ? 'bg-amber-100 text-amber-800' :
                plan.status === 'pending_manager_confirmation' ? 'bg-sky-100 text-sky-800' :
                plan.status === 'completed' ? 'bg-green-100 text-green-800' :
                'bg-white/20 text-white'
              }`}>
                {plan.status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
              </span>
              {onClose && (
                <button onClick={onClose} className="p-1.5 hover:bg-white/20 rounded-lg transition-colors">
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {(isManager || isDeptLead) && plan.employee && (
          <div className="px-5 py-3 border-b border-gray-100 bg-gray-50 flex items-center gap-3">
            <User className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-700 font-medium">{plan.employee.full_name}</span>
            <span className="text-xs text-gray-400">· {plan.employee.job_title} · {plan.employee.department}</span>
          </div>
        )}
      </div>

      {/* Way Forward confirmation panel */}
      {isPendingWayForward && isManager && (
        <div className="bg-blue-50 border border-blue-300 rounded-xl overflow-hidden">
          <button
            onClick={() => setShowWayForwardPanel(v => !v)}
            className="w-full flex items-center justify-between p-4 text-left hover:bg-blue-100 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Flag className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-blue-900">Way Forward Required</p>
                <p className="text-xs text-blue-700 mt-0.5">
                  {plan.employee?.full_name || 'This employee'} has completed their self-assessment. Add objectives and confirm to activate the plan.
                </p>
              </div>
            </div>
            <span className="text-xs font-medium text-blue-600 bg-white border border-blue-200 px-3 py-1.5 rounded-lg hover:bg-blue-50 flex-shrink-0">
              {showWayForwardPanel ? 'Close' : 'Add Way Forward'}
            </span>
          </button>

          {showWayForwardPanel && (
            <div className="p-5 border-t border-blue-200 bg-white space-y-5">
              {plan.initiator_notes && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <p className="text-xs font-semibold text-amber-700 mb-1">Your original notes</p>
                  <p className="text-sm text-amber-800">{plan.initiator_notes}</p>
                </div>
              )}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-semibold text-gray-900">Objectives <span className="text-red-500">*</span></label>
                  <button onClick={() => setWfObjectives(prev => [...prev, ''])} className="text-xs text-blue-600 hover:text-blue-800 font-medium">+ Add objective</button>
                </div>
                <div className="space-y-2">
                  {wfObjectives.map((obj, i) => (
                    <div key={i} className="flex gap-2">
                      <input
                        type="text"
                        value={obj}
                        onChange={e => setWfObjectives(prev => prev.map((o, j) => j === i ? e.target.value : o))}
                        placeholder={`Objective ${i + 1}…`}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      {wfObjectives.length > 1 && (
                        <button onClick={() => setWfObjectives(prev => prev.filter((_, j) => j !== i))} className="p-2 text-gray-400 hover:text-red-500 transition-colors">
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-1">Manager Notes (optional)</label>
                <textarea value={managerNotes} onChange={e => setManagerNotes(e.target.value)} rows={3} placeholder="Add your notes, context, agreed timeframes or expectations for this plan…" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 resize-none" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-1">Way Forward Summary (optional)</label>
                <textarea value={wfNotes} onChange={e => setWfNotes(e.target.value)} rows={2} placeholder="Summarise the agreed way forward, any conditions, or key milestones…" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 resize-none" />
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                <p className="text-xs text-gray-500">Confirming will activate the plan and notify the employee.</p>
                <button
                  onClick={confirmWayForward}
                  disabled={confirmingWayForward || !wfObjectives.some(o => o.trim())}
                  className="flex items-center gap-2 px-5 py-2.5 bg-teal-600 text-white text-sm font-semibold rounded-lg hover:bg-teal-700 disabled:opacity-40 transition-colors"
                >
                  <CheckCircle className="w-4 h-4" />
                  {confirmingWayForward ? 'Confirming…' : 'Confirm Way Forward'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Pending Manager Confirmation panel */}
      {isPendingConfirmation && isManager && (
        <div className="bg-sky-50 border border-sky-300 rounded-xl overflow-hidden">
          <button
            onClick={() => setShowConfirmationPanel(v => !v)}
            className="w-full flex items-center justify-between p-4 text-left hover:bg-sky-100 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-sky-100 rounded-lg">
                <ClipboardCheck className="w-4 h-4 text-sky-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-sky-900">Confirm Career Plan</p>
                <p className="text-xs text-sky-700 mt-0.5">
                  A career plan for <strong>{plan.employee?.full_name || 'this employee'}</strong> has been created by admin and requires your confirmation to activate.
                </p>
              </div>
            </div>
            <span className="text-xs font-medium text-sky-600 bg-white border border-sky-200 px-3 py-1.5 rounded-lg hover:bg-sky-50 flex-shrink-0">
              {showConfirmationPanel ? 'Close' : 'Review & Confirm'}
            </span>
          </button>

          {showConfirmationPanel && (
            <div className="p-5 border-t border-sky-200 bg-white space-y-5">
              {(plan as any).plan_description && (
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                  <p className="text-xs font-semibold text-slate-600 mb-1">Plan Description</p>
                  <p className="text-sm text-slate-700">{(plan as any).plan_description}</p>
                </div>
              )}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-semibold text-gray-900">Objectives <span className="text-red-500">*</span></label>
                  <button onClick={() => setConfirmObjectives(prev => [...prev, ''])} className="text-xs text-sky-600 hover:text-sky-800 font-medium">+ Add objective</button>
                </div>
                <div className="space-y-2">
                  {confirmObjectives.map((obj, i) => (
                    <div key={i} className="flex gap-2">
                      <input
                        type="text"
                        value={obj}
                        onChange={e => setConfirmObjectives(prev => prev.map((o, j) => j === i ? e.target.value : o))}
                        placeholder={`Objective ${i + 1}…`}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                      />
                      {confirmObjectives.length > 1 && (
                        <button onClick={() => setConfirmObjectives(prev => prev.filter((_, j) => j !== i))} className="p-2 text-gray-400 hover:text-red-500 transition-colors">
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Additional actions with owner */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-semibold text-gray-900">Additional Actions (optional)</label>
                  <button onClick={() => setConfirmActions(prev => [...prev, { title: '', description: '', owner_id: '', due_date: '' }])} className="text-xs text-sky-600 hover:text-sky-800 font-medium">+ Add action</button>
                </div>
                <div className="space-y-3">
                  {confirmActions.map((action, i) => (
                    <div key={i} className="bg-gray-50 border border-gray-200 rounded-lg p-3 space-y-2">
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={action.title}
                          onChange={e => setConfirmActions(prev => prev.map((a, j) => j === i ? { ...a, title: e.target.value } : a))}
                          placeholder="Action title…"
                          className="flex-1 px-3 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-sky-500"
                        />
                        {confirmActions.length > 1 && (
                          <button onClick={() => setConfirmActions(prev => prev.filter((_, j) => j !== i))} className="p-1 text-gray-400 hover:text-red-500">
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                      <input
                        type="text"
                        value={action.description}
                        onChange={e => setConfirmActions(prev => prev.map((a, j) => j === i ? { ...a, description: e.target.value } : a))}
                        placeholder="Description (optional)"
                        className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-sky-500"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <select
                          value={action.owner_id}
                          onChange={e => setConfirmActions(prev => prev.map((a, j) => j === i ? { ...a, owner_id: e.target.value } : a))}
                          className="px-3 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-sky-500"
                        >
                          <option value="">Owner (required)</option>
                          {selectableUsers.map(u => (
                            <option key={u.id} value={u.id}>{u.full_name}</option>
                          ))}
                        </select>
                        <input
                          type="date"
                          value={action.due_date}
                          onChange={e => setConfirmActions(prev => prev.map((a, j) => j === i ? { ...a, due_date: e.target.value } : a))}
                          className="px-3 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-sky-500"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-1">Manager Notes (optional)</label>
                <textarea value={managerNotes} onChange={e => setManagerNotes(e.target.value)} rows={3} placeholder="Add context, agreed timeframes or expectations for this plan…" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-sky-500 resize-none" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-1">Plan Summary (optional)</label>
                <textarea value={confirmNotes} onChange={e => setConfirmNotes(e.target.value)} rows={2} placeholder="Summarise the agreed way forward, any conditions, or key milestones…" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-sky-500 resize-none" />
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                <p className="text-xs text-gray-500">Confirming will activate the plan and notify the employee.</p>
                <button
                  onClick={confirmPlan}
                  disabled={confirmingPlan || !confirmObjectives.some(o => o.trim())}
                  className="flex items-center gap-2 px-5 py-2.5 bg-sky-600 text-white text-sm font-semibold rounded-lg hover:bg-sky-700 disabled:opacity-40 transition-colors"
                >
                  <ClipboardCheck className="w-4 h-4" />
                  {confirmingPlan ? 'Confirming…' : 'Confirm Plan'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* In-progress plan: Way Forward summary */}
      {isInProgress && plan.way_forward_objectives && plan.way_forward_objectives.length > 0 && (
        <div className="bg-teal-50 border border-teal-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle className="w-4 h-4 text-teal-600" />
            <span className="text-sm font-semibold text-teal-900">Way Forward — Active</span>
            {plan.way_forward_confirmed_at && (
              <span className="text-xs text-teal-600 ml-auto">
                Confirmed {new Date(plan.way_forward_confirmed_at).toLocaleDateString()}
              </span>
            )}
          </div>
          <div className="space-y-1.5">
            {plan.way_forward_objectives.map((obj, i) => (
              <div key={i} className="flex items-start gap-2 text-sm text-teal-800">
                <ArrowRight className="w-3.5 h-3.5 text-teal-500 flex-shrink-0 mt-0.5" />
                {obj}
              </div>
            ))}
          </div>
          {plan.way_forward_notes && (
            <p className="text-xs text-teal-700 mt-2 pt-2 border-t border-teal-200 italic">{plan.way_forward_notes}</p>
          )}
        </div>
      )}

      {/* Progress */}
      {totalCount > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Actions Progress</span>
            <span className="text-sm text-gray-500">{completedCount}/{totalCount} complete · {progressPct}%</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2">
            <div className="bg-teal-500 h-2 rounded-full transition-all" style={{ width: `${progressPct}%` }} />
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Actions — main panel */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-600" />
              Actions &amp; Steps
            </h3>
            {canEdit && (
              <button
                onClick={() => setShowAddAction(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Action
              </button>
            )}
          </div>

          {/* Add action form */}
          {showAddAction && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
              <input
                type="text"
                value={newActionTitle}
                onChange={e => setNewActionTitle(e.target.value)}
                placeholder="Action title..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
              />
              <textarea
                value={newActionDesc}
                onChange={e => setNewActionDesc(e.target.value)}
                placeholder="Description (optional)..."
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 resize-none"
              />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Owner <span className="text-red-500">*</span></label>
                  <select
                    value={newActionOwnerId}
                    onChange={e => setNewActionOwnerId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select owner…</option>
                    {selectableUsers.map(u => (
                      <option key={u.id} value={u.id}>{u.full_name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Due date</label>
                  <input
                    type="date"
                    value={newActionDue}
                    onChange={e => setNewActionDue(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={addAction}
                  disabled={!newActionTitle.trim() || !newActionOwnerId || saving}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 disabled:opacity-40"
                >
                  <Save className="w-3.5 h-3.5" />
                  Save
                </button>
                <button
                  onClick={() => { setShowAddAction(false); setNewActionTitle(''); setNewActionDesc(''); setNewActionDue(''); setNewActionOwnerId(''); }}
                  className="px-3 py-1.5 bg-white border border-gray-200 text-gray-600 text-xs rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {actions.length === 0 ? (
            <div className="text-center py-10 bg-white border border-gray-200 rounded-lg">
              <TrendingUp className="w-10 h-10 text-gray-200 mx-auto mb-2" />
              <p className="text-sm text-gray-400">No actions yet. Add actions to build your way forward.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {actions.map(action => {
                const name = ownerName(action);
                const canDo = canComplete(action);
                return (
                  <div
                    key={action.id}
                    className={`bg-white border rounded-lg p-4 transition-colors ${
                      action.completed_at ? 'border-green-200 bg-green-50/30' : 'border-gray-200'
                    }`}
                  >
                    {editingId === action.id ? (
                      <div className="space-y-3">
                        <input
                          value={editTitle}
                          onChange={e => setEditTitle(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500"
                        />
                        <textarea
                          value={editDesc}
                          onChange={e => setEditDesc(e.target.value)}
                          rows={2}
                          placeholder="Description..."
                          className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 resize-none"
                        />
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Owner <span className="text-red-500">*</span></label>
                            <select
                              value={editOwnerId}
                              onChange={e => setEditOwnerId(e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="">Select owner…</option>
                              {selectableUsers.map(u => (
                                <option key={u.id} value={u.id}>{u.full_name}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Due date</label>
                            <input
                              type="date"
                              value={editDue}
                              onChange={e => setEditDue(e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                        </div>
                        <textarea
                          value={editNotes}
                          onChange={e => setEditNotes(e.target.value)}
                          rows={2}
                          placeholder="Notes / feedback..."
                          className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 resize-none"
                        />
                        <div className="flex gap-2">
                          <button onClick={saveEdit} disabled={saving} className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 disabled:opacity-40">
                            <Save className="w-3.5 h-3.5" /> Save
                          </button>
                          <button onClick={() => setEditingId(null)} className="px-3 py-1.5 bg-gray-100 text-gray-600 text-xs rounded hover:bg-gray-200">Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start gap-3">
                        {/* Complete toggle — locked unless current user is owner/admin */}
                        <button
                          onClick={() => canDo && toggleComplete(action)}
                          disabled={saving || !canDo}
                          title={canDo ? (action.completed_at ? 'Mark incomplete' : 'Mark complete') : 'Only the assigned owner can sign off this action'}
                          className={`flex-shrink-0 w-5 h-5 rounded-full border-2 mt-0.5 transition-colors ${
                            action.completed_at
                              ? 'bg-green-500 border-green-500 text-white flex items-center justify-center'
                              : canDo
                                ? 'border-gray-300 hover:border-teal-400 cursor-pointer'
                                : 'border-gray-200 bg-gray-50 cursor-not-allowed'
                          }`}
                        >
                          {action.completed_at && <CheckCircle className="w-3.5 h-3.5" />}
                          {!action.completed_at && !canDo && <Lock className="w-2.5 h-2.5 text-gray-300" />}
                        </button>

                        <div className="flex-1 min-w-0">
                          <div className={`text-sm font-medium ${action.completed_at ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                            {action.title}
                          </div>
                          {action.description && (
                            <div className="text-xs text-gray-500 mt-0.5">{action.description}</div>
                          )}
                          <div className="flex flex-wrap items-center gap-2 mt-1.5">
                            <span className={`px-1.5 py-0.5 text-xs rounded ${SOURCE_COLORS[action.source]}`}>
                              {SOURCE_LABELS[action.source]}
                            </span>
                            {name && (
                              <span className={`flex items-center gap-1 text-xs px-1.5 py-0.5 rounded font-medium ${
                                action.owner_id === user?.id
                                  ? 'bg-blue-100 text-blue-700'
                                  : 'bg-gray-100 text-gray-600'
                              }`}>
                                <User className="w-3 h-3" />
                                {action.owner_id === user?.id ? 'You' : name}
                              </span>
                            )}
                            {action.due_date && (
                              <span className="flex items-center gap-1 text-xs text-gray-400">
                                <Calendar className="w-3 h-3" />
                                {new Date(action.due_date).toLocaleDateString()}
                              </span>
                            )}
                            {action.completed_at && (
                              <span className="text-xs text-green-600">
                                Completed {new Date(action.completed_at).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                          {action.notes && (
                            <div className="mt-2 text-xs text-gray-600 bg-gray-50 rounded p-2 italic">
                              "{action.notes}"
                            </div>
                          )}
                          {!canDo && !action.completed_at && (
                            <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                              <Lock className="w-3 h-3" />
                              Only {name || 'the assigned owner'} can sign off this action
                            </p>
                          )}
                        </div>
                        {canEdit && (
                          <div className="flex gap-1 flex-shrink-0">
                            <button onClick={() => startEdit(action)} className="p-1.5 hover:bg-gray-100 rounded text-gray-400 hover:text-blue-600">
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => deleteAction(action.id)} className="p-1.5 hover:bg-gray-100 rounded text-gray-400 hover:text-red-500">
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {readiness && readiness.overall && (
            <div className={`border rounded-lg p-4 ${
              readiness.overall === 'ready' ? 'bg-green-50 border-green-200' :
              readiness.overall === 'partially_ready' ? 'bg-amber-50 border-amber-200' :
              'bg-red-50 border-red-200'
            }`}>
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-4 h-4 text-teal-600" />
                <span className="text-xs font-semibold text-gray-700">Opal Readiness</span>
              </div>
              <div className={`text-sm font-medium ${
                readiness.overall === 'ready' ? 'text-green-800' :
                readiness.overall === 'partially_ready' ? 'text-amber-800' : 'text-red-800'
              }`}>
                {readiness.overall === 'ready' ? 'Appears Ready' :
                 readiness.overall === 'partially_ready' ? 'Partially Ready' : 'Not Yet Ready'}
              </div>
              {readiness.criteria && (
                <div className="mt-2 space-y-1">
                  {readiness.criteria.slice(0, 4).map((c: any, i: number) => (
                    <div key={i} className="flex items-center gap-1.5 text-xs">
                      {c.met ? <CheckCircle className="w-3 h-3 text-green-500" /> : <AlertCircle className="w-3 h-3 text-amber-500" />}
                      <span className={c.met ? 'text-gray-700' : 'text-amber-700'}>{c.label}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {plan.skills_gaps && plan.skills_gaps.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Skills Gaps</div>
              <div className="flex flex-wrap gap-1.5">
                {plan.skills_gaps.map((s: string, i: number) => (
                  <span key={i} className="px-2 py-0.5 bg-amber-100 border border-amber-200 text-amber-700 text-xs rounded-full">{s}</span>
                ))}
              </div>
            </div>
          )}

          {isManager && (
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5" />
                  Manager Notes
                </div>
                {!editingManagerNotes && (
                  <button onClick={() => setEditingManagerNotes(true)} className="text-xs text-blue-600 hover:text-blue-800">Edit</button>
                )}
              </div>
              {editingManagerNotes ? (
                <div className="space-y-2">
                  <textarea
                    value={managerNotes}
                    onChange={e => setManagerNotes(e.target.value)}
                    rows={4}
                    placeholder="Add your notes, feedback or agreed timeframes..."
                    className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                  <div className="flex gap-2">
                    <button onClick={saveManagerNotes} disabled={saving} className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 disabled:opacity-40">
                      <Save className="w-3.5 h-3.5" /> Save
                    </button>
                    <button onClick={() => { setEditingManagerNotes(false); setManagerNotes(plan.manager_comments || ''); }} className="px-3 py-1.5 bg-gray-100 text-gray-600 text-xs rounded">Cancel</button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-600 italic">{plan.manager_comments || 'No notes yet.'}</p>
              )}
              {plan.status === 'sent_to_manager' && (
                <button onClick={approvePlan} disabled={saving} className="mt-3 w-full flex items-center justify-center gap-2 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-40">
                  <CheckCircle className="w-4 h-4" />
                  Approve Plan
                </button>
              )}
              {plan.status === 'pending_manager_wayforward' && (
                <button onClick={() => setShowWayForwardPanel(true)} className="mt-3 w-full flex items-center justify-center gap-2 py-2 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700">
                  <Flag className="w-4 h-4" />
                  Add Way Forward
                </button>
              )}
              {plan.status === 'pending_manager_confirmation' && (
                <button onClick={() => setShowConfirmationPanel(true)} className="mt-3 w-full flex items-center justify-center gap-2 py-2 bg-sky-600 text-white text-sm font-medium rounded-lg hover:bg-sky-700">
                  <ClipboardCheck className="w-4 h-4" />
                  Confirm Plan
                </button>
              )}
            </div>
          )}

          {isDeptLead && (
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5" />
                  Dept Lead Notes
                </div>
                {!editingDeptNotes && (
                  <button onClick={() => setEditingDeptNotes(true)} className="text-xs text-blue-600 hover:text-blue-800">
                    {plan.dept_lead_notes ? 'Edit' : 'Add'}
                  </button>
                )}
              </div>
              {editingDeptNotes ? (
                <div className="space-y-2">
                  <textarea
                    value={deptLeadNotes}
                    onChange={e => setDeptLeadNotes(e.target.value)}
                    rows={4}
                    placeholder="Suggestions, actions or feedback for this plan..."
                    className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                  <div className="flex gap-2">
                    <button onClick={saveDeptNotes} disabled={saving} className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 disabled:opacity-40">
                      <Save className="w-3.5 h-3.5" /> Save
                    </button>
                    <button onClick={() => { setEditingDeptNotes(false); setDeptLeadNotes(plan.dept_lead_notes || ''); }} className="px-3 py-1.5 bg-gray-100 text-gray-600 text-xs rounded">Cancel</button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-600 italic">{plan.dept_lead_notes || 'No notes yet.'}</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
