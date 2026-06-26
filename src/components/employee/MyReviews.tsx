import { useState, useEffect } from 'react';
import {
  Calendar, CheckCircle, Clock, FileText, MessageSquare,
  TrendingUp, BarChart2, Award, ChevronDown, ChevronUp,
  Target, Sparkles, Lock,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { format } from 'date-fns';

interface ManualKpiEntry {
  kpi_name: string;
  actual_value: string;
  score: number;
  comment: string;
}

interface ValuesRating {
  value_title: string;
  competency_title: string;
  manager_rating: number;
  manager_comment: string;
}

interface MonthlyReview {
  id: string;
  meeting_id: string;
  review_month: string;
  status: string;
  submitted_at: string | null;
  overall_average: number | null;
  overall_kpi_average: number | null;
  overall_competency_score: number | null;
  manager_summary: string | null;
  manager_additional_context: string | null;
  manual_kpi_entries: ManualKpiEntry[] | null;
  values_ratings: ValuesRating[] | null;
  kpi_ratings: any;
  kpi_snapshots: any;
  requires_moderation: boolean;
  moderation_status: string | null;
  scheduled_datetime: string | null;
  manager_name: string | null;
  template_title: string | null;
}

interface ActionItem {
  id: string;
  action_text: string;
  due_date: string | null;
  status: string;
}

interface WeeklyCheckin {
  id: string;
  week_starting: string;
  performance_score: number | null;
  summary: string | null;
  kpi_discussion: any;
  scheduled_datetime: string | null;
}

function competencyPendingModeration(
  review: Pick<MonthlyReview, 'requires_moderation' | 'moderation_status'>
): boolean {
  if (!review.requires_moderation) return false;
  return !['approved', 'adjusted'].includes(review.moderation_status || '');
}

const SCORE_COLOURS = [
  '',
  'bg-red-100 text-red-800',
  'bg-orange-100 text-orange-800',
  'bg-blue-100 text-blue-800',
  'bg-green-100 text-green-800',
  'bg-emerald-100 text-emerald-800',
];

const SCORE_LABELS = ['', 'Development needed', 'Requires guidance', 'On target', 'Exceeding', 'Exceptional'];

function ScorePill({ score, max = 5 }: { score: number | null; max?: number }) {
  if (score === null || score === undefined) return null;
  const s = Number(score);
  const pct = s / max;
  const colour =
    pct >= 0.9 ? 'bg-emerald-100 text-emerald-800' :
    pct >= 0.7 ? 'bg-green-100 text-green-800' :
    pct >= 0.5 ? 'bg-blue-100 text-blue-800' :
    pct >= 0.3 ? 'bg-amber-100 text-amber-800' :
    'bg-red-100 text-red-800';
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${colour}`}>
      {s.toFixed(1)} / {max}
    </span>
  );
}

function RatingDot({ rating }: { rating: number }) {
  const label = SCORE_LABELS[rating] || String(rating);
  const colour = SCORE_COLOURS[rating] || 'bg-gray-100 text-gray-700';
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colour}`}>
      {rating}/5 — {label}
    </span>
  );
}

function SectionHeading({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <div className="text-gray-400">{icon}</div>
      <h4 className="text-sm font-semibold text-gray-800">{label}</h4>
    </div>
  );
}

