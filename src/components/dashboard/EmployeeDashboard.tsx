import { useEffect, useState } from 'react';
import { Calendar, TrendingUp, CheckCircle, Target, Award, MessageSquare, FileText, BarChart2, Clock, Star, Brain, AlertCircle, ArrowRight } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { format } from 'date-fns';
import MyReviews from '../employee/MyReviews';
import PerformanceTracking from '../employee/PerformanceTracking';
import SkillsMatrixPanel from '../skills-matrix/SkillsMatrixPanel';
import InitiatedCareerPlanQuiz from '../career/InitiatedCareerPlanQuiz';

interface EmployeeDashboardProps {
  onNavigate?: (path: string) => void;
}

interface CareerPlan {
  id: string;
  goal_role_custom_title: string;
  goal_role_title: string;
  status: string;
  created_at: string;
  created_by_name: string | null;
  started_from: string | null;
}

interface OtoActionItem {
  id: string;
  action_text: string;
  due_date: string | null;
  status: string;
}

interface NextMeeting {
  scheduled_datetime: string;
  isPast?: boolean;
  isEstimated?: boolean;
}

interface KpiRating {
  kpi_name: string;
  manager_score: number | null;
  actual_value: string | null;
}

interface LastReviewMetrics {
  overall_kpi_average: number | null;
  overall_competency_score: number | null;
  overall_average: number | null;
  review_month: string | null;
  requires_moderation: boolean;
  moderation_status: string | null;
}

