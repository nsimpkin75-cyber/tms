import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import {
  ShieldCheck, ChevronDown, ChevronUp, CheckCircle2, AlertCircle,
  MessageSquare, Star, Send, Clock, User, Users, Gavel, Eye, Sparkles
} from 'lucide-react';
import { format } from 'date-fns';

interface ValuesRatingRow {
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
}

interface DLDecision {
  competency_id: string;
  competency_name: string;
  original_rating: number;
  dl_rating: number;
  dl_comment: string;
  action: 'approved' | 'adjusted';
  decided_at: string;
}

interface ExecDecision {
  competency_id: string;
  competency_name: string;
  original_rating: number;
  dl_rating: number;
  final_rating: number;
  exec_comment: string;
  action: 'approved' | 'adjusted';
  decided_at: string;
}

interface ModerationCase {
  id: string;
  source_type: string;
  manager_justification: string | null;
  ai_validation_status: string;
  ai_summary: string | null;
  manager_override: boolean;
  manager_override_notes: string | null;
  current_step: number;
  status: string;
  created_at: string;
  dept_lead_decisions: DLDecision[];
  exec_decisions: ExecDecision[];
  employee_id: string;
  manager_id: string;
  employee: { id: string; full_name: string; job_title: string; department: string } | null;
  manager: { id: string; full_name: string } | null;
  valuesRatings: ValuesRatingRow[];
  reviewId: string | null;
}

interface CompetencyExecAction {
  action: 'approved' | 'adjusted' | '';
  rating: number;
  comment: string;
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending:    { label: 'Pending',    color: 'bg-amber-100 text-amber-800 border-amber-200' },
  in_review:  { label: 'In Review',  color: 'bg-blue-100 text-blue-800 border-blue-200' },
  approved:   { label: 'Approved',   color: 'bg-green-100 text-green-800 border-green-200' },
  rejected:   { label: 'Rejected',   color: 'bg-red-100 text-red-800 border-red-200' },
  adjusted:   { label: 'Adjusted',   color: 'bg-orange-100 text-orange-800 border-orange-200' },
};

const RATING_LABELS: Record<number, string> = {
  0: 'Not Rated',
  1: 'Development Needed',
  2: 'Below Target',
  3: 'On Target',
  4: 'Above Target',
  5: 'Exceptional',
};

interface ExecModerationPanelProps {
  readOnly?: boolean;
}

