import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import {
  CheckCircle, Clock, AlertCircle, ChevronDown, ChevronRight,
  Save, Send, Star, MessageSquare, Info, Lock
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  cycleId: string;
  employeeId: string;
  assessorType: 'employee' | 'manager';
  onComplete?: () => void;
}

interface Assessment {
  id: string;
  cycle_id: string;
  employee_id: string;
  assessor_id: string;
  assessor_type: 'employee' | 'manager';
  status: 'pending' | 'in_progress' | 'completed';
  submitted_at: string | null;
}

interface AssessmentItem {
  id: string;
  assessment_id: string;
  topic_id: string;
  rating: number | null;
  comments: string | null;
}

interface Topic {
  id: string;
  category_id: string;
  name: string;
  def_rating_3: string | null;
  def_rating_4: string | null;
  def_rating_5: string | null;
}

interface Category {
  id: string;
  type_id: string;
  name: string;
}

interface SmType {
  id: string;
  name: string;
}

interface Cycle {
  id: string;
  matrix_id: string;
  name: string;
  due_date: string | null;
}

interface Mismatch {
  id: string;
  cycle_id: string;
  employee_id: string;
  topic_id: string;
  employee_rating: number;
  manager_rating: number;
  employee_comments: string | null;
  manager_comments: string | null;
  resolution: string | null;
  final_rating: number | null;
  manager_feedback: string | null;
  resolved_by: string | null;
  resolved_at: string | null;
}

