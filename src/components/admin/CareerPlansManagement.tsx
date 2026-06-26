import { useState, useEffect } from 'react';
import { Target, CheckCircle, XCircle, Clock, Award, BookOpen, MessageSquare, Send, ArrowRight, Plus, User, Copy, Save, Calendar, Trash2, ChevronRight, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { CareerPlanWorkflow } from '../career/CareerPlanWorkflow';

interface CareerPlan {
  id: string;
  user_id: string;
  profile_id: string;
  plan_title: string | null;
  goal_role_title: string | null;
  goal_role_custom_title: string | null;
  target_level: string;
  target_department: string | null;
  plan_description: string | null;
  quiz_data: any;
  recommended_timeline_months: number;
  skills_gaps: string[];
  recommended_training: any[];
  status: string;
  is_manual: boolean | null;
  sent_to_manager_at: string | null;
  manager_reviewed_at: string | null;
  manager_comments: string | null;
  admin_reviewed_at: string | null;
  admin_comments: string | null;
  created_at: string;
  updated_at: string;
  created_by_role: string | null;
  created_by_name: string | null;
  initiator_notes: string | null;
  way_forward_objectives: any[];
  employee: {
    full_name: string;
    email: string;
    job_title: string;
    department: string | null;
    manager_id: string;
  };
  target_job_family: {
    title: string;
    department: string;
  } | null;
}

interface SelectableEmployee {
  id: string;
  full_name: string;
  job_title: string;
  department: string;
}

interface SelectableJobFamily {
  id: string;
  title: string;
  department: string;
  level: string;
}

interface ActionDraft {
  title: string;
  description: string;
  owner_id: string;
  due_date: string;
}

const EMPTY_ACTION: ActionDraft = { title: '', description: '', owner_id: '', due_date: '' };

const EMPTY_CREATE = {
  employee_id: '',
  target_job_family_id: '',
  plan_title: '',
  goal_role_title: '',
  target_level: '',
  target_department: '',
  recommended_timeline_months: 12,
  notes: '',
  plan_description: '',
};

type CreateStep = 'details' | 'wayforward';

const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  active: 'Active',
  pending_manager_confirmation: 'Awaiting Manager',
  pending_employee_input: 'Awaiting Employee',
  pending_manager_wayforward: 'Awaiting Way Forward',
  in_progress: 'In Progress',
  completed: 'Completed',
  sent_to_manager: 'Sent to Manager',
  manager_approved: 'Manager Approved',
  admin_approved: 'Admin Approved',
  rejected: 'Rejected',
};

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  active: 'bg-teal-100 text-teal-800',
  pending_manager_confirmation: 'bg-amber-100 text-amber-800',
  pending_employee_input: 'bg-blue-100 text-blue-800',
  pending_manager_wayforward: 'bg-blue-100 text-blue-800',
  in_progress: 'bg-teal-100 text-teal-800',
  completed: 'bg-green-100 text-green-800',
  sent_to_manager: 'bg-yellow-100 text-yellow-800',
  manager_approved: 'bg-blue-100 text-blue-800',
  admin_approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
};

