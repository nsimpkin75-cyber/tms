import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Search, Target, Calendar, Users } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { format } from 'date-fns';

interface StrategicRoadmap {
  id: string;
  title: string;
  description: string | null;
  owner_id: string;
  status: string;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  owner?: {
    full_name: string;
  };
}

interface StrategicGoal {
  id: string;
  roadmap_id: string;
  title: string;
  description: string | null;
  assigned_to_id: string | null;
  department_id: string | null;
  status: string;
  due_date: string | null;
  progress_percentage: number;
  assigned_to?: {
    full_name: string;
  };
  department?: {
    name: string;
  };
}

export default function StrategicRoadmapManagement() {
  const [roadmaps, setRoadmaps] = useState<StrategicRoadmap[]>([]);
  const [goals, setGoals] = useState<Record<string, StrategicGoal[]>>({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingRoadmap, setEditingRoadmap] = useState<StrategicRoadmap | null>(null);
  const [expandedRoadmap, setExpandedRoadmap] = useState<string | null>(null);

  const [form, setForm] = useState({
    title: '',
    description: '',
    status: 'draft',
    start_date: '',
    end_date: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const { data: roadmapsData, error: roadmapsError } = await supabase
        .from('strategic_roadmaps')
        .select(`
          *,
          owner:owner_id (full_name)
        `)
        .order('created_at', { ascending: false });

      if (roadmapsError) throw roadmapsError;
      setRoadmaps(roadmapsData || []);

      const { data: goalsData, error: goalsError } = await supabase
        .from('strategic_goals')
        .select(`
          *,
          assigned_to:assigned_to_id (full_name),
          department:department_id (name)
        `);

      if (goalsError) throw goalsError;

      const goalsByRoadmap: Record<string, StrategicGoal[]> = {};
      (goalsData || []).forEach((goal: any) => {
        if (!goalsByRoadmap[goal.roadmap_id]) {
          goalsByRoadmap[goal.roadmap_id] = [];
        }
        goalsByRoadmap[goal.roadmap_id].push(goal);
      });
      setGoals(goalsByRoadmap);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingRoadmap) {
        const { error } = await supabase
          .from('strategic_roadmaps')
          .update(form)
          .eq('id', editingRoadmap.id);
        if (error) throw error;
      } else {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        const { error } = await supabase
          .from('strategic_roadmaps')
          .insert([{ ...form, owner_id: user.id }]);
        if (error) throw error;
      }

      setShowModal(false);
      setEditingRoadmap(null);
      resetForm();
      fetchData();
    } catch (error) {
      console.error('Error saving strategy:', error);
      alert('Failed to save strategy');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this strategy? This will also delete all associated goals.')) return;

    try {
      const { error } = await supabase
        .from('strategic_roadmaps')
        .delete()
        .eq('id', id);
      if (error) throw error;
      fetchData();
    } catch (error) {
      console.error('Error deleting strategy:', error);
      alert('Failed to delete strategy');
    }
  };

  const openEditModal = (roadmap: StrategicRoadmap) => {
    setEditingRoadmap(roadmap);
    setForm({
      title: roadmap.title,
      description: roadmap.description || '',
      status: roadmap.status,
      start_date: roadmap.start_date || '',
      end_date: roadmap.end_date || '',
    });
    setShowModal(true);
  };

  const resetForm = () => {
    setForm({
      title: '',
      description: '',
      status: 'draft',
      start_date: '',
      end_date: '',
    });
  };

  const getRoadmapGoals = (roadmapId: string) => {
    return goals[roadmapId] || [];
  };

  const getRoadmapStats = (roadmapId: string) => {
    const roadmapGoals = getRoadmapGoals(roadmapId);
    const totalGoals = roadmapGoals.length;
    const completedGoals = roadmapGoals.filter(g => g.status === 'completed').length;
    const inProgressGoals = roadmapGoals.filter(g => g.status === 'in_progress').length;
    const atRiskGoals = roadmapGoals.filter(g => g.status === 'at_risk').length;

    return { totalGoals, completedGoals, inProgressGoals, atRiskGoals };
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'at_risk': return 'bg-red-100 text-red-800';
      case 'not_started': return 'bg-gray-100 text-gray-800';
      case 'draft': return 'bg-gray-100 text-gray-600';
      case 'active': return 'bg-green-100 text-green-700';
      case 'archived': return 'bg-gray-100 text-gray-500';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredRoadmaps = roadmaps.filter((roadmap) =>
    roadmap.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    roadmap.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Business Strategy Management</h2>
        <button
          onClick={() => {
            setEditingRoadmap(null);
            resetForm();
            setShowModal(true);
          }}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Add Strategy
        </button>
      </div>

      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search strategies..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      <div className="space-y-4">
        {filteredRoadmaps.map((roadmap) => {
          const stats = getRoadmapStats(roadmap.id);
          const isExpanded = expandedRoadmap === roadmap.id;
          const roadmapGoals = getRoadmapGoals(roadmap.id);

          return (
            <div key={roadmap.id} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">{roadmap.title}</h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(roadmap.status)}`}>
                        {roadmap.status}
                      </span>
                    </div>
                    <p className="text-gray-600 text-sm mb-3">{roadmap.description}</p>
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      {roadmap.owner && (
                        <span className="flex items-center gap-1">
                          <Users className="w-4 h-4" />
                          {roadmap.owner.full_name}
                        </span>
                      )}
                      {roadmap.start_date && roadmap.end_date && (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {format(new Date(roadmap.start_date), 'MMM dd, yyyy')} - {format(new Date(roadmap.end_date), 'MMM dd, yyyy')}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openEditModal(roadmap)}
                      className="text-blue-600 hover:text-blue-900 p-2"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(roadmap.id)}
                      className="text-red-600 hover:text-red-900 p-2"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-4">
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <Target className="w-4 h-4 text-gray-600" />
                      <span className="text-xs text-gray-600">Total Goals</span>
                    </div>
                    <p className="text-xl font-bold text-gray-900">{stats.totalGoals}</p>
                  </div>
                  <div className="bg-green-50 p-3 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <Target className="w-4 h-4 text-green-600" />
                      <span className="text-xs text-green-600">Completed</span>
                    </div>
                    <p className="text-xl font-bold text-green-900">{stats.completedGoals}</p>
                  </div>
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <Target className="w-4 h-4 text-blue-600" />
                      <span className="text-xs text-blue-600">In Progress</span>
                    </div>
                    <p className="text-xl font-bold text-blue-900">{stats.inProgressGoals}</p>
                  </div>
                  <div className="bg-red-50 p-3 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <Target className="w-4 h-4 text-red-600" />
                      <span className="text-xs text-red-600">At Risk</span>
                    </div>
                    <p className="text-xl font-bold text-red-900">{stats.atRiskGoals}</p>
                  </div>
                </div>

                {stats.totalGoals > 0 && (
                  <button
                    onClick={() => setExpandedRoadmap(isExpanded ? null : roadmap.id)}
                    className="mt-4 text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    {isExpanded ? 'Hide' : 'Show'} Goals ({stats.totalGoals})
                  </button>
                )}
              </div>

              {isExpanded && roadmapGoals.length > 0 && (
                <div className="border-t border-gray-200 bg-gray-50 p-6">
                  <h4 className="font-medium text-gray-900 mb-4">Goals</h4>
                  <div className="space-y-3">
                    {roadmapGoals.map((goal) => (
                      <div key={goal.id} className="bg-white border border-gray-200 rounded-lg p-4">
                        <div className="flex items-start justify-between mb-2">
                          <h5 className="font-medium text-gray-900">{goal.title}</h5>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(goal.status)}`}>
                            {goal.status.replace('_', ' ')}
                          </span>
                        </div>
                        {goal.description && (
                          <p className="text-sm text-gray-600 mb-3">{goal.description}</p>
                        )}
                        <div className="flex items-center justify-between text-sm text-gray-500">
                          <div className="flex items-center gap-4">
                            {goal.assigned_to && (
                              <span className="flex items-center gap-1">
                                <Users className="w-4 h-4" />
                                {goal.assigned_to.full_name}
                              </span>
                            )}
                            {goal.department && (
                              <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs font-medium">
                                {goal.department.name}
                              </span>
                            )}
                            {goal.due_date && (
                              <span className="flex items-center gap-1">
                                <Calendar className="w-4 h-4" />
                                {format(new Date(goal.due_date), 'MMM dd, yyyy')}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-24 bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-blue-600 h-2 rounded-full"
                                style={{ width: `${goal.progress_percentage}%` }}
                              />
                            </div>
                            <span className="text-xs font-medium">{goal.progress_percentage}%</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {filteredRoadmaps.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <Target className="w-12 h-12 mx-auto mb-3 text-gray-400" />
            <p>No business strategies found</p>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">
              {editingRoadmap ? 'Edit' : 'Add'} Business Strategy
            </h3>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                  <input
                    type="text"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    rows={3}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="draft">Draft</option>
                    <option value="active">Active</option>
                    <option value="completed">Completed</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                    <input
                      type="date"
                      value={form.start_date}
                      onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                    <input
                      type="date"
                      value={form.end_date}
                      onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  {editingRoadmap ? 'Update' : 'Create'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingRoadmap(null);
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
