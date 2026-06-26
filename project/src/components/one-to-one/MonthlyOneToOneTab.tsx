import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { TrendingUp, Save, Send, Calendar, ChevronDown, ChevronUp, BarChart2, Target, Award, CheckCircle, Plus, Trash2, MessageSquare, Sparkles, X, FileText, RefreshCw, Lock, CreditCard as Edit3, AlertCircle, Info } from 'lucide-react';
import { format, startOfMonth, subMonths, addMonths } from 'date-fns';
import WeeklyCheckinsTab from './WeeklyCheckinsTab';
import SkillsMatrixPanel from '../skills-matrix/SkillsMatrixPanel';

interface MonthlyOneToOneTabProps {
  meetingId: string;
  employeeId: string;
  competencyLevel?: string;
}

interface KPIRunningAverage {
  kpi_id: string;
  kpi_name: string;
  target_value: string;
  measurement_unit: string;
  average_score: number;
  entry_count: number;
  latest_score: number;
  latest_actual: string;
  latest_comment: string;
}

interface ManualKPIEntry {
  kpi_name: string;
  actual_value: string;
  score: number;
  comment: string;
}

interface ValuesRating {
  value_id: string;
  value_title: string;
  competency_id: string;
  competency_title: string;
  competency_statement?: string;
  evidence_prompt?: string;
  what_good_looks_like?: string;
  what_great_looks_like?: string;
  manager_rating: number;
  manager_comment: string;
  weekly_actions?: string[];
}

interface SeraRatingFeedback {
  type: 'action_required' | 'evidence_weak' | 'evidence_strong';
  message: string;
}

interface MonthlyReview {
  id?: string;
  review_month: string;
  overall_kpi_average?: number;
  overall_competency_average?: number;
  kpi_snapshots: Record<string, KPIRunningAverage>;
  manual_kpi_entries?: ManualKPIEntry[];
  values_ratings: ValuesRating[];
  manager_summary: string;
  sera_draft_summary: string;
  manager_additional_context: string;
  requires_moderation: boolean;
  status: string;
}

interface OutstandingAction {
  id: string;
  action_text: string;
  status: string;
  due_date?: string;
}

interface NewAction {
  action_text: string;
  owner: 'employee' | 'manager';
  due_date: string;
}

interface PreviousNote {
  review_month: string;
  manager_summary: string;
}

interface CycleInfo {
  id: string;
  description: string;
  standard_agenda: string;
  review_frequency: string;
  duration_minutes: number;
  next_review_date: string | null;
  kpis: Array<{ id: string; kpi_name: string; target_value: string; measurement_unit: string }>;
}