export default function CareerPlansManagement() {
  const { profile, user } = useAuth();
  const [plans, setPlans] = useState<CareerPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [selectedPlan, setSelectedPlan] = useState<CareerPlan | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewComments, setReviewComments] = useState('');
  const [reviewAction, setReviewAction] = useState<'approve' | 'reject'>('approve');
  const [submitting, setSubmitting] = useState(false);
  const [workflowPlanId, setWorkflowPlanId] = useState<string | null>(null);

  // Create plan state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createStep, setCreateStep] = useState<CreateStep>('details');
  const [createForm, setCreateForm] = useState(EMPTY_CREATE);
  const [creating, setCreating] = useState(false);
  const [selectableEmployees, setSelectableEmployees] = useState<SelectableEmployee[]>([]);
  const [selectableJobFamilies, setSelectableJobFamilies] = useState<SelectableJobFamily[]>([]);
  const [loadingCreateData, setLoadingCreateData] = useState(false);

  // Way Forward state for create
  const [wfObjectives, setWfObjectives] = useState<string[]>(['']);
  const [wfActions, setWfActions] = useState<ActionDraft[]>([{ ...EMPTY_ACTION }]);
  const [wfNotes, setWfNotes] = useState('');

  // Duplicate state
  const [duplicatePlan, setDuplicatePlan] = useState<CareerPlan | null>(null);
  const [duplicateEmployeeId, setDuplicateEmployeeId] = useState('');
  const [duplicatingEmployees, setDuplicatingEmployees] = useState<SelectableEmployee[]>([]);
  const [duplicating, setDuplicating] = useState(false);

  const isAdmin = profile?.role === 'admin';
  const isManager = profile?.role === 'manager' || profile?.role === 'leadership' || profile?.role === 'dept_lead';
  const canCreate = isAdmin || isManager;

  useEffect(() => { fetchCareerPlans(); }, [filter, profile]);

  const fetchCareerPlans = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('career_plans')
        .select(`
          *,
          created_by_role, created_by_name, initiator_notes,
          plan_title, plan_description, is_manual, way_forward_objectives,
          employee:profiles!career_plans_user_id_fkey(full_name, email, job_title, department, manager_id),
          target_job_family:job_families!career_plans_target_job_family_id_fkey(title, department)
        `)
        .order('created_at', { ascending: false });

      if (!isAdmin && isManager) {
        const { data: teamMembers } = await supabase
          .from('profiles')
          .select('id')
          .eq('manager_id', profile?.id);
        const teamIds = teamMembers?.map(m => m.id) || [];
        const visibleIds = profile?.id ? [...teamIds, profile.id] : teamIds;
        if (visibleIds.length > 0) {
          query = query.in('user_id', visibleIds);
        }
      }

      if (filter !== 'all') {
        query = query.eq('status', filter);
      }

      const { data, error } = await query;
      if (error) throw error;
      setPlans(data || []);
    } catch (error) {
      console.error('Error fetching career plans:', error);
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = async () => {
    setCreateForm(EMPTY_CREATE);
    setWfObjectives(['']);
    setWfActions([{ ...EMPTY_ACTION }]);
    setWfNotes('');
    setCreateStep('details');
    setShowCreateModal(true);
    setLoadingCreateData(true);
    try {
      const [empRes, jfRes] = await Promise.all([
        isAdmin
          ? supabase.from('profiles').select('id, full_name, job_title, department').eq('active', true).order('full_name')
          : supabase.from('profiles').select('id, full_name, job_title, department')
              .or(`manager_id.eq.${profile?.id},id.eq.${profile?.id}`)
              .eq('active', true).order('full_name'),
        supabase.from('job_families').select('id, title, department, level').order('department').order('title'),
      ]);
      setSelectableEmployees(empRes.data || []);
      setSelectableJobFamilies(jfRes.data || []);
    } catch (err) {
      console.error('Error loading create-plan data:', err);
    } finally {
      setLoadingCreateData(false);
    }
  };

  const handleJfChange = (jfId: string) => {
    const jf = selectableJobFamilies.find(j => j.id === jfId);
    setCreateForm(f => ({
      ...f,
      target_job_family_id: jfId,
      goal_role_title: jf?.title || '',
      target_level: jf?.level || '',
      target_department: jf?.department || '',
      plan_title: f.plan_title || (jf ? `${jf.title} Career Plan` : ''),
    }));
  };

  const canProceedToWayForward = () =>
    !!createForm.employee_id && !!createForm.target_job_family_id && !!createForm.plan_title.trim();

  const submitCreatePlan = async (targetStatus: 'draft' | 'pending_manager_confirmation') => {
    if (!createForm.employee_id || !createForm.target_job_family_id || !profile?.id || !user?.id) return;
    setCreating(true);
    try {
      const jf = selectableJobFamilies.find(j => j.id === createForm.target_job_family_id);
      const filledObjectives = wfObjectives.filter(o => o.trim());
      const createdByRole = isAdmin ? 'admin' : 'manager';

      const { data: newPlan, error } = await supabase.from('career_plans').insert({
        user_id: createForm.employee_id,
        profile_id: createForm.employee_id,
        target_job_family_id: createForm.target_job_family_id,
        plan_title: createForm.plan_title.trim() || null,
        plan_description: createForm.plan_description.trim() || null,
        goal_role_title: createForm.goal_role_title || jf?.title || '',
        goal_role_custom_title: createForm.goal_role_title || jf?.title || '',
        target_level: createForm.target_level || jf?.level || '',
        target_department: createForm.target_department || jf?.department || '',
        recommended_timeline_months: createForm.recommended_timeline_months,
        status: targetStatus,
        current_owner_stage: targetStatus === 'pending_manager_confirmation' ? 'manager' : 'admin',
        started_from: createdByRole,
        manager_id: null,
        created_by_role: createdByRole,
        created_by_user_id: profile.id,
        created_by_name: profile.full_name || '',
        initiator_notes: createForm.notes.trim() || null,
        is_manual: true,
        skills_gaps: [],
        recommended_training: [],
        way_forward_objectives: filledObjectives.length > 0 ? filledObjectives : [],
        way_forward_notes: wfNotes.trim() || null,
        manager_comments: createForm.notes.trim() || null,
        sent_to_manager_at: targetStatus === 'pending_manager_confirmation' ? new Date().toISOString() : null,
      }).select('id').maybeSingle();

      if (error) throw error;

      // Insert actions
      const validActions = wfActions.filter(a => a.title.trim());
      if (newPlan?.id && validActions.length > 0) {
        await supabase.from('career_plan_actions').insert(
          validActions.map(a => {
            const ownerUser = selectableEmployees.find(e => e.id === a.owner_id);
            return {
              plan_id: newPlan.id,
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

      // Notify manager when sent for confirmation
      if (newPlan?.id && targetStatus === 'pending_manager_confirmation') {
        const emp = selectableEmployees.find(e => e.id === createForm.employee_id);
        // Find the employee's manager
        const { data: empProfile } = await supabase
          .from('profiles')
          .select('manager_id')
          .eq('id', createForm.employee_id)
          .maybeSingle();

        if (empProfile?.manager_id) {
          await supabase.from('career_plan_notifications').insert({
            career_plan_id: newPlan.id,
            recipient_id: empProfile.manager_id,
            sender_id: user.id,
            notification_type: 'plan_initiated',
            message: `Admin has created a Career Plan for ${emp?.full_name || 'a team member'} targeting ${createForm.goal_role_title || jf?.title || 'a new role'}. Please review and confirm.`,
          });
        }
      }

      setShowCreateModal(false);
      setCreateForm(EMPTY_CREATE);
      setWfObjectives(['']);
      setWfActions([{ ...EMPTY_ACTION }]);
      setWfNotes('');
      setCreateStep('details');
      fetchCareerPlans();
    } catch (err) {
      console.error('Error creating career plan:', err);
      alert('Failed to create career plan. Please try again.');
    } finally {
      setCreating(false);
    }
  };

  // Duplicate plan
  const openDuplicate = async (plan: CareerPlan) => {
    setDuplicatePlan(plan);
    setDuplicateEmployeeId('');
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, job_title, department')
      .eq('active', true)
      .order('full_name');
    setDuplicatingEmployees(data || []);
  };

  const submitDuplicate = async () => {
    if (!duplicatePlan || !duplicateEmployeeId || !profile?.id || !user?.id) return;
    setDuplicating(true);
    try {
      const { data: newPlan, error } = await supabase.from('career_plans').insert({
        user_id: duplicateEmployeeId,
        profile_id: duplicateEmployeeId,
        target_job_family_id: duplicatePlan.target_job_family_id,
        plan_title: duplicatePlan.plan_title ? `${duplicatePlan.plan_title} (Copy)` : null,
        plan_description: duplicatePlan.plan_description || null,
        goal_role_title: duplicatePlan.goal_role_title || '',
        goal_role_custom_title: duplicatePlan.goal_role_custom_title || '',
        target_level: duplicatePlan.target_level || '',
        target_department: duplicatePlan.target_department || '',
        recommended_timeline_months: duplicatePlan.recommended_timeline_months,
        status: 'draft',
        current_owner_stage: 'admin',
        started_from: isAdmin ? 'admin' : 'manager',
        created_by_role: isAdmin ? 'admin' : 'manager',
        created_by_user_id: profile.id,
        created_by_name: profile.full_name || '',
        is_manual: true,
        skills_gaps: [],
        recommended_training: [],
        way_forward_objectives: Array.isArray(duplicatePlan.way_forward_objectives) ? duplicatePlan.way_forward_objectives : [],
      }).select('id').maybeSingle();

      if (error) throw error;

      // Copy actions (title, description only — no progress/completion)
      if (newPlan?.id) {
        const { data: srcActions } = await supabase
          .from('career_plan_actions')
          .select('title, description, owner_id, owner_name, due_date, source')
          .eq('plan_id', duplicatePlan.id);

        if (srcActions && srcActions.length > 0) {
          await supabase.from('career_plan_actions').insert(
            srcActions.map(a => ({
              plan_id: newPlan.id,
              title: a.title,
              description: a.description || null,
              owner_id: (a as any).owner_id || null,
              owner_name: (a as any).owner_name || null,
              due_date: a.due_date || null,
              source: a.source || 'manager',
              added_by: user.id,
            }))
          );
        }
      }

      setDuplicatePlan(null);
      setDuplicateEmployeeId('');
      fetchCareerPlans();
    } catch (err) {
      console.error('Error duplicating career plan:', err);
      alert('Failed to duplicate career plan.');
    } finally {
      setDuplicating(false);
    }
  };

  const openReviewModal = (plan: CareerPlan, action: 'approve' | 'reject') => {
    setSelectedPlan(plan);
    setReviewAction(action);
    setReviewComments('');
    setShowReviewModal(true);
  };

  const submitReview = async () => {
    if (!selectedPlan) return;
    setSubmitting(true);
    try {
      const isManagerReview = selectedPlan.status === 'sent_to_manager' && isManager;
      const isAdminReview = selectedPlan.status === 'manager_approved' && isAdmin;

      let updates: any = {};
      if (isManagerReview) {
        updates = {
          status: reviewAction === 'approve' ? 'manager_approved' : 'rejected',
          manager_reviewed_at: new Date().toISOString(),
          manager_comments: reviewComments,
        };
      } else if (isAdminReview || isAdmin) {
        updates = {
          status: reviewAction === 'approve' ? 'active' : 'rejected',
          manager_reviewed_at: new Date().toISOString(),
          manager_comments: reviewComments || null,
        };
      }

      const { error } = await supabase.from('career_plans').update(updates).eq('id', selectedPlan.id);
      if (error) throw error;
      setShowReviewModal(false);
      setSelectedPlan(null);
      fetchCareerPlans();
    } catch (error) {
      console.error('Error reviewing plan:', error);
      alert('Failed to submit review.');
    } finally {
      setSubmitting(false);
    }
  };

  const sendDraftToManager = async (plan: CareerPlan) => {
    if (!user?.id) return;
    try {
      await supabase.from('career_plans').update({
        status: 'pending_manager_confirmation',
        current_owner_stage: 'manager',
        sent_to_manager_at: new Date().toISOString(),
      }).eq('id', plan.id);

      // Notify the employee's manager
      const empProfile = plan.employee;
      if (empProfile?.manager_id) {
        await supabase.from('career_plan_notifications').insert({
          career_plan_id: plan.id,
          recipient_id: empProfile.manager_id,
          sender_id: user.id,
          notification_type: 'plan_initiated',
          message: `A Career Plan for ${empProfile.full_name} — "${planDisplayTitle(plan)}" — has been sent to you for confirmation.`,
        });
      }

      fetchCareerPlans();
    } catch (err) {
      console.error('Error sending plan to manager:', err);
      alert('Failed to send plan to manager.');
    }
  };

  const canReview = (plan: CareerPlan) => {
    if (isAdmin) {
      return !['draft', 'rejected', 'active', 'in_progress', 'completed'].includes(plan.status);
    }
    if (isManager && plan.employee.manager_id === profile?.id) {
      return plan.status === 'sent_to_manager';
    }
    return false;
  };

  const getStatusBadge = (status: string) => (
    <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${STATUS_STYLES[status] || 'bg-gray-100 text-gray-700'}`}>
      {STATUS_LABELS[status] || status.replace(/_/g, ' ')}
    </span>
  );

  const planDisplayTitle = (plan: CareerPlan) =>
    plan.plan_title || plan.goal_role_title || plan.goal_role_custom_title || plan.target_job_family?.title || 'Career Plan';

  const deptGroups = [...new Set(selectableJobFamilies.map(j => j.department))].sort();

  if (loading) {
    return <div className="text-center py-8 text-gray-500 text-sm">Loading career plans…</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Career Plans {isManager && !isAdmin && '(My Team)'}</h2>
          <p className="text-gray-600 mt-1">Review and manage career development plans</p>
        </div>
        <div className="flex items-center gap-3">
          {canCreate && (
            <button
              onClick={openCreateModal}
              className="flex items-center gap-2 bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700 transition-colors text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              Create Plan
            </button>
          )}
          <select
            value={filter}
            onChange={e => setFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
          >
            <option value="all">All Plans</option>
            <option value="active">Active</option>
            <option value="draft">Draft</option>
            <option value="pending_manager_confirmation">Awaiting Manager</option>
            <option value="pending_employee_input">Awaiting Employee</option>
            <option value="pending_manager_wayforward">Awaiting Way Forward</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="sent_to_manager">Sent to Manager</option>
            <option value="manager_approved">Manager Approved</option>
            <option value="admin_approved">Admin Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      {plans.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <Target className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No career plans found</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {plans.map(plan => (
            <div key={plan.id} className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-start justify-between mb-3 gap-3 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <h3 className="text-base font-semibold text-gray-900">{plan.employee?.full_name}</h3>
                    {getStatusBadge(plan.status)}
                    {plan.is_manual && (
                      <span className="px-2 py-0.5 text-xs rounded-full bg-slate-100 text-slate-600 font-medium">Manual</span>
                    )}
                  </div>
                  <p className="text-sm font-medium text-gray-700">{planDisplayTitle(plan)}</p>
                  {plan.plan_description && (
                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{plan.plan_description}</p>
                  )}
                  <p className="text-xs text-gray-400 mt-1">
                    {plan.target_job_family?.title || plan.goal_role_title || '—'}{plan.target_level ? ` · ${plan.target_level}` : ''}
                    {plan.recommended_timeline_months ? ` · ${plan.recommended_timeline_months}mo` : ''}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 flex-shrink-0">
                  <button
                    onClick={() => setWorkflowPlanId(plan.id)}
                    className="flex items-center gap-1.5 bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 transition-colors text-xs font-medium"
                  >
                    <ArrowRight className="w-3.5 h-3.5" />
                    Open Plan
                  </button>
                  {plan.status === 'draft' && isAdmin && plan.employee?.manager_id && (
                    <button
                      onClick={() => sendDraftToManager(plan)}
                      className="flex items-center gap-1.5 bg-sky-600 text-white px-3 py-1.5 rounded-lg hover:bg-sky-700 transition-colors text-xs font-medium"
                    >
                      <Send className="w-3.5 h-3.5" />
                      Send to Manager
                    </button>
                  )}
                  <button
                    onClick={() => openDuplicate(plan)}
                    className="flex items-center gap-1.5 bg-gray-100 text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-200 transition-colors text-xs font-medium"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    Duplicate
                  </button>
                  {canReview(plan) && (
                    <>
                      <button
                        onClick={() => openReviewModal(plan, 'approve')}
                        className="flex items-center gap-1.5 bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700 transition-colors text-xs font-medium"
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        Approve
                      </button>
                      <button
                        onClick={() => openReviewModal(plan, 'reject')}
                        className="flex items-center gap-1.5 bg-red-600 text-white px-3 py-1.5 rounded-lg hover:bg-red-700 transition-colors text-xs font-medium"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        Reject
                      </button>
                    </>
                  )}
                </div>
              </div>

              {plan.created_by_role && plan.created_by_role !== 'employee' && (
                <div className="flex items-center gap-2 mb-2 px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg w-fit">
                  <User className="w-3 h-3 text-slate-400" />
                  <span className="text-xs text-slate-600">
                    Created by {plan.created_by_role === 'admin' ? 'admin' : 'manager'}
                    {plan.created_by_name ? ` — ${plan.created_by_name}` : ''}
                  </span>
                </div>
              )}

              <div className="grid grid-cols-3 gap-3 mb-3">
                <div className="bg-red-50 rounded-lg p-2.5">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <Award className="w-3.5 h-3.5 text-red-600" />
                    <span className="text-xs font-medium text-red-900">Skills Gaps</span>
                  </div>
                  <p className="text-lg font-bold text-red-900">{plan.skills_gaps?.length || 0}</p>
                </div>
                <div className="bg-blue-50 rounded-lg p-2.5">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <BookOpen className="w-3.5 h-3.5 text-blue-600" />
                    <span className="text-xs font-medium text-blue-900">Training</span>
                  </div>
                  <p className="text-lg font-bold text-blue-900">{plan.recommended_training?.length || 0}</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-2.5">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                    <span className="text-xs font-medium text-slate-700">Created</span>
                  </div>
                  <p className="text-xs font-semibold text-slate-700">{new Date(plan.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                </div>
              </div>

              {plan.manager_comments && (
                <div className="bg-blue-50 rounded-lg p-3 mb-2">
                  <div className="flex items-center gap-1.5 mb-1">
                    <MessageSquare className="w-3.5 h-3.5 text-blue-600" />
                    <span className="text-xs font-semibold text-blue-900">Manager Notes</span>
                  </div>
                  <p className="text-xs text-blue-800">{plan.manager_comments}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Plan workflow overlay */}
      {workflowPlanId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <CareerPlanWorkflow
              planId={workflowPlanId}
              viewerRole="admin"
              onClose={() => { setWorkflowPlanId(null); fetchCareerPlans(); }}
            />
          </div>
        </div>
      )}

      {/* Create plan modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-teal-50 rounded-lg">
                  <Target className="w-4 h-4 text-teal-600" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-gray-900">Create Career Plan</h2>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {createStep === 'details' ? 'Step 1 of 2 — Plan Details' : 'Step 2 of 2 — Way Forward'}
                  </p>
                </div>
              </div>
              <button onClick={() => setShowCreateModal(false)} className="p-1.5 rounded-lg hover:bg-gray-100">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>

            {/* Step indicator */}
            <div className="px-6 pt-4 pb-0 flex-shrink-0">
              <div className="flex items-center gap-2">
                {(['details', 'wayforward'] as CreateStep[]).map((s, i) => (
                  <div key={s} className="flex items-center gap-2">
                    {i > 0 && <div className="w-6 h-px bg-gray-200" />}
                    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                      createStep === s ? 'bg-teal-100 text-teal-700'
                      : createStep === 'wayforward' && s === 'details' ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-400'
                    }`}>
                      {createStep === 'wayforward' && s === 'details'
                        ? <CheckCircle className="w-3 h-3" />
                        : <span>{i + 1}</span>}
                      {s === 'details' ? 'Plan Details' : 'Way Forward'}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4">
              {loadingCreateData ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-6 h-6 border-2 border-teal-200 border-t-teal-600 rounded-full animate-spin" />
                </div>
              ) : createStep === 'details' ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Employee <span className="text-red-500">*</span></label>
                    <select
                      value={createForm.employee_id}
                      onChange={e => setCreateForm(f => ({ ...f, employee_id: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 text-sm"
                    >
                      <option value="">Select employee…</option>
                      {selectableEmployees.map(emp => (
                        <option key={emp.id} value={emp.id}>
                          {emp.full_name}{emp.job_title ? ` — ${emp.job_title}` : ''}{emp.department ? ` (${emp.department})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Target Role <span className="text-red-500">*</span></label>
                    <select
                      value={createForm.target_job_family_id}
                      onChange={e => handleJfChange(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 text-sm"
                    >
                      <option value="">Select target role…</option>
                      {deptGroups.map(dept => (
                        <optgroup key={dept} label={dept}>
                          {selectableJobFamilies.filter(j => j.department === dept).map(jf => (
                            <option key={jf.id} value={jf.id}>{jf.title}{jf.level ? ` (${jf.level})` : ''}</option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Plan Title <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      value={createForm.plan_title}
                      onChange={e => setCreateForm(f => ({ ...f, plan_title: e.target.value }))}
                      placeholder="e.g. Product Manager Career Plan 2026"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Target Role Title</label>
                    <input
                      type="text"
                      value={createForm.goal_role_title}
                      onChange={e => setCreateForm(f => ({ ...f, goal_role_title: e.target.value }))}
                      placeholder="Auto-filled from role selection"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Plan Description</label>
                    <textarea
                      value={createForm.plan_description}
                      onChange={e => setCreateForm(f => ({ ...f, plan_description: e.target.value }))}
                      rows={2}
                      placeholder="Brief description…"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 text-sm resize-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Timeline (months)</label>
                    <input
                      type="number" min={1} max={60}
                      value={createForm.recommended_timeline_months}
                      onChange={e => setCreateForm(f => ({ ...f, recommended_timeline_months: Number(e.target.value) }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Notes (optional)</label>
                    <textarea
                      value={createForm.notes}
                      onChange={e => setCreateForm(f => ({ ...f, notes: e.target.value }))}
                      rows={2}
                      placeholder="Context, goals, or guidance…"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 text-sm resize-none"
                    />
                  </div>
                </div>
              ) : (
                /* Way Forward step */
                <div className="space-y-6">
                  <div className="bg-teal-50 border border-teal-200 rounded-lg px-4 py-3 flex items-center gap-3">
                    <Target className="w-4 h-4 text-teal-600 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-teal-900 truncate">{createForm.plan_title}</p>
                      <p className="text-xs text-teal-700">
                        {selectableEmployees.find(e => e.id === createForm.employee_id)?.full_name} → {createForm.goal_role_title}
                      </p>
                    </div>
                  </div>

                  {/* Objectives */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-semibold text-gray-900">Objectives</label>
                      <button type="button" onClick={() => setWfObjectives(p => [...p, ''])} className="text-xs text-teal-600 hover:text-teal-800 font-medium flex items-center gap-1">
                        <Plus className="w-3 h-3" /> Add
                      </button>
                    </div>
                    <div className="space-y-2">
                      {wfObjectives.map((obj, i) => (
                        <div key={i} className="flex gap-2">
                          <input
                            type="text" value={obj}
                            onChange={e => setWfObjectives(p => p.map((o, j) => j === i ? e.target.value : o))}
                            placeholder={`Objective ${i + 1}…`}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500"
                          />
                          {wfObjectives.length > 1 && (
                            <button type="button" onClick={() => setWfObjectives(p => p.filter((_, j) => j !== i))} className="p-2 text-gray-400 hover:text-red-500">
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
                      <button type="button" onClick={() => setWfActions(p => [...p, { ...EMPTY_ACTION }])} className="text-xs text-teal-600 hover:text-teal-800 font-medium flex items-center gap-1">
                        <Plus className="w-3 h-3" /> Add
                      </button>
                    </div>
                    <div className="space-y-3">
                      {wfActions.map((action, i) => (
                        <div key={i} className="bg-gray-50 border border-gray-200 rounded-lg p-3 space-y-2">
                          <div className="flex gap-2">
                            <input type="text" value={action.title}
                              onChange={e => setWfActions(p => p.map((a, j) => j === i ? { ...a, title: e.target.value } : a))}
                              placeholder="Action title…"
                              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 bg-white"
                            />
                            {wfActions.length > 1 && (
                              <button type="button" onClick={() => setWfActions(p => p.filter((_, j) => j !== i))} className="p-2 text-gray-400 hover:text-red-500">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                          <input type="text" value={action.description}
                            onChange={e => setWfActions(p => p.map((a, j) => j === i ? { ...a, description: e.target.value } : a))}
                            placeholder="Description (optional)…"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 bg-white"
                          />
                          <div className="grid grid-cols-2 gap-2">
                            <div className="flex items-center gap-1.5">
                              <User className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                              <select
                                value={action.owner_id}
                                onChange={e => setWfActions(p => p.map((a, j) => j === i ? { ...a, owner_id: e.target.value } : a))}
                                className="flex-1 px-2.5 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 bg-white"
                              >
                                <option value="">Owner…</option>
                                {selectableEmployees.map(u => (
                                  <option key={u.id} value={u.id}>{u.full_name}</option>
                                ))}
                              </select>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                              <input type="date" value={action.due_date}
                                onChange={e => setWfActions(p => p.map((a, j) => j === i ? { ...a, due_date: e.target.value } : a))}
                                className="flex-1 px-2.5 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 bg-white"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-1.5">Way Forward Notes (optional)</label>
                    <textarea value={wfNotes} onChange={e => setWfNotes(e.target.value)} rows={2}
                      placeholder="Summarise the agreed way forward…"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 resize-none"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-100 flex-shrink-0">
              {createStep === 'details' ? (
                <div className="flex items-center justify-end gap-3">
                  <button onClick={() => setShowCreateModal(false)} className="px-4 py-2 text-sm text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
                  <button onClick={() => setCreateStep('wayforward')} disabled={!canProceedToWayForward()}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700 disabled:opacity-50">
                    Next: Way Forward <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-3">
                  <button onClick={() => setCreateStep('details')} className="px-4 py-2 text-sm text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">← Back</button>
                  <div className="flex items-center gap-2">
                    <button onClick={() => submitCreatePlan('draft')} disabled={creating}
                      className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50">
                      <Save className="w-4 h-4" />{creating ? 'Saving…' : 'Save Draft'}
                    </button>
                    <button onClick={() => submitCreatePlan('pending_manager_confirmation')} disabled={creating}
                      className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50">
                      <Send className="w-4 h-4" />{creating ? 'Sending…' : 'Send to Manager'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Review modal */}
      {showReviewModal && selectedPlan && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">
              {reviewAction === 'approve' ? 'Approve' : 'Reject'} Career Plan
            </h2>
            <div className="bg-gray-50 rounded-lg p-3 mb-4 text-sm text-gray-700 space-y-0.5">
              <p><span className="font-medium">Employee:</span> {selectedPlan.employee.full_name}</p>
              <p><span className="font-medium">Plan:</span> {planDisplayTitle(selectedPlan)}</p>
            </div>
            <div className="mb-5">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                {reviewAction === 'approve' ? 'Approval' : 'Rejection'} Comments
              </label>
              <textarea
                value={reviewComments}
                onChange={e => setReviewComments(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                rows={4}
                placeholder={`Add your ${reviewAction === 'approve' ? 'approval notes' : 'reason for rejection'}…`}
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={submitReview}
                disabled={submitting || !reviewComments.trim()}
                className={`flex-1 flex items-center justify-center gap-2 text-white px-4 py-2 rounded-lg transition-colors text-sm font-medium disabled:opacity-50 ${reviewAction === 'approve' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}
              >
                <Send className="w-4 h-4" />
                {submitting ? 'Submitting…' : `Confirm ${reviewAction === 'approve' ? 'Approval' : 'Rejection'}`}
              </button>
              <button onClick={() => { setShowReviewModal(false); setSelectedPlan(null); }} disabled={submitting}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Duplicate modal */}
      {duplicatePlan && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-1">Duplicate Career Plan</h2>
            <p className="text-sm text-gray-500 mb-4">
              Copying <strong>{planDisplayTitle(duplicatePlan)}</strong> — objectives and actions will be copied. Progress and comments will not.
            </p>
            <div className="mb-5">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Select Employee <span className="text-red-500">*</span></label>
              <select
                value={duplicateEmployeeId}
                onChange={e => setDuplicateEmployeeId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 text-sm"
              >
                <option value="">Select employee…</option>
                {duplicatingEmployees.map(emp => (
                  <option key={emp.id} value={emp.id}>
                    {emp.full_name}{emp.job_title ? ` — ${emp.job_title}` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex gap-3">
              <button
                onClick={submitDuplicate}
                disabled={duplicating || !duplicateEmployeeId}
                className="flex-1 flex items-center justify-center gap-2 bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700 disabled:opacity-50 text-sm font-medium"
              >
                <Copy className="w-4 h-4" />
                {duplicating ? 'Duplicating…' : 'Create Duplicate'}
              </button>
              <button onClick={() => { setDuplicatePlan(null); setDuplicateEmployeeId(''); }} disabled={duplicating}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
