import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { ChevronLeft, ChevronRight, Plus, Save, Trash2, CheckCircle, TrendingUp } from 'lucide-react';
import { format, startOfWeek, addWeeks, subWeeks } from 'date-fns';

interface WeeklyCheckinsTabProps {
  meetingId: string;
  employeeId: string;
  onCheckinSaved?: () => void;
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
  actual_value: string;
  manager_score: number;
  manager_comment: string;
  is_manual?: boolean;
}

interface KPIRunningAverage {
  kpi_id: string;
  kpi_name: string;
  average_score: number;
  entry_count: number;
  latest_actual: string;
}

interface ActionItem {
  text: string;
  owner: 'employee' | 'manager';
  due_date: string;
}

interface WeeklyCheckin {
  id?: string;
  week_starting: string;
  week_number: number;
  kpi_discussion: Record<string, any>;
  previous_actions_review: Record<string, any>;
  short_term_actions: string[];
  summary: string;
  performance_score: number;
  status: string;
  employee_comment?: string;
}

interface PreviousAction {
  id: string;
  action_text: string;
  status: string;
  due_date: string | null;
}

const SCORE_LABELS: Record<number, { label: string; color: string; bg: string; border: string }> = {
  0: { label: 'New to role', color: 'text-gray-600', bg: 'bg-gray-100', border: 'border-gray-300' },
  1: { label: 'Development needed', color: 'text-red-700', bg: 'bg-red-50', border: 'border-red-300' },
  2: { label: 'Requires guidance', color: 'text-orange-700', bg: 'bg-orange-50', border: 'border-orange-300' },
  3: { label: 'On target', color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-300' },
  4: { label: 'Exceeding', color: 'text-green-700', bg: 'bg-green-50', border: 'border-green-300' },
  5: { label: 'Exceptional', color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-300' },
};

export default function WeeklyCheckinsTab({ meetingId, employeeId, onCheckinSaved }: WeeklyCheckinsTabProps) {
  const { profile, isViewingAs, guardViewAs } = useAuth();
  const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [checkin, setCheckin] = useState<WeeklyCheckin | null>(null);
  const [cycleKPIs, setCycleKPIs] = useState<CycleKPI[]>([]);
  const [hasCycle, setHasCycle] = useState<boolean | null>(null);
  const [kpiEntries, setKPIEntries] = useState<KPIEntry[]>([]);
  const [kpiRunningAverages, setKpiRunningAverages] = useState<KPIRunningAverage[]>([]);
  const [newActions, setNewActions] = useState<ActionItem[]>([{ text: '', owner: 'employee', due_date: '' }]);
  const [previousActions, setPreviousActions] = useState<PreviousAction[]>([]);
  const [previousActionsReview, setPreviousActionsReview] = useState<Record<string, string>>({});
  const [actionDueDateEdits, setActionDueDateEdits] = useState<Record<string, string>>({});
  const [otoCycleId, setOtoCycleId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    initLoad();
  }, [meetingId, employeeId]);

  useEffect(() => {
    if (hasCycle !== null) {
      loadWeekData(cycleKPIs, otoCycleId);
    }
  }, [currentWeekStart, hasCycle]);

  useEffect(() => {
    if (hasCycle && cycleKPIs.length > 0) {
      loadRunningAverages(cycleKPIs);
    }
  }, [cycleKPIs, checkin?.id]);

  async function initLoad() {
    setLoading(true);
    const { kpis, cycleId } = await loadCycleKPIs();
    await Promise.all([
      loadWeekData(kpis, cycleId),
      loadPreviousActions(cycleId),
    ]);
    setLoading(false);
  }

  async function loadCycleKPIs(): Promise<{ kpis: CycleKPI[]; cycleId: string | null }> {
    try {
      const { data: meeting } = await supabase
        .from('one_to_one_scheduled_meetings')
        .select('oto_cycle_id')
        .eq('id', meetingId)
        .maybeSingle();

      if (!meeting?.oto_cycle_id) {
        setHasCycle(false);
        return { kpis: [], cycleId: null };
      }

      setOtoCycleId(meeting.oto_cycle_id);

      const { data: kpis } = await supabase
        .from('one_to_one_cycle_kpis')
        .select('id, kpi_name, target_value, measurement_unit')
        .eq('cycle_id', meeting.oto_cycle_id)
        .order('sort_order');

      const result = kpis || [];
      setCycleKPIs(result);
      setHasCycle(result.length > 0);
      return { kpis: result, cycleId: meeting.oto_cycle_id };
    } catch (error) {
      console.error('Error loading cycle KPIs:', error);
      setHasCycle(false);
      return { kpis: [], cycleId: null };
    }
  }

  async function loadRunningAverages(kpis: CycleKPI[], resolvedCycleId?: string | null) {
    if (!kpis.length) return;
    try {
      const cycleId = resolvedCycleId !== undefined ? resolvedCycleId : otoCycleId;
      const { data: allCheckins } = await supabase
        .from('one_to_one_weekly_checkins')
        .select('kpi_discussion, week_starting')
        .eq(cycleId ? 'oto_cycle_id' : 'meeting_id', cycleId || meetingId)
        .eq('employee_id', employeeId)
        .eq('status', 'completed')
        .order('week_starting', { ascending: true });

      if (!allCheckins || allCheckins.length === 0) {
        setKpiRunningAverages([]);
        return;
      }

      const kpiAccumulator: Record<string, { scores: number[]; latestActual: string }> = {};
      kpis.forEach(kpi => {
        kpiAccumulator[kpi.id] = { scores: [], latestActual: '' };
      });

      allCheckins.forEach(c => {
        const discussion = c.kpi_discussion || {};
        Object.entries(discussion).forEach(([kpiId, data]: [string, any]) => {
          if (kpiAccumulator[kpiId] !== undefined) {
            if (data?.manager_score !== undefined && data.manager_score > 0) {
              kpiAccumulator[kpiId].scores.push(data.manager_score);
            }
            if (data?.actual_value) {
              kpiAccumulator[kpiId].latestActual = data.actual_value;
            }
          }
        });
      });

      const averages: KPIRunningAverage[] = kpis
        .filter(kpi => kpiAccumulator[kpi.id]?.scores.length > 0)
        .map(kpi => {
          const acc = kpiAccumulator[kpi.id];
          const avg = acc.scores.reduce((a, b) => a + b, 0) / acc.scores.length;
          return {
            kpi_id: kpi.id,
            kpi_name: kpi.kpi_name,
            average_score: parseFloat(avg.toFixed(2)),
            entry_count: acc.scores.length,
            latest_actual: acc.latestActual,
          };
        });

      setKpiRunningAverages(averages);
    } catch (error) {
      console.error('Error loading running averages:', error);
    }
  }

  async function loadPreviousActions(resolvedCycleId?: string | null) {
    try {
      const cycleId = resolvedCycleId !== undefined ? resolvedCycleId : otoCycleId;
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
      setPreviousActions(data || []);
      // Reset due date edits to match DB
      const dateMap: Record<string, string> = {};
      (data || []).forEach(a => { dateMap[a.id] = a.due_date || ''; });
      setActionDueDateEdits(dateMap);
    } catch (error) {
      console.error('Error loading previous actions:', error);
    }
  }

  async function loadWeekData(kpis: CycleKPI[], resolvedCycleId?: string | null) {
    try {
      const weekStartStr = format(currentWeekStart, 'yyyy-MM-dd');

      // Use oto_cycle_id as the primary key if available — this prevents
      // the same meeting_id from matching multiple weeks
      const cycleId = resolvedCycleId !== undefined ? resolvedCycleId : otoCycleId;
      let query = supabase
        .from('one_to_one_weekly_checkins')
        .select('*')
        .eq('employee_id', employeeId)
        .eq('week_starting', weekStartStr);

      if (cycleId) {
        query = query.eq('oto_cycle_id', cycleId);
      } else {
        query = query.eq('meeting_id', meetingId);
      }

      const { data: existingCheckin } = await query
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existingCheckin) {
        setCheckin(existingCheckin);
        setPreviousActionsReview(existingCheckin.previous_actions_review || {});

        if (kpis.length > 0) {
          rebuildKPIEntries(kpis, existingCheckin.kpi_discussion || {});
        } else {
          const manualEntries = buildManualEntriesFromDiscussion(existingCheckin.kpi_discussion || {});
          setKPIEntries(manualEntries);
        }

        if (existingCheckin.short_term_actions?.length > 0) {
          setNewActions(existingCheckin.short_term_actions.map((t: string) => ({ text: t, owner: 'employee' as const })));
        } else {
          setNewActions([{ text: '', owner: 'employee', due_date: '' }]);
        }
      } else {
        setCheckin({
          week_starting: weekStartStr,
          week_number: getWeekNumber(currentWeekStart),
          kpi_discussion: {},
          previous_actions_review: {},
          short_term_actions: [],
          summary: '',
          performance_score: 3,
          status: 'draft',
        });
        setPreviousActionsReview({});
        if (kpis.length > 0) {
          rebuildKPIEntries(kpis, {});
        } else {
          setKPIEntries([]);
        }
        setNewActions([{ text: '', owner: 'employee', due_date: '' }]);
      }
    } catch (error) {
      console.error('Error loading week data:', error);
    }
  }

  function buildManualEntriesFromDiscussion(discussion: Record<string, any>): KPIEntry[] {
    return Object.entries(discussion).map(([kpiId, data]: [string, any]) => ({
      kpi_id: kpiId,
      kpi_name: data.kpi_name || kpiId,
      target_value: data.target_value || '',
      measurement_unit: data.measurement_unit || '',
      actual_value: data.actual_value || '',
      manager_score: data.manager_score || 0,
      manager_comment: data.manager_comment || '',
      is_manual: true,
    }));
  }

  function rebuildKPIEntries(kpis: CycleKPI[], discussion: Record<string, any>) {
    const entries: KPIEntry[] = kpis.map(kpi => ({
      kpi_id: kpi.id,
      kpi_name: kpi.kpi_name,
      target_value: kpi.target_value,
      measurement_unit: kpi.measurement_unit,
      actual_value: discussion[kpi.id]?.actual_value ?? '',
      manager_score: discussion[kpi.id]?.manager_score ?? 0,
      manager_comment: discussion[kpi.id]?.manager_comment ?? '',
    }));
    setKPIEntries(entries);
  }

  function getWeekNumber(date: Date) {
    const startOfYear = new Date(date.getFullYear(), 0, 1);
    const diff = date.getTime() - startOfYear.getTime();
    const diffDays = Math.floor(diff / (1000 * 60 * 60 * 24));
    return Math.ceil((diffDays + startOfYear.getDay() + 1) / 7);
  }

  function updateKPIEntry(index: number, field: keyof KPIEntry, value: any) {
    setKPIEntries(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  }

  function addManualKPI() {
    setKPIEntries(prev => [...prev, {
      kpi_id: `manual-${Date.now()}`,
      kpi_name: '',
      target_value: '',
      measurement_unit: '',
      actual_value: '',
      manager_score: 0,
      manager_comment: '',
      is_manual: true,
    }]);
  }

  function removeKPIEntry(index: number) {
    setKPIEntries(prev => prev.filter((_, i) => i !== index));
  }

  function addNewAction() {
    setNewActions(prev => [...prev, { text: '', owner: 'employee', due_date: '' }]);
  }

  function updateNewAction(index: number, field: keyof ActionItem, value: string) {
    setNewActions(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  }

  function removeNewAction(index: number) {
    setNewActions(prev => prev.filter((_, i) => i !== index));
  }

  function computeWeekKpiAvg(): number | null {
    const scored = kpiEntries.filter(e => e.manager_score > 0);
    if (scored.length === 0) return null;
    return parseFloat((scored.reduce((a, b) => a + b.manager_score, 0) / scored.length).toFixed(2));
  }

  async function saveCheckin(submitStatus: 'draft' | 'completed') {
    if (!checkin || guardViewAs()) return;
    try {
      setSaving(true);

      const kpiDiscussion: Record<string, any> = {};
      kpiEntries.forEach(entry => {
        kpiDiscussion[entry.kpi_id] = {
          kpi_name: entry.kpi_name,
          target_value: entry.target_value,
          actual_value: entry.actual_value,
          measurement_unit: entry.measurement_unit,
          manager_score: entry.manager_score,
          manager_comment: entry.manager_comment,
        };
      });

      const validActions = newActions.filter(a => a.text.trim() !== '');

      const weekKpiAvg = computeWeekKpiAvg();
      const autoScore = weekKpiAvg !== null
        ? Math.round(weekKpiAvg)
        : checkin.performance_score;

      const checkinData = {
        meeting_id: meetingId,
        oto_cycle_id: otoCycleId || null,
        employee_id: employeeId,
        manager_id: profile?.id,
        week_starting: checkin.week_starting,
        week_number: checkin.week_number,
        kpi_discussion: kpiDiscussion,
        previous_actions_review: previousActionsReview,
        short_term_actions: validActions.map(a => a.text),
        summary: checkin.summary,
        employee_comment: checkin.employee_comment || '',
        performance_score: autoScore,
        status: submitStatus,
        updated_at: new Date().toISOString(),
      };

      if (submitStatus === 'completed') {
        // Completed check-ins always create a new record — never overwrite history.
        // If this week's record is currently a draft, update that draft to completed.
        // If it is already completed, insert a fresh record (re-submission).
        if (checkin.id && checkin.status === 'draft') {
          const { error } = await supabase
            .from('one_to_one_weekly_checkins')
            .update(checkinData)
            .eq('id', checkin.id);
          if (error) throw error;
          setCheckin(prev => prev ? { ...prev, status: 'completed' } : null);
        } else {
          // Clear the in-memory id so we always insert a fresh completed record
          const { data, error } = await supabase
            .from('one_to_one_weekly_checkins')
            .insert({ ...checkinData, id: undefined })
            .select()
            .single();
          if (error) throw error;
          setCheckin(prev => prev ? { ...prev, id: data.id, status: 'completed' } : null);
        }
      } else {
        // Draft: update existing draft or insert new one
        if (checkin.id) {
          const { error } = await supabase
            .from('one_to_one_weekly_checkins')
            .update(checkinData)
            .eq('id', checkin.id);
          if (error) throw error;
        } else {
          const { data, error } = await supabase
            .from('one_to_one_weekly_checkins')
            .insert(checkinData)
            .select()
            .single();
          if (error) throw error;
          setCheckin(prev => prev ? { ...prev, id: data.id, status: 'draft' } : null);
        }
      }

      if (validActions.length > 0) {
        const actionRecords = validActions.map(a => ({
          meeting_id: meetingId,
          oto_cycle_id: otoCycleId || null,
          owner_id: a.owner === 'employee' ? employeeId : profile?.id,
          action_text: a.text,
          due_date: a.due_date || null,
          status: 'open',
        }));
        const { error: actErr } = await supabase
          .from('one_to_one_action_items')
          .insert(actionRecords);
        if (!actErr) {
          setNewActions([{ text: '', owner: 'employee', due_date: '' }]);
        }
      }

      // Persist status and due date changes to existing actions
      for (const action of previousActions) {
        const newStatus = previousActionsReview[action.id] ?? action.status;
        const newDueDate = actionDueDateEdits[action.id] ?? action.due_date ?? '';
        const statusChanged = newStatus !== action.status;
        const dueDateChanged = newDueDate !== (action.due_date ?? '');
        if (statusChanged || dueDateChanged) {
          await supabase
            .from('one_to_one_action_items')
            .update({
              status: newStatus,
              due_date: newDueDate || null,
              updated_at: new Date().toISOString(),
            })
            .eq('id', action.id);
        }
      }

      await loadPreviousActions(otoCycleId);
      if (cycleKPIs.length > 0) {
        await loadRunningAverages(cycleKPIs, otoCycleId);
      }

      setCheckin(prev => prev ? { ...prev, status: submitStatus } : null);
      onCheckinSaved?.();
    } catch (error) {
      console.error('Error saving check-in:', error);
    } finally {
      setSaving(false);
    }
  }

  const canGoNext = addWeeks(currentWeekStart, 1) <= new Date();
  const weekKpiAvg = computeWeekKpiAvg();
  const autoPerformanceScore = weekKpiAvg !== null ? Math.round(weekKpiAvg) : (checkin?.performance_score ?? 3);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-40">
        <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setCurrentWeekStart(subWeeks(currentWeekStart, 1))}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div className="text-center">
            <p className="font-semibold text-gray-900">
              Week of {format(currentWeekStart, 'dd MMM yyyy')}
            </p>
            <p className="text-xs text-gray-500">Week {checkin?.week_number}</p>
          </div>
          <button
            onClick={() => canGoNext && setCurrentWeekStart(addWeeks(currentWeekStart, 1))}
            disabled={!canGoNext}
            className={`p-2 rounded-lg transition-colors ${canGoNext ? 'hover:bg-gray-100' : 'opacity-30 cursor-not-allowed'}`}
          >
            <ChevronRight className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          {checkin?.status === 'completed' ? (
            <span className="flex items-center gap-1.5 px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
              <CheckCircle className="w-4 h-4" />
              Completed
            </span>
          ) : (
            <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-medium">
              Draft — editable
            </span>
          )}
        </div>
      </div>

      {(() => {
        const isEmployee = !isViewingAs && profile?.id === employeeId;
        const isCompleted = checkin?.status === 'completed';
        return (
          <div className="border border-teal-200 bg-teal-50 rounded-xl p-4 space-y-2">
            <p className="text-sm font-semibold text-teal-900">Employee Weekly Update</p>
            <p className="text-xs text-teal-700">
              {isEmployee
                ? 'Share how your week has been — highlights, challenges, or anything you want to discuss in this check-in.'
                : 'Employee\'s update for this week.'}
            </p>
            {isEmployee && !isCompleted ? (
              <textarea
                value={checkin?.employee_comment || ''}
                onChange={e => setCheckin(prev => prev ? { ...prev, employee_comment: e.target.value } : null)}
                rows={4}
                placeholder="How has your week been? What would you like to discuss?"
                className="w-full px-3 py-2 border border-teal-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-400 bg-white resize-none"
              />
            ) : (
              <p className="px-3 py-2 bg-white border border-teal-200 rounded-lg text-sm text-gray-700 italic min-h-[2.5rem]">
                {checkin?.employee_comment || <span className="text-gray-400 not-italic">No update added by employee.</span>}
              </p>
            )}
          </div>
        );
      })()}

      {kpiRunningAverages.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4 text-blue-600" />
            <h4 className="text-sm font-semibold text-blue-900">Running KPI Averages (Cycle to Date)</h4>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {kpiRunningAverages.map(avg => {
              const scoreInfo = SCORE_LABELS[Math.round(avg.average_score)] || SCORE_LABELS[3];
              return (
                <div key={avg.kpi_id} className="bg-white rounded-lg p-3 border border-blue-100">
                  <p className="text-xs font-medium text-gray-700 truncate">{avg.kpi_name}</p>
                  <div className="flex items-end gap-1 mt-1">
                    <span className={`text-lg font-bold ${scoreInfo.color}`}>{avg.average_score.toFixed(1)}</span>
                    <span className="text-xs text-gray-400 mb-0.5">/ 5</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">{avg.entry_count} {avg.entry_count === 1 ? 'entry' : 'entries'}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {previousActions.length > 0 && (
        <div>
          <h3 className="text-base font-semibold text-gray-900 mb-3">Actions</h3>
          <div className="space-y-2">
            {previousActions.map(action => {
              const currentStatus = previousActionsReview[action.id] ?? action.status;
              const isDone = currentStatus === 'closed';
              const currentDueDate = actionDueDateEdits[action.id] ?? action.due_date ?? '';
              const isOverdue = !isDone && currentDueDate && new Date(currentDueDate) < new Date();
              return (
                <div
                  key={action.id}
                  className={`flex items-start gap-3 p-3 border rounded-lg transition-colors ${
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
                    disabled={isDone}
                    onChange={e =>
                      setPreviousActionsReview(prev => ({
                        ...prev,
                        [action.id]: e.target.checked ? 'closed' : 'open',
                      }))
                    }
                    className="w-4 h-4 rounded border-gray-300 text-green-600 focus:ring-green-500 flex-shrink-0 mt-0.5 cursor-pointer disabled:cursor-default"
                  />
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <p className={`text-sm font-medium leading-snug ${isDone ? 'line-through text-gray-400' : 'text-gray-800'}`}>
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
                          onChange={e =>
                            setActionDueDateEdits(prev => ({ ...prev, [action.id]: e.target.value }))
                          }
                          className={`px-2 py-1 border rounded text-xs focus:ring-2 focus:ring-blue-500 ${
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

      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-semibold text-gray-900">
            KPI Discussion
            {hasCycle && (
              <span className="ml-2 text-xs font-normal text-blue-600 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
                From review cycle
              </span>
            )}
          </h3>
          <div className="flex items-center gap-2">
            {weekKpiAvg !== null && (
              <span className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full font-medium">
                This week avg: <strong>{weekKpiAvg.toFixed(1)}</strong>
              </span>
            )}
            {!hasCycle && (
              <button
                onClick={addManualKPI}
                className="flex items-center gap-1 text-xs text-blue-600 hover:bg-blue-50 px-2.5 py-1.5 rounded-lg font-medium border border-blue-200"
              >
                <Plus className="w-3.5 h-3.5" /> Add KPI
              </button>
            )}
          </div>
        </div>

        {kpiEntries.length === 0 && hasCycle === false && (
          <div className="p-4 bg-gray-50 border border-dashed border-gray-300 rounded-xl text-center">
            <p className="text-sm text-gray-500 mb-2">No review cycle linked. Add KPIs manually to track this week.</p>
            <button
              onClick={addManualKPI}
              className="inline-flex items-center gap-1 text-sm text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-lg font-medium"
            >
              <Plus className="w-4 h-4" /> Add KPI
            </button>
          </div>
        )}

        {kpiEntries.length === 0 && hasCycle === true && (
          <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl text-center">
            <p className="text-sm text-gray-500">Loading KPIs from review cycle...</p>
          </div>
        )}

        {kpiEntries.length > 0 && (
          <div className="space-y-4">
            {kpiEntries.map((entry, index) => {
              const scoreInfo = SCORE_LABELS[entry.manager_score] || SCORE_LABELS[0];
              const runningAvg = kpiRunningAverages.find(r => r.kpi_id === entry.kpi_id);
              return (
                <div key={entry.kpi_id} className="border rounded-xl p-4 space-y-3 bg-white">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      {entry.is_manual ? (
                        <input
                          type="text"
                          value={entry.kpi_name}
                          onChange={e => updateKPIEntry(index, 'kpi_name', e.target.value)}
                          placeholder="KPI name"
                          className="w-full px-3 py-1.5 border rounded-lg text-sm font-semibold focus:ring-2 focus:ring-blue-500"
                        />
                      ) : (
                        <p className="font-semibold text-gray-900">{entry.kpi_name}</p>
                      )}
                      <p className="text-xs text-gray-500 mt-0.5">
                        Target: {entry.target_value || '—'}{entry.measurement_unit ? ` ${entry.measurement_unit}` : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {entry.manager_score > 0 && (
                        <div className={`px-2.5 py-1 rounded-full border text-xs font-semibold ${scoreInfo.bg} ${scoreInfo.border} ${scoreInfo.color}`}>
                          {entry.manager_score} — {scoreInfo.label}
                        </div>
                      )}
                      {runningAvg && (
                        <p className="text-xs text-gray-400">
                          Running: <span className="font-semibold text-gray-600">{runningAvg.average_score.toFixed(1)}</span>
                        </p>
                      )}
                      {entry.is_manual && (
                        <button onClick={() => removeKPIEntry(index)} className="p-1 text-red-400 hover:text-red-600">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Actual value</label>
                      <input
                        type="text"
                        value={entry.actual_value}
                        onChange={e => updateKPIEntry(index, 'actual_value', e.target.value)}
                        placeholder={`e.g. 95${entry.measurement_unit ? ` ${entry.measurement_unit}` : ''}`}
                        className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Manager score</label>
                      <select
                        value={entry.manager_score}
                        onChange={e => updateKPIEntry(index, 'manager_score', parseInt(e.target.value))}
                        className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                      >
                        <option value={0}>Select score...</option>
                        {([1, 2, 3, 4, 5] as const).map(score => (
                          <option key={score} value={score}>{score} — {SCORE_LABELS[score].label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Comment (optional)</label>
                    <textarea
                      value={entry.manager_comment}
                      onChange={e => updateKPIEntry(index, 'manager_comment', e.target.value)}
                      rows={2}
                      placeholder="Add context or coaching notes..."
                      className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 resize-none"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-base font-semibold text-gray-900">Overall performance this week</label>
          {weekKpiAvg !== null && (
            <span className="text-xs text-blue-600 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
              Auto-calculated from KPI avg: <strong>{weekKpiAvg.toFixed(2)}</strong>
            </span>
          )}
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {Object.entries(SCORE_LABELS).map(([score, info]) => {
            const s = parseInt(score);
            const effectiveScore = weekKpiAvg !== null ? autoPerformanceScore : (checkin?.performance_score ?? 3);
            const isSelected = effectiveScore === s;
            const isAuto = weekKpiAvg !== null && isSelected;
            return (
              <button
                key={score}
                onClick={() => weekKpiAvg === null && setCheckin(prev => prev ? { ...prev, performance_score: s } : null)}
                className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all text-center ${
                  isAuto
                    ? `border-2 ${info.bg} ${info.color} font-semibold ring-2 ring-blue-400`
                    : isSelected
                    ? `border-2 ${info.bg} ${info.color} font-semibold`
                    : weekKpiAvg !== null
                    ? 'border-gray-100 opacity-40 cursor-default'
                    : 'border-gray-200 hover:border-gray-300 cursor-pointer'
                }`}
              >
                <span className="text-xl font-bold">{score}</span>
                <span className="text-xs leading-tight">{info.label}</span>
              </button>
            );
          })}
        </div>
        {weekKpiAvg !== null && (
          <p className="text-xs text-gray-400 mt-2">
            Performance score is auto-set from KPI average. Rate KPIs above to update.
          </p>
        )}
        {weekKpiAvg === null && kpiEntries.length > 0 && (
          <p className="text-xs text-gray-400 mt-2">
            Rate at least one KPI above to auto-calculate overall performance.
          </p>
        )}
      </div>

      <div>
        <label className="block text-base font-semibold text-gray-900 mb-2">Week summary</label>
        <textarea
          value={checkin?.summary || ''}
          onChange={e => setCheckin(prev => prev ? { ...prev, summary: e.target.value } : null)}
          rows={3}
          placeholder="Key highlights, discussion points, and notes from this week..."
          className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 resize-none text-sm"
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-semibold text-gray-900">New actions</h3>
          <button
            onClick={addNewAction}
            className="flex items-center gap-1.5 text-sm text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-lg"
          >
            <Plus className="w-4 h-4" />
            Add action
          </button>
        </div>
        <div className="space-y-2">
          {newActions.map((action, index) => (
            <div key={index} className="border rounded-xl p-3 space-y-2 bg-gray-50">
              <input
                type="text"
                value={action.text}
                onChange={e => updateNewAction(index, 'text', e.target.value)}
                placeholder="Describe the action..."
                className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 bg-white"
              />
              <div className="flex items-center gap-2">
                <select
                  value={action.owner}
                  onChange={e => updateNewAction(index, 'owner', e.target.value)}
                  className="flex-1 px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="employee">Employee</option>
                  <option value="manager">Manager</option>
                </select>
                <div className="flex-1 relative">
                  <input
                    type="date"
                    value={action.due_date}
                    onChange={e => updateNewAction(index, 'due_date', e.target.value)}
                    required
                    className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 bg-white ${
                      !action.due_date ? 'border-amber-300' : 'border-gray-200'
                    }`}
                  />
                  {!action.due_date && (
                    <span className="absolute -top-1.5 right-2 text-xs text-amber-600 font-medium">required</span>
                  )}
                </div>
                {newActions.length > 1 && (
                  <button onClick={() => removeNewAction(index)} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t">
        {isViewingAs && (
          <span className="text-xs text-orange-600 font-medium self-center mr-2">View As mode — read-only</span>
        )}
        <button
          onClick={() => saveCheckin('draft')}
          disabled={saving || isViewingAs}
          className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg border disabled:opacity-50 text-sm"
        >
          <Save className="w-4 h-4" />
          Save draft
        </button>
        <button
          onClick={() => saveCheckin('completed')}
          disabled={saving || isViewingAs}
          className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
        >
          <CheckCircle className="w-4 h-4" />
          {saving ? 'Saving...' : 'Complete check-in'}
        </button>
      </div>
    </div>
  );
}
