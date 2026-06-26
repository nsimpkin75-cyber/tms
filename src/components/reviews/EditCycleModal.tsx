import { useState, useEffect } from 'react';
import { X, Plus, Trash2, UserPlus, Target } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface CycleKPI {
  id: string;
  kpi_name: string;
  kpi_target: string;
  kpi_measurement_unit: string;
  weighting: number | null;
  from_strategy: boolean;
  can_remove: boolean;
}

interface CycleMember {
  id: string;
  employee_id: string;
  full_name: string;
  email: string;
  job_title: string;
}

interface TeamMember {
  id: string;
  full_name: string;
  email: string;
  job_title: string;
}

interface EditCycleModalProps {
  cycleId: string;
  cycleName: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function EditCycleModal({ cycleId, cycleName, onClose, onSuccess }: EditCycleModalProps) {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [kpis, setKpis] = useState<CycleKPI[]>([]);
  const [members, setMembers] = useState<CycleMember[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<TeamMember[]>([]);
  const [showSearch, setShowSearch] = useState(false);

  useEffect(() => {
    loadCycleData();
  }, [cycleId]);

  useEffect(() => {
    const delaySearch = setTimeout(async () => {
      if (searchTerm.length >= 2) {
        const results = await searchEmployees(searchTerm);
        setSearchResults(results.filter(r => !members.find(m => m.employee_id === r.id)));
      } else {
        setSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(delaySearch);
  }, [searchTerm, members]);

  async function loadCycleData() {
    const [kpisData, membersData] = await Promise.all([
      supabase
        .from('review_cycle_kpis')
        .select('*')
        .eq('cycle_id', cycleId)
        .order('sort_order'),
      supabase
        .from('review_cycle_members')
        .select(`
          id,
          employee_id,
          profiles:employee_id (
            id,
            full_name,
            email,
            job_title
          )
        `)
        .eq('cycle_id', cycleId)
        .eq('status', 'active')
    ]);

    if (kpisData.data) {
      setKpis(kpisData.data);
    }

    if (membersData.data) {
      setMembers(membersData.data.map(m => ({
        id: m.id,
        employee_id: m.employee_id,
        full_name: m.profiles.full_name,
        email: m.profiles.email,
        job_title: m.profiles.job_title
      })));
    }
  }

  async function searchEmployees(searchTerm: string) {
    if (!searchTerm.trim()) return [];

    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, email, job_title')
      .or(`full_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`)
      .neq('id', profile?.id)
      .limit(10);

    return data || [];
  }

  async function addMember(memberId: string, memberData: TeamMember) {
    try {
      const { error: memberError } = await supabase
        .from('review_cycle_members')
        .insert({
          cycle_id: cycleId,
          employee_id: memberId,
          status: 'active'
        });

      if (memberError) throw memberError;

      const { error: instanceError } = await supabase
        .from('review_instances')
        .insert({
          cycle_id: cycleId,
          employee_id: memberId,
          manager_id: profile?.id,
          template_type: 'generic',
          status: 'upcoming'
        });

      if (instanceError) throw instanceError;

      setMembers([...members, {
        id: memberId,
        employee_id: memberId,
        full_name: memberData.full_name,
        email: memberData.email,
        job_title: memberData.job_title
      }]);

      setSearchTerm('');
      setShowSearch(false);
    } catch (error) {
      console.error('Error adding member:', error);
      alert('Failed to add team member');
    }
  }

  async function removeMember(memberId: string) {
    if (!confirm('Remove this team member from the cycle? Their review data will be archived.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('review_cycle_members')
        .update({ status: 'removed' })
        .eq('id', memberId);

      if (error) throw error;

      setMembers(members.filter(m => m.id !== memberId));
    } catch (error) {
      console.error('Error removing member:', error);
      alert('Failed to remove team member');
    }
  }

  function addKPI() {
    const newKPI: CycleKPI = {
      id: 'new-' + Date.now(),
      kpi_name: '',
      kpi_target: '',
      kpi_measurement_unit: '',
      weighting: null,
      from_strategy: false,
      can_remove: true
    };
    setKpis([...kpis, newKPI]);
  }

  function updateKPI(index: number, field: keyof CycleKPI, value: any) {
    const newKpis = [...kpis];
    newKpis[index] = { ...newKpis[index], [field]: value };
    setKpis(newKpis);
  }

  async function removeKPI(kpi: CycleKPI, index: number) {
    if (!kpi.can_remove) return;

    if (kpi.id.startsWith('new-')) {
      setKpis(kpis.filter((_, i) => i !== index));
      return;
    }

    try {
      const { error } = await supabase
        .from('review_cycle_kpis')
        .delete()
        .eq('id', kpi.id);

      if (error) throw error;

      setKpis(kpis.filter((_, i) => i !== index));
    } catch (error) {
      console.error('Error removing KPI:', error);
      alert('Failed to remove KPI');
    }
  }

  async function handleSave() {
    setLoading(true);
    try {
      const newKpis = kpis.filter(k => k.id.startsWith('new-') && k.kpi_name.trim());
      const existingKpis = kpis.filter(k => !k.id.startsWith('new-'));

      if (newKpis.length > 0) {
        const kpiInserts = newKpis.map((kpi, index) => ({
          cycle_id: cycleId,
          kpi_name: kpi.kpi_name,
          kpi_target: kpi.kpi_target,
          kpi_measurement_unit: kpi.kpi_measurement_unit,
          weighting: kpi.weighting,
          from_strategy: false,
          can_remove: true,
          sort_order: kpis.length + index
        }));

        const { error } = await supabase
          .from('review_cycle_kpis')
          .insert(kpiInserts);

        if (error) throw error;
      }

      for (const kpi of existingKpis) {
        if (!kpi.id.startsWith('new-')) {
          const { error } = await supabase
            .from('review_cycle_kpis')
            .update({
              kpi_name: kpi.kpi_name,
              kpi_target: kpi.kpi_target,
              kpi_measurement_unit: kpi.kpi_measurement_unit,
              weighting: kpi.weighting
            })
            .eq('id', kpi.id);

          if (error) throw error;
        }
      }

      onSuccess();
    } catch (error) {
      console.error('Error saving changes:', error);
      alert('Failed to save changes');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Manage Cycle</h2>
            <p className="text-blue-100 text-sm mt-1">{cycleName}</p>
          </div>
          <button onClick={onClose} className="text-white hover:text-blue-100">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-blue-600" />
                Team Members
              </h3>
            </div>

            <div className="mb-4 relative">
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
                      onClick={() => addMember(result.id, result)}
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
              {members.map(member => (
                <div key={member.id} className="flex items-center justify-between p-3 hover:bg-gray-50">
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{member.full_name}</div>
                    <div className="text-sm text-gray-500">{member.email}</div>
                    {member.job_title && (
                      <div className="text-xs text-gray-400">{member.job_title}</div>
                    )}
                  </div>
                  <button
                    onClick={() => removeMember(member.id)}
                    className="text-red-500 hover:text-red-700 p-2"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
            <p className="text-sm text-gray-500 mt-2">
              {members.length} member{members.length !== 1 ? 's' : ''} in cycle
            </p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                <Target className="w-5 h-5 text-blue-600" />
                KPIs
              </h3>
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
                <div key={kpi.id} className="border border-gray-200 rounded-lg p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 space-y-3">
                      <div>
                        <input
                          type="text"
                          value={kpi.kpi_name}
                          onChange={(e) => updateKPI(index, 'kpi_name', e.target.value)}
                          disabled={kpi.from_strategy}
                          className="input-field w-full text-sm"
                          placeholder="KPI Name"
                        />
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <input
                          type="text"
                          value={kpi.kpi_target}
                          onChange={(e) => updateKPI(index, 'kpi_target', e.target.value)}
                          disabled={kpi.from_strategy}
                          className="input-field text-sm"
                          placeholder="Target"
                        />
                        <input
                          type="text"
                          value={kpi.kpi_measurement_unit}
                          onChange={(e) => updateKPI(index, 'kpi_measurement_unit', e.target.value)}
                          disabled={kpi.from_strategy}
                          className="input-field text-sm"
                          placeholder="Unit"
                        />
                        <input
                          type="number"
                          value={kpi.weighting || ''}
                          onChange={(e) => updateKPI(index, 'weighting', parseFloat(e.target.value) || null)}
                          disabled={kpi.from_strategy}
                          className="input-field text-sm"
                          placeholder="Weight %"
                        />
                      </div>
                    </div>
                    {kpi.can_remove && (
                      <button
                        onClick={() => removeKPI(kpi, index)}
                        className="text-red-500 hover:text-red-700 p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  {kpi.from_strategy && (
                    <div className="text-xs text-blue-600">
                      From strategy - cannot be removed or edited
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="border-t border-gray-200 p-6 flex items-center justify-between bg-gray-50">
          <button
            onClick={onClose}
            className="btn-secondary"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="btn-primary"
            disabled={loading}
          >
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
