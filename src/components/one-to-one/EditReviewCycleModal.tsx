import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import {
  X, Plus, Trash2, Save, Users, UserPlus, UserMinus,
  ArrowRightLeft, AlertTriangle, Target, Calendar, RefreshCw
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface EditReviewCycleModalProps {
  isOpen: boolean;
  cycleId: string;
  onClose: () => void;
  onSuccess: () => void;
}

interface Cycle {
  id: string;
  cycle_name: string;
  template_title: string | null;
  cycle_type: string;
  review_frequency: string;
  duration_minutes: number;
  template_start_date: string | null;
  template_end_date: string | null;
  standard_agenda: string;
  status: string;
}

interface KPI {
  id?: string;
  kpi_name: string;
  target_value: string;
  measurement_unit: string;
  sort_order: number;
}

interface AssignedEmployee {
  assignment_id: string;
  employee_id: string;
  full_name: string;
  job_title: string;
  department: string;
  is_active: boolean;
  scheduled_meeting_id: string | null;
  scheduled_datetime: string | null;
}

interface TeamMember {
  id: string;
  full_name: string;
  job_title: string;
  department: string;
  selected: boolean;
  assignment_id: string | null;
}

interface OtherCycle {
  id: string;
  cycle_name: string;
  cycle_type: string;
}

const REVIEW_TYPES = [
  { value: 'standard', label: '1:1 Review' },
  { value: 'probation', label: 'Probation Review' },
  { value: 'other', label: 'Other' },
];

type Tab = 'details' | 'employees' | 'kpis';

export default function EditReviewCycleModal({ isOpen, cycleId, onClose, onSuccess }: EditReviewCycleModalProps) {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('details');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [cycle, setCycle] = useState<Cycle | null>(null);
  const [kpis, setKpis] = useState<KPI[]>([]);
  const [assignedEmployees, setAssignedEmployees] = useState<AssignedEmployee[]>([]);
  const [allTeamMembers, setAllTeamMembers] = useState<TeamMember[]>([]);
  const [availableTeamMembers, setAvailableTeamMembers] = useState<TeamMember[]>([]);
  const [otherCycles, setOtherCycles] = useState<OtherCycle[]>([]);
  const [savingAssignments, setSavingAssignments] = useState(false);

  const [moveTargetCycleId, setMoveTargetCycleId] = useState<Record<string, string>>({});
  const [movingEmployee, setMovingEmployee] = useState<string | null>(null);
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);
  const [scheduleDateEdits, setScheduleDateEdits] = useState<Record<string, string>>({});
  const [savingSchedule, setSavingSchedule] = useState<string | null>(null);
  const [reschedulePrompt, setReschedulePrompt] = useState<string | null>(null); // employeeId awaiting scope choice

  useEffect(() => {
    if (isOpen && cycleId) {
      loadAll();
    }
  }, [isOpen, cycleId]);

  async function loadAll() {
    setLoading(true);
    try {
      await Promise.all([
        loadCycle(),
        loadKPIs(),
        loadAssignedEmployees(),
        loadAvailableTeamMembers(),
        loadOtherCycles(),
      ]);
    } finally {
      setLoading(false);
    }
  }

  async function loadCycle() {
    const { data } = await supabase
      .from('one_to_one_review_cycles')
      .select('*')
      .eq('id', cycleId)
      .maybeSingle();
    if (data) setCycle(data);
  }

  async function loadKPIs() {
    const { data } = await supabase
      .from('one_to_one_cycle_kpis')
      .select('id, kpi_name, target_value, measurement_unit, sort_order')
      .eq('cycle_id', cycleId)
      .order('sort_order');
    setKpis(data || []);
  }

  async function loadAssignedEmployees() {
    const { data } = await supabase
      .from('one_to_one_cycle_employee_assignments')
      .select(`
        id,
        employee_id,
        is_active,
        profiles!one_to_one_cycle_employee_assignments_employee_id_fkey (
          full_name, job_title, department
        )
      `)
      .eq('cycle_id', cycleId)
      .eq('is_active', true);

    const assignments = (data || []).map((a: any) => ({
      assignment_id: a.id,
      employee_id: a.employee_id,
      full_name: a.profiles?.full_name || '',
      job_title: a.profiles?.job_title || '',
      department: a.profiles?.department || '',
      is_active: a.is_active,
      scheduled_meeting_id: null as string | null,
      scheduled_datetime: null as string | null,
    }));

    // Load next scheduled meeting per employee for this cycle
    await Promise.all(
      assignments.map(async (emp) => {
        const { data: mtg } = await supabase
          .from('one_to_one_scheduled_meetings')
          .select('id, scheduled_datetime')
          .eq('oto_cycle_id', cycleId)
          .eq('employee_id', emp.employee_id)
          .neq('completion_status', 'submitted')
          .order('scheduled_datetime', { ascending: true })
          .limit(1)
          .maybeSingle();
        emp.scheduled_meeting_id = mtg?.id || null;
        emp.scheduled_datetime = mtg?.scheduled_datetime || null;
      })
    );

    setAssignedEmployees(assignments);
    // Seed edit state from loaded data
    // Use local time for the datetime-local input, not UTC (toISOString gives UTC which shifts by offset)
    const edits: Record<string, string> = {};
    assignments.forEach(emp => {
      if (emp.scheduled_datetime) {
        const d = new Date(emp.scheduled_datetime);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        const hh = String(d.getHours()).padStart(2, '0');
        const min = String(d.getMinutes()).padStart(2, '0');
        edits[emp.employee_id] = `${yyyy}-${mm}-${dd}T${hh}:${min}`;
      }
    });
    setScheduleDateEdits(edits);
  }

  async function loadAvailableTeamMembers() {
    const { data: allMembers } = await supabase
      .from('profiles')
      .select('id, full_name, job_title, department')
      .eq('manager_id', profile?.id)
      .eq('active', true)
      .order('full_name');

    const { data: assigned } = await supabase
      .from('one_to_one_cycle_employee_assignments')
      .select('employee_id, id')
      .eq('cycle_id', cycleId)
      .eq('is_active', true);

    const assignedMap = new Map((assigned || []).map((a: any) => [a.employee_id, a.id]));
    const members = allMembers || [];
    setAvailableTeamMembers(members.filter(m => !assignedMap.has(m.id)));
    setAllTeamMembers(members.map(m => ({
      ...m,
      selected: assignedMap.has(m.id),
      assignment_id: assignedMap.get(m.id) || null,
    })));
  }

  async function loadOtherCycles() {
    const { data } = await supabase
      .from('one_to_one_review_cycles')
      .select('id, cycle_name, cycle_type')
      .eq('manager_id', profile?.id)
      .eq('status', 'active')
      .neq('id', cycleId)
      .order('cycle_name');
    setOtherCycles(data || []);
  }

  function toggleMember(memberId: string) {
    setAllTeamMembers(prev => prev.map(m => m.id === memberId ? { ...m, selected: !m.selected } : m));
  }

  function toggleAllMembers(selected: boolean) {
    setAllTeamMembers(prev => prev.map(m => ({ ...m, selected })));
  }

  async function saveAssignments() {
    setSavingAssignments(true);
    try {
      const toAdd = allTeamMembers.filter(m => m.selected && !m.assignment_id);
      const toRemove = allTeamMembers.filter(m => !m.selected && m.assignment_id);

      for (const m of toRemove) {
        await supabase
          .from('one_to_one_cycle_employee_assignments')
          .update({ is_active: false, removed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
          .eq('id', m.assignment_id!);
      }

      if (toAdd.length > 0) {
        await supabase
          .from('one_to_one_cycle_employee_assignments')
          .insert(toAdd.map(m => ({
            cycle_id: cycleId,
            employee_id: m.id,
            manager_id: profile?.id,
            is_active: true,
            assigned_at: new Date().toISOString(),
          })));

        // Ensure each newly assigned employee has a meeting linked to this cycle
        // so cycle KPIs pull through immediately when their review is opened
        await Promise.all(toAdd.map(m => ensurePlaceholderMeeting(m.id)));
      }

      await Promise.all([loadAssignedEmployees(), loadAvailableTeamMembers()]);
    } catch (error) {
      console.error('Error saving assignments:', error);
      alert('Failed to save assignments');
    } finally {
      setSavingAssignments(false);
    }
  }

  async function saveDetails() {
    if (!cycle) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('one_to_one_review_cycles')
        .update({
          template_title: cycle.template_title?.trim() || null,
          cycle_type: cycle.cycle_type,
          review_frequency: cycle.review_frequency,
          duration_minutes: cycle.duration_minutes,
          template_start_date: cycle.template_start_date || null,
          template_end_date: cycle.template_end_date || null,
          standard_agenda: cycle.standard_agenda,
          updated_at: new Date().toISOString(),
        })
        .eq('id', cycleId);
      if (error) throw error;
    } catch (error) {
      console.error('Error saving cycle details:', error);
      alert('Failed to save changes');
    } finally {
      setSaving(false);
    }
  }

  async function saveKPIs() {
    setSaving(true);
    try {
      const existingIds = kpis.filter(k => k.id).map(k => k.id!);

      const { data: currentKPIs } = await supabase
        .from('one_to_one_cycle_kpis')
        .select('id')
        .eq('cycle_id', cycleId);

      const toDelete = (currentKPIs || [])
        .map(k => k.id)
        .filter(id => !existingIds.includes(id));

      if (toDelete.length > 0) {
        await supabase.from('one_to_one_cycle_kpis').delete().in('id', toDelete);
      }

      for (const kpi of kpis) {
        if (!kpi.kpi_name.trim()) continue;
        if (kpi.id) {
          await supabase
            .from('one_to_one_cycle_kpis')
            .update({
              kpi_name: kpi.kpi_name,
              target_value: kpi.target_value,
              measurement_unit: kpi.measurement_unit,
              sort_order: kpi.sort_order,
            })
            .eq('id', kpi.id);
        } else {
          await supabase
            .from('one_to_one_cycle_kpis')
            .insert({
              cycle_id: cycleId,
              kpi_name: kpi.kpi_name,
              target_value: kpi.target_value,
              measurement_unit: kpi.measurement_unit || '',
              frequency: 'monthly',
              source: 'manager',
              sort_order: kpi.sort_order,
            });
        }
      }
      // Ensure every currently-assigned employee has a meeting linked to this cycle
      // so the KPIs just saved are immediately visible when their review is opened
      const { data: assignments } = await supabase
        .from('one_to_one_cycle_employee_assignments')
        .select('employee_id')
        .eq('cycle_id', cycleId)
        .eq('is_active', true);
      if (assignments && assignments.length > 0) {
        await Promise.all(assignments.map((a: any) => ensurePlaceholderMeeting(a.employee_id)));
      }
    } catch (error) {
      console.error('Error saving KPIs:', error);
      alert('Failed to save KPI changes');
    } finally {
      setSaving(false);
    }
  }

  async function ensurePlaceholderMeeting(employeeId: string) {
    // Check if a meeting already exists for this employee + cycle (any status except submitted)
    const { data: existing } = await supabase
      .from('one_to_one_scheduled_meetings')
      .select('id')
      .eq('oto_cycle_id', cycleId)
      .eq('employee_id', employeeId)
      .neq('completion_status', 'submitted')
      .limit(1)
      .maybeSingle();

    if (existing) return; // Already has a meeting linked to this cycle — KPIs will pull through

    // No meeting exists — create a placeholder so the cycle KPIs are accessible
    await supabase.from('one_to_one_scheduled_meetings').insert({
      oto_cycle_id: cycleId,
      employee_id: employeeId,
      manager_id: profile?.id,
      scheduled_datetime: new Date().toISOString(),
      completion_status: 'scheduled',
      status: 'scheduled',
    });
  }

  async function addEmployee(employeeId: string) {
    try {
      const { error } = await supabase
        .from('one_to_one_cycle_employee_assignments')
        .insert({
          cycle_id: cycleId,
          employee_id: employeeId,
          manager_id: profile?.id,
          is_active: true,
          assigned_at: new Date().toISOString(),
        });
      if (error) throw error;
      await ensurePlaceholderMeeting(employeeId);
      await Promise.all([loadAssignedEmployees(), loadAvailableTeamMembers()]);
    } catch (error) {
      console.error('Error adding employee:', error);
      alert('Failed to add employee');
    }
  }

  async function removeEmployee(assignmentId: string, employeeId: string) {
    try {
      await supabase
        .from('one_to_one_cycle_employee_assignments')
        .update({
          is_active: false,
          removed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', assignmentId);

      setConfirmRemove(null);
      await Promise.all([loadAssignedEmployees(), loadAvailableTeamMembers()]);
    } catch (error) {
      console.error('Error removing employee:', error);
      alert('Failed to remove employee');
    }
  }

  async function moveEmployee(assignmentId: string, employeeId: string, targetCycleId: string) {
    if (!targetCycleId) return;
    setMovingEmployee(employeeId);
    try {
      await supabase
        .from('one_to_one_cycle_employee_assignments')
        .update({
          is_active: false,
          removed_at: new Date().toISOString(),
          notes: `Moved to cycle ${targetCycleId}`,
          updated_at: new Date().toISOString(),
        })
        .eq('id', assignmentId);

      await supabase
        .from('one_to_one_cycle_employee_assignments')
        .insert({
          cycle_id: targetCycleId,
          employee_id: employeeId,
          manager_id: profile?.id,
          is_active: true,
          assigned_at: new Date().toISOString(),
          notes: `Moved from cycle ${cycleId}`,
        });

      // Ensure a meeting linked to the target cycle exists so KPIs pull through
      const { data: existingInTarget } = await supabase
        .from('one_to_one_scheduled_meetings')
        .select('id')
        .eq('oto_cycle_id', targetCycleId)
        .eq('employee_id', employeeId)
        .neq('completion_status', 'submitted')
        .limit(1)
        .maybeSingle();

      if (!existingInTarget) {
        await supabase.from('one_to_one_scheduled_meetings').insert({
          oto_cycle_id: targetCycleId,
          employee_id: employeeId,
          manager_id: profile?.id,
          scheduled_datetime: new Date().toISOString(),
          completion_status: 'scheduled',
          status: 'scheduled',
        });
      }

      await Promise.all([loadAssignedEmployees(), loadAvailableTeamMembers()]);
    } catch (error) {
      console.error('Error moving employee:', error);
      alert('Failed to move employee');
    } finally {
      setMovingEmployee(null);
    }
  }

  function buildDatetimeWithOffset(localValue: string): string {
    const d = new Date(localValue);
    const offsetMs = d.getTimezoneOffset() * 60 * 1000;
    const localIso = new Date(d.getTime() - offsetMs).toISOString().slice(0, 16) + ':00';
    const offsetMins = -d.getTimezoneOffset();
    const sign = offsetMins >= 0 ? '+' : '-';
    const absH = String(Math.floor(Math.abs(offsetMins) / 60)).padStart(2, '0');
    const absM = String(Math.abs(offsetMins) % 60).padStart(2, '0');
    return `${localIso}${sign}${absH}:${absM}`;
  }

  async function saveScheduleNextOnly(emp: AssignedEmployee) {
    const newDatetime = scheduleDateEdits[emp.employee_id];
    if (!newDatetime) return;
    setSavingSchedule(emp.employee_id);
    setReschedulePrompt(null);
    try {
      const datetimeWithOffset = buildDatetimeWithOffset(newDatetime);
      if (emp.scheduled_meeting_id) {
        const { error } = await supabase
          .from('one_to_one_scheduled_meetings')
          .update({
            scheduled_datetime: datetimeWithOffset,
            original_scheduled_datetime: emp.scheduled_datetime || datetimeWithOffset,
            updated_at: new Date().toISOString(),
          })
          .eq('id', emp.scheduled_meeting_id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('one_to_one_scheduled_meetings')
          .insert({
            oto_cycle_id: cycleId,
            employee_id: emp.employee_id,
            manager_id: profile?.id,
            scheduled_datetime: datetimeWithOffset,
            completion_status: 'scheduled',
            status: 'scheduled',
          });
        if (error) throw error;
      }
      await loadAssignedEmployees();
    } catch (err) {
      console.error('Error saving schedule:', err);
      alert('Failed to save schedule');
    } finally {
      setSavingSchedule(null);
    }
  }

  async function saveScheduleRecurring(emp: AssignedEmployee) {
    const newDatetime = scheduleDateEdits[emp.employee_id];
    if (!newDatetime) return;
    setSavingSchedule(emp.employee_id);
    setReschedulePrompt(null);
    try {
      const d = new Date(newDatetime);
      const datetimeWithOffset = buildDatetimeWithOffset(newDatetime);
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const preferredDay = days[d.getDay()];
      const hh = String(d.getHours()).padStart(2, '0');
      const mm = String(d.getMinutes()).padStart(2, '0');
      const preferredTime = `${hh}:${mm}:00`;

      // Update the recurring pattern on the cycle
      await supabase
        .from('one_to_one_review_cycles')
        .update({ preferred_day: preferredDay, preferred_time: preferredTime, updated_at: new Date().toISOString() })
        .eq('id', cycleId);

      // Also update the next scheduled meeting for this employee
      if (emp.scheduled_meeting_id) {
        const { error } = await supabase
          .from('one_to_one_scheduled_meetings')
          .update({
            scheduled_datetime: datetimeWithOffset,
            original_scheduled_datetime: emp.scheduled_datetime || datetimeWithOffset,
            updated_at: new Date().toISOString(),
          })
          .eq('id', emp.scheduled_meeting_id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('one_to_one_scheduled_meetings')
          .insert({
            oto_cycle_id: cycleId,
            employee_id: emp.employee_id,
            manager_id: profile?.id,
            scheduled_datetime: datetimeWithOffset,
            completion_status: 'scheduled',
            status: 'scheduled',
          });
        if (error) throw error;
      }
      await loadAssignedEmployees();
    } catch (err) {
      console.error('Error saving recurring schedule:', err);
      alert('Failed to save schedule');
    } finally {
      setSavingSchedule(null);
    }
  }

  function addKPI() {
    setKpis(prev => [...prev, { kpi_name: '', target_value: '', measurement_unit: '', sort_order: prev.length }]);
  }

  function removeKPI(index: number) {
    setKpis(prev => prev.filter((_, i) => i !== index).map((k, i) => ({ ...k, sort_order: i })));
  }

  function updateKPI(index: number, field: keyof KPI, value: string) {
    setKpis(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  }

  function handleClose() {
    onClose();
  }

  if (!isOpen) return null;

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'details', label: 'Template Details', icon: <Target className="w-4 h-4" /> },
    { id: 'employees', label: `Employees (${assignedEmployees.length})`, icon: <Users className="w-4 h-4" /> },
    { id: 'kpis', label: `KPIs (${kpis.filter(k => k.kpi_name.trim()).length})`, icon: <Target className="w-4 h-4" /> },
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b bg-gray-50 rounded-t-xl">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Edit Review Template</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {cycle ? (cycle.template_title || cycle.cycle_name) : 'Loading...'}
            </p>
          </div>
          <button onClick={handleClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="border-b bg-white">
          <div className="flex px-6">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-y-auto flex-1 p-6">
          {loading ? (
            <div className="flex items-center justify-center h-40">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
          ) : (
            <>
              {activeTab === 'details' && cycle && (
                <div className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Template Title <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      value={cycle.template_title || ''}
                      onChange={e => setCycle(prev => prev ? { ...prev, template_title: e.target.value } : null)}
                      placeholder="e.g. Specialist, IC4, Monthly 1:1, Team Leader Review"
                      className="w-full px-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Review Type</label>
                      <select
                        value={cycle.cycle_type || 'standard'}
                        onChange={e => setCycle(prev => prev ? { ...prev, cycle_type: e.target.value } : null)}
                        className="w-full px-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                      >
                        {REVIEW_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Frequency</label>
                      <select
                        value={cycle.review_frequency}
                        onChange={e => setCycle(prev => prev ? { ...prev, review_frequency: e.target.value } : null)}
                        className="w-full px-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                      >
                        <option value="weekly">Weekly</option>
                        <option value="biweekly">Biweekly</option>
                        <option value="monthly">Monthly</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Template Start Date</label>
                      <input
                        type="date"
                        value={cycle.template_start_date || ''}
                        onChange={e => setCycle(prev => prev ? { ...prev, template_start_date: e.target.value } : null)}
                        className="w-full px-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Template End Date</label>
                      <input
                        type="date"
                        value={cycle.template_end_date || ''}
                        onChange={e => setCycle(prev => prev ? { ...prev, template_end_date: e.target.value } : null)}
                        min={cycle.template_start_date || undefined}
                        className="w-full px-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Duration</label>
                      <select
                        value={cycle.duration_minutes}
                        onChange={e => setCycle(prev => prev ? { ...prev, duration_minutes: parseInt(e.target.value) } : null)}
                        className="w-full px-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                      >
                        <option value={30}>30 min</option>
                        <option value={45}>45 min</option>
                        <option value={60}>60 min</option>
                        <option value={90}>90 min</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Standard Agenda</label>
                    <textarea
                      value={cycle.standard_agenda || ''}
                      onChange={e => setCycle(prev => prev ? { ...prev, standard_agenda: e.target.value } : null)}
                      rows={5}
                      placeholder="One agenda item per line..."
                      className="w-full px-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 text-sm resize-none"
                    />
                    <p className="text-xs text-gray-400 mt-1">One item per line. These appear on every 1:1 in this template.</p>
                  </div>

                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                      <p className="text-xs text-amber-800">
                        Changes apply going forward only. Existing review records and completed reviews are not affected.
                      </p>
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-2 border-t">
                    <button
                      onClick={handleClose}
                      className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg border"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={async () => { await saveDetails(); onSuccess(); handleClose(); }}
                      disabled={saving}
                      className="flex items-center gap-2 px-5 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
                    >
                      <Save className="w-4 h-4" />
                      {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </div>
              )}

              {activeTab === 'employees' && (
                <div className="space-y-6">
                  {/* Scheduled meetings — reschedule per employee */}
                  {assignedEmployees.length > 0 && (
                    <div>
                      <h3 className="text-base font-semibold text-gray-900 mb-1">Scheduled Meetings</h3>
                      <p className="text-xs text-gray-500 mb-3">Edit the next scheduled date and time for each team member.</p>
                      <div className="space-y-2">
                        {assignedEmployees.map(emp => (
                          <div key={emp.employee_id} className="border border-gray-200 rounded-xl bg-white overflow-hidden">
                            <div className="flex items-center gap-3 p-3">
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-gray-900 text-sm">{emp.full_name}</p>
                                <p className="text-xs text-gray-500">{emp.job_title}</p>
                              </div>
                              <div className="flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                <input
                                  type="datetime-local"
                                  value={scheduleDateEdits[emp.employee_id] || ''}
                                  onChange={e => {
                                    setScheduleDateEdits(prev => ({ ...prev, [emp.employee_id]: e.target.value }));
                                    setReschedulePrompt(null);
                                  }}
                                  className="px-2 py-1.5 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                />
                                <button
                                  onClick={() => {
                                    if (!scheduleDateEdits[emp.employee_id]) return;
                                    setReschedulePrompt(emp.employee_id);
                                  }}
                                  disabled={savingSchedule === emp.employee_id || !scheduleDateEdits[emp.employee_id]}
                                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg transition-colors"
                                >
                                  {savingSchedule === emp.employee_id ? (
                                    <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
                                  ) : (
                                    <RefreshCw className="w-3 h-3" />
                                  )}
                                  {emp.scheduled_meeting_id ? 'Reschedule' : 'Schedule'}
                                </button>
                              </div>
                            </div>

                            {/* Inline scope prompt */}
                            {reschedulePrompt === emp.employee_id && (
                              <div className="border-t border-blue-100 bg-blue-50 px-4 py-3">
                                <p className="text-xs font-semibold text-blue-900 mb-2">How should this change apply?</p>
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => saveScheduleNextOnly(emp)}
                                    className="flex-1 px-3 py-2 text-xs font-medium text-blue-700 bg-white border border-blue-300 rounded-lg hover:bg-blue-50 transition-colors text-left"
                                  >
                                    <span className="block font-semibold">Next review only</span>
                                    <span className="text-gray-500">Update this one meeting date/time</span>
                                  </button>
                                  <button
                                    onClick={() => saveScheduleRecurring(emp)}
                                    className="flex-1 px-3 py-2 text-xs font-medium text-blue-700 bg-white border border-blue-300 rounded-lg hover:bg-blue-50 transition-colors text-left"
                                  >
                                    <span className="block font-semibold">Whole recurring schedule</span>
                                    <span className="text-gray-500">Update recurring day &amp; time going forward</span>
                                  </button>
                                  <button
                                    onClick={() => setReschedulePrompt(null)}
                                    className="px-2 py-2 text-gray-400 hover:text-gray-600"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="border-t pt-5">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="text-base font-semibold text-gray-900">Team Members</h3>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {allTeamMembers.filter(m => m.selected).length} of {allTeamMembers.length} selected
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => toggleAllMembers(true)} className="text-xs text-blue-600 hover:underline">All</button>
                        <span className="text-gray-300">|</span>
                        <button onClick={() => toggleAllMembers(false)} className="text-xs text-gray-500 hover:underline">None</button>
                      </div>
                    </div>

                    {allTeamMembers.length === 0 ? (
                      <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-xl text-sm text-gray-400">
                        No team members found
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {allTeamMembers.map(member => (
                          <label
                            key={member.id}
                            className={`flex items-center gap-3 p-3 border rounded-xl cursor-pointer transition-all ${
                              member.selected
                                ? 'border-blue-300 bg-blue-50'
                                : 'border-gray-200 bg-white hover:border-gray-300'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={member.selected}
                              onChange={() => toggleMember(member.id)}
                              className="w-4 h-4 accent-blue-600"
                            />
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-gray-900 text-sm">{member.full_name}</p>
                              <p className="text-xs text-gray-500">{member.job_title} — {member.department}</p>
                            </div>
                            {member.selected && (
                              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-100 text-blue-600">
                                Assigned
                              </span>
                            )}
                          </label>
                        ))}
                      </div>
                    )}

                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 mt-3">
                      <p className="text-xs text-blue-800">
                        Removing an employee does not delete their review history. All completed reviews are preserved.
                      </p>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t mt-4">
                      <button
                        onClick={handleClose}
                        className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg border"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={async () => { await saveAssignments(); onSuccess(); }}
                        disabled={savingAssignments}
                        className="flex items-center gap-2 px-5 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
                      >
                        <Save className="w-4 h-4" />
                        {savingAssignments ? 'Saving...' : 'Save Assignments'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'kpis' && (
                <div className="space-y-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-semibold text-gray-900">KPIs</h3>
                      <p className="text-xs text-gray-500 mt-0.5">Changes apply to new check-ins going forward</p>
                    </div>
                    <button
                      onClick={addKPI}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-600 border border-blue-200 hover:bg-blue-50 rounded-lg"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add KPI
                    </button>
                  </div>

                  <div className="space-y-2">
                    {kpis.map((kpi, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <input
                          type="text"
                          value={kpi.kpi_name}
                          onChange={e => updateKPI(index, 'kpi_name', e.target.value)}
                          placeholder="KPI name"
                          className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                        />
                        <input
                          type="text"
                          value={kpi.target_value}
                          onChange={e => updateKPI(index, 'target_value', e.target.value)}
                          placeholder="Target"
                          className="w-28 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                        />
                        <input
                          type="text"
                          value={kpi.measurement_unit}
                          onChange={e => updateKPI(index, 'measurement_unit', e.target.value)}
                          placeholder="Unit"
                          className="w-20 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                        />
                        <button
                          onClick={() => removeKPI(index)}
                          className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    {kpis.length === 0 && (
                      <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-xl text-sm text-gray-400">
                        No KPIs set. Click "Add KPI" to begin.
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end gap-3 pt-2 border-t">
                    <button
                      onClick={handleClose}
                      className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg border"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={async () => { await saveKPIs(); onSuccess(); handleClose(); }}
                      disabled={saving}
                      className="flex items-center gap-2 px-5 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
                    >
                      <Save className="w-4 h-4" />
                      {saving ? 'Saving...' : 'Save KPIs'}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
