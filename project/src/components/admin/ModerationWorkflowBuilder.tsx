import { useState, useEffect } from 'react';
import { Plus, Trash2, Save, CreditCard as Edit2, ChevronUp, ChevronDown, ToggleLeft, ToggleRight, AlertTriangle, GripVertical, Settings } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface WorkflowConfig {
  id: string;
  name: string;
  description: string;
  trigger_field: string;
  trigger_operator: string;
  trigger_value: number;
  is_active: boolean;
  created_at: string;
  steps?: WorkflowStep[];
}

interface WorkflowStep {
  id?: string;
  workflow_id?: string;
  step_number: number;
  step_name: string;
  assigned_role: string;
  description: string;
  requires_justification: boolean;
  allow_rating_adjustment: boolean;
}

const ROLES = [
  { value: 'manager', label: 'Manager' },
  { value: 'dept_lead', label: 'Department Lead' },
  { value: 'senior', label: 'Senior Manager' },
  { value: 'leadership', label: 'Leadership / Executive' },
  { value: 'admin', label: 'Administrator' },
];

const TRIGGER_FIELDS = [
  { value: 'rating', label: 'Rating (KPI or Competency)' },
  { value: 'kpi_rating', label: 'KPI Rating only' },
  { value: 'competency_rating', label: 'Competency Rating only' },
];

const TRIGGER_OPERATORS = [
  { value: 'gte', label: '≥ (greater than or equal to)' },
  { value: 'gt', label: '> (greater than)' },
  { value: 'eq', label: '= (equal to)' },
];

