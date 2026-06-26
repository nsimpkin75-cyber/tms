import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Calendar, Users, Target, Plus, Save, Trash2, Copy } from 'lucide-react';

interface TeamMember {
  id: string;
  full_name: string;
  email: string;
  department: string;
  job_title: string;
}

interface KPITemplate {
  id: string;
  template_name: string;
  kpis: Array<{
    name: string;
    target: number;
    measurement_unit: string;
    frequency: string;
  }>;
}

export default function ReviewScheduler() {
  const { profile } = useAuth();
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [kpiTemplates, setKPITemplates] = useState<KPITemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [customKPIs, setCustomKPIs] = useState<Array<{
    name: string;
    target: number;
    measurement_unit: string;
    frequency: string;
  }>>([]);
  const [scheduleType, setScheduleType] = useState<'weekly' | 'monthly'>('monthly');
  const [startDate, setStartDate] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [showKPIForm, setShowKPIForm] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');

  useEffect(() => {
    if (profile?.id) {
      loadTeamMembers();
      loadKPITemplates();
    }
  }, [profile]);

  async function loadTeamMembers() {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, department, job_title')
        .eq('manager_id', profile?.id);

      if (error) throw error;
      setTeamMembers(data || []);
    } catch (error) {
      console.error('Error loading team members:', error);
    }
  }

  async function loadKPITemplates() {
    try {
      const { data, error } = await supabase
        .from('review_kpi_templates')
        .select('*')
        .eq('created_by', profile?.id);

      if (error) throw error;
      setKPITemplates(data || []);
    } catch (error) {
      console.error('Error loading KPI templates:', error);
    }
  }

  function toggleMemberSelection(memberId: string) {
    setSelectedMembers(prev =>
      prev.includes(memberId)
        ? prev.filter(id => id !== memberId)
        : [...prev, memberId]
    );
  }

  function selectAllMembers() {
    if (selectedMembers.length === teamMembers.length) {
      setSelectedMembers([]);
    } else {
      setSelectedMembers(teamMembers.map(m => m.id));
    }
  }

  function addCustomKPI() {
    setCustomKPIs([
      ...customKPIs,
      { name: '', target: 0, measurement_unit: '', frequency: 'weekly' }
    ]);
  }

  function updateCustomKPI(index: number, field: string, value: any) {
    const updated = [...customKPIs];
    updated[index] = { ...updated[index], [field]: value };
    setCustomKPIs(updated);
  }

  function removeCustomKPI(index: number) {
    setCustomKPIs(customKPIs.filter((_, i) => i !== index));
  }

  async function saveKPITemplate() {
    if (!newTemplateName || customKPIs.length === 0) {
      alert('Please provide a template name and at least one KPI');
      return;
    }

    try {
      setLoading(true);
      const { error } = await supabase.from('review_kpi_templates').insert({
        created_by: profile?.id,
        template_name: newTemplateName,
        department: profile?.department,
        kpis: customKPIs
      });

      if (error) throw error;

      alert('KPI template saved successfully!');
      setNewTemplateName('');
      setShowKPIForm(false);
      loadKPITemplates();
    } catch (error) {
      console.error('Error saving KPI template:', error);
      alert('Failed to save KPI template');
    } finally {
      setLoading(false);
    }
  }

  function loadTemplateKPIs() {
    const template = kpiTemplates.find(t => t.id === selectedTemplate);
    if (template) {
      setCustomKPIs(template.kpis);
    }
  }

  async function applyKPIsToTeam() {
    if (selectedMembers.length === 0) {
      alert('Please select at least one team member');
      return;
    }

    if (customKPIs.length === 0) {
      alert('Please add at least one KPI');
      return;
    }

    try {
      setLoading(true);

      // Apply KPIs to each selected member
      for (const memberId of selectedMembers) {
        for (const kpi of customKPIs) {
          await supabase.from('review_kpis').insert({
            employee_id: memberId,
            kpi_name: kpi.name,
            target_value: kpi.target,
            measurement_unit: kpi.measurement_unit,
            frequency: kpi.frequency,
            created_by: profile?.id,
            active: true
          });
        }
      }

      alert('KPIs applied to selected team members successfully!');
    } catch (error) {
      console.error('Error applying KPIs:', error);
      alert('Failed to apply KPIs');
    } finally {
      setLoading(false);
    }
  }

  async function scheduleReviews() {
    if (selectedMembers.length === 0) {
      alert('Please select at least one team member');
      return;
    }

    if (!startDate) {
      alert('Please select a start date');
      return;
    }

    try {
      setLoading(true);

      const reviewDate = new Date(startDate);

      for (const memberId of selectedMembers) {
        if (scheduleType === 'weekly') {
          // Schedule weekly check-ins for the next 4 weeks
          for (let week = 0; week < 4; week++) {
            const weekStart = new Date(reviewDate);
            weekStart.setDate(weekStart.getDate() + (week * 7));

            await supabase.from('review_weekly_checkins').insert({
              employee_id: memberId,
              manager_id: profile?.id,
              week_starting: weekStart.toISOString().split('T')[0],
              status: 'scheduled'
            });
          }
        } else {
          // Schedule monthly review
          await supabase.from('review_monthly_sessions').insert({
            employee_id: memberId,
            manager_id: profile?.id,
            review_month: reviewDate.toISOString().split('T')[0],
            status: 'scheduled'
          });
        }
      }

      // Create notifications
      for (const memberId of selectedMembers) {
        await supabase.from('review_notifications').insert({
          recipient_id: memberId,
          sender_id: profile?.id,
          notification_type: 'review_scheduled',
          title: `${scheduleType === 'weekly' ? 'Weekly Check-in' : 'Monthly Review'} Scheduled`,
          message: `Your ${scheduleType} review has been scheduled starting ${new Date(startDate).toLocaleDateString()}`
        });
      }

      alert(`${scheduleType === 'weekly' ? 'Weekly check-ins' : 'Monthly reviews'} scheduled successfully!`);
      setSelectedMembers([]);
      setStartDate('');
    } catch (error) {
      console.error('Error scheduling reviews:', error);
      alert('Failed to schedule reviews');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Review Scheduler</h2>
          <button
            onClick={() => setShowKPIForm(!showKPIForm)}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create KPI Template
          </button>
        </div>

        {showKPIForm && (
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-semibold text-gray-900 mb-4">Create New KPI Template</h3>
            <input
              type="text"
              placeholder="Template Name (e.g., Sales Team KPIs)"
              value={newTemplateName}
              onChange={(e) => setNewTemplateName(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-4"
            />

            {customKPIs.map((kpi, index) => (
              <div key={index} className="grid grid-cols-5 gap-4 mb-3">
                <input
                  type="text"
                  placeholder="KPI Name"
                  value={kpi.name}
                  onChange={(e) => updateCustomKPI(index, 'name', e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg"
                />
                <input
                  type="number"
                  placeholder="Target"
                  value={kpi.target}
                  onChange={(e) => updateCustomKPI(index, 'target', parseFloat(e.target.value))}
                  className="px-4 py-2 border border-gray-300 rounded-lg"
                />
                <input
                  type="text"
                  placeholder="Unit (e.g., £, %)"
                  value={kpi.measurement_unit}
                  onChange={(e) => updateCustomKPI(index, 'measurement_unit', e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg"
                />
                <select
                  value={kpi.frequency}
                  onChange={(e) => updateCustomKPI(index, 'frequency', e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                </select>
                <button
                  onClick={() => removeCustomKPI(index)}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}

            <div className="flex gap-4">
              <button
                onClick={addCustomKPI}
                className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add KPI
              </button>
              <button
                onClick={saveKPITemplate}
                disabled={loading}
                className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                <Save className="w-4 h-4 mr-2" />
                Save Template
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Team Selection */}
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900 flex items-center">
                <Users className="w-5 h-5 mr-2" />
                Select Team Members
              </h3>
              <button
                onClick={selectAllMembers}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                {selectedMembers.length === teamMembers.length ? 'Deselect All' : 'Select All'}
              </button>
            </div>

            <div className="space-y-2 max-h-96 overflow-y-auto">
              {teamMembers.map((member) => (
                <label key={member.id} className="flex items-center p-3 hover:bg-gray-50 rounded-lg cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedMembers.includes(member.id)}
                    onChange={() => toggleMemberSelection(member.id)}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <div className="ml-3">
                    <div className="font-medium text-gray-900">{member.full_name}</div>
                    <div className="text-sm text-gray-500">{member.job_title}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* KPI Setup */}
          <div className="border border-gray-200 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
              <Target className="w-5 h-5 mr-2" />
              KPI Setup
            </h3>

            {kpiTemplates.length > 0 && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Load KPI Template
                </label>
                <div className="flex gap-2">
                  <select
                    value={selectedTemplate}
                    onChange={(e) => setSelectedTemplate(e.target.value)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="">Select a template...</option>
                    {kpiTemplates.map((template) => (
                      <option key={template.id} value={template.id}>
                        {template.template_name}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={loadTemplateKPIs}
                    disabled={!selectedTemplate}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Current KPIs ({customKPIs.length})
              </label>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {customKPIs.map((kpi, index) => (
                  <div key={index} className="text-sm p-2 bg-gray-50 rounded">
                    <div className="font-medium">{kpi.name}</div>
                    <div className="text-gray-600">
                      Target: {kpi.target} {kpi.measurement_unit} ({kpi.frequency})
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={applyKPIsToTeam}
              disabled={loading || selectedMembers.length === 0 || customKPIs.length === 0}
              className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              Apply KPIs to Selected Team Members
            </button>
          </div>
        </div>

        {/* Schedule Reviews */}
        <div className="mt-6 border border-gray-200 rounded-lg p-4">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
            <Calendar className="w-5 h-5 mr-2" />
            Schedule Reviews
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Review Type
              </label>
              <select
                value={scheduleType}
                onChange={(e) => setScheduleType(e.target.value as 'weekly' | 'monthly')}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              >
                <option value="weekly">Weekly Check-ins</option>
                <option value="monthly">Monthly Reviews</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              />
            </div>

            <div className="flex items-end">
              <button
                onClick={scheduleReviews}
                disabled={loading || selectedMembers.length === 0 || !startDate}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                Schedule for {selectedMembers.length} Member{selectedMembers.length !== 1 ? 's' : ''}
              </button>
            </div>
          </div>
        </div>

        {selectedMembers.length > 0 && (
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              {selectedMembers.length} team member{selectedMembers.length !== 1 ? 's' : ''} selected
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
