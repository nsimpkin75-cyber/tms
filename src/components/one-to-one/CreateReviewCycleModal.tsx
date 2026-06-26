import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import {
  X, Plus, Trash2, CheckCircle, Calendar, Clock, Users,
  ChevronRight, ChevronLeft, FileText, Target, Eye, AlertCircle
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface CreateReviewCycleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface KPI {
  kpi_name: string;
  target: string;
  measurement_unit: string;
}

interface AgendaItem {
  text: string;
}

interface TeamMember {
  id: string;
  full_name: string;
  job_title: string;
  department: string;
  selected: boolean;
  scheduledDate: string;
  scheduledTime: string;
  scheduled: boolean;
  conflictTemplateName?: string;
}

const REVIEW_TYPES = [
  { value: 'standard', label: '1:1 Review' },
  { value: 'probation', label: 'Probation Review' },
  { value: 'other', label: 'Other' },
];

export default function CreateReviewCycleModal({ isOpen, onClose, onSuccess }: CreateReviewCycleModalProps) {
  const { profile } = useAuth();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [loading, setLoading] = useState(false);
  const [createdCycleId, setCreatedCycleId] = useState<string | null>(null);

  const [templateTitle, setTemplateTitle] = useState('');
  const [reviewType, setReviewType] = useState('standard');
  const [templateStartDate, setTemplateStartDate] = useState('');
  const [templateEndDate, setTemplateEndDate] = useState('');
  const [frequency, setFrequency] = useState('monthly');
  const [duration, setDuration] = useState('60');
  const [kpis, setKpis] = useState<KPI[]>([{ kpi_name: '', target: '', measurement_unit: '' }]);
  const [agendaItems, setAgendaItems] = useState<AgendaItem[]>([{ text: '' }]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [schedulingLoading, setSchedulingLoading] = useState(false);
  const [scheduledCount, setScheduledCount] = useState(0);
  const [conflictWarning, setConflictWarning] = useState<string[]>([]);

  useEffect(() => {
    if (isOpen && profile?.id) {
      loadTeamMembers();
    }
  }, [isOpen, profile?.id]);

  async function loadTeamMembers() {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, job_title, department')
        .eq('manager_id', profile?.id)
        .eq('active', true)
        .order('full_name');

      if (!data) { setTeamMembers([]); return; }

      // Check which employees already have an active template assignment
      const employeeIds = data.map(m => m.id);
      const { data: existingAssignments } = await supabase
        .from('one_to_one_cycle_employee_assignments')
        .select('employee_id, one_to_one_review_cycles(cycle_name)')
        .in('employee_id', employeeIds)
        .eq('is_active', true);

      const assignedMap: Record<string, string> = {};
      (existingAssignments || []).forEach((a: any) => {
        const cName = Array.isArray(a.one_to_one_review_cycles)
          ? a.one_to_one_review_cycles[0]?.cycle_name
          : a.one_to_one_review_cycles?.cycle_name;
        if (cName) assignedMap[a.employee_id] = cName;
      });

      setTeamMembers(
        data.map(m => ({
          ...m,
          selected: !assignedMap[m.id],
          scheduledDate: '',
          scheduledTime: '',
          scheduled: false,
          conflictTemplateName: assignedMap[m.id],
        }))
      );
    } catch (err) {
      console.error('Error loading team members:', err);
    }
  }

  function addKPI() {
    setKpis([...kpis, { kpi_name: '', target: '', measurement_unit: '' }]);
  }

  function removeKPI(index: number) {
    if (kpis.length > 1) setKpis(kpis.filter((_, i) => i !== index));
  }

  function updateKPI(index: number, field: keyof KPI, value: string) {
    const updated = [...kpis];
    updated[index] = { ...updated[index], [field]: value };
    setKpis(updated);
  }

  function addAgendaItem() {
    setAgendaItems([...agendaItems, { text: '' }]);
  }

  function removeAgendaItem(index: number) {
    if (agendaItems.length > 1) setAgendaItems(agendaItems.filter((_, i) => i !== index));
  }

  function updateAgendaItem(index: number, value: string) {
    const updated = [...agendaItems];
    updated[index] = { text: value };
    setAgendaItems(updated);
  }

  function toggleMember(id: string) {
    const member = teamMembers.find(m => m.id === id);
    if (!member) return;

    // If selecting a member who has a conflict, warn but allow
    setTeamMembers(prev => prev.map(m => m.id === id ? { ...m, selected: !m.selected } : m));
  }

  function toggleAll(selected: boolean) {
    setTeamMembers(prev => prev.map(m => ({ ...m, selected })));
  }

  function updateMemberSchedule(memberId: string, field: 'scheduledDate' | 'scheduledTime', value: string) {
    setTeamMembers(prev => prev.map(m => m.id === memberId ? { ...m, [field]: value } : m));
  }

  const selectedMembers = teamMembers.filter(m => m.selected);
  const validKPIs = kpis.filter(k => k.kpi_name.trim() !== '' && k.target.trim() !== '');
  const validAgenda = agendaItems.filter(a => a.text.trim() !== '');
  const conflictingSelected = selectedMembers.filter(m => m.conflictTemplateName);

  function canProceedToStep2() {
    return !!templateTitle.trim() && !!reviewType && !!templateStartDate;
  }

  async function handleCreateTemplate() {
    setLoading(true);
    try {
      const typeLabelMap: Record<string, string> = {
        standard: '1:1 Review',
        probation: 'Probation Review',
        other: 'Review',
      };
      const typeLabel = typeLabelMap[reviewType] || 'Review';
      const startLabel = templateStartDate
        ? new Date(templateStartDate).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })
        : '';
      const autoName = `${typeLabel}${startLabel ? ` — ${startLabel}` : ''}`;
      const agendaText = validAgenda.map(a => a.text).join('\n');

      const { data: cycle, error: cycleError } = await supabase
        .from('one_to_one_review_cycles')
        .insert({
          manager_id: profile?.id,
          cycle_name: autoName,
          template_title: templateTitle.trim() || null,
          quarter: null,
          cycle_type: reviewType,
          cycle_start_date: templateStartDate || new Date().toISOString().split('T')[0],
          template_start_date: templateStartDate || null,
          template_end_date: templateEndDate || null,
          review_frequency: frequency,
          duration_minutes: parseInt(duration),
          standard_agenda: agendaText,
          has_strategic_kpis: false,
          status: 'active',
        })
        .select()
        .single();

      if (cycleError) throw cycleError;

      if (validKPIs.length > 0) {
        const kpisToInsert = validKPIs.map((kpi, index) => ({
          cycle_id: cycle.id,
          kpi_name: kpi.kpi_name,
          target_value: kpi.target,
          measurement_unit: kpi.measurement_unit || '',
          frequency: 'monthly',
          source: 'manager',
          sort_order: index,
        }));
        await supabase.from('one_to_one_cycle_kpis').insert(kpisToInsert);
      }

      if (selectedMembers.length > 0) {
        const assignments = selectedMembers.map(m => ({
          cycle_id: cycle.id,
          employee_id: m.id,
          manager_id: profile?.id,
          is_active: true,
        }));
        await supabase.from('one_to_one_cycle_employee_assignments').insert(assignments);

        // Create a placeholder meeting for each assigned employee so cycle KPIs
        // pull through immediately when any review is opened, even before scheduling
        const placeholderMeetings = selectedMembers.map(m => ({
          oto_cycle_id: cycle.id,
          employee_id: m.id,
          manager_id: profile?.id,
          scheduled_datetime: new Date().toISOString(),
          completion_status: 'scheduled',
          status: 'scheduled',
        }));
        await supabase.from('one_to_one_scheduled_meetings').insert(placeholderMeetings);
      }

      setCreatedCycleId(cycle.id);
      setStep(3);
    } catch (error) {
      console.error('Error creating review template:', error);
      alert('Failed to create review template. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleScheduleMember(memberId: string) {
    const member = teamMembers.find(m => m.id === memberId);
    if (!member || !member.scheduledDate || !member.scheduledTime || !createdCycleId) return;

    setSchedulingLoading(true);
    try {
      const scheduledDatetime = new Date(`${member.scheduledDate}T${member.scheduledTime}`).toISOString();

      // Update the placeholder meeting that was created during assignment
      const { data: existing } = await supabase
        .from('one_to_one_scheduled_meetings')
        .select('id')
        .eq('oto_cycle_id', createdCycleId)
        .eq('employee_id', memberId)
        .neq('completion_status', 'submitted')
        .limit(1)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('one_to_one_scheduled_meetings')
          .update({ scheduled_datetime: scheduledDatetime, updated_at: new Date().toISOString() })
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('one_to_one_scheduled_meetings')
          .insert({
            oto_cycle_id: createdCycleId,
            manager_id: profile?.id,
            employee_id: memberId,
            scheduled_datetime: scheduledDatetime,
            status: 'scheduled',
            completion_status: 'scheduled',
          });
        if (error) throw error;
      }

      setScheduledCount(prev => prev + 1);
      setTeamMembers(prev => prev.map(m => m.id === memberId ? { ...m, scheduled: true } : m));
    } catch (err) {
      console.error('Error scheduling meeting:', err);
      alert('Failed to schedule meeting');
    } finally {
      setSchedulingLoading(false);
    }
  }

  function handleFinish() {
    resetForm();
    onSuccess();
  }

  function resetForm() {
    setStep(1);
    setCreatedCycleId(null);
    setReviewType('standard');
    setTemplateStartDate('');
    setTemplateEndDate('');
    setFrequency('monthly');
    setDuration('60');
    setKpis([{ kpi_name: '', target: '', measurement_unit: '' }]);
    setAgendaItems([{ text: '' }]);
    setScheduledCount(0);
    setTeamMembers([]);
    setConflictWarning([]);
  }

  function handleClose() {
    resetForm();
    onClose();
  }

  if (!isOpen) return null;

  const stepLabels = ['Template Setup', 'Preview & Assign', 'Schedule'];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[92vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b bg-gray-50 rounded-t-xl">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Create Review Template</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {step === 1 ? 'Configure the template details and KPIs' :
               step === 2 ? 'Preview the template and assign employees' :
               'Schedule meetings with your team'}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 text-sm">
              {stepLabels.map((label, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    step > i + 1 ? 'bg-green-500 text-white' :
                    step === i + 1 ? 'bg-blue-600 text-white' :
                    'bg-gray-200 text-gray-500'
                  }`}>
                    {step > i + 1 ? <CheckCircle className="w-3.5 h-3.5" /> : i + 1}
                  </div>
                  <span className={`hidden sm:inline text-xs ${step === i + 1 ? 'font-semibold text-gray-800' : 'text-gray-400'}`}>{label}</span>
                  {i < stepLabels.length - 1 && <ChevronRight className="w-3 h-3 text-gray-300" />}
                </div>
              ))}
            </div>
            <button onClick={handleClose} className="text-gray-400 hover:text-gray-600 ml-2">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="overflow-y-auto flex-1">
          {step === 1 && (
            <div className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Template Title <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={templateTitle}
                  onChange={e => setTemplateTitle(e.target.value)}
                  placeholder="e.g. Specialist, IC4, Monthly 1:1, Team Leader Review"
                  className="w-full px-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Review Type <span className="text-red-500">*</span></label>
                  <select
                    value={reviewType}
                    onChange={e => setReviewType(e.target.value)}
                    className="w-full px-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                  >
                    {REVIEW_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Frequency</label>
                  <select
                    value={frequency}
                    onChange={e => setFrequency(e.target.value)}
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
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Template Start Date <span className="text-red-500">*</span></label>
                  <input
                    type="date"
                    value={templateStartDate}
                    onChange={e => setTemplateStartDate(e.target.value)}
                    className="w-full px-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Template End Date</label>
                  <input
                    type="date"
                    value={templateEndDate}
                    onChange={e => setTemplateEndDate(e.target.value)}
                    min={templateStartDate || undefined}
                    className="w-full px-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Duration</label>
                  <select
                    value={duration}
                    onChange={e => setDuration(e.target.value)}
                    className="w-full px-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                  >
                    <option value="30">30 min</option>
                    <option value="45">45 min</option>
                    <option value="60">60 min</option>
                    <option value="90">90 min</option>
                  </select>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">KPIs to track</label>
                    <p className="text-xs text-gray-500 mt-0.5">KPIs will be discussed and scored in each weekly check-in</p>
                  </div>
                  <button
                    type="button"
                    onClick={addKPI}
                    className="flex items-center gap-1.5 px-3 py-1 text-xs font-medium text-blue-600 border border-blue-200 hover:bg-blue-50 rounded-lg"
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
                        placeholder="KPI name (e.g. Sales Target)"
                        className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                      />
                      <input
                        type="text"
                        value={kpi.target}
                        onChange={e => updateKPI(index, 'target', e.target.value)}
                        placeholder="Target (e.g. £100k)"
                        className="w-32 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                      />
                      <input
                        type="text"
                        value={kpi.measurement_unit}
                        onChange={e => updateKPI(index, 'measurement_unit', e.target.value)}
                        placeholder="Unit (e.g. %)"
                        className="w-24 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                      />
                      {kpis.length > 1 && (
                        <button type="button" onClick={() => removeKPI(index)} className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Standard Agenda</label>
                    <p className="text-xs text-gray-500 mt-0.5">These items will appear on every 1:1 in this template</p>
                  </div>
                  <button
                    type="button"
                    onClick={addAgendaItem}
                    className="flex items-center gap-1.5 px-3 py-1 text-xs font-medium text-blue-600 border border-blue-200 hover:bg-blue-50 rounded-lg"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Item
                  </button>
                </div>
                <div className="space-y-2">
                  {agendaItems.map((item, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <span className="text-xs text-gray-400 w-5 text-right flex-shrink-0">{index + 1}.</span>
                      <input
                        type="text"
                        value={item.text}
                        onChange={e => updateAgendaItem(index, e.target.value)}
                        placeholder="Agenda item (e.g. Review progress on current projects)"
                        className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                      />
                      {agendaItems.length > 1 && (
                        <button type="button" onClick={() => removeAgendaItem(index)} className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg border"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => { if (canProceedToStep2()) setStep(2); }}
                  disabled={!canProceedToStep2()}
                  className="flex items-center gap-2 px-5 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
                >
                  Preview & Assign
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="p-6 space-y-6">
              <div className="bg-sky-50 border border-sky-200 rounded-xl p-5 space-y-4">
                <div className="flex items-center gap-2">
                  <Eye className="w-5 h-5 text-sky-600" />
                  <h3 className="font-semibold text-sky-900">Template Preview</h3>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-semibold text-sky-700 uppercase tracking-wide mb-1">Review Type</p>
                    <p className="text-sm font-medium text-gray-900">{REVIEW_TYPES.find(t => t.value === reviewType)?.label}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-sky-700 uppercase tracking-wide mb-1">Frequency</p>
                    <p className="text-sm font-medium text-gray-900 capitalize">{frequency} — {duration} minutes</p>
                  </div>
                  {templateStartDate && (
                    <div>
                      <p className="text-xs font-semibold text-sky-700 uppercase tracking-wide mb-1">Start Date</p>
                      <p className="text-sm font-medium text-gray-900">
                        {new Date(templateStartDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </p>
                    </div>
                  )}
                  {templateEndDate && (
                    <div>
                      <p className="text-xs font-semibold text-sky-700 uppercase tracking-wide mb-1">End Date</p>
                      <p className="text-sm font-medium text-gray-900">
                        {new Date(templateEndDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </p>
                    </div>
                  )}
                </div>

                {validKPIs.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-sky-700 uppercase tracking-wide mb-2">KPIs</p>
                    <div className="flex flex-wrap gap-2">
                      {validKPIs.map((kpi, i) => (
                        <span key={i} className="flex items-center gap-1.5 px-2.5 py-1 bg-white border border-sky-200 rounded-lg text-xs font-medium text-gray-700">
                          <Target className="w-3 h-3 text-sky-500" />
                          {kpi.kpi_name}: {kpi.target}{kpi.measurement_unit ? ` ${kpi.measurement_unit}` : ''}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {validAgenda.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-sky-700 uppercase tracking-wide mb-2">Standard Agenda</p>
                    <ol className="space-y-1">
                      {validAgenda.map((item, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                          <span className="font-semibold text-sky-500 flex-shrink-0">{i + 1}.</span>
                          {item.text}
                        </li>
                      ))}
                    </ol>
                  </div>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="text-base font-semibold text-gray-900">Assign Employees</h3>
                    <p className="text-xs text-gray-500 mt-0.5">Each employee can only be assigned to one active template at a time</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => toggleAll(true)} className="text-xs text-blue-600 hover:underline">All</button>
                    <span className="text-gray-300">|</span>
                    <button onClick={() => toggleAll(false)} className="text-xs text-gray-500 hover:underline">None</button>
                  </div>
                </div>

                {conflictingSelected.length > 0 && (
                  <div className="mb-3 flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                    <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div className="text-xs text-amber-800">
                      <p className="font-semibold mb-1">{conflictingSelected.length} selected employee{conflictingSelected.length !== 1 ? 's are' : ' is'} already assigned to another template:</p>
                      <ul className="list-disc list-inside space-y-0.5">
                        {conflictingSelected.map(m => (
                          <li key={m.id}>{m.full_name} — currently in "{m.conflictTemplateName}"</li>
                        ))}
                      </ul>
                      <p className="mt-1">Assigning them here will not remove them from their current template. Consider removing them first via Edit Template.</p>
                    </div>
                  </div>
                )}

                {teamMembers.length === 0 ? (
                  <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-xl">
                    <Users className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">No team members found</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {teamMembers.map(member => (
                      <label
                        key={member.id}
                        className={`flex items-center gap-3 p-3 border rounded-xl cursor-pointer transition-all ${
                          member.selected
                            ? member.conflictTemplateName
                              ? 'border-amber-300 bg-amber-50'
                              : 'border-blue-300 bg-blue-50'
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
                          {member.conflictTemplateName && (
                            <p className="text-xs text-amber-600 mt-0.5">Currently in: {member.conflictTemplateName}</p>
                          )}
                        </div>
                        {member.selected && (
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                            member.conflictTemplateName
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-blue-100 text-blue-600'
                          }`}>
                            {member.conflictTemplateName ? 'Conflict' : 'Assigned'}
                          </span>
                        )}
                      </label>
                    ))}
                  </div>
                )}
                <p className="text-xs text-gray-500 mt-2">
                  {selectedMembers.length} of {teamMembers.length} team member{teamMembers.length !== 1 ? 's' : ''} selected
                </p>
              </div>

              <div className="flex items-center justify-between pt-4 border-t">
                <button
                  onClick={() => setStep(1)}
                  className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg border"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Back
                </button>
                <button
                  onClick={handleCreateTemplate}
                  disabled={loading}
                  className="flex items-center gap-2 px-5 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
                >
                  {loading ? 'Creating...' : 'Create Template & Continue'}
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="p-6 space-y-6">
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-green-900">Template created successfully</p>
                  <p className="text-sm text-green-700 mt-0.5">
                    Now schedule the first 1:1 for each assigned team member. You can skip this and schedule later.
                  </p>
                </div>
              </div>

              {selectedMembers.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-xl">
                  <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-600 font-medium">No employees assigned to this template</p>
                  <p className="text-sm text-gray-400 mt-1">You can add employees later using the Edit Template option</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {selectedMembers.map(member => (
                    <div
                      key={member.id}
                      className={`border rounded-xl p-4 transition-all ${
                        member.scheduled ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-white'
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${
                          member.scheduled ? 'bg-green-100' : 'bg-blue-100'
                        }`}>
                          {member.scheduled
                            ? <CheckCircle className="w-5 h-5 text-green-600" />
                            : <span className="text-sm font-bold text-blue-600">{member.full_name.charAt(0)}</span>
                          }
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-2">
                            <div>
                              <p className="font-semibold text-gray-900">{member.full_name}</p>
                              <p className="text-xs text-gray-500">{member.job_title} — {member.department}</p>
                            </div>
                            {member.scheduled && (
                              <span className="flex items-center gap-1 text-xs font-medium text-green-700 bg-green-100 px-2.5 py-1 rounded-full">
                                <CheckCircle className="w-3.5 h-3.5" />
                                Scheduled
                              </span>
                            )}
                          </div>

                          {!member.scheduled && (
                            <div className="flex items-center gap-3 flex-wrap">
                              <div className="flex items-center gap-2 flex-1 min-w-[180px]">
                                <Calendar className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                <input
                                  type="date"
                                  value={member.scheduledDate}
                                  onChange={e => updateMemberSchedule(member.id, 'scheduledDate', e.target.value)}
                                  className="flex-1 px-3 py-1.5 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                                />
                              </div>
                              <div className="flex items-center gap-2">
                                <Clock className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                <input
                                  type="time"
                                  value={member.scheduledTime}
                                  onChange={e => updateMemberSchedule(member.id, 'scheduledTime', e.target.value)}
                                  className="px-3 py-1.5 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                                />
                              </div>
                              <button
                                onClick={() => handleScheduleMember(member.id)}
                                disabled={!member.scheduledDate || !member.scheduledTime || schedulingLoading}
                                className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                                  member.scheduledDate && member.scheduledTime
                                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                }`}
                              >
                                <Calendar className="w-4 h-4" />
                                Schedule
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-center justify-between pt-4 border-t">
                <p className="text-sm text-gray-500">
                  {scheduledCount} of {selectedMembers.length} scheduled
                </p>
                <button
                  onClick={handleFinish}
                  className="flex items-center gap-2 px-5 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                >
                  <CheckCircle className="w-4 h-4" />
                  {scheduledCount > 0 ? 'Done' : 'Skip & Finish'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
