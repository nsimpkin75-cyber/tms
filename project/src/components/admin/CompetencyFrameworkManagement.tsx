import React, { useState, useEffect } from 'react';
import { Plus, CreditCard as Edit2, Trash2, Award, Power, PowerOff } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useLanguage } from '../../contexts/LanguageContext';

interface Competency {
  id: string;
  value_id: string;
  title: string;
  description: string;
  emoji?: string;
  sort_order: number;
  is_active: boolean;
  competency_statement?: string;
  employee_evidence_prompt?: string;
  employee_what_good_looks_like?: string;
  employee_what_great_looks_like?: string;
  manager_evidence_prompt?: string;
  manager_what_good_looks_like?: string;
  manager_what_great_looks_like?: string;
  senior_leader_evidence_prompt?: string;
  senior_leader_what_good_looks_like?: string;
  senior_leader_what_great_looks_like?: string;
}

interface Value {
  id: string;
  title: string;
  statement: string;
  emoji?: string;
  sort_order: number;
  is_active: boolean;
  competencies?: Competency[];
}

const EMPTY_COMPETENCY_FORM = {
  title: '',
  description: '',
  emoji: '',
  sort_order: 0,
  is_active: true,
  competency_statement: '',
  employee_evidence_prompt: '',
  employee_what_good_looks_like: '',
  employee_what_great_looks_like: '',
  manager_evidence_prompt: '',
  manager_what_good_looks_like: '',
  manager_what_great_looks_like: '',
  senior_leader_evidence_prompt: '',
  senior_leader_what_good_looks_like: '',
  senior_leader_what_great_looks_like: '',
};

