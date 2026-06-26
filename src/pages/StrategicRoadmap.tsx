import React, { useState, useEffect } from 'react';
import { Plus, Target, Users, TrendingUp, Calendar, AlertCircle, CheckCircle2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { format } from 'date-fns';

interface StrategicRoadmap {
  id: string;
  title: string;
  description: string | null;
  owner_id: string;
  status: 'draft' | 'active' | 'completed' | 'archived';
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  owner?: {
    full_name: string;
  };
}

interface Department {
  id: string;
  name: string;
  description: string | null;
}

interface StrategicGoal {
  id: string;
  roadmap_id: string;
  title: string;
  description: string | null;
  assigned_to_id: string | null;
  department_id: string | null;
  assigned_by_id: string;
  parent_goal_id: string | null;
  status: 'not_started' | 'in_progress' | 'at_risk' | 'completed';
  due_date: string | null;
  progress_percentage: number;
  created_at: string;
  assigned_to?: {
    full_name: string;
    role: string;
  };
  department?: {
    name: string;
  };
}

interface GoalMilestone {
  id: string;
  goal_id: string;
  title: string;
  description: string | null;
  assigned_to_id: string | null;
  success_criteria: string | null;
  target_value: string | null;
  current_value: string | null;
  measurement_unit: string | null;
  due_date: string | null;
  status: 'not_started' | 'in_progress' | 'completed';
  sort_order: number;
  assigned_to?: {
    full_name: string;
  };
}

export default function StrategicRoadmap() {
  const { profile } = useAuth();
  const [roadmaps, setRoadmaps] = useState<StrategicRoadmap[]>([]);
  const [selectedRoadmap, setSelectedRoadmap] = useState<StrategicRoadmap | null>(null);
  const [goals, setGoals] = useState<StrategicGoal[]>([]);
  const [selectedGoal, setSelectedGoal] = useState<StrategicGoal | null>(null);
  const [milestones, setMilestones] = useState<GoalMilestone[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [showMilestoneModal, setShowMilestoneModal] = useState(false);
  const [availableUsers, setAvailableUsers] = useState<Array<{ id: string; full_name: string; role: string }>>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const [roadmapForm, setRoadmapForm] = useState({
    title: '',
    description: '',
    status: 'draft' as const,
    start_date: '',
    end_date: '',
  });

  const [goalForm, setGoalForm] = useState({
    title: '',
    description: '',
    assigned_to_id: '',
    department_id: '',
    status: 'not_started' as const,
    due_date: '',
    progress_percentage: 0,
  });

  const [milestoneForm, setMilestoneForm] = useState({
    title: '',
    description: '',
    assigned_to_id: '',
    success_criteria: '',
    target_value: '',
    current_value: '',
    measurement_unit: '',
    due_date: '',
    status: 'not_started' as const,
  });

  useEffect(() => {
    fetchRoadmaps();
    fetchAvailableUsers();
    fetchDepartments();
  }, []);

  useEffect(() => {
    if (selectedRoadmap) {
      fetchGoals(selectedRoadmap.id);
    }
  }, [selectedRoadmap]);

  useEffect(() => {
    if (selectedGoal) {
      fetchMilestones(selectedGoal.id);
    }
  }, [selectedGoal]);

  const fetchRoadmaps = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('strategic_roadmaps')
        .select(`
          *,
          owner:owner_id (full_name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRoadmaps(data || []);
      if (data && data.length > 0 && !selectedRoadmap) {
        setSelectedRoadmap(data[0]);
      }
    } catch (error) {
      console.error('Error fetching strategies:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchGoals = async (roadmapId: string) => {
    try {
      const { data, error } = await supabase
        .from('strategic_goals')
        .select(`
          *,
          assigned_to:assigned_to_id (full_name, role),
          department:department_id (name)
        `)
        .eq('roadmap_id', roadmapId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setGoals(data || []);
    } catch (error) {
      console.error('Error fetching goals:', error);
    }
  };

  const fetchAvailableUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, role')
        .order('full_name');

      if (error) throw error;
      setAvailableUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchDepartments = async () => {
    try {
      const { data, error } = await supabase
        .from('departments')
        .select('*')
        .order('name');

      if (error) throw error;
      setDepartments(data || []);
    } catch (error) {
      console.error('Error fetching departments:', error);
    }
  };

  const fetchMilestones = async (goalId: string) => {
    try {
      const { data, error } = await supabase
        .from('goal_milestones')
        .select(`
          *,
          assigned_to:assigned_to_id (full_name)
        `)
        .eq('goal_id', goalId)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      setMilestones(data || []);
    } catch (error) {
      console.error('Error fetching milestones:', error);
    }
  };

  const handleCreateRoadmap = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data, error } = await supabase
        .from('strategic_roadmaps')
        .insert([{ ...roadmapForm, owner_id: profile?.id }])
        .select(`
          *,
          owner:owner_id (full_name)
        `)
        .single();

      if (error) throw error;
      setRoadmaps([data, ...roadmaps]);
      setSelectedRoadmap(data);
      setShowCreateModal(false);
      setRoadmapForm({
        title: '',
        description: '',
        status: 'draft',
        start_date: '',
        end_date: '',
      });
    } catch (error) {
      console.error('Error creating strategy:', error);
      alert('Failed to create strategy');
    }
  };

  const handleCreateGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRoadmap || !profile) return;

    const errors: Record<string, string> = {};

    if (!goalForm.title.trim()) {
      errors.title = 'Title is required';
    }

    if (!goalForm.assigned_to_id && !goalForm.department_id) {
      errors.assignment = 'Please assign to either a person or department';
    }

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('strategic_goals')
        .insert([{
          title: goalForm.title,
          description: goalForm.description,
          assigned_to_id: goalForm.assigned_to_id || null,
          department_id: goalForm.department_id || null,
          status: goalForm.status,
          due_date: goalForm.due_date || null,
          progress_percentage: goalForm.progress_percentage,
          roadmap_id: selectedRoadmap.id,
          assigned_by_id: profile.id,
        }])
        .select(`
          *,
          assigned_to:assigned_to_id (full_name, role),
          department:department_id (name)
        `)
        .single();

      if (error) throw error;
      setGoals([...goals, data]);
      setShowGoalModal(false);
      setValidationErrors({});
      setGoalForm({
        title: '',
        description: '',
        assigned_to_id: '',
        department_id: '',
        status: 'not_started',
        due_date: '',
        progress_percentage: 0,
      });
    } catch (error) {
      console.error('Error creating goal:', error);
      alert('Failed to create goal');
    }
  };

  const handleUpdateGoalStatus = async (goalId: string, newStatus: string, newProgress: number) => {
    try {
      const { error } = await supabase
        .from('strategic_goals')
        .update({ status: newStatus, progress_percentage: newProgress })
        .eq('id', goalId);

      if (error) throw error;

      setGoals(goals.map(g =>
        g.id === goalId
          ? { ...g, status: newStatus as any, progress_percentage: newProgress }
          : g
      ));
    } catch (error) {
      console.error('Error updating goal:', error);
      alert('Failed to update goal');
    }
  };

  const handleCreateMilestone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGoal) return;

    try {
      const assignedToId = milestoneForm.assigned_to_id ||
        (selectedGoal.assigned_to_id ? selectedGoal.assigned_to_id : null);

      const { data, error } = await supabase
        .from('goal_milestones')
        .insert([{
          ...milestoneForm,
          goal_id: selectedGoal.id,
          assigned_to_id: assignedToId,
          sort_order: milestones.length,
        }])
        .select(`
          *,
          assigned_to:assigned_to_id (full_name)
        `)
        .single();

      if (error) throw error;
      setMilestones([...milestones, data]);
      setShowMilestoneModal(false);
      setMilestoneForm({
        title: '',
        description: '',
        assigned_to_id: '',
        success_criteria: '',
        target_value: '',
        current_value: '',
        measurement_unit: '',
        due_date: '',
        status: 'not_started',
      });
    } catch (error) {
      console.error('Error creating milestone:', error);
      alert('Failed to create milestone');
    }
  };

  const handleUpdateMilestoneStatus = async (milestoneId: string, newStatus: string, newCurrent?: string) => {
    try {
      const updateData: any = { status: newStatus };
      if (newCurrent !== undefined) {
        updateData.current_value = newCurrent;
      }

      const { error } = await supabase
        .from('goal_milestones')
        .update(updateData)
        .eq('id', milestoneId);

      if (error) throw error;

      setMilestones(milestones.map(m =>
        m.id === milestoneId
          ? { ...m, ...updateData }
          : m
      ));

      const completedCount = milestones.filter(m =>
        m.id === milestoneId ? newStatus === 'completed' : m.status === 'completed'
      ).length;
      const totalCount = milestones.length;
      const newProgress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

      if (selectedGoal && selectedGoal.progress_percentage !== newProgress) {
        await handleUpdateGoalStatus(selectedGoal.id, selectedGoal.status, newProgress);
      }
    } catch (error) {
      console.error('Error updating milestone:', error);
      alert('Failed to update milestone');
    }
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

  const getRoadmapStats = () => {
    const totalGoals = goals.length;
    const completedGoals = goals.filter(g => g.status === 'completed').length;
    const inProgressGoals = goals.filter(g => g.status === 'in_progress').length;
    const atRiskGoals = goals.filter(g => g.status === 'at_risk').length;

    return { totalGoals, completedGoals, inProgressGoals, atRiskGoals };
  };

  const stats = getRoadmapStats();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="inline-block w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-gray-600">Loading strategies...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Business Strategy</h1>
          <p className="text-gray-600 mt-1">View assigned strategic goals and track your progress</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          New Strategy
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Target className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Goals</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalGoals}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Completed</p>
              <p className="text-2xl font-bold text-gray-900">{stats.completedGoals}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">In Progress</p>
              <p className="text-2xl font-bold text-gray-900">{stats.inProgressGoals}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertCircle className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">At Risk</p>
              <p className="text-2xl font-bold text-gray-900">{stats.atRiskGoals}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Strategies</h2>
          {roadmaps.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No strategies yet</p>
              <p className="text-sm">Create your first business strategy</p>
            </div>
          ) : (
            <div className="space-y-2">
              {roadmaps.map((roadmap) => (
                <button
                  key={roadmap.id}
                  onClick={() => {
                    setSelectedRoadmap(roadmap);
                    setSelectedGoal(null);
                  }}
                  className={`w-full text-left p-4 rounded-lg border-2 transition-colors ${
                    selectedRoadmap?.id === roadmap.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">{roadmap.title}</h3>
                      <p className="text-sm text-gray-600 mt-1 line-clamp-2">{roadmap.description}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(roadmap.status)}`}>
                          {roadmap.status}
                        </span>
                        {roadmap.end_date && (
                          <span className="text-xs text-gray-500 flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {format(new Date(roadmap.end_date), 'MMM dd, yyyy')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          {selectedRoadmap ? (
            <>
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">{selectedRoadmap.title}</h2>
                  <p className="text-gray-600 mt-1">{selectedRoadmap.description}</p>
                </div>
                <button
                  onClick={() => setShowGoalModal(true)}
                  className="flex items-center gap-2 bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm"
                >
                  <Plus className="w-4 h-4" />
                  Add Goal
                </button>
              </div>

              {goals.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Target className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                  <p>No goals yet</p>
                  <p className="text-sm">Add your first strategic goal</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {goals.map((goal) => (
                    <button
                      key={goal.id}
                      onClick={() => setSelectedGoal(goal)}
                      className={`w-full text-left p-4 rounded-lg border-2 transition-colors ${
                        selectedGoal?.id === goal.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-medium text-gray-900">{goal.title}</h3>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(goal.status)}`}>
                          {goal.status.replace('_', ' ')}
                        </span>
                      </div>
                      {goal.description && (
                        <p className="text-sm text-gray-600 mb-2 line-clamp-2">{goal.description}</p>
                      )}
                      <div className="flex items-center gap-3 text-xs text-gray-500">
                        {goal.assigned_to && (
                          <span className="flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            {goal.assigned_to.full_name}
                          </span>
                        )}
                        {goal.department && (
                          <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded">
                            {goal.department.name}
                          </span>
                        )}
                        {goal.due_date && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {format(new Date(goal.due_date), 'MMM dd')}
                          </span>
                        )}
                      </div>
                      <div className="mt-2">
                        <div className="w-full bg-gray-200 rounded-full h-1.5">
                          <div
                            className="bg-blue-600 h-1.5 rounded-full transition-all"
                            style={{ width: `${goal.progress_percentage}%` }}
                          />
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <p>Select a strategy to view goals</p>
            </div>
          )}
        </div>

        <div className="lg:col-span-2 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          {selectedGoal ? (
            <>
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">{selectedGoal.title}</h2>
                  <div className="flex items-center gap-2 mt-2 text-sm text-gray-600">
                    {selectedGoal.assigned_to && (
                      <span className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        {selectedGoal.assigned_to.full_name}
                      </span>
                    )}
                    {selectedGoal.department && (
                      <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs font-medium">
                        {selectedGoal.department.name}
                      </span>
                    )}
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedGoal.status)}`}>
                      {selectedGoal.status.replace('_', ' ')}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setShowMilestoneModal(true)}
                  className="flex items-center gap-2 bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm"
                >
                  <Plus className="w-4 h-4" />
                  Add Milestone
                </button>
              </div>

              <div className="mb-4">
                <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                  <span className="font-medium">Overall Progress</span>
                  <span className="font-semibold">{selectedGoal.progress_percentage}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className="bg-blue-600 h-3 rounded-full transition-all"
                    style={{ width: `${selectedGoal.progress_percentage}%` }}
                  />
                </div>
              </div>

              {milestones.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                  <p>No milestones yet</p>
                  <p className="text-sm">Add milestones to track progress</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {milestones.map((milestone) => (
                    <div key={milestone.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900">{milestone.title}</h4>
                          {milestone.description && (
                            <p className="text-sm text-gray-600 mt-1">{milestone.description}</p>
                          )}
                        </div>
                        <select
                          value={milestone.status}
                          onChange={(e) => handleUpdateMilestoneStatus(milestone.id, e.target.value)}
                          className="text-xs border border-gray-300 rounded px-2 py-1"
                        >
                          <option value="not_started">Not Started</option>
                          <option value="in_progress">In Progress</option>
                          <option value="completed">Completed</option>
                        </select>
                      </div>

                      {milestone.success_criteria && (
                        <div className="mb-2 p-2 bg-blue-50 rounded">
                          <p className="text-xs font-medium text-blue-900">Success Criteria</p>
                          <p className="text-xs text-blue-800">{milestone.success_criteria}</p>
                        </div>
                      )}

                      {(milestone.target_value || milestone.current_value) && (
                        <div className="mb-2 p-2 bg-green-50 rounded">
                          <p className="text-xs font-medium text-green-900 mb-1">Metrics</p>
                          <div className="flex items-center gap-3 text-xs">
                            {milestone.current_value && (
                              <div>
                                <span className="text-gray-600">Current: </span>
                                <input
                                  type="text"
                                  value={milestone.current_value}
                                  onChange={(e) => handleUpdateMilestoneStatus(milestone.id, milestone.status, e.target.value)}
                                  className="w-16 px-1 py-0.5 border border-gray-300 rounded"
                                />
                                {milestone.measurement_unit && <span className="ml-1">{milestone.measurement_unit}</span>}
                              </div>
                            )}
                            {milestone.target_value && (
                              <div>
                                <span className="text-gray-600">Target: </span>
                                <span className="font-medium text-green-800">{milestone.target_value}{milestone.measurement_unit && ` ${milestone.measurement_unit}`}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      <div className="flex items-center gap-3 text-xs text-gray-500">
                        {milestone.assigned_to && (
                          <span className="flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            {milestone.assigned_to.full_name}
                          </span>
                        )}
                        {milestone.due_date && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {format(new Date(milestone.due_date), 'MMM dd, yyyy')}
                          </span>
                        )}
                        <span className={`px-2 py-0.5 rounded-full ${getStatusColor(milestone.status)}`}>
                          {milestone.status.replace('_', ' ')}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <p>Select a goal to view milestones</p>
            </div>
          )}
        </div>
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Create Business Strategy</h3>
            <form onSubmit={handleCreateRoadmap}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                  <input
                    type="text"
                    value={roadmapForm.title}
                    onChange={(e) => setRoadmapForm({ ...roadmapForm, title: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    value={roadmapForm.description}
                    onChange={(e) => setRoadmapForm({ ...roadmapForm, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    rows={3}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                    <input
                      type="date"
                      value={roadmapForm.start_date}
                      onChange={(e) => setRoadmapForm({ ...roadmapForm, start_date: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                    <input
                      type="date"
                      value={roadmapForm.end_date}
                      onChange={(e) => setRoadmapForm({ ...roadmapForm, end_date: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    value={roadmapForm.status}
                    onChange={(e) => setRoadmapForm({ ...roadmapForm, status: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="draft">Draft</option>
                    <option value="active">Active</option>
                    <option value="completed">Completed</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Create Strategy
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 bg-gray-200 text-gray-800 py-2 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showGoalModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Add Strategic Goal</h3>
            <form onSubmit={handleCreateGoal}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={goalForm.title}
                    onChange={(e) => {
                      setGoalForm({ ...goalForm, title: e.target.value });
                      if (validationErrors.title) {
                        setValidationErrors({ ...validationErrors, title: '' });
                      }
                    }}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                      validationErrors.title ? 'border-red-500 bg-red-50' : 'border-gray-300'
                    }`}
                  />
                  {validationErrors.title && (
                    <p className="text-red-500 text-sm mt-1">{validationErrors.title}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    value={goalForm.description}
                    onChange={(e) => setGoalForm({ ...goalForm, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    rows={3}
                  />
                </div>
                <div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Assign to Person</label>
                      <select
                        value={goalForm.assigned_to_id}
                        onChange={(e) => {
                          setGoalForm({ ...goalForm, assigned_to_id: e.target.value });
                          if (validationErrors.assignment) {
                            setValidationErrors({ ...validationErrors, assignment: '' });
                          }
                        }}
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                          validationErrors.assignment ? 'border-red-500 bg-red-50' : 'border-gray-300'
                        }`}
                      >
                        <option value="">Select person (optional)...</option>
                        {availableUsers.map((user) => (
                          <option key={user.id} value={user.id}>
                            {user.full_name} ({user.role})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Assign to Department</label>
                      <select
                        value={goalForm.department_id}
                        onChange={(e) => {
                          setGoalForm({ ...goalForm, department_id: e.target.value });
                          if (validationErrors.assignment) {
                            setValidationErrors({ ...validationErrors, assignment: '' });
                          }
                        }}
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                          validationErrors.assignment ? 'border-red-500 bg-red-50' : 'border-gray-300'
                        }`}
                      >
                        <option value="">Select department (optional)...</option>
                        {departments.map((dept) => (
                          <option key={dept.id} value={dept.id}>
                            {dept.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  {validationErrors.assignment && (
                    <p className="text-red-500 text-sm mt-1">{validationErrors.assignment}</p>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                    <input
                      type="date"
                      value={goalForm.due_date}
                      onChange={(e) => setGoalForm({ ...goalForm, due_date: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                    <select
                      value={goalForm.status}
                      onChange={(e) => setGoalForm({ ...goalForm, status: e.target.value as any })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="not_started">Not Started</option>
                      <option value="in_progress">In Progress</option>
                      <option value="at_risk">At Risk</option>
                      <option value="completed">Completed</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Add Goal
                </button>
                <button
                  type="button"
                  onClick={() => setShowGoalModal(false)}
                  className="flex-1 bg-gray-200 text-gray-800 py-2 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showMilestoneModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">Add Milestone</h3>
            <form onSubmit={handleCreateMilestone}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                  <input
                    type="text"
                    value={milestoneForm.title}
                    onChange={(e) => setMilestoneForm({ ...milestoneForm, title: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    value={milestoneForm.description}
                    onChange={(e) => setMilestoneForm({ ...milestoneForm, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    rows={2}
                  />
                </div>

                {!selectedGoal?.assigned_to_id && selectedGoal?.department_id && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Assign To (Optional - department goals only)
                    </label>
                    <select
                      value={milestoneForm.assigned_to_id}
                      onChange={(e) => setMilestoneForm({ ...milestoneForm, assigned_to_id: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Unassigned</option>
                      {availableUsers.map((user) => (
                        <option key={user.id} value={user.id}>
                          {user.full_name} ({user.role})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Success Criteria</label>
                  <textarea
                    value={milestoneForm.success_criteria}
                    onChange={(e) => setMilestoneForm({ ...milestoneForm, success_criteria: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    rows={2}
                    placeholder="What does success look like?"
                  />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Target</label>
                    <input
                      type="text"
                      value={milestoneForm.target_value}
                      onChange={(e) => setMilestoneForm({ ...milestoneForm, target_value: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., 100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Current</label>
                    <input
                      type="text"
                      value={milestoneForm.current_value}
                      onChange={(e) => setMilestoneForm({ ...milestoneForm, current_value: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., 75"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
                    <input
                      type="text"
                      value={milestoneForm.measurement_unit}
                      onChange={(e) => setMilestoneForm({ ...milestoneForm, measurement_unit: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="%, £, etc"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                  <input
                    type="date"
                    value={milestoneForm.due_date}
                    onChange={(e) => setMilestoneForm({ ...milestoneForm, due_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Add Milestone
                </button>
                <button
                  type="button"
                  onClick={() => setShowMilestoneModal(false)}
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
