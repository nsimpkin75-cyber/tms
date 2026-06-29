import React, { useState, useEffect, useCallback } from 'react';
import { Save, Plus, Trash2, Power, PowerOff, Bot, CheckCircle, X, ThumbsUp, ThumbsDown, MessageSquare, Clock, ChevronDown, ChevronUp, Filter } from 'lucide-react';
import { supabase } from '../../lib/supabase';

// Matches the actual copilot_config table schema
interface SeraConfig {
  id: string;
  name: string;
  description: string;
  is_active: boolean;
  config_data: {
    model_name?: string;
    temperature?: number;
    max_tokens?: number;
    top_p?: number;
    frequency_penalty?: number;
    presence_penalty?: number;
    system_prompt?: string;
    knowledge_base?: string;
    // Behaviour settings
    intervention_score_threshold?: number;
    challenge_weak_level5_evidence?: boolean;
    require_measurable_outcomes_level5?: boolean;
    require_multiple_examples_level5?: boolean;
    suggest_star_format_improvements?: boolean;
    auto_recommend_moderation_unsupported_5s?: boolean;
    auto_suggest_development_actions?: boolean;
    behaviour_instructions?: string;
  };
  ai_intervention_threshold: number;
  auto_suggest_actions: boolean;
  created_at: string;
  updated_at: string;
}

interface ConfigForm {
  name: string;
  description: string;
  is_active: boolean;
  ai_intervention_threshold: number;
  auto_suggest_actions: boolean;
  model_name: string;
  temperature: number;
  max_tokens: number;
  top_p: number;
  frequency_penalty: number;
  presence_penalty: number;
  system_prompt: string;
  knowledge_base: string;
  // Behaviour settings stored in config_data
  intervention_score_threshold: number;
  challenge_weak_level5_evidence: boolean;
  require_measurable_outcomes_level5: boolean;
  require_multiple_examples_level5: boolean;
  suggest_star_format_improvements: boolean;
  auto_recommend_moderation_unsupported_5s: boolean;
  auto_suggest_development_actions: boolean;
  behaviour_instructions: string;
}

const DEFAULT_FORM: ConfigForm = {
  name: '',
  description: '',
  is_active: false,
  ai_intervention_threshold: 3,
  auto_suggest_actions: true,
  model_name: 'gpt-4',
  temperature: 0.7,
  max_tokens: 2000,
  top_p: 1.0,
  frequency_penalty: 0,
  presence_penalty: 0,
  system_prompt: '',
  knowledge_base: '',
  // Behaviour defaults
  intervention_score_threshold: 4,
  challenge_weak_level5_evidence: false,
  require_measurable_outcomes_level5: false,
  require_multiple_examples_level5: false,
  suggest_star_format_improvements: false,
  auto_recommend_moderation_unsupported_5s: false,
  auto_suggest_development_actions: true,
  behaviour_instructions: '',
};

type Toast = { type: 'success' | 'error'; message: string };

interface FeedbackLogEntry {
  id: string;
  created_at: string;
  employee_name: string;
  rating: number;
  rating_type: string;
  item_name: string;
  manager_input: string;
  sera_response_valid: boolean | null;
  sera_confidence: string | null;
  sera_message: string | null;
  sera_prompt: string | null;
  sera_summary: string | null;
  manager_overrode: boolean;
  override_reason: string | null;
  admin_feedback: 'helpful' | 'needs_improvement' | null;
  admin_notes: string | null;
  admin_reviewed_at: string | null;
}

