import { useState } from 'react';
import { X, Sparkles, AlertTriangle, CheckCircle, Loader2, ChevronRight } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface SeraValidationModalProps {
  rating: number;
  ratingType: 'kpi' | 'competency';
  ratingLabel: string;
  itemName: string;
  employeeName: string;
  comments: string;
  targetValue?: string;
  actualValue?: string;
  onConfirm: (comments: string, overrideReason?: string) => void;
  onCancel: () => void;
}

interface ValidationResult {
  valid: boolean;
  confidence: 'high' | 'medium' | 'low';
  message: string;
  prompt: string | null;
  summary: string;
  needsModeration: boolean;
}

export default function SeraValidationModal({
  rating,
  ratingType,
  ratingLabel,
  itemName,
  employeeName,
  comments,
  targetValue,
  actualValue,
  onConfirm,
  onCancel,
}: SeraValidationModalProps) {
  const [step, setStep] = useState<'validating' | 'result' | 'override'>('validating');
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [editedComments, setEditedComments] = useState(comments);
  const [overrideReason, setOverrideReason] = useState('');
  const [overriding, setOverriding] = useState(false);
  const [revalidating, setRevalidating] = useState(false);
  const [hasValidated, setHasValidated] = useState(false);
  const [logEntryId, setLogEntryId] = useState<string | null>(null);

  const validate = async (commentsToValidate: string) => {
    setRevalidating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/validate-rating-justification`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          rating,
          ratingType,
          ratingLabel,
          itemName: ratingType === 'kpi' ? undefined : itemName,
          kpiName: ratingType === 'kpi' ? itemName : undefined,
          competencyName: ratingType === 'competency' ? itemName : undefined,
          employeeName,
          managerComments: commentsToValidate,
          targetValue,
          actualValue,
        }),
      });

      const result = await response.json();
      setValidation(result);
      setHasValidated(true);
      setStep('result');

      // Fire-and-forget: log this Opal interaction for admin review
      const { data: { user } } = await supabase.auth.getUser();
      supabase.from('sera_feedback_log').insert([{
        logged_by_user_id: user?.id ?? null,
        employee_name: employeeName,
        rating,
        rating_type: ratingType,
        item_name: itemName,
        manager_input: commentsToValidate,
        sera_response_valid: result.valid ?? null,
        sera_confidence: result.confidence ?? null,
        sera_message: result.message ?? null,
        sera_prompt: result.prompt ?? null,
        sera_summary: result.summary ?? null,
        manager_overrode: false,
      }]).select('id').maybeSingle().then(({ data }) => {
        if (data?.id) setLogEntryId(data.id);
      }).catch(() => { /* non-blocking — don't interrupt the review flow */ });

    } catch (error) {
      console.error('Validation error:', error);
      setValidation({
        valid: false,
        confidence: 'low',
        message: 'Unable to validate. Please review your comments.',
        prompt: 'Please ensure your comments clearly explain why this rating of 4 or 5 is appropriate.',
        summary: '',
        needsModeration: true,
      });
      setStep('result');
    } finally {
      setRevalidating(false);
    }
  };

  if (!hasValidated && step === 'validating') {
    validate(editedComments);
  }

  const handleRevalidate = () => {
    setStep('validating');
    validate(editedComments);
  };

  const handleOverrideConfirm = () => {
    // Patch log entry with override info (fire-and-forget)
    if (logEntryId) {
      supabase.from('sera_feedback_log')
        .update({ manager_overrode: true, override_reason: overrideReason })
        .eq('id', logEntryId)
        .catch(() => { /* non-blocking */ });
    }
    onConfirm(editedComments, overrideReason);
  };

  const handleProceed = () => {
    onConfirm(editedComments);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden">
        <div className="bg-gradient-to-r from-sky-600 to-blue-700 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-white font-semibold">Opal Rating Review</h3>
                <p className="text-sky-200 text-xs">AI-powered justification validation</p>
              </div>
            </div>
            <button onClick={onCancel} className="text-white/70 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="px-6 py-4 bg-amber-50 border-b border-amber-200">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-900">
                Rating {rating}/5 for <strong>{itemName}</strong> — Moderation Required
              </p>
              <p className="text-xs text-amber-700 mt-1 leading-relaxed">
                These ratings will trigger the moderation process requiring Department Lead and Executive approval. Please ensure your comments provide clear evidence, measurable impact, and sufficient detail to support the ratings given.
              </p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-5">
          {(step === 'validating' || revalidating) && (
            <div className="flex flex-col items-center py-8 gap-4">
              <div className="p-4 bg-sky-50 rounded-full">
                <Loader2 className="w-8 h-8 text-sky-600 animate-spin" />
              </div>
              <div className="text-center">
                <p className="font-medium text-slate-900">Opal is reviewing the justification...</p>
                <p className="text-sm text-slate-500 mt-1">Checking that comments support this rating</p>
              </div>
            </div>
          )}

          {step === 'result' && validation && !revalidating && (
            <div className="space-y-5">
              <div className={`p-4 rounded-lg border ${
                validation.valid
                  ? 'bg-green-50 border-green-200'
                  : 'bg-rose-50 border-rose-200'
              }`}>
                <div className="flex items-start gap-3">
                  {validation.valid ? (
                    <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
                  )}
                  <div>
                    <p className={`text-sm font-semibold ${validation.valid ? 'text-green-900' : 'text-rose-900'}`}>
                      {validation.valid ? 'Justification Looks Good' : 'More Detail Needed'}
                    </p>
                    <p className={`text-sm mt-1 ${validation.valid ? 'text-green-700' : 'text-rose-700'}`}>
                      {validation.message}
                    </p>
                  </div>
                </div>
              </div>

              {!validation.valid && validation.prompt && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-1">Opal suggests</p>
                  <p className="text-sm text-blue-800">{validation.prompt}</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Manager Comments
                  {!validation.valid && <span className="text-rose-500 ml-1">*</span>}
                </label>
                <textarea
                  value={editedComments}
                  onChange={(e) => setEditedComments(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                  placeholder="Add specific, evidence-based comments explaining this rating..."
                />
                <p className="text-xs text-slate-400 mt-1">{editedComments.length} characters</p>
              </div>

              {!validation.valid && (
                <button
                  onClick={handleRevalidate}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-sky-600 text-white rounded-lg hover:bg-sky-700 transition-colors text-sm font-medium"
                >
                  <Sparkles className="w-4 h-4" />
                  Re-validate with Opal
                </button>
              )}

              {validation.valid && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                  <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">Moderation Summary</p>
                  <p className="text-xs text-slate-600">{validation.summary}</p>
                </div>
              )}

              <div className="space-y-2 pt-2">
                <button
                  onClick={handleProceed}
                  disabled={!validation.valid}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <CheckCircle className="w-4 h-4" />
                  Continue &amp; Submit to Moderation
                </button>
                {!validation.valid && (
                  <button
                    onClick={() => setStep('override')}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors text-sm font-medium"
                  >
                    Override Opal &amp; Submit Anyway
                    <ChevronRight className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={onCancel}
                  className="w-full px-4 py-2.5 text-slate-600 hover:text-slate-800 text-sm font-medium border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Return to Edit Rating / Comments
                </button>
              </div>
            </div>
          )}

          {step === 'override' && (
            <div className="space-y-5">
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-amber-900">Manager Override</p>
                    <p className="text-sm text-amber-700 mt-1">
                      You are overriding Opal's validation. This rating and your override reason will be included in the moderation case for approvers to review.
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Override Reason <span className="text-rose-500">*</span>
                </label>
                <textarea
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 resize-none"
                  placeholder="Explain why you are proceeding despite Opal's feedback..."
                />
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={handleOverrideConfirm}
                  disabled={!overrideReason.trim()}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <AlertTriangle className="w-4 h-4" />
                  Override & Send to Moderation
                </button>
                <button
                  onClick={() => setStep('result')}
                  className="px-4 py-2.5 text-slate-600 hover:text-slate-900 text-sm font-medium"
                >
                  Back
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
