import { useState, useEffect } from 'react';
import { Plus, Trash2, Award, Settings, CheckCircle2, XCircle, ShieldCheck } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useLanguage } from '../../contexts/LanguageContext';

interface ComplianceItem {
  id: string;
  name: string;
  description: string;
  item_type: 'compliance' | 'competency';
  requirement_type: 'mandatory' | 'essential' | 'optional';
  regulatory_body: string | null;
  evidence_required: boolean;
  expiry_months: number | null;
  renewal_cycle: string | null;
  sort_order: number;
  is_active: boolean;
}

const EMPTY_FORM = {
  name: '',
  description: '',
  item_type: 'compliance' as 'compliance' | 'competency',
  requirement_type: 'mandatory' as 'mandatory' | 'essential' | 'optional',
  regulatory_body: '',
  evidence_required: true,
  expiry_months: '',
  renewal_cycle: 'none',
  sort_order: '0',
  is_active: true,
};

export default function ComplianceManagement() {
  const { t } = useLanguage();
  const [items, setItems] = useState<ComplianceItem[]>([]);
  const [jobFamilies, setJobFamilies] = useState<any[]>([]);
  const [roleReqs, setRoleReqs] = useState<any[]>([]);
  const [showItemModal, setShowItemModal] = useState(false);
  const [editingItem, setEditingItem] = useState<ComplianceItem | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [showBulkAssign, setShowBulkAssign] = useState(false);
  const [selectedItem, setSelectedItem] = useState('');
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchItems();
    fetchJobFamilies();
    fetchRoleReqs();
  }, []);

  async function fetchItems() {
    try {
      const { data } = await supabase.from('compliance_items').select('*').order('sort_order');
      if (data) setItems(data as ComplianceItem[]);
    } catch (error) {
      console.error('Error fetching compliance items:', error);
    }
  }

  async function fetchJobFamilies() {
    try {
      const { data } = await supabase.from('job_families').select('id, title, department').order('title');
      if (data) setJobFamilies(data);
    } catch (error) {
      console.error('Error fetching job families:', error);
    }
  }

  async function fetchRoleReqs() {
    try {
      const { data } = await supabase
        .from('compliance_role_requirements')
        .select(`id, compliance_item_id, job_family_id, requirement_type, is_active,
          item:compliance_items(name), role:job_families(title)`);
      if (data) setRoleReqs(data);
    } catch (error) {
      console.error('Error fetching role requirements:', error);
    }
  }

  async function handleSaveItem(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        description: form.description,
        item_type: form.item_type,
        requirement_type: form.requirement_type,
        regulatory_body: form.regulatory_body || null,
        evidence_required: form.evidence_required,
        expiry_months: form.expiry_months ? parseInt(form.expiry_months) : null,
        renewal_cycle: form.renewal_cycle,
        sort_order: parseInt(form.sort_order) || 0,
        is_active: form.is_active,
      };
      if (editingItem) {
        await supabase.from('compliance_items').update(payload).eq('id', editingItem.id);
      } else {
        await supabase.from('compliance_items').insert(payload);
      }
      setShowItemModal(false);
      setEditingItem(null);
      setForm({ ...EMPTY_FORM });
      fetchItems();
    } catch (error) {
      console.error('Error saving item:', error);
      alert('Failed to save item');
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteItem(id: string) {
    if (!confirm('Delete this compliance item and all related records?')) return;
    try {
      await supabase.from('compliance_items').delete().eq('id', id);
      fetchItems();
      fetchRoleReqs();
    } catch (error) {
      console.error('Error deleting item:', error);
      alert('Failed to delete item');
    }
  }

  async function handleBulkAssign() {
    if (!selectedItem || selectedRoles.length === 0) return;
    try {
      const inserts = selectedRoles.map(roleId => ({
        compliance_item_id: selectedItem,
        job_family_id: roleId,
        requirement_type: 'mandatory' as const,
        is_active: true,
      }));
      const { error } = await supabase
        .from('compliance_role_requirements')
        .upsert(inserts, { onConflict: 'compliance_item_id,job_family_id' });
      if (error) throw error;
      setShowBulkAssign(false);
      setSelectedItem('');
      setSelectedRoles([]);
      fetchRoleReqs();
    } catch (error) {
      console.error('Error assigning requirements:', error);
      alert('Failed to assign requirements');
    }
  }

  function openEdit(item: ComplianceItem) {
    setEditingItem(item);
    setForm({
      name: item.name,
      description: item.description,
      item_type: item.item_type,
      requirement_type: item.requirement_type,
      regulatory_body: item.regulatory_body || '',
      evidence_required: item.evidence_required,
      expiry_months: item.expiry_months?.toString() || '',
      renewal_cycle: item.renewal_cycle || 'none',
      sort_order: item.sort_order?.toString() || '0',
      is_active: item.is_active,
    });
    setShowItemModal(true);
  }

  function openNew() {
    setEditingItem(null);
    setForm({ ...EMPTY_FORM, sort_order: (items.length + 1).toString() });
    setShowItemModal(true);
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
          <ShieldCheck className="w-6 h-6 text-blue-600" />
          Compliance & Competence Management
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          Define mandatory certificates, set renewal cycles, and map compliance requirements to job roles
        </p>
      </div>

      {/* Compliance items table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">Compliance Items</h3>
          <button
            onClick={openNew}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            Add Item
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Name</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Type</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Requirement</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Regulatory Body</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Expiry</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900 text-sm">{item.name}</div>
                    <div className="text-xs text-gray-500">{item.description}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${item.item_type === 'compliance' ? 'bg-purple-50 text-purple-700' : 'bg-teal-50 text-teal-700'}`}>
                      {item.item_type}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${
                      item.requirement_type === 'mandatory' ? 'bg-red-50 text-red-700' :
                      item.requirement_type === 'essential' ? 'bg-blue-50 text-blue-700' : 'bg-gray-50 text-gray-600'
                    }`}>
                      {item.requirement_type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{item.regulatory_body || '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{item.expiry_months ? `${item.expiry_months} months` : 'No expiry'}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-2">
                      <button onClick={() => openEdit(item)} className="p-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200" title="Edit">
                        <Award className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDeleteItem(item.id)} className="p-1.5 rounded-lg bg-red-50 text-red-700 hover:bg-red-100 border border-red-200" title="Delete">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">No compliance items yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Role assignment matrix */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">Role-Based Assignment Matrix</h3>
          <button
            onClick={() => setShowBulkAssign(!showBulkAssign)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            Bulk Assign
          </button>
        </div>

        {showBulkAssign && (
          <div className="px-6 py-4 bg-blue-50 border-b border-blue-100 space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Compliance Item</label>
              <select value={selectedItem} onChange={(e) => setSelectedItem(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                <option value="">Select an item...</option>
                {items.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Assign to Job Roles</label>
              <div className="flex flex-wrap gap-2">
                {jobFamilies.map((jf: any) => (
                  <button
                    key={jf.id}
                    onClick={() => setSelectedRoles(prev => prev.includes(jf.id) ? prev.filter(r => r !== jf.id) : [...prev, jf.id])}
                    className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                      selectedRoles.includes(jf.id) ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'
                    }`}
                  >
                    {jf.title}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={handleBulkAssign} className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700">Apply Assignment</button>
              <button onClick={() => setShowBulkAssign(false)} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-300">Cancel</button>
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Compliance Item</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Job Role</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Requirement</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Active</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {roleReqs.map((rr: any) => (
                <tr key={rr.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{rr.item?.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{rr.role?.title}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${
                      rr.requirement_type === 'mandatory' ? 'bg-red-50 text-red-700' :
                      rr.requirement_type === 'essential' ? 'bg-blue-50 text-blue-700' : 'bg-gray-50 text-gray-600'
                    }`}>{rr.requirement_type}</span>
                  </td>
                  <td className="px-4 py-3">
                    {rr.is_active ? <CheckCircle2 className="w-4 h-4 text-green-600" /> : <XCircle className="w-4 h-4 text-gray-400" />}
                  </td>
                </tr>
              ))}
              {roleReqs.length === 0 && (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-500">No role assignments yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Item modal */}
      {showItemModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">{editingItem ? 'Edit Compliance Item' : 'New Compliance Item'}</h3>
            <form onSubmit={handleSaveItem} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input type="text" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                  <select value={form.item_type} onChange={(e) => setForm({ ...form, item_type: e.target.value as any })} className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                    <option value="compliance">Compliance</option>
                    <option value="competency">Competency</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Requirement Level</label>
                  <select value={form.requirement_type} onChange={(e) => setForm({ ...form, requirement_type: e.target.value as any })} className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                    <option value="mandatory">Mandatory (Legal/Regulatory)</option>
                    <option value="essential">Essential (Role-Specific)</option>
                    <option value="optional">Optional (Professional Development)</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Regulatory Body</label>
                <input type="text" value={form.regulatory_body} onChange={(e) => setForm({ ...form, regulatory_body: e.target.value })} placeholder="e.g. Housing Ombudsman, Building Safety Act" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Expiry (months)</label>
                  <input type="number" value={form.expiry_months} onChange={(e) => setForm({ ...form, expiry_months: e.target.value })} placeholder="12 = annual, empty = no expiry" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Renewal Cycle</label>
                  <select value={form.renewal_cycle} onChange={(e) => setForm({ ...form, renewal_cycle: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                    <option value="none">None</option>
                    <option value="annual">Annual</option>
                    <option value="biannual">Biannual</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Sort Order</label>
                  <input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
                </div>
                <div className="flex items-center gap-4 pt-6">
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={form.evidence_required} onChange={(e) => setForm({ ...form, evidence_required: e.target.checked })} className="w-4 h-4 rounded" />
                    Evidence Required
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} className="w-4 h-4 rounded" />
                    Active
                  </label>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={saving} className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50">
                  {saving ? 'Saving...' : (editingItem ? 'Update' : 'Create')}
                </button>
                <button type="button" onClick={() => { setShowItemModal(false); setEditingItem(null); setForm({ ...EMPTY_FORM }); }} className="flex-1 bg-gray-200 text-gray-800 py-2 rounded-lg hover:bg-gray-300">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
