import { useState, useEffect } from 'react';
import { CheckCircle, X, MessageSquare, TrendingUp, Sparkles, ChevronDown, ChevronUp, AlertTriangle, Clock, RotateCcw, Star, Award } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { format } from 'date-fns';

interface DLDecision {
  competency_id: string;
  competency_name: string;
  original_rating: number;
  dl_rating: number;
  dl_comment: string;
  action: 'approved' | 'adjusted';
  decided_at: string;
}

interface ValuesRatingRow {
  value_id: string;
  value_title: string;
  competency_id: string;
  competency_title: string;
  manager_rating: number;
  manager_comment: string;
}

interface ModerationCase {
  id: string;
  source_type: 'kpi_rating' | 'competency_assessment';
  source_id: string;
  review_id: string | null;
  meeting_id: string | null;
  employee_id: string;
  manager_id: string;
  original_rating: number;
  current_rating: number;
  manager_justification: string;
  ai_validation_status: string;
  ai_validation_notes: string;
  ai_summary: string;
  manager_override: boolean;
  manager_override_notes: string;
  current_step: number;
  status: string;
  final_rating: number | null;
  created_at: string;
  dept_lead_decisions: DLDecision[];
  valuesRatings: ValuesRatingRow[];
  employee?: { full_name: string; job_title: string; department: string };
  manager?: { full_name: string };
  workflow?: { name: string };
  decisions?: ModerationDecision[];
}

interface ModerationDecision {
  id: string;
  step_number: number;
  step_name: string;
  decision: string;
  notes: string;
  adjusted_rating: number | null;
  decided_at: string;
  decided_by_profile?: { full_name: string };
}

interface WorkflowStep {
  step_number: number;
  step_name: string;
  assigned_role: string;
  allow_rating_adjustment: boolean;
}

