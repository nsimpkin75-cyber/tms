import { useState, useEffect } from 'react';
import { Plus, CreditCard as Edit2, Trash2, Save, X, Target } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface CriteriaItem {
  name: string;
  description: string;
  target: string;
}

interface ProgressionCriteria {
  id: string;
  title: string;
  criteria_items: CriteriaItem[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export function ProgressionCriteriaManagement() {
  const [criteria, setCriteria] = useState<ProgressionCriteria[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    criteria_items: [] as CriteriaItem[],
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const { data: criteriaData } = await supabase
        .from('general_progression_criteria')
        .select('*')
        .order('created_at', { ascending: false });

      if (criteriaData) setCriteria(criteriaData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }

  function startEdit(criterion: ProgressionCriteria) {
    setEditingId(criterion.id);
    setFormData({
      title: criterion.title,
      criteria_items: criterion.criteria_items,
    });
    setShowAddForm(true);
  }

  function resetForm() {
    setFormData({
      title: '',
      criteria_items: [],
    });
    setEditingId(null);
    setShowAddForm(false);
  }

  async function handleSave() {
    try {
      if (editingId) {
        await supabase
          .from('general_progression_criteria')
          .update({
            title: formData.title,
            criteria_items: formData.criteria_items,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingId);
      } else {
        await supabase.from('general_progression_criteria').insert({
          title: formData.title,
          criteria_items: formData.criteria_items,
        });
      }
      await loadData();
      resetForm();
    } catch (error) {
      console.error('Error saving criteria:', error);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this progression criteria?')) return;

    try {
      await supabase.from('general_progression_criteria').delete().eq('id', id);
      await loadData();
    } catch (error) {
      console.error('Error deleting criteria:', error);
    }
  }

  function addCriteriaItem() {
    setFormData({
      ...formData,
      criteria_items: [...formData.criteria_items, { name: '', description: '', target: '' }],
    });
  }

  function updateCriteriaItem(index: number, field: keyof CriteriaItem, value: string) {
    const newItems = [...formData.criteria_items];
    newItems[index][field] = value;
    setFormData({ ...formData, criteria_items: newItems });
  }

  function removeCriteriaItem(index: number) {
    setFormData({
      ...formData,
      criteria_items: formData.criteria_items.filter((_, i) => i !== index),
    });
  }

  if (loading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Progression Criteria Management</h2>
          <p className="text-gray-600 mt-1">
            Define standard criteria for anyone looking to apply for a role or develop their career
          </p>
        </div>
        {!showAddForm && (
          <button onClick={() => setShowAddForm(true)} className="btn-primary">
            <Plus className="w-5 h-5 mr-2" />
            Add Criteria
          </button>
        )}
      </div>

      {showAddForm && (
        <div className="card bg-blue-50 border-2 border-blue-300">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold text-gray-900">
              {editingId ? 'Edit Progression Criteria' : 'Add New Progression Criteria'}
            </h3>
            <button onClick={resetForm} className="text-gray-500 hover:text-gray-700">
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Criteria Title
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="input-field w-full"
                placeholder="e.g., Internal Roles, External Applications, Management Positions"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <Target className="w-4 h-4 text-gray-500" />
                  Criteria Items
                </label>
                <button onClick={addCriteriaItem} className="btn-secondary text-sm">
                  <Plus className="w-4 h-4 mr-1" />
                  Add Item
                </button>
              </div>
              <div className="space-y-3">
                {formData.criteria_items.map((item, index) => (
                  <div key={index} className="bg-white p-4 rounded-lg border border-gray-200">
                    <div className="flex gap-3 items-start">
                      <div className="flex-1 space-y-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">
                            Selection Name
                          </label>
                          <input
                            type="text"
                            value={item.name}
                            onChange={(e) => updateCriteriaItem(index, 'name', e.target.value)}
                            placeholder="e.g., Length of Service"
                            className="input-field w-full"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">
                            Description
                          </label>
                          <input
                            type="text"
                            value={item.description}
                            onChange={(e) => updateCriteriaItem(index, 'description', e.target.value)}
                            placeholder="e.g., How long you have been in your current role"
                            className="input-field w-full"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">
                            Target
                          </label>
                          <input
                            type="text"
                            value={item.target}
                            onChange={(e) => updateCriteriaItem(index, 'target', e.target.value)}
                            placeholder="e.g., 9+ months"
                            className="input-field w-full"
                          />
                        </div>
                      </div>
                      <button
                        onClick={() => removeCriteriaItem(index)}
                        className="text-red-600 hover:text-red-800 mt-1"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ))}
                {formData.criteria_items.length === 0 && (
                  <div className="text-center py-8 text-gray-500 bg-white rounded-lg border border-gray-200">
                    No criteria items added yet. Click "Add Item" to create one.
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button onClick={resetForm} className="btn-secondary">
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="btn-primary"
                disabled={!formData.title}
              >
                <Save className="w-4 h-4 mr-2" />
                {editingId ? 'Update Criteria' : 'Create Criteria'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-4">
        {criteria.map((criterion) => (
          <div key={criterion.id} className="card hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-4">
                  <h3 className="text-xl font-semibold text-gray-900">
                    {criterion.title}
                  </h3>
                  <div className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                    {criterion.criteria_items.length} item{criterion.criteria_items.length !== 1 ? 's' : ''}
                  </div>
                </div>

                {criterion.criteria_items.length > 0 ? (
                  <div className="space-y-3">
                    {criterion.criteria_items.map((item, idx) => (
                      <div key={idx} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <div className="text-xs font-medium text-gray-500 mb-1">Selection</div>
                            <div className="text-sm font-semibold text-gray-900">{item.name}</div>
                          </div>
                          <div>
                            <div className="text-xs font-medium text-gray-500 mb-1">Description</div>
                            <div className="text-sm text-gray-700">{item.description}</div>
                          </div>
                          <div>
                            <div className="text-xs font-medium text-gray-500 mb-1 flex items-center gap-1">
                              <Target className="w-3 h-3" />
                              Target
                            </div>
                            <div className="text-sm font-semibold text-blue-700">{item.target}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-gray-500 italic">No criteria items defined</div>
                )}
              </div>

              <div className="flex gap-2 ml-4">
                <button
                  onClick={() => startEdit(criterion)}
                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                >
                  <Edit2 className="w-5 h-5" />
                </button>
                <button
                  onClick={() => handleDelete(criterion.id)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        ))}

        {criteria.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No progression criteria defined yet. Click "Add Criteria" to create one.
          </div>
        )}
      </div>
    </div>
  );
}