export default function ExecModerationPanel({ readOnly = false }: ExecModerationPanelProps) {
  const { effectiveProfile: profile } = useAuth();
  const [cases, setCases] = useState<ModerationCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'pending' | 'all'>('pending');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [hasExecAccess, setHasExecAccess] = useState<boolean | null>(null);

  // Per-case per-competency exec action state
  const [compActions, setCompActions] = useState<Record<string, Record<string, CompetencyExecAction>>>({});

  useEffect(() => {
    if (profile?.id) checkExecAccess();
  }, [profile?.id]);

  useEffect(() => {
    if (hasExecAccess) loadCases();
  }, [filter, hasExecAccess]);

  async function checkExecAccess() {
    if (!profile?.id) return;
    // Org-level roles always have access
    const ORG_LEVEL_ROLES = new Set(['admin', 'leadership', 'senior']);
    if (ORG_LEVEL_ROLES.has(profile.role || '')) {
      setHasExecAccess(true);
      return;
    }
    // Check exec_moderator_assignments — by user or by access level
    const { data: assignments } = await supabase
      .from('exec_moderator_assignments')
      .select('id, assignment_type, user_id, access_level_id')
      .eq('is_active', true);

    if (!assignments || assignments.length === 0) {
      setHasExecAccess(false);
      return;
    }

    // Check user-level assignments
    const userAssignment = assignments.find(a => a.assignment_type === 'user' && a.user_id === profile.id);
    if (userAssignment) { setHasExecAccess(true); return; }

    // Check access-level assignments
    const accessLevelIds = assignments
      .filter(a => a.assignment_type === 'access_level' && a.access_level_id)
      .map(a => a.access_level_id);
    if (accessLevelIds.length > 0) {
      const { data: userLevels } = await supabase
        .from('user_access_levels')
        .select('access_level_id')
        .eq('user_id', profile.id)
        .in('access_level_id', accessLevelIds);
      if (userLevels && userLevels.length > 0) { setHasExecAccess(true); return; }
    }

    setHasExecAccess(false);
  }

  async function loadCases() {
    setLoading(true);
    try {
      let q = supabase
        .from('moderation_cases')
        .select(`
          id, source_type, source_id, manager_justification, ai_validation_status, ai_summary,
          manager_override, manager_override_notes, current_step, status, created_at,
          employee_id, manager_id, dept_lead_decisions, exec_decisions, review_id
        `)
        .eq('current_step', 2)
        .order('created_at', { ascending: false });

      if (filter === 'pending') {
        q = q.not('status', 'in', '("approved","rejected","adjusted")');
      }

      const { data, error } = await q;
      if (error) throw error;

      const allCases = data || [];

      const allProfileIds = [...new Set([
        ...allCases.map((c: any) => c.employee_id),
        ...allCases.map((c: any) => c.manager_id),
      ].filter(Boolean))];

      let profileMap: Record<string, any> = {};
      if (allProfileIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, job_title, department')
          .in('id', allProfileIds);
        (profiles || []).forEach((p: any) => { profileMap[p.id] = p; });
      }

      const effectiveReviewId = (c: any): string | null => c.review_id || (c.source_type === 'competency_assessment' ? c.source_id : null) || null;
      const reviewIds = [...new Set(allCases.map(effectiveReviewId).filter(Boolean))];
      let reviewMap: Record<string, ValuesRatingRow[]> = {};
      if (reviewIds.length > 0) {
        const { data: reviews } = await supabase
          .from('one_to_one_monthly_reviews')
          .select('id, values_ratings')
          .in('id', reviewIds);
        (reviews || []).forEach((r: any) => {
          reviewMap[r.id] = (r.values_ratings || []).filter((vr: any) => vr.manager_rating >= 4);
        });
      }

      const enriched: ModerationCase[] = allCases.map((c: any) => {
        const rid = effectiveReviewId(c);
        return {
          ...c,
          employee: profileMap[c.employee_id] || null,
          manager: profileMap[c.manager_id] || null,
          dept_lead_decisions: c.dept_lead_decisions || [],
          exec_decisions: c.exec_decisions || [],
          valuesRatings: rid ? (reviewMap[rid] || []) : [],
          reviewId: rid,
        };
      });

      setCases(enriched);
    } finally {
      setLoading(false);
    }
  }

  function initActionsForCase(c: ModerationCase) {
    const init: Record<string, CompetencyExecAction> = {};
    c.valuesRatings.forEach(vr => {
      const existing = c.exec_decisions.find(d => d.competency_id === vr.competency_id);
      const dlDecision = c.dept_lead_decisions.find(d => d.competency_id === vr.competency_id);
      const currentRating = dlDecision ? dlDecision.dl_rating : vr.manager_rating;
      init[vr.competency_id] = existing
        ? { action: existing.action, rating: existing.final_rating, comment: existing.exec_comment }
        : { action: '', rating: currentRating, comment: '' };
    });
    return init;
  }

  function setCompAction(caseId: string, competencyId: string, update: Partial<CompetencyExecAction>) {
    setCompActions(prev => ({
      ...prev,
      [caseId]: {
        ...(prev[caseId] || {}),
        [competencyId]: { ...(prev[caseId]?.[competencyId] || { action: '', rating: 3, comment: '' }), ...update },
      },
    }));
  }

  function canSubmitCase(c: ModerationCase): boolean {
    const actions = compActions[c.id] || {};
    return c.valuesRatings.every(vr => {
      const a = actions[vr.competency_id];
      if (!a || a.action === '') return false;
      if (a.action === 'adjusted' && !a.comment.trim()) return false;
      return true;
    });
  }

  async function submitCaseDecisions(c: ModerationCase) {
    if (!profile || !canSubmitCase(c)) return;
    setSubmitting(true);
    try {
      const actions = compActions[c.id] || {};
      const now = new Date().toISOString();

      const execDecisions: ExecDecision[] = c.valuesRatings.map(vr => {
        const a = actions[vr.competency_id];
        const dlDecision = c.dept_lead_decisions.find(d => d.competency_id === vr.competency_id);
        const dlRating = dlDecision ? dlDecision.dl_rating : vr.manager_rating;
        return {
          competency_id: vr.competency_id,
          competency_name: vr.competency_title,
          original_rating: vr.manager_rating,
          dl_rating: dlRating,
          final_rating: a.action === 'adjusted' ? a.rating : dlRating,
          exec_comment: a.comment.trim(),
          action: a.action as 'approved' | 'adjusted',
          decided_at: now,
        };
      });

      const anyAdjusted = execDecisions.some(d => d.action === 'adjusted');

      // Update moderation case with exec decisions and mark final
      const { error: caseErr } = await supabase
        .from('moderation_cases')
        .update({
          exec_decisions: execDecisions,
          status: anyAdjusted ? 'adjusted' : 'approved',
          final_rating: null,
          updated_at: now,
        })
        .eq('id', c.id);
      if (caseErr) throw caseErr;

      // Audit log
      const { error: decErr } = await supabase.from('moderation_case_decisions').insert({
        case_id: c.id,
        step_number: 2,
        step_name: 'Executive Review',
        decided_by: profile.id,
        decision: anyAdjusted ? 'adjust_rating' : 'approve',
        notes: anyAdjusted
          ? execDecisions.filter(d => d.action === 'adjusted').map(d => `${d.competency_name}: ${d.exec_comment}`).join('; ')
          : null,
        adjusted_rating: null,
      });
      if (decErr) throw decErr;

      // Update the monthly review's values_ratings with final exec ratings
      if (c.reviewId) {
        const { data: reviewData } = await supabase
          .from('one_to_one_monthly_reviews')
          .select('values_ratings')
          .eq('id', c.reviewId)
          .maybeSingle();

        if (reviewData?.values_ratings) {
          const updatedRatings = (reviewData.values_ratings as ValuesRatingRow[]).map(vr => {
            const execDec = execDecisions.find(d => d.competency_id === vr.competency_id);
            if (execDec) {
              return { ...vr, manager_rating: execDec.final_rating, moderated_rating: execDec.final_rating };
            }
            return vr;
          });
          await supabase
            .from('one_to_one_monthly_reviews')
            .update({ values_ratings: updatedRatings, moderation_status: anyAdjusted ? 'adjusted' : 'approved' })
            .eq('id', c.reviewId);
        }
      }

      // Notify manager with per-competency notifications for any adjusted
      const adjustedDecisions = execDecisions.filter(d => d.action === 'adjusted');
      if (adjustedDecisions.length > 0) {
        await Promise.all(adjustedDecisions.map(d =>
          supabase.from('review_notifications').insert({
            recipient_id: c.manager_id,
            sender_id: profile.id,
            notification_type: 'moderation_final_rating_adjusted',
            title: 'Final Competency Rating Adjusted by Executive',
            message: `The final rating for ${c.employee?.full_name} — ${d.competency_name}: rating ${d.dl_rating}/5 has been adjusted to ${d.final_rating}/5 by the Executive moderator.\n\nFeedback: ${d.exec_comment}`,
            competency_name: d.competency_name,
            original_rating: d.original_rating,
            moderated_rating: d.final_rating,
            moderator_level: 'exec',
            is_read: false,
          })
        ));
      } else {
        await supabase.from('review_notifications').insert({
          recipient_id: c.manager_id,
          sender_id: profile.id,
          notification_type: 'moderation_final_approved',
          title: 'All Competency Ratings Approved by Executive',
          message: `All competency ratings for ${c.employee?.full_name} have been approved by the Executive moderator. Ratings are now final.`,
          is_read: false,
        });
      }

      setCompActions(prev => {
        const next = { ...prev };
        delete next[c.id];
        return next;
      });

      await loadCases();
    } finally {
      setSubmitting(false);
    }
  }

  const pendingCount = cases.filter(c => !['approved', 'rejected', 'adjusted'].includes(c.status)).length;

  if (hasExecAccess === null) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-6 h-6 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (hasExecAccess === false) {
    return (
      <div className="card p-10 text-center">
        <Gavel className="w-10 h-10 text-slate-300 mx-auto mb-3" />
        <p className="font-medium text-slate-700">Executive Moderation Access Required</p>
        <p className="text-sm text-slate-400 mt-1">
          You do not have permission to perform executive moderation. Contact your administrator to request access.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-slate-800 rounded-xl">
            <Gavel className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">Executive Moderation Queue</h2>
            <p className="text-sm text-slate-500">Final approval per competency — your decision becomes the saved rating</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {pendingCount > 0 && (
            <span className="bg-amber-100 text-amber-800 text-xs font-semibold px-2.5 py-1 rounded-full border border-amber-200">
              {pendingCount} awaiting exec
            </span>
          )}
          <div className="flex rounded-lg border border-slate-200 overflow-hidden">
            {(['pending', 'all'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                  filter === f ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                {f === 'pending' ? 'Needs Action' : 'All Cases'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-6 h-6 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : cases.length === 0 ? (
        <div className="card p-10 text-center">
          <CheckCircle2 className="w-10 h-10 text-green-400 mx-auto mb-3" />
          <p className="font-medium text-slate-700">No cases awaiting executive review</p>
          <p className="text-sm text-slate-400 mt-1">
            {filter === 'pending' ? 'All cases have been finalised.' : 'No moderation cases exist yet.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {cases.map(c => {
            const isExpanded = expandedId === c.id;
            const statusMeta = STATUS_LABELS[c.status] || STATUS_LABELS.pending;
            const canAction = c.current_step === 2 && ['in_review', 'pending'].includes(c.status);
            const caseActions = compActions[c.id] || {};
            const isFinalised = ['approved', 'adjusted', 'rejected'].includes(c.status);

            return (
              <div key={c.id} className="card border border-slate-200 overflow-hidden">
                <button
                  className="w-full text-left p-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
                  onClick={() => {
                    const opening = expandedId !== c.id;
                    setExpandedId(opening ? c.id : null);
                    if (opening && canAction && !compActions[c.id]) {
                      setCompActions(prev => ({ ...prev, [c.id]: initActionsForCase(c) }));
                    }
                  }}
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="p-2 bg-slate-100 rounded-lg shrink-0">
                      <User className="w-4 h-4 text-slate-600" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-slate-900">{c.employee?.full_name}</span>
                        <span className="text-xs text-slate-400">•</span>
                        <span className="text-xs text-slate-500">{c.employee?.department}</span>
                        <span className="text-xs text-slate-300">|</span>
                        <span className="text-xs text-slate-500">{c.employee?.job_title}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <span className="text-xs text-slate-400 flex items-center gap-1">
                          <Users className="w-3 h-3" /> {c.manager?.full_name}
                        </span>
                        <span className="text-xs text-slate-300">|</span>
                        <span className="text-xs text-slate-400">
                          {c.valuesRatings.length} competenc{c.valuesRatings.length === 1 ? 'y' : 'ies'}
                        </span>
                        <span className="text-xs text-slate-300">|</span>
                        <span className="text-xs text-slate-400">{format(new Date(c.created_at), 'd MMM yyyy')}</span>
                        {c.current_step === 1 && !isFinalised && (
                          <>
                            <span className="text-xs text-slate-300">|</span>
                            <span className="text-xs text-amber-600 font-medium">Awaiting Dept Lead</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 ml-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${statusMeta.color}`}>
                      {statusMeta.label}
                    </span>
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t border-slate-100 p-4 space-y-4 bg-slate-50/40">
                    {/* Opal summary */}
                    {c.ai_summary && (
                      <div className="bg-sky-50 border border-sky-200 rounded-xl p-4">
                        <p className="text-xs font-semibold text-sky-700 mb-1.5 flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5" /> Opal Moderation Guidance
                        </p>
                        <p className="text-sm text-sky-900">{c.ai_summary}</p>
                      </div>
                    )}

                    {/* Step 1 awaiting DL */}
                    {!readOnly && !canAction && c.current_step === 1 && ['in_review', 'pending'].includes(c.status) && (
                      <div className="flex items-center gap-2 px-4 py-3 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-800">
                        <Clock className="w-4 h-4 shrink-0" />
                        Awaiting Department Lead review. This case will reach exec once the dept lead has reviewed each competency.
                      </div>
                    )}

                    {/* Manager override note */}
                    {c.manager_override && c.manager_override_notes && (
                      <div className="bg-orange-50 border border-orange-200 rounded-xl p-3.5">
                        <p className="text-xs font-semibold text-orange-700 mb-1">Manager Override Reason</p>
                        <p className="text-sm text-orange-800">{c.manager_override_notes}</p>
                      </div>
                    )}

                    {/* Per-competency exec moderation rows */}
                    {c.valuesRatings.length > 0 && (
                      <div className="space-y-4">
                        {c.valuesRatings.map(vr => {
                          const dlDecision = c.dept_lead_decisions.find(d => d.competency_id === vr.competency_id);
                          const execDecision = c.exec_decisions.find(d => d.competency_id === vr.competency_id);
                          const localAction = caseActions[vr.competency_id];
                          const dlRating = dlDecision ? dlDecision.dl_rating : vr.manager_rating;
                          const isAlreadyFinalised = !!execDecision && isFinalised;

                          return (
                            <div key={vr.competency_id} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                              {/* Competency header */}
                              <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between flex-wrap gap-2">
                                <div>
                                  <p className="text-xs text-slate-400 uppercase tracking-wide mb-0.5">{vr.value_title}</p>
                                  <p className="text-sm font-semibold text-slate-900">{vr.competency_title}</p>
                                </div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-medium border border-slate-200">
                                    Manager: {vr.manager_rating}/5
                                  </span>
                                  {dlDecision && (
                                    <span className={`text-xs font-medium px-2 py-0.5 rounded border ${
                                      dlDecision.action === 'adjusted'
                                        ? 'bg-orange-100 text-orange-800 border-orange-200'
                                        : 'bg-blue-100 text-blue-800 border-blue-200'
                                    }`}>
                                      DL: {dlDecision.action === 'adjusted' ? `Adjusted to ${dlDecision.dl_rating}/5` : `Approved ${dlDecision.dl_rating}/5`}
                                    </span>
                                  )}
                                  {execDecision && (
                                    <span className={`text-xs font-semibold px-2 py-0.5 rounded border ${
                                      execDecision.action === 'adjusted'
                                        ? 'bg-orange-100 text-orange-800 border-orange-200'
                                        : 'bg-green-100 text-green-800 border-green-200'
                                    }`}>
                                      Final: {execDecision.final_rating}/5
                                    </span>
                                  )}
                                </div>
                              </div>

                              <div className="p-4 space-y-3">
                                {/* Manager evidence */}
                                <div className="bg-slate-50 rounded-lg p-3">
                                  <p className="text-xs font-semibold text-slate-500 mb-1 flex items-center gap-1.5">
                                    <MessageSquare className="w-3 h-3" /> Manager Evidence
                                  </p>
                                  <p className="text-sm text-slate-800 leading-relaxed">
                                    {vr.manager_comment || <span className="italic text-slate-400">No evidence provided</span>}
                                  </p>
                                </div>

                                {/* DL context */}
                                {dlDecision && (
                                  <div className={`rounded-lg p-3 border ${
                                    dlDecision.action === 'adjusted'
                                      ? 'bg-orange-50 border-orange-200'
                                      : 'bg-blue-50 border-blue-200'
                                  }`}>
                                    <p className={`text-xs font-semibold mb-1 ${
                                      dlDecision.action === 'adjusted' ? 'text-orange-700' : 'text-blue-700'
                                    }`}>
                                      Department Lead Decision
                                    </p>
                                    <p className={`text-sm ${dlDecision.action === 'adjusted' ? 'text-orange-800' : 'text-blue-800'}`}>
                                      {dlDecision.action === 'adjusted'
                                        ? `Rating adjusted from ${dlDecision.original_rating}/5 to ${dlDecision.dl_rating}/5 — ${RATING_LABELS[dlDecision.dl_rating]}`
                                        : `Rating approved at ${dlDecision.dl_rating}/5 — ${RATING_LABELS[dlDecision.dl_rating]}`}
                                    </p>
                                    {dlDecision.dl_comment && (
                                      <p className="text-xs text-slate-600 mt-1 italic">"{dlDecision.dl_comment}"</p>
                                    )}
                                  </div>
                                )}

                                {/* Guidance */}
                                {(vr.what_good_looks_like || vr.what_great_looks_like) && (
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {vr.what_good_looks_like && (
                                      <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
                                        <p className="text-xs font-semibold text-blue-700 mb-1">What Good Looks Like</p>
                                        <p className="text-xs text-blue-800 leading-relaxed">{vr.what_good_looks_like}</p>
                                      </div>
                                    )}
                                    {vr.what_great_looks_like && (
                                      <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-3">
                                        <p className="text-xs font-semibold text-emerald-700 mb-1">What Great Looks Like</p>
                                        <p className="text-xs text-emerald-800 leading-relaxed">{vr.what_great_looks_like}</p>
                                      </div>
                                    )}
                                  </div>
                                )}

                                {/* Exec action area */}
                                {canAction && !readOnly && localAction !== undefined && (
                                  <div className="space-y-3 pt-1 border-t border-slate-100">
                                    <p className="text-xs font-semibold text-slate-700 flex items-center gap-1.5 mt-2">
                                      <Gavel className="w-3.5 h-3.5" /> Your Final Decision
                                      <span className="text-slate-400 font-normal ml-1">
                                        — current rating: {dlRating}/5 ({RATING_LABELS[dlRating]})
                                      </span>
                                    </p>
                                    <div className="flex gap-2">
                                      <button
                                        onClick={() => setCompAction(c.id, vr.competency_id, { action: 'approved', rating: dlRating })}
                                        className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-all ${
                                          localAction.action === 'approved'
                                            ? 'bg-green-600 text-white border-green-600'
                                            : 'bg-green-50 text-green-800 border-green-300 hover:bg-green-100'
                                        }`}
                                      >
                                        <CheckCircle2 className="w-3.5 h-3.5" />
                                        Approve
                                      </button>
                                      <button
                                        onClick={() => setCompAction(c.id, vr.competency_id, { action: 'adjusted' })}
                                        className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-all ${
                                          localAction.action === 'adjusted'
                                            ? 'bg-orange-600 text-white border-orange-600'
                                            : 'bg-orange-50 text-orange-800 border-orange-300 hover:bg-orange-100'
                                        }`}
                                      >
                                        <Star className="w-3.5 h-3.5" />
                                        Adjust Final Rating
                                      </button>
                                    </div>

                                    {localAction.action === 'adjusted' && (
                                      <div>
                                        <p className="text-xs font-medium text-slate-600 mb-1.5">Final Rating</p>
                                        <div className="flex gap-1.5 flex-wrap">
                                          {[1, 2, 3, 4, 5].map(r => (
                                            <button
                                              key={r}
                                              onClick={() => setCompAction(c.id, vr.competency_id, { rating: r })}
                                              className={`px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                                                localAction.rating === r
                                                  ? 'bg-slate-900 text-white border-slate-900'
                                                  : 'bg-white text-slate-700 border-slate-200 hover:border-slate-400'
                                              }`}
                                            >
                                              {r} — {RATING_LABELS[r]}
                                            </button>
                                          ))}
                                        </div>
                                      </div>
                                    )}

                                    <div>
                                      <label className="text-xs font-medium text-slate-600">
                                        Executive Feedback
                                        {localAction.action === 'adjusted' && <span className="text-red-500 ml-1">*required</span>}
                                        {localAction.action === 'approved' && <span className="text-slate-400 ml-1">(optional)</span>}
                                      </label>
                                      <textarea
                                        rows={2}
                                        value={localAction.comment}
                                        onChange={e => setCompAction(c.id, vr.competency_id, { comment: e.target.value })}
                                        placeholder={
                                          localAction.action === 'adjusted'
                                            ? 'Explain the reason for the final rating adjustment...'
                                            : 'Optional final feedback for the manager...'
                                        }
                                        className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-slate-400 focus:outline-none resize-none"
                                      />
                                    </div>
                                  </div>
                                )}

                                {/* Finalised exec decision */}
                                {isAlreadyFinalised && execDecision && (
                                  <div className={`rounded-lg p-3 border ${
                                    execDecision.action === 'adjusted'
                                      ? 'bg-orange-50 border-orange-200'
                                      : 'bg-green-50 border-green-200'
                                  }`}>
                                    <p className={`text-xs font-semibold mb-1 ${
                                      execDecision.action === 'adjusted' ? 'text-orange-700' : 'text-green-700'
                                    }`}>
                                      Executive Final Decision
                                    </p>
                                    <p className={`text-sm font-medium ${execDecision.action === 'adjusted' ? 'text-orange-800' : 'text-green-800'}`}>
                                      Final rating: {execDecision.final_rating}/5 — {RATING_LABELS[execDecision.final_rating]}
                                    </p>
                                    {execDecision.exec_comment && (
                                      <p className="text-xs text-slate-600 mt-1 italic">"{execDecision.exec_comment}"</p>
                                    )}
                                    <p className="text-xs text-slate-400 mt-1">
                                      <Clock className="w-3 h-3 inline mr-1" />
                                      {format(new Date(execDecision.decided_at), 'd MMM yyyy HH:mm')}
                                    </p>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Submit all exec decisions */}
                    {canAction && !readOnly && c.valuesRatings.length > 0 && (
                      <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                        <div className="text-xs text-slate-500">
                          {Object.values(caseActions).filter(a => a.action !== '').length} of {c.valuesRatings.length} competencies actioned
                        </div>
                        <button
                          onClick={() => submitCaseDecisions(c)}
                          disabled={!canSubmitCase(c) || submitting}
                          className="flex items-center gap-2 px-5 py-2 bg-slate-900 text-white text-sm font-semibold rounded-lg hover:bg-slate-700 disabled:opacity-40 transition-colors"
                        >
                          {submitting ? (
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <Send className="w-4 h-4" />
                          )}
                          Confirm Final Ratings
                        </button>
                      </div>
                    )}

                    {/* Read-only notice */}
                    {readOnly && (
                      <div className="flex items-center gap-2 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
                        <Eye className="w-4 h-4 shrink-0" />
                        Viewing in read-only mode. Actions are disabled.
                      </div>
                    )}

                    {/* Finalised summary */}
                    {isFinalised && (
                      <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-xl text-sm">
                        <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
                        <div>
                          <span className="font-semibold text-green-800">All final ratings confirmed. </span>
                          <span className="text-green-700">Manager has been notified.</span>
                        </div>
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
  );
}
