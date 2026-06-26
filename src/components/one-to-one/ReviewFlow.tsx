import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import {
  BarChart2, Award, BookOpen, MessageSquare, CheckCircle,
  ChevronRight, ChevronLeft, Target, Plus, Trash2,
  Save, Send, Sparkles, RefreshCw, FileText, AlertCircle,
  Info, X, TrendingUp, Clock, ArrowRight, SkipForward
} from 'lucide-react';
import { format, startOfMonth } from 'date-fns';
import SkillsMatrixPanel from '../skills-matrix/SkillsMatrixPanel';

interface ReviewFlowProps {
  meetingId: string;
  employeeId: string;
  competencyLevel?: string;
  onBack: () => void;
  onSubmitted?: () => void;
  previousWeeklySummaries?: WeeklySummary[];
  reviewMonth?: string; // yyyy-MM-dd, defaults to current month
  readOnly?: boolean;
}

interface WeeklySummary {
  week_starting: string;
  week_number: number;
  performance_score: number;
  kpi_discussion: Record<string, any>;
  short_term_actions: string[];
  summary: string;
  status: string;
}

interface CycleKPI {
  id: string;
  kpi_name: string;
  target_value: string;
  measurement_unit: string;
}

interface KPIEntry {
  kpi_id: string;
  kpi_name: string;
  target_value: string;
  measurement_unit: string;
  weekly_avg?: number;
  weekly_entry_count?: number;
  manual_score: number;
  manual_actual: string;
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
  employee_comment?: string;
}

interface ActionItem {
  action_text: string;
  owner: 'employee' | 'manager';
  due_date: string;
  is_carryover?: boolean;
  source_id?: string;
  status?: 'open' | 'in_progress' | 'closed';
}

interface MonthlyReview {
  id?: string;
  review_month: string;
  kpi_entries: KPIEntry[];
  overall_kpi_average?: number;
  values_ratings: ValuesRating[];
  overall_competency_average?: number;
  overall_average?: number;
  manager_summary: string;
  sera_draft_summary: string;
  manager_additional_context: string;
  employee_overall_comment?: string;
  requires_moderation: boolean;
  status: string;
  submitted_at?: string | null;
}

interface SeraFeedback {
  type: 'loading' | 'great' | 'warn' | 'error' | 'ok';
  message: string;
}