const KPI_SCORE_LABELS: Record<number, { label: string; color: string; bg: string; border: string }> = {
  0: { label: 'New to role', color: 'text-gray-700', bg: 'bg-gray-50', border: 'border-gray-300' },
  1: { label: 'Development needed', color: 'text-red-700', bg: 'bg-red-50', border: 'border-red-300' },
  2: { label: 'Requires guidance', color: 'text-orange-700', bg: 'bg-orange-50', border: 'border-orange-300' },
  3: { label: 'On target', color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-300' },
  4: { label: 'Exceeding', color: 'text-green-700', bg: 'bg-green-50', border: 'border-green-300' },
  5: { label: 'Exceptional', color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-300' },
};

const COMPETENCY_RATING_OPTIONS = [
  { value: 1, label: '1 — Development Needed' },
  { value: 3, label: '3 — On Target' },
  { value: 5, label: '5 — Exceptional' },
];

function isEvidenceWeak(comment: string): boolean {
  if (!comment || comment.trim().length < 15) return true;
  const text = comment.toLowerCase();
  const hasOutcome = /impact|result|outcome|achiev|deliver|led|drove|increased|improved|reduced|saved|enabled|demonstrated|completed|resolved/.test(text);
  if (!hasOutcome && comment.trim().length < 60) return true;
  return false;
}

function SeraRatingBanner({ feedback, onDismiss }: { feedback: SeraRatingFeedback; onDismiss: () => void }) {
  if (feedback.type === 'action_required') {
    return (
      <div className="flex items-start gap-2 p-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800 mt-1.5">
        <AlertCircle className="w-3.5 h-3.5 text-red-600 flex-shrink-0 mt-0.5" />
        <span className="flex-1">{feedback.message}</span>
        <button onClick={onDismiss}><X className="w-3.5 h-3.5 text-red-400" /></button>
      </div>
    );
  }
  if (feedback.type === 'evidence_weak') {
    return (
      <div className="flex items-start gap-2 p-2 bg-amber-50 border border-amber-300 rounded-lg text-xs text-amber-900 mt-1.5">
        <MessageSquare className="w-3.5 h-3.5 text-amber-600 flex-shrink-0 mt-0.5" />
        <span className="flex-1">{feedback.message}</span>
        <button onClick={onDismiss}><X className="w-3.5 h-3.5 text-amber-400" /></button>
      </div>
    );
  }
  return (
    <div className="flex items-start gap-2 p-2 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 mt-1.5">
      <Sparkles className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0 mt-0.5" />
      <span className="flex-1">{feedback.message}</span>
      <button onClick={onDismiss}><X className="w-3.5 h-3.5 text-emerald-400" /></button>
    </div>
  );
}

export default function MonthlyOneToOneTab({ meetingId, employeeId, competencyLevel = 'Employee' }: MonthlyOneToOneTabProps) {
  const { profile } = useAuth();
  const [currentMonth, setCurrentMonth] = useState(startOfMonth(new Date()));
  const [review, setReview] = useState<MonthlyReview | null>(null);
  const [kpiAverages, setKpiAverages] = useState<KPIRunningAverage[]>([]);
  const [manualKpis, setManualKpis] = useState<ManualKPIEntry[]>([]);
  const [cycleInfo, setCycleInfo] = useState<CycleInfo | null>(null);
  const [hasCycle, setHasCycle] = useState<boolean | null>(null);
  const [newActions, setNewActions] = useState<NewAction[]>([]);
  const [outstandingActions, setOutstandingActions] = useState<OutstandingAction[]>([]);
  const [actionDueDateEdits, setActionDueDateEdits] = useState<Record<string, string>>({});
  const [previousNotes, setPreviousNotes] = useState<PreviousNote[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [generatingSera, setGeneratingSera] = useState(false);
  const [showWeeklyCheckins, setShowWeeklyCheckins] = useState(false);
  const [showPreviousNotes, setShowPreviousNotes] = useState(false);
  const [seraRatingFeedbacks, setSeraRatingFeedbacks] = useState<Record<string, SeraRatingFeedback | null>>({});
  const [weeklyActionsByCompetency, setWeeklyActionsByCompetency] = useState<Record<string, string[]>>({});
  const seraTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  useEffect(() => {
    loadCycleData().then(info => {
      loadMonthlyData(info);
      loadOutstandingActions(info?.id ?? null);
      loadPreviousNotes();
    });
  }, [meetingId]);

  useEffect(() => {
    if (hasCycle !== null) {
      loadMonthlyData(cycleInfo);
      loadOutstandingActions();
      loadPreviousNotes();
    }
  }, [currentMonth, employeeId]);

  async function loadCycleData(): Promise<CycleInfo | null> {
    try {
      const { data: meeting } = await supabase
        .from('one_to_one_scheduled_meetings')
        .select('oto_cycle_id')
        .eq('id', meetingId)
        .maybeSingle();

      if (!meeting?.oto_cycle_id) {
        setHasCycle(false);
        return null;
      }

      const { data: cycle } = await supabase
        .from('one_to_one_review_cycles')
        .select('id, description, standard_agenda, review_frequency, duration_minutes, next_review_date')
        .eq('id', meeting.oto_cycle_id)
        .maybeSingle();

      if (!cycle) {
        setHasCycle(false);
        return null;
      }

      const { data: kpis } = await supabase
        .from('one_to_one_cycle_kpis')
        .select('id, kpi_name, target_value, measurement_unit')
        .eq('cycle_id', cycle.id)
        .order('sort_order');

      const info: CycleInfo = { ...cycle, kpis: kpis || [] };
      setCycleInfo(info);
      setHasCycle(true);
      return info;
    } catch (error) {
      console.error('Error loading cycle data:', error);
      setHasCycle(false);
      return null;
    }
  }

  async function loadKPIRunningAverages(resolvedCycleInfo?: CycleInfo | null): Promise<KPIRunningAverage[]> {
    const ci = resolvedCycleInfo ?? cycleInfo;
    try {
      if (!ci || ci.kpis.length === 0) return [];

      const monthStr = format(currentMonth, 'yyyy-MM-dd');
      const nextMonthStr = format(addMonths(currentMonth, 1), 'yyyy-MM-dd');

      const cycleId = ci?.id;
      const { data: allCheckins } = await supabase
        .from('one_to_one_weekly_checkins')
        .select('kpi_discussion, week_starting')
        .eq(cycleId ? 'oto_cycle_id' : 'meeting_id', cycleId || meetingId)
        .eq('employee_id', employeeId)
        .eq('status', 'completed')
        .gte('week_starting', monthStr)
        .lt('week_starting', nextMonthStr)
        .order('week_starting', { ascending: true });

      const kpiAcc: Record<string, { scores: number[]; latestActual: string; latestScore: number; latestComment: string }> = {};
      ci.kpis.forEach(kpi => {
        kpiAcc[kpi.id] = { scores: [], latestActual: '', latestScore: 3, latestComment: '' };
      });

      (allCheckins || []).forEach(c => {
        const discussion = c.kpi_discussion || {};
        Object.entries(discussion).forEach(([kpiId, data]: [string, any]) => {
          if (kpiAcc[kpiId] !== undefined) {
            if (data?.manager_score !== undefined && data.manager_score > 0) {
              kpiAcc[kpiId].scores.push(data.manager_score);
              kpiAcc[kpiId].latestScore = data.manager_score;
            }
            if (data?.actual_value) kpiAcc[kpiId].latestActual = data.actual_value;
            if (data?.manager_comment) kpiAcc[kpiId].latestComment = data.manager_comment;
          }
        });
      });

      return ci.kpis.map(kpi => {
        const acc = kpiAcc[kpi.id];
        const avg = acc.scores.length > 0
          ? parseFloat((acc.scores.reduce((a, b) => a + b, 0) / acc.scores.length).toFixed(2))
          : 0;
        return {
          kpi_id: kpi.id,
          kpi_name: kpi.kpi_name,
          target_value: kpi.target_value,
          measurement_unit: kpi.measurement_unit,
          average_score: avg,
          entry_count: acc.scores.length,
          latest_score: acc.latestScore,
          latest_actual: acc.latestActual,
          latest_comment: acc.latestComment,
        };
      });
    } catch (error) {
      console.error('Error loading KPI averages:', error);
      return [];
    }
  }

  async function loadWeeklyActionsForCompetencies() {
    try {
      const monthStr = format(currentMonth, 'yyyy-MM-dd');
      const nextMonthStr = format(addMonths(currentMonth, 1), 'yyyy-MM-dd');

      const cycleId = cycleInfo?.id;
      const { data: checkins } = await supabase
        .from('one_to_one_weekly_checkins')
        .select('short_term_actions, week_starting')
        .eq(cycleId ? 'oto_cycle_id' : 'meeting_id', cycleId || meetingId)
        .eq('employee_id', employeeId)
        .eq('status', 'completed')
        .gte('week_starting', monthStr)
        .lt('week_starting', nextMonthStr)
        .order('week_starting', { ascending: true });

      if (!checkins || checkins.length === 0) {
        setWeeklyActionsByCompetency({});
        return;
      }

      const allActions: string[] = [];
      checkins.forEach(c => {
        if (Array.isArray(c.short_term_actions)) {
          c.short_term_actions.forEach((a: string) => {
            if (a.trim()) allActions.push(`[Week of ${format(new Date(c.week_starting), 'dd MMM')}] ${a}`);
          });
        }
      });

      setWeeklyActionsByCompetency({ _all: allActions });
    } catch (error) {
      console.error('Error loading weekly actions:', error);
    }
  }

  function getCompetencyFields(competency: any) {
    if (competencyLevel === 'Manager') return {
      evidence_prompt: competency.manager_evidence_prompt,
      what_good_looks_like: competency.manager_what_good_looks_like,
      what_great_looks_like: competency.manager_what_great_looks_like,
    };
    if (competencyLevel === 'Senior Leader') return {
      evidence_prompt: competency.senior_leader_evidence_prompt,
      what_good_looks_like: competency.senior_leader_what_good_looks_like,
      what_great_looks_like: competency.senior_leader_what_great_looks_like,
    };
    return {
      evidence_prompt: competency.employee_evidence_prompt,
      what_good_looks_like: competency.employee_what_good_looks_like,
      what_great_looks_like: competency.employee_what_great_looks_like,
    };
  }

  async function loadValuesCompetencies(): Promise<ValuesRating[]> {
    try {
      const { data: valuesData } = await supabase
        .from('values')
        .select('id, title')
        .eq('is_active', true)
        .order('sort_order');
      if (!valuesData || valuesData.length === 0) return [];

      const ratings: ValuesRating[] = [];
      for (const value of valuesData) {
        const { data: competenciesData } = await supabase
          .from('competencies')
          .select(`
            id, title, competency_statement,
            employee_evidence_prompt, employee_what_good_looks_like, employee_what_great_looks_like,
            manager_evidence_prompt, manager_what_good_looks_like, manager_what_great_looks_like,
            senior_leader_evidence_prompt, senior_leader_what_good_looks_like, senior_leader_what_great_looks_like
          `)
          .eq('value_id', value.id)
          .eq('is_active', true)
          .order('sort_order');
        if (!competenciesData) continue;
        for (const comp of competenciesData) {
          const fields = getCompetencyFields(comp);
          ratings.push({
            value_id: value.id,
            value_title: value.title,
            competency_id: comp.id,
            competency_title: comp.title,
            competency_statement: comp.competency_statement,
            ...fields,
            manager_rating: 3,
            manager_comment: '',
          });
        }
      }
      return ratings;
    } catch (error) {
      console.error('Error loading values competencies:', error);
      return [];
    }
  }

  async function loadMonthlyData(resolvedCycleInfo?: CycleInfo | null) {
    try {
      setLoading(true);
      const monthStr = format(currentMonth, 'yyyy-MM-dd');

      const [kpiAvgs, valuesRatings] = await Promise.all([
        loadKPIRunningAverages(resolvedCycleInfo),
        loadValuesCompetencies(),
        loadWeeklyActionsForCompetencies(),
      ]);
      setKpiAverages(kpiAvgs);

      const { data: existingReview } = await supabase
        .from('one_to_one_monthly_reviews')
        .select('*')
        .eq('meeting_id', meetingId)
        .eq('employee_id', employeeId)
        .eq('review_month', monthStr)
        .maybeSingle();

      if (existingReview) {
        const savedManualKpis = existingReview.manual_kpi_entries || [];
        setManualKpis(savedManualKpis);

        // For active/draft reviews, overlay latest competency text onto saved ratings
        // so edits to prompts/guidance are always reflected. Preserve manager_rating and
        // manager_comment. Completed reviews use their saved snapshot unchanged.
        const isCompleted = existingReview.status === 'submitted' || existingReview.status === 'completed';
        const savedRatings: ValuesRating[] = existingReview.values_ratings || [];
        let mergedRatings: ValuesRating[];
        if (isCompleted || savedRatings.length === 0) {
          mergedRatings = savedRatings.length > 0 ? savedRatings : valuesRatings;
        } else {
          const freshMap = new Map(valuesRatings.map(r => [r.competency_id, r]));
          mergedRatings = savedRatings.map(saved => {
            const fresh = freshMap.get(saved.competency_id);
            if (!fresh) return saved;
            return {
              ...fresh,
              manager_rating: saved.manager_rating,
              manager_comment: saved.manager_comment,
            };
          });
          // Add any new competencies not yet in the saved review
          valuesRatings.forEach(fresh => {
            if (!mergedRatings.find(r => r.competency_id === fresh.competency_id)) {
              mergedRatings.push(fresh);
            }
          });
        }

        setReview({
          ...existingReview,
          kpi_snapshots: existingReview.kpi_snapshots || existingReview.kpi_ratings || {},
          values_ratings: mergedRatings,
          sera_draft_summary: existingReview.sera_draft_summary || '',
          manager_summary: existingReview.manager_summary || '',
          manager_additional_context: existingReview.manager_additional_context || '',
        });
      } else {
        const weeklyKpisWithData = kpiAvgs.filter(k => k.entry_count > 0);
        const overallKpiAvg = weeklyKpisWithData.length > 0
          ? parseFloat((weeklyKpisWithData.reduce((a, b) => a + b.average_score, 0) / weeklyKpisWithData.length).toFixed(2))
          : undefined;

        const kpiSnapshots: Record<string, KPIRunningAverage> = {};
        kpiAvgs.forEach(k => { kpiSnapshots[k.kpi_id] = k; });

        setManualKpis([]);
        setReview({
          review_month: monthStr,
          overall_kpi_average: overallKpiAvg,
          overall_competency_average: undefined,
          kpi_snapshots: kpiSnapshots,
          manual_kpi_entries: [],
          values_ratings: valuesRatings,
          manager_summary: '',
          sera_draft_summary: '',
          manager_additional_context: '',
          requires_moderation: false,
          status: 'draft',
        });
      }
    } catch (error) {
      console.error('Error loading monthly data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadOutstandingActions(resolvedCycleId?: string | null) {
    try {
      const cycleId = resolvedCycleId !== undefined ? resolvedCycleId : cycleInfo?.id;
      let query = supabase
        .from('one_to_one_action_items')
        .select('id, action_text, status, due_date')
        .order('created_at', { ascending: true });

      if (cycleId) {
        query = query.eq('oto_cycle_id', cycleId);
      } else {
        query = query.eq('meeting_id', meetingId);
      }

      const { data } = await query;
      setOutstandingActions(data || []);
      const dateMap: Record<string, string> = {};
      (data || []).forEach((a: OutstandingAction) => { dateMap[a.id] = a.due_date || ''; });
      setActionDueDateEdits(dateMap);
    } catch (error) {
      console.error('Error loading outstanding actions:', error);
    }
  }

  async function loadPreviousNotes() {
    try {
      const { data } = await supabase
        .from('one_to_one_monthly_reviews')
        .select('manager_summary, review_month')
        .eq('meeting_id', meetingId)
        .eq('employee_id', employeeId)
        .lt('review_month', format(currentMonth, 'yyyy-MM-dd'))
        .order('review_month', { ascending: false })
        .limit(3);
      setPreviousNotes(data || []);
    } catch (error) {
      console.error('Error loading previous notes:', error);
    }
  }

  function computeSeraRatingFeedback(rating: number, comment: string): SeraRatingFeedback | null {
    if (!comment || comment.trim().length < 3) return null;
    if (rating === 1) {
      return { type: 'action_required', message: 'Add an action to address this.' };
    }
    if (rating === 3) {
      return isEvidenceWeak(comment)
        ? { type: 'evidence_weak', message: 'Add clearer evidence to show expected standard.' }
        : { type: 'evidence_strong', message: 'Good evidence for an On Target rating.' };
    }
    if (rating === 5) {
      return isEvidenceWeak(comment)
        ? { type: 'evidence_weak', message: 'Add stronger evidence to justify this score.' }
        : { type: 'evidence_strong', message: 'Strong evidence — supports an Exceptional rating.' };
    }
    return null;
  }

  function updateValuesRating(index: number, field: keyof ValuesRating, value: any) {
    setReview(prev => {
      if (!prev) return null;
      const updated = [...prev.values_ratings];
      updated[index] = { ...updated[index], [field]: value };
      const newAvg = updated.length > 0
        ? parseFloat((updated.reduce((a, b) => a + b.manager_rating, 0) / updated.length).toFixed(2))
        : undefined;
      return { ...prev, values_ratings: updated, overall_competency_average: newAvg };
    });

    if (field === 'manager_rating' || field === 'manager_comment') {
      const vr = review?.values_ratings[index];
      if (!vr) return;
      const key = `${vr.value_id}-${vr.competency_id}`;
      if (seraTimers.current[key]) clearTimeout(seraTimers.current[key]);

      const newRating = field === 'manager_rating' ? (value as number) : vr.manager_rating;
      const newComment = field === 'manager_comment' ? (value as string) : vr.manager_comment;

      seraTimers.current[key] = setTimeout(() => {
        const feedback = computeSeraRatingFeedback(newRating, newComment);
        setSeraRatingFeedbacks(prev => ({ ...prev, [key]: feedback }));
      }, field === 'manager_comment' ? 800 : 100);
    }
  }

  async function markActionComplete(actionId: string) {
    try {
      const dueDate = actionDueDateEdits[actionId] ?? outstandingActions.find(a => a.id === actionId)?.due_date ?? null;
      await supabase
        .from('one_to_one_action_items')
        .update({ status: 'closed', due_date: dueDate || null, updated_at: new Date().toISOString() })
        .eq('id', actionId);
      setOutstandingActions(prev =>
        prev.map(a => a.id === actionId ? { ...a, status: 'closed' } : a)
      );
    } catch (error) {
      console.error('Error completing action:', error);
    }
  }

  async function saveActionDueDate(actionId: string, newDueDate: string) {
    try {
      await supabase
        .from('one_to_one_action_items')
        .update({ due_date: newDueDate || null, updated_at: new Date().toISOString() })
        .eq('id', actionId);
    } catch (error) {
      console.error('Error updating action due date:', error);
    }
  }

  function computeKpiAvgForSummary(): { avg: number | undefined; source: 'weekly' | 'manual' | 'none' } {
    const weeklyWithData = kpiAverages.filter(k => k.entry_count > 0);
    if (weeklyWithData.length > 0) {
      const avg = weeklyWithData.reduce((a, b) => a + b.average_score, 0) / weeklyWithData.length;
      return { avg: parseFloat(avg.toFixed(2)), source: 'weekly' };
    }
    const validManual = manualKpis.filter(m => m.kpi_name.trim() && m.score > 0);
    if (validManual.length > 0) {
      const avg = validManual.reduce((a, b) => a + b.score, 0) / validManual.length;
      return { avg: parseFloat(avg.toFixed(2)), source: 'manual' };
    }
    return { avg: undefined, source: 'none' };
  }

  async function generateSeraSummary() {
    if (!review) return;
    setGeneratingSera(true);
    try {
      const competencyLines = review.values_ratings
        .filter(vr => vr.manager_comment.trim())
        .map(vr => `- ${vr.value_title} / ${vr.competency_title} (Rating: ${vr.manager_rating}/5): ${vr.manager_comment}`)
        .join('\n');

      const { avg: kpiAvgVal, source: kpiSource } = computeKpiAvgForSummary();

      const kpiLines = kpiSource === 'weekly'
        ? kpiAverages.map(k => `- ${k.kpi_name}: avg ${k.average_score.toFixed(1)}/5 over ${k.entry_count} entries${k.latest_actual ? `, latest: ${k.latest_actual}${k.measurement_unit ? ` ${k.measurement_unit}` : ''}` : ''}`)
            .join('\n')
        : kpiSource === 'manual'
          ? manualKpis.filter(m => m.kpi_name.trim()).map(m => `- ${m.kpi_name}: score ${m.score}/5${m.actual_value ? `, value: ${m.actual_value}` : ''}${m.comment ? `, note: ${m.comment}` : ''}`)
              .join('\n')
          : '';

      const actionsLines = outstandingActions.map(a => `- ${a.action_text} (${a.status})`).join('\n');
      const newActionsLines = newActions.filter(a => a.action_text.trim()).map(a => `- ${a.action_text} (owner: ${a.owner})`).join('\n');
      const weeklyActions = (weeklyActionsByCompetency._all || []).join('\n');

      const overallCompAvg = review.overall_competency_average;

      const prompt = `Generate a structured monthly 1:1 review summary based on the following data:

REVIEW MONTH: ${format(currentMonth, 'MMMM yyyy')}
COMPETENCY LEVEL: ${competencyLevel}

KPI PERFORMANCE:
${kpiLines || 'No KPI data recorded this month.'}
Overall KPI Average: ${kpiAvgVal !== undefined ? `${kpiAvgVal.toFixed(2)}/5` : 'N/A'}

VALUES & COMPETENCIES:
${competencyLines || 'No competency evidence recorded.'}
Overall Competency Average: ${overallCompAvg !== undefined ? `${overallCompAvg.toFixed(2)}/5` : 'N/A'}

WEEKLY ACTIONS THIS MONTH:
${weeklyActions || 'No weekly actions recorded.'}

OUTSTANDING ACTIONS:
${actionsLines || 'No outstanding actions.'}

NEW ACTIONS AGREED:
${newActionsLines || 'None agreed.'}
${review?.manager_additional_context?.trim() ? `\nANYTHING ELSE / MANAGER ADDITIONAL COMMENTS:\n${review.manager_additional_context}` : ''}
Write a concise, professional summary in this exact structure:
**Summary of Discussion**
[2-3 sentences summarising the overall conversation and focus areas]

**Strengths & Positive Impact**
[Bullet points — specific behaviours and outcomes demonstrated]

**Development Points & Concerns**
[Bullet points — areas needing improvement or support]

**KPI Update**
[Bullet points per KPI — include latest value and running average position]

**Agreed Actions**
[Bullet list of actions with owner]

**Overall Summary**
[1-2 sentences giving the overall performance position for the month]`;

      const { data } = await supabase.functions.invoke('generate-review-summary', {
        body: { prompt, type: 'monthly_1on1_summary' }
      });

      const summary = data?.summary || buildFallbackSummary(kpiLines, competencyLines, actionsLines, newActionsLines, kpiAvgVal, overallCompAvg);
      setReview(prev => prev ? { ...prev, sera_draft_summary: summary, manager_summary: summary } : null);
    } catch (error) {
      console.error('Error generating SERA summary:', error);
      const { avg: kpiAvgVal } = computeKpiAvgForSummary();
      const fallback = buildFallbackSummary('', '', '', '', kpiAvgVal, review.overall_competency_average);
      setReview(prev => prev ? { ...prev, sera_draft_summary: fallback, manager_summary: fallback } : null);
    } finally {
      setGeneratingSera(false);
    }
  }

  function buildFallbackSummary(
    kpiLines: string,
    competencyLines: string,
    actionsLines: string,
    newActionsLines: string,
    overallKpiAvg?: number,
    overallCompAvg?: number
  ): string {
    const month = format(currentMonth, 'MMMM yyyy');
    return `**Summary of Discussion**
Monthly 1:1 review for ${month}. Discussed KPI progress, values & behaviours, and agreed next steps.

**Strengths & Positive Impact**
${competencyLines ? competencyLines.split('\n').filter(l => l.includes('5') || l.includes('3')).slice(0, 3).join('\n') || '- See competency evidence above.' : '- See competency evidence above.'}

**Development Points & Concerns**
${competencyLines ? competencyLines.split('\n').filter(l => l.includes('1')).slice(0, 3).join('\n') || '- No significant concerns noted.' : '- No significant concerns noted.'}

**KPI Update**
${kpiLines || '- No KPI data recorded this month.'}
Overall KPI average: ${overallKpiAvg !== undefined ? `${overallKpiAvg.toFixed(2)}/5` : 'N/A'}

**Agreed Actions**
${newActionsLines || '- No new actions agreed.'}
${actionsLines ? `Outstanding: ${actionsLines}` : ''}

**Overall Summary**
Performance for ${month}. KPI average: ${overallKpiAvg !== undefined ? `${overallKpiAvg.toFixed(2)}/5` : 'N/A'}. Competency average: ${overallCompAvg !== undefined ? `${overallCompAvg.toFixed(2)}/5` : 'N/A'}.`;
  }

  async function saveReview(submitStatus: 'draft' | 'submitted') {
    if (!review) return;
    setSaving(true);
    try {
      const kpiWithAverages: Record<string, KPIRunningAverage> = {};
      kpiAverages.forEach(k => { kpiWithAverages[k.kpi_id] = k; });

      const { avg: kpiAvgVal } = computeKpiAvgForSummary();

      const compScores = review.values_ratings.map(r => r.manager_rating);
      const overallCompAvg = compScores.length > 0
        ? parseFloat((compScores.reduce((a, b) => a + b, 0) / compScores.length).toFixed(2))
        : review.overall_competency_average;

      const requiresModeration = overallCompAvg !== undefined && overallCompAvg >= 4;

      const reviewData: any = {
        meeting_id: meetingId,
        employee_id: employeeId,
        manager_id: profile?.id,
        review_month: review.review_month,
        overall_kpi_average: kpiAvgVal,
        average_kpi_score: kpiAvgVal,
        overall_competency_score: overallCompAvg,
        kpi_snapshots: kpiWithAverages,
        kpi_ratings: kpiWithAverages,
        manual_kpi_entries: manualKpis.filter(m => m.kpi_name.trim()),
        values_ratings: review.values_ratings,
        competency_ratings: [],
        manager_summary: review.manager_summary,
        sera_draft_summary: review.sera_draft_summary,
        manager_additional_context: review.manager_additional_context || '',
        requires_moderation: requiresModeration,
        moderation_status: requiresModeration ? 'pending' : 'approved',
        status: submitStatus,
        submitted_at: submitStatus === 'submitted' ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      };

      if (review.id) {
        const { error } = await supabase
          .from('one_to_one_monthly_reviews')
          .update(reviewData)
          .eq('id', review.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('one_to_one_monthly_reviews')
          .insert(reviewData)
          .select()
          .single();
        if (error) throw error;
        setReview(prev => prev ? { ...prev, id: data.id } : null);
      }

      if (newActions.filter(a => a.action_text.trim() !== '').length > 0) {
        const actionRecords = newActions
          .filter(a => a.action_text.trim() !== '')
          .map(a => ({
            meeting_id: meetingId,
            oto_cycle_id: cycleInfo?.id || null,
            owner_id: a.owner === 'employee' ? employeeId : profile?.id,
            action_text: a.action_text,
            due_date: a.due_date || null,
            status: 'open',
          }));
        await supabase.from('one_to_one_action_items').insert(actionRecords);
        setNewActions([]);
        await loadOutstandingActions();
      }

      setReview(prev => prev ? {
        ...prev,
        status: submitStatus,
        overall_kpi_average: kpiAvgVal,
        overall_competency_average: overallCompAvg,
        requires_moderation: requiresModeration,
      } : null);
    } catch (error) {
      console.error('Error saving review:', error);
    } finally {
      setSaving(false);
    }
  }

  const isSubmitted = review?.status === 'submitted';

  const valueGroups = review
    ? Array.from(new Set(review.values_ratings.map(r => r.value_id))).map(valueId => ({
        valueId,
        valueTitle: review.values_ratings.find(r => r.value_id === valueId)?.value_title || '',
        rows: review.values_ratings.filter(r => r.value_id === valueId),
      }))
    : [];

  const { avg: overallKpiAvgDisplay, source: kpiSource } = computeKpiAvgForSummary();

  const overallCompAvg = review
    ? (review.values_ratings.length > 0
        ? parseFloat((review.values_ratings.reduce((a, b) => a + b.manager_rating, 0) / review.values_ratings.length).toFixed(2))
        : review.overall_competency_average)
    : undefined;

  const moderationWillTrigger = overallCompAvg !== undefined && overallCompAvg >= 4;

  const hasWeeklyKpiData = kpiAverages.some(k => k.entry_count > 0);
  const weeklyActionsAll = weeklyActionsByCompetency._all || [];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            className="p-2 hover:bg-gray-100 rounded-lg text-gray-600"
          >←</button>
          <h3 className="text-xl font-semibold text-gray-900">
            {format(currentMonth, 'MMMM yyyy')} Review
          </h3>
          <button
            onClick={() => { const next = addMonths(currentMonth, 1); if (startOfMonth(next) <= startOfMonth(new Date())) setCurrentMonth(next); }}
            disabled={startOfMonth(addMonths(currentMonth, 1)) > startOfMonth(new Date())}
            className="p-2 hover:bg-gray-100 rounded-lg text-gray-600 disabled:opacity-30"
          >→</button>
        </div>
        <div className="flex items-center gap-2">
          {isSubmitted ? (
            <span className="flex items-center gap-1.5 px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
              <Lock className="w-4 h-4" />
              Submitted
            </span>
          ) : (
            <span className="flex items-center gap-1.5 px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-sm font-medium">
              <Edit3 className="w-3.5 h-3.5" />
              Draft
            </span>
          )}
        </div>
      </div>

      {cycleInfo && (
        <div className="bg-sky-50 border border-sky-200 rounded-xl p-4 space-y-3">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-sky-600 flex-shrink-0" />
              <h4 className="text-sm font-semibold text-sky-900">Review Cycle</h4>
            </div>
            <div className="flex items-center gap-3 text-xs text-sky-700">
              <span className="capitalize font-medium">{cycleInfo.review_frequency}</span>
              <span>·</span>
              <span>{cycleInfo.duration_minutes} min</span>
              {cycleInfo.next_review_date && (
                <>
                  <span>·</span>
                  <span>Next: {format(new Date(cycleInfo.next_review_date), 'dd MMM yyyy')}</span>
                </>
              )}
            </div>
          </div>
          {cycleInfo.description && (
            <p className="text-xs text-sky-800 leading-relaxed">{cycleInfo.description}</p>
          )}
          {cycleInfo.standard_agenda && (
            <div>
              <p className="text-xs font-semibold text-sky-700 mb-1.5">Standard Agenda</p>
              <ol className="space-y-1">
                {cycleInfo.standard_agenda.split('\n').filter((s: string) => s.trim()).map((item: string, i: number) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-sky-800">
                    <span className="font-semibold text-sky-500 flex-shrink-0">{i + 1}.</span>
                    {item}
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      )}

      <div className="border rounded-xl overflow-hidden">
        <button
          onClick={() => setShowWeeklyCheckins(!showWeeklyCheckins)}
          className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-200 transition-colors"
        >
          <div className="flex items-center gap-3">
            <Calendar className="w-5 h-5 text-blue-600" />
            <div className="text-left">
              <p className="font-semibold text-gray-900">Weekly Check-ins</p>
              <p className="text-xs text-gray-600">Update KPI scores and actions weekly — feeds into this review</p>
            </div>
          </div>
          {showWeeklyCheckins ? <ChevronUp className="w-5 h-5 text-gray-500" /> : <ChevronDown className="w-5 h-5 text-gray-500" />}
        </button>
        {showWeeklyCheckins && (
          <div className="p-6 bg-white border-t">
            <WeeklyCheckinsTab
              meetingId={meetingId}
              employeeId={employeeId}
              onCheckinSaved={() => { loadMonthlyData(); }}
            />
          </div>
        )}
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5 text-gray-700" />
            <h4 className="text-base font-semibold text-gray-900">KPI Performance</h4>
          </div>
          {overallKpiAvgDisplay !== undefined && (
            <div className="flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-emerald-600" />
              <span className="text-sm font-semibold text-emerald-700">
                Overall avg: {overallKpiAvgDisplay.toFixed(2)} / 5
                {kpiSource === 'weekly' && <span className="text-xs font-normal text-gray-500 ml-1">(from weekly check-ins)</span>}
                {kpiSource === 'manual' && <span className="text-xs font-normal text-gray-500 ml-1">(manual entry)</span>}
              </span>
            </div>
          )}
        </div>

        {hasWeeklyKpiData ? (
          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">KPI</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Target</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Latest Value</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Latest Score</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Running Avg</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Entries</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Latest Note</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {kpiAverages.map(kpi => {
                  const latestScoreInfo = KPI_SCORE_LABELS[kpi.latest_score] || KPI_SCORE_LABELS[3];
                  const avgScoreInfo = KPI_SCORE_LABELS[Math.round(kpi.average_score)] || KPI_SCORE_LABELS[3];
                  return (
                    <tr key={kpi.kpi_id} className="hover:bg-gray-50/50">
                      <td className="px-4 py-3">
                        <p className="font-semibold text-gray-900 text-xs">{kpi.kpi_name}</p>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {kpi.target_value}{kpi.measurement_unit ? ` ${kpi.measurement_unit}` : ''}
                      </td>
                      <td className="px-4 py-3 text-xs font-medium text-gray-700">
                        {kpi.latest_actual || '—'}
                      </td>
                      <td className="px-4 py-3">
                        {kpi.entry_count > 0 ? (
                          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${latestScoreInfo.bg} ${latestScoreInfo.border} ${latestScoreInfo.color}`}>
                            {kpi.latest_score}
                          </span>
                        ) : <span className="text-xs text-gray-400">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        {kpi.entry_count > 0 ? (
                          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${avgScoreInfo.bg} ${avgScoreInfo.border} ${avgScoreInfo.color}`}>
                            {kpi.average_score.toFixed(1)}
                          </span>
                        ) : <span className="text-xs text-gray-400">No data</span>}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">{kpi.entry_count}</td>
                      <td className="px-4 py-3 text-xs text-gray-500 max-w-xs truncate">
                        {kpi.latest_comment || '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              {overallKpiAvgDisplay !== undefined && (
                <tfoot>
                  <tr className="bg-emerald-50 border-t-2 border-emerald-200">
                    <td colSpan={4} className="px-4 py-2.5 text-xs font-bold text-emerald-800">Overall KPI Average</td>
                    <td className="px-4 py-2.5">
                      <span className="text-sm font-bold text-emerald-700">{overallKpiAvgDisplay.toFixed(2)} / 5</span>
                    </td>
                    <td colSpan={2} />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        ) : cycleInfo ? (
          <div className="space-y-3">
            <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl">
              <p className="text-xs text-gray-500 mb-3">No weekly check-ins recorded this month. You can add KPI entries manually below, or use the Weekly Check-ins section above.</p>
              <div className="space-y-2">
                {cycleInfo.kpis.map((kpi, i) => {
                  const entry = manualKpis.find(m => m.kpi_name === kpi.kpi_name) || {
                    kpi_name: kpi.kpi_name, actual_value: '', score: 3, comment: ''
                  };
                  const entryIndex = manualKpis.findIndex(m => m.kpi_name === kpi.kpi_name);
                  return (
                    <div key={i} className="bg-white border border-gray-200 rounded-lg p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold text-gray-800">{kpi.kpi_name}</p>
                        <span className="text-xs text-gray-400">Target: {kpi.target_value}{kpi.measurement_unit ? ` ${kpi.measurement_unit}` : ''}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={entry.actual_value}
                          onChange={e => {
                            const val = e.target.value;
                            setManualKpis(prev => {
                              const updated = [...prev];
                              if (entryIndex >= 0) { updated[entryIndex] = { ...updated[entryIndex], actual_value: val }; }
                              else updated.push({ kpi_name: kpi.kpi_name, actual_value: val, score: 3, comment: '' });
                              return updated;
                            });
                          }}
                          placeholder="Actual value"
                          className="px-2 py-1.5 border rounded-lg text-xs focus:ring-2 focus:ring-blue-500"
                          disabled={isSubmitted}
                        />
                        <select
                          value={entry.score}
                          onChange={e => {
                            const val = parseInt(e.target.value);
                            setManualKpis(prev => {
                              const updated = [...prev];
                              if (entryIndex >= 0) { updated[entryIndex] = { ...updated[entryIndex], score: val }; }
                              else updated.push({ kpi_name: kpi.kpi_name, actual_value: '', score: val, comment: '' });
                              return updated;
                            });
                          }}
                          className="px-2 py-1.5 border rounded-lg text-xs focus:ring-2 focus:ring-blue-500"
                          disabled={isSubmitted}
                        >
                          {Object.entries(KPI_SCORE_LABELS).map(([s, info]) => (
                            <option key={s} value={s}>{s} — {info.label}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-gray-500">No review cycle linked. Add KPIs manually for this review.</p>
                {!isSubmitted && (
                  <button
                    onClick={() => setManualKpis(prev => [...prev, { kpi_name: '', actual_value: '', score: 3, comment: '' }])}
                    className="flex items-center gap-1 text-xs text-blue-600 hover:bg-blue-50 px-2 py-1 rounded-lg"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add KPI
                  </button>
                )}
              </div>
              {manualKpis.map((kpi, i) => (
                <div key={i} className="flex items-center gap-2 mt-2">
                  <input
                    type="text"
                    value={kpi.kpi_name}
                    onChange={e => setManualKpis(prev => { const u = [...prev]; u[i].kpi_name = e.target.value; return u; })}
                    placeholder="KPI name"
                    className="flex-1 px-2 py-1.5 border rounded-lg text-xs focus:ring-2 focus:ring-blue-500"
                    disabled={isSubmitted}
                  />
                  <input
                    type="text"
                    value={kpi.actual_value}
                    onChange={e => setManualKpis(prev => { const u = [...prev]; u[i].actual_value = e.target.value; return u; })}
                    placeholder="Actual"
                    className="w-24 px-2 py-1.5 border rounded-lg text-xs focus:ring-2 focus:ring-blue-500"
                    disabled={isSubmitted}
                  />
                  <select
                    value={kpi.score}
                    onChange={e => setManualKpis(prev => { const u = [...prev]; u[i].score = parseInt(e.target.value); return u; })}
                    className="w-32 px-2 py-1.5 border rounded-lg text-xs focus:ring-2 focus:ring-blue-500"
                    disabled={isSubmitted}
                  >
                    {Object.entries(KPI_SCORE_LABELS).map(([s, info]) => (
                      <option key={s} value={s}>{s} — {info.label}</option>
                    ))}
                  </select>
                  {!isSubmitted && (
                    <button onClick={() => setManualKpis(prev => prev.filter((_, idx) => idx !== i))} className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
              {manualKpis.length === 0 && (
                <p className="text-xs text-gray-400 text-center py-2">No KPIs added. Click "Add KPI" to start.</p>
              )}
            </div>
          </div>
        )}
      </div>

      {outstandingActions.length > 0 && (
        <div>
          <h4 className="text-base font-semibold text-gray-900 mb-3">Actions</h4>
          <div className="space-y-2">
            {outstandingActions.map(action => {
              const isDone = action.status === 'closed';
              const currentDueDate = actionDueDateEdits[action.id] ?? action.due_date ?? '';
              const isOverdue = !isDone && currentDueDate && new Date(currentDueDate) < new Date();
              return (
                <div
                  key={action.id}
                  className={`flex items-start gap-3 p-3 border rounded-lg ${
                    isDone
                      ? 'bg-green-50 border-green-200'
                      : isOverdue
                      ? 'bg-red-50 border-red-200'
                      : 'bg-amber-50 border-amber-200'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isDone}
                    disabled={isDone || isSubmitted}
                    onChange={() => !isDone && !isSubmitted && markActionComplete(action.id)}
                    className="w-4 h-4 rounded border-gray-300 text-green-600 focus:ring-green-500 flex-shrink-0 mt-0.5 cursor-pointer disabled:cursor-default"
                  />
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <p className={`text-sm font-medium leading-snug ${isDone ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                      {action.action_text}
                    </p>
                    {isDone ? (
                      currentDueDate ? (
                        <p className="text-xs text-gray-400">Due: {format(new Date(currentDueDate), 'dd MMM yyyy')}</p>
                      ) : null
                    ) : (
                      <div className="flex items-center gap-2">
                        <label className="text-xs text-gray-500 flex-shrink-0">Due date:</label>
                        <input
                          type="date"
                          value={currentDueDate}
                          disabled={isSubmitted}
                          onChange={e => {
                            const val = e.target.value;
                            setActionDueDateEdits(prev => ({ ...prev, [action.id]: val }));
                            if (!isSubmitted) saveActionDueDate(action.id, val);
                          }}
                          className={`px-2 py-1 border rounded text-xs focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 ${
                            isOverdue ? 'border-red-300 text-red-700' : 'border-gray-300'
                          }`}
                        />
                        {isOverdue && (
                          <span className="text-xs text-red-600 font-medium">Overdue</span>
                        )}
                      </div>
                    )}
                  </div>
                  <span className={`text-xs font-medium flex-shrink-0 mt-0.5 ${isDone ? 'text-green-600' : isOverdue ? 'text-red-600' : 'text-amber-700'}`}>
                    {isDone ? 'Complete' : 'Open'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {previousNotes.length > 0 && (
        <div className="border rounded-xl overflow-hidden">
          <button
            onClick={() => setShowPreviousNotes(!showPreviousNotes)}
            className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
          >
            <p className="text-sm font-semibold text-gray-700">Previous month notes</p>
            {showPreviousNotes ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
          </button>
          {showPreviousNotes && (
            <div className="p-4 space-y-3 border-t">
              {previousNotes.map((note, i) => (
                <div key={i} className="text-sm">
                  <p className="font-medium text-gray-700">{format(new Date(note.review_month), 'MMMM yyyy')}</p>
                  <p className="text-gray-600 mt-1 whitespace-pre-line">{note.manager_summary || 'No summary recorded.'}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-gray-700" />
            <h4 className="text-base font-semibold text-gray-900">Values & Behaviours</h4>
          </div>
          <div className="flex items-center gap-3">
            {overallCompAvg !== undefined && (
              <span className="text-sm font-semibold text-blue-700">
                Avg: {overallCompAvg.toFixed(2)} / 5
              </span>
            )}
            <span className="text-xs bg-blue-50 text-blue-600 border border-blue-200 px-2.5 py-1 rounded-full font-medium">
              {competencyLevel} level
            </span>
          </div>
        </div>

        <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-xl mb-4 text-xs text-blue-800">
          <Info className="w-3.5 h-3.5 text-blue-500 flex-shrink-0 mt-0.5" />
          <span>Scores contributing to an average of 4 or above will go to moderation for review.</span>
        </div>

        {moderationWillTrigger && (
          <div className="flex items-start gap-2 p-3 bg-orange-50 border border-orange-200 rounded-xl mb-4 text-xs text-orange-800">
            <AlertCircle className="w-3.5 h-3.5 text-orange-500 flex-shrink-0 mt-0.5" />
            <span>Current competency average is <strong>{overallCompAvg?.toFixed(2)}</strong> — this review will go to moderation on submission.</span>
          </div>
        )}

        {review && review.values_ratings.length === 0 ? (
          <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-500">
            No competencies found. Please add competencies in the Admin Competency Framework settings.
          </div>
        ) : review && (
          <div className="space-y-8">
            {valueGroups.map(({ valueId, valueTitle, rows }) => (
              <div key={valueId}>
                <h5 className="text-sm font-bold text-gray-800 mb-3 pb-2 border-b border-gray-200">{valueTitle}</h5>
                <div className="overflow-x-auto rounded-xl border border-gray-200">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 w-1/4">Competency Statement</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 w-2/5">Question</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 w-24">Rating</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Evidence</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {rows.map(vr => {
                        const overallIndex = review.values_ratings.findIndex(
                          r => r.value_id === vr.value_id && r.competency_id === vr.competency_id
                        );
                        const feedbackKey = `${vr.value_id}-${vr.competency_id}`;
                        const seraFeedback = seraRatingFeedbacks[feedbackKey];
                        return (
                          <tr key={vr.competency_id} className="align-top hover:bg-gray-50/50">
                            <td className="px-4 py-4">
                              <p className="font-semibold text-gray-900 text-xs leading-snug">{vr.competency_title}</p>
                              {vr.competency_statement && (
                                <p className="text-xs text-gray-500 mt-1 leading-relaxed">{vr.competency_statement}</p>
                              )}
                            </td>
                            <td className="px-4 py-4">
                              <p className="text-xs text-gray-700 leading-relaxed">
                                {vr.evidence_prompt || 'Describe observed behaviours and examples for this competency.'}
                              </p>
                            </td>
                            <td className="px-4 py-4">
                              <select
                                value={vr.manager_rating}
                                onChange={e => updateValuesRating(overallIndex, 'manager_rating', parseInt(e.target.value))}
                                disabled={isSubmitted}
                                className={`w-full px-2 py-1.5 border rounded-lg text-xs font-semibold focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 ${
                                  vr.manager_rating === 1 ? 'text-red-700 border-red-300 bg-red-50' :
                                  vr.manager_rating === 5 ? 'text-emerald-700 border-emerald-300 bg-emerald-50' :
                                  'text-blue-700 border-blue-300 bg-blue-50'
                                }`}
                              >
                                {COMPETENCY_RATING_OPTIONS.map(opt => (
                                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                              </select>
                            </td>
                            <td className="px-4 py-4">
                              <textarea
                                value={vr.manager_comment}
                                onChange={e => updateValuesRating(overallIndex, 'manager_comment', e.target.value)}
                                disabled={isSubmitted}
                                rows={3}
                                required
                                placeholder="Enter evidence and examples..."
                                className="w-full px-3 py-2 border rounded-lg text-xs focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 resize-none"
                              />
                              {seraFeedback && (
                                <SeraRatingBanner
                                  feedback={seraFeedback}
                                  onDismiss={() => setSeraRatingFeedbacks(prev => ({ ...prev, [feedbackKey]: null }))}
                                />
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {weeklyActionsAll.length > 0 && (
        <div>
          <h4 className="text-base font-semibold text-gray-900 mb-3">Weekly Actions This Month</h4>
          <div className="space-y-1.5">
            {weeklyActionsAll.map((action, i) => (
              <div key={i} className="flex items-start gap-2 p-2.5 bg-blue-50 border border-blue-100 rounded-lg">
                <CheckCircle className="w-3.5 h-3.5 text-blue-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-gray-700">{action}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {outstandingActions.length === 0 && weeklyActionsAll.length === 0 && (
        <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-400 text-center">
          No actions recorded yet.
        </div>
      )}

      <div>
        <h4 className="text-base font-semibold text-gray-900 mb-4">Skills & Competencies Matrix</h4>
        <SkillsMatrixPanel
          employeeId={employeeId}
          monthlyReviewId={review?.id}
          isManager={true}
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-base font-semibold text-gray-900">Actions</h4>
          {!isSubmitted && (
            <button
              onClick={() => setNewActions(prev => [...prev, { action_text: '', owner: 'employee', due_date: '' }])}
              className="flex items-center gap-1.5 text-sm text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-lg"
            >
              <Plus className="w-4 h-4" />
              Add action
            </button>
          )}
        </div>
        <div className="space-y-3">
          {newActions.map((action, index) => (
            <div key={index} className="border rounded-xl p-3 space-y-2">
              <input
                type="text"
                value={action.action_text}
                onChange={e => setNewActions(prev => { const u = [...prev]; u[index].action_text = e.target.value; return u; })}
                placeholder="Describe the action..."
                className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
              />
              <div className="flex items-center gap-2">
                <select
                  value={action.owner}
                  onChange={e => setNewActions(prev => { const u = [...prev]; u[index].owner = e.target.value as 'employee' | 'manager'; return u; })}
                  className="flex-1 px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                >
                  <option value="employee">Employee</option>
                  <option value="manager">Manager</option>
                </select>
                <input
                  type="date"
                  value={action.due_date}
                  onChange={e => setNewActions(prev => { const u = [...prev]; u[index].due_date = e.target.value; return u; })}
                  className="flex-1 px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={() => setNewActions(prev => prev.filter((_, i) => i !== index))}
                  className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {!isSubmitted && (
        <div className="border border-amber-200 rounded-xl bg-amber-50 p-4 space-y-2">
          <p className="text-sm font-semibold text-amber-900">Anything else to add before generating the summary?</p>
          <p className="text-xs text-amber-700">Add any additional context, observations, or notes here — this will be included when generating the review summary.</p>
          <textarea
            value={review?.manager_additional_context || ''}
            onChange={e => setReview(prev => prev ? { ...prev, manager_additional_context: e.target.value } : null)}
            rows={3}
            placeholder="e.g. team situation, personal circumstances, wider context relevant to this review period..."
            className="w-full px-3 py-2 border border-amber-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-400 focus:outline-none resize-none bg-white"
          />
        </div>
      )}
      {isSubmitted && review?.manager_additional_context && (
        <div className="border border-amber-200 rounded-xl bg-amber-50 p-4">
          <p className="text-xs font-semibold text-amber-800 mb-1">Additional comments</p>
          <p className="text-sm text-amber-900 whitespace-pre-wrap">{review.manager_additional_context}</p>
        </div>
      )}

      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-blue-600" />
            <h4 className="text-base font-semibold text-gray-900">Manager Summary</h4>
            <span className="text-xs text-gray-400">(SERA-assisted, editable)</span>
          </div>
          {!isSubmitted && (
            <button
              onClick={generateSeraSummary}
              disabled={generatingSera}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {generatingSera ? (
                <><RefreshCw className="w-4 h-4 animate-spin" /> Generating...</>
              ) : (
                <><FileText className="w-4 h-4" /> {review?.sera_draft_summary ? 'Regenerate' : 'Generate'} Summary</>
              )}
            </button>
          )}
        </div>
        <div className="p-4">
          {!review?.manager_summary && !review?.sera_draft_summary && (
            <div className="py-6 text-center text-gray-400 text-sm mb-4">
              <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p>Click "Generate Summary" to create an AI-assisted draft using KPI data, competency ratings, and actions. You can then edit it before submitting.</p>
            </div>
          )}
          <textarea
            value={review?.manager_summary || ''}
            onChange={e => setReview(prev => prev ? { ...prev, manager_summary: e.target.value, sera_draft_summary: e.target.value } : null)}
            disabled={isSubmitted}
            rows={review?.manager_summary ? 14 : 4}
            placeholder="Generate a summary above, or type directly here..."
            className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 resize-none text-sm font-mono"
          />
        </div>
      </div>

      {!isSubmitted && (
        <div className="flex justify-end gap-3 pt-4 border-t">
          <button
            onClick={() => saveReview('draft')}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg border disabled:opacity-50 text-sm"
          >
            <Save className="w-4 h-4" />
            Save draft
          </button>
          <button
            onClick={() => saveReview('submitted')}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
          >
            <Send className="w-4 h-4" />
            {saving ? 'Submitting...' : 'Submit review'}
          </button>
        </div>
      )}
    </div>
  );
}
