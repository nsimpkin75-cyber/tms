import React, { useState, useEffect } from 'react';
import { ArrowLeft, Users, Calendar, Target, TrendingUp, ChevronDown, ChevronUp, CheckCircle, Clock, FileText, BarChart2, Trash2, AlertTriangle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { format } from 'date-fns';

interface AdminCycleDetailViewProps {
  cycleId: string;
  onBack: () => void;
}

interface CycleDetail {
  id: string;
  cycle_name: string;
  quarter: string | null;
  cycle_type: string | null;
  cycle_start_date: string;
  cycle_end_date: string | null;
  review_frequency: string | null;
  duration_minutes: number | null;
  standard_agenda: string | null;
  summary: string | null;
  status: string;
  manager: { full_name: string; department: string | null; job_title: string | null } | null;
}

interface CycleKPI {
  id: string;
  kpi_name: string;
  target_value: string;
  measurement_unit: string;
  frequency: string;
}

interface AssignedEmployee {
  id: string;
  employee_id: string;
  employee: { full_name: string; job_title: string | null; department: string | null } | null;
  assigned_at: string;
}

interface ScheduledMeeting {
  id: string;
  employee_id: string;
  employee_name: string;
  scheduled_datetime: string | null;
  status: string | null;
  completion_status: string | null;
}

interface WeeklyCheckin {
  id: string;
  meeting_id: string;
  employee_id: string;
  employee_name: string;
  week_starting: string;
  week_number: number;
  performance_score: number;
  summary: string | null;
  status: string;
  kpi_discussion: Record<string, any>;
  short_term_actions: string[];
}

interface MonthlyReview {
  id: string;
  meeting_id: string;
  employee_id: string;
  employee_name: string;
  review_month: string;
  overall_kpi_average: number | null;
  overall_competency_average: number | null;
  manager_summary: string | null;
  status: string;
  values_ratings: any[];
  kpi_snapshots: Record<string, any> | null;
}

export default function AdminCycleDetailView({ cycleId, onBack }: AdminCycleDetailViewProps) {
  const { profile } = useAuth();
  const isFullAdmin = profile?.role === 'admin' && (profile as any)?.admin_type === 'full_admin';

  const [cycle, setCycle] = useState<CycleDetail | null>(null);
  const [kpis, setKpis] = useState<CycleKPI[]>([]);
  const [employees, setEmployees] = useState<AssignedEmployee[]>([]);
  const [weeklyCheckins, setWeeklyCheckins] = useState<WeeklyCheckin[]>([]);
  const [monthlyReviews, setMonthlyReviews] = useState<MonthlyReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [scheduledMeetings, setScheduledMeetings] = useState<ScheduledMeeting[]>([]);
  const [expandedEmployee, setExpandedEmployee] = useState<string | null>(null);
  const [expandedCheckin, setExpandedCheckin] = useState<string | null>(null);
  const [expandedMonthly, setExpandedMonthly] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'checkins' | 'monthly'>('overview');
  const [deleteMeetingTarget, setDeleteMeetingTarget] = useState<ScheduledMeeting | null>(null);
  const [deletingMeeting, setDeletingMeeting] = useState(false);
  const [deleteReviewTarget, setDeleteReviewTarget] = useState<MonthlyReview | null>(null);
  const [deletingReview, setDeletingReview] = useState(false);

  useEffect(() => {
    fetchAll();
  }, [cycleId]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [cycleRes, kpisRes, assignmentsRes] = await Promise.all([
        supabase
          .from('one_to_one_review_cycles')
          .select(`
            id, cycle_name, quarter, cycle_type, cycle_start_date, cycle_end_date,
            review_frequency, duration_minutes, standard_agenda, summary, status,
            manager:profiles!one_to_one_review_cycles_manager_id_fkey(full_name, department, job_title)
          `)
          .eq('id', cycleId)
          .maybeSingle(),
        supabase
          .from('one_to_one_cycle_kpis')
          .select('id, kpi_name, target_value, measurement_unit, frequency')
          .eq('cycle_id', cycleId)
          .order('sort_order'),
        supabase
          .from('one_to_one_cycle_employee_assignments')
          .select(`
            id, employee_id, assigned_at,
            employee:profiles!one_to_one_cycle_employee_assignments_employee_id_fkey(full_name, job_title, department)
          `)
          .eq('cycle_id', cycleId)
          .eq('is_active', true),
      ]);

      if (cycleRes.data) {
        const raw = cycleRes.data as any;
        setCycle({
          ...raw,
          manager: Array.isArray(raw.manager) ? raw.manager[0] : raw.manager,
        });
      }

      setKpis(kpisRes.data || []);

      const assignedEmps: AssignedEmployee[] = (assignmentsRes.data || []).map((a: any) => ({
        ...a,
        employee: Array.isArray(a.employee) ? a.employee[0] : a.employee,
      }));
      setEmployees(assignedEmps);

      if (assignedEmps.length > 0) {
        const meetingsRes = await supabase
          .from('one_to_one_scheduled_meetings')
          .select('id, employee_id, scheduled_datetime, status, completion_status')
          .eq('oto_cycle_id', cycleId);

        const meetingRows = meetingsRes.data || [];
        const meetingIds = meetingRows.map((m: any) => m.id);

        const empNameMap: Record<string, string> = {};
        assignedEmps.forEach((a) => {
          if (a.employee_id) empNameMap[a.employee_id] = a.employee?.full_name || 'Unknown';
        });

        setScheduledMeetings(meetingRows.map((m: any) => ({
          ...m,
          employee_name: empNameMap[m.employee_id] || 'Unknown',
        })));

        if (meetingIds.length > 0) {
          const [checkinsRes, monthlyRes] = await Promise.all([
            supabase
              .from('one_to_one_weekly_checkins')
              .select('id, meeting_id, employee_id, week_starting, week_number, performance_score, summary, status, kpi_discussion, short_term_actions')
              .in('meeting_id', meetingIds)
              .order('week_starting', { ascending: false }),
            supabase
              .from('one_to_one_monthly_reviews')
              .select('id, meeting_id, employee_id, review_month, overall_kpi_average, overall_competency_average, manager_summary, status, values_ratings, kpi_snapshots')
              .in('meeting_id', meetingIds)
              .order('review_month', { ascending: false }),
          ]);

          setWeeklyCheckins(
            (checkinsRes.data || []).map((c: any) => ({
              ...c,
              employee_name: empNameMap[c.employee_id] || 'Unknown',
            }))
          );

          setMonthlyReviews(
            (monthlyRes.data || []).map((m: any) => ({
              ...m,
              employee_name: empNameMap[m.employee_id] || 'Unknown',
            }))
          );
        }
      }
    } catch (err) {
      console.error('Error loading cycle detail:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteMeeting = async () => {
    if (!deleteMeetingTarget) return;
    setDeletingMeeting(true);
    try {
      const meetingId = deleteMeetingTarget.id;
      // Delete child records first, then the meeting itself
      await Promise.all([
        supabase.from('one_to_one_weekly_checkins').delete().eq('meeting_id', meetingId),
        supabase.from('one_to_one_monthly_reviews').delete().eq('meeting_id', meetingId),
        supabase.from('one_to_one_action_items').delete().eq('meeting_id', meetingId),
      ]);
      await supabase.from('one_to_one_scheduled_meetings').delete().eq('id', meetingId);
      setDeleteMeetingTarget(null);
      await fetchAll();
    } catch (err) {
      console.error('Error deleting meeting:', err);
      alert('Failed to delete one-to-one. Please try again.');
    } finally {
      setDeletingMeeting(false);
    }
  };

  const handleDeleteMonthlyReview = async () => {
    if (!deleteReviewTarget) return;
    setDeletingReview(true);
    try {
      const reviewId = deleteReviewTarget.id;
      const meetingId = deleteReviewTarget.meeting_id;

      // Delete moderation cases linked to this meeting (they reference the monthly review via meeting_id)
      await supabase.from('moderation_cases').delete().eq('meeting_id', meetingId);

      // Delete the monthly review record (values_ratings JSONB is embedded, no separate table)
      const { error } = await supabase.from('one_to_one_monthly_reviews').delete().eq('id', reviewId);
      if (error) throw error;

      // Reset the scheduled meeting completion status so it no longer appears as submitted in dashboards
      await supabase
        .from('one_to_one_scheduled_meetings')
        .update({ completion_status: null })
        .eq('id', meetingId);

      setDeleteReviewTarget(null);
      await fetchAll();
    } catch (err) {
      console.error('Error deleting monthly review:', err);
      alert('Failed to delete review. Please try again.');
    } finally {
      setDeletingReview(false);
    }
  };

  const cycleTypeLabel = (type: string | null) => {
    const map: Record<string, string> = {
      standard: 'Standard 1:1',
      probation: 'Probation Review',
      performance_support: 'Performance Support',
      development: 'Development Plan',
    };
    return type ? (map[type] || type) : '—';
  };

  const scoreLabel = (score: number) => {
    const labels: Record<number, string> = {
      0: 'New to role',
      1: 'Development needed',
      2: 'Requires guidance',
      3: 'On target',
      4: 'Exceeding',
      5: 'Exceptional',
    };
    return labels[score] ?? score.toString();
  };

  const scoreColor = (score: number) => {
    if (score <= 1) return 'text-red-600 bg-red-50';
    if (score === 2) return 'text-amber-600 bg-amber-50';
    if (score === 3) return 'text-blue-600 bg-blue-50';
    return 'text-green-600 bg-green-50';
  };

  const ratingLabel = (rating: number) => {
    if (rating === 1) return 'Developing';
    if (rating === 3) return 'On track';
    if (rating === 5) return 'Exceeding';
    return `${rating}`;
  };

  const ratingColor = (rating: number) => {
    if (rating === 1) return 'text-red-600 bg-red-50';
    if (rating === 3) return 'text-blue-600 bg-blue-50';
    if (rating === 5) return 'text-green-600 bg-green-50';
    return 'text-gray-600 bg-gray-50';
  };

  if (loading) {
    return (
      <div className="text-center py-16 text-gray-500">Loading cycle details...</div>
    );
  }

  if (!cycle) {
    return (
      <div className="text-center py-16 text-gray-500">Cycle not found.</div>
    );
  }

  const checkinsByEmployee: Record<string, WeeklyCheckin[]> = {};
  weeklyCheckins.forEach((c) => {
    const key = c.employee_id;
    if (!checkinsByEmployee[key]) checkinsByEmployee[key] = [];
    checkinsByEmployee[key].push(c);
  });

  const monthlyByEmployee: Record<string, MonthlyReview[]> = {};
  monthlyReviews.forEach((m) => {
    const key = m.employee_id;
    if (!monthlyByEmployee[key]) monthlyByEmployee[key] = [];
    monthlyByEmployee[key].push(m);
  });

  return (
    <div>
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 text-sm font-medium mb-5 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Review Cycles
      </button>

      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-5">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900">{cycle.cycle_name}</h2>
            {cycle.quarter && <p className="text-sm text-gray-500 mt-0.5">{cycle.quarter}</p>}
          </div>
          <span className="text-xs px-2.5 py-1 bg-green-100 text-green-700 rounded-full font-medium flex-shrink-0">
            Active
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
          <div>
            <p className="text-xs text-gray-500 mb-0.5">Manager</p>
            <p className="text-sm font-medium text-gray-900">{cycle.manager?.full_name || '—'}</p>
            {cycle.manager?.department && (
              <p className="text-xs text-gray-500">{cycle.manager.department}</p>
            )}
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-0.5">Type</p>
            <p className="text-sm font-medium text-gray-900">{cycleTypeLabel(cycle.cycle_type)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-0.5">Frequency</p>
            <p className="text-sm font-medium text-gray-900 capitalize">{cycle.review_frequency || '—'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-0.5">Start Date</p>
            <p className="text-sm font-medium text-gray-900">
              {cycle.cycle_start_date ? format(new Date(cycle.cycle_start_date), 'dd MMM yyyy') : '—'}
            </p>
          </div>
        </div>

        {cycle.summary && (
          <div className="mt-3 p-3 bg-gray-50 rounded-lg">
            <p className="text-xs font-medium text-gray-600 mb-1">Cycle Objectives</p>
            <p className="text-sm text-gray-700">{cycle.summary}</p>
          </div>
        )}

        {cycle.standard_agenda && (
          <div className="mt-3 p-3 bg-gray-50 rounded-lg">
            <p className="text-xs font-medium text-gray-600 mb-1">Standard Agenda</p>
            <p className="text-sm text-gray-700 whitespace-pre-line">{cycle.standard_agenda}</p>
          </div>
        )}

        {kpis.length > 0 && (
          <div className="mt-4">
            <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">KPIs</p>
            <div className="flex flex-wrap gap-2">
              {kpis.map((kpi) => (
                <div key={kpi.id} className="flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-lg px-3 py-1.5">
                  <Target className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                  <span className="text-sm font-medium text-blue-800">{kpi.kpi_name}</span>
                  {kpi.target_value && (
                    <span className="text-xs text-blue-600">Target: {kpi.target_value}{kpi.measurement_unit ? ` ${kpi.measurement_unit}` : ''}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-4">
          <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Assigned Employees</p>
          <div className="flex flex-wrap gap-2">
            {employees.length === 0 ? (
              <p className="text-sm text-gray-400">No employees assigned</p>
            ) : (
              employees.map((emp) => (
                <div key={emp.id} className="flex items-center gap-2 bg-gray-100 rounded-lg px-3 py-1.5">
                  <Users className="w-3.5 h-3.5 text-gray-500" />
                  <span className="text-sm text-gray-800">{emp.employee?.full_name || 'Unknown'}</span>
                  {emp.employee?.job_title && (
                    <span className="text-xs text-gray-500">{emp.employee.job_title}</span>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="flex gap-1 mb-5 bg-gray-100 rounded-lg p-1 w-fit">
        {(['overview', 'checkins', 'monthly'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {tab === 'overview' && 'Employees'}
            {tab === 'checkins' && `Weekly Check-ins (${weeklyCheckins.length})`}
            {tab === 'monthly' && `Monthly Reviews (${monthlyReviews.length})`}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-3">
          {employees.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl border border-gray-200 text-gray-400">
              No employees assigned to this cycle
            </div>
          ) : (
            employees.map((emp) => {
              const empCheckins = checkinsByEmployee[emp.employee_id] || [];
              const empMonthly = monthlyByEmployee[emp.employee_id] || [];
              const isExpanded = expandedEmployee === emp.employee_id;
              const latestCheckin = empCheckins[0];
              const latestMonthly = empMonthly[0];

              const meeting = scheduledMeetings.find(m => m.employee_id === emp.employee_id);

              return (
                <div key={emp.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <div className="flex items-center">
                  <button
                    onClick={() => setExpandedEmployee(isExpanded ? null : emp.employee_id)}
                    className="flex-1 flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors text-left"
                  >
                    <div className="flex items-center gap-4">
                      <div className="text-left">
                        <p className="font-medium text-gray-900">{emp.employee?.full_name || 'Unknown'}</p>
                        {emp.employee?.job_title && (
                          <p className="text-xs text-gray-500">{emp.employee.job_title}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <CheckCircle className="w-3.5 h-3.5" />
                          {empCheckins.filter((c) => c.status === 'completed').length} check-ins
                        </span>
                        <span className="flex items-center gap-1">
                          <FileText className="w-3.5 h-3.5" />
                          {empMonthly.filter((m) => m.status === 'completed').length} reviews
                        </span>
                        {latestCheckin && (
                          <span className={`px-2 py-0.5 rounded-full font-medium ${scoreColor(latestCheckin.performance_score)}`}>
                            Latest: {scoreLabel(latestCheckin.performance_score)}
                          </span>
                        )}
                      </div>
                    </div>
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                  </button>
                  {meeting && (
                    <button
                      onClick={(e) => { e.stopPropagation(); setDeleteMeetingTarget(meeting); }}
                      className="px-4 py-4 text-gray-400 hover:text-red-600 transition-colors flex-shrink-0"
                      title="Delete this one-to-one"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                  </div>

                  {isExpanded && (
                    <div className="border-t border-gray-100 px-5 py-4 space-y-4">
                      {empCheckins.length === 0 && empMonthly.length === 0 ? (
                        <p className="text-sm text-gray-400">No review activity yet</p>
                      ) : null}

                      {empCheckins.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Weekly Check-ins</p>
                          <div className="space-y-2">
                            {empCheckins.map((checkin) => (
                              <div key={checkin.id} className="border border-gray-100 rounded-lg overflow-hidden">
                                <button
                                  onClick={() => setExpandedCheckin(expandedCheckin === checkin.id ? null : checkin.id)}
                                  className="w-full flex items-center justify-between px-4 py-2.5 bg-gray-50 hover:bg-gray-100 transition-colors"
                                >
                                  <div className="flex items-center gap-3 text-sm">
                                    <span className="font-medium text-gray-800">
                                      Week {checkin.week_number} — {format(new Date(checkin.week_starting), 'dd MMM yyyy')}
                                    </span>
                                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${scoreColor(checkin.performance_score)}`}>
                                      {scoreLabel(checkin.performance_score)}
                                    </span>
                                    <span className={`px-2 py-0.5 rounded-full text-xs ${
                                      checkin.status === 'completed' ? 'bg-green-50 text-green-600' : 'bg-amber-50 text-amber-600'
                                    }`}>
                                      {checkin.status}
                                    </span>
                                  </div>
                                  {expandedCheckin === checkin.id ? <ChevronUp className="w-3.5 h-3.5 text-gray-400" /> : <ChevronDown className="w-3.5 h-3.5 text-gray-400" />}
                                </button>

                                {expandedCheckin === checkin.id && (
                                  <div className="px-4 py-3 space-y-3">
                                    {checkin.summary && (
                                      <div>
                                        <p className="text-xs font-medium text-gray-500 mb-1">Summary</p>
                                        <p className="text-sm text-gray-700">{checkin.summary}</p>
                                      </div>
                                    )}

                                    {checkin.kpi_discussion && Object.keys(checkin.kpi_discussion).length > 0 && (
                                      <div>
                                        <p className="text-xs font-medium text-gray-500 mb-2">KPI Discussion</p>
                                        <div className="space-y-2">
                                          {Object.values(checkin.kpi_discussion).map((entry: any, i: number) => (
                                            <div key={i} className="bg-gray-50 rounded-lg p-3 text-sm">
                                              <div className="flex items-center justify-between mb-1">
                                                <span className="font-medium text-gray-800">{entry.kpi_name}</span>
                                                <div className="flex items-center gap-2">
                                                  {entry.actual_value && (
                                                    <span className="text-xs text-gray-500">Actual: {entry.actual_value}{entry.measurement_unit ? ` ${entry.measurement_unit}` : ''}</span>
                                                  )}
                                                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${scoreColor(entry.manager_score)}`}>
                                                    {scoreLabel(entry.manager_score)}
                                                  </span>
                                                </div>
                                              </div>
                                              {entry.manager_comment && (
                                                <p className="text-xs text-gray-600">{entry.manager_comment}</p>
                                              )}
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}

                                    {checkin.short_term_actions && checkin.short_term_actions.length > 0 && (
                                      <div>
                                        <p className="text-xs font-medium text-gray-500 mb-1">Actions</p>
                                        <ul className="space-y-1">
                                          {checkin.short_term_actions.map((action: string, i: number) => (
                                            <li key={i} className="text-sm text-gray-700 flex items-start gap-2">
                                              <span className="text-gray-400 mt-0.5">•</span>
                                              {action}
                                            </li>
                                          ))}
                                        </ul>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {empMonthly.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Monthly Reviews</p>
                          <div className="space-y-2">
                            {empMonthly.map((review) => (
                              <div key={review.id} className="border border-gray-100 rounded-lg overflow-hidden">
                                <button
                                  onClick={() => setExpandedMonthly(expandedMonthly === review.id ? null : review.id)}
                                  className="w-full flex items-center justify-between px-4 py-2.5 bg-gray-50 hover:bg-gray-100 transition-colors"
                                >
                                  <div className="flex items-center gap-3 text-sm">
                                    <span className="font-medium text-gray-800">
                                      {format(new Date(review.review_month), 'MMMM yyyy')}
                                    </span>
                                    {review.overall_kpi_average != null && (
                                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${scoreColor(Math.round(review.overall_kpi_average))}`}>
                                        KPI avg: {review.overall_kpi_average.toFixed(1)}
                                      </span>
                                    )}
                                    {review.overall_competency_average != null && (
                                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-600">
                                        Competency avg: {review.overall_competency_average.toFixed(1)}
                                      </span>
                                    )}
                                    <span className={`px-2 py-0.5 rounded-full text-xs ${
                                      review.status === 'completed' ? 'bg-green-50 text-green-600' : 'bg-amber-50 text-amber-600'
                                    }`}>
                                      {review.status}
                                    </span>
                                  </div>
                                  {expandedMonthly === review.id ? <ChevronUp className="w-3.5 h-3.5 text-gray-400" /> : <ChevronDown className="w-3.5 h-3.5 text-gray-400" />}
                                </button>

                                {expandedMonthly === review.id && (
                                  <div className="px-4 py-3 space-y-3">
                                    {review.manager_summary && (
                                      <div>
                                        <p className="text-xs font-medium text-gray-500 mb-1">Manager Summary</p>
                                        <p className="text-sm text-gray-700">{review.manager_summary}</p>
                                      </div>
                                    )}

                                    {review.kpi_snapshots && Object.keys(review.kpi_snapshots).length > 0 && (
                                      <div>
                                        <p className="text-xs font-medium text-gray-500 mb-2">KPI Performance</p>
                                        <div className="overflow-x-auto">
                                          <table className="w-full text-xs">
                                            <thead>
                                              <tr className="bg-gray-50">
                                                <th className="text-left px-3 py-2 font-medium text-gray-600">KPI</th>
                                                <th className="text-left px-3 py-2 font-medium text-gray-600">Target</th>
                                                <th className="text-left px-3 py-2 font-medium text-gray-600">Latest</th>
                                                <th className="text-left px-3 py-2 font-medium text-gray-600">Avg Score</th>
                                                <th className="text-left px-3 py-2 font-medium text-gray-600">Entries</th>
                                              </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100">
                                              {Object.values(review.kpi_snapshots).map((kpi: any, i: number) => (
                                                <tr key={i}>
                                                  <td className="px-3 py-2 font-medium text-gray-800">{kpi.kpi_name}</td>
                                                  <td className="px-3 py-2 text-gray-600">{kpi.target_value}{kpi.measurement_unit ? ` ${kpi.measurement_unit}` : ''}</td>
                                                  <td className="px-3 py-2 text-gray-600">{kpi.latest_actual || '—'}</td>
                                                  <td className="px-3 py-2">
                                                    <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${scoreColor(Math.round(kpi.average_score))}`}>
                                                      {kpi.average_score?.toFixed(1)}
                                                    </span>
                                                  </td>
                                                  <td className="px-3 py-2 text-gray-600">{kpi.entry_count}</td>
                                                </tr>
                                              ))}
                                            </tbody>
                                          </table>
                                        </div>
                                      </div>
                                    )}

                                    {review.values_ratings && review.values_ratings.length > 0 && (
                                      <div>
                                        <p className="text-xs font-medium text-gray-500 mb-2">Competency Ratings</p>
                                        <div className="space-y-2">
                                          {review.values_ratings.map((vr: any, i: number) => (
                                            <div key={i} className="bg-gray-50 rounded-lg p-3">
                                              <div className="flex items-start justify-between gap-2 mb-1">
                                                <div>
                                                  <span className="text-xs font-medium text-gray-800">{vr.competency_title}</span>
                                                  {vr.value_title && vr.value_title !== vr.competency_title && (
                                                    <span className="text-xs text-gray-500 ml-1">({vr.value_title})</span>
                                                  )}
                                                </div>
                                                <span className={`px-2 py-0.5 rounded text-xs font-medium flex-shrink-0 ${ratingColor(vr.manager_rating)}`}>
                                                  {ratingLabel(vr.manager_rating)}
                                                </span>
                                              </div>
                                              {vr.manager_comment && (
                                                <p className="text-xs text-gray-600">{vr.manager_comment}</p>
                                              )}
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {activeTab === 'checkins' && (
        <div className="space-y-3">
          {weeklyCheckins.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl border border-gray-200 text-gray-400">
              No weekly check-ins recorded for this cycle
            </div>
          ) : (
            weeklyCheckins.map((checkin) => (
              <div key={checkin.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <button
                  onClick={() => setExpandedCheckin(expandedCheckin === checkin.id ? null : checkin.id)}
                  className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3 text-sm">
                    <span className="font-medium text-gray-900">{checkin.employee_name}</span>
                    <span className="text-gray-400">|</span>
                    <span className="text-gray-600">Week {checkin.week_number} — {format(new Date(checkin.week_starting), 'dd MMM yyyy')}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${scoreColor(checkin.performance_score)}`}>
                      {scoreLabel(checkin.performance_score)}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-xs ${
                      checkin.status === 'completed' ? 'bg-green-50 text-green-600' : 'bg-amber-50 text-amber-600'
                    }`}>
                      {checkin.status}
                    </span>
                  </div>
                  {expandedCheckin === checkin.id ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                </button>

                {expandedCheckin === checkin.id && (
                  <div className="border-t border-gray-100 px-5 py-4 space-y-3">
                    {checkin.summary && (
                      <div>
                        <p className="text-xs font-medium text-gray-500 mb-1">Summary</p>
                        <p className="text-sm text-gray-700">{checkin.summary}</p>
                      </div>
                    )}
                    {checkin.kpi_discussion && Object.keys(checkin.kpi_discussion).length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-gray-500 mb-2">KPI Discussion</p>
                        <div className="space-y-2">
                          {Object.values(checkin.kpi_discussion).map((entry: any, i: number) => (
                            <div key={i} className="bg-gray-50 rounded-lg p-3 text-sm">
                              <div className="flex items-center justify-between mb-1">
                                <span className="font-medium text-gray-800">{entry.kpi_name}</span>
                                <div className="flex items-center gap-2">
                                  {entry.actual_value && (
                                    <span className="text-xs text-gray-500">Actual: {entry.actual_value}{entry.measurement_unit ? ` ${entry.measurement_unit}` : ''}</span>
                                  )}
                                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${scoreColor(entry.manager_score)}`}>
                                    {scoreLabel(entry.manager_score)}
                                  </span>
                                </div>
                              </div>
                              {entry.manager_comment && (
                                <p className="text-xs text-gray-600">{entry.manager_comment}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {checkin.short_term_actions && checkin.short_term_actions.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-gray-500 mb-1">Actions</p>
                        <ul className="space-y-1">
                          {checkin.short_term_actions.map((action: string, i: number) => (
                            <li key={i} className="text-sm text-gray-700 flex items-start gap-2">
                              <span className="text-gray-400 mt-0.5">•</span>{action}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'monthly' && (
        <div className="space-y-3">
          {monthlyReviews.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl border border-gray-200 text-gray-400">
              No monthly reviews recorded for this cycle
            </div>
          ) : (
            monthlyReviews.map((review) => (
              <div key={review.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="flex items-center">
                <button
                  onClick={() => setExpandedMonthly(expandedMonthly === review.id ? null : review.id)}
                  className="flex-1 flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 transition-colors text-left"
                >
                  <div className="flex items-center gap-3 text-sm">
                    <span className="font-medium text-gray-900">{review.employee_name}</span>
                    <span className="text-gray-400">|</span>
                    <span className="text-gray-600">{format(new Date(review.review_month), 'MMMM yyyy')}</span>
                    {review.overall_kpi_average != null && (
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${scoreColor(Math.round(review.overall_kpi_average))}`}>
                        KPI avg: {review.overall_kpi_average.toFixed(1)}
                      </span>
                    )}
                    {review.overall_competency_average != null && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-600">
                        Comp avg: {review.overall_competency_average.toFixed(1)}
                      </span>
                    )}
                    <span className={`px-2 py-0.5 rounded-full text-xs ${
                      review.status === 'completed' ? 'bg-green-50 text-green-600' : 'bg-amber-50 text-amber-600'
                    }`}>
                      {review.status}
                    </span>
                  </div>
                  {expandedMonthly === review.id ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                </button>
                {isFullAdmin && review.status === 'completed' && (
                  <button
                    onClick={(e) => { e.stopPropagation(); setDeleteReviewTarget(review); }}
                    className="px-4 py-3.5 text-gray-400 hover:text-red-600 transition-colors flex-shrink-0"
                    title="Delete this completed review"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
                </div>

                {expandedMonthly === review.id && (
                  <div className="border-t border-gray-100 px-5 py-4 space-y-3">
                    {review.manager_summary && (
                      <div>
                        <p className="text-xs font-medium text-gray-500 mb-1">Manager Summary</p>
                        <p className="text-sm text-gray-700">{review.manager_summary}</p>
                      </div>
                    )}
                    {review.kpi_snapshots && Object.keys(review.kpi_snapshots).length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-gray-500 mb-2">KPI Performance</p>
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="bg-gray-50">
                                <th className="text-left px-3 py-2 font-medium text-gray-600">KPI</th>
                                <th className="text-left px-3 py-2 font-medium text-gray-600">Target</th>
                                <th className="text-left px-3 py-2 font-medium text-gray-600">Latest</th>
                                <th className="text-left px-3 py-2 font-medium text-gray-600">Avg Score</th>
                                <th className="text-left px-3 py-2 font-medium text-gray-600">Entries</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                              {Object.values(review.kpi_snapshots).map((kpi: any, i: number) => (
                                <tr key={i}>
                                  <td className="px-3 py-2 font-medium text-gray-800">{kpi.kpi_name}</td>
                                  <td className="px-3 py-2 text-gray-600">{kpi.target_value}{kpi.measurement_unit ? ` ${kpi.measurement_unit}` : ''}</td>
                                  <td className="px-3 py-2 text-gray-600">{kpi.latest_actual || '—'}</td>
                                  <td className="px-3 py-2">
                                    <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${scoreColor(Math.round(kpi.average_score))}`}>
                                      {kpi.average_score?.toFixed(1)}
                                    </span>
                                  </td>
                                  <td className="px-3 py-2 text-gray-600">{kpi.entry_count}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                    {review.values_ratings && review.values_ratings.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-gray-500 mb-2">Competency Ratings</p>
                        <div className="space-y-2">
                          {review.values_ratings.map((vr: any, i: number) => (
                            <div key={i} className="bg-gray-50 rounded-lg p-3">
                              <div className="flex items-start justify-between gap-2 mb-1">
                                <div>
                                  <span className="text-xs font-medium text-gray-800">{vr.competency_title}</span>
                                  {vr.value_title && vr.value_title !== vr.competency_title && (
                                    <span className="text-xs text-gray-500 ml-1">({vr.value_title})</span>
                                  )}
                                </div>
                                <span className={`px-2 py-0.5 rounded text-xs font-medium flex-shrink-0 ${ratingColor(vr.manager_rating)}`}>
                                  {ratingLabel(vr.manager_rating)}
                                </span>
                              </div>
                              {vr.manager_comment && (
                                <p className="text-xs text-gray-600">{vr.manager_comment}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {deleteReviewTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-start gap-4 mb-5">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 text-lg">Delete Completed Review</h3>
                <p className="text-sm text-gray-600 mt-1">
                  This will permanently delete the <strong>{format(new Date(deleteReviewTarget.review_month), 'MMMM yyyy')}</strong> review for <strong>{deleteReviewTarget.employee_name}</strong>, including all competency ratings, KPI data, summaries, and any associated moderation records.
                </p>
                <p className="text-sm text-amber-700 bg-amber-50 rounded-lg px-3 py-2 mt-3 border border-amber-200">
                  The review template and employee assignment will not be affected. Other completed reviews will not be affected. This action cannot be undone.
                </p>
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteReviewTarget(null)}
                disabled={deletingReview}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteMonthlyReview}
                disabled={deletingReview}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                {deletingReview ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                Delete Review
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteMeetingTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-start gap-4 mb-5">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 text-lg">Delete One-to-One</h3>
                <p className="text-sm text-gray-600 mt-1">
                  This will permanently delete the one-to-one for <strong>{deleteMeetingTarget.employee_name}</strong>, including all weekly check-ins, monthly reviews, and action items linked to it.
                </p>
                <p className="text-sm text-amber-700 bg-amber-50 rounded-lg px-3 py-2 mt-3 border border-amber-200">
                  The review cycle will not be deleted. This action cannot be undone.
                </p>
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteMeetingTarget(null)}
                disabled={deletingMeeting}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteMeeting}
                disabled={deletingMeeting}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                {deletingMeeting ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                Delete One-to-One
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