export default function ModerationReviewPanel() {
  const { effectiveProfile: profile } = useAuth();
  const [cases, setCases] = useState<ModerationCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedCase, setExpandedCase] = useState<string | null>(null);
  const [decidingCase, setDecidingCase] = useState<string | null>(null);
  const [decision, setDecision] = useState<'approve' | 'reject' | 'adjust_rating' | 'request_more_info'>('approve');
  const [decisionNotes, setDecisionNotes] = useState('');
  const [adjustedRating, setAdjustedRating] = useState<number>(3);
  const [submitting, setSubmitting] = useState(false);
  const [workflowSteps, setWorkflowSteps] = useState<WorkflowStep[]>([]);
  const [filter, setFilter] = useState<'pending' | 'all'>('pending');

  useEffect(() => {
    loadCases();
    loadWorkflowSteps();
  }, [profile]);

  async function loadWorkflowSteps() {
    const { data } = await supabase
      .from('moderation_workflow_steps')
      .select('step_number, step_name, assigned_role, allow_rating_adjustment')
      .order('step_number');
    setWorkflowSteps(data || []);
  }

  async function loadCases() {
    if (!profile?.id) return;
    setLoading(true);
    try {
      let query = supabase
        .from('moderation_cases')
        .select(`
          *,
          dept_lead_decisions,
          review_id,
          employee:profiles!moderation_cases_employee_id_fkey(full_name, job_title, department),
          manager:profiles!moderation_cases_manager_id_fkey(full_name),
          workflow:moderation_workflow_configs(name)
        `)
        .order('created_at', { ascending: false });

      if (filter === 'pending') {
        query = query.in('status', ['pending', 'in_review']);
      }

      const { data } = await query;
      const rawCases = data || [];

      // Fetch values_ratings from linked reviews so the manager can see per-competency detail
      const effectiveReviewId = (c: any): string | null =>
        c.review_id || (c.source_type === 'competency_assessment' ? c.source_id : null) || null;
      const reviewIds = [...new Set(rawCases.map(effectiveReviewId).filter(Boolean))];
      let reviewMap: Record<string, ValuesRatingRow[]> = {};
      if (reviewIds.length > 0) {
        const { data: reviews } = await supabase
          .from('one_to_one_monthly_reviews')
          .select('id, values_ratings')
          .in('id', reviewIds);
        (reviews || []).forEach((r: any) => {
          reviewMap[r.id] = r.values_ratings || [];
        });
      }

      const casesWithDecisions = await Promise.all(
        rawCases.map(async (c) => {
          const { data: decisions } = await supabase
            .from('moderation_case_decisions')
            .select('*, decided_by_profile:profiles!moderation_case_decisions_decided_by_fkey(full_name)')
            .eq('case_id', c.id)
            .order('decided_at', { ascending: true });
          const rid = effectiveReviewId(c);
          return {
            ...c,
            dept_lead_decisions: c.dept_lead_decisions || [],
            valuesRatings: rid ? (reviewMap[rid] || []) : [],
            decisions: decisions || [],
          };
        })
      );

      setCases(casesWithDecisions);
    } catch (error) {
      console.error('Error loading moderation cases:', error);
    } finally {
      setLoading(false);
    }
  }

  function getMyStep(c: ModerationCase): WorkflowStep | null {
    if (!profile?.role) return null;
    return workflowSteps.find(s => s.assigned_role === profile.role && s.step_number === c.current_step) || null;
  }

  function canDecide(c: ModerationCase): boolean {
    if (!['pending', 'in_review'].includes(c.status)) return false;
    const myStep = getMyStep(c);
    return myStep !== null;
  }

  async function submitDecision(caseId: string) {
    if (!profile?.id) return;
    setSubmitting(true);
    try {
      const c = cases.find(x => x.id === caseId);
      if (!c) return;

      const myStep = getMyStep(c);
      if (!myStep) return;

      await supabase.from('moderation_case_decisions').insert({
        case_id: caseId,
        step_number: myStep.step_number,
        step_name: myStep.step_name,
        decided_by: profile.id,
        decision,
        notes: decisionNotes,
        adjusted_rating: decision === 'adjust_rating' ? adjustedRating : null,
      });

      const totalSteps = workflowSteps.length;
      const isLastStep = myStep.step_number >= totalSteps;

      if (decision === 'reject') {
        await supabase.from('moderation_cases').update({
          status: 'rejected',
          updated_at: new Date().toISOString(),
        }).eq('id', caseId);
      } else if (decision === 'adjust_rating') {
        await supabase.from('moderation_cases').update({
          status: 'adjusted',
          final_rating: adjustedRating,
          current_rating: adjustedRating,
          updated_at: new Date().toISOString(),
        }).eq('id', caseId);
      } else if (decision === 'approve') {
        if (isLastStep) {
          await supabase.from('moderation_cases').update({
            status: 'approved',
            final_rating: c.current_rating,
            updated_at: new Date().toISOString(),
          }).eq('id', caseId);
        } else {
          await supabase.from('moderation_cases').update({
            status: 'in_review',
            current_step: myStep.step_number + 1,
            updated_at: new Date().toISOString(),
          }).eq('id', caseId);
        }
      } else if (decision === 'request_more_info') {
        await supabase.from('moderation_cases').update({
          status: 'pending',
          updated_at: new Date().toISOString(),
        }).eq('id', caseId);
      }

      setDecidingCase(null);
      setDecisionNotes('');
      setAdjustedRating(3);
      await loadCases();
    } catch (error) {
      console.error('Error submitting decision:', error);
    } finally {
      setSubmitting(false);
    }
  }

  function statusBadge(status: string) {
    const map: Record<string, string> = {
      pending: 'bg-amber-100 text-amber-800 border-amber-200',
      in_review: 'bg-blue-100 text-blue-800 border-blue-200',
      approved: 'bg-green-100 text-green-800 border-green-200',
      rejected: 'bg-rose-100 text-rose-800 border-rose-200',
      adjusted: 'bg-teal-100 text-teal-800 border-teal-200',
    };
    return map[status] || 'bg-slate-100 text-slate-700 border-slate-200';
  }

  function ratingColor(r: number) {
    if (r >= 4) return 'text-green-700 bg-green-100';
    if (r >= 3) return 'text-blue-700 bg-blue-100';
    return 'text-rose-700 bg-rose-100';
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <p className="text-slate-500">Loading moderation cases...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Moderation Queue</h2>
          <p className="text-sm text-slate-500 mt-0.5">Review high ratings requiring approval</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setFilter('pending'); loadCases(); }}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${filter === 'pending' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
            Pending ({cases.filter(c => ['pending', 'in_review'].includes(c.status)).length})
          </button>
          <button
            onClick={() => { setFilter('all'); loadCases(); }}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${filter === 'all' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
            All ({cases.length})
          </button>
        </div>
      </div>

      {cases.length === 0 ? (
        <div className="card text-center py-12">
          <CheckCircle className="w-10 h-10 text-green-400 mx-auto mb-3" />
          <p className="font-medium text-slate-700">No cases to review</p>
          <p className="text-sm text-slate-400 mt-1">All moderation cases are up to date</p>
        </div>
      ) : (
        <div className="space-y-4">
          {cases.map(c => {
            const isExpanded = expandedCase === c.id;
            const isDeciding = decidingCase === c.id;
            const myStep = getMyStep(c);
            const canAct = canDecide(c);
            const currentStepInfo = workflowSteps.find(s => s.step_number === c.current_step);

            return (
              <div key={c.id} className="card border border-slate-200 overflow-hidden">
                <div
                  className="flex items-start justify-between cursor-pointer p-0"
                  onClick={() => setExpandedCase(isExpanded ? null : c.id)}
                >
                  <div className="flex items-start gap-4 flex-1">
                    <div className={`p-3 rounded-lg ${c.source_type === 'kpi_rating' ? 'bg-blue-100' : 'bg-teal-100'} flex-shrink-0`}>
                      <TrendingUp className={`w-5 h-5 ${c.source_type === 'kpi_rating' ? 'text-blue-600' : 'text-teal-600'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-slate-900">{c.employee?.full_name || 'Unknown'}</p>
                        <span className="text-xs text-slate-400">{c.employee?.department}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${statusBadge(c.status)}`}>
                          {c.status.replace('_', ' ')}
                        </span>
                        {canAct && (
                          <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full border border-amber-200 font-medium">
                            Action Required
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-slate-500 mt-0.5">
                        {c.source_type === 'kpi_rating' ? 'KPI Rating' : 'Competency'} •
                        Manager: {c.manager?.full_name || 'Unknown'} •
                        {format(new Date(c.created_at), 'dd MMM yyyy')}
                      </p>
                      <div className="flex items-center gap-3 mt-2">
                        <span className={`text-sm font-bold px-2.5 py-0.5 rounded-full ${ratingColor(c.original_rating)}`}>
                          Rating {c.original_rating}/5
                        </span>
                        {c.final_rating && c.final_rating !== c.original_rating && (
                          <>
                            <span className="text-slate-400 text-xs">→ adjusted to</span>
                            <span className={`text-sm font-bold px-2.5 py-0.5 rounded-full ${ratingColor(c.final_rating)}`}>
                              {c.final_rating}/5
                            </span>
                          </>
                        )}
                        {currentStepInfo && ['pending', 'in_review'].includes(c.status) && (
                          <span className="text-xs text-slate-500">
                            Step {c.current_step}: {currentStepInfo.step_name}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex-shrink-0 pl-4 text-slate-400">
                    {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                  </div>
                </div>

                {isExpanded && (
                  <div className="mt-5 pt-5 border-t border-slate-100 space-y-5">
                    {c.ai_summary && (
                      <div className="p-4 bg-sky-50 border border-sky-200 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <Sparkles className="w-4 h-4 text-sky-600" />
                          <p className="text-xs font-semibold text-sky-700 uppercase tracking-wide">SERA Summary for Approvers</p>
                        </div>
                        <p className="text-sm text-sky-900">{c.ai_summary}</p>
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Manager Justification</p>
                        <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                          <p className="text-sm text-slate-700">
                            {c.manager_justification || <span className="text-slate-400 italic">No justification provided</span>}
                          </p>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div>
                          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">AI Validation</p>
                          <div className={`p-3 rounded-lg border text-sm ${
                            c.ai_validation_status === 'validated' ? 'bg-green-50 border-green-200 text-green-800' :
                            c.ai_validation_status === 'flagged' ? 'bg-amber-50 border-amber-200 text-amber-800' :
                            c.ai_validation_status === 'overridden' ? 'bg-orange-50 border-orange-200 text-orange-800' :
                            'bg-slate-50 border-slate-200 text-slate-600'
                          }`}>
                            <span className="font-medium capitalize">{c.ai_validation_status}</span>
                            {c.ai_validation_notes && <p className="mt-1">{c.ai_validation_notes}</p>}
                          </div>
                        </div>

                        {c.manager_override && (
                          <div>
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Manager Override</p>
                            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
                              {c.manager_override_notes || 'Override provided without notes'}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {(c.decisions || []).length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Decision History</p>
                        <div className="space-y-2">
                          {(c.decisions || []).map((d, idx) => (
                            <div key={idx} className="flex items-start gap-3 p-3 bg-slate-50 border border-slate-200 rounded-lg">
                              <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                                d.decision === 'approve' ? 'bg-green-500' :
                                d.decision === 'reject' ? 'bg-rose-500' :
                                d.decision === 'adjust_rating' ? 'bg-blue-500' :
                                'bg-amber-500'
                              }`} />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between">
                                  <p className="text-sm font-medium text-slate-900">
                                    Step {d.step_number}: {d.step_name}
                                  </p>
                                  <span className="text-xs text-slate-400">{format(new Date(d.decided_at), 'dd MMM')}</span>
                                </div>
                                <p className="text-xs text-slate-500 mt-0.5">
                                  {(d as any).decided_by_profile?.full_name || 'Unknown'} — <span className="capitalize font-medium">{d.decision.replace('_', ' ')}</span>
                                  {d.adjusted_rating && ` (adjusted to ${d.adjusted_rating}/5)`}
                                </p>
                                {d.notes && <p className="text-xs text-slate-600 mt-1">{d.notes}</p>}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Per-competency detail: manager evidence + DL outcome */}
                    {c.source_type === 'competency_assessment' && c.valuesRatings.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                          <Award className="w-3.5 h-3.5" /> Competency Breakdown
                        </p>
                        <div className="space-y-3">
                          {/* Group by value */}
                          {Array.from(new Set(c.valuesRatings.map(vr => vr.value_id))).map(vid => {
                            const rows = c.valuesRatings.filter(vr => vr.value_id === vid);
                            const valueTitle = rows[0]?.value_title;
                            return (
                              <div key={vid}>
                                <p className="text-xs font-bold text-slate-700 mb-2 pb-1 border-b border-slate-100">{valueTitle}</p>
                                <div className="space-y-2">
                                  {rows.map(vr => {
                                    const dlDec = c.dept_lead_decisions.find(d => d.competency_id === vr.competency_id);
                                    return (
                                      <div key={vr.competency_id} className="rounded-lg border border-slate-200 bg-white overflow-hidden">
                                        <div className="px-3 py-2 bg-slate-50 border-b border-slate-100 flex items-center justify-between flex-wrap gap-2">
                                          <p className="text-sm font-semibold text-slate-900">{vr.competency_title}</p>
                                          <div className="flex items-center gap-2">
                                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${
                                              vr.manager_rating >= 5
                                                ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                                                : 'bg-amber-100 text-amber-800 border-amber-200'
                                            }`}>
                                              Manager: {vr.manager_rating}/5
                                            </span>
                                            {dlDec && (
                                              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${
                                                dlDec.action === 'adjusted'
                                                  ? 'bg-orange-100 text-orange-800 border-orange-200'
                                                  : 'bg-green-100 text-green-800 border-green-200'
                                              }`}>
                                                DL: {dlDec.action === 'adjusted' ? `Adjusted → ${dlDec.dl_rating}/5` : 'Approved'}
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                        <div className="p-3 space-y-2">
                                          {vr.manager_comment && (
                                            <div className="bg-slate-50 rounded-lg p-2.5">
                                              <p className="text-xs font-semibold text-slate-500 mb-1 flex items-center gap-1">
                                                <MessageSquare className="w-3 h-3" /> Manager Evidence
                                              </p>
                                              <p className="text-xs text-slate-700 leading-relaxed">{vr.manager_comment}</p>
                                            </div>
                                          )}
                                          {dlDec && dlDec.dl_comment && (
                                            <div className={`rounded-lg p-2.5 ${
                                              dlDec.action === 'adjusted'
                                                ? 'bg-orange-50 border border-orange-200'
                                                : 'bg-green-50 border border-green-200'
                                            }`}>
                                              <p className={`text-xs font-semibold mb-1 ${
                                                dlDec.action === 'adjusted' ? 'text-orange-700' : 'text-green-700'
                                              }`}>
                                                Department Lead Feedback
                                              </p>
                                              <p className={`text-xs leading-relaxed ${
                                                dlDec.action === 'adjusted' ? 'text-orange-800' : 'text-green-800'
                                              }`}>{dlDec.dl_comment}</p>
                                              <p className="text-xs text-slate-400 mt-1">
                                                <Clock className="w-3 h-3 inline mr-1" />
                                                {format(new Date(dlDec.decided_at), 'd MMM yyyy HH:mm')}
                                              </p>
                                            </div>
                                          )}
                                          {dlDec && !dlDec.dl_comment && (
                                            <p className="text-xs text-slate-400 italic">
                                              Department Lead {dlDec.action === 'approved' ? 'approved' : `adjusted to ${dlDec.dl_rating}/5`} — no additional feedback
                                            </p>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {canAct && !isDeciding && (
                      <div className="pt-2">
                        <button
                          onClick={() => setDecidingCase(c.id)}
                          className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm"
                        >
                          <MessageSquare className="w-4 h-4" />
                          Submit Decision
                        </button>
                      </div>
                    )}

                    {isDeciding && (
                      <div className="space-y-4 p-4 bg-slate-50 border border-slate-200 rounded-lg">
                        <p className="text-sm font-semibold text-slate-900">Your Decision — Step {myStep?.step_number}: {myStep?.step_name}</p>

                        <div className="grid grid-cols-2 gap-2">
                          {[
                            { value: 'approve', label: 'Approve', color: 'border-green-400 bg-green-50 text-green-800' },
                            { value: 'reject', label: 'Reject', color: 'border-rose-400 bg-rose-50 text-rose-800' },
                            ...(myStep?.allow_rating_adjustment ? [{ value: 'adjust_rating', label: 'Adjust Rating', color: 'border-blue-400 bg-blue-50 text-blue-800' }] : []),
                            { value: 'request_more_info', label: 'Request Info', color: 'border-amber-400 bg-amber-50 text-amber-800' },
                          ].map(opt => (
                            <button
                              key={opt.value}
                              onClick={() => setDecision(opt.value as typeof decision)}
                              className={`p-3 rounded-lg border-2 text-sm font-medium transition-all text-left ${
                                decision === opt.value ? opt.color + ' border-opacity-100' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                              }`}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>

                        {decision === 'adjust_rating' && myStep?.allow_rating_adjustment && (
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Adjusted Rating</label>
                            <div className="flex items-center gap-2">
                              {[1, 2, 3, 4, 5].map(n => (
                                <button
                                  key={n}
                                  onClick={() => setAdjustedRating(n)}
                                  className={`w-10 h-10 rounded-lg font-semibold text-sm border-2 transition-all ${
                                    adjustedRating === n
                                      ? 'bg-blue-600 text-white border-blue-600'
                                      : 'bg-white text-slate-700 border-slate-300 hover:border-blue-400'
                                  }`}
                                >
                                  {n}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
                          <textarea
                            value={decisionNotes}
                            onChange={(e) => setDecisionNotes(e.target.value)}
                            rows={3}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 resize-none"
                            placeholder="Add notes to support your decision..."
                          />
                        </div>

                        <div className="flex gap-3">
                          <button
                            onClick={() => submitDecision(c.id)}
                            disabled={submitting}
                            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium disabled:opacity-50"
                          >
                            {submitting ? 'Submitting...' : 'Submit Decision'}
                          </button>
                          <button
                            onClick={() => setDecidingCase(null)}
                            className="px-4 py-2.5 text-slate-600 hover:text-slate-900 text-sm font-medium"
                          >
                            Cancel
                          </button>
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
