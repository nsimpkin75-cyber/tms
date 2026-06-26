import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { computeReviewStatus, STATUS_STYLES } from '../lib/reviewStatus';
import { Plus, PlayCircle, AlertCircle, CheckCircle, Clock, AlertTriangle, Users, Settings, ChevronDown, ChevronUp, Target, Calendar, CreditCard as Edit2, BarChart2, Trash2, History } from 'lucide-react';
import CreateReviewCycleModal from '../components/one-to-one/CreateReviewCycleModal';
import EditReviewCycleModal from '../components/one-to-one/EditReviewCycleModal';
import OneToOneInterface from '../components/one-to-one/OneToOneInterface';

interface TeamMember {
  id: string;
  full_name: string;
  job_title: string;
  department: string;
  last_review_date: string | null;
  last_review_meeting_id: string | null;
  next_scheduled_date: string | null;
  next_scheduled_meeting_id: string | null;
  next_scheduled_original_date: string | null;
  next_completion_status: string | null;
  next_meeting_has_input: boolean;
  outstanding_actions: number;
  days_since_last_review: number | null;
  active_cycle_name: string | null;
  active_cycle_id: string | null;
  cycle_template_start_date: string | null;
}

interface ReviewCycle {
  id: string;
  cycle_name: string;
  template_title: string | null;
  quarter: string;
  cycle_type: string;
  review_frequency: string;
  duration_minutes: number;
  next_review_date: string | null;
  summary: string;
  status: string;
  employee_count: number;
  kpi_count: number;
}

const CYCLE_TYPE_LABELS: Record<string, string> = {
  standard: '1:1 Review',
  probation: 'Probation Review',
  other: 'Other',
  performance_support: 'Performance Support',
  development: 'Development Plan',
};

const CYCLE_TYPE_COLORS: Record<string, string> = {
  standard: 'bg-blue-100 text-blue-700',
  probation: 'bg-orange-100 text-orange-700',
  performance_support: 'bg-red-100 text-red-700',
  development: 'bg-green-100 text-green-700',
};

