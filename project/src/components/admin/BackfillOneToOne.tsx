import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Plus, ChevronDown, ChevronUp, CheckCircle, Clock, Trash2, Save, X, Info, History } from 'lucide-react';
import { format } from 'date-fns';

interface ReviewCycle {
  id: string;
  cycle_name: string;
  quarter: string | null;
  cycle_type: string | null;
  manager_id: string;
  manager_name: string;
}

interface Employee {
  id: string;
  full_name: string;
  job_title: string | null;
  department: string | null;
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
  score: number;
  actual_value: string;
  comment: string;
}

interface ActionItem {
  action_text: string;
  owner: 'employee' | 'manager';
  due_date: string;
}

interface BackfilledReview {
  id: string;
  employee_name: string;
  review_month: string;
  overall_average: number | null;
  status: string;
  manager_name: string;
  cycle_name: string;
}

const SCORE_LABELS: Record<number, { label: string; color: string; bg: string }> = {
  0: { label: 'Not rated', color: 'text-gray-600', bg: 'bg-gray-100' },
  1: { label: 'Development needed', color: 'text-red-700', bg: 'bg-red-50' },
  2: { label: 'Requires guidance', color: 'text-orange-700', bg: 'bg-orange-50' },
  3: { label: 'On target', color: 'text-blue-700', bg: 'bg-blue-50' },
  4: { label: 'Exceeding', color: 'text-green-700', bg: 'bg-green-50' },
  5: { label: 'Exceptional', color: 'text-emerald-700', bg: 'bg-emerald-50' },
};

const COMPETENCY_OPTIONS = [
  { value: 1, label: '1 — Development Needed' },
  { value: 3, label: '3 — On Target' },
  { value: 5, label: '5 — Exceptional' },
];

