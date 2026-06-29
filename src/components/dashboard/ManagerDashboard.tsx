import { useEffect, useState, useRef } from 'react';
import { Users, TrendingUp, Calendar, BarChart3, AlertCircle, CheckCircle2, Target, Award, Star, FileText, ShieldCheck, Clock, MessageSquare, Send, X, ChevronDown, ChevronUp, ClipboardCheck } from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '../../contexts/AuthContext';
import { supabase, Profile } from '../../lib/supabase';
import ReviewScheduling from '../manager/ReviewScheduling';
import ReviewConductor from '../manager/ReviewConductor';
import CompetencyApprovals from '../manager/CompetencyApprovals';
import TeamPerformanceOverview from '../manager/TeamPerformanceOverview';
import ModerationReviewPanel from '../moderation/ModerationReviewPanel';
import DeptLeadModerationPanel from '../moderation/DeptLeadModerationPanel';
import CreateCareerPlanModal from '../manager/CreateCareerPlanModal';
import { CareerPlanWorkflow } from '../career/CareerPlanWorkflow';

interface TeamMember extends Profile {}

interface PendingModerationItem {
  id: string;
  employee_name: string;
  job_title: string;
  rating: number;
  review_date: string;
  status?: string;
}

interface ManagerActionItem {
  id: string;
  action_text: string;
  due_date: string | null;
  status: string;
  owner_id: string;
  employee_name: string | null;
  manager_name: string | null;
  scheduled_datetime: string | null;
  cycle_name: string | null;
  cycle_type: string | null;
}

interface ReviewStatusItem {
  employee_id: string;
  employee_name: string;
  job_title: string;
  scheduled_datetime: string | null;
  completion_status: string;
}

interface ModerationOutcome {
  id: string;
  status: string;
  original_rating: number;
  current_rating: number;
  final_rating: number | null;
  manager_justification: string | null;
  created_at: string;
  review_month: string | null;
  employee_name: string;
  dept_lead_decisions: Array<{
    competency_id: string;
    competency_name: string;
    original_rating: number;
    dl_rating: number;
    dl_comment: string;
    action: 'approved' | 'adjusted';
    decided_at: string;
  }>;
}

interface ManagerDashboardProps {
  onNavigate?: (path: string) => void;
}