export default function CopilotConfigManagement() {
  const [configs, setConfigs] = useState<SeraConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingConfig, setEditingConfig] = useState<SeraConfig | null>(null);
  const [form, setForm] = useState<ConfigForm>(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);
  const [activeTab, setActiveTab] = useState<'llm' | 'prompts' | 'behaviour'>('llm');

  // Page-level view: 'configs' or 'feedback-log'
  const [pageView, setPageView] = useState<'configs' | 'feedback-log'>('configs');

  // Feedback log state
  const [feedbackLog, setFeedbackLog] = useState<FeedbackLogEntry[]>([]);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [editingNotesId, setEditingNotesId] = useState<string | null>(null);
  const [notesDraft, setNotesDraft] = useState('');
  const [feedbackFilter, setFeedbackFilter] = useState<'all' | 'helpful' | 'needs_improvement' | 'unreviewed'>('all');
  const [savingFeedbackId, setSavingFeedbackId] = useState<string | null>(null);

  useEffect(() => {
    fetchConfigs();
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  async function fetchConfigs() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('copilot_config')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setConfigs(data || []);
    } catch (err) {
      console.error('Error loading Opal configurations:', err);
      setToast({ type: 'error', message: 'Failed to load Opal configurations. Please try again.' });
    } finally {
      setLoading(false);
    }
  }

  function openNew() {
    setEditingConfig(null);
    setForm(DEFAULT_FORM);
    setActiveTab('llm');
    setShowModal(true);
  }

  function openEdit(config: SeraConfig) {
    setEditingConfig(config);
    const cd = config.config_data ?? {};
    setForm({
      name: config.name,
      description: config.description,
      is_active: config.is_active,
      ai_intervention_threshold: config.ai_intervention_threshold ?? 3,
      auto_suggest_actions: config.auto_suggest_actions ?? true,
      model_name: cd.model_name ?? 'gpt-4',
      temperature: cd.temperature ?? 0.7,
      max_tokens: cd.max_tokens ?? 2000,
      top_p: cd.top_p ?? 1.0,
      frequency_penalty: cd.frequency_penalty ?? 0,
      presence_penalty: cd.presence_penalty ?? 0,
      system_prompt: cd.system_prompt ?? '',
      knowledge_base: cd.knowledge_base ?? '',
      intervention_score_threshold: cd.intervention_score_threshold ?? 4,
      challenge_weak_level5_evidence: cd.challenge_weak_level5_evidence ?? false,
      require_measurable_outcomes_level5: cd.require_measurable_outcomes_level5 ?? false,
      require_multiple_examples_level5: cd.require_multiple_examples_level5 ?? false,
      suggest_star_format_improvements: cd.suggest_star_format_improvements ?? false,
      auto_recommend_moderation_unsupported_5s: cd.auto_recommend_moderation_unsupported_5s ?? false,
      auto_suggest_development_actions: cd.auto_suggest_development_actions ?? true,
      behaviour_instructions: cd.behaviour_instructions ?? '',
    });
    setActiveTab('llm');
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setEditingConfig(null);
    setForm(DEFAULT_FORM);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim(),
        is_active: form.is_active,
        ai_intervention_threshold: Number(form.ai_intervention_threshold),
        auto_suggest_actions: form.auto_suggest_actions,
        config_data: {
          model_name: form.model_name.trim(),
          temperature: Number(form.temperature),
          max_tokens: Number(form.max_tokens),
          top_p: Number(form.top_p),
          frequency_penalty: Number(form.frequency_penalty),
          presence_penalty: Number(form.presence_penalty),
          system_prompt: form.system_prompt,
          knowledge_base: form.knowledge_base,
          intervention_score_threshold: Number(form.intervention_score_threshold),
          challenge_weak_level5_evidence: form.challenge_weak_level5_evidence,
          require_measurable_outcomes_level5: form.require_measurable_outcomes_level5,
          require_multiple_examples_level5: form.require_multiple_examples_level5,
          suggest_star_format_improvements: form.suggest_star_format_improvements,
          auto_recommend_moderation_unsupported_5s: form.auto_recommend_moderation_unsupported_5s,
          auto_suggest_development_actions: form.auto_suggest_development_actions,
          behaviour_instructions: form.behaviour_instructions,
        },
      };

      // If setting active, deactivate all others first
      if (form.is_active) {
        const excludeId = editingConfig?.id ?? '00000000-0000-0000-0000-000000000000';
        await supabase
          .from('copilot_config')
          .update({ is_active: false })
          .neq('id', excludeId);
      }

      if (editingConfig) {
        const { error } = await supabase
          .from('copilot_config')
          .update(payload)
          .eq('id', editingConfig.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('copilot_config')
          .insert([payload]);
        if (error) throw error;
      }

      setToast({ type: 'success', message: `Configuration ${editingConfig ? 'updated' : 'created'} successfully.` });
      closeModal();
      await fetchConfigs();
    } catch (err) {
      console.error('Error saving Opal configuration:', err);
      setToast({ type: 'error', message: 'Failed to save configuration. Please try again.' });
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleActive(config: SeraConfig) {
    try {
      if (!config.is_active) {
        // Deactivate all, then activate this one
        await supabase.from('copilot_config').update({ is_active: false }).neq('id', config.id);
        const { error } = await supabase
          .from('copilot_config')
          .update({ is_active: true })
          .eq('id', config.id);
        if (error) throw error;
        setToast({ type: 'success', message: `"${config.name}" is now the active configuration.` });
      } else {
        const { error } = await supabase
          .from('copilot_config')
          .update({ is_active: false })
          .eq('id', config.id);
        if (error) throw error;
        setToast({ type: 'success', message: `"${config.name}" deactivated.` });
      }
      await fetchConfigs();
    } catch (err) {
      console.error('Error toggling active status:', err);
      setToast({ type: 'error', message: 'Failed to update configuration status.' });
    }
  }

  async function handleDelete(config: SeraConfig) {
    if (!confirm(`Delete "${config.name}"? This cannot be undone.`)) return;
    try {
      const { error } = await supabase
        .from('copilot_config')
        .delete()
        .eq('id', config.id);
      if (error) throw error;
      setToast({ type: 'success', message: `"${config.name}" deleted.` });
      await fetchConfigs();
    } catch (err) {
      console.error('Error deleting configuration:', err);
      setToast({ type: 'error', message: 'Failed to delete configuration.' });
    }
  }

  const fetchFeedbackLog = useCallback(async () => {
    setFeedbackLoading(true);
    try {
      const { data, error } = await supabase
        .from('sera_feedback_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      setFeedbackLog(data || []);
    } catch (err) {
      console.error('Error loading Opal feedback log:', err);
      setToast({ type: 'error', message: 'Failed to load feedback log.' });
    } finally {
      setFeedbackLoading(false);
    }
  }, []);

  async function handleAdminFeedback(entry: FeedbackLogEntry, feedback: 'helpful' | 'needs_improvement') {
    setSavingFeedbackId(entry.id);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from('sera_feedback_log')
        .update({
          admin_feedback: entry.admin_feedback === feedback ? null : feedback,
          admin_reviewed_at: new Date().toISOString(),
          admin_reviewed_by: user?.id ?? null,
        })
        .eq('id', entry.id);
      if (error) throw error;
      setFeedbackLog(prev => prev.map(e =>
        e.id === entry.id
          ? { ...e, admin_feedback: e.admin_feedback === feedback ? null : feedback, admin_reviewed_at: new Date().toISOString() }
          : e
      ));
    } catch (err) {
      console.error('Error saving admin feedback:', err);
      setToast({ type: 'error', message: 'Failed to save feedback.' });
    } finally {
      setSavingFeedbackId(null);
    }
  }

  async function handleSaveNotes(entryId: string) {
    setSavingFeedbackId(entryId);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from('sera_feedback_log')
        .update({
          admin_notes: notesDraft,
          admin_reviewed_at: new Date().toISOString(),
          admin_reviewed_by: user?.id ?? null,
        })
        .eq('id', entryId);
      if (error) throw error;
      setFeedbackLog(prev => prev.map(e =>
        e.id === entryId ? { ...e, admin_notes: notesDraft } : e
      ));
      setEditingNotesId(null);
      setNotesDraft('');
    } catch (err) {
      console.error('Error saving admin notes:', err);
      setToast({ type: 'error', message: 'Failed to save notes.' });
    } finally {
      setSavingFeedbackId(null);
    }
  }

  const filteredLog = feedbackLog.filter(e => {
    if (feedbackFilter === 'helpful') return e.admin_feedback === 'helpful';
    if (feedbackFilter === 'needs_improvement') return e.admin_feedback === 'needs_improvement';
    if (feedbackFilter === 'unreviewed') return e.admin_feedback === null;
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg text-sm font-medium transition-all ${
          toast.type === 'success' ? 'bg-green-50 border border-green-200 text-green-800' : 'bg-red-50 border border-red-200 text-red-800'
        }`}>
          {toast.type === 'success' ? <CheckCircle className="w-4 h-4 flex-shrink-0" /> : <X className="w-4 h-4 flex-shrink-0" />}
          {toast.message}
          <button onClick={() => setToast(null)} className="ml-2 opacity-60 hover:opacity-100">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Opal Configuration</h2>
          <p className="text-sm text-gray-600 mt-1">
            Configure the Opal AI assistant — model settings, system prompts, and behaviour thresholds
          </p>
        </div>
        {pageView === 'configs' && (
          <button
            onClick={openNew}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            New Configuration
          </button>
        )}
      </div>

      {/* Page-level tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-1">
          <button
            onClick={() => setPageView('configs')}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
              pageView === 'configs' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            <span className="flex items-center gap-2"><Bot className="w-4 h-4" />Configurations</span>
          </button>
          <button
            onClick={() => {
              setPageView('feedback-log');
              if (feedbackLog.length === 0) fetchFeedbackLog();
            }}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
              pageView === 'feedback-log' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            <span className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              Feedback Log
              {feedbackLog.filter(e => e.admin_feedback === null).length > 0 && (
                <span className="bg-amber-100 text-amber-700 text-xs px-1.5 py-0.5 rounded-full font-semibold">
                  {feedbackLog.filter(e => e.admin_feedback === null).length}
                </span>
              )}
            </span>
          </button>
        </nav>
      </div>

      {/* Config list */}
      {pageView === 'configs' && configs.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed border-gray-200 rounded-xl">
          <Bot className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p className="text-gray-500 font-medium">No configurations yet</p>
          <p className="text-sm text-gray-400 mt-1 mb-4">Create your first Opal configuration to get started</p>
          <button
            onClick={openNew}
            className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            New Configuration
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {configs.map(config => (
            <div
              key={config.id}
              className={`bg-white border-2 rounded-xl p-6 ${config.is_active ? 'border-green-400 bg-green-50/30' : 'border-gray-200'}`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4 flex-1 min-w-0">
                  <div className={`p-2.5 rounded-lg flex-shrink-0 ${config.is_active ? 'bg-green-100' : 'bg-gray-100'}`}>
                    <Bot className={`w-5 h-5 ${config.is_active ? 'text-green-600' : 'text-gray-500'}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-gray-900">{config.name}</h3>
                      {config.is_active && (
                        <span className="text-xs bg-green-600 text-white px-2 py-0.5 rounded font-medium">ACTIVE</span>
                      )}
                    </div>
                    {config.description && (
                      <p className="text-sm text-gray-500 mt-0.5">{config.description}</p>
                    )}
                    <div className="flex flex-wrap gap-2 mt-3">
                      <span className="text-xs bg-gray-100 text-gray-700 px-2.5 py-1 rounded-full">
                        {config.config_data?.model_name || 'No model'}
                      </span>
                      <span className="text-xs bg-gray-100 text-gray-700 px-2.5 py-1 rounded-full">
                        Temp {config.config_data?.temperature ?? '—'}
                      </span>
                      <span className="text-xs bg-gray-100 text-gray-700 px-2.5 py-1 rounded-full">
                        {config.config_data?.max_tokens ?? '—'} tokens
                      </span>
                      <span className="text-xs bg-gray-100 text-gray-700 px-2.5 py-1 rounded-full">
                        Intervention ≥{config.config_data?.intervention_score_threshold ?? config.ai_intervention_threshold ?? '—'}
                      </span>
                      {config.config_data?.auto_recommend_moderation_unsupported_5s && (
                        <span className="text-xs bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full">Auto-moderate 5s</span>
                      )}
                      {config.config_data?.challenge_weak_level5_evidence && (
                        <span className="text-xs bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full">Challenge L5</span>
                      )}
                      {config.config_data?.auto_suggest_development_actions && (
                        <span className="text-xs bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full">Auto-suggest dev</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => handleToggleActive(config)}
                    className={`p-2 rounded-lg transition-colors ${
                      config.is_active ? 'text-green-600 hover:bg-green-100' : 'text-gray-400 hover:bg-gray-100'
                    }`}
                    title={config.is_active ? 'Deactivate' : 'Set as active'}
                  >
                    {config.is_active ? <Power className="w-5 h-5" /> : <PowerOff className="w-5 h-5" />}
                  </button>
                  <button
                    onClick={() => openEdit(config)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors text-sm font-medium"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(config)}
                    disabled={config.is_active}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    title={config.is_active ? 'Cannot delete the active configuration' : 'Delete'}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Feedback Log view */}
      {pageView === 'feedback-log' && (
        <div className="space-y-4">
          {/* Summary stats + filter bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex gap-3 flex-wrap">
              <div className="text-center px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg">
                <p className="text-xs text-gray-500">Total</p>
                <p className="text-lg font-bold text-gray-900">{feedbackLog.length}</p>
              </div>
              <div className="text-center px-4 py-2 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-xs text-green-600">Helpful</p>
                <p className="text-lg font-bold text-green-700">{feedbackLog.filter(e => e.admin_feedback === 'helpful').length}</p>
              </div>
              <div className="text-center px-4 py-2 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-xs text-amber-600">Needs Improvement</p>
                <p className="text-lg font-bold text-amber-700">{feedbackLog.filter(e => e.admin_feedback === 'needs_improvement').length}</p>
              </div>
              <div className="text-center px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg">
                <p className="text-xs text-slate-500">Unreviewed</p>
                <p className="text-lg font-bold text-slate-600">{feedbackLog.filter(e => e.admin_feedback === null).length}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <select
                value={feedbackFilter}
                onChange={e => setFeedbackFilter(e.target.value as typeof feedbackFilter)}
                className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All entries</option>
                <option value="unreviewed">Unreviewed</option>
                <option value="helpful">Helpful</option>
                <option value="needs_improvement">Needs improvement</option>
              </select>
              <button
                onClick={fetchFeedbackLog}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium px-2 py-1.5"
              >
                Refresh
              </button>
            </div>
          </div>

          <p className="text-xs text-gray-500">
            Review Opal outputs and mark them as Helpful or Needs Improvement to guide future system prompt and knowledge base updates. No automatic retraining occurs.
          </p>

          {feedbackLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-blue-600" />
            </div>
          ) : filteredLog.length === 0 ? (
            <div className="text-center py-16 border-2 border-dashed border-gray-200 rounded-xl">
              <MessageSquare className="w-10 h-10 mx-auto mb-3 text-gray-300" />
              <p className="text-gray-500 font-medium">No log entries yet</p>
              <p className="text-sm text-gray-400 mt-1">
                {feedbackFilter === 'all'
                  ? 'Opal interactions will appear here once managers submit ratings of 4 or 5.'
                  : 'No entries match the current filter.'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredLog.map(entry => (
                <div key={entry.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                  {/* Entry header — always visible */}
                  <div
                    className="flex items-start justify-between gap-3 px-5 py-4 cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => setExpandedLogId(expandedLogId === entry.id ? null : entry.id)}
                  >
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                        entry.sera_response_valid ? 'bg-green-500' : 'bg-rose-500'
                      }`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className="font-medium text-sm text-gray-900">{entry.employee_name}</span>
                          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                            Rating {entry.rating}/5
                          </span>
                          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full capitalize">
                            {entry.rating_type}
                          </span>
                          {entry.manager_overrode && (
                            <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">Overridden</span>
                          )}
                          {entry.admin_feedback === 'helpful' && (
                            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                              <ThumbsUp className="w-3 h-3" /> Helpful
                            </span>
                          )}
                          {entry.admin_feedback === 'needs_improvement' && (
                            <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                              <ThumbsDown className="w-3 h-3" /> Needs improvement
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-400">
                          <Clock className="w-3 h-3" />
                          {new Date(entry.created_at).toLocaleString()}
                          <span>·</span>
                          <span className="truncate">{entry.item_name}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {/* Quick feedback buttons */}
                      <button
                        onClick={e => { e.stopPropagation(); handleAdminFeedback(entry, 'helpful'); }}
                        disabled={savingFeedbackId === entry.id}
                        className={`p-1.5 rounded-lg transition-colors ${
                          entry.admin_feedback === 'helpful'
                            ? 'bg-green-100 text-green-700'
                            : 'text-gray-400 hover:bg-green-50 hover:text-green-600'
                        }`}
                        title="Mark as helpful"
                      >
                        <ThumbsUp className="w-4 h-4" />
                      </button>
                      <button
                        onClick={e => { e.stopPropagation(); handleAdminFeedback(entry, 'needs_improvement'); }}
                        disabled={savingFeedbackId === entry.id}
                        className={`p-1.5 rounded-lg transition-colors ${
                          entry.admin_feedback === 'needs_improvement'
                            ? 'bg-amber-100 text-amber-700'
                            : 'text-gray-400 hover:bg-amber-50 hover:text-amber-600'
                        }`}
                        title="Mark as needs improvement"
                      >
                        <ThumbsDown className="w-4 h-4" />
                      </button>
                      {expandedLogId === entry.id ? (
                        <ChevronUp className="w-4 h-4 text-gray-400 ml-1" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-gray-400 ml-1" />
                      )}
                    </div>
                  </div>

                  {/* Expanded detail */}
                  {expandedLogId === entry.id && (
                    <div className="border-t border-gray-100 px-5 py-4 space-y-4 bg-gray-50/50">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Manager Input</p>
                          <p className="text-sm text-gray-800 bg-white border border-gray-200 rounded-lg p-3 whitespace-pre-wrap">
                            {entry.manager_input || <span className="text-gray-400 italic">No input recorded</span>}
                          </p>
                        </div>
                        <div className="space-y-3">
                          <div>
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Opal Response</p>
                            <div className={`text-sm rounded-lg p-3 border ${
                              entry.sera_response_valid
                                ? 'bg-green-50 border-green-200 text-green-800'
                                : 'bg-rose-50 border-rose-200 text-rose-800'
                            }`}>
                              <p className="font-medium mb-1">
                                {entry.sera_response_valid ? 'Justification valid' : 'More detail needed'}
                                {entry.sera_confidence && (
                                  <span className="ml-2 text-xs opacity-70">({entry.sera_confidence} confidence)</span>
                                )}
                              </p>
                              <p className="text-xs">{entry.sera_message}</p>
                            </div>
                          </div>
                          {entry.sera_prompt && (
                            <div>
                              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Opal Suggestion</p>
                              <p className="text-sm text-blue-800 bg-blue-50 border border-blue-200 rounded-lg p-3">{entry.sera_prompt}</p>
                            </div>
                          )}
                          {entry.sera_summary && (
                            <div>
                              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Moderation Summary</p>
                              <p className="text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded-lg p-3">{entry.sera_summary}</p>
                            </div>
                          )}
                          {entry.manager_overrode && entry.override_reason && (
                            <div>
                              <p className="text-xs font-semibold text-amber-600 uppercase tracking-wide mb-1.5">Override Reason</p>
                              <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-3">{entry.override_reason}</p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Admin notes */}
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Admin Notes</p>
                          {editingNotesId !== entry.id && (
                            <button
                              onClick={() => { setEditingNotesId(entry.id); setNotesDraft(entry.admin_notes || ''); }}
                              className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                            >
                              {entry.admin_notes ? 'Edit notes' : 'Add notes'}
                            </button>
                          )}
                        </div>
                        {editingNotesId === entry.id ? (
                          <div>
                            <textarea
                              value={notesDraft}
                              onChange={e => setNotesDraft(e.target.value)}
                              rows={3}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 resize-none"
                              placeholder="Notes for improving the system prompt or knowledge base..."
                              autoFocus
                            />
                            <div className="flex gap-2 mt-2">
                              <button
                                onClick={() => handleSaveNotes(entry.id)}
                                disabled={savingFeedbackId === entry.id}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 disabled:opacity-60"
                              >
                                <Save className="w-3.5 h-3.5" />
                                {savingFeedbackId === entry.id ? 'Saving...' : 'Save Notes'}
                              </button>
                              <button
                                onClick={() => { setEditingNotesId(null); setNotesDraft(''); }}
                                className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-xs font-medium hover:bg-gray-200"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <p className="text-sm text-gray-600 bg-white border border-gray-200 rounded-lg p-3 min-h-[2.5rem]">
                            {entry.admin_notes || <span className="text-gray-400 italic">No notes yet</span>}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col">
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 flex-shrink-0">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingConfig ? `Edit — ${editingConfig.name}` : 'New Opal Configuration'}
              </h3>
              <button onClick={closeModal} className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tab bar */}
            <div className="flex gap-1 px-6 pt-4 border-b border-gray-200 flex-shrink-0">
              {([
                { key: 'llm', label: 'LLM Settings' },
                { key: 'prompts', label: 'System Prompt & Knowledge Base' },
                { key: 'behaviour', label: 'Behaviour' },
              ] as const).map(tab => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
                    activeTab === tab.key
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-800'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <form onSubmit={handleSave} className="flex flex-col flex-1 min-h-0">
              <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

                {/* Identity fields always visible */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Configuration Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={form.name}
                      onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                      placeholder="e.g. Production v1"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <input
                      type="text"
                      value={form.description}
                      onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                      placeholder="Short description of this configuration"
                    />
                  </div>
                </div>

                {/* LLM Settings tab */}
                {activeTab === 'llm' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Model Name <span className="text-red-500">*</span></label>
                        <input
                          type="text"
                          value={form.model_name}
                          onChange={e => setForm(f => ({ ...f, model_name: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                          placeholder="gpt-4"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Max Tokens <span className="text-red-500">*</span></label>
                        <input
                          type="number"
                          value={form.max_tokens}
                          onChange={e => setForm(f => ({ ...f, max_tokens: parseInt(e.target.value) || 0 }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                          min="1"
                          required
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Temperature</label>
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          max="2"
                          value={form.temperature}
                          onChange={e => setForm(f => ({ ...f, temperature: parseFloat(e.target.value) || 0 }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Top P</label>
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          max="1"
                          value={form.top_p}
                          onChange={e => setForm(f => ({ ...f, top_p: parseFloat(e.target.value) || 0 }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Freq Penalty</label>
                        <input
                          type="number"
                          step="0.1"
                          min="-2"
                          max="2"
                          value={form.frequency_penalty}
                          onChange={e => setForm(f => ({ ...f, frequency_penalty: parseFloat(e.target.value) || 0 }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Pres Penalty</label>
                        <input
                          type="number"
                          step="0.1"
                          min="-2"
                          max="2"
                          value={form.presence_penalty}
                          onChange={e => setForm(f => ({ ...f, presence_penalty: parseFloat(e.target.value) || 0 }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Prompts tab */}
                {activeTab === 'prompts' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        System Prompt <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        value={form.system_prompt}
                        onChange={e => setForm(f => ({ ...f, system_prompt: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm font-mono"
                        rows={10}
                        placeholder="You are Opal, an AI Growth Guide for Evolo..."
                        required
                      />
                      <p className="text-xs text-gray-500 mt-1">Defines Opal's core identity, tone and behavioural boundaries.</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Knowledge Base</label>
                      <textarea
                        value={form.knowledge_base}
                        onChange={e => setForm(f => ({ ...f, knowledge_base: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                        rows={10}
                        placeholder="Additional context, coaching methodologies, example conversations, organisation-specific guidance..."
                      />
                      <p className="text-xs text-gray-500 mt-1">Supplementary knowledge Opal can draw on during coaching sessions.</p>
                    </div>
                  </div>
                )}

                {/* Behaviour tab */}
                {activeTab === 'behaviour' && (
                  <div className="space-y-6">

                    {/* Thresholds row */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Intervention Score Threshold
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="5"
                          value={form.intervention_score_threshold}
                          onChange={e => setForm(f => ({ ...f, intervention_score_threshold: parseInt(e.target.value) || 4 }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                        />
                        <p className="text-xs text-gray-500 mt-1">Rating score (1–5) at which Opal flags evidence for review. Default: 4.</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          AI Intervention Threshold
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="10"
                          value={form.ai_intervention_threshold}
                          onChange={e => setForm(f => ({ ...f, ai_intervention_threshold: parseInt(e.target.value) || 1 }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                        />
                        <p className="text-xs text-gray-500 mt-1">Internal score (1–10) controlling Opal proactive support. Default: 3.</p>
                      </div>
                    </div>

                    {/* Level 5 evidence toggles */}
                    <div>
                      <p className="text-sm font-semibold text-gray-800 mb-3">Level 5 Evidence Standards</p>
                      <div className="space-y-3">
                        {([
                          { key: 'challenge_weak_level5_evidence',             label: 'Challenge weak level 5 evidence',               desc: 'Opal prompts reviewers to justify vague or unsupported level 5 ratings.' },
                          { key: 'require_measurable_outcomes_level5',         label: 'Require measurable outcomes for level 5',        desc: 'Level 5 ratings must include specific, measurable impact examples.' },
                          { key: 'require_multiple_examples_level5',           label: 'Require multiple examples for level 5',          desc: 'A single example is not sufficient evidence for a level 5 rating.' },
                          { key: 'suggest_star_format_improvements',           label: 'Suggest STAR format improvements',               desc: 'Opal recommends structuring evidence using Situation, Task, Action, Result.' },
                          { key: 'auto_recommend_moderation_unsupported_5s',   label: 'Auto recommend moderation for unsupported 5s',   desc: 'Automatically flags level 5 ratings without strong evidence for moderation review.' },
                        ] as const).map(({ key, label, desc }) => (
                          <label key={key} className="flex items-start gap-3 cursor-pointer p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
                            <div className="relative mt-0.5 flex-shrink-0">
                              <input
                                type="checkbox"
                                checked={form[key]}
                                onChange={e => setForm(f => ({ ...f, [key]: e.target.checked }))}
                                className="sr-only"
                              />
                              <div className={`w-9 h-5 rounded-full transition-colors ${form[key] ? 'bg-blue-600' : 'bg-gray-300'}`} />
                              <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${form[key] ? 'left-4' : 'left-0.5'}`} />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-800">{label}</p>
                              <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Development actions toggle */}
                    <div>
                      <p className="text-sm font-semibold text-gray-800 mb-3">Development & Coaching</p>
                      <label className="flex items-start gap-3 cursor-pointer p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
                        <div className="relative mt-0.5 flex-shrink-0">
                          <input
                            type="checkbox"
                            checked={form.auto_suggest_development_actions}
                            onChange={e => setForm(f => ({ ...f, auto_suggest_development_actions: e.target.checked }))}
                            className="sr-only"
                          />
                          <div className={`w-9 h-5 rounded-full transition-colors ${form.auto_suggest_development_actions ? 'bg-blue-600' : 'bg-gray-300'}`} />
                          <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.auto_suggest_development_actions ? 'left-4' : 'left-0.5'}`} />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-800">Auto suggest development actions</p>
                          <p className="text-xs text-gray-500 mt-0.5">Opal proactively recommends next development steps without waiting to be asked.</p>
                        </div>
                      </label>
                    </div>

                    {/* Behaviour instructions */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-800 mb-1">
                        Behaviour Instructions
                      </label>
                      <p className="text-xs text-gray-500 mb-2">
                        Lightweight behavioural rules Opal follows. Add one instruction per line. These supplement the system prompt without replacing it.
                      </p>
                      <textarea
                        value={form.behaviour_instructions}
                        onChange={e => setForm(f => ({ ...f, behaviour_instructions: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                        rows={6}
                        placeholder={`Examples:\n• Challenge vague level 5 evidence\n• Encourage measurable impact examples\n• Remind managers that 5s enter moderation\n• Keep responses direct and constructive`}
                      />
                    </div>

                  </div>
                )}

                {/* Set as active checkbox */}
                <div className="flex items-center gap-3 pt-2 border-t border-gray-100">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={form.is_active}
                    onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="is_active" className="text-sm font-medium text-gray-700">
                    Set as active configuration
                    <span className="text-xs text-gray-400 ml-1">(only one configuration can be active at a time)</span>
                  </label>
                </div>
              </div>

              {/* Modal footer */}
              <div className="flex gap-3 px-6 py-4 border-t border-gray-200 flex-shrink-0">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm disabled:opacity-60"
                >
                  <Save className="w-4 h-4" />
                  {saving ? 'Saving...' : editingConfig ? 'Update Configuration' : 'Create Configuration'}
                </button>
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={saving}
                  className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-lg hover:bg-gray-200 transition-colors font-medium text-sm"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