interface GroupedTopics {
  type: SmType;
  categories: {
    category: Category;
    topics: Topic[];
  }[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const RATING_LABELS: Record<number, string> = {
  0: 'No Formal Training',
  1: 'Trained',
  2: 'Developing',
  3: 'Good',
  4: 'Excellent',
  5: 'Role Model / SME',
};

function ratingColor(rating: number | null): string {
  if (rating === null) return '';
  if (rating <= 1) return 'red';
  if (rating === 2) return 'amber';
  return 'green';
}

function ratingBgClass(rating: number | null, selected: boolean): string {
  if (!selected) return 'bg-white border-gray-300 text-gray-600 hover:border-gray-400 hover:bg-gray-50';
  const color = ratingColor(rating);
  if (color === 'red') return 'bg-red-500 border-red-500 text-white';
  if (color === 'amber') return 'bg-amber-500 border-amber-500 text-white';
  return 'bg-green-500 border-green-500 text-white';
}

function ratingBadgeClass(rating: number | null): string {
  if (rating === null) return 'bg-gray-100 text-gray-500';
  const color = ratingColor(rating);
  if (color === 'red') return 'bg-red-100 text-red-700';
  if (color === 'amber') return 'bg-amber-100 text-amber-700';
  return 'bg-green-100 text-green-700';
}

function formatDate(date: string | null): string {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function RatingButton({
  value,
  selected,
  onClick,
  disabled,
}: {
  value: number;
  selected: boolean;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      title={RATING_LABELS[value]}
      onClick={onClick}
      disabled={disabled}
      className={`w-10 h-10 rounded border-2 font-semibold text-sm transition-all
        ${ratingBgClass(value, selected)}
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      {value}
    </button>
  );
}

function RatingBadge({ rating }: { rating: number | null }) {
  if (rating === null) return <span className="text-gray-400 text-sm">—</span>;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${ratingBadgeClass(rating)}`}>
      <Star className="w-3 h-3" />
      {rating} – {RATING_LABELS[rating]}
    </span>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function SkillsMatrixAssessment({ cycleId, employeeId, assessorType, onComplete }: Props) {
  const { user } = useAuth();

  // Core data
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [cycle, setCycle] = useState<Cycle | null>(null);
  const [employeeName, setEmployeeName] = useState('');
  const [groupedTopics, setGroupedTopics] = useState<GroupedTopics[]>([]);
  const [items, setItems] = useState<Record<string, AssessmentItem>>({}); // keyed by topic_id
  const [mismatches, setMismatches] = useState<Mismatch[]>([]);

  // UI state
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Collapsed sections
  const [collapsedTypes, setCollapsedTypes] = useState<Record<string, boolean>>({});
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});
  const [expandedDefs, setExpandedDefs] = useState<Record<string, boolean>>({});
  const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({});

  // Local edits: topic_id → { rating, comments }
  const [localRatings, setLocalRatings] = useState<Record<string, number | null>>({});
  const [localComments, setLocalComments] = useState<Record<string, string>>({});

  // Mismatch resolution state
  const [resolvingMismatch, setResolvingMismatch] = useState<Record<string, { action: 'accept_employee' | 'override_manager' | null; feedback: string }>>({});

  // ── Load on mount ──────────────────────────────────────────────────────────

  useEffect(() => {
    if (!user) return;
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cycleId, employeeId, assessorType, user]);

  async function loadAll() {
    try {
      setLoading(true);
      setError(null);

      // 1. Get or create the assessment record
      let assessmentRecord = await getOrCreateAssessment();
      if (!assessmentRecord) return;
      setAssessment(assessmentRecord);

      // 2. Employee profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('full_name, job_family_id')
        .eq('id', employeeId)
        .maybeSingle();
      setEmployeeName(profileData?.full_name ?? 'Employee');
      const jobFamilyId = profileData?.job_family_id;

      // 3. Cycle → matrix
      const { data: cycleData } = await supabase
        .from('sm_assessment_cycles')
        .select('id, matrix_id, name, due_date')
        .eq('id', cycleId)
        .maybeSingle();
      setCycle(cycleData);
      const matrixId = cycleData?.matrix_id;

      if (!matrixId || !jobFamilyId) {
        setGroupedTopics([]);
        setLoading(false);
        return;
      }

      // 4. Applicable role topics
      const { data: roleTopics } = await supabase
        .from('sm_role_topics')
        .select('topic_id')
        .eq('matrix_id', matrixId)
        .eq('job_family_id', jobFamilyId)
        .eq('is_applicable', true);

      const topicIds = (roleTopics ?? []).map((r: { topic_id: string }) => r.topic_id);

      if (topicIds.length === 0) {
        setGroupedTopics([]);
        setLoading(false);
        return;
      }

      // 5. Topics with categories and types
      const { data: topicsData } = await supabase
        .from('sm_topics')
        .select('id, category_id, name, def_rating_3, def_rating_4, def_rating_5')
        .in('id', topicIds);

      const categoryIds = [...new Set((topicsData ?? []).map((t: Topic) => t.category_id))];

      const { data: categoriesData } = await supabase
        .from('sm_categories')
        .select('id, type_id, name')
        .in('id', categoryIds);

      const typeIds = [...new Set((categoriesData ?? []).map((c: Category) => c.type_id))];

      const { data: typesData } = await supabase
        .from('sm_types')
        .select('id, name')
        .in('id', typeIds);

      // 6. Existing assessment items
      const { data: existingItems } = await supabase
        .from('sm_assessment_items')
        .select('id, assessment_id, topic_id, rating, comments')
        .eq('assessment_id', assessmentRecord.id);

      const itemMap: Record<string, AssessmentItem> = {};
      const ratingMap: Record<string, number | null> = {};
      const commentMap: Record<string, string> = {};
      for (const item of existingItems ?? []) {
        itemMap[item.topic_id] = item;
        ratingMap[item.topic_id] = item.rating ?? null;
        commentMap[item.topic_id] = item.comments ?? '';
      }
      setItems(itemMap);
      setLocalRatings(ratingMap);
      setLocalComments(commentMap);

      // 7. Group: Type → Category → Topic
      const typesMap: Record<string, SmType> = {};
      for (const t of typesData ?? []) typesMap[t.id] = t;

      const catMap: Record<string, Category> = {};
      for (const c of categoriesData ?? []) catMap[c.id] = c;

      const grouped: GroupedTopics[] = [];
      for (const type of typesData ?? []) {
        const cats = (categoriesData ?? []).filter((c: Category) => c.type_id === type.id);
        const catGroups = cats
          .map((cat: Category) => ({
            category: cat,
            topics: (topicsData ?? []).filter((t: Topic) => t.category_id === cat.id),
          }))
          .filter((cg) => cg.topics.length > 0);
        if (catGroups.length > 0) {
          grouped.push({ type, categories: catGroups });
        }
      }
      setGroupedTopics(grouped);

      // 8. Load mismatches if manager + completed
      if (assessorType === 'manager') {
        await loadMismatches(assessmentRecord.id);
      }
    } catch (err: any) {
      setError(err.message ?? 'Failed to load assessment');
    } finally {
      setLoading(false);
    }
  }

  async function getOrCreateAssessment(): Promise<Assessment | null> {
    // Try to find existing
    const { data: existing } = await supabase
      .from('sm_assessments')
      .select('*')
      .eq('cycle_id', cycleId)
      .eq('employee_id', employeeId)
      .eq('assessor_type', assessorType)
      .maybeSingle();

    if (existing) return existing as Assessment;

    // Create new
    const { data: created, error } = await supabase
      .from('sm_assessments')
      .insert({
        cycle_id: cycleId,
        employee_id: employeeId,
        assessor_id: user!.id,
        assessor_type: assessorType,
        status: 'pending',
      })
      .select('*')
      .single();

    if (error) {
      setError(error.message);
      return null;
    }
    return created as Assessment;
  }

  async function loadMismatches(assessmentId: string) {
    const { data } = await supabase
      .from('sm_mismatches')
      .select('*')
      .eq('cycle_id', cycleId)
      .eq('employee_id', employeeId)
      .is('resolution', null);
    setMismatches(data ?? []);
  }

  // ── Derived state ──────────────────────────────────────────────────────────

  const allTopicIds = groupedTopics.flatMap((g) => g.categories.flatMap((c) => c.topics.map((t) => t.id)));
  const ratedCount = allTopicIds.filter((id) => localRatings[id] !== null && localRatings[id] !== undefined).length;
  const totalCount = allTopicIds.length;
  const progressPct = totalCount > 0 ? Math.round((ratedCount / totalCount) * 100) : 0;
  const allRated = totalCount > 0 && ratedCount === totalCount;
  const isReadOnly = assessment?.status === 'completed';

  // Topic lookup for mismatch display
  const topicById: Record<string, Topic> = {};
  for (const g of groupedTopics) {
    for (const cg of g.categories) {
      for (const t of cg.topics) {
        topicById[t.id] = t;
      }
    }
  }

  // ── Handlers ──────────────────────────────────────────────────────────────

  function setRating(topicId: string, rating: number) {
    setLocalRatings((prev) => ({ ...prev, [topicId]: rating }));
  }

  function setComment(topicId: string, value: string) {
    setLocalComments((prev) => ({ ...prev, [topicId]: value }));
  }

  function toggleType(typeId: string) {
    setCollapsedTypes((prev) => ({ ...prev, [typeId]: !prev[typeId] }));
  }

  function toggleCategory(catId: string) {
    setCollapsedCategories((prev) => ({ ...prev, [catId]: !prev[catId] }));
  }

  function toggleDefs(topicId: string) {
    setExpandedDefs((prev) => ({ ...prev, [topicId]: !prev[topicId] }));
  }

  function toggleComment(topicId: string) {
    setExpandedComments((prev) => ({ ...prev, [topicId]: !prev[topicId] }));
  }

  async function buildUpsertPayload(): Promise<{ topic_id: string; rating: number | null; comments: string | null }[]> {
    return allTopicIds.map((topicId) => ({
      topic_id: topicId,
      rating: localRatings[topicId] ?? null,
      comments: localComments[topicId] ?? null,
    }));
  }

  async function saveItems(assessmentId: string) {
    const payload = await buildUpsertPayload();

    for (const p of payload) {
      const existing = items[p.topic_id];
      if (existing) {
        await supabase
          .from('sm_assessment_items')
          .update({ rating: p.rating, comments: p.comments })
          .eq('id', existing.id);
      } else {
        await supabase
          .from('sm_assessment_items')
          .insert({ assessment_id: assessmentId, topic_id: p.topic_id, rating: p.rating, comments: p.comments });
      }
    }

    // Refresh items map
    const { data: refreshed } = await supabase
      .from('sm_assessment_items')
      .select('*')
      .eq('assessment_id', assessmentId);
    const newMap: Record<string, AssessmentItem> = {};
    for (const item of refreshed ?? []) newMap[item.topic_id] = item;
    setItems(newMap);
  }

  async function handleSave() {
    if (!assessment) return;
    setSaving(true);
    setError(null);
    try {
      await saveItems(assessment.id);

      if (assessment.status === 'pending') {
        await supabase
          .from('sm_assessments')
          .update({ status: 'in_progress' })
          .eq('id', assessment.id);
        setAssessment((prev) => prev ? { ...prev, status: 'in_progress' } : prev);
      }

      setSuccessMsg('Progress saved.');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setError(err.message ?? 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  async function handleSubmit() {
    if (!assessment) return;
    if (!allRated) {
      setError('Please rate all topics before submitting.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await saveItems(assessment.id);

      // Mark completed
      await supabase
        .from('sm_assessments')
        .update({ status: 'completed', submitted_at: new Date().toISOString() })
        .eq('id', assessment.id);
      setAssessment((prev) => prev ? { ...prev, status: 'completed', submitted_at: new Date().toISOString() } : prev);

      // Check if both assessments are completed
      const { data: bothAssessments } = await supabase
        .from('sm_assessments')
        .select('id, assessor_type, status')
        .eq('cycle_id', cycleId)
        .eq('employee_id', employeeId);

      const empDone = bothAssessments?.find((a: any) => a.assessor_type === 'employee')?.status === 'completed';
      const mgrDone = bothAssessments?.find((a: any) => a.assessor_type === 'manager')?.status === 'completed';

      if (empDone && mgrDone) {
        await processMismatches(bothAssessments!);
      }

      onComplete?.();
    } catch (err: any) {
      setError(err.message ?? 'Failed to submit');
    } finally {
      setSubmitting(false);
    }
  }

  async function processMismatches(allAssessments: any[]) {
    const empAssessment = allAssessments.find((a: any) => a.assessor_type === 'employee');
    const mgrAssessment = allAssessments.find((a: any) => a.assessor_type === 'manager');
    if (!empAssessment || !mgrAssessment) return;

    const { data: empItems } = await supabase
      .from('sm_assessment_items')
      .select('topic_id, rating, comments')
      .eq('assessment_id', empAssessment.id);

    const { data: mgrItems } = await supabase
      .from('sm_assessment_items')
      .select('topic_id, rating, comments')
      .eq('assessment_id', mgrAssessment.id);

    const mgrMap: Record<string, { rating: number | null; comments: string | null }> = {};
    for (const item of mgrItems ?? []) mgrMap[item.topic_id] = item;

    const mismatches: any[] = [];
    for (const empItem of empItems ?? []) {
      const mgrItem = mgrMap[empItem.topic_id];
      if (!mgrItem) continue;
      if (empItem.rating !== null && mgrItem.rating !== null && empItem.rating !== mgrItem.rating) {
        mismatches.push({
          cycle_id: cycleId,
          employee_id: employeeId,
          topic_id: empItem.topic_id,
          employee_rating: empItem.rating,
          manager_rating: mgrItem.rating,
          employee_comments: empItem.comments,
          manager_comments: mgrItem.comments,
        });
      }
    }

    if (mismatches.length > 0) {
      await supabase.from('sm_mismatches').insert(mismatches);
    }
  }

  async function handleResolveMismatch(mismatch: Mismatch) {
    const state = resolvingMismatch[mismatch.id];
    if (!state || !state.action) return;

    if (state.action === 'override_manager' && !state.feedback.trim()) {
      setError('Please provide feedback before confirming the override.');
      return;
    }

    const isAccept = state.action === 'accept_employee';
    const update: any = {
      resolution: state.action,
      final_rating: isAccept ? mismatch.employee_rating : mismatch.manager_rating,
      resolved_by: user!.id,
      resolved_at: new Date().toISOString(),
    };
    if (!isAccept) update.manager_feedback = state.feedback;

    const { error } = await supabase
      .from('sm_mismatches')
      .update(update)
      .eq('id', mismatch.id);

    if (error) {
      setError(error.message);
      return;
    }

    setMismatches((prev) => prev.filter((m) => m.id !== mismatch.id));
    setResolvingMismatch((prev) => {
      const next = { ...prev };
      delete next[mismatch.id];
      return next;
    });
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-gray-500">
        <Clock className="w-5 h-5 mr-2 animate-spin" />
        Loading assessment…
      </div>
    );
  }

  if (!assessment) {
    return (
      <div className="flex items-center gap-2 text-red-600 py-8">
        <AlertCircle className="w-5 h-5" />
        Could not load or create assessment.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              {assessorType === 'employee' ? (
                <span className="inline-flex items-center gap-1 text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 rounded-full px-2.5 py-0.5">
                  <Star className="w-3 h-3" />
                  Self Assessment
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-xs font-medium bg-teal-50 text-teal-700 border border-teal-200 rounded-full px-2.5 py-0.5">
                  <Star className="w-3 h-3" />
                  Manager Assessment
                </span>
              )}
              {isReadOnly && (
                <span className="inline-flex items-center gap-1 text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200 rounded-full px-2.5 py-0.5">
                  <Lock className="w-3 h-3" />
                  Completed
                </span>
              )}
            </div>
            <h2 className="text-xl font-semibold text-gray-900">{employeeName}</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Cycle: <span className="font-medium text-gray-700">{cycle?.name ?? '—'}</span>
              {cycle?.due_date && (
                <> &middot; Due <span className="font-medium text-gray-700">{formatDate(cycle.due_date)}</span></>
              )}
            </p>
          </div>
          {/* Status badge */}
          <div>
            {assessment.status === 'completed' ? (
              <div className="flex items-center gap-1.5 text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-sm font-medium">
                <CheckCircle className="w-4 h-4" />
                Submitted {assessment.submitted_at ? formatDate(assessment.submitted_at) : ''}
              </div>
            ) : assessment.status === 'in_progress' ? (
              <div className="flex items-center gap-1.5 text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-sm font-medium">
                <Clock className="w-4 h-4" />
                In Progress
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-gray-600 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm font-medium">
                <Clock className="w-4 h-4" />
                Pending
              </div>
            )}
          </div>
        </div>

        {/* Progress bar */}
        {!isReadOnly && totalCount > 0 && (
          <div className="mt-4">
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>{ratedCount} of {totalCount} topics rated</span>
              <span>{progressPct}%</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${allRated ? 'bg-green-500' : 'bg-blue-500'}`}
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* ── Completion banner ── */}
      {!isReadOnly && allRated && (
        <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl px-5 py-3 text-green-800">
          <CheckCircle className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm font-medium">All topics rated. You can now submit your assessment.</span>
        </div>
      )}

      {/* ── Error / success ── */}
      {error && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl px-5 py-3 text-red-700">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <span className="text-sm">{error}</span>
        </div>
      )}
      {successMsg && (
        <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl px-5 py-3 text-green-700">
          <CheckCircle className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm font-medium">{successMsg}</span>
        </div>
      )}

      {/* ── Rating scale legend ── */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl px-5 py-3">
        <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-2">
          <Info className="w-3.5 h-3.5" />
          <span className="font-medium">Rating Scale</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {([0, 1, 2, 3, 4, 5] as const).map((r) => (
            <span key={r} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${ratingBadgeClass(r)}`}>
              {r} – {RATING_LABELS[r]}
            </span>
          ))}
        </div>
      </div>

      {/* ── Topic sections ── */}
      {groupedTopics.length === 0 ? (
        <div className="text-center py-10 text-gray-500 bg-white rounded-xl border border-gray-200">
          No applicable topics found for this role.
        </div>
      ) : (
        groupedTopics.map((group) => (
          <div key={group.type.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {/* Type header */}
            <button
              type="button"
              onClick={() => toggleType(group.type.id)}
              className="w-full flex items-center justify-between px-6 py-4 bg-gray-50 hover:bg-gray-100 transition-colors border-b border-gray-200"
            >
              <span className="font-semibold text-gray-800 text-base">{group.type.name}</span>
              {collapsedTypes[group.type.id]
                ? <ChevronRight className="w-5 h-5 text-gray-400" />
                : <ChevronDown className="w-5 h-5 text-gray-400" />}
            </button>

            {!collapsedTypes[group.type.id] && (
              <div className="divide-y divide-gray-100">
                {group.categories.map((cg) => (
                  <div key={cg.category.id}>
                    {/* Category header */}
                    <button
                      type="button"
                      onClick={() => toggleCategory(cg.category.id)}
                      className="w-full flex items-center justify-between px-6 py-3 hover:bg-gray-50 transition-colors"
                    >
                      <span className="font-medium text-gray-700 text-sm">{cg.category.name}</span>
                      {collapsedCategories[cg.category.id]
                        ? <ChevronRight className="w-4 h-4 text-gray-400" />
                        : <ChevronDown className="w-4 h-4 text-gray-400" />}
                    </button>

                    {!collapsedCategories[cg.category.id] && (
                      <div className="divide-y divide-gray-50">
                        {cg.topics.map((topic) => {
                          const currentRating = localRatings[topic.id] ?? null;
                          const currentComment = localComments[topic.id] ?? '';
                          const hasDefinitions = topic.def_rating_3 || topic.def_rating_4 || topic.def_rating_5;

                          return (
                            <div key={topic.id} className="px-6 py-5 bg-white hover:bg-gray-50/50 transition-colors">
                              <div className="flex flex-wrap items-start justify-between gap-3">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-medium text-gray-800">{topic.name}</span>
                                    {isReadOnly && <RatingBadge rating={currentRating} />}
                                  </div>

                                  {/* Definitions panel */}
                                  {hasDefinitions && (
                                    <div className="mt-2">
                                      <button
                                        type="button"
                                        onClick={() => toggleDefs(topic.id)}
                                        className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800"
                                      >
                                        <Info className="w-3.5 h-3.5" />
                                        {expandedDefs[topic.id] ? 'Hide definitions' : 'View definitions'}
                                      </button>
                                      {expandedDefs[topic.id] && (
                                        <div className="mt-2 space-y-1.5 bg-blue-50 border border-blue-100 rounded-lg p-3">
                                          {topic.def_rating_3 && (
                                            <div className="text-xs">
                                              <span className={`font-semibold ${ratingBadgeClass(3).includes('green') ? 'text-green-700' : ''}`}>3 – Good: </span>
                                              <span className="text-gray-700">{topic.def_rating_3}</span>
                                            </div>
                                          )}
                                          {topic.def_rating_4 && (
                                            <div className="text-xs">
                                              <span className="font-semibold text-green-700">4 – Excellent: </span>
                                              <span className="text-gray-700">{topic.def_rating_4}</span>
                                            </div>
                                          )}
                                          {topic.def_rating_5 && (
                                            <div className="text-xs">
                                              <span className="font-semibold text-green-700">5 – Role Model / SME: </span>
                                              <span className="text-gray-700">{topic.def_rating_5}</span>
                                            </div>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>

                                {/* Rating buttons */}
                                {!isReadOnly && (
                                  <div className="flex items-center gap-1.5 flex-shrink-0">
                                    {([0, 1, 2, 3, 4, 5] as const).map((r) => (
                                      <RatingButton
                                        key={r}
                                        value={r}
                                        selected={currentRating === r}
                                        onClick={() => setRating(topic.id, r)}
                                        disabled={false}
                                      />
                                    ))}
                                  </div>
                                )}
                              </div>

                              {/* Rating label (below buttons) */}
                              {!isReadOnly && currentRating !== null && (
                                <div className="mt-2 ml-auto w-fit">
                                  <span className={`text-xs font-medium ${
                                    ratingColor(currentRating) === 'red' ? 'text-red-600' :
                                    ratingColor(currentRating) === 'amber' ? 'text-amber-600' :
                                    'text-green-600'
                                  }`}>
                                    {RATING_LABELS[currentRating]}
                                  </span>
                                </div>
                              )}

                              {/* Comments */}
                              {!isReadOnly && (
                                <div className="mt-3">
                                  {!expandedComments[topic.id] ? (
                                    <button
                                      type="button"
                                      onClick={() => toggleComment(topic.id)}
                                      className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
                                    >
                                      <MessageSquare className="w-3.5 h-3.5" />
                                      {currentComment ? 'Edit comment' : 'Add comment'}
                                    </button>
                                  ) : (
                                    <div className="space-y-1.5">
                                      <label className="text-xs font-medium text-gray-600 flex items-center gap-1">
                                        <MessageSquare className="w-3.5 h-3.5" />
                                        Comment (optional)
                                      </label>
                                      <textarea
                                        rows={3}
                                        value={currentComment}
                                        onChange={(e) => setComment(topic.id, e.target.value)}
                                        placeholder="Add your comments…"
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-800 resize-none focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-400"
                                      />
                                      <button
                                        type="button"
                                        onClick={() => toggleComment(topic.id)}
                                        className="text-xs text-gray-400 hover:text-gray-600"
                                      >
                                        Collapse
                                      </button>
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* Read-only comment display */}
                              {isReadOnly && currentComment && (
                                <div className="mt-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-600 italic">
                                  "{currentComment}"
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))
      )}

      {/* ── Action buttons ── */}
      {!isReadOnly && totalCount > 0 && (
        <div className="flex flex-wrap items-center gap-3 bg-white rounded-xl border border-gray-200 px-6 py-4">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || submitting}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium text-sm rounded-lg border border-gray-300 transition-colors disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving…' : 'Save Progress'}
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!allRated || saving || submitting}
            className={`inline-flex items-center gap-2 px-5 py-2 font-medium text-sm rounded-lg border transition-colors
              ${allRated
                ? 'bg-green-600 hover:bg-green-700 text-white border-green-600'
                : 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
              } disabled:opacity-60`}
          >
            <Send className="w-4 h-4" />
            {submitting ? 'Submitting…' : 'Submit Assessment'}
          </button>
          {!allRated && (
            <span className="text-xs text-gray-400">{totalCount - ratedCount} topic{totalCount - ratedCount !== 1 ? 's' : ''} still need a rating</span>
          )}
        </div>
      )}

      {/* ── Mismatch Resolution (manager only, post-completion) ── */}
      {assessorType === 'manager' && isReadOnly && mismatches.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-amber-500" />
            <h3 className="text-base font-semibold text-gray-800">
              Rating Mismatches ({mismatches.length})
            </h3>
          </div>
          <p className="text-sm text-gray-500">
            The following topics have differing ratings between self-assessment and manager assessment. Please resolve each one.
          </p>

          {mismatches.map((mismatch) => {
            const topic = topicById[mismatch.topic_id];
            const diff = Math.abs(mismatch.employee_rating - mismatch.manager_rating);
            const resolveState = resolvingMismatch[mismatch.id] ?? { action: null, feedback: '' };

            return (
              <div key={mismatch.id} className="bg-white rounded-xl border border-amber-200 overflow-hidden">
                <div className="px-5 py-4 border-b border-amber-100 bg-amber-50">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-semibold text-gray-800">{topic?.name ?? mismatch.topic_id}</span>
                    <span className="text-xs font-medium bg-amber-100 text-amber-700 border border-amber-200 rounded-full px-2.5 py-0.5">
                      Difference: {diff}
                    </span>
                  </div>
                </div>

                <div className="px-5 py-4 space-y-4">
                  {/* Rating comparison */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Employee Rating</p>
                      <RatingBadge rating={mismatch.employee_rating} />
                      {mismatch.employee_comments && (
                        <p className="text-xs text-gray-500 italic mt-1">"{mismatch.employee_comments}"</p>
                      )}
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Manager Rating</p>
                      <RatingBadge rating={mismatch.manager_rating} />
                      {mismatch.manager_comments && (
                        <p className="text-xs text-gray-500 italic mt-1">"{mismatch.manager_comments}"</p>
                      )}
                    </div>
                  </div>

                  {/* Resolution actions */}
                  <div className="space-y-3">
                    <p className="text-sm font-medium text-gray-700">Resolve this mismatch:</p>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setResolvingMismatch((prev) => ({
                          ...prev,
                          [mismatch.id]: { action: 'accept_employee', feedback: prev[mismatch.id]?.feedback ?? '' },
                        }))}
                        className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors
                          ${resolveState.action === 'accept_employee'
                            ? 'bg-green-600 text-white border-green-600'
                            : 'bg-white text-gray-700 border-gray-300 hover:bg-green-50 hover:border-green-400 hover:text-green-700'
                          }`}
                      >
                        Accept Employee Rating ({mismatch.employee_rating})
                      </button>
                      <button
                        type="button"
                        onClick={() => setResolvingMismatch((prev) => ({
                          ...prev,
                          [mismatch.id]: { action: 'override_manager', feedback: prev[mismatch.id]?.feedback ?? '' },
                        }))}
                        className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors
                          ${resolveState.action === 'override_manager'
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white text-gray-700 border-gray-300 hover:bg-blue-50 hover:border-blue-400 hover:text-blue-700'
                          }`}
                      >
                        Override with My Rating ({mismatch.manager_rating})
                      </button>
                    </div>

                    {/* Override feedback */}
                    {resolveState.action === 'override_manager' && (
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-gray-600">
                          Feedback <span className="text-red-500">*</span> (required for override)
                        </label>
                        <textarea
                          rows={3}
                          value={resolveState.feedback}
                          onChange={(e) => setResolvingMismatch((prev) => ({
                            ...prev,
                            [mismatch.id]: { ...prev[mismatch.id], feedback: e.target.value },
                          }))}
                          placeholder="Explain your reasoning for overriding the employee's rating…"
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-400"
                        />
                      </div>
                    )}

                    {/* Confirm button */}
                    {resolveState.action && (
                      <button
                        type="button"
                        onClick={() => handleResolveMismatch(mismatch)}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-900 text-white text-sm font-medium rounded-lg transition-colors"
                      >
                        <CheckCircle className="w-4 h-4" />
                        Confirm Resolution
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── All mismatches resolved banner ── */}
      {assessorType === 'manager' && isReadOnly && mismatches.length === 0 && (
        <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl px-5 py-3 text-green-800">
          <CheckCircle className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm font-medium">All mismatches resolved. Assessment is complete.</span>
        </div>
      )}
    </div>
  );
}