export default function OneToOneReviews() {
  const { profile, effectiveProfile, isViewingAs, guardViewAs } = useAuth();
  const activeProfile = effectiveProfile || profile;

  const [view, setView] = useState<'dashboard' | 'interface'>('dashboard');
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [cycles, setCycles] = useState<ReviewCycle[]>([]);
  const [selectedMeetingId, setSelectedMeetingId] = useState<string>('');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  const [historyMeetingId, setHistoryMeetingId] = useState<string>('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editCycleId, setEditCycleId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCyclesPanel, setShowCyclesPanel] = useState(true);
  const [teamSkillsMetrics, setTeamSkillsMetrics] = useState<any[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<ReviewCycle | null>(null);
  const [deleting, setDeleting] = useState(false);

  const isFullAdmin = profile?.role === 'admin' && (profile as any)?.admin_type === 'full_admin';

  useEffect(() => {
    if (activeProfile?.id) {
      loadAll();
    }
  }, [activeProfile?.id]);

  async function loadAll() {
    setLoading(true);
    await Promise.all([
      loadCycles(),
      loadTeamStatus(),
      loadTeamSkillsMetrics(),
    ]);
    setLoading(false);
  }

  async function loadCycles() {
    try {
      const { data: cyclesData } = await supabase
        .from('one_to_one_review_cycles')
        .select('*')
        .eq('manager_id', activeProfile?.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (!cyclesData) { setCycles([]); return; }

      const enriched = await Promise.all(cyclesData.map(async cycle => {
        const { count: empCount } = await supabase
          .from('one_to_one_cycle_employee_assignments')
          .select('*', { count: 'exact', head: true })
          .eq('cycle_id', cycle.id)
          .eq('is_active', true);

        const { count: kpiCount } = await supabase
          .from('one_to_one_cycle_kpis')
          .select('*', { count: 'exact', head: true })
          .eq('cycle_id', cycle.id);

        return {
          ...cycle,
          employee_count: empCount || 0,
          kpi_count: kpiCount || 0,
        } as ReviewCycle;
      }));

      setCycles(enriched);
    } catch (error) {
      console.error('Error loading cycles:', error);
    }
  }

  async function loadTeamStatus() {
    try {
      const { data: members, error } = await supabase
        .from('profiles')
        .select('id, full_name, job_title, department')
        .eq('manager_id', activeProfile?.id)
        .eq('active', true)
        .order('full_name');

      if (error) throw error;

      // Today at midnight for date-only comparisons
      const todayMidnight = new Date();
      todayMidnight.setHours(0, 0, 0, 0);
      // Window for "next scheduled" = not-yet-missed (>= 5 days ago)
      const missedCutoff = new Date(todayMidnight);
      missedCutoff.setDate(missedCutoff.getDate() - 4);

      const enrichedMembers = await Promise.all(
        (members || []).map(async member => {
          const [lastReview, nextScheduled, activeCycle] = await Promise.all([
            // Most recent completed/submitted review
            supabase
              .from('one_to_one_scheduled_meetings')
              .select('id, completion_status, scheduled_datetime, submitted_at')
              .eq('employee_id', member.id)
              .eq('manager_id', activeProfile?.id)
              .in('completion_status', ['submitted', 'completed'])
              .order('submitted_at', { ascending: false })
              .limit(1)
              .maybeSingle(),
            // Next upcoming non-completed meeting, or most recent past one if none upcoming
            supabase
              .from('one_to_one_scheduled_meetings')
              .select('id, scheduled_datetime, original_scheduled_datetime, completion_status')
              .eq('employee_id', member.id)
              .eq('manager_id', activeProfile?.id)
              .not('completion_status', 'in', '("submitted","completed")')
              .gte('scheduled_datetime', new Date().toISOString())
              .order('scheduled_datetime', { ascending: true })
              .limit(1)
              .maybeSingle(),
            supabase
              .from('one_to_one_cycle_employee_assignments')
              .select('cycle_id, one_to_one_review_cycles(cycle_name, template_title, template_start_date, review_frequency)')
              .eq('employee_id', member.id)
              .eq('manager_id', activeProfile?.id)
              .eq('is_active', true)
              .maybeSingle(),
          ]);

          let daysSinceLastReview = null;
          if (lastReview.data?.submitted_at) {
            const lastDate = new Date(lastReview.data.submitted_at);
            daysSinceLastReview = Math.floor((new Date().getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
          }

          // If no future meeting found, fall back to most recent past non-completed meeting
          let nextMtgData = nextScheduled.data;
          if (!nextMtgData) {
            const { data: pastMtg } = await supabase
              .from('one_to_one_scheduled_meetings')
              .select('id, scheduled_datetime, original_scheduled_datetime, completion_status')
              .eq('employee_id', member.id)
              .eq('manager_id', activeProfile?.id)
              .not('completion_status', 'in', '("submitted","completed")')
              .lt('scheduled_datetime', new Date().toISOString())
              .order('scheduled_datetime', { ascending: false })
              .limit(1)
              .maybeSingle();
            nextMtgData = pastMtg;
          }

          // Check if the next meeting has any input (weekly checkin or monthly review)
          let hasInput = false;
          const nextMtg = nextMtgData;
          if (nextMtg?.id) {
            const [ciRes, mrRes] = await Promise.all([
              supabase
                .from('one_to_one_weekly_checkins')
                .select('id', { count: 'exact', head: true })
                .eq('meeting_id', nextMtg.id),
              supabase
                .from('one_to_one_monthly_reviews')
                .select('id', { count: 'exact', head: true })
                .eq('meeting_id', nextMtg.id),
            ]);
            hasInput = (ciRes.count ?? 0) > 0 || (mrRes.count ?? 0) > 0;
          }

          const cycleData = activeCycle.data as any;
          const cycleFrequency: string = cycleData?.one_to_one_review_cycles?.review_frequency || '';

          // When there is no pending future meeting but there is a completed last review,
          // calculate the next review date from the last review date based on cycle frequency.
          let calculatedNextDatetime: string | null = null;
          if (!nextMtg && lastReview.data?.submitted_at && cycleFrequency === 'monthly') {
            const lastDate = new Date(lastReview.data.submitted_at);
            lastDate.setMonth(lastDate.getMonth() + 1);
            calculatedNextDatetime = lastDate.toISOString();
          }

          // If no pending meeting found, surface the last completed meeting so status shows Completed
          const displayMtg = nextMtg || (lastReview.data?.id ? {
            id: lastReview.data.id,
            scheduled_datetime: calculatedNextDatetime ?? lastReview.data.scheduled_datetime,
            original_scheduled_datetime: null,
            completion_status: lastReview.data.completion_status,
          } : null);

          return {
            ...member,
            last_review_date: lastReview.data?.submitted_at || null,
            last_review_meeting_id: lastReview.data?.id || null,
            next_scheduled_date: displayMtg?.scheduled_datetime || null,
            next_scheduled_meeting_id: nextMtg?.id || null,
            next_scheduled_original_date: displayMtg?.original_scheduled_datetime || null,
            next_completion_status: displayMtg?.completion_status || null,
            next_meeting_has_input: hasInput,
            outstanding_actions: 0,
            days_since_last_review: daysSinceLastReview,
            active_cycle_name: cycleData?.one_to_one_review_cycles?.template_title || cycleData?.one_to_one_review_cycles?.cycle_name || null,
            active_cycle_id: cycleData?.cycle_id || null,
            cycle_template_start_date: cycleData?.one_to_one_review_cycles?.template_start_date || null,
          };
        })
      );

      setTeamMembers(enrichedMembers);
    } catch (error) {
      console.error('Error loading team status:', error);
    }
  }

  async function startReview(employeeId: string, meetingId?: string) {
    if (meetingId) {
      setSelectedMeetingId(meetingId);
      setSelectedEmployeeId(employeeId);
      setView('interface');
      return;
    }
    if (guardViewAs()) return;

    const { data: activeCycle } = await supabase
      .from('one_to_one_cycle_employee_assignments')
      .select('cycle_id')
      .eq('employee_id', employeeId)
      .eq('manager_id', activeProfile?.id)
      .eq('is_active', true)
      .maybeSingle();

    const { data: newMeeting, error } = await supabase
      .from('one_to_one_scheduled_meetings')
      .insert({
        oto_cycle_id: activeCycle?.cycle_id || null,
        manager_id: activeProfile?.id,
        employee_id: employeeId,
        scheduled_datetime: new Date().toISOString(),
        status: 'scheduled',
        completion_status: 'scheduled',
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating meeting:', error);
      return;
    }

    setSelectedMeetingId(newMeeting.id);
    setSelectedEmployeeId(employeeId);
    setView('interface');
  }

  async function loadTeamSkillsMetrics() {
    try {
      const { data } = await supabase
        .from('team_skill_metrics')
        .select('*')
        .eq('manager_id', activeProfile?.id)
        .order('skill_name');
      setTeamSkillsMetrics(data || []);
    } catch (error) {
      console.error('Error loading team skills:', error);
    }
  }

  function getStatusBadge(member: TeamMember) {
    const status = computeReviewStatus({
      scheduled_datetime: member.next_scheduled_date,
      original_scheduled_datetime: member.next_scheduled_original_date,
      completion_status: member.next_completion_status,
      has_input: member.next_meeting_has_input,
    });
    const style = STATUS_STYLES[status];

    const iconMap: Record<string, JSX.Element> = {
      'Not Started':  <Clock className="w-4 h-4" />,
      'Due Soon':     <AlertTriangle className="w-4 h-4" />,
      'In Progress':  <Clock className="w-4 h-4" />,
      'Overdue':      <AlertCircle className="w-4 h-4" />,
      'Rescheduled':  <Calendar className="w-4 h-4" />,
      'Missed':       <AlertCircle className="w-4 h-4" />,
      'Completed':    <CheckCircle className="w-4 h-4" />,
    };

    return { text: style.label, class: style.class, icon: iconMap[status] };
  }

  function handleCycleCreated() {
    setShowCreateModal(false);
    loadAll();
  }

  function handleCycleEdited() {
    setEditCycleId(null);
    loadAll();
  }

  async function handleDeleteCycle() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const { error } = await supabase
        .from('one_to_one_review_cycles')
        .delete()
        .eq('id', deleteTarget.id);
      if (error) throw error;
      setDeleteTarget(null);
      await loadAll();
    } catch (err) {
      console.error('Error deleting cycle:', err);
      alert('Failed to delete review template');
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (view === 'interface' && selectedMeetingId) {
    return (
      <OneToOneInterface
        meetingId={selectedMeetingId}
        employeeId={selectedEmployeeId}
        onBack={() => {
          setView('dashboard');
          setSelectedMeetingId('');
          setSelectedEmployeeId('');
          setHistoryMeetingId('');
          loadAll();
        }}
        openHistory={historyMeetingId === selectedMeetingId}
      />
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">One-to-One Reviews</h1>
          <p className="text-gray-600 mt-1 text-sm sm:text-base">Manage 1:1 templates and monthly reviews with your team</p>
        </div>
        <button
          onClick={() => { if (!guardViewAs()) setShowCreateModal(true); }}
          className={`flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm ${isViewingAs ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <Plus className="w-4 h-4" />
          Create Review Template
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <button
          onClick={() => setShowCyclesPanel(!showCyclesPanel)}
          className="w-full flex items-center justify-between p-5 hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <Settings className="w-5 h-5 text-gray-500" />
            <div className="text-left">
              <p className="font-semibold text-gray-900">Review Templates</p>
              <p className="text-xs text-gray-500 mt-0.5">
                {cycles.length > 0
                  ? `${cycles.length} active template${cycles.length !== 1 ? 's' : ''}`
                  : 'No active templates'}
              </p>
            </div>
          </div>
          {showCyclesPanel ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
        </button>

        {showCyclesPanel && (
          <div className="border-t border-gray-200">
            {cycles.length === 0 ? (
              <div className="p-8 text-center">
                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Settings className="w-6 h-6 text-gray-400" />
                </div>
                <p className="font-medium text-gray-600">No active review templates</p>
                <p className="text-sm text-gray-400 mt-1">Create a template to structure your 1:1 reviews with KPIs and agenda items</p>
                <button
                  onClick={() => { if (!guardViewAs()) setShowCreateModal(true); }}
                  className={`mt-4 flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm mx-auto ${isViewingAs ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <Plus className="w-4 h-4" />
                  Create First Template
                </button>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {cycles.map(cycle => (
                  <div key={cycle.id} className="p-5 hover:bg-gray-50/50 transition-colors">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <h3 className="font-semibold text-gray-900">
                            {cycle.template_title || cycle.cycle_name}
                          </h3>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${CYCLE_TYPE_COLORS[cycle.cycle_type] || 'bg-gray-100 text-gray-600'}`}>
                            {CYCLE_TYPE_LABELS[cycle.cycle_type] || cycle.cycle_type}
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                            Active
                          </span>
                        </div>
                        {cycle.summary && (
                          <p className="text-sm text-gray-600 mb-2 line-clamp-1">{cycle.summary}</p>
                        )}
                        <div className="flex items-center gap-4 text-xs text-gray-500 flex-wrap">
                          <span className="flex items-center gap-1">
                            <Users className="w-3.5 h-3.5" />
                            {cycle.employee_count} employee{cycle.employee_count !== 1 ? 's' : ''}
                          </span>
                          <span className="flex items-center gap-1">
                            <Target className="w-3.5 h-3.5" />
                            {cycle.kpi_count} KPI{cycle.kpi_count !== 1 ? 's' : ''}
                          </span>
                          <span className="capitalize">{cycle.review_frequency} — {cycle.duration_minutes} min</span>
                          {(cycle as any).template_start_date && (
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5" />
                              From: {new Date((cycle as any).template_start_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                              {(cycle as any).template_end_date && ` — ${new Date((cycle as any).template_end_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                          onClick={() => { if (!guardViewAs()) setEditCycleId(cycle.id); }}
                          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 border border-gray-300 hover:bg-gray-100 rounded-lg transition-colors ${isViewingAs ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          Edit Template
                        </button>
                        {isFullAdmin && (
                          <button
                            onClick={() => { if (!guardViewAs()) setDeleteTarget(cycle); }}
                            className={`p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors ${isViewingAs ? 'opacity-50 cursor-not-allowed' : ''}`}
                            title="Delete template"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {teamSkillsMetrics.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <BarChart2 className="w-5 h-5 text-gray-500" />
              <h2 className="text-lg font-semibold text-gray-900">Team Skills Overview</h2>
            </div>
            <span className="text-xs text-gray-500">{teamSkillsMetrics.length} skill{teamSkillsMetrics.length !== 1 ? 's' : ''} tracked</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {teamSkillsMetrics.slice(0, 6).map((metric, index) => (
              <div key={index} className="border rounded-lg p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{metric.skill_name}</p>
                    <p className="text-xs text-gray-500">{metric.skill_type}</p>
                  </div>
                  {metric.total_discrepancies > 0 && (
                    <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs rounded ml-2">
                      {metric.total_discrepancies} flag{metric.total_discrepancies !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between text-sm mt-3">
                  <div>
                    <p className="text-gray-600 text-xs">Avg Rating</p>
                    <p className="text-2xl font-bold text-blue-600">{metric.team_average_rating}/5</p>
                  </div>
                  <div className="text-right">
                    <p className="text-gray-600 text-xs">Target</p>
                    <p className="text-lg font-semibold text-gray-700">{metric.team_target_level}/5</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200">
        <div className="p-5 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Team</h2>
          <p className="text-xs text-gray-500 mt-0.5">Start or continue 1:1 reviews with your team members</p>
        </div>

        {teamMembers.length === 0 ? (
          <div className="text-center py-16">
            <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-base font-medium text-gray-900 mb-2">No Team Members</h3>
            <p className="text-gray-500 text-sm">You don't have any direct reports assigned yet.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {teamMembers.map(member => {
              const status = getStatusBadge(member);
              return (
                <div key={member.id} className="p-5 hover:bg-gray-50/50 transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <h3 className="text-base font-semibold text-gray-900">{member.full_name}</h3>
                        <span className={`flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${status.class}`}>
                          {status.icon}
                          {status.text}
                        </span>
                        {member.active_cycle_name && (
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                            {member.active_cycle_name}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500">{member.job_title} — {member.department}</p>

                      <div className="flex flex-wrap items-center gap-4 mt-2.5 text-xs text-gray-500">
                        <div>
                          <span className="font-medium">Last: </span>
                          {member.last_review_date
                            ? new Date(member.last_review_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
                            : 'Never'}
                          {member.days_since_last_review !== null && (
                            <span className="ml-1 hidden sm:inline">({member.days_since_last_review}d ago)</span>
                          )}
                        </div>
                        {(member.next_scheduled_date || member.cycle_template_start_date) && (
                          <div className="hidden sm:block">
                            <span className="font-medium">Next: </span>
                            {member.next_scheduled_date
                              ? new Date(member.next_scheduled_date).toLocaleDateString('en-GB', {
                                  day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                                })
                              : new Date(member.cycle_template_start_date!).toLocaleDateString('en-GB', {
                                  day: 'numeric', month: 'short', year: 'numeric'
                                })
                            }
                          </div>
                        )}
                        {member.outstanding_actions > 0 && (
                          <div className="flex items-center gap-1 text-orange-600">
                            <AlertCircle className="w-3 h-3" />
                            <span className="font-medium">{member.outstanding_actions} Actions</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap sm:flex-nowrap">
                      {member.last_review_meeting_id && (
                        <button
                          onClick={() => {
                            setHistoryMeetingId(member.last_review_meeting_id!);
                            setSelectedMeetingId(member.last_review_meeting_id!);
                            setSelectedEmployeeId(member.id);
                            setView('interface');
                          }}
                          className="flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm flex-1 sm:flex-none"
                        >
                          <History className="w-4 h-4" />
                          View Reviews
                        </button>
                      )}
                      {(() => {
                        const hasPendingMeeting = !!member.next_scheduled_meeting_id;
                        const canStartNew = !isViewingAs && !!member.active_cycle_id;
                        const canViewExisting = isViewingAs && !!(member.next_scheduled_meeting_id || member.last_review_meeting_id);
                        if (!hasPendingMeeting && !canStartNew && !canViewExisting) return null;
                        const meetingId = member.next_scheduled_meeting_id || (isViewingAs ? member.last_review_meeting_id : undefined) || undefined;
                        const label = isViewingAs ? 'View Review' : hasPendingMeeting ? 'Open Review' : 'Start Review';
                        return (
                          <button
                            onClick={() => startReview(member.id, meetingId)}
                            className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm flex-1 sm:flex-none"
                          >
                            <PlayCircle className="w-4 h-4" />
                            {label}
                          </button>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <CreateReviewCycleModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={handleCycleCreated}
      />

      {editCycleId && (
        <EditReviewCycleModal
          isOpen={!!editCycleId}
          cycleId={editCycleId}
          onClose={() => setEditCycleId(null)}
          onSuccess={handleCycleEdited}
        />
      )}

      {deleteTarget && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-start gap-4 mb-5">
              <div className="p-2.5 bg-red-100 rounded-lg flex-shrink-0">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Delete Review Template</h3>
                <p className="text-sm text-gray-600 mt-1">
                  You are about to delete <span className="font-medium">"{deleteTarget.cycle_name}"</span>.
                </p>
              </div>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <p className="text-sm font-semibold text-green-800 mb-1">What will be preserved:</p>
              <ul className="text-sm text-green-700 list-disc list-inside space-y-0.5">
                <li>All completed one-to-one meetings and records</li>
                <li>All historical weekly check-ins and monthly reviews</li>
                <li>All performance data and notes</li>
              </ul>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteCycle}
                disabled={deleting}
                className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-50"
              >
                {deleting ? 'Deleting...' : 'Delete Template'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
