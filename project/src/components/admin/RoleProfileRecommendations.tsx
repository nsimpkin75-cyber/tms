import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Clock, ChevronDown, ChevronUp, User, Calendar, MessageSquare, Loader2, Inbox as InboxIcon } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type RecommendationStatus = 'pending' | 'approved' | 'dismissed';

type FilterTab = 'all' | RecommendationStatus;

interface Recommendation {
  id: string;
  job_family_id: string;
  submitted_by: string;
  field_name: string;
  field_label: string;
  current_value: string | null;
  suggested_value: string;
  rationale: string;
  status: RecommendationStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  dismissal_comment: string | null;
  created_at: string;
  // joined
  job_family_title: string;
  job_family_department: string;
  job_family_pathway: string | null;
  submitter_name: string;
  reviewer_name: string | null;
}

// Fields that should be treated as arrays when approving
const ARRAY_FIELDS = new Set([
  'skills',
  'experience',
  'accountabilities',
  'what_great_looks_like',
  'qualifications_training',
  'recommended_learning',
  'recommended_prev_roles',
  'side_step_roles',
  'alternative_paths',
]);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function StatusBadge({ status }: { status: RecommendationStatus }) {
  if (status === 'pending') {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
        <Clock className="w-3 h-3" />
        Pending
      </span>
    );
  }
  if (status === 'approved') {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
        <CheckCircle className="w-3 h-3" />
        Approved
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
      <XCircle className="w-3 h-3" />
      Dismissed
    </span>
  );
}

// ---------------------------------------------------------------------------
// Dismiss inline form
// ---------------------------------------------------------------------------

interface DismissFormProps {
  onConfirm: (comment: string) => void;
  onCancel: () => void;
  loading: boolean;
}

