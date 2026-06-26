import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import {
  ShieldCheck, ChevronDown, ChevronUp, CheckCircle2, AlertCircle,
  MessageSquare, Star, Send, Clock, User, Users, Sparkles, Loader2
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
  employee_id: string;
  manager_id: string;
  employee: { id: string; full_name: string; job_title: string; department: string } | null;
  manager: { id: string; full_name: string } | null;
  valuesRatings: ValuesRatingRow[];
  reviewId: string | null;
  reviewMonth: string | null;
}

interface CompetencyAction {
  action: 'approved' | 'adjusted' | '';
  rating: number;
  comment: string;
  seraFeedback?: string;
  seraValidating?: boolean;
}

const RATING_LABELS: Record<number, string> = {
  0: 'Not Rated',
  1: 'Development Needed',
  2: 'Below Target',
  3: 'On Target',
  4: 'Above Target',
  5: 'Exceptional',
};

interface DeptLeadModerationPanelProps {
  department?: string;
  readOnly?: boolean;
}

export default function DeptLeadModerationPanel({ department, readOnly = false }: DeptLeadModerationPanelProps) {
  const { effectiveProfile: profile } = useAuth();
  const [pendingCases, setPendingCases] = useState<ModerationCase[]>([]);
  const [completedCases, setCompletedCases] = useState<ModerationCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<'pending' | 'completed'>('pending');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Per-case per-competency action state
  const [compActions, setCompActions] = useState<Record<string, Record<string, CompetencyAction>>>({});

  useEffect(() => { loadCases(); }, [department]);

  async function loadCases() {
    setLoading(true);
    try {
      let deptEmployeeIds: string[] | null = null;
      if (department) {
        const { data: deptProfiles } = await supabase
          .from('profiles')
          .select('id')
          .eq('department', department)
          .eq('active', true);
        deptEmployeeIds = (deptProfiles || []).map((p: any) => p.id);
        if (deptEmployeeIds.length === 0) {
          setPendingCases([]);
          setCompletedCases([]);
          setLoading(false);
          return;
        }
      }

      let q = supabase
        .from('moderation_cases')
        .select(`
          id, source_type, source_id, manager_justification, ai_validation_status, ai_summary,
          manager_override, manager_override_notes, current_step, status, created_at,
          employee_id, manager_id, dept_lead_decisions, review_id
        `)
        .eq('current_step', 1)
        .order('created_at', { ascending: false });

      if (deptEmployeeIds) {
        q = q.in('employee_id', deptEmployeeIds);
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

      const effectiveReviewId = (c: any): string | null =>
        c.review_id || (c.source_type === 'competency_assessment' ? c.source_id : null) || null;
      const reviewIds = [...new Set(allCases.map(effectiveReviewId).filter(Boolean))];
      let reviewMap: Record<string, { ratings: ValuesRatingRow[]; month: string | null }> = {};
      if (reviewIds.length > 0) {
        const { data: reviews } = await supabase
          .from('one_to_one_monthly_reviews')
          .select('id, values_ratings, review_month')
          .in('id', reviewIds);
        (reviews || []).forEach((r: any) => {
          reviewMap[r.id] = {
            ratings: (r.values_ratings || []).filter((vr: any) => vr.manager_rating >= 4),
            month: r.review_month || null,
          };
        });
      }

      const enriched: ModerationCase[] = allCases.map((c: any) => {
        const rid = effectiveReviewId(c);
        const rv = rid ? reviewMap[rid] : null;
        return {
          ...c,
          employee: profileMap[c.employee_id] || null,
          manager: profileMap[c.manager_id] || null,
          dept_lead_decisions: c.dept_lead_decisions || [],
          valuesRatings: rv?.ratings || [],
          reviewId: rid,
          reviewMonth: rv?.month || null,
        };
      });

      setPendingCases(enriched.filter(c => ['pending', 'in_review'].includes(c.status)));
      setCompletedCases(enriched.filter(c => !['pending', 'in_review'].includes(c.status)));
    } finally {
      setLoading(false);
    }
  }

  function initActionsForCase(c: ModerationCase) {
    const init: Record<string, CompetencyAction> = {};
    c.valuesRatings.forEach(vr => {
      const existing = c.dept_lead_decisions.find(d => d.competency_id === vr.competency_id);
      init[vr.competency_id] = existing
        ? { action: existing.action, rating: existing.dl_rating, comment: existing.dl_comment }
        : { action: '', rating: vr.manager_rating, comment: '' };
    });
    return init;
  }

  function setCompAction(caseId: string, competencyId: string, update: Partial<CompetencyAction>) {
    setCompActions(prev => ({
      ...prev,
      [caseId]: {
        ...(prev[caseId] || {}),
        [competencyId]: { ...(prev[caseId]?.[competencyId] || { action: '', rating: 3, comment: '' }), ...update },
      },
    }));
  }

  async function callSeraForAdjustment(
    caseId: string,
    vr: ValuesRatingRow,
    newRating: number,
    justification: string,
    employeeName: string,
  ) {
    if (!justification.trim()) return;
    setCompAction(caseId, vr.competency_id, { seraValidating: true, seraFeedback: undefined });
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/validate-rating-justification`;
      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          rating: newRating,
          ratingType: 'competency',
          ratingLabel: RATING_LABELS[newRating] || String(newRating),
          competencyName: vr.competency_title,
          competencyStatement: vr.competency_statement || '',
          whatGoodLooksLike: vr.what_good_looks_like || '',
          whatGreatLooksLike: vr.what_great_looks_like || '',
          employeeName,
          managerComments: justification,
          seraSystemPrompt: `You are SERA, an AI coaching assistant reviewing a Department Lead's moderation decision. The DL has adjusted a competency rating. Coach the justification to ensure it is clear, evidence-based, and professional. Be supportive and constructive. Keep feedback to 1-2 sentences.`,
        }),
      });
      if (res.ok) {
        const result = await res.json();
        setCompAction(caseId, vr.competency_id, { seraFeedback: result.message, seraValidating: false });
      } else {
        setCompAction(caseId, vr.competency_id, { seraValidating: false });
      }
    } catch {
      setCompAction(caseId, vr.competency_id, { seraValidating: false });
    }
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

      const dlDecisions: DLDecision[] = c.valuesRatings.map(vr => {
        const a = actions[vr.competency_id];
        return {
          competency_id: vr.competency_id,
          competency_name: vr.competency_title,
          original_rating: vr.manager_rating,
          dl_rating: a.action === 'adjusted' ? a.rating : vr.manager_rating,
          dl_comment: a.comment.trim(),
          action: a.action as 'approved' | 'adjusted',
          decided_at: now,
        };
      });

      const anyAdjusted = dlDecisions.some(d => d.action === 'adjusted');
      const newStatus = anyAdjusted ? 'adjusted' : 'approved';

      const { error: caseErr } = await supabase
        .from('moderation_cases')
        .update({
          dept_lead_decisions: dlDecisions,
          status: newStatus,
          current_step: 1,
          updated_at: now,
        })
        .eq('id', c.id);
      if (caseErr) throw caseErr;

      await supabase.from('moderation_case_decisions').insert({
        case_id: c.id,
        step_number: 1,
        step_name: 'Department Lead Review',
        decided_by: profile.id,
        decision: anyAdjusted ? 'adjust_rating' : 'approve',
        notes: anyAdjusted
          ? dlDecisions.filter(d => d.action === 'adjusted').map(d => `${d.competency_name}: ${d.dl_comment}`).join('; ')
          : null,
        adjusted_rating: null,
      });

      // Update the review's values_ratings with final DL ratings
      if (c.reviewId) {
        const { data: reviewData } = await supabase
          .from('one_to_one_monthly_reviews')
          .select('values_ratings')
          .eq('id', c.reviewId)
          .maybeSingle();
        if (reviewData?.values_ratings) {
          const updatedRatings = (reviewData.values_ratings as ValuesRatingRow[]).map(vr => {
            const dec = dlDecisions.find(d => d.competency_id === vr.competency_id);
            if (dec) return { ...vr, manager_rating: dec.dl_rating, moderated_rating: dec.dl_rating };
            return vr;
          });
          await supabase
            .from('one_to_one_monthly_reviews')
            .update({ values_ratings: updatedRatings, moderation_status: anyAdjusted ? 'adjusted' : 'approved' })
            .eq('id', c.reviewId);
        }
      }

      // Notify manager
      if (anyAdjusted) {
        const adjustedDecisions = dlDecisions.filter(d => d.action === 'adjusted');
        await Promise.all(adjustedDecisions.map(d =>
          supabase.from('review_notifications').insert({
            recipient_id: c.manager_id,
            sender_id: profile.id,
            notification_type: 'moderation_rating_adjusted',
            title: 'Competency Rating Adjusted by Department Lead',
            message: `Your rating for ${c.employee?.full_name} — ${d.competency_name}: original rating ${d.original_rating}/5 has been adjusted to ${d.dl_rating}/5.\n\nFeedback: ${d.dl_comment}`,
            competency_name: d.competency_name,
            original_rating: d.original_rating,
            moderated_rating: d.dl_rating,
            moderator_level: 'dept_lead',
            is_read: false,
          })
        ));
      } else {
        await supabase.from('review_notifications').insert({
          recipient_id: c.manager_id,
          sender_id: profile.id,
          notification_type: 'moderation_finalised',
          title: 'Competency Ratings Approved — Moderation Complete',
          message: `All competency ratings for ${c.employee?.full_name} have been approved. Moderation is now complete.`,
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

  const displayCases = activeSection === 'pending' ? pendingCases : completedCases;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-amber-100 rounded-xl">
            <ShieldCheck className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">Department Moderation</h2>
            <p className="text-sm text-slate-500">Review and action each competency rating individually</p>
          </div>
        </div>
        {pendingCases.length > 0 && (
          <span className="bg-amber-100 text-amber-800 text-xs font-semibold px-2.5 py-1 rounded-full border border-amber-200">
            {pendingCases.length} pending
          </span>
        )}
      </div>

      {/* Section tabs */}
      <div className="flex rounded-xl border border-slate-200 overflow-hidden w-fit">
        {(['pending', 'completed'] as const).map(s => (
          <button
            key={s}
            onClick={() => { setActiveSection(s); setExpandedId(null); }}
            className={`px-5 py-2 text-sm font-medium transition-colors ${
              activeSection === s ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            {s === 'pending' ? `Pending (${pendingCases.length})` : `Completed (${completedCases.length})`}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-6 h-6 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : displayCases.length === 0 ? (
        <div className="card p-10 text-center">
          <CheckCircle2 className="w-10 h-10 text-green-400 mx-auto mb-3" />
          <p className="font-medium text-slate-700">
            {activeSection === 'pending' ? 'No pending cases' : 'No completed cases'}
          </p>
          <p className="text-sm text-slate-400 mt-1">
            {activeSection === 'pending'
              ? 'All cases in your department have been actioned.'
              : 'Completed moderation cases will appear here.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {displayCases.map(c => {
            const isExpanded = expandedId === c.id;
            const isPending = ['pending', 'in_review'].includes(c.status);
            const canAction = isPending && !readOnly;
            const caseActions = compActions[c.id] || {};

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
                        <span className="text-xs text-slate-500">{c.employee?.job_title}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <span className="text-xs text-slate-400 flex items-center gap-1">
                          <Users className="w-3 h-3" /> {c.manager?.full_name}
                        </span>
                        {c.reviewMonth && (
                          <>
                            <span className="text-xs text-slate-300">|</span>
                            <span className="text-xs text-slate-400">
                              {format(new Date(c.reviewMonth + 'T12:00:00'), 'MMMM yyyy')}
                            </span>
                          </>
                        )}
                        <span className="text-xs text-slate-300">|</span>
                        <span className="text-xs text-slate-400">
                          {isPending
                            ? `${c.valuesRatings.length} competenc${c.valuesRatings.length === 1 ? 'y' : 'ies'} to review`
                            : `${c.dept_lead_decisions.length} competenc${c.dept_lead_decisions.length === 1 ? 'y' : 'ies'} reviewed`}
                        </span>
                        <span className="text-xs text-slate-300">|</span>
                        <span className="text-xs text-slate-400">{format(new Date(c.created_at), 'd MMM yyyy')}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 ml-3">
                    {isPending ? (
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full border bg-amber-100 text-amber-800 border-amber-200">
                        Pending
                      </span>
                    ) : (
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${
                        c.status === 'adjusted'
                          ? 'bg-orange-100 text-orange-800 border-orange-200'
                          : 'bg-green-100 text-green-800 border-green-200'
                      }`}>
                        {c.status === 'adjusted' ? 'Adjusted' : 'Approved'}
                      </span>
                    )}
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t border-slate-100 p-4 space-y-4 bg-slate-50/40">

                    {/* ── COMPLETED CASE VIEW ── */}
                    {!isPending && (
                      <>
                        {/* Final status banner */}
                        <div className={`rounded-xl p-3 border flex items-center gap-3 ${
                          c.status === 'adjusted'
                            ? 'bg-orange-50 border-orange-200'
                            : 'bg-green-50 border-green-200'
                        }`}>
                          <CheckCircle2 className={`w-5 h-5 shrink-0 ${c.status === 'adjusted' ? 'text-orange-600' : 'text-green-600'}`} />
                          <div>
                            <p className={`text-sm font-semibold ${c.status === 'adjusted' ? 'text-orange-800' : 'text-green-800'}`}>
                              Moderation {c.status === 'adjusted' ? 'Adjusted' : 'Accepted'}
                            </p>
                            <p className={`text-xs mt-0.5 ${c.status === 'adjusted' ? 'text-orange-700' : 'text-green-700'}`}>
                              {c.status === 'adjusted'
                                ? 'One or more ratings were adjusted by the Department Lead.'
                                : 'All manager ratings were accepted without change.'}
                            </p>
                          </div>
                        </div>

                        {/* Review period & manager */}
                        <div className="grid grid-cols-2 gap-3">
                          {c.reviewMonth && (
                            <div className="bg-white rounded-lg border border-slate-200 p-3">
                              <p className="text-xs font-semibold text-slate-500 mb-1">Review Period</p>
                              <p className="text-sm text-slate-800">{format(new Date(c.reviewMonth + 'T12:00:00'), 'MMMM yyyy')}</p>
                            </div>
                          )}
                          <div className="bg-white rounded-lg border border-slate-200 p-3">
                            <p className="text-xs font-semibold text-slate-500 mb-1">Manager</p>
                            <p className="text-sm text-slate-800">{c.manager?.full_name || '—'}</p>
                          </div>
                        </div>

                        {/* Manager overall justification */}
                        {c.manager_justification && (
                          <div className="bg-white rounded-xl border border-slate-200 p-3.5">
                            <p className="text-xs font-semibold text-slate-500 mb-1.5 flex items-center gap-1.5">
                              <MessageSquare className="w-3 h-3" /> Manager Evidence / Justification
                            </p>
                            <p className="text-sm text-slate-800 leading-relaxed">{c.manager_justification}</p>
                          </div>
                        )}

                        {/* SERA summary */}
                        {c.ai_summary && (
                          <div className="bg-sky-50 border border-sky-200 rounded-xl p-4">
                            <p className="text-xs font-semibold text-sky-700 mb-1.5 flex items-center gap-1.5">
                              <Sparkles className="w-3.5 h-3.5" /> SERA Recommendation
                            </p>
                            <p className="text-sm text-sky-900">{c.ai_summary}</p>
                          </div>
                        )}

                        {/* Per-competency DL decisions */}
                        {c.dept_lead_decisions.length > 0 && (
                          <div>
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                              Competency Decisions ({c.dept_lead_decisions.filter(d => d.action === 'adjusted').length} adjusted · {c.dept_lead_decisions.filter(d => d.action === 'approved').length} accepted)
                            </p>
                            <div className="space-y-2">
                              {c.dept_lead_decisions.map((d, i) => (
                                <div key={i} className={`rounded-lg border p-3 ${
                                  d.action === 'adjusted'
                                    ? 'bg-orange-50 border-orange-200'
                                    : 'bg-green-50 border-green-200'
                                }`}>
                                  <div className="flex items-start justify-between gap-2 flex-wrap">
                                    <p className="text-sm font-medium text-slate-800">{d.competency_name}</p>
                                    <div className="flex items-center gap-1.5 flex-shrink-0">
                                      <span className="text-xs text-slate-500">Manager: {d.original_rating}/5</span>
                                      {d.action === 'adjusted' ? (
                                        <>
                                          <span className="text-xs text-slate-400">→</span>
                                          <span className="text-xs font-semibold text-orange-700">{d.dl_rating}/5 Final</span>
                                          <span className="text-xs bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded font-medium border border-orange-200">Adjusted</span>
                                        </>
                                      ) : (
                                        <>
                                          <span className="text-xs font-semibold text-green-700">{d.dl_rating}/5 Final</span>
                                          <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-medium border border-green-200">Accepted</span>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                  {d.dl_comment?.trim() && (
                                    <p className="text-xs text-slate-600 mt-1.5 leading-relaxed italic">"{d.dl_comment}"</p>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    )}

                    {/* ── PENDING CASE VIEW ── */}
                    {isPending && (
                      <>
                        {/* SERA summary from original submission */}
                        {c.ai_summary && (
                          <div className="bg-sky-50 border border-sky-200 rounded-xl p-4">
                            <p className="text-xs font-semibold text-sky-700 mb-1.5 flex items-center gap-1.5">
                              <Sparkles className="w-3.5 h-3.5" /> SERA Moderation Guidance
                            </p>
                            <p className="text-sm text-sky-900">{c.ai_summary}</p>
                          </div>
                        )}

                        {/* Manager override note */}
                        {c.manager_override && c.manager_override_notes && (
                          <div className="bg-orange-50 border border-orange-200 rounded-xl p-3.5">
                            <p className="text-xs font-semibold text-orange-700 mb-1">Manager Override Reason</p>
                            <p className="text-sm text-orange-800">{c.manager_override_notes}</p>
                          </div>
                        )}

                        {c.valuesRatings.length === 0 && (
                          <div className="flex items-center gap-2 p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-500">
                            <AlertCircle className="w-4 h-4 text-slate-400 shrink-0" />
                            No competency ratings (4 or 5) found for this case.
                          </div>
                        )}

                    {/* Per-competency rows */}
                    {c.valuesRatings.length > 0 && (
                      <div className="space-y-4">
                        {c.valuesRatings.map(vr => {
                          const existingDecision = c.dept_lead_decisions.find(d => d.competency_id === vr.competency_id);
                          const localAction = caseActions[vr.competency_id];

                          return (
                            <div key={vr.competency_id} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                              {/* Competency header */}
                              <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between flex-wrap gap-2">
                                <div>
                                  <p className="text-xs text-slate-400 uppercase tracking-wide mb-0.5">{vr.value_title}</p>
                                  <p className="text-sm font-semibold text-slate-900">{vr.competency_title}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                                    vr.manager_rating === 5
                                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                      : 'bg-amber-100 text-amber-800 border border-amber-200'
                                  }`}>
                                    Manager rated: {vr.manager_rating}/5 — {RATING_LABELS[vr.manager_rating]}
                                  </span>
                                  {existingDecision && (
                                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${
                                      existingDecision.action === 'adjusted'
                                        ? 'bg-orange-100 text-orange-800 border-orange-200'
                                        : 'bg-green-100 text-green-800 border-green-200'
                                    }`}>
                                      DL: {existingDecision.action === 'adjusted' ? `Adjusted to ${existingDecision.dl_rating}/5` : 'Approved'}
                                    </span>
                                  )}
                                </div>
                              </div>

                              <div className="p-4 space-y-3">
                                {/* Competency guidance */}
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

                                {/* Manager evidence */}
                                <div className="bg-slate-50 rounded-lg p-3">
                                  <p className="text-xs font-semibold text-slate-500 mb-1 flex items-center gap-1.5">
                                    <MessageSquare className="w-3 h-3" /> Manager Evidence
                                  </p>
                                  <p className="text-sm text-slate-800 leading-relaxed">
                                    {vr.manager_comment || <span className="italic text-slate-400">No evidence provided</span>}
                                  </p>
                                </div>

                                {/* DL action — actionable */}
                                {canAction && localAction !== undefined && (
                                  <div className="space-y-3 pt-1">
                                    <div className="flex gap-2">
                                      <button
                                        onClick={() => setCompAction(c.id, vr.competency_id, { action: 'approved', rating: vr.manager_rating, seraFeedback: undefined })}
                                        className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-all ${
                                          localAction.action === 'approved'
                                            ? 'bg-green-600 text-white border-green-600'
                                            : 'bg-green-50 text-green-800 border-green-300 hover:bg-green-100'
                                        }`}
                                      >
                                        <CheckCircle2 className="w-3.5 h-3.5" />
                                        Accept Rating
                                      </button>
                                      <button
                                        onClick={() => setCompAction(c.id, vr.competency_id, { action: 'adjusted', seraFeedback: undefined })}
                                        className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-all ${
                                          localAction.action === 'adjusted'
                                            ? 'bg-orange-600 text-white border-orange-600'
                                            : 'bg-orange-50 text-orange-800 border-orange-300 hover:bg-orange-100'
                                        }`}
                                      >
                                        <Star className="w-3.5 h-3.5" />
                                        Adjust Rating
                                      </button>
                                    </div>

                                    {localAction.action === 'adjusted' && (
                                      <div>
                                        <p className="text-xs font-medium text-slate-600 mb-1.5">Adjusted Rating</p>
                                        <div className="flex gap-1.5 flex-wrap">
                                          {[1, 3, 5].map(r => (
                                            <button
                                              key={r}
                                              onClick={() => setCompAction(c.id, vr.competency_id, { rating: r, seraFeedback: undefined })}
                                              className={`px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                                                localAction.rating === r
                                                  ? 'bg-orange-600 text-white border-orange-600'
                                                  : 'bg-white text-slate-700 border-slate-200 hover:border-orange-400'
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
                                        Justification
                                        {localAction.action === 'adjusted' && <span className="text-red-500 ml-1">*required</span>}
                                        {localAction.action === 'approved' && <span className="text-slate-400 ml-1">(optional)</span>}
                                      </label>
                                      <textarea
                                        rows={2}
                                        value={localAction.comment}
                                        onChange={e => setCompAction(c.id, vr.competency_id, { comment: e.target.value, seraFeedback: undefined })}
                                        onBlur={() => {
                                          if (localAction.action === 'adjusted' && localAction.comment.trim().length > 15) {
                                            callSeraForAdjustment(c.id, vr, localAction.rating, localAction.comment, c.employee?.full_name || '');
                                          }
                                        }}
                                        placeholder={
                                          localAction.action === 'adjusted'
                                            ? 'Explain the reason for adjusting this rating...'
                                            : 'Optional feedback for the manager...'
                                        }
                                        className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-amber-400 focus:outline-none resize-none"
                                      />
                                    </div>

                                    {/* SERA coaching for adjustments */}
                                    {localAction.action === 'adjusted' && (localAction.seraValidating || localAction.seraFeedback) && (
                                      <div className="bg-sky-50 border border-sky-200 rounded-lg p-3">
                                        <p className="text-xs font-semibold text-sky-700 mb-1.5 flex items-center gap-1.5">
                                          <Sparkles className="w-3 h-3" /> SERA Coaching
                                          {localAction.seraValidating && <Loader2 className="w-3 h-3 animate-spin ml-1" />}
                                        </p>
                                        {localAction.seraFeedback && (
                                          <p className="text-xs text-sky-900 leading-relaxed">{localAction.seraFeedback}</p>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                )}

                                {/* Read-only: show existing DL decision */}
                                {existingDecision && !canAction && (
                                  <div className={`rounded-lg p-3 border ${
                                    existingDecision.action === 'adjusted'
                                      ? 'bg-orange-50 border-orange-200'
                                      : 'bg-green-50 border-green-200'
                                  }`}>
                                    <p className={`text-xs font-semibold mb-1 ${
                                      existingDecision.action === 'adjusted' ? 'text-orange-700' : 'text-green-700'
                                    }`}>
                                      Department Lead Decision
                                    </p>
                                    <p className={`text-sm ${existingDecision.action === 'adjusted' ? 'text-orange-800' : 'text-green-800'}`}>
                                      {existingDecision.action === 'adjusted'
                                        ? `Rating adjusted from ${existingDecision.original_rating}/5 to ${existingDecision.dl_rating}/5`
                                        : `Rating approved at ${existingDecision.dl_rating}/5`}
                                    </p>
                                    {existingDecision.dl_comment && (
                                      <p className="text-xs text-slate-600 mt-1 italic">"{existingDecision.dl_comment}"</p>
                                    )}
                                    <p className="text-xs text-slate-400 mt-1">
                                      <Clock className="w-3 h-3 inline mr-1" />
                                      {format(new Date(existingDecision.decided_at), 'd MMM yyyy HH:mm')}
                                    </p>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Submit */}
                    {canAction && c.valuesRatings.length > 0 && (
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
                          Submit All Decisions
                        </button>
                      </div>
                    )}
                    {/* end isPending */}
                    </>
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