const SCORE_LABELS: Record<number, { label: string; color: string; bg: string; border: string }> = {
  0: { label: 'New to role', color: 'text-gray-700', bg: 'bg-gray-50', border: 'border-gray-300' },
  1: { label: 'Development needed', color: 'text-red-700', bg: 'bg-red-50', border: 'border-red-300' },
  2: { label: 'Requires guidance', color: 'text-orange-700', bg: 'bg-orange-50', border: 'border-orange-300' },
  3: { label: 'On target', color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-300' },
  4: { label: 'Exceeding', color: 'text-green-700', bg: 'bg-green-50', border: 'border-green-300' },
  5: { label: 'Exceptional', color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-300' },
};

const COMPETENCY_OPTIONS = [
  { value: 0, label: '— Select rating —' },
  { value: 1, label: '1 — Development Needed' },
  { value: 3, label: '3 — On Target' },
  { value: 5, label: '5 — Exceptional' },
];

function computeSeraFeedback(_rating: number, _comment: string): SeraFeedback | null {
  return null;
}

const STEPS = [
  { id: 1, label: 'Performance', icon: BarChart2 },
  { id: 2, label: 'Competencies', icon: Award },
  { id: 3, label: 'Skills & Dev', icon: BookOpen },
  { id: 4, label: 'Actions & Comments', icon: MessageSquare },
  { id: 5, label: 'Submit', icon: CheckCircle },
];

export default function ReviewFlow({
  meetingId,
  employeeId,
  competencyLevel = 'Employee',
  onBack,
  onSubmitted,
  previousWeeklySummaries = [],
  reviewMonth,
  readOnly = false,
}: ReviewFlowProps) {
  const { profile, isViewingAs, guardViewAs } = useAuth();
  const currentMonth = reviewMonth ? startOfMonth(new Date(reviewMonth + 'T12:00:00')) : startOfMonth(new Date());
  const [step, setStep] = useState(1);
  const [review, setReview] = useState<MonthlyReview | null>(null);
  const [cycleKPIs, setCycleKPIs] = useState<CycleKPI[]>([]);
  const [hasCycle, setHasCycle] = useState<boolean | null>(null);
  const [kpiEntries, setKpiEntries] = useState<KPIEntry[]>([]);
  const [valuesRatings, setValuesRatings] = useState<ValuesRating[]>([]);
  const [carryoverActions, setCarryoverActions] = useState<ActionItem[]>([]);
  const [newActions, setNewActions] = useState<ActionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generatingSera, setGeneratingSera] = useState(false);
  const [skipSkills, setSkipSkills] = useState(false);
  const [seraFeedbacks, setSeraFeedbacks] = useState<Record<string, SeraFeedback | null>>({});
  const [showPrevSummaries, setShowPrevSummaries] = useState(false);
  const [showConfirmSubmit, setShowConfirmSubmit] = useState(false);
  const seraTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const [seraSystemPrompt, setSeraSystemPrompt] = useState<string | null>(null);
  const [employeeFullName, setEmployeeFullName] = useState<string>('Employee');

  function mergeCompetencyText(saved: ValuesRating[], fresh: ValuesRating[]): ValuesRating[] {
    if (saved.length === 0) return fresh;
    const freshMap = new Map(fresh.map(r => [r.competency_id, r]));
    const merged = saved.map(s => {
      const f = freshMap.get(s.competency_id);
      if (!f) return s;
      return {
        ...f,
        manager_rating: s.manager_rating,
        manager_comment: s.manager_comment,
        employee_comment: s.employee_comment,
      };
    });
    fresh.forEach(f => {
      if (!merged.find(r => r.competency_id === f.competency_id)) merged.push(f);
    });
    return merged;
  }

  useEffect(() => {
    init();
  }, [meetingId, employeeId]);

  async function init() {
    setLoading(true);
    const ci = await loadCycleKPIs();
    const [, freshRatings] = await Promise.all([
      loadExistingReview(ci),
      loadValuesCompetencies(),
      loadCarryoverActions(),
    ]);
    // Overlay latest competency text onto any saved draft ratings (completed reviews are
    // left unchanged by mergeCompetencyText which checks review.status).
    if (freshRatings.length > 0) {
      setValuesRatings(prev => mergeCompetencyText(prev, freshRatings));
      setReview(prev => prev && prev.status !== 'completed' && prev.status !== 'submitted'
        ? { ...prev, values_ratings: mergeCompetencyText(prev.values_ratings, freshRatings) }
        : prev);
    }

    // Load SERA system prompt
    supabase.from('copilot_config').select('config_data').eq('is_active', true).maybeSingle().then(({ data }) => {
      if (data?.config_data?.system_prompt) setSeraSystemPrompt(data.config_data.system_prompt);
    });

    // Load employee name
    supabase.from('profiles').select('full_name').eq('id', employeeId).maybeSingle().then(({ data }) => {
      if (data?.full_name) setEmployeeFullName(data.full_name);
    });

    setLoading(false);
  }

  async function loadCycleKPIs(): Promise<CycleKPI[]> {
    try {
      const { data: meeting } = await supabase
        .from('one_to_one_scheduled_meetings')
        .select('oto_cycle_id')
        .eq('id', meetingId)
        .maybeSingle();

      if (!meeting?.oto_cycle_id) { setHasCycle(false); return []; }

      const { data: kpis } = await supabase
        .from('one_to_one_cycle_kpis')
        .select('id, kpi_name, target_value, measurement_unit')
        .eq('cycle_id', meeting.oto_cycle_id)
        .order('sort_order');

      const result = kpis || [];
      setCycleKPIs(result);
      setHasCycle(result.length > 0);
      return result;
    } catch {
      setHasCycle(false);
      return [];
    }
  }

  async function loadKPIWeeklyAverages(kpis: CycleKPI[]): Promise<Record<string, { avg: number; count: number }>> {
    if (!kpis.length) return {};
    try {
      const { data: checkins } = await supabase
        .from('one_to_one_weekly_checkins')
        .select('kpi_discussion')
        .eq('meeting_id', meetingId)
        .eq('employee_id', employeeId)
        .order('week_starting', { ascending: true });

      const acc: Record<string, number[]> = {};
      kpis.forEach(k => { acc[k.id] = []; });
      (checkins || []).forEach(c => {
        Object.entries(c.kpi_discussion || {}).forEach(([kpiId, d]: [string, any]) => {
          if (acc[kpiId] !== undefined && d?.manager_score > 0) acc[kpiId].push(d.manager_score);
        });
      });
      const result: Record<string, { avg: number; count: number }> = {};
      Object.entries(acc).forEach(([id, scores]) => {
        result[id] = scores.length > 0
          ? { avg: parseFloat((scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2)), count: scores.length }
          : { avg: 0, count: 0 };
      });
      return result;
    } catch { return {}; }
  }

  async function loadExistingReview(kpis: CycleKPI[]) {
    const monthStr = format(currentMonth, 'yyyy-MM-dd');
    const weeklyAvgs = await loadKPIWeeklyAverages(kpis);

    const buildKPIEntries = (kpiList: CycleKPI[], savedEntries?: any[]): KPIEntry[] =>
      kpiList.map(k => {
        const saved = savedEntries?.find((e: any) => e.kpi_id === k.id);
        const wa = weeklyAvgs[k.id];
        return {
          kpi_id: k.id,
          kpi_name: k.kpi_name,
          target_value: k.target_value,
          measurement_unit: k.measurement_unit,
          weekly_avg: wa?.count ? wa.avg : undefined,
          weekly_entry_count: wa?.count || 0,
          manual_score: saved?.manual_score ?? 0,
          manual_actual: saved?.manual_actual ?? '',
          comment: saved?.comment ?? '',
        };
      });

    try {
      const { data: existingReview } = await supabase
        .from('one_to_one_monthly_reviews')
        .select('*')
        .eq('meeting_id', meetingId)
        .eq('employee_id', employeeId)
        .eq('review_month', monthStr)
        .maybeSingle();

      if (existingReview) {
        // Saved KPI data lives in manual_kpi_entries (keyed by kpi_name).
        // Build a lookup that buildKPIEntries can use via the e.kpi_id === k.id
        // path by normalising manual_kpi_entries into the same shape it expects.
        const savedFromManual: any[] = (existingReview.manual_kpi_entries || []).map((e: any) => ({
          kpi_id: e.kpi_name, // cycle KPI ids won't match, but kpi_name fallback below handles it
          kpi_name: e.kpi_name,
          manual_score: e.score ?? 0,
          manual_actual: e.actual_value ?? '',
          comment: e.comment ?? '',
        }));

        const buildKPIEntriesWithFallback = (kpiList: CycleKPI[]): KPIEntry[] =>
          kpiList.map(k => {
            // Try id match first (future-proof), then name match against manual_kpi_entries
            const byId = savedFromManual.find((e: any) => e.kpi_id === k.id);
            const byName = savedFromManual.find((e: any) => e.kpi_name === k.kpi_name);
            const saved = byId || byName;
            const wa = weeklyAvgs[k.id];
            return {
              kpi_id: k.id,
              kpi_name: k.kpi_name,
              target_value: k.target_value,
              measurement_unit: k.measurement_unit,
              weekly_avg: wa?.count ? wa.avg : undefined,
              weekly_entry_count: wa?.count || 0,
              manual_score: saved?.manual_score ?? 0,
              manual_actual: saved?.manual_actual ?? '',
              comment: saved?.comment ?? '',
            };
          });

        const entries = kpis.length > 0
          ? buildKPIEntriesWithFallback(kpis)
          : (existingReview.manual_kpi_entries || []).map((e: any) => ({
              kpi_id: e.kpi_name,
              kpi_name: e.kpi_name,
              target_value: '',
              measurement_unit: '',
              weekly_avg: undefined,
              weekly_entry_count: 0,
              manual_score: e.score || 0,
              manual_actual: e.actual_value || '',
              comment: e.comment || '',
            }));
        setKpiEntries(entries);
        if (existingReview.values_ratings?.length > 0) setValuesRatings(existingReview.values_ratings);
        setReview({
          id: existingReview.id,
          review_month: monthStr,
          kpi_entries: entries,
          overall_kpi_average: existingReview.overall_kpi_average,
          values_ratings: existingReview.values_ratings || [],
          overall_competency_average: existingReview.overall_competency_score,
          overall_average: existingReview.overall_average,
          manager_summary: existingReview.manager_summary || '',
          sera_draft_summary: existingReview.sera_draft_summary || '',
          manager_additional_context: existingReview.manager_additional_context || '',
          employee_overall_comment: existingReview.employee_overall_comment || '',
          requires_moderation: existingReview.requires_moderation || false,
          status: existingReview.status || 'draft',
          submitted_at: existingReview.submitted_at || null,
        });
      } else {
        const entries = buildKPIEntries(kpis);
        setKpiEntries(entries);
        setReview({
          review_month: monthStr,
          kpi_entries: entries,
          values_ratings: [],
          manager_summary: '',
          sera_draft_summary: '',
          manager_additional_context: '',
          employee_overall_comment: '',
          requires_moderation: false,
          status: 'draft',
        });
      }
    } catch (e) {
      console.error('loadExistingReview', e);
    }
  }

  async function loadValuesCompetencies(): Promise<ValuesRating[]> {
    try {
      const { data: vals } = await supabase
        .from('values')
        .select('id, title')
        .eq('is_active', true)
        .order('sort_order');
      if (!vals?.length) return [];
      const ratings: ValuesRating[] = [];
      for (const v of vals) {
        const { data: comps } = await supabase
          .from('competencies')
          .select(`id, title, competency_statement,
            employee_evidence_prompt, employee_what_good_looks_like, employee_what_great_looks_like,
            manager_evidence_prompt, manager_what_good_looks_like, manager_what_great_looks_like,
            senior_leader_evidence_prompt, senior_leader_what_good_looks_like, senior_leader_what_great_looks_like`)
          .eq('value_id', v.id)
          .eq('is_active', true)
          .order('sort_order');
        (comps || []).forEach(c => {
          const isManager = competencyLevel === 'Manager';
          const isSL = competencyLevel === 'Senior Leader';
          ratings.push({
            value_id: v.id,
            value_title: v.title,
            competency_id: c.id,
            competency_title: c.title,
            competency_statement: c.competency_statement,
            evidence_prompt: isManager ? c.manager_evidence_prompt : isSL ? c.senior_leader_evidence_prompt : c.employee_evidence_prompt,
            what_good_looks_like: isManager ? c.manager_what_good_looks_like : isSL ? c.senior_leader_what_good_looks_like : c.employee_what_good_looks_like,
            what_great_looks_like: isManager ? c.manager_what_great_looks_like : isSL ? c.senior_leader_what_great_looks_like : c.employee_what_great_looks_like,
            manager_rating: 0,
            manager_comment: '',
          });
        });
      }
      return ratings;
    } catch (e) {
      console.error('loadValuesCompetencies', e);
      return [];
    }
  }

  async function loadCarryoverActions() {
    try {
      const query = supabase
        .from('one_to_one_action_items')
        .select('id, action_text, status, due_date, owner_id')
        .eq('meeting_id', meetingId)
        .order('created_at', { ascending: false });
      // When viewing a past review in read-only mode load all actions for that review;
      // when starting/editing a review load only open/in_progress so completed stay in history only.
      if (!readOnly) {
        query.in('status', ['open', 'in_progress']);
      }
      const { data } = await query;
      setCarryoverActions((data || []).map(a => ({
        action_text: a.action_text,
        owner: 'employee',
        due_date: a.due_date || '',
        is_carryover: true,
        source_id: a.id,
        status: a.status as 'open' | 'in_progress' | 'closed',
      })));
    } catch (e) {
      console.error('loadCarryoverActions', e);
    }
  }

  function computeKpiAvg(): number | undefined {
    const withWeekly = kpiEntries.filter(k => (k.weekly_entry_count ?? 0) > 0);
    if (withWeekly.length > 0) {
      const total = withWeekly.reduce((a, b) => a + (b.weekly_avg ?? 0), 0);
      return parseFloat((total / withWeekly.length).toFixed(2));
    }
    const manualScored = kpiEntries.filter(k => (k.manual_score ?? 0) > 0);
    if (manualScored.length > 0) {
      const total = manualScored.reduce((a, b) => a + (b.manual_score ?? 0), 0);
      return parseFloat((total / manualScored.length).toFixed(2));
    }
    return undefined;
  }

  function computeCompAvg(): number | undefined {
    if (!valuesRatings.length) return undefined;
    return parseFloat((valuesRatings.reduce((a, b) => a + b.manager_rating, 0) / valuesRatings.length).toFixed(2));
  }

  function computeOverallAvg(): number | undefined {
    const kpiAvg = computeKpiAvg();
    const compAvg = computeCompAvg();
    if (kpiAvg !== undefined && compAvg !== undefined) {
      return parseFloat(((kpiAvg + compAvg) / 2).toFixed(2));
    }
    return kpiAvg ?? compAvg;
  }

  function updateValuesRating(index: number, field: 'manager_rating' | 'manager_comment' | 'employee_comment', value: any) {
    setValuesRatings(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });

    if (field === 'employee_comment') return;

    const vr = valuesRatings[index];
    if (!vr) return;
    const key = `${vr.value_id}-${vr.competency_id}`;
    if (seraTimers.current[key]) clearTimeout(seraTimers.current[key]);

    const newRating = field === 'manager_rating' ? (value as number) : vr.manager_rating;
    const newComment = (field === 'manager_comment' ? (value as string) : vr.manager_comment) || '';

    const commentTrimmed = newComment.trim();
    if (commentTrimmed.length < 15) {
      if (field === 'manager_comment' && commentTrimmed.length === 0) {
        setSeraFeedbacks(prev => ({ ...prev, [key]: null }));
      }
      return;
    }

    // Capture all context before the async closure to avoid stale references
    const capturedRating = newRating;
    const capturedComment = commentTrimmed;
    const capturedCompetencyTitle = vr.competency_title;
    const capturedCompetencyStatement = vr.competency_statement;
    const capturedWhatGood = vr.what_good_looks_like;
    const capturedWhatGreat = vr.what_great_looks_like;
    const capturedEmployeeName = employeeFullName;
    const capturedSeraSystemPrompt = seraSystemPrompt;

    setSeraFeedbacks(prev => ({ ...prev, [key]: { type: 'loading', message: 'SERA is evaluating...' } }));

    seraTimers.current[key] = setTimeout(async () => {
      try {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token || import.meta.env.VITE_SUPABASE_ANON_KEY;
        const ratingLabels: Record<number, string> = { 1: 'Development Needed', 3: 'On Target', 5: 'Exceptional' };

        const res = await fetch(`${supabaseUrl}/functions/v1/validate-rating-justification`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({
            rating: capturedRating,
            ratingType: 'competency',
            ratingLabel: ratingLabels[capturedRating] || String(capturedRating),
            managerComments: capturedComment,
            employeeName: capturedEmployeeName,
            competencyName: capturedCompetencyTitle,
            competencyStatement: capturedCompetencyStatement,
            whatGoodLooksLike: capturedWhatGood,
            whatGreatLooksLike: capturedWhatGreat,
            seraSystemPrompt: capturedSeraSystemPrompt || undefined,
          }),
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const isPositive = data.valid && (capturedRating <= 3 || data.confidence === 'high');
        setSeraFeedbacks(prev => ({
          ...prev,
          [key]: { type: isPositive ? 'great' : 'warn', message: data.message || 'Unable to evaluate at this time.' },
        }));
      } catch (err) {
        console.error('[SERA] Feedback request failed:', err);
        const fallbackMsg = capturedRating >= 5
          ? 'SERA feedback is unavailable. Please ensure level 5 ratings include measurable impact, multiple examples and clear business outcomes.'
          : capturedRating === 4
          ? 'SERA feedback is unavailable. Please ensure this rating is supported by specific evidence and measurable outcomes.'
          : 'SERA feedback is unavailable. Evidence has been noted — consider adding specific examples for stronger support.';
        setSeraFeedbacks(prev => ({
          ...prev,
          [key]: { type: capturedRating >= 4 ? 'warn' : 'ok', message: fallbackMsg },
        }));
      }
    }, 800);
  }

  async function generateSeraSummary() {
    setGeneratingSera(true);
    try {
      const kpiAvg = computeKpiAvg();
      const compAvg = computeCompAvg();
      const overall = computeOverallAvg();

      const kpiLines = kpiEntries
        .map(k => {
          if ((k.weekly_entry_count ?? 0) > 0) {
            return `- ${k.kpi_name}: running avg ${k.weekly_avg?.toFixed(1)}/5 (${k.weekly_entry_count} weekly entries)`;
          }
          return `- ${k.kpi_name}: score ${k.manual_score}/5${k.manual_actual ? `, value: ${k.manual_actual}` : ''}`;
        })
        .join('\n');

      const compLines = valuesRatings
        .filter(vr => vr.manager_comment.trim())
        .map(vr => `- ${vr.value_title}/${vr.competency_title} (${vr.manager_rating}/5): ${vr.manager_comment}`)
        .join('\n');

      const weeklyActionLines = previousWeeklySummaries
        .flatMap(w => (w.short_term_actions || []).map(a => `[Wk ${w.week_number}] ${a}`))
        .join('\n');

      const carryoverLines = carryoverActions.map(a => `- ${a.action_text} (${a.is_carryover ? 'carryover' : 'new'})`).join('\n');
      const newActionLines = newActions.filter(a => a.action_text.trim()).map(a => `- ${a.action_text} (owner: ${a.owner})`).join('\n');

      const prompt = `You are writing a monthly 1:1 review summary for a manager to give to their employee. Write in a professional but warm, direct tone — like a good manager talking to their team member. Avoid corporate jargon. Make it feel personal and actionable, not templated.

Use ALL of the manager's competency comments below — they form the core evidence of the review. Do not summarise them into vague phrases; reference the specific behaviours and outcomes the manager mentioned.

REVIEW MONTH: ${format(currentMonth, 'MMMM yyyy')}

KPI PERFORMANCE:
${kpiLines || 'No KPI data recorded.'}
KPI Average: ${kpiAvg !== undefined ? `${kpiAvg}/5` : 'N/A'}

MANAGER COMPETENCY COMMENTS (use all of these in the summary):
${valuesRatings.filter(vr => vr.manager_comment.trim()).map(vr =>
  `- ${vr.value_title} / ${vr.competency_title} (rated ${vr.manager_rating}/5): "${vr.manager_comment}"`
).join('\n') || 'No competency comments recorded.'}
Competency Average: ${compAvg !== undefined ? `${compAvg}/5` : 'N/A'}

ACTIONS FROM WEEKLY CHECK-INS THIS MONTH:
${weeklyActionLines || 'None.'}

OUTSTANDING ACTIONS CARRIED OVER:
${carryoverLines || 'None.'}

NEW ACTIONS AGREED THIS REVIEW:
${newActionLines || 'None.'}

OVERALL AVERAGE: ${overall !== undefined ? `${overall}/5` : 'N/A'}
${review?.manager_additional_context?.trim() ? `\nMANAGER ADDITIONAL CONTEXT:\n${review.manager_additional_context}` : ''}
Write the summary in this format — keep it concise but substantive:

**Summary**
[3-4 sentences summarising this month's performance in plain language. Reference specific things the manager noted.]

**What's going well**
[2-4 bullet points drawn directly from the manager's competency comments and KPI performance]

**Areas to develop**
[1-3 bullet points referencing specific development areas the manager raised]

**KPI Performance**
[One bullet per KPI with score and brief note]

**Actions for next month**
[Bullet list combining outstanding and new actions]

**Overall**
[1-2 sentences. Include: KPI avg ${kpiAvg !== undefined ? `${kpiAvg}/5` : 'N/A'}, competency avg ${compAvg !== undefined ? `${compAvg}/5` : 'N/A'}, overall avg ${overall !== undefined ? `${overall}/5` : 'N/A'}.]`;

      const { data } = await supabase.functions.invoke('generate-review-summary', {
        body: { prompt, type: 'monthly_1on1_summary' }
      });

      const summary = data?.summary || buildFallback(kpiAvg, compAvg, overall, carryoverLines, newActionLines);
      setReview(prev => prev ? { ...prev, manager_summary: summary, sera_draft_summary: summary } : null);
    } catch {
      const kpiAvg = computeKpiAvg();
      const compAvg = computeCompAvg();
      const overall = computeOverallAvg();
      const fallback = buildFallback(kpiAvg, compAvg, overall, '', '');
      setReview(prev => prev ? { ...prev, manager_summary: fallback, sera_draft_summary: fallback } : null);
    } finally {
      setGeneratingSera(false);
    }
  }

  function buildFallback(kpiAvg?: number, compAvg?: number, overall?: number, carryover?: string, newActs?: string): string {
    return `**Summary**
Monthly 1:1 review for ${format(currentMonth, 'MMMM yyyy')}. KPI average: ${kpiAvg !== undefined ? `${kpiAvg}/5` : 'N/A'}. Competency average: ${compAvg !== undefined ? `${compAvg}/5` : 'N/A'}.

**Strengths**
- See competency evidence above.

**Development Areas**
- See areas rated 1 or below expectations.

**KPI Summary**
${kpiEntries.map(k => `- ${k.kpi_name}: ${(k.weekly_entry_count ?? 0) > 0 ? `avg ${k.weekly_avg?.toFixed(1)}/5` : `${k.manual_score}/5`}`).join('\n') || '- No KPI data.'}

**Actions**
${newActs || '- No new actions agreed.'}
${carryover ? `Outstanding: ${carryover}` : ''}

**Overall Position**
Overall average for ${format(currentMonth, 'MMMM yyyy')}: ${overall !== undefined ? `${overall}/5` : 'N/A'}. KPI avg: ${kpiAvg !== undefined ? `${kpiAvg}/5` : 'N/A'}. Competency avg: ${compAvg !== undefined ? `${compAvg}/5` : 'N/A'}.`;
  }

  async function saveProgress(submitStatus?: 'draft' | 'completed') {
    if (!review || guardViewAs()) return;
    setSaving(true);
    try {
      const kpiAvg = computeKpiAvg();
      const compAvg = computeCompAvg();
      const overall = computeOverallAvg();
      const requiresModeration = compAvg !== undefined && compAvg >= 4;
      const status = submitStatus || review.status || 'draft';

      const payload: any = {
        meeting_id: meetingId,
        employee_id: employeeId,
        manager_id: profile?.id,
        review_month: review.review_month,
        manual_kpi_entries: kpiEntries.map(k => ({
          kpi_name: k.kpi_name,
          actual_value: k.manual_actual,
          score: k.manual_score,
          comment: k.comment,
        })),
        kpi_ratings: kpiEntries.reduce((acc: any, k) => {
          if (k.kpi_id) acc[k.kpi_id] = { score: k.manual_score, actual: k.manual_actual, comment: k.comment };
          return acc;
        }, {}),
        kpi_snapshots: {},
        overall_kpi_average: kpiAvg,
        average_kpi_score: kpiAvg,
        values_ratings: valuesRatings,
        overall_competency_score: compAvg,
        overall_average: overall,
        manager_summary: review.manager_summary,
        sera_draft_summary: review.sera_draft_summary,
        manager_additional_context: review.manager_additional_context || '',
        employee_overall_comment: review.employee_overall_comment || '',
        requires_moderation: requiresModeration,
        moderation_status: requiresModeration ? 'pending' : 'approved',
        status,
        submitted_at: status === 'completed' ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      };

      let reviewId = review.id;
      if (review.id) {
        await supabase.from('one_to_one_monthly_reviews').update(payload).eq('id', review.id);
      } else {
        const { data } = await supabase.from('one_to_one_monthly_reviews').insert(payload).select().single();
        reviewId = data?.id;
      }

      const validNewActions = newActions.filter(a => a.action_text.trim());
      if (validNewActions.length > 0 && status === 'completed') {
        await supabase.from('one_to_one_action_items').insert(
          validNewActions.map(a => ({
            meeting_id: meetingId,
            owner_id: a.owner === 'employee' ? employeeId : profile?.id,
            action_text: a.action_text,
            due_date: a.due_date || null,
            status: 'open',
          }))
        );
      }

      // When review is completed, mark the scheduled meeting as completed so
      // team status shows 'Completed' on the manager's review page
      if (status === 'completed') {
        await supabase
          .from('one_to_one_scheduled_meetings')
          .update({ completion_status: 'completed', submitted_at: new Date().toISOString() })
          .eq('id', meetingId);

        // Create a single moderation case for the whole review when moderation is required.
        // The moderation panels load per-competency data from the review's values_ratings.
        if (requiresModeration && reviewId) {
          // Avoid duplicate cases if the review was previously completed and re-submitted
          const { data: existing } = await supabase
            .from('moderation_cases')
            .select('id')
            .eq('review_id', reviewId)
            .maybeSingle();

          if (!existing) {
            const { data: workflow } = await supabase
              .from('moderation_workflow_configs')
              .select('id')
              .eq('is_active', true)
              .maybeSingle();

            // Compute a representative "average" rating for the case record
            const highRatings = valuesRatings.filter(vr => vr.manager_rating >= 4);
            const avgRating = highRatings.length > 0
              ? Math.round(highRatings.reduce((s, vr) => s + vr.manager_rating, 0) / highRatings.length)
              : 4;
            const justification = valuesRatings
              .filter(vr => vr.manager_rating >= 4 && vr.manager_comment?.trim())
              .map(vr => `${vr.competency_title}: ${vr.manager_comment}`)
              .join('\n');

            await supabase.from('moderation_cases').insert({
              workflow_id: workflow?.id ?? null,
              review_id: reviewId,
              source_type: 'competency_assessment',
              source_id: reviewId,
              meeting_id: meetingId,
              employee_id: employeeId,
              manager_id: profile?.id,
              original_rating: avgRating,
              current_rating: avgRating,
              manager_justification: justification || null,
              ai_validation_status: 'pending',
              manager_override: false,
              current_step: 1,
              status: 'pending',
            });
          }
        }
      }

      setReview(prev => prev ? {
        ...prev,
        id: reviewId,
        status,
        overall_kpi_average: kpiAvg,
        overall_competency_average: compAvg,
        overall_average: overall,
        requires_moderation: requiresModeration,
      } : null);
    } catch (e) {
      console.error('saveProgress', e);
    } finally {
      setSaving(false);
    }
  }

  const kpiAvg = computeKpiAvg();
  const compAvg = computeCompAvg();
  const overallAvg = computeOverallAvg();
  const moderationTrigger = compAvg !== undefined && compAvg >= 4;
  // Completed reviews are editable for 5 days after submission, then read-only
  const isWithinEditWindow = (() => {
    if (review?.status !== 'completed') return true;
    if (!review.submitted_at) return true; // no timestamp: allow edit as fallback
    const submittedMs = new Date(review.submitted_at).getTime();
    const fiveDaysMs = 5 * 24 * 60 * 60 * 1000;
    return Date.now() - submittedMs <= fiveDaysMs;
  })();
  // Within the 5-day edit window, ignore the readOnly prop so the manager can still edit
  const isSubmitted = (readOnly && !isWithinEditWindow) || (review?.status === 'completed' && !isWithinEditWindow);

  const valueGroups = Array.from(new Set(valuesRatings.map(r => r.value_id))).map(vid => ({
    valueId: vid,
    valueTitle: valuesRatings.find(r => r.value_id === vid)?.value_title || '',
    rows: valuesRatings.filter(r => r.value_id === vid),
  }));

  function canProceed(): boolean {
    if (step === 2) {
      return valuesRatings.every(vr => vr.manager_rating > 0);
    }
    if (step === 3 && skipSkills) return true;
    return true;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors">
          <ChevronLeft className="w-4 h-4" />
          {readOnly ? 'Close' : 'Back'}
        </button>
        <span className="text-gray-300">/</span>
        <span className="text-sm font-semibold text-gray-800">Monthly Review — {format(currentMonth, 'MMMM yyyy')}</span>
        {review?.status === 'completed' && (
          <span className="ml-auto flex items-center gap-1.5 px-2.5 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
            <CheckCircle className="w-3.5 h-3.5" /> Completed
          </span>
        )}
      </div>

      {review?.status === 'completed' && isWithinEditWindow && !readOnly && (
        <div className="flex items-start gap-2.5 p-3.5 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
          <Info className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-600" />
          <span>This review is completed but can still be edited for 5 days after submission. After that it becomes read-only.</span>
        </div>
      )}

      {isSubmitted && !isWithinEditWindow && (
        <div className="flex items-start gap-2.5 p-3.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-600">
          <Info className="w-4 h-4 flex-shrink-0 mt-0.5 text-gray-400" />
          <span>This review is read-only. The 5-day edit window has passed.</span>
        </div>
      )}

      {previousWeeklySummaries.length > 0 && (
        <div className="border border-blue-200 rounded-xl overflow-hidden">
          <button
            onClick={() => setShowPrevSummaries(!showPrevSummaries)}
            className="w-full flex items-center justify-between p-3.5 bg-blue-50 hover:bg-blue-100 transition-colors text-left"
          >
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-semibold text-blue-900">Weekly Check-ins This Month ({previousWeeklySummaries.length})</span>
            </div>
            <ChevronRight className={`w-4 h-4 text-blue-500 transition-transform ${showPrevSummaries ? 'rotate-90' : ''}`} />
          </button>
          {showPrevSummaries && (
            <div className="p-4 bg-white border-t border-blue-100 space-y-3">
              {previousWeeklySummaries.map((ws, i) => (
                <div key={i} className="border border-gray-100 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs font-semibold text-gray-700">
                      Week {ws.week_number} — {format(new Date(ws.week_starting), 'dd MMM yyyy')}
                    </p>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${SCORE_LABELS[ws.performance_score]?.bg} ${SCORE_LABELS[ws.performance_score]?.border} ${SCORE_LABELS[ws.performance_score]?.color}`}>
                      {ws.performance_score} — {SCORE_LABELS[ws.performance_score]?.label}
                    </span>
                  </div>
                  {ws.summary && <p className="text-xs text-gray-600 leading-relaxed">{ws.summary}</p>}
                  {ws.short_term_actions?.filter((a: string) => a.trim()).length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {ws.short_term_actions.filter((a: string) => a.trim()).map((a: string, j: number) => (
                        <span key={j} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{a}</span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="overflow-x-auto">
        <div className="flex items-center min-w-max">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            const isActive = step === s.id;
            const isDone = step > s.id;
            return (
              <div key={s.id} className="flex items-center">
                <button
                  onClick={() => setStep(s.id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                    isActive ? 'bg-blue-600 text-white shadow-sm' :
                    isDone ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' :
                    'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {s.label}
                </button>
                {i < STEPS.length - 1 && (
                  <ArrowRight className={`w-3.5 h-3.5 mx-1 flex-shrink-0 ${isDone ? 'text-blue-400' : 'text-gray-300'}`} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-6 min-h-64">
        {step === 1 && (
          <StepPerformance
            kpiEntries={kpiEntries}
            setKpiEntries={setKpiEntries}
            hasCycle={hasCycle}
            kpiAvg={kpiAvg}
            isSubmitted={isSubmitted}
          />
        )}
        {step === 2 && (
          <StepCompetencies
            valueGroups={valueGroups}
            valuesRatings={valuesRatings}
            updateValuesRating={updateValuesRating}
            seraFeedbacks={seraFeedbacks}
            setSeraFeedbacks={setSeraFeedbacks}
            compAvg={compAvg}
            moderationTrigger={moderationTrigger}
            competencyLevel={competencyLevel}
            isSubmitted={isSubmitted}
            isViewingAs={!!isViewingAs}
            currentUserId={profile?.id}
            employeeId={employeeId}
          />
        )}
        {step === 3 && (
          <StepSkillsDev
            employeeId={employeeId}
            monthlyReviewId={review?.id}
            skipSkills={skipSkills}
            setSkipSkills={setSkipSkills}
          />
        )}
        {step === 4 && (
          <StepActionsComments
            carryoverActions={carryoverActions}
            setCarryoverActions={setCarryoverActions}
            newActions={newActions}
            setNewActions={setNewActions}
            weeklySummaries={previousWeeklySummaries}
            review={review}
            setReview={setReview}
            generatingSera={generatingSera}
            generateSeraSummary={generateSeraSummary}
            kpiAvg={kpiAvg}
            compAvg={compAvg}
            isSubmitted={isSubmitted}
            isViewingAs={!!isViewingAs}
            currentUserId={profile?.id}
            employeeId={employeeId}
          />
        )}
        {step === 5 && (
          <StepSubmit
            review={review}
            kpiAvg={kpiAvg}
            compAvg={compAvg}
            overallAvg={overallAvg}
            moderationTrigger={moderationTrigger}
            kpiEntries={kpiEntries}
            valuesRatings={valuesRatings}
            carryoverActions={carryoverActions}
            newActions={newActions}
            showConfirmSubmit={showConfirmSubmit}
          />
        )}
      </div>

      <div className="flex items-center justify-between pt-2 border-t">
        <div className="flex items-center gap-2">
          {step > 1 && (
            <button
              onClick={() => setStep(s => s - 1)}
              className="flex items-center gap-1.5 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg border transition-colors"
            >
              <ChevronLeft className="w-4 h-4" /> Previous
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          {step === 2 && !canProceed() && !isViewingAs && (
            <span className="text-xs text-red-600 font-medium">Please complete all competency ratings before proceeding.</span>
          )}
          {isViewingAs && !isSubmitted && (
            <span className="text-xs text-orange-600 font-medium">View As — read-only</span>
          )}
          {!isSubmitted && !isViewingAs && (
            <button
              onClick={() => saveProgress('draft')}
              disabled={saving}
              className="flex items-center gap-1.5 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg border disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              Save
            </button>
          )}
          {step < 5 && (
            <button
              onClick={() => { if (!isViewingAs) saveProgress(); setStep(s => s + 1); }}
              disabled={!canProceed()}
              className="flex items-center gap-1.5 px-5 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
            >
              Next <ChevronRight className="w-4 h-4" />
            </button>
          )}
          {step === 5 && !isSubmitted && !showConfirmSubmit && !isViewingAs && (
            <button
              onClick={async () => {
                if (!review?.manager_summary) {
                  await generateSeraSummary();
                }
                setShowConfirmSubmit(true);
              }}
              disabled={saving || generatingSera}
              className="flex items-center gap-1.5 px-5 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
            >
              <Send className="w-4 h-4" />
              {generatingSera ? 'Generating Summary...' : 'Submit Review'}
            </button>
          )}
          {step === 5 && !isSubmitted && showConfirmSubmit && !isViewingAs && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowConfirmSubmit(false)}
                disabled={saving}
                className="px-4 py-2 text-sm text-gray-700 border rounded-lg hover:bg-gray-100 disabled:opacity-50"
              >
                Back to Review
              </button>
              <button
                onClick={async () => {
                  await saveProgress('completed');
                  (onSubmitted ?? onBack)();
                }}
                disabled={saving}
                className="flex items-center gap-1.5 px-5 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium"
              >
                <CheckCircle className="w-4 h-4" />
                {saving ? 'Submitting...' : 'Confirm & Submit'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StepPerformance({ kpiEntries, setKpiEntries, hasCycle, kpiAvg, isSubmitted }: {
  kpiEntries: KPIEntry[];
  setKpiEntries: React.Dispatch<React.SetStateAction<KPIEntry[]>>;
  hasCycle: boolean | null;
  kpiAvg: number | undefined;
  isSubmitted: boolean;
}) {
  function updateEntry(i: number, field: keyof KPIEntry, value: any) {
    setKpiEntries(prev => { const u = [...prev]; (u[i] as any)[field] = value; return u; });
  }

  function addManualKPI() {
    setKpiEntries(prev => [...prev, {
      kpi_id: `manual-${Date.now()}`,
      kpi_name: '',
      target_value: '',
      measurement_unit: '',
      weekly_entry_count: 0,
      manual_score: 0,
      manual_actual: '',
      comment: '',
    }]);
  }

  function removeEntry(i: number) {
    setKpiEntries(prev => prev.filter((_, idx) => idx !== i));
  }

  const hasWeeklyData = kpiEntries.some(k => (k.weekly_entry_count ?? 0) > 0);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Step 1: Performance</h3>
          <p className="text-sm text-gray-500 mt-0.5">Review KPI performance for {format(startOfMonth(new Date()), 'MMMM yyyy')}</p>
        </div>
        <div className="flex items-center gap-3">
          {kpiAvg !== undefined && (
            <div className="text-right">
              <p className="text-xs text-gray-500">Overall Performance</p>
              <p className="text-2xl font-bold text-blue-700">{kpiAvg.toFixed(2)} <span className="text-base font-normal text-gray-400">/ 5</span></p>
              <p className="text-xs text-gray-400">{hasWeeklyData ? 'from weekly check-ins' : 'manual entry'}</p>
            </div>
          )}
        </div>
      </div>

      {hasCycle === false && !isSubmitted && (
        <div className="flex items-center justify-between p-3 bg-gray-50 border border-dashed border-gray-300 rounded-xl">
          <p className="text-xs text-gray-500">No review cycle linked. Add KPIs manually.</p>
          <button onClick={addManualKPI} className="flex items-center gap-1 text-xs text-blue-600 hover:bg-blue-50 px-2.5 py-1.5 rounded-lg font-medium">
            <Plus className="w-3.5 h-3.5" /> Add KPI
          </button>
        </div>
      )}

      {kpiEntries.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <Target className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm">No KPIs to display.</p>
          {hasCycle === false && !isSubmitted && (
            <button onClick={addManualKPI} className="mt-3 text-sm text-blue-600 hover:underline">Add a KPI manually</button>
          )}
        </div>
      )}

      {kpiEntries.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">KPI</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Target</th>
                {hasWeeklyData && <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Weekly Avg</th>}
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">{hasWeeklyData ? 'Actual' : 'Actual Value'}</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Score</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Comment</th>
                {!isSubmitted && hasCycle === false && <th className="w-8" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {kpiEntries.map((entry, i) => {
                const useWeekly = (entry.weekly_entry_count ?? 0) > 0;
                const displayScore = useWeekly ? Math.round(entry.weekly_avg ?? 3) : (entry.manual_score ?? 0);
                const scoreInfo = SCORE_LABELS[displayScore] || SCORE_LABELS[0];
                return (
                  <tr key={entry.kpi_id} className="hover:bg-gray-50/50 align-top">
                    <td className="px-4 py-3">
                      {hasCycle === false ? (
                        <input
                          value={entry.kpi_name}
                          onChange={e => updateEntry(i, 'kpi_name', e.target.value)}
                          placeholder="KPI name"
                          className="w-full px-2 py-1 border rounded text-xs focus:ring-2 focus:ring-blue-500"
                          disabled={isSubmitted}
                        />
                      ) : (
                        <p className="font-semibold text-gray-900 text-xs">{entry.kpi_name}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {entry.target_value}{entry.measurement_unit ? ` ${entry.measurement_unit}` : ''}
                    </td>
                    {hasWeeklyData && (
                      <td className="px-4 py-3">
                        {useWeekly ? (
                          <div>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${scoreInfo.bg} ${scoreInfo.border} ${scoreInfo.color}`}>
                              {entry.weekly_avg?.toFixed(1)}
                            </span>
                            <p className="text-xs text-gray-400 mt-0.5">{entry.weekly_entry_count} entries</p>
                          </div>
                        ) : <span className="text-xs text-gray-400">No data</span>}
                      </td>
                    )}
                    <td className="px-4 py-3">
                      <input
                        value={entry.manual_actual}
                        onChange={e => updateEntry(i, 'manual_actual', e.target.value)}
                        placeholder={entry.measurement_unit || 'Value'}
                        className="w-full px-2 py-1 border rounded text-xs focus:ring-2 focus:ring-blue-500"
                        disabled={isSubmitted}
                      />
                    </td>
                    <td className="px-4 py-3">
                      {useWeekly ? (
                        <span className={`text-xs font-semibold ${scoreInfo.color}`}>{entry.weekly_avg?.toFixed(2)}</span>
                      ) : (
                        <select
                          value={entry.manual_score}
                          onChange={e => updateEntry(i, 'manual_score', parseInt(e.target.value))}
                          disabled={isSubmitted}
                          className="w-full px-2 py-1 border rounded text-xs focus:ring-2 focus:ring-blue-500"
                        >
                          <option value={0}>Select score...</option>
                          {([1, 2, 3, 4, 5] as const).map(s => (
                            <option key={s} value={s}>{s} — {SCORE_LABELS[s].label}</option>
                          ))}
                        </select>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <textarea
                        value={entry.comment}
                        onChange={e => updateEntry(i, 'comment', e.target.value)}
                        rows={2}
                        placeholder="Notes..."
                        className="w-full px-2 py-1.5 border rounded text-xs focus:ring-2 focus:ring-blue-500 resize-none"
                        disabled={isSubmitted}
                      />
                    </td>
                    {!isSubmitted && hasCycle === false && (
                      <td className="px-2 py-3">
                        <button onClick={() => removeEntry(i)} className="p-1 text-red-400 hover:text-red-600">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
            {kpiAvg !== undefined && (
              <tfoot>
                <tr className="bg-blue-50 border-t-2 border-blue-200">
                  <td colSpan={hasWeeklyData ? 4 : 3} className="px-4 py-2.5 text-xs font-bold text-blue-800">
                    Overall Performance Rating
                    <span className="ml-1 font-normal text-blue-600 text-xs">({hasWeeklyData ? 'weekly avg' : 'manual avg'})</span>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="text-lg font-bold text-blue-700">{kpiAvg.toFixed(2)} / 5</span>
                  </td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      )}
    </div>
  );
}

function StepCompetencies({ valueGroups, valuesRatings, updateValuesRating, seraFeedbacks, setSeraFeedbacks, compAvg, moderationTrigger, competencyLevel, isSubmitted, isViewingAs, currentUserId, employeeId }: {
  valueGroups: { valueId: string; valueTitle: string; rows: ValuesRating[] }[];
  valuesRatings: ValuesRating[];
  updateValuesRating: (i: number, field: 'manager_rating' | 'manager_comment' | 'employee_comment', value: any) => void;
  seraFeedbacks: Record<string, SeraFeedback | null>;
  setSeraFeedbacks: React.Dispatch<React.SetStateAction<Record<string, SeraFeedback | null>>>;
  compAvg: number | undefined;
  moderationTrigger: boolean;
  competencyLevel: string;
  isSubmitted: boolean;
  isViewingAs: boolean;
  currentUserId: string | undefined;
  employeeId: string;
}) {
  const isEmployee = !isViewingAs && currentUserId === employeeId;
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Step 2: Values & Competencies</h3>
          <p className="text-sm text-gray-500 mt-0.5">Rate observed behaviours with evidence — SERA coaches as you type</p>
        </div>
        <div className="flex items-center gap-3">
          {compAvg !== undefined && (
            <div className="text-right">
              <p className="text-xs text-gray-500">Competency Average</p>
              <p className="text-2xl font-bold text-blue-700">{compAvg.toFixed(2)} <span className="text-base font-normal text-gray-400">/ 5</span></p>
            </div>
          )}
          <span className="text-xs bg-blue-50 text-blue-600 border border-blue-200 px-2.5 py-1 rounded-full font-medium">{competencyLevel}</span>
        </div>
      </div>

      <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-800">
        <Info className="w-3.5 h-3.5 text-blue-500 flex-shrink-0 mt-0.5" />
        <span>Scores contributing to an overall competency average of 4 or above will go to moderation.</span>
      </div>

      {moderationTrigger && (
        <div className="flex items-start gap-2 p-3 bg-orange-50 border border-orange-200 rounded-xl text-xs text-orange-800">
          <AlertCircle className="w-3.5 h-3.5 text-orange-500 flex-shrink-0 mt-0.5" />
          <span>Current average is <strong>{compAvg?.toFixed(2)}</strong> — this review will go to moderation on submission.</span>
        </div>
      )}

      {valueGroups.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <Award className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm">No competencies found. Set them up in Admin.</p>
        </div>
      )}

      <div className="space-y-8">
        {valueGroups.map(({ valueId, valueTitle, rows }) => (
          <div key={valueId}>
            <h5 className="text-sm font-bold text-gray-800 mb-3 pb-2 border-b border-gray-200">{valueTitle}</h5>
            <div className="space-y-3">
              {rows.map(vr => {
                const overallIdx = valuesRatings.findIndex(r => r.value_id === vr.value_id && r.competency_id === vr.competency_id);
                const key = `${vr.value_id}-${vr.competency_id}`;
                const fb = seraFeedbacks[key];
                return (
                  <div key={vr.competency_id} className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
                    <p className="font-semibold text-gray-900 text-sm leading-snug">{vr.competency_title}</p>
                    <p className="text-xs text-gray-600 leading-relaxed">
                      {vr.evidence_prompt || 'Describe observed behaviours and examples.'}
                    </p>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Employee Comment</label>
                      {isEmployee ? (
                        <textarea
                          value={vr.employee_comment || ''}
                          onChange={e => updateValuesRating(overallIdx, 'employee_comment', e.target.value)}
                          disabled={isSubmitted}
                          rows={3}
                          placeholder="Share your perspective on this competency..."
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 resize-y"
                        />
                      ) : (
                        <p className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 italic min-h-[2.5rem]">
                          {vr.employee_comment || <span className="text-gray-400 not-italic">No comment added by employee.</span>}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Rating</label>
                      <select
                        value={vr.manager_rating}
                        onChange={e => updateValuesRating(overallIdx, 'manager_rating', parseInt(e.target.value))}
                        disabled={isSubmitted}
                        className={`w-44 px-2 py-1.5 border rounded-lg text-xs font-semibold focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 ${
                          vr.manager_rating === 0 ? 'text-gray-500 border-gray-300 bg-white' :
                          vr.manager_rating === 1 ? 'text-red-700 border-red-300 bg-red-50' :
                          vr.manager_rating === 5 ? 'text-emerald-700 border-emerald-300 bg-emerald-50' :
                          'text-blue-700 border-blue-300 bg-blue-50'
                        }`}
                      >
                        {COMPETENCY_OPTIONS.map(opt => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Manager Evidence/Comments</label>
                      <textarea
                        value={vr.manager_comment}
                        onChange={e => updateValuesRating(overallIdx, 'manager_comment', e.target.value)}
                        disabled={isSubmitted}
                        rows={5}
                        placeholder="Enter evidence and examples..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 resize-y"
                      />
                      {fb && (
                        <div className={`flex items-start gap-2 p-2 rounded-lg text-xs mt-1.5 ${
                          fb.type === 'loading' ? 'bg-gray-50 border border-gray-200 text-gray-500' :
                          fb.type === 'great' || fb.type === 'ok' ? 'bg-emerald-50 border border-emerald-200 text-emerald-800' :
                          fb.type === 'error' ? 'bg-red-50 border border-red-200 text-red-800' :
                          'bg-amber-50 border border-amber-300 text-amber-900'
                        }`}>
                          {fb.type === 'loading'
                            ? <Clock className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 animate-spin" />
                            : fb.type === 'great' || fb.type === 'ok'
                              ? <Sparkles className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-emerald-600" />
                              : <MessageSquare className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                          }
                          <span className="flex-1">{fb.message}</span>
                          {fb.type !== 'loading' && (
                            <button onClick={() => setSeraFeedbacks(p => ({ ...p, [key]: null }))}>
                              <X className="w-3.5 h-3.5 opacity-50" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StepSkillsDev({ employeeId, monthlyReviewId, skipSkills, setSkipSkills }: {
  employeeId: string;
  monthlyReviewId?: string;
  skipSkills: boolean;
  setSkipSkills: (v: boolean) => void;
}) {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Step 3: Skills & Development</h3>
          <p className="text-sm text-gray-500 mt-0.5">Review skill assessments and development actions</p>
        </div>
        <button
          onClick={() => setSkipSkills(!skipSkills)}
          className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors ${
            skipSkills ? 'bg-gray-100 text-gray-600 border-gray-300' : 'bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100'
          }`}
        >
          <SkipForward className="w-3.5 h-3.5" />
          {skipSkills ? 'Unskip' : 'Skip this step'}
        </button>
      </div>
      {skipSkills ? (
        <div className="flex items-center gap-3 p-4 bg-gray-50 border border-dashed border-gray-300 rounded-xl">
          <Clock className="w-5 h-5 text-gray-400" />
          <p className="text-sm text-gray-500">Skills & Development step skipped for this review.</p>
        </div>
      ) : (
        <SkillsMatrixPanel employeeId={employeeId} monthlyReviewId={monthlyReviewId} isManager={true} />
      )}
    </div>
  );
}

function StepActionsComments({
  carryoverActions, setCarryoverActions, newActions, setNewActions, weeklySummaries,
  review, setReview, generatingSera, generateSeraSummary, kpiAvg, compAvg, isSubmitted,
  isViewingAs, currentUserId, employeeId,
}: {
  carryoverActions: ActionItem[];
  setCarryoverActions: React.Dispatch<React.SetStateAction<ActionItem[]>>;
  newActions: ActionItem[];
  setNewActions: React.Dispatch<React.SetStateAction<ActionItem[]>>;
  weeklySummaries: WeeklySummary[];
  review: MonthlyReview | null;
  setReview: React.Dispatch<React.SetStateAction<MonthlyReview | null>>;
  generatingSera: boolean;
  generateSeraSummary: () => void;
  kpiAvg: number | undefined;
  compAvg: number | undefined;
  isSubmitted: boolean;
  isViewingAs: boolean;
  currentUserId: string | undefined;
  employeeId: string;
}) {
  const isEmployee = !isViewingAs && currentUserId === employeeId;
  const [completingId, setCompletingId] = useState<string | null>(null);

  const weeklyActions = weeklySummaries.flatMap(w =>
    (w.short_term_actions || []).filter((a: string) => a.trim()).map((a: string) => ({
      text: a,
      week: w.week_number,
    }))
  );

  async function markCarryoverComplete(index: number) {
    const action = carryoverActions[index];
    if (!action.source_id || action.status === 'closed') return;
    setCompletingId(action.source_id);
    try {
      await supabase
        .from('one_to_one_action_items')
        .update({ status: 'closed' })
        .eq('id', action.source_id);
      setCarryoverActions(prev => {
        const updated = [...prev];
        updated[index] = { ...updated[index], status: 'closed' };
        return updated;
      });
    } finally {
      setCompletingId(null);
    }
  }

  const openCarryover = carryoverActions.filter(a => a.status !== 'closed');
  const closedCarryover = carryoverActions.filter(a => a.status === 'closed');

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900">Step 4: Actions & Manager Comments</h3>
        <p className="text-sm text-gray-500 mt-0.5">Review outstanding actions, agree new ones, and add your summary</p>
      </div>

      {(carryoverActions.length > 0 || weeklyActions.length > 0) && (
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-gray-800">Ongoing & Weekly Actions</h4>
          {weeklyActions.length > 0 && (
            <div className="space-y-1.5">
              {weeklyActions.map((a, i) => (
                <div key={i} className="flex items-start gap-2 p-2.5 bg-blue-50 border border-blue-100 rounded-lg">
                  <CheckCircle className="w-3.5 h-3.5 text-blue-500 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-gray-700"><span className="text-blue-600 font-medium">Wk {a.week}:</span> {a.text}</p>
                </div>
              ))}
            </div>
          )}
          {openCarryover.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide">Open actions — mark as complete</p>
              {carryoverActions.map((a, i) => {
                if (a.status === 'closed') return null;
                const isCompleting = completingId === a.source_id;
                return (
                  <div key={i} className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <label className="flex items-center gap-2 cursor-pointer flex-shrink-0" title="Mark as Complete">
                      <input
                        type="checkbox"
                        checked={false}
                        disabled={isCompleting || isSubmitted}
                        onChange={() => markCarryoverComplete(i)}
                        className="w-4 h-4 rounded border-amber-400 text-green-600 cursor-pointer disabled:cursor-not-allowed"
                      />
                      <span className="text-xs font-medium text-gray-600 whitespace-nowrap">Mark as Complete</span>
                    </label>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-800 font-medium">{a.action_text}</p>
                      {a.due_date && (
                        <p className="text-xs text-amber-600 mt-0.5">Due: {a.due_date}</p>
                      )}
                    </div>
                    {isCompleting && <div className="w-3.5 h-3.5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin flex-shrink-0" />}
                  </div>
                );
              })}
            </div>
          )}
          {closedCarryover.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-green-700 uppercase tracking-wide">Completed actions</p>
              {carryoverActions.map((a, i) => {
                if (a.status !== 'closed') return null;
                return (
                  <div key={i} className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg opacity-75">
                    <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-600 line-through">{a.action_text}</p>
                    </div>
                    <span className="text-xs font-semibold text-green-600 bg-green-100 px-2 py-0.5 rounded-full flex-shrink-0">Complete</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {carryoverActions.length === 0 && weeklyActions.length === 0 && (
        <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-400 text-center">
          No incomplete previous actions.
        </div>
      )}

      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-semibold text-gray-800">New Actions</h4>
          {!isSubmitted && (
            <button
              onClick={() => setNewActions(p => [...p, { action_text: '', owner: 'employee', due_date: '' }])}
              className="flex items-center gap-1 text-xs text-blue-600 hover:bg-blue-50 px-2.5 py-1.5 rounded-lg"
            >
              <Plus className="w-3.5 h-3.5" /> Add action
            </button>
          )}
        </div>
        <div className="space-y-2">
          {newActions.map((action, index) => (
            <div key={index} className="flex items-center gap-2 p-3 border rounded-xl">
              <input
                value={action.action_text}
                onChange={e => setNewActions(p => { const u = [...p]; u[index].action_text = e.target.value; return u; })}
                placeholder="Action description..."
                className="flex-1 px-3 py-2 border rounded-lg text-xs focus:ring-2 focus:ring-blue-500"
              />
              <select
                value={action.owner}
                onChange={e => setNewActions(p => { const u = [...p]; u[index].owner = e.target.value as 'employee' | 'manager'; return u; })}
                className="px-2 py-2 border rounded-lg text-xs focus:ring-2 focus:ring-blue-500"
              >
                <option value="employee">Employee</option>
                <option value="manager">Manager</option>
              </select>
              <input
                type="date"
                value={action.due_date}
                onChange={e => setNewActions(p => { const u = [...p]; u[index].due_date = e.target.value; return u; })}
                className="px-2 py-2 border rounded-lg text-xs focus:ring-2 focus:ring-blue-500"
              />
              <button onClick={() => setNewActions(p => p.filter((_, i) => i !== index))} className="p-1.5 text-red-400 hover:text-red-600">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
          {newActions.length === 0 && (
            <p className="text-xs text-gray-400 py-2 text-center">No new actions yet.</p>
          )}
        </div>
      </div>

      <div className="border border-amber-200 bg-amber-50 rounded-xl p-4 space-y-2">
        <p className="text-sm font-semibold text-amber-900">Manager Comments</p>
        <p className="text-xs text-amber-700">Additional context, observations, or notes for this review period.</p>
        {!isSubmitted ? (
          <textarea
            value={review?.manager_additional_context || ''}
            onChange={e => setReview(p => p ? { ...p, manager_additional_context: e.target.value } : null)}
            rows={3}
            placeholder="e.g. team situation, personal circumstances, wider context relevant to this review period..."
            className="w-full px-3 py-2 border border-amber-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-400 bg-white resize-none"
          />
        ) : (
          <p className="px-3 py-2 bg-white border border-amber-200 rounded-lg text-sm text-gray-700 italic min-h-[2.5rem]">
            {review?.manager_additional_context || <span className="text-gray-400 not-italic">No additional comments added.</span>}
          </p>
        )}
      </div>

      <div className="border border-teal-200 bg-teal-50 rounded-xl p-4 space-y-2">
        <p className="text-sm font-semibold text-teal-900">Overall Employee Comment</p>
        <p className="text-xs text-teal-700">
          {isEmployee
            ? 'Share your overall reflections on this review period — how you felt it went, any context you want to add, or anything you\'d like your manager to know.'
            : 'Employee\'s overall reflections on this review period.'}
        </p>
        {isEmployee ? (
          <textarea
            value={review?.employee_overall_comment || ''}
            onChange={e => setReview(p => p ? { ...p, employee_overall_comment: e.target.value } : null)}
            disabled={isSubmitted}
            rows={4}
            placeholder="Share your reflections on this review period..."
            className="w-full px-3 py-2 border border-teal-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-400 bg-white resize-none disabled:bg-teal-50/50"
          />
        ) : (
          <p className="px-3 py-2 bg-white border border-teal-200 rounded-lg text-sm text-gray-700 italic min-h-[2.5rem]">
            {review?.employee_overall_comment || <span className="text-gray-400 not-italic">No comment added by employee.</span>}
          </p>
        )}
      </div>

      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between p-4 bg-gray-50 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-blue-600" />
            <div>
              <p className="text-sm font-semibold text-gray-900">Manager Summary</p>
              <p className="text-xs text-gray-400">SERA-assisted — includes KPI avg, competency avg, actions, key points</p>
            </div>
          </div>
          {!isSubmitted && (
            <button
              onClick={generateSeraSummary}
              disabled={generatingSera}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {generatingSera ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Generating...</> : <><FileText className="w-3.5 h-3.5" /> {review?.sera_draft_summary ? 'Regenerate' : 'Generate'} Summary</>}
            </button>
          )}
        </div>
        <div className="p-4">
          {!review?.manager_summary && (
            <div className="py-6 text-center text-gray-400 text-sm mb-2">
              <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p>Generate a summary using all data — KPI avg, competency ratings, actions and weekly notes.</p>
              {(kpiAvg !== undefined || compAvg !== undefined) && (
                <p className="mt-2 text-xs">
                  {kpiAvg !== undefined && `KPI avg: ${kpiAvg}/5  `}
                  {compAvg !== undefined && `Competency avg: ${compAvg}/5`}
                </p>
              )}
            </div>
          )}
          <textarea
            value={review?.manager_summary || ''}
            onChange={e => setReview(p => p ? { ...p, manager_summary: e.target.value } : null)}
            disabled={isSubmitted}
            rows={review?.manager_summary ? 14 : 4}
            placeholder="Generate above or type here..."
            className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 resize-none text-sm font-mono"
          />
        </div>
      </div>
    </div>
  );
}

function StepSubmit({ review, kpiAvg, compAvg, overallAvg, moderationTrigger, kpiEntries, valuesRatings, carryoverActions, newActions, showConfirmSubmit }: {
  review: MonthlyReview | null;
  kpiAvg: number | undefined;
  compAvg: number | undefined;
  overallAvg: number | undefined;
  moderationTrigger: boolean;
  kpiEntries: KPIEntry[];
  valuesRatings: ValuesRating[];
  carryoverActions: ActionItem[];
  newActions: ActionItem[];
  showConfirmSubmit?: boolean;
}) {
  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-lg font-semibold text-gray-900">Step 5: Submit Review</h3>
        <p className="text-sm text-gray-500 mt-0.5">
          {showConfirmSubmit ? 'Review the summary below and confirm submission' : 'Review the summary before submitting'}
        </p>
      </div>

      {showConfirmSubmit && (
        <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-xl">
          <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-blue-800">Please review the summary below carefully. Once confirmed, this review will be marked as Completed and you will return to the review screen.</p>
        </div>
      )}

      <div className="grid grid-cols-3 gap-4">
        {kpiAvg !== undefined && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center">
            <p className="text-xs text-blue-600 font-medium mb-1">KPI Average</p>
            <p className="text-3xl font-bold text-blue-700">{kpiAvg.toFixed(2)}</p>
            <p className="text-xs text-blue-500 mt-0.5">/ 5</p>
          </div>
        )}
        {compAvg !== undefined && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center">
            <p className="text-xs text-emerald-600 font-medium mb-1">Competency Average</p>
            <p className="text-3xl font-bold text-emerald-700">{compAvg.toFixed(2)}</p>
            <p className="text-xs text-emerald-500 mt-0.5">/ 5</p>
          </div>
        )}
        {overallAvg !== undefined && (
          <div className="bg-gray-50 border border-gray-300 rounded-xl p-4 text-center">
            <p className="text-xs text-gray-600 font-medium mb-1">Overall Average</p>
            <p className="text-3xl font-bold text-gray-800">{overallAvg.toFixed(2)}</p>
            <p className="text-xs text-gray-400 mt-0.5">/ 5</p>
          </div>
        )}
      </div>

      {moderationTrigger && (
        <div className="flex items-start gap-2 p-4 bg-orange-50 border border-orange-200 rounded-xl">
          <AlertCircle className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-orange-800">Moderation Required</p>
            <p className="text-xs text-orange-700 mt-0.5">Competency average of {compAvg?.toFixed(2)} is 4 or above. This review will enter the moderation queue after submission.</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div className="border border-gray-200 rounded-xl p-4">
          <p className="font-semibold text-gray-700 mb-2 text-xs uppercase tracking-wide">KPIs ({kpiEntries.length})</p>
          {kpiEntries.length === 0 ? <p className="text-xs text-gray-400">No KPIs</p> :
            kpiEntries.map(k => (
              <div key={k.kpi_id} className="flex items-center justify-between py-1 border-b last:border-0 border-gray-100">
                <span className="text-xs text-gray-700 truncate">{k.kpi_name}</span>
                <span className="text-xs font-semibold text-blue-700 ml-2 flex-shrink-0">
                  {(k.weekly_entry_count ?? 0) > 0 ? `${k.weekly_avg?.toFixed(1)}/5` : `${k.manual_score}/5`}
                </span>
              </div>
            ))
          }
        </div>
        <div className="border border-gray-200 rounded-xl p-4">
          <p className="font-semibold text-gray-700 mb-2 text-xs uppercase tracking-wide">Competencies ({valuesRatings.length})</p>
          {valuesRatings.length === 0 ? <p className="text-xs text-gray-400">No competencies rated</p> :
            valuesRatings.map(vr => (
              <div key={vr.competency_id} className="flex items-center justify-between py-1 border-b last:border-0 border-gray-100">
                <span className="text-xs text-gray-700 truncate">{vr.competency_title}</span>
                <span className={`text-xs font-semibold ml-2 flex-shrink-0 ${
                  vr.manager_rating === 1 ? 'text-red-600' : vr.manager_rating === 5 ? 'text-emerald-600' : 'text-blue-600'
                }`}>{vr.manager_rating}/5</span>
              </div>
            ))
          }
        </div>
      </div>

      <div className="border border-gray-200 rounded-xl p-4">
        <p className="font-semibold text-gray-700 mb-2 text-xs uppercase tracking-wide">Actions</p>
        {carryoverActions.length === 0 && newActions.filter(a => a.action_text.trim()).length === 0 ? (
          <p className="text-xs text-gray-400">No actions</p>
        ) : (
          <div className="space-y-1">
            {carryoverActions.map((a, i) => (
              <div key={i} className="flex items-center gap-2 text-xs text-gray-600 py-0.5">
                <Clock className="w-3 h-3 text-amber-500 flex-shrink-0" />
                <span>{a.action_text}</span>
                <span className="text-amber-600 text-xs">(ongoing)</span>
              </div>
            ))}
            {newActions.filter(a => a.action_text.trim()).map((a, i) => (
              <div key={i} className="flex items-center gap-2 text-xs text-gray-600 py-0.5">
                <CheckCircle className="w-3 h-3 text-blue-500 flex-shrink-0" />
                <span>{a.action_text}</span>
                <span className="text-blue-500 text-xs">({a.owner})</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {review?.manager_summary && (
        <div className={`border rounded-xl p-4 ${showConfirmSubmit ? 'border-blue-300 bg-blue-50' : 'border-gray-200'}`}>
          <p className={`font-semibold mb-2 text-xs uppercase tracking-wide ${showConfirmSubmit ? 'text-blue-800' : 'text-gray-700'}`}>
            Manager Summary {showConfirmSubmit && '— Please Review'}
          </p>
          <div className={`text-xs whitespace-pre-line leading-relaxed overflow-y-auto ${showConfirmSubmit ? 'max-h-96 text-blue-900' : 'max-h-48 text-gray-700'}`}>
            {review.manager_summary}
          </div>
        </div>
      )}

      {showConfirmSubmit && !review?.manager_summary && (
        <div className="border border-amber-200 bg-amber-50 rounded-xl p-4">
          <p className="text-xs text-amber-800 font-medium">No summary generated yet. You can still submit, or go back to generate one in Step 4.</p>
        </div>
      )}
    </div>
  );
}