export default function MyReviews() {
  const { user, profile, effectiveProfile } = useAuth();
  const activeUserId = effectiveProfile?.id || user?.id;

  const [monthlyReviews, setMonthlyReviews] = useState<MonthlyReview[]>([]);
  const [weeklyCheckins, setWeeklyCheckins] = useState<WeeklyCheckin[]>([]);
  const [standingActions, setStandingActions] = useState<ActionItem[]>([]);
  const [actionsByMeeting, setActionsByMeeting] = useState<Record<string, ActionItem[]>>({});
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'monthly' | 'weekly' | 'actions'>('monthly');

  useEffect(() => {
    if (activeUserId) loadData();
  }, [activeUserId]);

  async function loadData() {
    if (!activeUserId) return;
    setLoading(true);
    try {
      await Promise.all([loadMonthlyReviews(), loadWeeklyCheckins(), loadStandingActions()]);
    } finally {
      setLoading(false);
    }
  }

  async function loadMonthlyReviews() {
    const { data, error } = await supabase
      .from('one_to_one_monthly_reviews')
      .select(`
        id, meeting_id, review_month, status, submitted_at,
        overall_average, overall_kpi_average, overall_competency_score,
        requires_moderation, moderation_status,
        manager_summary, manager_additional_context,
        manual_kpi_entries, values_ratings,
        kpi_ratings, kpi_snapshots,
        meeting:one_to_one_scheduled_meetings!one_to_one_monthly_reviews_meeting_id_fkey(
          scheduled_datetime,
          oto_cycle_id,
          manager:profiles!one_to_one_scheduled_meetings_manager_id_fkey(full_name)
        )
      `)
      .eq('employee_id', activeUserId)
      .in('status', ['submitted', 'completed'])
      .order('review_month', { ascending: false });

    if (error) { console.error('monthly reviews', error); return; }

    const shaped: MonthlyReview[] = (data || []).map((r: any) => ({
      id: r.id,
      meeting_id: r.meeting_id,
      review_month: r.review_month,
      status: r.status,
      submitted_at: r.submitted_at,
      overall_average: r.overall_average != null ? Number(r.overall_average) : null,
      overall_kpi_average: r.overall_kpi_average != null ? Number(r.overall_kpi_average) : null,
      overall_competency_score: r.overall_competency_score != null ? Number(r.overall_competency_score) : null,
      requires_moderation: !!r.requires_moderation,
      moderation_status: r.moderation_status || null,
      manager_summary: r.manager_summary || null,
      manager_additional_context: r.manager_additional_context || null,
      manual_kpi_entries: Array.isArray(r.manual_kpi_entries) ? r.manual_kpi_entries : null,
      values_ratings: Array.isArray(r.values_ratings) ? r.values_ratings : null,
      kpi_ratings: r.kpi_ratings || null,
      kpi_snapshots: r.kpi_snapshots || null,
      scheduled_datetime: r.meeting?.scheduled_datetime || null,
      manager_name: r.meeting?.manager?.full_name || null,
      template_title: null,
    }));

    setMonthlyReviews(shaped);
    if (shaped.length > 0) setExpandedId(shaped[0].id);

    // Load actions keyed by meeting_id for each review
    const meetingIds = shaped.map(r => r.meeting_id).filter(Boolean);
    if (meetingIds.length > 0) {
      const { data: acts } = await supabase
        .from('one_to_one_action_items')
        .select('id, action_text, due_date, status, meeting_id')
        .in('meeting_id', meetingIds)
        .order('due_date', { ascending: true });

      const byMeeting: Record<string, ActionItem[]> = {};
      (acts || []).forEach((a: any) => {
        if (!byMeeting[a.meeting_id]) byMeeting[a.meeting_id] = [];
        byMeeting[a.meeting_id].push({ id: a.id, action_text: a.action_text, due_date: a.due_date, status: a.status });
      });
      setActionsByMeeting(byMeeting);
    }

    // Also fetch cycle template title for each review
    const cycleIds = (data || [])
      .map((r: any) => r.meeting?.oto_cycle_id)
      .filter(Boolean) as string[];

    if (cycleIds.length > 0) {
      const { data: cycles } = await supabase
        .from('one_to_one_review_cycles')
        .select('id, template_title, cycle_name')
        .in('id', cycleIds);

      if (cycles) {
        const cycleMap: Record<string, string> = {};
        cycles.forEach((c: any) => { cycleMap[c.id] = c.template_title || c.cycle_name || null; });
        setMonthlyReviews(prev => prev.map((r, i) => {
          const cycleId = (data as any[])[i]?.meeting?.oto_cycle_id;
          return cycleId ? { ...r, template_title: cycleMap[cycleId] || null } : r;
        }));
      }
    }
  }

  async function loadWeeklyCheckins() {
    const { data, error } = await supabase
      .from('one_to_one_weekly_checkins')
      .select(`
        id, week_starting, performance_score, summary, kpi_discussion,
        meeting:one_to_one_scheduled_meetings!one_to_one_weekly_checkins_meeting_id_fkey(scheduled_datetime)
      `)
      .eq('employee_id', activeUserId)
      .eq('status', 'completed')
      .order('week_starting', { ascending: false })
      .limit(20);

    if (error) { console.error('weekly checkins', error); return; }
    setWeeklyCheckins((data || []).map((r: any) => ({
      id: r.id,
      week_starting: r.week_starting,
      performance_score: r.performance_score,
      summary: r.summary,
      kpi_discussion: r.kpi_discussion,
      scheduled_datetime: r.meeting?.scheduled_datetime || null,
    })));
  }

  async function loadStandingActions() {
    const { data, error } = await supabase
      .from('one_to_one_action_items')
      .select('id, action_text, due_date, status, created_at')
      .eq('owner_id', activeUserId)
      .neq('status', 'closed')
      .order('due_date', { ascending: true });

    if (error) { console.error('actions', error); return; }
    setStandingActions(data || []);
  }

  const latestReview = monthlyReviews[0] || null;

  // ── Render helpers ──────────────────────────────────────────────────────────

  function renderKpiSection(review: MonthlyReview) {
    const entries: ManualKpiEntry[] = Array.isArray(review.manual_kpi_entries) && review.manual_kpi_entries.length > 0
      ? review.manual_kpi_entries
      : buildKpiFromRatings(review.kpi_ratings, review.kpi_snapshots);

    if (entries.length === 0) return null;

    return (
      <div>
        <SectionHeading icon={<Target className="w-4 h-4" />} label="KPI Performance" />
        <div className="space-y-3">
          {entries.map((k, i) => (
            <div key={i} className="bg-gray-50 rounded-lg p-3">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <span className="text-sm font-medium text-gray-800">{k.kpi_name}</span>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {k.actual_value ? (
                    <span className="text-xs text-gray-500 bg-white border border-gray-200 px-2 py-0.5 rounded">
                      Actual: {k.actual_value}
                    </span>
                  ) : null}
                  {k.score > 0 && <RatingDot rating={k.score} />}
                </div>
              </div>
              {k.comment?.trim() ? (
                <p className="text-xs text-gray-600 mt-2 leading-relaxed">{k.comment}</p>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    );
  }

  function buildKpiFromRatings(kpiRatings: any, kpiSnapshots: any): ManualKpiEntry[] {
    const snaps = kpiSnapshots && typeof kpiSnapshots === 'object' ? kpiSnapshots : {};
    const ratings = kpiRatings && typeof kpiRatings === 'object' ? kpiRatings : {};
    const keys = [...new Set([...Object.keys(snaps), ...Object.keys(ratings)])];
    return keys.map(k => {
      const snap = snaps[k] || {};
      const rat = ratings[k];
      const score = snap.manager_score ?? (rat && typeof rat === 'object' ? rat.score : typeof rat === 'number' ? rat : 0);
      const actual = (rat && typeof rat === 'object' ? rat.actual : '') || '';
      const comment = (rat && typeof rat === 'object' ? rat.comment : '') || '';
      return { kpi_name: snap.kpi_name || k, actual_value: actual, score: score || 0, comment };
    });
  }

  function renderCompetencySection(review: MonthlyReview) {
    if (competencyPendingModeration(review)) {
      return (
        <div>
          <SectionHeading icon={<Award className="w-4 h-4" />} label="Competency Ratings" />
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-center gap-2">
            <Lock className="w-4 h-4 text-amber-500 flex-shrink-0" />
            <p className="text-sm text-amber-700">Competency ratings are being reviewed and will be visible once finalised.</p>
          </div>
        </div>
      );
    }

    const ratings = review.values_ratings;
    if (!ratings || ratings.length === 0) return null;

    const hasAnyComment = ratings.some(r => r.manager_comment?.trim());

    return (
      <div>
        <SectionHeading icon={<Award className="w-4 h-4" />} label="Competency Ratings" />
        <div className="space-y-3">
          {ratings.map((r, i) => (
            <div key={i} className="bg-gray-50 rounded-lg p-3">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-800">{r.value_title}</p>
                  {r.competency_title && r.competency_title !== r.value_title && (
                    <p className="text-xs text-gray-500 mt-0.5">{r.competency_title}</p>
                  )}
                </div>
                <RatingDot rating={r.manager_rating} />
              </div>
              {r.manager_comment?.trim() && (
                <p className="text-xs text-gray-600 mt-2 leading-relaxed border-t border-gray-200 pt-2">
                  {r.manager_comment}
                </p>
              )}
            </div>
          ))}
        </div>
        {!hasAnyComment && (
          <p className="text-xs text-gray-400 mt-2">No written feedback recorded for this review.</p>
        )}
      </div>
    );
  }

  function renderActionsSection(review: MonthlyReview) {
    const actions = actionsByMeeting[review.meeting_id] || [];
    if (actions.length === 0) return null;

    return (
      <div>
        <SectionHeading icon={<CheckCircle className="w-4 h-4" />} label="Actions Agreed" />
        <div className="space-y-2">
          {actions.map(a => {
            const isOverdue = a.due_date && new Date(a.due_date) < new Date() && a.status !== 'closed';
            const statusColour =
              a.status === 'closed' ? 'bg-green-100 text-green-700' :
              isOverdue ? 'bg-red-100 text-red-700' :
              a.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
              'bg-amber-100 text-amber-700';
            return (
              <div key={a.id} className="flex items-start justify-between gap-3 bg-gray-50 rounded-lg px-3 py-2.5">
                <p className="text-sm text-gray-700 leading-snug">{a.action_text}</p>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {a.due_date && (
                    <span className="text-xs text-gray-400 whitespace-nowrap">
                      {format(new Date(a.due_date), 'd MMM')}
                    </span>
                  )}
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColour}`}>
                    {isOverdue ? 'Overdue' : a.status.replace('_', ' ')}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  function renderSummarySection(review: MonthlyReview) {
    const text = review.manager_summary?.trim();
    if (!text) return null;

    // Render markdown-lite: bold **text** headings and bullet lines
    const lines = text.split('\n');
    return (
      <div>
        <SectionHeading icon={<Sparkles className="w-4 h-4" />} label="Review Summary" />
        <div className="bg-gradient-to-br from-blue-50 to-gray-50 border border-blue-100 rounded-lg p-4 text-sm text-gray-700 space-y-1 leading-relaxed">
          {lines.map((line, i) => {
            const bold = line.match(/^\*\*(.+?)\*\*\s*$/);
            if (bold) return <p key={i} className="font-semibold text-gray-900 mt-2 first:mt-0">{bold[1]}</p>;
            if (line.trim().startsWith('-') || line.trim().startsWith('•')) {
              return <p key={i} className="pl-3 text-gray-600">{line.trim()}</p>;
            }
            if (!line.trim()) return <div key={i} className="h-1" />;
            return <p key={i}>{line}</p>;
          })}
        </div>
        {review.manager_additional_context?.trim() && (
          <div className="mt-3 bg-white border border-gray-200 rounded-lg p-3">
            <p className="text-xs font-medium text-gray-500 mb-1">Manager's additional notes</p>
            <p className="text-sm text-gray-700 leading-relaxed">{review.manager_additional_context}</p>
          </div>
        )}
      </div>
    );
  }

  function renderScoreSummary(review: MonthlyReview) {
    const hidComp = competencyPendingModeration(review);
    return (
      <div className="grid grid-cols-3 gap-3">
        {review.overall_kpi_average != null && (
          <div className="bg-blue-50 rounded-xl p-3 text-center">
            <p className="text-xs text-blue-600 font-medium mb-1">KPI Average</p>
            <p className="text-2xl font-bold text-blue-900">{Number(review.overall_kpi_average).toFixed(1)}</p>
            <p className="text-xs text-blue-400 mt-0.5">/ 5</p>
          </div>
        )}
        {hidComp ? (
          <div className="bg-amber-50 rounded-xl p-3 text-center flex flex-col items-center justify-center">
            <Lock className="w-4 h-4 text-amber-400 mb-1" />
            <p className="text-xs text-amber-600 font-medium">Competency</p>
            <p className="text-xs text-amber-500 mt-0.5">Under review</p>
          </div>
        ) : review.overall_competency_score != null ? (
          <div className="bg-teal-50 rounded-xl p-3 text-center">
            <p className="text-xs text-teal-600 font-medium mb-1">Competency</p>
            <p className="text-2xl font-bold text-teal-900">{Number(review.overall_competency_score).toFixed(1)}</p>
            <p className="text-xs text-teal-400 mt-0.5">/ 5</p>
          </div>
        ) : null}
        {review.overall_average != null && (
          <div className="bg-gray-100 rounded-xl p-3 text-center">
            <p className="text-xs text-gray-500 font-medium mb-1">Overall</p>
            <p className="text-2xl font-bold text-gray-900">{Number(review.overall_average).toFixed(1)}</p>
            <p className="text-xs text-gray-400 mt-0.5">/ 5</p>
          </div>
        )}
      </div>
    );
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">My Reviews</h1>
        <p className="text-gray-500 mt-1">Your completed performance reviews — read only</p>
      </div>

      {/* Summary tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle className="w-4 h-4 text-green-500" />
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Reviews</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{monthlyReviews.length}</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <BarChart2 className="w-4 h-4 text-blue-500" />
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Latest Avg</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {latestReview?.overall_average != null ? Number(latestReview.overall_average).toFixed(1) : '—'}
          </p>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 text-teal-500" />
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">KPI Avg</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {latestReview?.overall_kpi_average != null ? Number(latestReview.overall_kpi_average).toFixed(1) : '—'}
          </p>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <Award className="w-4 h-4 text-amber-500" />
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Competency</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {latestReview && competencyPendingModeration(latestReview)
              ? <span className="text-sm text-gray-400 font-normal">Under review</span>
              : latestReview?.overall_competency_score != null
                ? Number(latestReview.overall_competency_score).toFixed(1)
                : '—'}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
        {(['monthly', 'weekly', 'actions'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab === 'monthly' ? `Monthly Reviews (${monthlyReviews.length})` :
             tab === 'weekly' ? `Weekly Check-ins (${weeklyCheckins.length})` :
             `My Actions (${standingActions.length})`}
          </button>
        ))}
      </div>

      {/* ── Monthly reviews ── */}
      {activeTab === 'monthly' && (
        <div className="space-y-3">
          {monthlyReviews.length === 0 ? (
            <div className="text-center py-16 bg-white border border-gray-200 rounded-xl">
              <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="font-medium text-gray-700">No completed reviews yet</p>
              <p className="text-sm text-gray-400 mt-1">Your manager will share reviews here once completed.</p>
            </div>
          ) : (
            monthlyReviews.map(review => {
              const isExpanded = expandedId === review.id;
              const monthLabel = format(new Date(review.review_month + 'T12:00:00'), 'MMMM yyyy');
              const hidComp = competencyPendingModeration(review);

              return (
                <div key={review.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                  {/* Header row */}
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : review.id)}
                    className="w-full px-5 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors text-left"
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-900">
                          {monthLabel} Review
                          {review.template_title && (
                            <span className="ml-2 text-xs font-normal text-gray-400">— {review.template_title}</span>
                          )}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {review.manager_name ? `With ${review.manager_name}` : ''}
                          {review.submitted_at
                            ? ` · Completed ${format(new Date(review.submitted_at), 'd MMM yyyy')}`
                            : ''}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0 ml-3">
                      <div className="hidden sm:flex items-center gap-2">
                        {review.overall_average != null && (
                          <ScorePill score={review.overall_average} />
                        )}
                        {review.overall_kpi_average != null && (
                          <span className="text-xs text-gray-400">KPI {Number(review.overall_kpi_average).toFixed(1)}</span>
                        )}
                        {!hidComp && review.overall_competency_score != null && (
                          <span className="text-xs text-gray-400">Comp {Number(review.overall_competency_score).toFixed(1)}</span>
                        )}
                      </div>
                      {isExpanded
                        ? <ChevronUp className="w-4 h-4 text-gray-400" />
                        : <ChevronDown className="w-4 h-4 text-gray-400" />}
                    </div>
                  </button>

                  {/* Expanded detail — read only */}
                  {isExpanded && (
                    <div className="border-t border-gray-100 px-5 py-5 space-y-6">
                      {/* Scores */}
                      {renderScoreSummary(review)}

                      {/* AI Summary */}
                      {renderSummarySection(review)}

                      {/* KPIs */}
                      {renderKpiSection(review)}

                      {/* Competencies */}
                      {renderCompetencySection(review)}

                      {/* Actions */}
                      {renderActionsSection(review)}

                      <div className="flex items-center gap-1.5 pt-2 border-t border-gray-100">
                        <Lock className="w-3.5 h-3.5 text-gray-300" />
                        <p className="text-xs text-gray-400">Read only — this is your copy of the completed review</p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ── Weekly check-ins ── */}
      {activeTab === 'weekly' && (
        <div className="space-y-3">
          {weeklyCheckins.length === 0 ? (
            <div className="text-center py-12 bg-white border border-gray-200 rounded-xl">
              <Clock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No weekly check-ins yet</p>
            </div>
          ) : (
            weeklyCheckins.map(checkin => {
              const isExpanded = expandedId === checkin.id;
              return (
                <div key={checkin.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : checkin.id)}
                    className="w-full px-5 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="text-left">
                        <p className="font-semibold text-gray-900">
                          Week of {format(new Date(checkin.week_starting + 'T12:00:00'), 'd MMM yyyy')}
                        </p>
                        {checkin.scheduled_datetime && (
                          <p className="text-xs text-gray-500 mt-0.5">
                            {format(new Date(checkin.scheduled_datetime), 'd MMM yyyy')}
                          </p>
                        )}
                      </div>
                      {checkin.performance_score != null && <ScorePill score={checkin.performance_score} />}
                    </div>
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                  </button>
                  {isExpanded && (
                    <div className="px-5 pb-5 border-t border-gray-100 space-y-4 pt-4">
                      {checkin.summary && (
                        <div>
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Manager Comments</p>
                          <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-700 leading-relaxed">{checkin.summary}</div>
                        </div>
                      )}
                      {checkin.kpi_discussion && typeof checkin.kpi_discussion === 'object' &&
                        Object.keys(checkin.kpi_discussion).length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">KPI Discussion</p>
                          <div className="space-y-3">
                            {Object.entries(checkin.kpi_discussion).map(([k, v]: [string, any]) => (
                              <div key={k} className="bg-gray-50 rounded-lg p-3">
                                <div className="flex items-center justify-between gap-3">
                                  <span className="text-sm font-medium text-gray-800">{v?.kpi_name || k}</span>
                                  <div className="flex items-center gap-2 flex-shrink-0">
                                    {v?.actual_value && (
                                      <span className="text-xs text-gray-400 bg-white border border-gray-200 px-2 py-0.5 rounded">
                                        {v.actual_value}{v.measurement_unit ? ` ${v.measurement_unit}` : ''}
                                      </span>
                                    )}
                                    {v?.manager_score != null && <ScorePill score={v.manager_score} />}
                                  </div>
                                </div>
                                {v?.manager_comment?.trim() && (
                                  <p className="text-xs text-gray-600 mt-2 leading-relaxed border-t border-gray-200 pt-2">
                                    {v.manager_comment}
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      <div className="flex items-center gap-1.5 pt-1 border-t border-gray-100">
                        <Lock className="w-3.5 h-3.5 text-gray-300" />
                        <p className="text-xs text-gray-400">Read only</p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ── Actions ── */}
      {activeTab === 'actions' && (
        <div className="space-y-3">
          {standingActions.length === 0 ? (
            <div className="text-center py-12 bg-white border border-gray-200 rounded-xl">
              <CheckCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No outstanding actions</p>
            </div>
          ) : (
            standingActions.map(action => {
              const isOverdue = action.due_date && new Date(action.due_date) < new Date();
              return (
                <div key={action.id} className="bg-white border border-gray-200 rounded-xl px-5 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-medium text-gray-900">{action.action_text}</p>
                    <span className={`flex-shrink-0 px-2 py-0.5 rounded-full text-xs font-medium ${
                      action.status === 'closed' ? 'bg-green-100 text-green-700' :
                      isOverdue ? 'bg-red-100 text-red-700' :
                      'bg-amber-100 text-amber-700'
                    }`}>
                      {isOverdue && action.status !== 'closed' ? 'Overdue' : action.status.replace('_', ' ')}
                    </span>
                  </div>
                  {action.due_date && (
                    <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      Due {format(new Date(action.due_date), 'd MMM yyyy')}
                    </p>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