export function EmployeeDashboard({ onNavigate }: EmployeeDashboardProps = {}) {
  const { effectiveProfile: profile } = useAuth();
  const [otoActionItems, setOtoActionItems] = useState<OtoActionItem[]>([]);
  const [careerPlans, setCareerPlans] = useState<CareerPlan[]>([]);
  const [nextMeeting, setNextMeeting] = useState<NextMeeting | null>(null);
  const [kpiRatings, setKpiRatings] = useState<KpiRating[]>([]);
  const [lastReview, setLastReview] = useState<LastReviewMetrics | null>(null);
  const [overallAvg, setOverallAvg] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [showReviews, setShowReviews] = useState(false);
  const [showPerformance, setShowPerformance] = useState(false);
  const [openInitiatedPlanId, setOpenInitiatedPlanId] = useState<string | null>(null);
  const [careerSignOffActions, setCareerSignOffActions] = useState<{ id: string; title: string; plan_id: string; due_date: string | null; plan_title: string }[]>([]);

  useEffect(() => {
    if (profile?.id) {
      loadDashboardData();
      loadCareerSignOffActions();
    }
  }, [profile?.id]);

  async function loadCareerSignOffActions() {
    if (!profile?.id) return;
    try {
      const { data } = await supabase
        .from('career_plan_actions')
        .select(`
          id, title, plan_id, due_date,
          plan:career_plans!career_plan_actions_plan_id_fkey(status, plan_title, goal_role_title, goal_role_custom_title)
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
          return {
            id: row.id,
            title: row.title,
            plan_id: row.plan_id,
            due_date: row.due_date,
            plan_title: plan?.plan_title || plan?.goal_role_custom_title || plan?.goal_role_title || 'Career Plan',
          };
        });

      setCareerSignOffActions(items);
    } catch (error) {
      console.error('Error loading career sign-off actions:', error);
    }
  }

  async function loadDashboardData() {
    if (!profile?.id) { setLoading(false); return; }

    try {
      const [
        otoActionsRes,
        plansRes,
        nextMeetingRes,
        lastMonthlyRes,
      ] = await Promise.all([
        supabase
          .from('one_to_one_action_items')
          .select('id, action_text, due_date, status')
          .eq('owner_id', profile.id)
          .neq('status', 'closed')
          .order('due_date', { ascending: true })
          .limit(10),
        supabase
          .from('career_plans')
          .select('id, goal_role_custom_title, goal_role_title, status, created_at, created_by_name, started_from')
          .eq('user_id', profile.id)
          .order('created_at', { ascending: false })
          .limit(5),
        supabase
          .from('one_to_one_scheduled_meetings')
          .select('scheduled_datetime')
          .eq('employee_id', profile.id)
          .not('completion_status', 'in', '("submitted","completed")')
          .gte('scheduled_datetime', new Date().toISOString())
          .order('scheduled_datetime', { ascending: true })
          .limit(1)
          .maybeSingle(),
        supabase
          .from('one_to_one_monthly_reviews')
          .select('overall_kpi_average, overall_competency_score, overall_average, review_month, requires_moderation, moderation_status')
          .eq('employee_id', profile.id)
          .in('status', ['submitted', 'completed'])
          .order('review_month', { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      setOtoActionItems(otoActionsRes.data || []);
      setCareerPlans(plansRes.data || []);

      if (nextMeetingRes.data) {
        setNextMeeting(nextMeetingRes.data);
      } else {
        // No future scheduled meeting — try to calculate next date from last completed review + cycle frequency
        const [lastCompletedRes, activeCycleRes] = await Promise.all([
          supabase
            .from('one_to_one_scheduled_meetings')
            .select('scheduled_datetime, submitted_at')
            .eq('employee_id', profile.id)
            .in('completion_status', ['submitted', 'completed'])
            .order('submitted_at', { ascending: false })
            .limit(1)
            .maybeSingle(),
          supabase
            .from('one_to_one_cycle_employee_assignments')
            .select('one_to_one_review_cycles(review_frequency)')
            .eq('employee_id', profile.id)
            .eq('is_active', true)
            .limit(1)
            .maybeSingle(),
        ]);

        const submittedAt = lastCompletedRes.data?.submitted_at;
        const frequency = (activeCycleRes.data as any)?.one_to_one_review_cycles?.review_frequency;

        const FREQ_DAYS: Record<string, number> = { weekly: 7, fortnightly: 14 };
        if (submittedAt && frequency === 'monthly') {
          const next = new Date(submittedAt);
          next.setMonth(next.getMonth() + 1);
          setNextMeeting({ scheduled_datetime: next.toISOString(), isEstimated: true });
        } else if (submittedAt && FREQ_DAYS[frequency]) {
          const next = new Date(submittedAt);
          next.setDate(next.getDate() + FREQ_DAYS[frequency]);
          setNextMeeting({ scheduled_datetime: next.toISOString(), isEstimated: true });
        } else {
          // No cycle to calculate from — show last meeting date as context
          const { data: lastMeeting } = await supabase
            .from('one_to_one_scheduled_meetings')
            .select('scheduled_datetime')
            .eq('employee_id', profile.id)
            .order('scheduled_datetime', { ascending: false })
            .limit(1)
            .maybeSingle();
          setNextMeeting(lastMeeting ? { ...lastMeeting, isPast: true } : null);
        }
      }

      if (lastMonthlyRes.data) {
        setLastReview(lastMonthlyRes.data);
        const d = lastMonthlyRes.data;
        const moderationPending = d.requires_moderation && !['approved', 'adjusted'].includes(d.moderation_status || '');
        const kpiAvg = d.overall_kpi_average;
        const compAvg = moderationPending ? null : d.overall_competency_score;
        // During moderation use only KPI average; otherwise prefer stored overall_average
        if (moderationPending) {
          setOverallAvg(kpiAvg && kpiAvg > 0 ? kpiAvg : null);
        } else if (d.overall_average && d.overall_average > 0) {
          setOverallAvg(d.overall_average);
        } else if (kpiAvg && compAvg) {
          setOverallAvg((kpiAvg + compAvg) / 2);
        } else if (kpiAvg) {
          setOverallAvg(kpiAvg);
        }
      }

      // Load latest weekly check-in KPI discussion for this user
      const latestCheckinRes = await supabase
        .from('one_to_one_weekly_checkins')
        .select('kpi_discussion')
        .eq('employee_id', profile.id)
        .eq('status', 'completed')
        .order('week_starting', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (latestCheckinRes.data?.kpi_discussion) {
        const kpiDisc = latestCheckinRes.data.kpi_discussion;
        const ratings: KpiRating[] = Object.values(kpiDisc).map((entry: any) => ({
          kpi_name: entry.kpi_name || '',
          manager_score: entry.manager_score ?? null,
          actual_value: entry.actual_value ?? null,
        })).filter((k: KpiRating) => k.kpi_name);
        setKpiRatings(ratings);
      }

    } catch (error) {
      console.error('Error loading employee dashboard:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (showReviews) {
    return (
      <div>
        <button onClick={() => setShowReviews(false)} className="mb-4 text-blue-600 hover:text-blue-800 font-medium text-sm">
          ← Back to Dashboard
        </button>
        <MyReviews />
      </div>
    );
  }

  if (showPerformance) {
    return (
      <div>
        <button onClick={() => setShowPerformance(false)} className="mb-4 text-blue-600 hover:text-blue-800 font-medium text-sm">
          ← Back to Dashboard
        </button>
        <PerformanceTracking />
      </div>
    );
  }

  const overdueActions = otoActionItems.filter(a => a.due_date && new Date(a.due_date) < new Date());
  const activeCareerPlan = careerPlans.find(p => p.status !== 'completed' && p.status !== 'cancelled');
  const pendingInputPlans = careerPlans.filter(p => p.status === 'pending_employee_input');

  function scoreLabel(score: number | null) {
    if (score === null) return '—';
    if (score >= 4.5) return 'Excellent';
    if (score >= 3.5) return 'Good';
    if (score >= 2.5) return 'Developing';
    return 'Needs Focus';
  }

  function scoreColor(score: number | null) {
    if (score === null) return 'bg-gray-100 text-gray-500';
    if (score >= 4.5) return 'bg-green-100 text-green-700';
    if (score >= 3.5) return 'bg-blue-100 text-blue-700';
    if (score >= 2.5) return 'bg-amber-100 text-amber-700';
    return 'bg-red-100 text-red-700';
  }

  return (
    <div className="space-y-8">
      {/* Initiated Career Plan Quiz overlay */}
      {openInitiatedPlanId && (
        <div className="fixed inset-0 bg-black/50 z-50 overflow-y-auto">
          <InitiatedCareerPlanQuiz
            planId={openInitiatedPlanId}
            onClose={() => setOpenInitiatedPlanId(null)}
            onComplete={() => {
              setOpenInitiatedPlanId(null);
              loadDashboardData();
            }}
          />
        </div>
      )}

      {/* Pending career plan input banner */}
      {pendingInputPlans.length > 0 && (
        <div className="space-y-2">
          {pendingInputPlans.map(plan => (
            <div key={plan.id} className="bg-teal-50 border border-teal-300 rounded-xl p-4 flex items-center justify-between gap-4 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-teal-100 rounded-lg flex-shrink-0 mt-0.5">
                  <Target className="w-4 h-4 text-teal-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-teal-900">
                    Career Plan — Your Input Needed
                  </p>
                  <p className="text-xs text-teal-700 mt-0.5">
                    {plan.created_by_name ? `${plan.created_by_name} has started a Career Plan` : 'A Career Plan has been started'} for you targeting <strong>{plan.goal_role_custom_title || plan.goal_role_title || 'a new role'}</strong>. Please complete your self-assessment.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setOpenInitiatedPlanId(plan.id)}
                className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 transition-colors flex-shrink-0"
              >
                Start Now
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-4 pt-2">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
            Welcome back, {profile?.full_name?.split(' ')[0]}
          </h1>
          <p className="text-slate-500 mt-1">Your performance and development overview</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setShowPerformance(true)}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
          >
            <TrendingUp className="w-4 h-4" />
            My Performance
          </button>
          <button
            onClick={() => setShowReviews(true)}
            className="flex items-center gap-2 bg-slate-700 text-white px-4 py-2 rounded-lg hover:bg-slate-800 transition-colors text-sm font-medium"
          >
            <FileText className="w-4 h-4" />
            My Reviews
          </button>
        </div>
      </div>

      {/* KPI metric cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {/* Next 1:1 */}
        <div className="card p-5 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
              {nextMeeting?.isPast ? 'Last 1:1' : 'Next 1:1'}
            </p>
            <div className={`p-2 rounded-lg ${nextMeeting?.isPast ? 'bg-slate-100' : 'bg-blue-100'}`}>
              <Calendar className={`w-4 h-4 ${nextMeeting?.isPast ? 'text-slate-500' : 'text-blue-600'}`} />
            </div>
          </div>
          {nextMeeting ? (
            <div>
              <p className="text-lg font-bold text-slate-900">
                {format(new Date(nextMeeting.scheduled_datetime), 'MMM d')}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                {nextMeeting.isPast
                  ? format(new Date(nextMeeting.scheduled_datetime), 'yyyy')
                  : nextMeeting.isEstimated
                    ? 'estimated'
                    : format(new Date(nextMeeting.scheduled_datetime), 'HH:mm')}
              </p>
            </div>
          ) : (
            <div>
              <p className="text-lg font-bold text-slate-400">None</p>
              <p className="text-xs text-slate-400 mt-0.5">Not scheduled</p>
            </div>
          )}
        </div>

        {/* Outstanding actions */}
        <div className="card p-5 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Actions</p>
            <div className={`p-2 rounded-lg ${overdueActions.length > 0 ? 'bg-red-100' : 'bg-orange-100'}`}>
              <CheckCircle className={`w-4 h-4 ${overdueActions.length > 0 ? 'text-red-600' : 'text-orange-600'}`} />
            </div>
          </div>
          <div>
            <p className="text-lg font-bold text-slate-900">{otoActionItems.length}</p>
            <p className={`text-xs mt-0.5 ${overdueActions.length > 0 ? 'text-red-600 font-medium' : 'text-slate-500'}`}>
              {overdueActions.length > 0 ? `${overdueActions.length} overdue` : 'outstanding'}
            </p>
          </div>
        </div>

        {/* Career plan */}
        <div className="card p-5 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Career Plan</p>
            <div className="p-2 bg-green-100 rounded-lg">
              <Target className="w-4 h-4 text-green-600" />
            </div>
          </div>
          {activeCareerPlan ? (
            <div>
              <p className="text-sm font-bold text-slate-900 line-clamp-2 leading-tight">
                {activeCareerPlan.goal_role_custom_title || 'In Progress'}
              </p>
              <span className="text-xs text-slate-500 mt-0.5 capitalize block">
                {activeCareerPlan.status.replace(/_/g, ' ')}
              </span>
            </div>
          ) : (
            <div>
              <p className="text-lg font-bold text-slate-400">None</p>
              <p className="text-xs text-slate-400 mt-0.5">No active plan</p>
            </div>
          )}
        </div>

        {/* Performance average (last completed review) */}
        <div className="card p-5 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Performance</p>
            <div className="p-2 bg-amber-100 rounded-lg">
              <Star className="w-4 h-4 text-amber-600" />
            </div>
          </div>
          <div>
            <p className="text-lg font-bold text-slate-900">
              {lastReview?.overall_kpi_average ? Number(lastReview.overall_kpi_average).toFixed(1) : '—'}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">Last 1:1 avg</p>
          </div>
        </div>

        {/* Competency average (last completed review) */}
        <div className="card p-5 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Competency</p>
            <div className="p-2 bg-teal-100 rounded-lg">
              <Award className="w-4 h-4 text-teal-600" />
            </div>
          </div>
          <div>
            {lastReview?.requires_moderation && !['approved', 'adjusted'].includes(lastReview.moderation_status || '') ? (
              <>
                <p className="text-sm font-medium text-amber-700">Under review</p>
                <p className="text-xs text-slate-500 mt-0.5">Pending moderation</p>
              </>
            ) : (
              <>
                <p className="text-lg font-bold text-slate-900">
                  {lastReview?.overall_competency_score ? Number(lastReview.overall_competency_score).toFixed(1) : '—'}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">Last 1:1 avg</p>
              </>
            )}
          </div>
        </div>

        {/* Overall average */}
        <div className="card p-5 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Overall</p>
            <div className="p-2 bg-slate-100 rounded-lg">
              <BarChart2 className="w-4 h-4 text-slate-600" />
            </div>
          </div>
          <div>
            <p className="text-lg font-bold text-slate-900">
              {overallAvg !== null ? overallAvg.toFixed(1) : '—'}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">Combined avg</p>
          </div>
        </div>

        {/* Career actions awaiting sign-off */}
        <div className="card p-5 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Actions to Sign Off</p>
            <div className="p-2 bg-orange-100 rounded-lg">
              <Target className="w-4 h-4 text-orange-600" />
            </div>
          </div>
          <div>
            <p className="text-lg font-bold text-slate-900">{careerSignOffActions.length}</p>
            <p className="text-xs text-slate-500 mt-0.5">Career actions awaiting you</p>
          </div>
          {careerSignOffActions.length > 0 && (
            <div className="space-y-1.5 pt-1 border-t border-gray-100">
              {careerSignOffActions.slice(0, 2).map(a => (
                <div key={a.id} className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-orange-400 flex-shrink-0 mt-1.5" />
                  <p className="text-xs text-slate-600 leading-snug">{a.title}</p>
                </div>
              ))}
              {careerSignOffActions.length > 2 && (
                <p className="text-xs text-slate-400 pl-3.5">+{careerSignOffActions.length - 2} more</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Weekly check-in KPI ratings */}
      {kpiRatings.length > 0 && (
        <div className="card">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 bg-amber-100 rounded-lg">
              <Star className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">Latest Weekly Check-in — KPI Ratings</h3>
              <p className="text-xs text-slate-500">From your most recent completed check-in</p>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {kpiRatings.map((kpi, i) => (
              <div key={i} className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                <p className="text-xs font-medium text-gray-600 mb-1 truncate">{kpi.kpi_name}</p>
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${scoreColor(kpi.manager_score)}`}>
                    {kpi.manager_score !== null ? kpi.manager_score.toFixed(1) : '—'} · {scoreLabel(kpi.manager_score)}
                  </span>
                </div>
                {kpi.actual_value && (
                  <p className="text-xs text-gray-400 mt-1">Actual: {kpi.actual_value}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3-column content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Action items */}
        <div className="card">
          <div className="flex items-center gap-3 mb-5">
            <div className="p-2.5 bg-orange-100 rounded-lg">
              <Clock className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">Action Items</h3>
              <p className="text-xs text-slate-500">Outstanding from 1:1s</p>
            </div>
          </div>
          <div className="space-y-2.5">
            {otoActionItems.length === 0 ? (
              <p className="text-sm text-slate-400 py-4 text-center">No open action items</p>
            ) : (
              otoActionItems.map((item) => {
                const isOverdue = item.due_date && new Date(item.due_date) < new Date();
                return (
                  <div key={item.id} className={`flex items-start gap-3 p-3 rounded-lg border ${isOverdue ? 'bg-red-50 border-red-100' : 'bg-slate-50 border-slate-100'}`}>
                    <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${isOverdue ? 'bg-red-500' : item.due_date ? 'bg-orange-500' : 'bg-blue-400'}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-800 leading-snug">{item.action_text}</p>
                      {item.due_date && (
                        <p className={`text-xs mt-1 ${isOverdue ? 'text-red-600 font-medium' : 'text-slate-400'}`}>
                          Due {format(new Date(item.due_date), 'MMM d, yyyy')}
                          {isOverdue && ' — Overdue'}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Career plans */}
        <div className="card">
          <div className="flex items-center gap-3 mb-5">
            <div className="p-2.5 bg-green-100 rounded-lg">
              <Target className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">Career Development</h3>
              <p className="text-xs text-slate-500">Active plans</p>
            </div>
          </div>
          <div className="space-y-2.5">
            {careerPlans.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-sm text-slate-400 mb-3">No career plan yet</p>
                <button
                  onClick={() => onNavigate?.('/pathways')}
                  className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                >
                  Explore pathways →
                </button>
              </div>
            ) : (
              careerPlans.filter(p => p.status !== 'pending_employee_input').map((plan) => (
                <div key={plan.id} className="p-3 bg-green-50 rounded-lg border border-green-100">
                  <p className="text-sm font-medium text-slate-900 leading-snug">
                    {plan.goal_role_custom_title || plan.goal_role_title || 'Career Plan'}
                  </p>
                  <div className="flex items-center justify-between mt-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      plan.status === 'admin_approved' || plan.status === 'in_progress' || plan.status === 'completed' ? 'bg-green-200 text-green-800' :
                      plan.status === 'manager_approved' || plan.status === 'pending_manager_wayforward' ? 'bg-blue-200 text-blue-800' :
                      'bg-amber-100 text-amber-700'
                    }`}>
                      {plan.status === 'pending_manager_wayforward' ? 'With manager' :
                       plan.status === 'in_progress' ? 'In progress' :
                       plan.status.replace(/_/g, ' ')}
                    </span>
                    <span className="text-xs text-slate-400">
                      {format(new Date(plan.created_at), 'MMM yyyy')}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Skills overview */}
        <div className="card">
          <div className="flex items-center justify-between gap-3 mb-5">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-teal-100 rounded-lg">
                <Award className="w-5 h-5 text-teal-600" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">Skills Overview</h3>
                <p className="text-xs text-slate-500">Your training progress</p>
              </div>
            </div>
            <button
              onClick={() => onNavigate?.('/skills-matrix')}
              className="text-xs text-teal-600 hover:text-teal-800 font-medium whitespace-nowrap"
            >
              Full view →
            </button>
          </div>
          {profile?.id && (
            <SkillsMatrixPanel
              employeeId={profile.id}
              isManager={false}
            />
          )}
        </div>
      </div>

      {/* SERA assistant */}
      <div className="card">
        <div className="flex items-center gap-3 mb-5">
          <div className="p-2.5 bg-sky-100 rounded-lg">
            <MessageSquare className="w-5 h-5 text-sky-600" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900">SERA — Your Career Assistant</h3>
            <p className="text-xs text-slate-500">AI-powered career guidance and planning</p>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => onNavigate?.('/career-coach')}
            className="flex items-center justify-center gap-2 bg-sky-600 text-white px-5 py-2.5 rounded-lg hover:bg-sky-700 transition-colors font-medium text-sm"
          >
            <MessageSquare className="w-4 h-4" />
            Start Coaching Session
          </button>
          <button
            onClick={() => onNavigate?.('/career-quiz')}
            className="flex items-center justify-center gap-2 bg-white text-sky-600 border border-sky-300 px-5 py-2.5 rounded-lg hover:bg-sky-50 transition-colors font-medium text-sm"
          >
            <Brain className="w-4 h-4" />
            Take Career Quiz
          </button>
        </div>
      </div>
    </div>
  );
}