function DismissForm({ onConfirm, onCancel, loading }: DismissFormProps) {
  const [comment, setComment] = useState('');

  return (
    <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg space-y-3">
      <p className="text-sm font-medium text-red-800">Dismiss recommendation</p>
      <textarea
        className="w-full text-sm border border-red-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-red-400 bg-white resize-none"
        rows={3}
        placeholder="Optional: explain why this recommendation is being dismissed…"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        disabled={loading}
      />
      <div className="flex items-center gap-2">
        <button
          onClick={() => onConfirm(comment)}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
        >
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
          Confirm dismiss
        </button>
        <button
          onClick={onCancel}
          disabled={loading}
          className="px-3 py-1.5 text-sm font-medium rounded-md border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Recommendation card
// ---------------------------------------------------------------------------

interface RecommendationCardProps {
  rec: Recommendation;
  onApprove: (id: string) => Promise<void>;
  onDismiss: (id: string, comment: string) => Promise<void>;
}

function RecommendationCard({ rec, onApprove, onDismiss }: RecommendationCardProps) {
  const [showDismissForm, setShowDismissForm] = useState(false);
  const [approving, setApproving] = useState(false);
  const [dismissing, setDismissing] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const isArray = ARRAY_FIELDS.has(rec.field_name);

  function renderValue(raw: string | null, highlight: boolean) {
    if (!raw) {
      return <span className="text-gray-400 italic text-sm">None</span>;
    }
    if (isArray) {
      const items = raw.split('\n').filter((l) => l.trim() !== '');
      return (
        <ul className={`list-disc list-inside space-y-1 text-sm ${highlight ? 'text-blue-900' : 'text-gray-700'}`}>
          {items.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      );
    }
    return <p className={`text-sm whitespace-pre-wrap ${highlight ? 'text-blue-900' : 'text-gray-700'}`}>{raw}</p>;
  }

  async function handleApprove() {
    setApproving(true);
    try {
      await onApprove(rec.id);
    } finally {
      setApproving(false);
    }
  }

  async function handleDismissConfirm(comment: string) {
    setDismissing(true);
    try {
      await onDismiss(rec.id, comment);
      setShowDismissForm(false);
    } finally {
      setDismissing(false);
    }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
      {/* Card header */}
      <div className="px-5 py-4 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <StatusBadge status={rec.status} />
            <span className="text-xs text-gray-400">·</span>
            <span className="text-xs text-gray-500 font-medium">{rec.field_label}</span>
          </div>
          <h3 className="font-semibold text-gray-900 text-base leading-snug">{rec.job_family_title}</h3>
          <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
            <span className="text-xs text-gray-500">{rec.job_family_department}</span>
            {rec.job_family_pathway && (
              <>
                <span className="text-xs text-gray-400">·</span>
                <span className="text-xs text-gray-500">{rec.job_family_pathway}</span>
              </>
            )}
          </div>
        </div>

        <div className="flex flex-col items-end gap-1 shrink-0 text-right">
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <User className="w-3.5 h-3.5" />
            <span>{rec.submitter_name}</span>
          </div>
          <div className="flex items-center gap-1 text-xs text-gray-400">
            <Calendar className="w-3.5 h-3.5" />
            <span>{formatDate(rec.created_at)}</span>
          </div>
        </div>
      </div>

      {/* Expand toggle */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-2 border-t border-gray-100 bg-gray-50 hover:bg-gray-100 transition-colors text-sm text-gray-600 font-medium"
      >
        <span>{expanded ? 'Hide details' : 'View details'}</span>
        {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>

      {expanded && (
        <div className="px-5 py-5 border-t border-gray-100 space-y-5">
          {/* Current vs Suggested */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="rounded-lg border border-gray-200 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">Current value</p>
              {renderValue(rec.current_value, false)}
            </div>
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-blue-500 mb-2">Suggested value</p>
              {renderValue(rec.suggested_value, true)}
            </div>
          </div>

          {/* Rationale */}
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <MessageSquare className="w-4 h-4 text-gray-400" />
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Rationale from dept lead</p>
            </div>
            <blockquote className="border-l-4 border-gray-200 pl-4 py-1">
              <p className="text-sm text-gray-700 italic whitespace-pre-wrap">{rec.rationale}</p>
            </blockquote>
          </div>

          {/* Approved/dismissed meta */}
          {rec.status === 'approved' && rec.reviewer_name && (
            <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-800">
              <span className="font-medium">Approved</span> by {rec.reviewer_name} on {formatDate(rec.reviewed_at)}
            </div>
          )}

          {rec.status === 'dismissed' && (
            <div className="rounded-lg bg-gray-50 border border-gray-200 px-4 py-3 text-sm text-gray-700 space-y-1">
              <div>
                <span className="font-medium text-gray-800">Dismissed</span>
                {rec.reviewer_name && (
                  <> by <span className="font-medium">{rec.reviewer_name}</span></>
                )}{' '}
                on {formatDate(rec.reviewed_at)}
              </div>
              {rec.dismissal_comment && (
                <p className="text-gray-600 italic">"{rec.dismissal_comment}"</p>
              )}
            </div>
          )}

          {/* Actions for pending */}
          {rec.status === 'pending' && (
            <div className="space-y-3">
              {!showDismissForm && (
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleApprove}
                    disabled={approving || dismissing}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 transition-colors"
                  >
                    {approving ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <CheckCircle className="w-4 h-4" />
                    )}
                    Approve
                  </button>
                  <button
                    onClick={() => setShowDismissForm(true)}
                    disabled={approving || dismissing}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg border border-red-300 text-red-600 hover:bg-red-50 disabled:opacity-50 transition-colors"
                  >
                    <XCircle className="w-4 h-4" />
                    Dismiss
                  </button>
                </div>
              )}

              {showDismissForm && (
                <DismissForm
                  onConfirm={handleDismissConfirm}
                  onCancel={() => setShowDismissForm(false)}
                  loading={dismissing}
                />
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function RoleProfileRecommendations() {
  const { user } = useAuth();

  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [error, setError] = useState<string | null>(null);

  // -------------------------------------------------------------------------
  // Data fetching
  // -------------------------------------------------------------------------

  async function fetchRecommendations() {
    setLoading(true);
    setError(null);

    try {
      // Fetch base recommendations
      const { data: recs, error: recsError } = await supabase
        .from('role_profile_recommendations')
        .select('*')
        .order('created_at', { ascending: false });

      if (recsError) throw recsError;
      if (!recs || recs.length === 0) {
        setRecommendations([]);
        return;
      }

      // Collect unique IDs for batch lookups
      const jobFamilyIds = [...new Set(recs.map((r) => r.job_family_id))];
      const profileIds = [
        ...new Set([
          ...recs.map((r) => r.submitted_by),
          ...recs.filter((r) => r.reviewed_by).map((r) => r.reviewed_by as string),
        ]),
      ];

      // Parallel lookups
      const [jfResult, profilesResult] = await Promise.all([
        supabase
          .from('job_families')
          .select('id, title, department, pathway')
          .in('id', jobFamilyIds),
        supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', profileIds),
      ]);

      const jobFamilyMap = new Map(
        (jfResult.data || []).map((jf) => [jf.id, jf])
      );
      const profileMap = new Map(
        (profilesResult.data || []).map((p) => [p.id, p])
      );

      const enriched: Recommendation[] = recs.map((r) => {
        const jf = jobFamilyMap.get(r.job_family_id);
        const submitter = profileMap.get(r.submitted_by);
        const reviewer = r.reviewed_by ? profileMap.get(r.reviewed_by) : null;
        return {
          ...r,
          job_family_title: jf?.title ?? 'Unknown role',
          job_family_department: jf?.department ?? '—',
          job_family_pathway: jf?.pathway ?? null,
          submitter_name: submitter?.full_name ?? 'Unknown',
          reviewer_name: reviewer?.full_name ?? null,
        };
      });

      setRecommendations(enriched);
    } catch (err: any) {
      console.error('Error fetching recommendations:', err);
      setError(err?.message ?? 'Failed to load recommendations.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchRecommendations();
  }, []);

  // -------------------------------------------------------------------------
  // Actions
  // -------------------------------------------------------------------------

  async function handleApprove(id: string) {
    if (!user) return;

    const rec = recommendations.find((r) => r.id === id);
    if (!rec) return;

    const isArray = ARRAY_FIELDS.has(rec.field_name);
    const updateValue = isArray
      ? rec.suggested_value.split('\n').filter((l) => l.trim() !== '')
      : rec.suggested_value;

    // Update job_families field
    const { error: jfError } = await supabase
      .from('job_families')
      .update({ [rec.field_name]: updateValue })
      .eq('id', rec.job_family_id);

    if (jfError) {
      console.error('Error updating job family:', jfError);
      alert('Failed to update the role profile. Please try again.');
      return;
    }

    // Mark recommendation as approved
    const { error: recError } = await supabase
      .from('role_profile_recommendations')
      .update({
        status: 'approved',
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (recError) {
      console.error('Error updating recommendation status:', recError);
      alert('The role profile was updated but the recommendation status could not be saved.');
      return;
    }

    // Refresh reviewer name in local state
    const { data: reviewerProfile } = await supabase
      .from('profiles')
      .select('id, full_name')
      .eq('id', user.id)
      .maybeSingle();

    setRecommendations((prev) =>
      prev.map((r) =>
        r.id === id
          ? {
              ...r,
              status: 'approved',
              reviewed_by: user.id,
              reviewed_at: new Date().toISOString(),
              reviewer_name: reviewerProfile?.full_name ?? null,
            }
          : r
      )
    );
  }

  async function handleDismiss(id: string, comment: string) {
    if (!user) return;

    const { error: recError } = await supabase
      .from('role_profile_recommendations')
      .update({
        status: 'dismissed',
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
        dismissal_comment: comment || null,
      })
      .eq('id', id);

    if (recError) {
      console.error('Error dismissing recommendation:', recError);
      alert('Failed to dismiss the recommendation. Please try again.');
      return;
    }

    const { data: reviewerProfile } = await supabase
      .from('profiles')
      .select('id, full_name')
      .eq('id', user.id)
      .maybeSingle();

    setRecommendations((prev) =>
      prev.map((r) =>
        r.id === id
          ? {
              ...r,
              status: 'dismissed',
              reviewed_by: user.id,
              reviewed_at: new Date().toISOString(),
              dismissal_comment: comment || null,
              reviewer_name: reviewerProfile?.full_name ?? null,
            }
          : r
      )
    );
  }

  // -------------------------------------------------------------------------
  // Derived state
  // -------------------------------------------------------------------------

  const counts: Record<FilterTab, number> = {
    all: recommendations.length,
    pending: recommendations.filter((r) => r.status === 'pending').length,
    approved: recommendations.filter((r) => r.status === 'approved').length,
    dismissed: recommendations.filter((r) => r.status === 'dismissed').length,
  };

  const filtered =
    activeTab === 'all'
      ? recommendations
      : recommendations.filter((r) => r.status === activeTab);

  const tabs: { key: FilterTab; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'pending', label: 'Pending' },
    { key: 'approved', label: 'Approved' },
    { key: 'dismissed', label: 'Dismissed' },
  ];

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Role Profile Recommendations</h2>
        <p className="mt-1 text-sm text-gray-500">
          Review and action edits to role profiles submitted by department leads.
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex items-center gap-1 border-b border-gray-200">
        {tabs.map(({ key, label }) => {
          const isActive = activeTab === key;
          return (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                isActive
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {label}
              <span
                className={`inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 rounded-full text-xs font-semibold ${
                  isActive
                    ? 'bg-blue-100 text-blue-700'
                    : key === 'pending' && counts.pending > 0
                    ? 'bg-amber-100 text-amber-700'
                    : 'bg-gray-100 text-gray-500'
                }`}
              >
                {counts[key]}
              </span>
            </button>
          );
        })}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <InboxIcon className="w-12 h-12 text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">
            {activeTab === 'all'
              ? 'No recommendations have been submitted yet.'
              : `No ${activeTab} recommendations.`}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((rec) => (
            <RecommendationCard
              key={rec.id}
              rec={rec}
              onApprove={handleApprove}
              onDismiss={handleDismiss}
            />
          ))}
        </div>
      )}
    </div>
  );
}
