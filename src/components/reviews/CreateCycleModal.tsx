import { useState, useEffect } from 'react';
import { X, Plus, Trash2, Upload, Calendar as CalendarIcon, Users, Target, CheckCircle, ArrowRight, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface Strategy {
  id: string;
  title: string;
  status: string;
}

interface FocusArea {
  id: string;
  title: string;
}

interface TeamMember {
  id: string;
  full_name: string;
  email: string;
  department: string;
}

interface KPI {
  name: string;
  target: string;
  measurement_unit: string;
  weighting: number;
  from_strategy: boolean;
}

interface CreateCycleModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export function CreateCycleModal({ onClose, onSuccess }: CreateCycleModalProps) {
  const { profile } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [focusAreas, setFocusAreas] = useState<FocusArea[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set());

  const [cycleData, setCycleData] = useState({
    cycle_type: 'one_to_one',
    strategy_id: '',
    focus_area_id: '',
    start_date: '',
    end_date: '',
    weekly_checkins_enabled: false
  });

  const [kpis, setKpis] = useState<KPI[]>([]);
  const [actions, setActions] = useState<string[]>(['']);
  const [schedulingType, setSchedulingType] = useState<'individual' | 'team' | 'later'>('later');
  const [schedules, setSchedules] = useState<Record<string, { date: string; time: string; recurrence: string }>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<TeamMember[]>([]);
  const [showSearch, setShowSearch] = useState(false);

  useEffect(() => {
    loadStrategies();
    loadTeamMembers();
  }, []);

  useEffect(() => {
    if (cycleData.strategy_id) {
      loadFocusAreas(cycleData.strategy_id);
      loadStrategyKPIs(cycleData.strategy_id, cycleData.focus_area_id);
    } else {
      setFocusAreas([]);
      setKpis([]);
    }
  }, [cycleData.strategy_id, cycleData.focus_area_id]);

  useEffect(() => {
    const delaySearch = setTimeout(async () => {
      if (searchTerm.length >= 2) {
        const results = await searchEmployees(searchTerm);
        setSearchResults(results.filter(r => !teamMembers.find(m => m.id === r.id)));
      } else {
        setSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(delaySearch);
  }, [searchTerm, teamMembers]);

  async function loadStrategies() {
    const { data } = await supabase
      .from('strategies')
      .select('id, title, status')
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    setStrategies(data || []);
  }

  async function loadFocusAreas(strategyId: string) {
    const { data } = await supabase
      .from('strategy_focus_areas')
      .select('id, title')
      .eq('strategy_id', strategyId)
      .order('sort_order');

    setFocusAreas(data || []);
  }

  async function loadStrategyKPIs(strategyId: string, focusAreaId: string) {
    if (!focusAreaId) return;

    const { data } = await supabase
      .from('strategy_kpis')
      .select('kpi_name, target_value, measurement_unit')
      .eq('focus_area_id', focusAreaId);

    if (data && data.length > 0) {
      const strategyKPIs = data.map(kpi => ({
        name: kpi.kpi_name,
        target: kpi.target_value || '',
        measurement_unit: kpi.measurement_unit || '',
        weighting: 0,
        from_strategy: true
      }));
      setKpis(strategyKPIs);
    }
  }

  async function loadTeamMembers() {
    if (!profile?.id) return;

    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, email, department, job_title')
      .eq('manager_id', profile.id)
      .order('full_name');

    setTeamMembers(data || []);
  }

  async function searchEmployees(searchTerm: string) {
    if (!searchTerm.trim()) return [];

    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, email, department, job_title')
      .or(`full_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`)
      .neq('id', profile?.id)
      .limit(10);

    return data || [];
  }

  async function addTeamMember(memberId: string) {
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, email, department, job_title')
      .eq('id', memberId)
      .single();

    if (data && !teamMembers.find(m => m.id === data.id)) {
      setTeamMembers([...teamMembers, data]);
      setSelectedMembers(new Set([...selectedMembers, data.id]));
    }
  }

  function addKPI() {
    setKpis([...kpis, { name: '', target: '', measurement_unit: '', weighting: 0, from_strategy: false }]);
  }

  function removeKPI(index: number) {
    if (kpis[index].from_strategy) return;
    setKpis(kpis.filter((_, i) => i !== index));
  }

  function updateKPI(index: number, field: string, value: any) {
    const newKpis = [...kpis];
    newKpis[index] = { ...newKpis[index], [field]: value };
    setKpis(newKpis);
  }

  function toggleMember(memberId: string) {
    const newSelected = new Set(selectedMembers);
    if (newSelected.has(memberId)) {
      newSelected.delete(memberId);
    } else {
      newSelected.add(memberId);
    }
    setSelectedMembers(newSelected);
  }

  function addAction() {
    setActions([...actions, '']);
  }

  function removeAction(index: number) {
    setActions(actions.filter((_, i) => i !== index));
  }

  function updateAction(index: number, value: string) {
    const newActions = [...actions];
    newActions[index] = value;
    setActions(newActions);
  }

  async function handleSubmit() {
    if (selectedMembers.size === 0) {
      alert('Please select at least one team member');
      return;
    }

    setLoading(true);
    try {
      const cycleName = cycleData.cycle_type === 'one_to_one' ? 'One to One' : 'Probation Review';
      const dateRange = `${new Date(cycleData.start_date).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })} - ${new Date(cycleData.end_date).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}`;

      const cycleInsertData = {
        manager_id: profile?.id,
        cycle_name: `${cycleName} (${dateRange})`,
        strategy_id: cycleData.strategy_id && cycleData.strategy_id.trim() !== '' ? cycleData.strategy_id : null,
        focus_area_id: cycleData.focus_area_id && cycleData.focus_area_id.trim() !== '' ? cycleData.focus_area_id : null,
        start_date: cycleData.start_date,
        end_date: cycleData.end_date,
        weekly_checkins_enabled: cycleData.weekly_checkins_enabled,
        status: 'active'
      };

      console.log('Creating cycle with data:', cycleInsertData);

      const { data: cycleResult, error: cycleError } = await supabase
        .from('review_cycles')
        .insert(cycleInsertData)
        .select('id')
        .single();

      if (cycleError) {
        console.error('Cycle creation error:', cycleError);
        throw cycleError;
      }

      const cycleId = cycleResult.id;

      const memberInserts = Array.from(selectedMembers).map(memberId => ({
        cycle_id: cycleId,
        employee_id: memberId,
        status: 'active'
      }));

      const { error: membersError } = await supabase
        .from('review_cycle_members')
        .insert(memberInserts);

      if (membersError) throw membersError;

      const reviewInstanceInserts = Array.from(selectedMembers).map(memberId => ({
        cycle_id: cycleId,
        employee_id: memberId,
        manager_id: profile?.id,
        template_type: cycleData.strategy_id ? 'strategy_linked' : 'generic',
        status: 'upcoming'
      }));

      const { error: instancesError } = await supabase
        .from('review_instances')
        .insert(reviewInstanceInserts);

      if (instancesError) throw instancesError;

      if (kpis.length > 0) {
        const kpiInserts = kpis
          .filter(kpi => kpi.name.trim())
          .map((kpi, index) => ({
            cycle_id: cycleId,
            kpi_name: kpi.name,
            kpi_target: kpi.target,
            kpi_measurement_unit: kpi.measurement_unit,
            weighting: kpi.weighting || null,
            from_strategy: kpi.from_strategy,
            can_remove: !kpi.from_strategy,
            sort_order: index
          }));

        if (kpiInserts.length > 0) {
          const { error: kpisError } = await supabase
            .from('review_cycle_kpis')
            .insert(kpiInserts);

          if (kpisError) throw kpisError;
        }
      }

      if (actions.filter(a => a.trim()).length > 0) {
        const actionInserts = actions
          .filter(action => action.trim())
          .map(action => ({
            cycle_id: cycleId,
            action_title: action
          }));

        const { error: actionsError } = await supabase
          .from('review_cycle_actions')
          .insert(actionInserts);

        if (actionsError) throw actionsError;
      }

      if (schedulingType !== 'later' && Object.keys(schedules).length > 0) {
        const scheduleInserts = Object.entries(schedules)
          .filter(([_, schedule]) => schedule.date && schedule.time)
          .map(([memberId, schedule]) => ({
            cycle_id: cycleId,
            employee_id: memberId,
            manager_id: profile?.id,
            schedule_type: 'weekly',
            scheduled_date: `${schedule.date}T${schedule.time}:00`,
            recurrence: schedule.recurrence || 'weekly'
          }));

        if (scheduleInserts.length > 0) {
          const { error: schedulesError } = await supabase
            .from('review_schedules')
            .insert(scheduleInserts);

          if (schedulesError) throw schedulesError;
        }
      }

      onSuccess();
    } catch (error: any) {
      console.error('Error creating cycle:', error);
      const errorMessage = error?.message || 'Unknown error occurred';
      const errorDetails = error?.details || '';
      const errorHint = error?.hint || '';

      let displayMessage = 'Failed to create review cycle.\n\n';
      displayMessage += `Error: ${errorMessage}`;
      if (errorDetails) displayMessage += `\nDetails: ${errorDetails}`;
      if (errorHint) displayMessage += `\nHint: ${errorHint}`;

      alert(displayMessage);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Create Review Cycle</h2>
            <p className="text-blue-100 text-sm mt-1">One-to-One Template - Step {step} of 3</p>
          </div>
          <button onClick={onClose} className="text-white hover:text-blue-100">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Review Type <span className="text-red-500">*</span>
                </label>
                <select
                  value={cycleData.cycle_type}
                  onChange={(e) => setCycleData({ ...cycleData, cycle_type: e.target.value })}
                  className="input-field w-full"
                >
                  <option value="one_to_one">One to One</option>
                  <option value="probation_review">Probation Review</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Start Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={cycleData.start_date}
                    onChange={(e) => setCycleData({ ...cycleData, start_date: e.target.value })}
                    className="input-field w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    End Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={cycleData.end_date}
                    onChange={(e) => setCycleData({ ...cycleData, end_date: e.target.value })}
                    className="input-field w-full"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Link to Strategy (Optional)
                </label>
                <select
                  value={cycleData.strategy_id}
                  onChange={(e) => setCycleData({ ...cycleData, strategy_id: e.target.value, focus_area_id: '' })}
                  className="input-field w-full"
                >
                  <option value="">No strategy - Generic template</option>
                  {strategies.map(strategy => (
                    <option key={strategy.id} value={strategy.id}>
                      {strategy.title}
                    </option>
                  ))}
                </select>
              </div>

              {cycleData.strategy_id && focusAreas.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Focus Area <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={cycleData.focus_area_id}
                    onChange={(e) => setCycleData({ ...cycleData, focus_area_id: e.target.value })}
                    className="input-field w-full"
                  >
                    <option value="">Select focus area</option>
                    {focusAreas.map(area => (
                      <option key={area.id} value={area.id}>
                        {area.title}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <input
                  type="checkbox"
                  id="weekly_checkins"
                  checked={cycleData.weekly_checkins_enabled}
                  onChange={(e) => setCycleData({ ...cycleData, weekly_checkins_enabled: e.target.checked })}
                  className="w-4 h-4 text-blue-600"
                />
                <label htmlFor="weekly_checkins" className="text-sm text-gray-700 cursor-pointer flex-1">
                  Enable Weekly Check-Ins
                  <p className="text-xs text-gray-500 mt-1">
                    Track KPIs and progress weekly with rolling averages
                  </p>
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Select Team Members <span className="text-red-500">*</span>
                </label>

                <div className="mb-3 relative">
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setShowSearch(true);
                    }}
                    onFocus={() => setShowSearch(true)}
                    placeholder="Search employees by name or email..."
                    className="input-field w-full"
                  />
                  {showSearch && searchResults.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                      {searchResults.map(result => (
                        <button
                          key={result.id}
                          onClick={() => {
                            addTeamMember(result.id);
                            setSearchTerm('');
                            setShowSearch(false);
                          }}
                          className="w-full text-left p-3 hover:bg-gray-50 border-b border-gray-100 last:border-0"
                        >
                          <div className="font-medium text-gray-900">{result.full_name}</div>
                          <div className="text-sm text-gray-500">{result.email}</div>
                          {result.job_title && (
                            <div className="text-xs text-gray-400">{result.job_title}</div>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="border border-gray-200 rounded-lg divide-y max-h-64 overflow-y-auto">
                  {teamMembers.length === 0 ? (
                    <div className="p-6 text-center text-gray-500">
                      <Users className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm">No team members yet</p>
                      <p className="text-xs text-gray-400 mt-1">Search above to add employees</p>
                    </div>
                  ) : (
                    teamMembers.map(member => (
                      <label
                        key={member.id}
                        className="flex items-center gap-3 p-3 hover:bg-gray-50 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedMembers.has(member.id)}
                          onChange={() => toggleMember(member.id)}
                          className="w-4 h-4 text-blue-600"
                        />
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">{member.full_name}</div>
                          <div className="text-sm text-gray-500">{member.email}</div>
                          {member.job_title && (
                            <div className="text-xs text-gray-400">{member.job_title}</div>
                          )}
                        </div>
                      </label>
                    ))
                  )}
                </div>
                <p className="text-sm text-gray-500 mt-2">
                  {selectedMembers.size} member{selectedMembers.size !== 1 ? 's' : ''} selected
                </p>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Target className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-blue-900">Bulk Upload KPIs and Actions</h3>
                    <p className="text-sm text-blue-700 mt-1">
                      {cycleData.strategy_id
                        ? 'Strategy KPIs are auto-populated and cannot be removed'
                        : 'Add standard KPIs and actions for all team members'}
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-sm font-medium text-gray-700">KPIs</label>
                  <button
                    onClick={addKPI}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                  >
                    <Plus className="w-4 h-4" />
                    Add KPI
                  </button>
                </div>
                <div className="space-y-3">
                  {kpis.map((kpi, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 space-y-3">
                          <div>
                            <input
                              type="text"
                              value={kpi.name}
                              onChange={(e) => updateKPI(index, 'name', e.target.value)}
                              disabled={kpi.from_strategy}
                              className="input-field w-full text-sm"
                              placeholder="KPI Name"
                            />
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                            <input
                              type="text"
                              value={kpi.target}
                              onChange={(e) => updateKPI(index, 'target', e.target.value)}
                              disabled={kpi.from_strategy}
                              className="input-field text-sm"
                              placeholder="Target"
                            />
                            <input
                              type="text"
                              value={kpi.measurement_unit}
                              onChange={(e) => updateKPI(index, 'measurement_unit', e.target.value)}
                              disabled={kpi.from_strategy}
                              className="input-field text-sm"
                              placeholder="Unit"
                            />
                            <input
                              type="number"
                              value={kpi.weighting}
                              onChange={(e) => updateKPI(index, 'weighting', parseFloat(e.target.value) || 0)}
                              disabled={kpi.from_strategy}
                              className="input-field text-sm"
                              placeholder="Weight %"
                            />
                          </div>
                        </div>
                        {!kpi.from_strategy && (
                          <button
                            onClick={() => removeKPI(index)}
                            className="text-red-500 hover:text-red-700 p-1"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                      {kpi.from_strategy && (
                        <div className="flex items-center gap-2 text-xs text-blue-600">
                          <CheckCircle className="w-3 h-3" />
                          From strategy - cannot be removed
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-sm font-medium text-gray-700">Standard Actions</label>
                  <button
                    onClick={addAction}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                  >
                    <Plus className="w-4 h-4" />
                    Add Action
                  </button>
                </div>
                <div className="space-y-2">
                  {actions.map((action, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={action}
                        onChange={(e) => updateAction(index, e.target.value)}
                        className="input-field flex-1"
                        placeholder="Action title..."
                      />
                      {actions.length > 1 && (
                        <button
                          onClick={() => removeAction(index)}
                          className="text-red-500 hover:text-red-700 p-2"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <CalendarIcon className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-blue-900">Schedule One-to-Ones</h3>
                    <p className="text-sm text-blue-700 mt-1">
                      Choose how you'd like to schedule reviews with your team
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <label className="flex items-start gap-3 p-4 border-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                  <input
                    type="radio"
                    name="scheduling"
                    value="later"
                    checked={schedulingType === 'later'}
                    onChange={(e) => setSchedulingType(e.target.value as any)}
                    className="mt-1"
                  />
                  <div>
                    <div className="font-medium text-gray-900">Not Now</div>
                    <p className="text-sm text-gray-600">
                      Create the cycle and schedule reviews later
                    </p>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-4 border-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                  <input
                    type="radio"
                    name="scheduling"
                    value="individual"
                    checked={schedulingType === 'individual'}
                    onChange={(e) => setSchedulingType(e.target.value as any)}
                    className="mt-1"
                  />
                  <div>
                    <div className="font-medium text-gray-900">Individual Scheduling</div>
                    <p className="text-sm text-gray-600">
                      Set custom dates and times for each team member
                    </p>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-4 border-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                  <input
                    type="radio"
                    name="scheduling"
                    value="team"
                    checked={schedulingType === 'team'}
                    onChange={(e) => setSchedulingType(e.target.value as any)}
                    className="mt-1"
                  />
                  <div>
                    <div className="font-medium text-gray-900">Team Scheduling</div>
                    <p className="text-sm text-gray-600">
                      Set the same schedule for all team members
                    </p>
                  </div>
                </label>
              </div>

              {schedulingType !== 'later' && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-yellow-900">Calendar Integration</h4>
                      <p className="text-sm text-yellow-700 mt-1">
                        Calendar integration and automated invites will be available in the next update. For now, you'll need to send meeting invites manually.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="border-t border-gray-200 p-6 flex items-center justify-between bg-gray-50">
          <button
            onClick={() => step > 1 ? setStep(step - 1) : onClose()}
            className="btn-secondary"
            disabled={loading}
          >
            {step > 1 ? 'Back' : 'Cancel'}
          </button>
          <button
            onClick={() => {
              if (step < 3) {
                if (step === 1 && (!cycleData.cycle_type || !cycleData.start_date || !cycleData.end_date || selectedMembers.size === 0)) {
                  alert('Please fill in all required fields and select team members');
                  return;
                }
                setStep(step + 1);
              } else {
                handleSubmit();
              }
            }}
            className="btn-primary flex items-center gap-2"
            disabled={loading}
          >
            {step < 3 ? (
              <>
                Next
                <ArrowRight className="w-4 h-4" />
              </>
            ) : (
              <>
                {loading ? 'Creating...' : 'Create Cycle'}
                <CheckCircle className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
