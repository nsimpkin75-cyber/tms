import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Search } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface CareerPathway {
  id: string;
  user_id: string;
  from_role: string;
  to_role: string;
  progress: number;
  created_at: string;
  user?: {
    full_name: string;
    email: string;
  };
}

export default function CareerPathwayManagement() {
  const [pathways, setPathways] = useState<CareerPathway[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingPathway, setEditingPathway] = useState<CareerPathway | null>(null);
  const [formData, setFormData] = useState({
    user_id: '',
    from_role: '',
    to_role: '',
    progress: 0,
  });

  useEffect(() => {
    fetchPathways();
    fetchUsers();
  }, []);

  const fetchPathways = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('career_pathways')
        .select('*, user:profiles(full_name, email)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPathways(data || []);
    } catch (error) {
      console.error('Error fetching pathways:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .order('full_name');

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingPathway) {
        const { error } = await supabase
          .from('career_pathways')
          .update({
            from_role: formData.from_role,
            to_role: formData.to_role,
            progress: formData.progress,
          })
          .eq('id', editingPathway.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('career_pathways')
          .insert([formData]);

        if (error) throw error;
      }

      setShowModal(false);
      setEditingPathway(null);
      resetForm();
      fetchPathways();
    } catch (error) {
      console.error('Error saving pathway:', error);
      alert('Failed to save career pathway');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this pathway?')) return;

    try {
      const { error } = await supabase.from('career_pathways').delete().eq('id', id);

      if (error) throw error;
      fetchPathways();
    } catch (error) {
      console.error('Error deleting pathway:', error);
      alert('Failed to delete pathway');
    }
  };

  const openEditModal = (pathway: CareerPathway) => {
    setEditingPathway(pathway);
    setFormData({
      user_id: pathway.user_id,
      from_role: pathway.from_role,
      to_role: pathway.to_role,
      progress: pathway.progress || 0,
    });
    setShowModal(true);
  };

  const resetForm = () => {
    setFormData({
      user_id: '',
      from_role: '',
      to_role: '',
      progress: 0,
    });
  };

  const filteredPathways = pathways.filter((pathway) => {
    const userName = pathway.user?.full_name || '';
    const userEmail = pathway.user?.email || '';
    return (
      userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      userEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pathway.from_role.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pathway.to_role.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search pathways..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <button
          onClick={() => {
            setEditingPathway(null);
            resetForm();
            setShowModal(true);
          }}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Add Pathway
        </button>
      </div>

      {loading ? (
        <div className="text-center py-8">Loading...</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">From Role</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">To Role</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Progress</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredPathways.map((pathway) => (
                <tr key={pathway.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {pathway.user?.full_name || 'Unknown User'}
                      </div>
                      <div className="text-sm text-gray-500">{pathway.user?.email}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{pathway.from_role}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{pathway.to_role}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-32 bg-gray-200 rounded-full h-2 mr-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{ width: `${pathway.progress}%` }}
                        />
                      </div>
                      <span className="text-sm text-gray-600">{pathway.progress}%</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => openEditModal(pathway)}
                      className="text-blue-600 hover:text-blue-900 mr-4"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(pathway.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">
              {editingPathway ? 'Edit Pathway' : 'Add Pathway'}
            </h3>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">User</label>
                  <select
                    value={formData.user_id}
                    onChange={(e) => setFormData({ ...formData, user_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                    disabled={!!editingPathway}
                  >
                    <option value="">Select a user</option>
                    {users.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.full_name} ({user.email})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">From Role</label>
                  <input
                    type="text"
                    value={formData.from_role}
                    onChange={(e) => setFormData({ ...formData, from_role: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Junior Developer"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">To Role</label>
                  <input
                    type="text"
                    value={formData.to_role}
                    onChange={(e) => setFormData({ ...formData, to_role: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Senior Developer"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Progress ({formData.progress}%)
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={formData.progress}
                    onChange={(e) => setFormData({ ...formData, progress: parseInt(e.target.value) })}
                    className="w-full"
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  {editingPathway ? 'Update' : 'Create'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingPathway(null);
                    resetForm();
                  }}
                  className="flex-1 bg-gray-200 text-gray-800 py-2 rounded-lg hover:bg-gray-300 transition-colors"
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