export default function BackfillOneToOne() {
  const { profile } = useAuth();
  const [cycles, setCycles] = useState<ReviewCycle[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [backfilledReviews, setBackfilledReviews] = useState<BackfilledReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [expandedReview, setExpandedReview] = useState<string | null>(null);

  // Form state
  const [selectedCycleId, setSelectedCycleId] = useState('');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [reviewDate, setReviewDate] = useState('');
  const [cycleKPIs, setCycleKPIs] = useState<CycleKPI[]>([]);
  const [kpiEntries, setKpiEntries] = useState<KPIEntry[]>([]);
  const [manualKpiName, setManualKpiName] = useState('');
  const [competencyScore, setCompetencyScore] = useState<number>(3);
  const [competencyComment, setCompetencyComment] = useState('');
  const [managerSummary, setManagerSummary] = useState('');
  const [performanceScore, setPerformanceScore] = useState<number>(3);
  const [actions, setActions] = useState<ActionItem[]>([{ action_text: '', owner: 'employee', due_date: '' }]);
  const [deleteTarget, setDeleteTarget] = useState<BackfilledReview | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchAll();
  }, []);

  useEffect(() => {
    if (selectedCycleId) loadCycleKPIs(selectedCycleId);
    else { setCycleKPIs([]); setKpiEntries([]); }
  }, [selectedCycleId]);

  async function fetchAll() {
    setLoading(true);
    const [cyclesRes, employeesRes, reviewsRes] = await Promise.all([
      supabase
        .from('one_to_one_review_cycles')
        .select('id, cycle_name, quarter, cycle_type, manager_id, profiles!one_to_one_review_cycles_manager_id_fkey(full_name)')
        .order('created_at', { ascending: false }),
      supabase
        .from('profiles')
        .select('id, full_name, job_title, department')
        .eq('role', 'employee')
        .order('full_name'),
      supabase
        .from('one_to_one_monthly_reviews')
        .select(`
          id, review_month, overall_average, status,
          employee:profiles!one_to_one_monthly_reviews_employee_id_fkey(full_name),
          meeting:one_to_one_scheduled_meetings!one_to_one_monthly_reviews_meeting_id_fkey(
            oto_cycle_id,
            manager:profiles!one_to_one_scheduled_meetings_manager_id_fkey(full_name)
          )
        `)
        .eq('status', 'completed')
        .order('review_month', { ascending: false })
        .limit(50),
    ]);

    const parsedCycles: ReviewCycle[] = (cyclesRes.data || []).map((c: any) => ({
      id: c.id,
      cycle_name: c.cycle_name,
      quarter: c.quarter,
      cycle_type: c.cycle_type,
      manager_id: c.manager_id,
      manager_name: Array.isArray(c.profiles) ? c.profiles[0]?.full_name : c.profiles?.full_name || '—',
    }));

    setCycles(parsedCycles);
    setEmployees(employeesRes.data || []);

    // Filter to only backfilled reviews — those with a sentinel note
    const backfilled: BackfilledReview[] = [];
    for (const r of reviewsRes.data || []) {
      const emp = Array.isArray(r.employee) ? r.employee[0] : r.employee;
      const mtg = Array.isArray(r.meeting) ? r.meeting[0] : r.meeting;
      const mgr = Array.isArray(mtg?.manager) ? mtg?.manager[0] : mtg?.manager;
      const cycleId = mtg?.oto_cycle_id;
      const cycle = parsedCycles.find(c => c.id === cycleId);
      backfilled.push({
        id: r.id,
        employee_name: emp?.full_name || 'Unknown',
        review_month: r.review_month,
        overall_average: r.overall_average,
        status: r.status,
        manager_name: mgr?.full_name || '—',
        cycle_name: cycle?.cycle_name || '—',
      });
    }

    setBackfilledReviews(backfilled);
    setLoading(false);
  }

  async function loadCycleKPIs(cycleId: string) {
    const { data } = await supabase
      .from('one_to_one_cycle_kpis')
      .select('id, kpi_name, target_value, measurement_unit')
      .eq('cycle_id', cycleId)
      .order('sort_order');

    const kpis = data || [];
    setCycleKPIs(kpis);
    setKpiEntries(kpis.map(k => ({
      kpi_id: k.id,
      kpi_name: k.kpi_name,
      target_value: k.target_value,
      measurement_unit: k.measurement_unit,
      score: 3,
      actual_value: '',
      comment: '',
    })));
  }

  function addManualKPI() {
    if (!manualKpiName.trim()) return;
    setKpiEntries(prev => [...prev, {
      kpi_id: `manual_${Date.now()}`,
      kpi_name: manualKpiName.trim(),
      target_value: '',
      measurement_unit: '',
      score: 3,
      actual_value: '',
      comment: '',
    }]);
    setManualKpiName('');
  }

  function removeKPI(kpiId: string) {
    setKpiEntries(prev => prev.filter(k => k.kpi_id !== kpiId));
  }

  function updateKPI(kpiId: string, field: keyof KPIEntry, value: any) {
    setKpiEntries(prev => prev.map(k => k.kpi_id === kpiId ? { ...k, [field]: value } : k));
  }

  function updateAction(idx: number, field: keyof ActionItem, value: string) {
    setActions(prev => prev.map((a, i) => i === idx ? { ...a, [field]: value } : a));
  }

  function addAction() {
    setActions(prev => [...prev, { action_text: '', owner: 'employee', due_date: '' }]);
  }

  function removeAction(idx: number) {
    setActions(prev => prev.filter((_, i) => i !== idx));
  }

  function resetForm() {
    setSelectedCycleId('');
    setSelectedEmployeeId('');
    setReviewDate('');
    setCycleKPIs([]);
    setKpiEntries([]);
    setManualKpiName('');
    setCompetencyScore(3);
    setCompetencyComment('');
    setManagerSummary('');
    setPerformanceScore(3);
    setActions([{ action_text: '', owner: 'employee', due_date: '' }]);
  }

  async function handleSave() {
    if (!selectedCycleId || !selectedEmployeeId || !reviewDate) return;

    setSaving(true);
    try {
      const cycle = cycles.find(c => c.id === selectedCycleId);
      if (!cycle) return;

      // Compute averages
      const scoredKPIs = kpiEntries.filter(k => k.score > 0);
      const kpiAvg = scoredKPIs.length > 0
        ? parseFloat((scoredKPIs.reduce((s, k) => s + k.score, 0) / scoredKPIs.length).toFixed(2))
        : null;
      const compAvg = competencyScore || null;
      const overallAvg = kpiAvg != null && compAvg != null
        ? parseFloat(((kpiAvg + compAvg) / 2).toFixed(2))
        : (kpiAvg ?? compAvg);

      // Build kpi_entries payload for storage
      const kpiEntriesPayload = kpiEntries.map(k => ({
        kpi_id: k.kpi_id,
        kpi_name: k.kpi_name,
        target_value: k.target_value,
        measurement_unit: k.measurement_unit,
        manual_score: k.score,
        manual_actual: k.actual_value,
        comment: k.comment,
      }));

      // Build kpi_snapshots for dashboard/reporting (matches normal review format)
      const kpiSnapshots: Record<string, any> = {};
      kpiEntries.forEach(k => {
        kpiSnapshots[k.kpi_id] = {
          kpi_name: k.kpi_name,
          target_value: k.target_value,
          measurement_unit: k.measurement_unit,
          average_score: k.score,
          latest_actual: k.actual_value,
          entry_count: 1,
        };
      });

      // Build values_ratings for competency
      const valuesRatings = competencyComment || competencyScore
        ? [{
            value_id: 'backfill',
            value_title: 'Overall Performance',
            competency_id: 'backfill',
            competency_title: 'Overall Performance',
            manager_rating: competencyScore,
            manager_comment: competencyComment,
          }]
        : [];

      // 1. Create or reuse a scheduled meeting for this employee + cycle
      const { data: existingMeeting } = await supabase
        .from('one_to_one_scheduled_meetings')
        .select('id')
        .eq('oto_cycle_id', selectedCycleId)
        .eq('employee_id', selectedEmployeeId)
        .maybeSingle();

      let meetingId: string;
      if (existingMeeting) {
        meetingId = existingMeeting.id;
      } else {
        const reviewDateTs = new Date(reviewDate + 'T12:00:00').toISOString();
        const { data: newMeeting, error: meetingError } = await supabase
          .from('one_to_one_scheduled_meetings')
          .insert({
            oto_cycle_id: selectedCycleId,
            manager_id: cycle.manager_id,
            employee_id: selectedEmployeeId,
            scheduled_datetime: reviewDateTs,
            completion_status: 'completed',
            submitted_at: reviewDateTs,
            status: 'scheduled',
          })
          .select('id')
          .single();

        if (meetingError) throw meetingError;
        meetingId = newMeeting.id;
      }

      // 2. Check no existing monthly review for this month
      const reviewMonthStr = reviewDate.substring(0, 7) + '-01';
      const { data: existingReview } = await supabase
        .from('one_to_one_monthly_reviews')
        .select('id')
        .eq('meeting_id', meetingId)
        .eq('employee_id', selectedEmployeeId)
        .eq('review_month', reviewMonthStr)
        .maybeSingle();

      if (existingReview) {
        alert('A review already exists for this employee and month. Choose a different month or employee.');
        setSaving(false);
        return;
      }

      // 3. Insert monthly review as completed
      const reviewDateTs = new Date(reviewDate + 'T12:00:00').toISOString();
      const { error: reviewError } = await supabase
        .from('one_to_one_monthly_reviews')
        .insert({
          meeting_id: meetingId,
          employee_id: selectedEmployeeId,
          manager_id: cycle.manager_id,
          review_month: reviewMonthStr,
          status: 'completed',
          submitted_at: reviewDateTs,
          overall_kpi_average: kpiAvg,
          overall_competency_score: compAvg,
          overall_average: overallAvg,
          kpi_entries: kpiEntriesPayload,
          kpi_snapshots: kpiSnapshots,
          values_ratings: valuesRatings,
          manager_summary: managerSummary,
          sera_draft_summary: '',
          manager_additional_context: 'backfill',
          requires_moderation: false,
          moderation_status: 'approved',
        });

      if (reviewError) throw reviewError;

      // 4. Insert action items
      const validActions = actions.filter(a => a.action_text.trim());
      if (validActions.length > 0) {
        await supabase.from('one_to_one_action_items').insert(
          validActions.map(a => ({
            meeting_id: meetingId,
            owner_id: a.owner === 'employee' ? selectedEmployeeId : cycle.manager_id,
            action_text: a.action_text,
            due_date: a.due_date || null,
            status: 'open',
          }))
        );
      }

      // 5. Update meeting completion status to ensure dashboard counts it
      await supabase
        .from('one_to_one_scheduled_meetings')
        .update({ completion_status: 'completed', submitted_at: reviewDateTs })
        .eq('id', meetingId);

      setShowForm(false);
      resetForm();
      await fetchAll();
    } catch (err) {
      console.error('Backfill save error:', err);
      alert('Failed to save. Please check all fields and try again.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await supabase.from('one_to_one_monthly_reviews').delete().eq('id', deleteTarget.id);
      setDeleteTarget(null);
      await fetchAll();
    } catch (err) {
      console.error('Delete error:', err);
      alert('Failed to delete.');
    } finally {
      setDeleting(false);
    }
  }

  const selectedCycle = cycles.find(c => c.id === selectedCycleId);
  const isFormValid = selectedCycleId && selectedEmployeeId && reviewDate;

  if (loading) {
    return <div className="text-center py-12 text-gray-500">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Backfill Historical One-to-Ones</h2>
          <p className="text-sm text-gray-500 mt-1">Admin-only tool for entering past review data. For testing and history backfill only.</p>
        </div>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors flex-shrink-0"
          >
            <Plus className="w-4 h-4" />
            Add Historical Review
          </button>
        )}
      </div>

      <div className="flex items-start gap-2.5 p-3.5 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
        <Info className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-600" />
        <span>Records saved here are stored as completed monthly reviews. They appear in previous reviews (read-only), dashboard calculations, and completion rates — identical to normally submitted reviews.</span>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50">
            <h3 className="font-semibold text-gray-900">New Historical Review</h3>
            <button onClick={() => { setShowForm(false); resetForm(); }} className="text-gray-400 hover:text-gray-700">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 space-y-6">
            {/* Step 1: Who */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">Review Cycle *</label>
                <select
                  value={selectedCycleId}
                  onChange={e => setSelectedCycleId(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
                >
                  <option value="">Select cycle...</option>
                  {cycles.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.cycle_name}{c.quarter ? ` — ${c.quarter}` : ''} ({c.manager_name})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">Employee *</label>
                <select
                  value={selectedEmployeeId}
                  onChange={e => setSelectedEmployeeId(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
                >
                  <option value="">Select employee...</option>
                  {employees.map(e => (
                    <option key={e.id} value={e.id}>
                      {e.full_name}{e.department ? ` — ${e.department}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">Review Date *</label>
                <input
                  type="date"
                  value={reviewDate}
                  max={format(new Date(), 'yyyy-MM-dd')}
                  onChange={e => setReviewDate(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
                <p className="text-xs text-gray-400 mt-1">Month determines which month this review belongs to.</p>
              </div>
            </div>

            <hr className="border-gray-100" />

            {/* KPI Ratings */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold text-gray-800">KPI Ratings</h4>
                <span className="text-xs text-gray-400">
                  {cycleKPIs.length > 0 ? `${cycleKPIs.length} KPIs from cycle` : 'No cycle KPIs — add manually'}
                </span>
              </div>

              {kpiEntries.length > 0 ? (
                <div className="space-y-3">
                  {kpiEntries.map(entry => (
                    <div key={entry.kpi_id} className="border border-gray-100 rounded-lg p-4 bg-gray-50">
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800">{entry.kpi_name}</p>
                          {entry.target_value && (
                            <p className="text-xs text-gray-500 mt-0.5">Target: {entry.target_value}{entry.measurement_unit ? ` ${entry.measurement_unit}` : ''}</p>
                          )}
                        </div>
                        {entry.kpi_id.startsWith('manual_') && (
                          <button onClick={() => removeKPI(entry.kpi_id)} className="text-gray-300 hover:text-red-500 transition-colors flex-shrink-0">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="text-xs text-gray-500 mb-1 block">Score</label>
                          <div className="flex gap-1.5 flex-wrap">
                            {[1, 2, 3, 4, 5].map(s => (
                              <button
                                key={s}
                                onClick={() => updateKPI(entry.kpi_id, 'score', s)}
                                className={`w-8 h-8 rounded-lg text-sm font-bold border-2 transition-all ${
                                  entry.score === s
                                    ? `${SCORE_LABELS[s].bg} ${SCORE_LABELS[s].color} border-current`
                                    : 'bg-white text-gray-400 border-gray-200 hover:border-gray-400'
                                }`}
                              >
                                {s}
                              </button>
                            ))}
                          </div>
                          {entry.score > 0 && (
                            <p className={`text-xs mt-1 font-medium ${SCORE_LABELS[entry.score].color}`}>{SCORE_LABELS[entry.score].label}</p>
                          )}
                        </div>
                        <div>
                          <label className="text-xs text-gray-500 mb-1 block">Actual value</label>
                          <input
                            type="text"
                            value={entry.actual_value}
                            onChange={e => updateKPI(entry.kpi_id, 'actual_value', e.target.value)}
                            placeholder={entry.measurement_unit || 'e.g. 94%'}
                            className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-500 mb-1 block">Comment</label>
                          <input
                            type="text"
                            value={entry.comment}
                            onChange={e => updateKPI(entry.kpi_id, 'comment', e.target.value)}
                            placeholder="Optional note"
                            className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-400 italic">No KPIs added yet.</p>
              )}

              <div className="flex items-center gap-2 mt-3">
                <input
                  type="text"
                  value={manualKpiName}
                  onChange={e => setManualKpiName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addManualKPI()}
                  placeholder="Add KPI manually..."
                  className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
                <button
                  onClick={addManualKPI}
                  disabled={!manualKpiName.trim()}
                  className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm rounded-lg transition-colors disabled:opacity-40"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            <hr className="border-gray-100" />

            {/* Overall Performance Score */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <h4 className="text-sm font-semibold text-gray-800 mb-3">Overall Performance Score</h4>
                <div className="flex gap-2 flex-wrap mb-2">
                  {[1, 2, 3, 4, 5].map(s => (
                    <button
                      key={s}
                      onClick={() => setPerformanceScore(s)}
                      className={`flex-1 min-w-0 py-2 px-1 rounded-lg text-sm font-bold border-2 transition-all ${
                        performanceScore === s
                          ? `${SCORE_LABELS[s].bg} ${SCORE_LABELS[s].color} border-current`
                          : 'bg-white text-gray-400 border-gray-200 hover:border-gray-400'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
                <p className={`text-xs font-medium ${SCORE_LABELS[performanceScore].color}`}>{SCORE_LABELS[performanceScore].label}</p>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-gray-800 mb-3">Competency Rating</h4>
                <select
                  value={competencyScore}
                  onChange={e => setCompetencyScore(Number(e.target.value))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white mb-2"
                >
                  {COMPETENCY_OPTIONS.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
                <input
                  type="text"
                  value={competencyComment}
                  onChange={e => setCompetencyComment(e.target.value)}
                  placeholder="Evidence or comment..."
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>

            <hr className="border-gray-100" />

            {/* Manager Summary */}
            <div>
              <h4 className="text-sm font-semibold text-gray-800 mb-2">Manager Summary</h4>
              <textarea
                value={managerSummary}
                onChange={e => setManagerSummary(e.target.value)}
                rows={3}
                placeholder="Overall summary of this review period..."
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none"
              />
            </div>

            <hr className="border-gray-100" />

            {/* Action Items */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold text-gray-800">Action Items</h4>
                <button onClick={addAction} className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1">
                  <Plus className="w-3.5 h-3.5" /> Add action
                </button>
              </div>
              <div className="space-y-2">
                {actions.map((action, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={action.action_text}
                      onChange={e => updateAction(idx, 'action_text', e.target.value)}
                      placeholder="Action description..."
                      className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                    <select
                      value={action.owner}
                      onChange={e => updateAction(idx, 'owner', e.target.value)}
                      className="border border-gray-200 rounded-lg px-2 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                    >
                      <option value="employee">Employee</option>
                      <option value="manager">Manager</option>
                    </select>
                    <input
                      type="date"
                      value={action.due_date}
                      onChange={e => updateAction(idx, 'due_date', e.target.value)}
                      className="border border-gray-200 rounded-lg px-2 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                    {actions.length > 1 && (
                      <button onClick={() => removeAction(idx)} className="text-gray-300 hover:text-red-500 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <hr className="border-gray-100" />

            {/* Save */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>Will be saved as <strong>Completed</strong></span>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => { setShowForm(false); resetForm(); }}
                  className="px-4 py-2 text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={!isFormValid || saving}
                  className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-40"
                >
                  {saving ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  Save as Completed
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Existing backfilled reviews */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <History className="w-4 h-4 text-gray-500" />
          <h3 className="text-sm font-semibold text-gray-800">All Completed Reviews</h3>
          <span className="text-xs text-gray-400 ml-auto">{backfilledReviews.length} records</span>
        </div>

        {backfilledReviews.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-gray-200 text-gray-400 text-sm">
            No completed reviews yet. Use the button above to add historical data.
          </div>
        ) : (
          <div className="space-y-2">
            {backfilledReviews.map(r => (
              <div key={r.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="flex items-center">
                  <button
                    onClick={() => setExpandedReview(expandedReview === r.id ? null : r.id)}
                    className="flex-1 flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 transition-colors text-left"
                  >
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="font-medium text-gray-900 text-sm">{r.employee_name}</span>
                      <span className="text-gray-300">|</span>
                      <span className="text-sm text-gray-600">
                        {format(new Date(r.review_month + 'T12:00:00'), 'MMMM yyyy')}
                      </span>
                      <span className="text-xs text-gray-400">{r.cycle_name}</span>
                      {r.overall_average != null && (
                        <span className="text-xs font-medium text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">
                          Avg: {Number(r.overall_average).toFixed(2)}/5
                        </span>
                      )}
                      <span className="flex items-center gap-1 text-xs font-medium text-green-700 bg-green-50 px-2 py-0.5 rounded-full">
                        <CheckCircle className="w-3 h-3" /> Completed
                      </span>
                    </div>
                    {expandedReview === r.id ? <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0 ml-3" /> : <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0 ml-3" />}
                  </button>
                  <button
                    onClick={() => setDeleteTarget(r)}
                    className="px-4 py-3.5 text-gray-300 hover:text-red-500 transition-colors flex-shrink-0"
                    title="Delete this review"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                {expandedReview === r.id && (
                  <div className="border-t border-gray-100 px-5 py-4 text-sm text-gray-600 space-y-1">
                    <p><span className="font-medium text-gray-700">Manager:</span> {r.manager_name}</p>
                    <p><span className="font-medium text-gray-700">Cycle:</span> {r.cycle_name}</p>
                    <p><span className="font-medium text-gray-700">Overall average:</span> {r.overall_average != null ? `${Number(r.overall_average).toFixed(2)}/5` : '—'}</p>
                    <p className="text-xs text-gray-400 pt-1 italic">This review is read-only and visible in the employee's previous reviews list.</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete confirm */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6">
            <h3 className="font-bold text-gray-900 text-lg mb-2">Delete Review</h3>
            <p className="text-sm text-gray-600 mb-4">
              This will permanently delete the completed review for <strong>{deleteTarget.employee_name}</strong> ({format(new Date(deleteTarget.review_month + 'T12:00:00'), 'MMMM yyyy')}). It will be removed from all dashboard calculations.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                {deleting ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Trash2 className="w-4 h-4" />}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