export function ManagerDashboard({ onNavigate }: ManagerDashboardProps = {}) {
  const { effectiveProfile: profile, resolvedDashboardRole, isViewingAs, viewedUserRole } = useAuth();
  const activeRole = isViewingAs ? viewedUserRole : resolvedDashboardRole;
  const isDeptLead = activeRole === 'dept_lead';
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showReviews, setShowReviews] = useState(false);
  const [conductingReview, setConductingReview] = useState<string | null>(null);
  const [showApprovals, setShowApprovals] = useState(false);
  const [showTeamPerformance, setShowTeamPerformance] = useState(false);
  const [pendingApprovalsCount, setPendingApprovalsCount] = useState(0);
  const [avgRating, setAvgRating] = useState<number | null>(null);
  const [oneToOneRate, setOneToOneRate] = useState<number | null>(null);
  const [moderationQueue, setModerationQueue] = useState<PendingModerationItem[]>([]);
  const [dlPendingCount, setDlPendingCount] = useState(0);
  const [activeCareerPlans, setActiveCareerPlans] = useState<{ profile_id: string; status: string; target_date: string | null }[]>([]);
  const [showModerationPanel, setShowModerationPanel] = useState(false);
  const [myActions, setMyActions] = useState<ManagerActionItem[]>([]);
  const [missedReviews, setMissedReviews] = useState<ReviewStatusItem[]>([]);
  const [overdueReviews, setOverdueReviews] = useState<ReviewStatusItem[]>([]);
  const [inProgressReviews, setInProgressReviews] = useState<ReviewStatusItem[]>([]);
  const [completedRecentReviews, setCompletedRecentReviews] = useState<ReviewStatusItem[]>([]);
  const [dueSoonReviews, setDueSoonReviews] = useState<ReviewStatusItem[]>([]);
  const [activeStatusFilter, setActiveStatusFilter] = useState<'missed'|'overdue'|'in_progress'|'completed'|'due_soon'|null>(null);
  const [seraQuery, setSeraQuery] = useState('');
  const [seraResponse, setSeraResponse] = useState('');
  const seraInputRef = useRef<HTMLInputElement>(null);
  const [moderationNotifications, setModerationNotifications] = useState<any[]>([]);
  const [moderationOutcomes, setModerationOutcomes] = useState<ModerationOutcome[]>([]);
  const [expandedModerationId, setExpandedModerationId] = useState<string | null>(null);
  const [deptLeadCompletedCases, setDeptLeadCompletedCases] = useState<PendingModerationItem[]>([]);
  const [showCreateCareerPlan, setShowCreateCareerPlan] = useState(false);
  const [pendingWayForwardPlans, setPendingWayForwardPlans] = useState<{ id: string; goal_role_title: string | null; goal_role_custom_title: string | null; employee_name: string }[]>([]);
  const [wayForwardPlanId, setWayForwardPlanId] = useState<string | null>(null);
  const [pendingConfirmationPlans, setPendingConfirmationPlans] = useState<{ id: string; plan_title: string | null; goal_role_title: string | null; goal_role_custom_title: string | null; employee_name: string }[]>([]);
  const [confirmationPlanId, setConfirmationPlanId] = useState<string | null>(null);
  const [careerSignOffActions, setCareerSignOffActions] = useState<{ id: string; title: string; plan_id: string; due_date: string | null; employee_name: string; plan_title: string }[]>([]);

  useEffect(() => {
    if (profile) {
      loadTeamData();
      loadPendingApprovals();
      loadMyActions();
      loadCareerSignOffActions();
      loadModerationNotifications();
      loadModerationOutcomes();
      loadPendingWayForwardPlans();
      loadPendingConfirmationPlans();
      if (isDeptLead) loadDeptLeadModerationCases();
    }
  }, [profile, isDeptLead]);

  async function loadMyActions() {
    if (!profile?.id) return;
    try {
      const { data } = await supabase
        .from('one_to_one_action_items')
        .select(`
          id, action_text, due_date, status, owner_id,
          meeting:one_to_one_scheduled_meetings!one_to_one_action_items_meeting_id_fkey(
            scheduled_datetime,
            oto_cycle_id,
            employee:profiles!one_to_one_scheduled_meetings_employee_id_fkey(full_name),
            manager:profiles!one_to_one_scheduled_meetings_manager_id_fkey(full_name),
            cycle:one_to_one_review_cycles!one_to_one_scheduled_meetings_oto_cycle_id_fkey(cycle_name, cycle_type)
          )
        `)
        .eq('owner_id', profile.id)
        .neq('status', 'closed')
        .order('due_date', { ascending: true })
        .limit(20);

      const items: ManagerActionItem[] = (data || []).map((row: any) => {
        const m = Array.isArray(row.meeting) ? row.meeting[0] : row.meeting;
        const emp = m ? (Array.isArray(m.employee) ? m.employee[0] : m.employee) : null;
        const mgr = m ? (Array.isArray(m.manager) ? m.manager[0] : m.manager) : null;
        const cyc = m ? (Array.isArray(m.cycle) ? m.cycle[0] : m.cycle) : null;
        return {
          id: row.id,
          action_text: row.action_text,
          due_date: row.due_date,
          status: row.status,
          owner_id: row.owner_id,
          employee_name: emp?.full_name ?? null,
          manager_name: mgr?.full_name ?? null,
          scheduled_datetime: m?.scheduled_datetime ?? null,
          cycle_name: cyc?.cycle_name ?? null,
          cycle_type: cyc?.cycle_type ?? null,
        };
      });
      setMyActions(items);
    } catch (error) {
      console.error('Error loading manager actions:', error);
    }
  }

  async function loadCareerSignOffActions() {
    if (!profile?.id) return;
    try {
      const { data } = await supabase
        .from('career_plan_actions')
        .select(`
          id, title, plan_id, due_date,
          plan:career_plans!career_plan_actions_plan_id_fkey(
            status, plan_title, goal_role_title, goal_role_custom_title,
            employee:profiles!career_plans_profile_id_fkey(full_name)
          )
        `)
        .eq('owner_id', profile.id)
        .is('completed_at', null)
        .order('due_date', { ascending: true });

      const items = (data || [])
        .filter((row: any) => {
          const plan = Array.isArray(row.plan) ? row.plan[0] : row.plan;
          return plan && (plan.status === 'active' || plan.status === 'in_progress');
        })
        .map((row: any) => {
          const plan = Array.isArray(row.plan) ? row.plan[0] : row.plan;
          const emp = plan ? (Array.isArray(plan.employee) ? plan.employee[0] : plan.employee) : null;
          return {
            id: row.id,
            title: row.title,
            plan_id: row.plan_id,
            due_date: row.due_date,
            employee_name: emp?.full_name || '',
            plan_title: plan?.plan_title || plan?.goal_role_custom_title || plan?.goal_role_title || 'Career Plan',
          };
        });

      setCareerSignOffActions(items);
    } catch (error) {
      console.error('Error loading career sign-off actions:', error);
    }
  }

  async function loadPendingApprovals() {
    if (!profile?.id) return;
    try {
      const { count } = await supabase
        .from('review_approvals')
        .select('*', { count: 'exact', head: true })
        .eq('approver_id', profile.id)
        .eq('status', 'pending');
      setPendingApprovalsCount(count || 0);
    } catch (error) {
      console.error('Error loading pending approvals:', error);
    }
  }

  async function loadModerationNotifications() {
    if (!profile?.id) return;
    try {
      const { data } = await supabase
        .from('review_notifications')
        .select('id, notification_type, title, message, is_read, created_at, competency_name, original_rating, moderated_rating, moderator_level')
        .eq('recipient_id', profile.id)
        .in('notification_type', [
          'moderation_rating_adjusted',
          'moderation_approved_dept_lead',
          'moderation_finalised',
        ])
        .order('created_at', { ascending: false })
        .limit(10);
      setModerationNotifications(data || []);
    } catch {
      // non-blocking
    }
  }

  async function loadModerationOutcomes() {
    if (!profile?.id) return;
    try {
      const { data } = await supabase
        .from('moderation_cases')
        .select(`
          id, status, original_rating, current_rating, final_rating,
          manager_justification, created_at, dept_lead_decisions,
          employee:profiles!moderation_cases_employee_id_fkey(full_name),
          review:one_to_one_monthly_reviews!moderation_cases_review_id_fkey(review_month)
        `)
        .eq('manager_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(20);

      const shaped: ModerationOutcome[] = (data || []).map((c: any) => {
        const emp = Array.isArray(c.employee) ? c.employee[0] : c.employee;
        const rev = Array.isArray(c.review) ? c.review[0] : c.review;
        return {
          id: c.id,
          status: c.status,
          original_rating: Number(c.original_rating),
          current_rating: Number(c.current_rating),
          final_rating: c.final_rating != null ? Number(c.final_rating) : null,
          manager_justification: c.manager_justification || null,
          created_at: c.created_at,
          review_month: rev?.review_month || null,
          employee_name: emp?.full_name || 'Team member',
          dept_lead_decisions: Array.isArray(c.dept_lead_decisions) ? c.dept_lead_decisions : [],
        };
      });
      setModerationOutcomes(shaped);
    } catch {
      // non-blocking
    }
  }

  async function loadPendingWayForwardPlans() {
    if (!profile?.id) return;
    try {
      // Plans where employee has completed their input and manager needs to add Way Forward
      // Manager is either the manager_id or created_by_user_id
      const { data } = await supabase
        .from('career_plans')
        .select(`
          id, goal_role_title, goal_role_custom_title,
          employee:profiles!career_plans_profile_id_fkey(full_name)
        `)
        .eq('status', 'pending_manager_wayforward')
        .or(`manager_id.eq.${profile.id},created_by_user_id.eq.${profile.id}`)
        .order('sent_to_manager_at', { ascending: true });

      if (!data) return;
      setPendingWayForwardPlans(data.map((p: any) => {
        const emp = Array.isArray(p.employee) ? p.employee[0] : p.employee;
        return {
          id: p.id,
          goal_role_title: p.goal_role_title,
          goal_role_custom_title: p.goal_role_custom_title,
          employee_name: emp?.full_name || 'Team Member',
        };
      }));
    } catch {
      // non-blocking
    }
  }

  async function loadPendingConfirmationPlans() {
    if (!profile?.id) return;
    try {
      // Plans created by admin, awaiting manager confirmation
      // Employee's manager_id = profile.id (join via employee profile)
      const { data: teamProfiles } = await supabase
        .from('profiles')
        .select('id')
        .eq('manager_id', profile.id)
        .eq('active', true);
      const teamIds = (teamProfiles || []).map((p: any) => p.id);
      if (teamIds.length === 0) return;

      const { data } = await supabase
        .from('career_plans')
        .select(`
          id, plan_title, goal_role_title, goal_role_custom_title,
          employee:profiles!career_plans_profile_id_fkey(full_name)
        `)
        .eq('status', 'pending_manager_confirmation')
        .in('profile_id', teamIds)
        .order('created_at', { ascending: true });

      if (!data) return;
      setPendingConfirmationPlans(data.map((p: any) => {
        const emp = Array.isArray(p.employee) ? p.employee[0] : p.employee;
        return {
          id: p.id,
          plan_title: p.plan_title,
          goal_role_title: p.goal_role_title,
          goal_role_custom_title: p.goal_role_custom_title,
          employee_name: emp?.full_name || 'Team Member',
        };
      }));
    } catch {
      // non-blocking
    }
  }

  async function loadDeptLeadModerationCases() {
    if (!profile?.department) return;
    try {
      const { data: deptProfiles } = await supabase
        .from('profiles')
        .select('id')
        .eq('department', profile.department)
        .eq('active', true);
      const empIds = (deptProfiles || []).map((p: any) => p.id);
      if (empIds.length === 0) return;

      // Pending cases — used for the tile count
      const { data: pendingCases } = await supabase
        .from('moderation_cases')
        .select('id, employee_id, current_rating, created_at')
        .in('employee_id', empIds)
        .eq('current_step', 1)
        .in('status', ['pending', 'in_review'])
        .order('created_at', { ascending: false });

      // Completed cases — shown as history inside the card
      const { data: completedCases } = await supabase
        .from('moderation_cases')
        .select('id, employee_id, current_rating, final_rating, status, created_at')
        .in('employee_id', empIds)
        .eq('current_step', 1)
        .in('status', ['approved', 'adjusted'])
        .order('created_at', { ascending: false })
        .limit(20);

      const allIds = [
        ...new Set([
          ...(pendingCases || []).map((c: any) => c.employee_id),
          ...(completedCases || []).map((c: any) => c.employee_id),
        ]),
      ];

      const profileMap: Record<string, any> = {};
      if (allIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, job_title')
          .in('id', allIds);
        (profiles || []).forEach((p: any) => { profileMap[p.id] = p; });
      }

      const pending = (pendingCases || []).map((c: any) => ({
        id: c.id,
        employee_name: profileMap[c.employee_id]?.full_name || 'Unknown',
        job_title: profileMap[c.employee_id]?.job_title || '',
        rating: Number(c.current_rating) || 0,
        review_date: c.created_at,
      }));
      setModerationQueue(pending);
      setDlPendingCount(pending.length);

      setDeptLeadCompletedCases((completedCases || []).map((c: any) => ({
        id: c.id,
        employee_name: profileMap[c.employee_id]?.full_name || 'Unknown',
        job_title: profileMap[c.employee_id]?.job_title || '',
        rating: Number(c.final_rating ?? c.current_rating) || 0,
        review_date: c.created_at,
        status: c.status,
      })));
    } catch {
      // non-blocking
    }
  }

  async function markNotificationRead(id: string) {
    await supabase.from('review_notifications').update({ is_read: true }).eq('id', id);
    setModerationNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
  }

  async function loadTeamData() {
    if (!profile?.id) {
      setLoading(false);
      return;
    }

    try {
      const { data: team } = await supabase
        .from('profiles')
        .select('*')
        .eq('manager_id', profile.id);

      const teamList = team || [];
      const teamIds = teamList.map(m => m.id);

      setTeamMembers(teamList);

      if (teamIds.length === 0) {
        setLoading(false);
        return;
      }

      const [meetingsRes, reviewsRes, careerPlansRes] = await Promise.all([
        // All scheduled meetings for team — for completion rate and review status
        supabase
          .from('one_to_one_scheduled_meetings')
          .select('id, employee_id, scheduled_datetime, completion_status, status')
          .in('employee_id', teamIds),
        // Completed monthly reviews with ratings — for avg rating and team performance
        supabase
          .from('one_to_one_monthly_reviews')
          .select('employee_id, overall_average, average_kpi_score, overall_competency_score, status')
          .in('employee_id', teamIds)
          .in('status', ['submitted', 'completed']),
        supabase
          .from('career_plans')
          .select('profile_id, status, target_date')
          .in('profile_id', teamIds)
          .in('status', ['draft', 'sent_to_manager', 'manager_approved', 'pending_employee_input', 'pending_manager_wayforward', 'pending_manager_confirmation', 'active', 'in_progress']),
      ]);

      // Completion rate: completed meetings / total meetings
      const allMeetings = meetingsRes.data || [];
      const completedMeetings = allMeetings.filter(m => m.completion_status === 'completed').length;
      if (allMeetings.length > 0) {
        setOneToOneRate(Math.round((completedMeetings / allMeetings.length) * 100));
      }

      // Categorize meetings by status for review tracking
      const now = new Date();
      const toItem = (m: typeof allMeetings[0]): ReviewStatusItem | null => {
        const member = teamList.find(t => t.id === m.employee_id);
        if (!member) return null;
        return {
          employee_id: m.employee_id,
          employee_name: member.full_name,
          job_title: member.job_title || '',
          scheduled_datetime: m.scheduled_datetime,
          completion_status: m.completion_status || m.status || '',
        };
      };

      const soon = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

      const missed = allMeetings
        .filter(m => m.completion_status === 'missed')
        .map(toItem).filter(Boolean) as ReviewStatusItem[];

      const overdue = allMeetings
        .filter(m =>
          m.completion_status !== 'completed' &&
          m.completion_status !== 'missed' &&
          m.completion_status !== 'in_progress' &&
          m.status !== 'in_progress' &&
          m.scheduled_datetime &&
          new Date(m.scheduled_datetime) < now
        )
        .map(toItem).filter(Boolean) as ReviewStatusItem[];

      const inProgress = allMeetings
        .filter(m => m.completion_status === 'in_progress' || m.status === 'in_progress')
        .map(toItem).filter(Boolean) as ReviewStatusItem[];

      const completedRecent = allMeetings
        .filter(m => m.completion_status === 'completed')
        .map(toItem).filter(Boolean) as ReviewStatusItem[];

      const dueSoon = allMeetings
        .filter(m =>
          m.completion_status !== 'completed' &&
          m.completion_status !== 'missed' &&
          m.scheduled_datetime &&
          new Date(m.scheduled_datetime) >= now &&
          new Date(m.scheduled_datetime) <= soon
        )
        .map(toItem).filter(Boolean) as ReviewStatusItem[];

      setMissedReviews(missed);
      setOverdueReviews(overdue);
      setInProgressReviews(inProgress);
      setCompletedRecentReviews(completedRecent);
      setDueSoonReviews(dueSoon);

      // Average rating from completed reviews only
      const completedReviews = reviewsRes.data || [];
      const reviewsWithRating = completedReviews.filter(r => r.overall_average != null && r.overall_average > 0);
      if (reviewsWithRating.length > 0) {
        const avg = reviewsWithRating.reduce((s, r) => s + r.overall_average, 0) / reviewsWithRating.length;
        setAvgRating(avg);
      }

      setActiveCareerPlans(careerPlansRes.data || []);

      // Moderation queue: for non-DL managers, team members whose completed reviews have high ratings
      // DL managers use loadDeptLeadModerationCases() instead, so skip this to avoid overwriting
      if (!isDeptLead) {
        const highRatedReviews = completedReviews
          .filter(r => r.overall_average != null && r.overall_average >= 4)
          .map(r => {
            const member = teamList.find(m => m.id === r.employee_id);
            return member ? {
              id: r.employee_id,
              employee_name: member.full_name,
              job_title: member.job_title || '',
              rating: r.overall_average,
              review_date: new Date().toISOString(),
            } : null;
          })
          .filter(Boolean) as PendingModerationItem[];

        setModerationQueue(highRatedReviews.slice(0, 5));
      }

    } catch (error) {
      console.error('Error loading team data:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-slate-600">Loading dashboard...</p>
      </div>
    );
  }

  if (conductingReview) {
    return (
      <ReviewConductor
        meetingId={conductingReview}
        onClose={() => setConductingReview(null)}
      />
    );
  }

  if (showReviews) {
    return (
      <div>
        <button onClick={() => setShowReviews(false)} className="mb-4 text-blue-600 hover:text-blue-800 font-medium">
          ← Back to Dashboard
        </button>
        <ReviewScheduling onStartReview={(id) => setConductingReview(id)} />
      </div>
    );
  }

  if (showApprovals) {
    return (
      <div>
        <button onClick={() => setShowApprovals(false)} className="mb-4 text-blue-600 hover:text-blue-800 font-medium">
          ← Back to Dashboard
        </button>
        <CompetencyApprovals />
      </div>
    );
  }

  if (showTeamPerformance) {
    return (
      <div>
        <button onClick={() => setShowTeamPerformance(false)} className="mb-4 text-blue-600 hover:text-blue-800 font-medium">
          ← Back to Dashboard
        </button>
        <TeamPerformanceOverview />
      </div>
    );
  }

  if (showModerationPanel) {
    return (
      <div>
        <button onClick={() => setShowModerationPanel(false)} className="mb-4 text-blue-600 hover:text-blue-800 font-medium">
          ← Back to Dashboard
        </button>
        {isDeptLead
          ? <DeptLeadModerationPanel department={profile?.department ?? undefined} readOnly={isViewingAs} />
          : <ModerationReviewPanel />
        }
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Way Forward overlay */}
      {wayForwardPlanId && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <CareerPlanWorkflow
              planId={wayForwardPlanId}
              viewerRole="manager"
              onClose={() => {
                setWayForwardPlanId(null);
                loadPendingWayForwardPlans();
                loadTeamData();
              }}
            />
          </div>
        </div>
      )}

      {/* Plan Confirmation overlay */}
      {confirmationPlanId && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <CareerPlanWorkflow
              planId={confirmationPlanId}
              viewerRole="manager"
              onClose={() => {
                setConfirmationPlanId(null);
                loadPendingConfirmationPlans();
                loadTeamData();
              }}
            />
          </div>
        </div>
      )}

      {/* Pending Way Forward banners */}
      {pendingWayForwardPlans.length > 0 && (
        <div className="space-y-2">
          {pendingWayForwardPlans.map(plan => (
            <div key={plan.id} className="bg-blue-50 border border-blue-300 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-blue-100 rounded-lg flex-shrink-0 mt-0.5">
                  <Target className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-blue-900">Way Forward Needed</p>
                  <p className="text-xs text-blue-700 mt-0.5">
                    <strong>{plan.employee_name}</strong> has completed their self-assessment for <strong>{plan.goal_role_custom_title || plan.goal_role_title || 'their career plan'}</strong>. Add the Way Forward to activate the plan.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setWayForwardPlanId(plan.id)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors flex-shrink-0"
              >
                Add Way Forward
                <TrendingUp className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Pending Plan Confirmation banners */}
      {pendingConfirmationPlans.length > 0 && (
        <div className="space-y-2">
          {pendingConfirmationPlans.map(plan => (
            <div key={plan.id} className="bg-sky-50 border border-sky-300 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-sky-100 rounded-lg flex-shrink-0 mt-0.5">
                  <Target className="w-4 h-4 text-sky-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-sky-900">Career Plan Awaiting Your Confirmation</p>
                  <p className="text-xs text-sky-700 mt-0.5">
                    A plan for <strong>{plan.employee_name}</strong> — <strong>{plan.plan_title || plan.goal_role_custom_title || plan.goal_role_title || 'Career Plan'}</strong> — has been created and requires your confirmation to activate.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setConfirmationPlanId(plan.id)}
                className="flex items-center gap-2 px-4 py-2 bg-sky-600 text-white text-sm font-medium rounded-lg hover:bg-sky-700 transition-colors flex-shrink-0"
              >
                Review & Confirm
                <CheckCircle2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-4 pt-2">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Manager Dashboard</h1>
          <p className="text-slate-500 mt-1">Manage your team's performance and development</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setShowTeamPerformance(true)}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
          >
            <BarChart3 className="w-4 h-4" />
            Team Performance
          </button>
          <button
            onClick={() => setShowReviews(true)}
            className="flex items-center gap-2 bg-slate-700 text-white px-4 py-2 rounded-lg hover:bg-slate-800 transition-colors text-sm font-medium"
          >
            <Calendar className="w-4 h-4" />
            Schedule Reviews
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="card p-5 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Team Size</p>
            <div className="p-2 bg-blue-100 rounded-lg">
              <Users className="w-4 h-4 text-blue-600" />
            </div>
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-900">{teamMembers.length}</p>
            <p className="text-xs text-slate-500 mt-0.5">Direct reports</p>
          </div>
        </div>

        <div className="card p-5 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Career Plans</p>
            <div className="p-2 bg-green-100 rounded-lg">
              <FileText className="w-4 h-4 text-green-600" />
            </div>
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-900">{activeCareerPlans.length}</p>
            <p className="text-xs text-slate-500 mt-0.5">In progress</p>
          </div>
        </div>

        <div className="card p-5 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Actions to Sign Off</p>
            <div className="p-2 bg-orange-100 rounded-lg">
              <ClipboardCheck className="w-4 h-4 text-orange-600" />
            </div>
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-900">{careerSignOffActions.length}</p>
            <p className="text-xs text-slate-500 mt-0.5">Career actions awaiting you</p>
          </div>
          {careerSignOffActions.length > 0 && (
            <div className="space-y-1.5 pt-1 border-t border-gray-100">
              {careerSignOffActions.slice(0, 3).map(a => (
                <div key={a.id} className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-orange-400 flex-shrink-0 mt-1.5" />
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-slate-700 truncate">{a.title}</p>
                    <p className="text-xs text-slate-400">{a.employee_name} · {a.plan_title}</p>
                  </div>
                </div>
              ))}
              {careerSignOffActions.length > 3 && (
                <p className="text-xs text-slate-400 pl-3.5">+{careerSignOffActions.length - 3} more</p>
              )}
            </div>
          )}
        </div>

        <div className="card p-5 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Avg Rating</p>
            <div className="p-2 bg-amber-100 rounded-lg">
              <Star className="w-4 h-4 text-amber-600" />
            </div>
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-900">
              {avgRating !== null ? avgRating.toFixed(1) : '—'}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">From 1:1s</p>
          </div>
        </div>

        <div className="card p-5 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">1:1 Completion</p>
            <div className="p-2 bg-teal-100 rounded-lg">
              <CheckCircle2 className="w-4 h-4 text-teal-600" />
            </div>
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-900">
              {oneToOneRate !== null ? `${oneToOneRate}%` : '—'}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">Last 30 days</p>
          </div>
        </div>

        <div className="card p-5 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Moderation</p>
            <div className="p-2 bg-rose-100 rounded-lg">
              <AlertCircle className="w-4 h-4 text-rose-600" />
            </div>
          </div>
          <div>
            {isDeptLead ? (
              <>
                <p className="text-2xl font-bold text-slate-900">{dlPendingCount}</p>
                <p className="text-xs text-slate-500 mt-0.5">Pending review</p>
              </>
            ) : (
              <>
                <p className="text-2xl font-bold text-slate-900">
                  {moderationOutcomes.filter(c => c.status === 'pending' || c.status === 'in_review').length}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">Pending moderation</p>
              </>
            )}
          </div>
        </div>
      </div>

      {myActions.length > 0 && (
        <div className="card">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 bg-orange-100 rounded-lg">
              <Clock className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">My Actions</h3>
              <p className="text-xs text-slate-500">{myActions.length} open action{myActions.length !== 1 ? 's' : ''} assigned to you from 1:1s</p>
            </div>
          </div>
          <div className="space-y-2">
            {myActions.map(item => {
              const isOverdue = item.due_date && new Date(item.due_date) < new Date();
              const isCompleted = item.status === 'completed';
              const reviewLabel = item.cycle_name
                ? item.cycle_name
                : item.cycle_type
                  ? item.cycle_type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
                  : '1:1 Review';

              const statusColor = isCompleted
                ? 'bg-green-50 border-green-100'
                : isOverdue
                  ? 'bg-red-50 border-red-100'
                  : 'bg-slate-50 border-slate-100';
              const dotColor = isCompleted
                ? 'bg-green-500'
                : isOverdue
                  ? 'bg-red-500'
                  : item.due_date
                    ? 'bg-orange-500'
                    : 'bg-blue-400';

              return (
                <div key={item.id} className={`p-3 rounded-lg border ${statusColor}`}>
                  {/* Context row: employee, review type, review date */}
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-2">
                    {item.employee_name && (
                      <div className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                        <span className="text-xs font-medium text-slate-700">{item.employee_name}</span>
                      </div>
                    )}
                    <span className="text-xs px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-medium">{reviewLabel}</span>
                    {item.scheduled_datetime && (
                      <span className="text-xs text-slate-400">
                        {format(new Date(item.scheduled_datetime), 'dd MMM yyyy')}
                      </span>
                    )}
                    {/* Status badge */}
                    <span className={`ml-auto text-xs px-2 py-0.5 rounded-full font-medium ${
                      isCompleted ? 'bg-green-100 text-green-700' :
                      isOverdue   ? 'bg-red-100 text-red-700' :
                      item.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                      'bg-orange-100 text-orange-700'
                    }`}>
                      {isCompleted ? 'Completed' : isOverdue ? 'Overdue' : item.status === 'in_progress' ? 'In Progress' : 'Open'}
                    </span>
                  </div>

                  {/* Action text */}
                  <div className="flex items-start gap-2.5">
                    <div className={`w-2 h-2 rounded-full mt-1 flex-shrink-0 ${dotColor}`} />
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm leading-snug ${isCompleted ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
                        {item.action_text}
                      </p>

                      {/* Footer: due date + owner */}
                      <div className="flex flex-wrap items-center gap-x-3 mt-1.5">
                        {item.due_date && (
                          <p className={`text-xs ${isOverdue && !isCompleted ? 'text-red-600 font-medium' : 'text-slate-400'}`}>
                            Due {format(new Date(item.due_date), 'MMM d, yyyy')}
                            {isOverdue && !isCompleted && ' — Overdue'}
                          </p>
                        )}
                        <p className="text-xs text-slate-400">
                          Owner: <span className="text-slate-600">{item.manager_name || 'You'}</span>
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {(missedReviews.length > 0 || overdueReviews.length > 0 || inProgressReviews.length > 0 || completedRecentReviews.length > 0 || dueSoonReviews.length > 0) && (() => {
        const statusConfigs: { key: 'in_progress'|'missed'|'overdue'|'completed'|'due_soon'; label: string; items: ReviewStatusItem[]; dot: string; bg: string; border: string; text: string }[] = [
          { key: 'in_progress', label: 'In Progress', items: inProgressReviews,      dot: 'bg-blue-500',   bg: 'bg-blue-50',   border: 'border-blue-200', text: 'text-blue-700' },
          { key: 'missed',      label: 'Missed',      items: missedReviews,           dot: 'bg-red-500',    bg: 'bg-red-50',    border: 'border-red-200',  text: 'text-red-700' },
          { key: 'overdue',     label: 'Overdue',     items: overdueReviews,          dot: 'bg-amber-500',  bg: 'bg-amber-50',  border: 'border-amber-200',text: 'text-amber-700' },
          { key: 'completed',   label: 'Completed',   items: completedRecentReviews,  dot: 'bg-green-500',  bg: 'bg-green-50',  border: 'border-green-200',text: 'text-green-700' },
          { key: 'due_soon',    label: 'Due Soon',    items: dueSoonReviews,          dot: 'bg-sky-500',    bg: 'bg-sky-50',    border: 'border-sky-200',  text: 'text-sky-700' },
        ];
        const active = activeStatusFilter ? statusConfigs.find(s => s.key === activeStatusFilter) : null;
        return (
          <div className="card">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 bg-red-100 rounded-lg"><AlertCircle className="w-5 h-5 text-red-600" /></div>
              <div>
                <h3 className="font-semibold text-slate-900">1:1 Review Status</h3>
                <p className="text-xs text-slate-500">Click a tile to see employee details</p>
              </div>
              {activeStatusFilter && (
                <button onClick={() => setActiveStatusFilter(null)} className="ml-auto flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600">
                  <X className="w-3.5 h-3.5" /> Clear
                </button>
              )}
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mb-4">
              {statusConfigs.map(s => (
                <button
                  key={s.key}
                  onClick={() => setActiveStatusFilter(activeStatusFilter === s.key ? null : s.key)}
                  className={`p-3 rounded-xl border text-left transition-all ${s.bg} ${activeStatusFilter === s.key ? `${s.border} ring-2 ring-offset-1 ring-current` : 'border-slate-100 hover:' + s.border}`}
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className={`w-2 h-2 rounded-full ${s.dot}`} />
                    <span className={`text-xs font-medium ${s.text}`}>{s.label}</span>
                  </div>
                  <p className="text-xl font-bold text-slate-900">{s.items.length}</p>
                </button>
              ))}
            </div>
            {active && active.items.length > 0 && (
              <div className="space-y-1.5 max-h-60 overflow-y-auto">
                {active.items.map(item => (
                  <div key={`${item.employee_id}-${item.scheduled_datetime}`} className={`flex items-start justify-between p-2.5 ${active.bg} border ${active.border} rounded-lg`}>
                    <div>
                      <p className="text-sm font-medium text-slate-900">{item.employee_name}</p>
                      {item.job_title && <p className="text-xs text-slate-500 mt-0.5">{item.job_title}</p>}
                    </div>
                    {item.scheduled_datetime && (
                      <p className={`text-xs font-medium shrink-0 ml-3 ${active.text}`}>{format(new Date(item.scheduled_datetime), 'dd MMM yyyy')}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
            {active && active.items.length === 0 && (
              <p className="text-sm text-slate-400 text-center py-3">No {active.label.toLowerCase()} reviews</p>
            )}
          </div>
        );
      })()}

      {pendingApprovalsCount > 0 && (
        <div
          className="card bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-300 cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => setShowApprovals(true)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-amber-200 rounded-lg">
                <AlertCircle className="w-7 h-7 text-amber-800" />
              </div>
              <div>
                <p className="font-semibold text-slate-900">{pendingApprovalsCount} Pending Approval{pendingApprovalsCount !== 1 ? 's' : ''}</p>
                <p className="text-sm text-amber-700 mt-0.5">Expert rating assessments awaiting your review</p>
              </div>
            </div>
            <button className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors text-sm font-medium">
              Review Now
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 bg-blue-100 rounded-lg">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">9-Box Talent Overview</h3>
              <p className="text-xs text-slate-500">Performance vs potential distribution</p>
            </div>
          </div>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Target className="w-10 h-10 text-slate-300 mb-3" />
            <p className="text-sm font-medium text-slate-500">No Performance Grid data available</p>
            <p className="text-xs text-slate-400 mt-1">Performance and potential ratings are required to populate this view</p>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center gap-3 mb-5">
            <div className="p-2.5 bg-teal-100 rounded-lg">
              <Award className="w-5 h-5 text-teal-600" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">Skills Overview</h3>
              <p className="text-xs text-slate-500">Team skills matrix</p>
            </div>
          </div>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Award className="w-10 h-10 text-slate-300 mb-3" />
            <p className="text-sm font-medium text-slate-500">View team skills in Skills Matrix</p>
            <p className="text-xs text-slate-400 mt-1">Navigate to Skills Matrix to see your team's training records and progress</p>
          </div>
        </div>
      </div>

      {/* Non-DL managers: pending moderation queue card */}
      {!isDeptLead && moderationQueue.length > 0 && (
        <div className="card">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-rose-100 rounded-lg">
                <TrendingUp className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">Moderation Queue</h3>
                <p className="text-xs text-slate-500">1:1 reviews with ratings ≥4 pending review</p>
              </div>
            </div>
          </div>
          <div className="space-y-2.5">
            {moderationQueue.map(item => (
              <div key={item.id} className="flex items-center justify-between p-3 bg-rose-50 rounded-lg border border-rose-100">
                <div>
                  <p className="text-sm font-medium text-slate-900">{item.employee_name}</p>
                  <p className="text-xs text-slate-500">{item.job_title}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs bg-rose-200 text-rose-800 px-2.5 py-1 rounded-full font-semibold">
                    Rating {item.rating.toFixed(1)}
                  </span>
                  <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">Pending</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!isDeptLead && moderationOutcomes.length > 0 && (() => {
        const pending  = moderationOutcomes.filter(c => c.status === 'pending' || c.status === 'in_review');
        const accepted = moderationOutcomes.filter(c => c.status === 'approved');
        const adjusted = moderationOutcomes.filter(c => c.status === 'adjusted');

        const STATUS_CONFIG: Record<string, { label: string; bg: string; border: string; text: string; dot: string }> = {
          pending:   { label: 'Pending',   bg: 'bg-amber-50',  border: 'border-amber-200', text: 'text-amber-800',  dot: 'bg-amber-400' },
          in_review: { label: 'In Review', bg: 'bg-blue-50',   border: 'border-blue-200',  text: 'text-blue-800',   dot: 'bg-blue-400' },
          approved:  { label: 'Accepted',  bg: 'bg-green-50',  border: 'border-green-200', text: 'text-green-800',  dot: 'bg-green-500' },
          adjusted:  { label: 'Adjusted',  bg: 'bg-orange-50', border: 'border-orange-200',text: 'text-orange-800', dot: 'bg-orange-500' },
        };

        return (
          <div className="card">
            <div className="flex items-center gap-3 mb-5">
              <div className="p-2.5 bg-amber-100 rounded-lg">
                <ShieldCheck className="w-5 h-5 text-amber-700" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">Moderation Updates</h3>
                <p className="text-xs text-slate-500">
                  {pending.length > 0
                    ? `${pending.length} awaiting review · ${accepted.length} accepted · ${adjusted.length} adjusted`
                    : `${accepted.length} accepted · ${adjusted.length} adjusted — all moderation complete`}
                </p>
              </div>
            </div>

            {/* Summary counts */}
            <div className="grid grid-cols-3 gap-3 mb-5">
              {[
                { label: 'Pending', count: pending.length, colour: 'bg-amber-50 border-amber-200 text-amber-800' },
                { label: 'Accepted', count: accepted.length, colour: 'bg-green-50 border-green-200 text-green-800' },
                { label: 'Adjusted', count: adjusted.length, colour: 'bg-orange-50 border-orange-200 text-orange-800' },
              ].map(s => (
                <div key={s.label} className={`rounded-xl border p-3 text-center ${s.colour}`}>
                  <p className="text-2xl font-bold">{s.count}</p>
                  <p className="text-xs font-medium mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>

            <div className="space-y-3">
              {moderationOutcomes.map(c => {
                const cfg = STATUS_CONFIG[c.status] || STATUS_CONFIG['pending'];
                const isExpanded = expandedModerationId === c.id;
                const adjustedDecisions = c.dept_lead_decisions.filter(d => d.action === 'adjusted');
                const approvedDecisions = c.dept_lead_decisions.filter(d => d.action === 'approved');
                const monthLabel = c.review_month
                  ? format(new Date(c.review_month + 'T12:00:00'), 'MMMM yyyy')
                  : format(new Date(c.created_at), 'd MMM yyyy');

                return (
                  <div key={c.id} className={`rounded-xl border overflow-hidden ${cfg.bg} ${cfg.border}`}>
                    <button
                      onClick={() => setExpandedModerationId(isExpanded ? null : c.id)}
                      className="w-full px-4 py-3 flex items-center justify-between hover:brightness-95 transition-all text-left"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${cfg.dot}`} />
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-900">{c.employee_name}</p>
                          <p className="text-xs text-slate-500">{monthLabel} review</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-3 flex-shrink-0">
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${cfg.bg} ${cfg.border} ${cfg.text}`}>
                          {cfg.label}
                        </span>
                        <span className="text-xs text-slate-500">
                          Submitted: {c.original_rating.toFixed(1)}/5
                        </span>
                        {c.status === 'adjusted' && c.dept_lead_decisions.length > 0 && (
                          <span className="text-xs text-orange-700 font-medium">
                            → {(c.dept_lead_decisions.reduce((s, d) => s + d.dl_rating, 0) / c.dept_lead_decisions.length).toFixed(1)}/5 avg
                          </span>
                        )}
                        {isExpanded
                          ? <ChevronUp className="w-4 h-4 text-slate-400" />
                          : <ChevronDown className="w-4 h-4 text-slate-400" />}
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="border-t border-current/10 px-4 pb-4 pt-3 space-y-4 bg-white/60">
                        {/* Manager justification */}
                        {c.manager_justification && (
                          <div>
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Your Justification</p>
                            <p className="text-sm text-slate-700 leading-relaxed bg-white rounded-lg p-2.5 border border-slate-200">
                              {c.manager_justification}
                            </p>
                          </div>
                        )}

                        {/* Dept Lead decisions per competency */}
                        {c.dept_lead_decisions.length > 0 ? (
                          <div>
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                              Dept Lead Decision ({adjustedDecisions.length} adjusted, {approvedDecisions.length} accepted)
                            </p>
                            <div className="space-y-2">
                              {c.dept_lead_decisions.map((d, i) => (
                                <div
                                  key={i}
                                  className={`rounded-lg p-3 border ${d.action === 'adjusted' ? 'bg-orange-50 border-orange-200' : 'bg-green-50 border-green-200'}`}
                                >
                                  <div className="flex items-start justify-between gap-2 flex-wrap">
                                    <p className="text-sm font-medium text-slate-800">{d.competency_name}</p>
                                    <div className="flex items-center gap-1.5 flex-shrink-0">
                                      <span className="text-xs text-slate-500">{d.original_rating}/5</span>
                                      {d.action === 'adjusted' && (
                                        <>
                                          <span className="text-xs text-slate-400">→</span>
                                          <span className="text-xs font-semibold text-orange-700">{d.dl_rating}/5</span>
                                          <span className="text-xs bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded font-medium">Adjusted</span>
                                        </>
                                      )}
                                      {d.action === 'approved' && (
                                        <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-medium">Accepted</span>
                                      )}
                                    </div>
                                  </div>
                                  {d.dl_comment?.trim() && (
                                    <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">{d.dl_comment}</p>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <p className="text-xs text-slate-400 italic">
                            {c.status === 'pending' || c.status === 'in_review'
                              ? 'Awaiting Dept Lead review — no decisions recorded yet.'
                              : 'No per-competency decisions recorded.'}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {!isDeptLead && moderationNotifications.length > 0 && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-slate-100 rounded-lg">
                <ShieldCheck className="w-5 h-5 text-slate-600" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">Moderation Feedback</h3>
                <p className="text-xs text-slate-500">Updates from Department Lead moderation</p>
              </div>
            </div>
            {moderationNotifications.some(n => !n.is_read) && (
              <span className="text-xs bg-amber-100 text-amber-800 font-semibold px-2.5 py-1 rounded-full border border-amber-200">
                {moderationNotifications.filter(n => !n.is_read).length} new
              </span>
            )}
          </div>
          <div className="space-y-2.5">
            {moderationNotifications.map(n => (
              <div
                key={n.id}
                className={`p-3.5 rounded-xl border transition-all ${
                  !n.is_read
                    ? 'bg-amber-50 border-amber-200'
                    : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900">{n.title}</p>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">{n.message}</p>
                    {n.competency_name && n.original_rating && n.moderated_rating && (
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-xs bg-slate-200 text-slate-700 px-2 py-0.5 rounded font-medium">
                          {n.competency_name}
                        </span>
                        <span className="text-xs text-slate-400">
                          {n.original_rating}/5 → {n.moderated_rating}/5
                        </span>
                        <span className="text-xs font-medium px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">
                          Dept Lead
                        </span>
                      </div>
                    )}
                    <p className="text-xs text-slate-400 mt-1.5">
                      {format(new Date(n.created_at), 'd MMM yyyy')}
                    </p>
                  </div>
                  {!n.is_read && (
                    <button
                      onClick={() => markNotificationRead(n.id)}
                      className="p-1 text-slate-400 hover:text-slate-700 shrink-0"
                      title="Mark as read"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-900 text-base">Active Career Plans</h3>
          <button
            onClick={() => setShowCreateCareerPlan(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
          >
            <Target className="w-3.5 h-3.5" />
            Create Plan for Team Member
          </button>
        </div>
        {activeCareerPlans.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <FileText className="w-10 h-10 text-slate-300 mb-3" />
            <p className="text-sm font-medium text-slate-500">No active career plans</p>
            <p className="text-xs text-slate-400 mt-1">Team members have not submitted any career plans yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {activeCareerPlans.map((plan) => {
              const member = teamMembers.find(m => m.id === plan.profile_id);
              if (!member) return null;
              const statusLabels: Record<string, string> = {
                draft: 'Draft',
                sent_to_manager: 'Awaiting Review',
                manager_approved: 'Approved',
                pending_employee_input: 'Awaiting Employee',
                pending_manager_wayforward: 'Way Forward Needed',
                pending_manager_confirmation: 'Awaiting Confirmation',
                active: 'Active',
                in_progress: 'In Progress',
              };
              const statusColors: Record<string, string> = {
                draft: 'bg-slate-100 text-slate-600',
                sent_to_manager: 'bg-amber-100 text-amber-700',
                manager_approved: 'bg-green-100 text-green-700',
                pending_employee_input: 'bg-sky-100 text-sky-700',
                pending_manager_wayforward: 'bg-blue-100 text-blue-700',
                pending_manager_confirmation: 'bg-sky-100 text-sky-700',
                active: 'bg-teal-100 text-teal-700',
                in_progress: 'bg-teal-100 text-teal-700',
              };
              return (
                <div key={plan.profile_id} className="flex items-center gap-4 p-3 border border-slate-200 rounded-lg">
                  <div className="w-9 h-9 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-medium flex-shrink-0">
                    {member.full_name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{member.full_name}</p>
                    <p className="text-xs text-slate-500 truncate">{member.job_title || member.department || ''}</p>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 flex-shrink-0">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusColors[plan.status] || 'bg-slate-100 text-slate-600'}`}>
                      {statusLabels[plan.status] || plan.status}
                    </span>
                    {plan.target_date && (
                      <span className="text-xs text-slate-400">
                        Target: {new Date(plan.target_date).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="card">
        <h3 className="font-semibold text-slate-900 text-base mb-4">One-to-One Reviews</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button
            onClick={() => setShowReviews(true)}
            className="p-4 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg text-left transition-colors"
          >
            <p className="font-medium text-blue-900 text-sm">Schedule Weekly Check-in</p>
            <p className="text-xs text-blue-600 mt-1">Track KPIs and project actions</p>
          </button>
          <button
            onClick={() => setShowReviews(true)}
            className="p-4 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-left transition-colors"
          >
            <p className="font-medium text-slate-900 text-sm">Schedule Monthly Review</p>
            <p className="text-xs text-slate-500 mt-1">Comprehensive review with competencies</p>
          </button>
          <button
            onClick={() => setShowReviews(true)}
            className="p-4 bg-green-50 hover:bg-green-100 border border-green-200 rounded-lg text-left transition-colors"
          >
            <p className="font-medium text-green-900 text-sm">View All Reviews</p>
            <p className="text-xs text-green-600 mt-1">Manage scheduled and completed reviews</p>
          </button>
        </div>
      </div>

      {/* Lightweight Opal widget */}
      <div className="card border border-sky-100 bg-sky-50/50">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 bg-sky-100 rounded-lg"><MessageSquare className="w-4 h-4 text-sky-600" /></div>
          <div>
            <h3 className="font-semibold text-slate-900 text-sm">Opal — Ask about your team</h3>
            <p className="text-xs text-slate-500">Try: "What are my outstanding actions?", "How many 1:1s this week?", "Which reviews are overdue?"</p>
          </div>
        </div>
        <div className="flex gap-2">
          <input
            ref={seraInputRef}
            type="text"
            value={seraQuery}
            onChange={e => setSeraQuery(e.target.value)}
            onKeyDown={e => {
              if (e.key !== 'Enter' || !seraQuery.trim()) return;
              const ql = seraQuery.toLowerCase();
              let ans = '';
              if (ql.includes('action') || ql.includes('outstanding')) {
                ans = `You have ${myActions.length} open action${myActions.length !== 1 ? 's' : ''}.${myActions.filter(a => a.due_date && new Date(a.due_date) < new Date()).length > 0 ? ` ${myActions.filter(a => a.due_date && new Date(a.due_date) < new Date()).length} overdue.` : ''}`;
              } else if ((ql.includes('this week') || ql.includes('upcoming')) && ql.includes('1:1')) {
                ans = `${dueSoonReviews.length} 1:1${dueSoonReviews.length !== 1 ? 's are' : ' is'} due in the next 7 days.`;
              } else if (ql.includes('overdue')) {
                ans = `${overdueReviews.length} review${overdueReviews.length !== 1 ? 's are' : ' is'} overdue.`;
              } else if (ql.includes('missed')) {
                ans = `${missedReviews.length} review${missedReviews.length !== 1 ? 's were' : ' was'} missed.`;
              } else if (ql.includes('in progress')) {
                ans = `${inProgressReviews.length} review${inProgressReviews.length !== 1 ? 's are' : ' is'} in progress.`;
              } else if (ql.includes('team') || ql.includes('direct report')) {
                ans = `Your team has ${teamMembers.length} direct report${teamMembers.length !== 1 ? 's' : ''}.`;
              } else if (ql.includes('complet')) {
                ans = `${completedRecentReviews.length} review${completedRecentReviews.length !== 1 ? 's have' : ' has'} been completed.`;
              } else {
                ans = 'I can answer questions about your actions, 1:1 schedule, overdue or missed reviews, and team size.';
              }
              setSeraResponse(ans);
            }}
            placeholder="Ask about your team..."
            className="flex-1 px-3 py-2 text-sm border border-sky-200 rounded-lg focus:ring-2 focus:ring-sky-400 focus:outline-none bg-white"
          />
          <button
            onClick={() => {
              if (!seraQuery.trim()) return;
              const ql = seraQuery.toLowerCase();
              let ans = '';
              if (ql.includes('action') || ql.includes('outstanding')) {
                ans = `You have ${myActions.length} open action${myActions.length !== 1 ? 's' : ''}.${myActions.filter(a => a.due_date && new Date(a.due_date) < new Date()).length > 0 ? ` ${myActions.filter(a => a.due_date && new Date(a.due_date) < new Date()).length} overdue.` : ''}`;
              } else if ((ql.includes('this week') || ql.includes('upcoming')) && ql.includes('1:1')) {
                ans = `${dueSoonReviews.length} 1:1${dueSoonReviews.length !== 1 ? 's are' : ' is'} due in the next 7 days.`;
              } else if (ql.includes('overdue')) {
                ans = `${overdueReviews.length} review${overdueReviews.length !== 1 ? 's are' : ' is'} overdue.`;
              } else if (ql.includes('missed')) {
                ans = `${missedReviews.length} review${missedReviews.length !== 1 ? 's were' : ' was'} missed.`;
              } else if (ql.includes('in progress')) {
                ans = `${inProgressReviews.length} review${inProgressReviews.length !== 1 ? 's are' : ' is'} in progress.`;
              } else if (ql.includes('team') || ql.includes('direct report')) {
                ans = `Your team has ${teamMembers.length} direct report${teamMembers.length !== 1 ? 's' : ''}.`;
              } else if (ql.includes('complet')) {
                ans = `${completedRecentReviews.length} review${completedRecentReviews.length !== 1 ? 's have' : ' has'} been completed.`;
              } else {
                ans = 'I can answer questions about your actions, 1:1 schedule, overdue or missed reviews, and team size.';
              }
              setSeraResponse(ans);
            }}
            disabled={!seraQuery.trim()}
            className="px-3 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 disabled:opacity-40 transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
        {seraResponse && (
          <div className="mt-2 p-3 bg-white border border-sky-200 rounded-lg text-sm text-slate-700">
            {seraResponse}
          </div>
        )}
      </div>

      {showCreateCareerPlan && (
        <CreateCareerPlanModal
          onClose={() => setShowCreateCareerPlan(false)}
          onCreated={() => {
            setShowCreateCareerPlan(false);
            loadTeamData();
          }}
        />
      )}
    </div>
  );
}