export default function ModerationWorkflowBuilder() {
  const [configs, setConfigs] = useState<WorkflowConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingConfig, setEditingConfig] = useState<WorkflowConfig | null>(null);
  const [showNewConfig, setShowNewConfig] = useState(false);
  const [saving, setSaving] = useState(false);
  const [expandedConfig, setExpandedConfig] = useState<string | null>(null);

  const emptyConfig: WorkflowConfig = {
    id: '',
    name: '',
    description: '',
    trigger_field: 'rating',
    trigger_operator: 'gte',
    trigger_value: 4,
    is_active: true,
    created_at: '',
    steps: [],
  };

  const [newConfig, setNewConfig] = useState<WorkflowConfig>({ ...emptyConfig });

  useEffect(() => {
    loadConfigs();
  }, []);

  async function loadConfigs() {
    setLoading(true);
    try {
      const { data: configData } = await supabase
        .from('moderation_workflow_configs')
        .select('*')
        .order('created_at', { ascending: false });

      const configsWithSteps = await Promise.all(
        (configData || []).map(async (config) => {
          const { data: steps } = await supabase
            .from('moderation_workflow_steps')
            .select('*')
            .eq('workflow_id', config.id)
            .order('step_number');
          return { ...config, steps: steps || [] };
        })
      );

      setConfigs(configsWithSteps);
    } catch (error) {
      console.error('Error loading workflow configs:', error);
    } finally {
      setLoading(false);
    }
  }

  async function saveConfig(config: WorkflowConfig, isNew: boolean) {
    setSaving(true);
    try {
      let configId = config.id;

      if (isNew) {
        const { data } = await supabase
          .from('moderation_workflow_configs')
          .insert({
            name: config.name,
            description: config.description,
            trigger_field: config.trigger_field,
            trigger_operator: config.trigger_operator,
            trigger_value: config.trigger_value,
            is_active: config.is_active,
          })
          .select()
          .single();
        configId = data?.id;
      } else {
        await supabase
          .from('moderation_workflow_configs')
          .update({
            name: config.name,
            description: config.description,
            trigger_field: config.trigger_field,
            trigger_operator: config.trigger_operator,
            trigger_value: config.trigger_value,
            is_active: config.is_active,
            updated_at: new Date().toISOString(),
          })
          .eq('id', configId);
      }

      if (configId && config.steps) {
        if (!isNew) {
          await supabase
            .from('moderation_workflow_steps')
            .delete()
            .eq('workflow_id', configId);
        }

        for (const step of config.steps) {
          await supabase.from('moderation_workflow_steps').insert({
            workflow_id: configId,
            step_number: step.step_number,
            step_name: step.step_name,
            assigned_role: step.assigned_role,
            description: step.description,
            requires_justification: step.requires_justification,
            allow_rating_adjustment: step.allow_rating_adjustment,
          });
        }
      }

      setEditingConfig(null);
      setShowNewConfig(false);
      setNewConfig({ ...emptyConfig });
      await loadConfigs();
    } catch (error) {
      console.error('Error saving workflow config:', error);
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(config: WorkflowConfig) {
    await supabase
      .from('moderation_workflow_configs')
      .update({ is_active: !config.is_active, updated_at: new Date().toISOString() })
      .eq('id', config.id);
    await loadConfigs();
  }

  async function deleteConfig(id: string) {
    if (!confirm('Delete this workflow? This cannot be undone.')) return;
    await supabase.from('moderation_workflow_configs').delete().eq('id', id);
    await loadConfigs();
  }

  function addStep(config: WorkflowConfig, setter: (c: WorkflowConfig) => void) {
    const steps = config.steps || [];
    setter({
      ...config,
      steps: [
        ...steps,
        {
          step_number: steps.length + 1,
          step_name: '',
          assigned_role: 'dept_lead',
          description: '',
          requires_justification: true,
          allow_rating_adjustment: false,
        },
      ],
    });
  }

  function removeStep(config: WorkflowConfig, idx: number, setter: (c: WorkflowConfig) => void) {
    const steps = (config.steps || []).filter((_, i) => i !== idx).map((s, i) => ({ ...s, step_number: i + 1 }));
    setter({ ...config, steps });
  }

  function updateStep(config: WorkflowConfig, idx: number, field: keyof WorkflowStep, value: any, setter: (c: WorkflowConfig) => void) {
    const steps = [...(config.steps || [])];
    steps[idx] = { ...steps[idx], [field]: value };
    setter({ ...config, steps });
  }

  function moveStep(config: WorkflowConfig, idx: number, dir: -1 | 1, setter: (c: WorkflowConfig) => void) {
    const steps = [...(config.steps || [])];
    const target = idx + dir;
    if (target < 0 || target >= steps.length) return;
    [steps[idx], steps[target]] = [steps[target], steps[idx]];
    const reordered = steps.map((s, i) => ({ ...s, step_number: i + 1 }));
    setter({ ...config, steps: reordered });
  }

  function renderStepEditor(config: WorkflowConfig, setter: (c: WorkflowConfig) => void) {
    const steps = config.steps || [];
    return (
      <div className="space-y-3">
        {steps.length === 0 ? (
          <div className="p-4 bg-slate-50 border border-dashed border-slate-300 rounded-lg text-center">
            <p className="text-sm text-slate-400">No steps defined. Add a step to build the workflow.</p>
          </div>
        ) : (
          steps.map((step, idx) => (
            <div key={idx} className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
                    {step.step_number}
                  </div>
                  <span className="text-sm font-medium text-slate-700">Step {step.step_number}</span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => moveStep(config, idx, -1, setter)}
                    disabled={idx === 0}
                    className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30"
                  >
                    <ChevronUp className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => moveStep(config, idx, 1, setter)}
                    disabled={idx === steps.length - 1}
                    className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => removeStep(config, idx, setter)}
                    className="p-1 text-rose-400 hover:text-rose-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Step Name</label>
                  <input
                    type="text"
                    value={step.step_name}
                    onChange={(e) => updateStep(config, idx, 'step_name', e.target.value, setter)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g. Department Lead Review"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Assigned Role</label>
                  <select
                    value={step.assigned_role}
                    onChange={(e) => updateStep(config, idx, 'assigned_role', e.target.value, setter)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                  >
                    {ROLES.map(r => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Description</label>
                <input
                  type="text"
                  value={step.description}
                  onChange={(e) => updateStep(config, idx, 'description', e.target.value, setter)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                  placeholder="What should this reviewer do?"
                />
              </div>

              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={step.requires_justification}
                    onChange={(e) => updateStep(config, idx, 'requires_justification', e.target.checked, setter)}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <span className="text-xs text-slate-700">Requires justification</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={step.allow_rating_adjustment}
                    onChange={(e) => updateStep(config, idx, 'allow_rating_adjustment', e.target.checked, setter)}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <span className="text-xs text-slate-700">Allow rating adjustment</span>
                </label>
              </div>
            </div>
          ))
        )}

        <button
          onClick={() => addStep(config, setter)}
          className="w-full flex items-center justify-center gap-2 p-3 border border-dashed border-blue-300 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          Add Step
        </button>
      </div>
    );
  }

  function renderConfigForm(config: WorkflowConfig, setter: (c: WorkflowConfig) => void, isNew: boolean) {
    return (
      <div className="space-y-6 p-5 bg-slate-50 border border-slate-200 rounded-xl">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Workflow Name <span className="text-rose-500">*</span></label>
            <input
              type="text"
              value={config.name}
              onChange={(e) => setter({ ...config, name: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
              placeholder="e.g. High Rating Moderation"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
            <input
              type="text"
              value={config.description}
              onChange={(e) => setter({ ...config, description: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
              placeholder="Brief description of this workflow"
            />
          </div>
        </div>

        <div className="p-4 bg-white border border-slate-200 rounded-lg space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <Settings className="w-4 h-4 text-slate-500" />
            <p className="text-sm font-semibold text-slate-700">Trigger Configuration</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Trigger Field</label>
              <select
                value={config.trigger_field}
                onChange={(e) => setter({ ...config, trigger_field: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
              >
                {TRIGGER_FIELDS.map(f => (
                  <option key={f.value} value={f.value}>{f.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Operator</label>
              <select
                value={config.trigger_operator}
                onChange={(e) => setter({ ...config, trigger_operator: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
              >
                {TRIGGER_OPERATORS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Value</label>
              <input
                type="number"
                min={1}
                max={5}
                value={config.trigger_value}
                onChange={(e) => setter({ ...config, trigger_value: parseFloat(e.target.value) })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-xs text-blue-700">
              Trigger: When <strong>{TRIGGER_FIELDS.find(f => f.value === config.trigger_field)?.label}</strong> is <strong>{TRIGGER_OPERATORS.find(o => o.value === config.trigger_operator)?.label.split(' ')[0]}</strong> <strong>{config.trigger_value}</strong> — this workflow will automatically start.
            </p>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-slate-700">Approval Steps</p>
            <span className="text-xs text-slate-500">{(config.steps || []).length} step{(config.steps || []).length !== 1 ? 's' : ''}</span>
          </div>
          {renderStepEditor(config, setter)}
        </div>

        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={config.is_active}
              onChange={(e) => setter({ ...config, is_active: e.target.checked })}
              className="w-4 h-4 text-blue-600 rounded"
            />
            <span className="text-sm text-slate-700">Active (triggers on new ratings)</span>
          </label>
        </div>

        <div className="flex items-center gap-3 pt-2 border-t border-slate-200">
          <button
            onClick={() => saveConfig(config, isNew)}
            disabled={saving || !config.name.trim()}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : isNew ? 'Create Workflow' : 'Save Changes'}
          </button>
          <button
            onClick={() => { setEditingConfig(null); setShowNewConfig(false); setNewConfig({ ...emptyConfig }); }}
            className="px-4 py-2.5 text-slate-600 hover:text-slate-900 text-sm font-medium"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <p className="text-slate-500 text-sm">Loading workflows...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Moderation Workflow Builder</h2>
          <p className="text-sm text-slate-500 mt-0.5">Configure approval workflows for high ratings</p>
        </div>
        {!showNewConfig && (
          <button
            onClick={() => { setShowNewConfig(true); setEditingConfig(null); }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            New Workflow
          </button>
        )}
      </div>

      {showNewConfig && renderConfigForm(newConfig, setNewConfig, true)}

      {configs.length === 0 && !showNewConfig ? (
        <div className="card text-center py-12 border-dashed border-2 border-slate-200">
          <Settings className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="font-medium text-slate-600">No workflows configured</p>
          <p className="text-sm text-slate-400 mt-1">Create your first moderation workflow to get started</p>
        </div>
      ) : (
        <div className="space-y-4">
          {configs.map(config => {
            const isEditing = editingConfig?.id === config.id;
            const isExpanded = expandedConfig === config.id;

            return (
              <div key={config.id} className="card overflow-hidden">
                <div className="flex items-start justify-between">
                  <div
                    className="flex items-start gap-4 flex-1 cursor-pointer"
                    onClick={() => setExpandedConfig(isExpanded ? null : config.id)}
                  >
                    <div className={`p-2.5 rounded-lg ${config.is_active ? 'bg-green-100' : 'bg-slate-100'}`}>
                      <Settings className={`w-5 h-5 ${config.is_active ? 'text-green-600' : 'text-slate-400'}`} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-slate-900">{config.name}</h3>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          config.is_active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
                        }`}>
                          {config.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      {config.description && (
                        <p className="text-sm text-slate-500 mt-0.5">{config.description}</p>
                      )}
                      <p className="text-xs text-slate-400 mt-1">
                        Trigger: {TRIGGER_FIELDS.find(f => f.value === config.trigger_field)?.label} {TRIGGER_OPERATORS.find(o => o.value === config.trigger_operator)?.label.split(' ')[0]} {config.trigger_value}
                        {' · '}{(config.steps || []).length} step{(config.steps || []).length !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0 pl-4">
                    <button
                      onClick={() => toggleActive(config)}
                      className="text-slate-400 hover:text-slate-600 p-1"
                      title={config.is_active ? 'Deactivate' : 'Activate'}
                    >
                      {config.is_active
                        ? <ToggleRight className="w-5 h-5 text-green-500" />
                        : <ToggleLeft className="w-5 h-5" />
                      }
                    </button>
                    <button
                      onClick={() => {
                        setEditingConfig({ ...config });
                        setShowNewConfig(false);
                        setExpandedConfig(config.id);
                      }}
                      className="p-1 text-slate-400 hover:text-blue-600"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => deleteConfig(config.id)}
                      className="p-1 text-slate-400 hover:text-rose-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setExpandedConfig(isExpanded ? null : config.id)}
                      className="p-1 text-slate-400 hover:text-slate-600"
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {isExpanded && !isEditing && (
                  <div className="mt-5 pt-5 border-t border-slate-100">
                    {(config.steps || []).length === 0 ? (
                      <p className="text-sm text-slate-400">No steps configured</p>
                    ) : (
                      <div className="space-y-2">
                        {(config.steps || []).map((step, idx) => (
                          <div key={idx} className="flex items-start gap-3 p-3 bg-slate-50 border border-slate-200 rounded-lg">
                            <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
                              {step.step_number}
                            </div>
                            <div className="flex-1">
                              <p className="text-sm font-medium text-slate-900">{step.step_name}</p>
                              <p className="text-xs text-slate-500 mt-0.5">
                                Role: {ROLES.find(r => r.value === step.assigned_role)?.label}
                                {step.requires_justification && ' · Requires justification'}
                                {step.allow_rating_adjustment && ' · Can adjust rating'}
                              </p>
                              {step.description && <p className="text-xs text-slate-400 mt-1">{step.description}</p>}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {isEditing && editingConfig && (
                  <div className="mt-5 pt-5 border-t border-slate-100">
                    {renderConfigForm(editingConfig, setEditingConfig, false)}
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