export default function CompetencyFrameworkManagement() {
  const { t } = useLanguage();
  const [values, setValues] = useState<Value[]>([]);
  const [selectedValue, setSelectedValue] = useState<Value | null>(null);
  const [selectedCompetency, setSelectedCompetency] = useState<Competency | null>(null);
  const [loading, setLoading] = useState(true);
  const [showValueModal, setShowValueModal] = useState(false);
  const [showCompetencyModal, setShowCompetencyModal] = useState(false);
  const [showDescriptionModal, setShowDescriptionModal] = useState(false);
  const [editingValue, setEditingValue] = useState<Value | null>(null);
  const [editingCompetency, setEditingCompetency] = useState<Competency | null>(null);
  const [frameworkDescription, setFrameworkDescription] = useState('');
  const [tempDescription, setTempDescription] = useState('');

  const [valueForm, setValueForm] = useState({
    title: '',
    statement: '',
    emoji: '',
    sort_order: 0,
    is_active: true,
  });

  const [competencyForm, setCompetencyForm] = useState({ ...EMPTY_COMPETENCY_FORM });

  useEffect(() => {
    fetchValues();
    fetchFrameworkDescription();
  }, []);

  const fetchFrameworkDescription = async () => {
    try {
      const { data } = await supabase
        .from('competency_frameworks')
        .select('description')
        .maybeSingle();
      if (data) setFrameworkDescription(data.description || '');
    } catch (error) {
      console.error('Error fetching framework description:', error);
    }
  };

  const updateFrameworkDescription = async () => {
    try {
      const { data: framework } = await supabase
        .from('competency_frameworks')
        .select('id')
        .maybeSingle();
      if (!framework) throw new Error('No competency framework found');
      const { error } = await supabase
        .from('competency_frameworks')
        .update({ description: tempDescription })
        .eq('id', framework.id);
      if (error) throw error;
      setFrameworkDescription(tempDescription);
      setShowDescriptionModal(false);
    } catch (error) {
      console.error('Error updating framework description:', error);
      alert('Failed to update framework description');
    }
  };

  const fetchValues = async () => {
    try {
      setLoading(true);
      const { data: valuesData, error: valuesError } = await supabase
        .from('values')
        .select('*')
        .order('sort_order');

      if (valuesError) throw valuesError;

      const valuesWithCompetencies = await Promise.all(
        (valuesData || []).map(async (value) => {
          const { data: competenciesData } = await supabase
            .from('competencies')
            .select('*')
            .eq('value_id', value.id)
            .order('sort_order');

          return { ...value, competencies: competenciesData || [] };
        })
      );

      setValues(valuesWithCompetencies);
      if (valuesWithCompetencies.length > 0) {
        if (!selectedValue) {
          setSelectedValue(valuesWithCompetencies[0]);
        } else {
          const updated = valuesWithCompetencies.find(v => v.id === selectedValue.id);
          if (updated) setSelectedValue(updated);
        }
      }
    } catch (error) {
      console.error('Error fetching values:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveValue = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingValue) {
        const { error } = await supabase.from('values').update(valueForm).eq('id', editingValue.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('values').insert([valueForm]);
        if (error) throw error;
      }
      setShowValueModal(false);
      setEditingValue(null);
      resetValueForm();
      fetchValues();
    } catch (error) {
      console.error('Error saving value:', error);
      alert('Failed to save value');
    }
  };

  const handleToggleValueActive = async (value: Value) => {
    try {
      const { error } = await supabase.from('values').update({ is_active: !value.is_active }).eq('id', value.id);
      if (error) throw error;
      fetchValues();
    } catch (error) {
      console.error('Error toggling value:', error);
    }
  };

  const handleDeleteValue = async (id: string) => {
    if (!confirm(t.competency.deleteValueConfirm)) return;
    try {
      const { error } = await supabase.from('values').delete().eq('id', id);
      if (error) throw error;
      if (selectedValue?.id === id) setSelectedValue(values[0] || null);
      fetchValues();
    } catch (error) {
      console.error('Error deleting value:', error);
      alert('Failed to delete value');
    }
  };

  const handleSaveCompetency = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedValue) return;

    try {
      const dataToSave = {
        title: competencyForm.title,
        description: competencyForm.description,
        emoji: competencyForm.emoji,
        sort_order: competencyForm.sort_order,
        is_active: competencyForm.is_active,
        value_id: selectedValue.id,
        competency_statement: competencyForm.competency_statement,
        employee_evidence_prompt: competencyForm.employee_evidence_prompt,
        employee_what_good_looks_like: competencyForm.employee_what_good_looks_like,
        employee_what_great_looks_like: competencyForm.employee_what_great_looks_like,
        manager_evidence_prompt: competencyForm.manager_evidence_prompt,
        manager_what_good_looks_like: competencyForm.manager_what_good_looks_like,
        manager_what_great_looks_like: competencyForm.manager_what_great_looks_like,
        senior_leader_evidence_prompt: competencyForm.senior_leader_evidence_prompt,
        senior_leader_what_good_looks_like: competencyForm.senior_leader_what_good_looks_like,
        senior_leader_what_great_looks_like: competencyForm.senior_leader_what_great_looks_like,
      };

      if (editingCompetency) {
        const { error } = await supabase.from('competencies').update(dataToSave).eq('id', editingCompetency.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('competencies').insert([dataToSave]);
        if (error) throw error;
      }

      setShowCompetencyModal(false);
      setEditingCompetency(null);
      resetCompetencyForm();
      fetchValues();
    } catch (error) {
      console.error('Error saving competency:', error);
      alert('Failed to save competency');
    }
  };

  const handleToggleCompetencyActive = async (competency: Competency) => {
    try {
      const { error } = await supabase.from('competencies').update({ is_active: !competency.is_active }).eq('id', competency.id);
      if (error) throw error;
      fetchValues();
    } catch (error) {
      console.error('Error toggling competency:', error);
    }
  };

  const handleDeleteCompetency = async (id: string) => {
    if (!confirm(t.competency.deleteCompetencyConfirm)) return;
    try {
      const { error } = await supabase.from('competencies').delete().eq('id', id);
      if (error) throw error;
      if (selectedCompetency?.id === id) setSelectedCompetency(null);
      fetchValues();
    } catch (error) {
      console.error('Error deleting competency:', error);
      alert('Failed to delete competency');
    }
  };

  const openEditValueModal = (value: Value) => {
    setEditingValue(value);
    setValueForm({
      title: value.title,
      statement: value.statement,
      emoji: value.emoji || '',
      sort_order: value.sort_order,
      is_active: value.is_active,
    });
    setShowValueModal(true);
  };

  const openEditCompetencyModal = (competency: Competency) => {
    setEditingCompetency(competency);
    setCompetencyForm({
      title: competency.title,
      description: competency.description,
      emoji: competency.emoji || '',
      sort_order: competency.sort_order,
      is_active: competency.is_active,
      competency_statement: competency.competency_statement || '',
      employee_evidence_prompt: competency.employee_evidence_prompt || '',
      employee_what_good_looks_like: competency.employee_what_good_looks_like || '',
      employee_what_great_looks_like: competency.employee_what_great_looks_like || '',
      manager_evidence_prompt: competency.manager_evidence_prompt || '',
      manager_what_good_looks_like: competency.manager_what_good_looks_like || '',
      manager_what_great_looks_like: competency.manager_what_great_looks_like || '',
      senior_leader_evidence_prompt: competency.senior_leader_evidence_prompt || '',
      senior_leader_what_good_looks_like: competency.senior_leader_what_good_looks_like || '',
      senior_leader_what_great_looks_like: competency.senior_leader_what_great_looks_like || '',
    });
    setShowCompetencyModal(true);
  };

  const resetValueForm = () => {
    setValueForm({ title: '', statement: '', emoji: '', sort_order: 0, is_active: true });
  };

  const resetCompetencyForm = () => {
    setCompetencyForm({ ...EMPTY_COMPETENCY_FORM });
  };

  if (loading) {
    return <div className="text-center py-8">{t.common.loading}</div>;
  }

  const LEVEL_SECTIONS = [
    {
      key: 'employee',
      label: 'Employee',
      color: 'blue',
      fields: [
        { key: 'employee_evidence_prompt', label: 'Evidence Prompt', placeholder: 'What evidence should an employee provide?' },
        { key: 'employee_what_good_looks_like', label: 'What Good Looks Like', placeholder: 'Describe good performance for this competency at Employee level...' },
        { key: 'employee_what_great_looks_like', label: 'What Great Looks Like', placeholder: 'Describe great/exceptional performance at Employee level...' },
      ],
    },
    {
      key: 'manager',
      label: 'Manager',
      color: 'teal',
      fields: [
        { key: 'manager_evidence_prompt', label: 'Evidence Prompt', placeholder: 'What evidence should a manager provide?' },
        { key: 'manager_what_good_looks_like', label: 'What Good Looks Like', placeholder: 'Describe good performance for this competency at Manager level...' },
        { key: 'manager_what_great_looks_like', label: 'What Great Looks Like', placeholder: 'Describe great/exceptional performance at Manager level...' },
      ],
    },
    {
      key: 'senior_leader',
      label: 'Senior Leader',
      color: 'slate',
      fields: [
        { key: 'senior_leader_evidence_prompt', label: 'Evidence Prompt', placeholder: 'What evidence should a senior leader provide?' },
        { key: 'senior_leader_what_good_looks_like', label: 'What Good Looks Like', placeholder: 'Describe good performance for this competency at Senior Leader level...' },
        { key: 'senior_leader_what_great_looks_like', label: 'What Great Looks Like', placeholder: 'Describe great/exceptional performance at Senior Leader level...' },
      ],
    },
  ];

  return (
    <div>
      <div className="flex justify-between items-start mb-6">
        <div className="flex-1 mr-4">
          <h2 className="text-xl font-semibold text-gray-900">{t.competency.title}</h2>
          <div className="mt-2 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start justify-between">
              <p className="text-sm text-gray-700 flex-1">{frameworkDescription}</p>
              <button
                onClick={() => {
                  setTempDescription(frameworkDescription);
                  setShowDescriptionModal(true);
                }}
                className="ml-4 text-blue-600 hover:text-blue-900 flex-shrink-0"
              >
                <Edit2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
        <button
          onClick={() => {
            setEditingValue(null);
            resetValueForm();
            setValueForm(prev => ({ ...prev, sort_order: values.length + 1 }));
            setShowValueModal(true);
          }}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex-shrink-0"
        >
          <Plus className="w-5 h-5" />
          {t.competency.newValue}
        </button>
      </div>

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-4">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <h3 className="font-semibold text-gray-900 mb-3">Values</h3>
            <div className="space-y-2">
              {values.map((value) => (
                <div
                  key={value.id}
                  className={`p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                    selectedValue?.id === value.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => { setSelectedValue(value); setSelectedCompetency(null); }}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        {value.emoji && <span className="text-2xl">{value.emoji}</span>}
                        <h4 className="font-semibold text-gray-900 text-sm">{value.title}</h4>
                      </div>
                      <p className="text-xs text-gray-600 mt-1 line-clamp-2">{value.statement}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {value.competencies?.length || 0} {t.competency.competenciesCount}
                      </p>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleToggleValueActive(value); }}
                      className={`p-1 rounded transition-colors ${value.is_active ? 'text-green-600 hover:bg-green-100' : 'text-gray-400 hover:bg-gray-100'}`}
                    >
                      {value.is_active ? <Power className="w-4 h-4" /> : <PowerOff className="w-4 h-4" />}
                    </button>
                  </div>
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={(e) => { e.stopPropagation(); openEditValueModal(value); }}
                      className="text-blue-600 hover:text-blue-900 text-xs"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeleteValue(value.id); }}
                      className="text-red-600 hover:text-red-900 text-xs"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="col-span-8">
          {selectedValue ? (
            <div className="space-y-4">
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      {selectedValue.emoji && <span className="text-2xl">{selectedValue.emoji}</span>}
                      <h3 className="text-lg font-semibold text-gray-900">{selectedValue.title}</h3>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{selectedValue.statement}</p>
                  </div>
                  <button
                    onClick={() => {
                      setEditingCompetency(null);
                      resetCompetencyForm();
                      setCompetencyForm(prev => ({ ...prev, sort_order: (selectedValue.competencies?.length || 0) + 1 }));
                      setShowCompetencyModal(true);
                    }}
                    className="flex items-center gap-2 bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm"
                  >
                    <Plus className="w-4 h-4" />
                    {t.competency.addCompetency}
                  </button>
                </div>

                <div className="space-y-3 mt-4">
                  {selectedValue.competencies?.map((competency) => (
                    <div
                      key={competency.id}
                      className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                        selectedCompetency?.id === competency.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => setSelectedCompetency(competency)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            {competency.emoji ? <span className="text-lg">{competency.emoji}</span> : <Award className="w-4 h-4 text-blue-600" />}
                            <h4 className="font-semibold text-gray-900">{competency.title}</h4>
                            {!competency.is_active && (
                              <span className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded">Inactive</span>
                            )}
                          </div>
                          {competency.competency_statement && (
                            <p className="text-sm text-gray-600 mt-1 ml-6 line-clamp-2">{competency.competency_statement}</p>
                          )}
                          <div className="flex gap-3 mt-2 ml-6">
                            {competency.employee_evidence_prompt && (
                              <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded border border-blue-200">Employee</span>
                            )}
                            {competency.manager_evidence_prompt && (
                              <span className="text-xs bg-teal-50 text-teal-600 px-2 py-0.5 rounded border border-teal-200">Manager</span>
                            )}
                            {competency.senior_leader_evidence_prompt && (
                              <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded border border-slate-200">Senior Leader</span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                          <button
                            onClick={(e) => { e.stopPropagation(); handleToggleCompetencyActive(competency); }}
                            className={`p-1 rounded transition-colors ${competency.is_active ? 'text-green-600 hover:bg-green-100' : 'text-gray-400 hover:bg-gray-100'}`}
                          >
                            {competency.is_active ? <Power className="w-4 h-4" /> : <PowerOff className="w-4 h-4" />}
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); openEditCompetencyModal(competency); }}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDeleteCompetency(competency.id); }}
                            className="text-red-600 hover:text-red-900"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}

                  {(!selectedValue.competencies || selectedValue.competencies.length === 0) && (
                    <div className="text-center py-8 text-gray-500">
                      <Award className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                      <p>{t.competency.noCompetencies}</p>
                    </div>
                  )}
                </div>
              </div>

              {selectedCompetency && (
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <div className="mb-4">
                    <h4 className="font-semibold text-gray-900">Competency Detail</h4>
                    <p className="text-sm text-gray-600 mt-1">{selectedCompetency.title}</p>
                  </div>

                  {selectedCompetency.competency_statement && (
                    <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <p className="text-xs font-semibold text-gray-600 mb-1">Competency Statement</p>
                      <p className="text-sm text-gray-700">{selectedCompetency.competency_statement}</p>
                    </div>
                  )}

                  <div className="space-y-4">
                    {LEVEL_SECTIONS.map(section => {
                      const evidenceKey = `${section.key}_evidence_prompt` as keyof Competency;
                      const goodKey = `${section.key}_what_good_looks_like` as keyof Competency;
                      const greatKey = `${section.key}_what_great_looks_like` as keyof Competency;
                      const hasContent = selectedCompetency[evidenceKey] || selectedCompetency[goodKey] || selectedCompetency[greatKey];
                      if (!hasContent) return null;

                      const colorMap: Record<string, string> = {
                        blue: 'bg-blue-50 border-blue-200 text-blue-800',
                        teal: 'bg-teal-50 border-teal-200 text-teal-800',
                        slate: 'bg-slate-50 border-slate-200 text-slate-800',
                      };

                      return (
                        <div key={section.key} className={`rounded-lg border p-4 ${colorMap[section.color]}`}>
                          <p className="text-xs font-semibold uppercase tracking-wide mb-3">{section.label}</p>
                          {selectedCompetency[evidenceKey] && (
                            <div className="mb-2">
                              <p className="text-xs font-medium mb-0.5">Evidence Prompt</p>
                              <p className="text-sm">{selectedCompetency[evidenceKey] as string}</p>
                            </div>
                          )}
                          {selectedCompetency[goodKey] && (
                            <div className="mb-2">
                              <p className="text-xs font-medium mb-0.5">What Good Looks Like</p>
                              <p className="text-sm">{selectedCompetency[goodKey] as string}</p>
                            </div>
                          )}
                          {selectedCompetency[greatKey] && (
                            <div>
                              <p className="text-xs font-medium mb-0.5">What Great Looks Like</p>
                              <p className="text-sm">{selectedCompetency[greatKey] as string}</p>
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {!selectedCompetency.employee_evidence_prompt && !selectedCompetency.manager_evidence_prompt && !selectedCompetency.senior_leader_evidence_prompt && (
                      <p className="text-sm text-gray-400 text-center py-4">No level descriptions added yet. Click edit to add content.</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
              <Award className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <p className="text-gray-600">{t.competency.selectValue}</p>
            </div>
          )}
        </div>
      </div>

      {showValueModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full">
            <h3 className="text-lg font-semibold mb-4">{editingValue ? t.competency.editValue : t.competency.newValue}</h3>
            <form onSubmit={handleSaveValue}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t.competency.emoji} ({t.common.optional})</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={valueForm.emoji}
                      onChange={(e) => setValueForm({ ...valueForm, emoji: e.target.value })}
                      className="w-20 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-center text-2xl"
                      placeholder="😊"
                      maxLength={2}
                    />
                    <div className="flex flex-wrap gap-2">
                      {['⭐', '🎯', '💡', '🚀', '💼', '🤝', '💪', '🎨', '🔧', '📊', '🌟', '✨', '🏆', '💎', '🎓', '🌈', '🔥', '💯', '👍', '🙌', '❤️', '💚', '🧠', '👥', '🌍', '🔑', '⚡', '🌱', '🎁'].map((emoji) => (
                        <button key={emoji} type="button" onClick={() => setValueForm({ ...valueForm, emoji })} className="text-2xl hover:bg-gray-100 p-1 rounded">{emoji}</button>
                      ))}
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t.competency.valueTitle}</label>
                  <input type="text" value={valueForm.title} onChange={(e) => setValueForm({ ...valueForm, title: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t.competency.valueStatement}</label>
                  <textarea value={valueForm.statement} onChange={(e) => setValueForm({ ...valueForm, statement: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" rows={3} required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t.competency.sortOrder}</label>
                  <input type="number" value={valueForm.sort_order} onChange={(e) => setValueForm({ ...valueForm, sort_order: parseInt(e.target.value) })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
                </div>
                <div className="flex items-center">
                  <input type="checkbox" id="value_active" checked={valueForm.is_active} onChange={(e) => setValueForm({ ...valueForm, is_active: e.target.checked })} className="w-4 h-4 text-blue-600 border-gray-300 rounded" />
                  <label htmlFor="value_active" className="ml-2 text-sm font-medium text-gray-700">{t.common.active}</label>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button type="submit" className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700">{editingValue ? t.common.update : t.common.create}</button>
                <button type="button" onClick={() => { setShowValueModal(false); setEditingValue(null); resetValueForm(); }} className="flex-1 bg-gray-200 text-gray-800 py-2 rounded-lg hover:bg-gray-300">{t.common.cancel}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showCompetencyModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full my-8">
            <h3 className="text-lg font-semibold mb-4">{editingCompetency ? t.competency.editCompetency : t.competency.newCompetency}</h3>
            <form onSubmit={handleSaveCompetency}>
              <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t.competency.competencyTitle}</label>
                    <input type="text" value={competencyForm.title} onChange={(e) => setCompetencyForm({ ...competencyForm, title: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t.competency.emoji} ({t.common.optional})</label>
                    <div className="flex items-center gap-2">
                      <input type="text" value={competencyForm.emoji} onChange={(e) => setCompetencyForm({ ...competencyForm, emoji: e.target.value })} className="w-20 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-center text-2xl" placeholder="😊" maxLength={2} />
                      <div className="flex flex-wrap gap-1">
                        {['💬', '🎓', '🧠', '👥', '📈', '🎯', '🤝', '💪', '🔧', '🎨', '📊', '💡', '🚀', '⭐', '✨', '🏆'].map((emoji) => (
                          <button key={emoji} type="button" onClick={() => setCompetencyForm({ ...competencyForm, emoji })} className="text-xl hover:bg-gray-100 p-1 rounded">{emoji}</button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Competency Statement</label>
                  <textarea
                    value={competencyForm.competency_statement}
                    onChange={(e) => setCompetencyForm({ ...competencyForm, competency_statement: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    rows={2}
                    placeholder="Overall statement describing this competency..."
                  />
                </div>

                {LEVEL_SECTIONS.map(section => {
                  const colorBorderMap: Record<string, string> = {
                    blue: 'border-blue-300 bg-blue-50',
                    teal: 'border-teal-300 bg-teal-50',
                    slate: 'border-slate-300 bg-slate-50',
                  };
                  const evidenceKey = `${section.key}_evidence_prompt` as keyof typeof competencyForm;
                  const goodKey = `${section.key}_what_good_looks_like` as keyof typeof competencyForm;
                  const greatKey = `${section.key}_what_great_looks_like` as keyof typeof competencyForm;

                  return (
                    <div key={section.key} className={`border-2 rounded-lg p-4 ${colorBorderMap[section.color]}`}>
                      <h4 className="text-sm font-semibold text-gray-900 mb-3">{section.label}</h4>
                      <div className="space-y-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Evidence Prompt</label>
                          <textarea
                            value={competencyForm[evidenceKey] as string}
                            onChange={(e) => setCompetencyForm({ ...competencyForm, [evidenceKey]: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
                            rows={2}
                            placeholder={`What evidence should a ${section.label.toLowerCase()} provide?`}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">What Good Looks Like</label>
                          <textarea
                            value={competencyForm[goodKey] as string}
                            onChange={(e) => setCompetencyForm({ ...competencyForm, [goodKey]: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
                            rows={2}
                            placeholder="Describe good performance at this level..."
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">What Great Looks Like</label>
                          <textarea
                            value={competencyForm[greatKey] as string}
                            onChange={(e) => setCompetencyForm({ ...competencyForm, [greatKey]: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
                            rows={2}
                            placeholder="Describe great/exceptional performance at this level..."
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}

                <div className="grid grid-cols-2 gap-4 border-t pt-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t.competency.sortOrder}</label>
                    <input type="number" value={competencyForm.sort_order} onChange={(e) => setCompetencyForm({ ...competencyForm, sort_order: parseInt(e.target.value) || 0 })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" min="0" />
                  </div>
                  <div className="flex items-center">
                    <input type="checkbox" id="competency_active" checked={competencyForm.is_active} onChange={(e) => setCompetencyForm({ ...competencyForm, is_active: e.target.checked })} className="w-4 h-4 text-blue-600 border-gray-300 rounded" />
                    <label htmlFor="competency_active" className="ml-2 text-sm font-medium text-gray-700">{t.common.active}</label>
                  </div>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button type="submit" className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700">{editingCompetency ? t.common.update : t.common.create}</button>
                <button type="button" onClick={() => { setShowCompetencyModal(false); setEditingCompetency(null); resetCompetencyForm(); }} className="flex-1 bg-gray-200 text-gray-800 py-2 rounded-lg hover:bg-gray-300">{t.common.cancel}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDescriptionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full">
            <h3 className="text-lg font-semibold mb-4">Edit Framework Description</h3>
            <textarea
              value={tempDescription}
              onChange={(e) => setTempDescription(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              rows={6}
              placeholder="Provide guidance for managers on how to use the competency framework..."
            />
            <div className="flex gap-3 mt-6">
              <button type="button" onClick={updateFrameworkDescription} className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700">Save</button>
              <button type="button" onClick={() => setShowDescriptionModal(false)} className="flex-1 bg-gray-200 text-gray-800 py-2 rounded-lg hover:bg-gray-300">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
