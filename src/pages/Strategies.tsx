import { useState, useEffect } from 'react';
import { Plus, Target, Users, TrendingUp, Calendar, AlertCircle, CheckCircle2, X, ArrowRight, ArrowLeft, Send, FileText, Award, Clock, CheckCircle, XCircle, CreditCard as Edit, Trash2, Eye } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { format } from 'date-fns';

interface Strategy {
  id: string;
  title: string;
  description: string | null;
  start_date: string;
  end_date: string;
  status: 'draft' | 'active' | 'completed' | 'archived';
  creator_id: string;
  created_at: string;
  creator?: { full_name: string };
}

interface FocusArea {
  id: string;
  strategy_id: string;
  title: string;
  description: string | null;
  sort_order: number;
}

interface Milestone {
  id: string;
  focus_area_id: string;
  title: string;
  description: string | null;
  target_date: string | null;
  status: 'not_started' | 'in_progress' | 'completed' | 'blocked';
}

interface StrategyLead {
  id: string;
  focus_area_id: string;
  user_id: string;
  user?: { full_name: string; role: string };
}

interface DepartmentStrategy {
  id: string;
  parent_strategy_id: string;
  focus_area_id: string;
  department: string;
  title: string;
  description: string | null;
  status: 'draft' | 'pending_approval' | 'active' | 'rejected' | 'archived';
  feedback: string | null;
  creator?: { full_name: string };
}

export default function Strategies() {
  const { profile, user, effectiveProfile, isViewingAs, guardViewAs } = useAuth();
  const activeProfile = effectiveProfile || profile;
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [selectedStrategy, setSelectedStrategy] = useState<Strategy | null>(null);
  const [focusAreas, setFocusAreas] = useState<FocusArea[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [leads, setLeads] = useState<StrategyLead[]>([]);
  const [departmentStrategies, setDepartmentStrategies] = useState<DepartmentStrategy[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingStrategy, setEditingStrategy] = useState<Strategy | null>(null);
  const [createStep, setCreateStep] = useState(1);
  const [availableUsers, setAvailableUsers] = useState<Array<{ id: string; full_name: string; role: string }>>([]);

  const [strategyForm, setStrategyForm] = useState({
    title: '',
    description: '',
    start_date: '',
    end_date: '',
    status: 'draft' as const
  });

  const [focusAreaForms, setFocusAreaForms] = useState<Array<{
    title: string;
    description: string;
    milestones: Array<{ title: string; description: string; target_date: string }>;
  }>>([{ title: '', description: '', milestones: [{ title: '', description: '', target_date: '' }] }]);

  const [leadAssignments, setLeadAssignments] = useState<Record<number, string[]>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (user) {
      fetchStrategies();
      fetchAvailableUsers();
    }
  }, [user]);

  useEffect(() => {
    if (selectedStrategy) {
      fetchStrategyDetails(selectedStrategy.id);
    }
  }, [selectedStrategy]);

  async function fetchStrategies() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('strategies')
        .select(`
          *,
          creator:profiles!strategies_creator_id_fkey(full_name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setStrategies(data || []);
    } catch (error) {
      console.error('Error fetching strategies:', error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchStrategyDetails(strategyId: string) {
    try {
      const [focusAreasRes, leadsRes, deptStrategiesRes] = await Promise.all([
        supabase
          .from('strategy_focus_areas')
          .select('*')
          .eq('strategy_id', strategyId)
          .order('sort_order'),
        supabase
          .from('strategy_leads')
          .select(`
            *,
            user:profiles!strategy_leads_user_id_fkey(full_name, role)
          `),
        supabase
          .from('department_strategies')
          .select(`
            *,
            creator:profiles!department_strategies_creator_id_fkey(full_name)
          `)
          .eq('parent_strategy_id', strategyId)
      ]);

      if (focusAreasRes.data) {
        setFocusAreas(focusAreasRes.data);
        const focusAreaIds = focusAreasRes.data.map(fa => fa.id);

        if (focusAreaIds.length > 0) {
          const { data: milestonesData } = await supabase
            .from('strategy_milestones')
            .select('*')
            .in('focus_area_id', focusAreaIds);
          setMilestones(milestonesData || []);
        }
      }

      setLeads(leadsRes.data || []);
      setDepartmentStrategies(deptStrategiesRes.data || []);
    } catch (error) {
      console.error('Error fetching strategy details:', error);
    }
  }

  async function fetchAvailableUsers() {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, role')
        .eq('active', true)
        .order('full_name');

      if (error) throw error;
      setAvailableUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  }

  function validateStep1() {
    const newErrors: Record<string, string> = {};
    if (!strategyForm.title.trim()) newErrors.title = 'Title is required';
    if (!strategyForm.start_date) newErrors.start_date = 'Start date is required';
    if (!strategyForm.end_date) newErrors.end_date = 'End date is required';
    if (strategyForm.start_date && strategyForm.end_date && strategyForm.end_date < strategyForm.start_date) {
      newErrors.end_date = 'End date cannot be before start date';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  function validateStep2() {
    const newErrors: Record<string, string> = {};
    if (focusAreaForms.length === 0 || !focusAreaForms[0].title.trim()) {
      newErrors.focus_areas = 'At least one focus area is required';
    }
    focusAreaForms.forEach((fa, idx) => {
      if (!fa.title.trim()) {
        newErrors[`focus_area_${idx}`] = 'Focus area title is required';
      }
      if (fa.milestones.length === 0 || !fa.milestones[0].title.trim()) {
        newErrors[`focus_area_${idx}_milestone`] = 'At least one milestone is required';
      }
    });
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  function addFocusArea() {
    setFocusAreaForms([...focusAreaForms, {
      title: '',
      description: '',
      milestones: [{ title: '', description: '', target_date: '' }]
    }]);
  }

  function removeFocusArea(index: number) {
    const newForms = focusAreaForms.filter((_, i) => i !== index);
    setFocusAreaForms(newForms.length > 0 ? newForms : [{ title: '', description: '', milestones: [{ title: '', description: '', target_date: '' }] }]);
  }

  function addMilestone(focusIndex: number) {
    const newForms = [...focusAreaForms];
    newForms[focusIndex].milestones.push({ title: '', description: '', target_date: '' });
    setFocusAreaForms(newForms);
  }

  function removeMilestone(focusIndex: number, milestoneIndex: number) {
    const newForms = [...focusAreaForms];
    newForms[focusIndex].milestones = newForms[focusIndex].milestones.filter((_, i) => i !== milestoneIndex);
    if (newForms[focusIndex].milestones.length === 0) {
      newForms[focusIndex].milestones = [{ title: '', description: '', target_date: '' }];
    }
    setFocusAreaForms(newForms);
  }

  function updateFocusArea(index: number, field: string, value: string) {
    const newForms = [...focusAreaForms];
    (newForms[index] as any)[field] = value;
    setFocusAreaForms(newForms);
  }

  function updateMilestone(focusIndex: number, milestoneIndex: number, field: string, value: string) {
    const newForms = [...focusAreaForms];
    (newForms[focusIndex].milestones[milestoneIndex] as any)[field] = value;
    setFocusAreaForms(newForms);
  }

  function toggleLeadAssignment(focusIndex: number, userId: string) {
    const current = leadAssignments[focusIndex] || [];
    setLeadAssignments({
      ...leadAssignments,
      [focusIndex]: current.includes(userId)
        ? current.filter(id => id !== userId)
        : [...current, userId]
    });
  }

  async function handleCreateStrategy() {
    if (guardViewAs()) return;
    if (createStep === 1 && !validateStep1()) return;
    if (createStep === 2 && !validateStep2()) return;

    if (createStep < 3) {
      setCreateStep(createStep + 1);
      return;
    }

    try {
      const { data: strategy, error: strategyError } = await supabase
        .from('strategies')
        .insert([{
          title: strategyForm.title,
          description: strategyForm.description,
          start_date: strategyForm.start_date,
          end_date: strategyForm.end_date,
          status: strategyForm.status,
          creator_id: user?.id
        }])
        .select()
        .single();

      if (strategyError) throw strategyError;

      for (let i = 0; i < focusAreaForms.length; i++) {
        const focusForm = focusAreaForms[i];
        const { data: focusArea, error: focusError } = await supabase
          .from('strategy_focus_areas')
          .insert([{
            strategy_id: strategy.id,
            title: focusForm.title,
            description: focusForm.description,
            sort_order: i
          }])
          .select()
          .single();

        if (focusError) throw focusError;

        for (const milestone of focusForm.milestones) {
          if (milestone.title.trim()) {
            await supabase.from('strategy_milestones').insert([{
              focus_area_id: focusArea.id,
              title: milestone.title,
              description: milestone.description,
              target_date: milestone.target_date || null,
              status: 'not_started'
            }]);
          }
        }

        const assignedLeads = leadAssignments[i] || [];
        if (assignedLeads.length > 0 && strategyForm.status === 'active') {
          for (const userId of assignedLeads) {
            await supabase.from('strategy_leads').insert([{
              focus_area_id: focusArea.id,
              user_id: userId,
              assigned_by: user?.id
            }]);

            await supabase.from('strategy_notifications').insert([{
              strategy_id: strategy.id,
              user_id: userId,
              notification_type: 'strategy_assigned',
              message: `You have been assigned as a lead for "${focusForm.title}" in strategy "${strategyForm.title}"`
            }]);
          }
        }
      }

      setShowCreateModal(false);
      resetForm();
      fetchStrategies();
    } catch (error) {
      console.error('Error creating strategy:', error);
      alert('Failed to create strategy. Please try again.');
    }
  }

  function resetForm() {
    setStrategyForm({ title: '', description: '', start_date: '', end_date: '', status: 'draft' });
    setFocusAreaForms([{ title: '', description: '', milestones: [{ title: '', description: '', target_date: '' }] }]);
    setLeadAssignments({});
    setCreateStep(1);
    setErrors({});
    setEditingStrategy(null);
  }

  function openEditModal(strategy: Strategy) {
    setEditingStrategy(strategy);
    setStrategyForm({
      title: strategy.title,
      description: strategy.description || '',
      start_date: strategy.start_date,
      end_date: strategy.end_date,
      status: strategy.status
    });
    setShowEditModal(true);
  }

  async function handleUpdateStrategy() {
    if (!editingStrategy || guardViewAs()) return;

    const newErrors: Record<string, string> = {};
    if (!strategyForm.title.trim()) newErrors.title = 'Title is required';
    if (!strategyForm.start_date) newErrors.start_date = 'Start date is required';
    if (!strategyForm.end_date) newErrors.end_date = 'End date is required';
    if (strategyForm.start_date && strategyForm.end_date && strategyForm.end_date < strategyForm.start_date) {
      newErrors.end_date = 'End date cannot be before start date';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      const { error } = await supabase
        .from('strategies')
        .update({
          title: strategyForm.title,
          description: strategyForm.description,
          start_date: strategyForm.start_date,
          end_date: strategyForm.end_date,
          status: strategyForm.status,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingStrategy.id);

      if (error) throw error;

      if (strategyForm.status === 'active' && editingStrategy.status !== 'active') {
        const { data: strategyLeads } = await supabase
          .from('strategy_leads')
          .select('user_id, focus_area_id')
          .in('focus_area_id', focusAreas.map(fa => fa.id));

        if (strategyLeads && strategyLeads.length > 0) {
          for (const lead of strategyLeads) {
            await supabase.from('strategy_notifications').insert([{
              strategy_id: editingStrategy.id,
              user_id: lead.user_id,
              notification_type: 'status_changed',
              message: `Strategy "${strategyForm.title}" is now active`
            }]);
          }
        }
      }

      setShowEditModal(false);
      resetForm();
      await fetchStrategies();

      const updatedStrategy = strategies.find(s => s.id === editingStrategy.id);
      if (updatedStrategy) {
        setSelectedStrategy({ ...updatedStrategy, ...strategyForm });
      }
    } catch (error) {
      console.error('Error updating strategy:', error);
      alert('Failed to update strategy. Please try again.');
    }
  }

  function getStatusColor(status: string) {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'active': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      case 'archived': return 'bg-slate-100 text-slate-600';
      case 'pending_approval': return 'bg-yellow-100 text-yellow-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }

  function getMilestoneStatusIcon(status: string) {
    switch (status) {
      case 'completed': return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'in_progress': return <Clock className="w-5 h-5 text-blue-600" />;
      case 'blocked': return <XCircle className="w-5 h-5 text-red-600" />;
      default: return <AlertCircle className="w-5 h-5 text-gray-400" />;
    }
  }

  const isAdmin = (activeProfile?.role === 'admin' || activeProfile?.role === 'leadership') && !isViewingAs;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Strategies</h1>
          <p className="text-slate-600 mt-2">
            Define and manage organizational and department-level strategies
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn-primary flex items-center gap-2 self-start sm:self-center"
          >
            <Plus className="w-5 h-5" />
            Add Strategy
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : strategies.length === 0 ? (
        <div className="card text-center py-12">
          <Target className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Strategies Yet</h3>
          <p className="text-gray-600 mb-4">
            Create your first strategy to align organizational goals
          </p>
          {isAdmin && (
            <button onClick={() => setShowCreateModal(true)} className="btn-primary inline-flex items-center gap-2">
              <Plus className="w-5 h-5" />
              Create Strategy
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-4">
            <h2 className="text-xl font-semibold text-slate-900">All Strategies</h2>
            {strategies.map((strategy) => (
              <div
                key={strategy.id}
                onClick={() => setSelectedStrategy(strategy)}
                className={`card cursor-pointer transition-all ${
                  selectedStrategy?.id === strategy.id
                    ? 'ring-2 ring-blue-500 bg-blue-50'
                    : 'hover:shadow-md'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold text-slate-900">{strategy.title}</h3>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(strategy.status)}`}>
                    {strategy.status}
                  </span>
                </div>
                <p className="text-sm text-slate-600 mb-3 line-clamp-2">{strategy.description}</p>
                <div className="flex items-center gap-4 text-xs text-slate-500">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {format(new Date(strategy.start_date), 'MMM d, yyyy')}
                  </span>
                  <span>→</span>
                  <span>{format(new Date(strategy.end_date), 'MMM d, yyyy')}</span>
                </div>
              </div>
            ))}
          </div>

          {selectedStrategy && (
            <div className="lg:col-span-2 space-y-6">
              <div className="card">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h2 className="text-2xl font-bold text-slate-900 mb-2">{selectedStrategy.title}</h2>
                    <p className="text-slate-600">{selectedStrategy.description}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(selectedStrategy.status)}`}>
                      {selectedStrategy.status}
                    </span>
                    {(isAdmin || selectedStrategy.creator_id === user?.id) && (
                      <button
                        onClick={() => openEditModal(selectedStrategy)}
                        className="p-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Edit strategy"
                      >
                        <Edit className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-6 text-sm">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    <span className="text-slate-600">
                      {format(new Date(selectedStrategy.start_date), 'MMM d, yyyy')} - {format(new Date(selectedStrategy.end_date), 'MMM d, yyyy')}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-slate-400" />
                    <span className="text-slate-600">{selectedStrategy.creator?.full_name}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-xl font-semibold text-slate-900">Focus Areas</h3>
                {focusAreas.length === 0 ? (
                  <div className="card text-center py-8">
                    <Target className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                    <p className="text-gray-600">No focus areas defined yet</p>
                  </div>
                ) : (
                  focusAreas.map((focusArea) => {
                    const focusMilestones = milestones.filter(m => m.focus_area_id === focusArea.id);
                    const focusLeads = leads.filter(l => l.focus_area_id === focusArea.id);

                    return (
                      <div key={focusArea.id} className="card">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <h4 className="text-lg font-semibold text-slate-900 mb-1">{focusArea.title}</h4>
                            {focusArea.description && (
                              <p className="text-sm text-slate-600 mb-3">{focusArea.description}</p>
                            )}
                          </div>
                        </div>

                        {focusLeads.length > 0 && (
                          <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                            <div className="flex items-center gap-2 mb-2">
                              <Award className="w-4 h-4 text-blue-600" />
                              <span className="text-sm font-medium text-blue-900">Strategy Leads</span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {focusLeads.map(lead => (
                                <span key={lead.id} className="px-2 py-1 bg-white text-sm text-blue-800 rounded border border-blue-300">
                                  {lead.user?.full_name}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="space-y-2">
                          <h5 className="text-sm font-semibold text-slate-700">Milestones</h5>
                          {focusMilestones.length === 0 ? (
                            <p className="text-sm text-slate-500">No milestones yet</p>
                          ) : (
                            <div className="space-y-2">
                              {focusMilestones.map(milestone => (
                                <div key={milestone.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                                  {getMilestoneStatusIcon(milestone.status)}
                                  <div className="flex-1">
                                    <div className="font-medium text-sm text-slate-900">{milestone.title}</div>
                                    {milestone.description && (
                                      <div className="text-xs text-slate-600 mt-1">{milestone.description}</div>
                                    )}
                                  </div>
                                  {milestone.target_date && (
                                    <span className="text-xs text-slate-500">
                                      Due: {format(new Date(milestone.target_date), 'MMM d, yyyy')}
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {departmentStrategies.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-xl font-semibold text-slate-900">Department Strategies</h3>
                  {departmentStrategies.map(deptStrategy => (
                    <div key={deptStrategy.id} className="card border-l-4 border-purple-500">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h4 className="font-semibold text-slate-900">{deptStrategy.title}</h4>
                          <p className="text-sm text-slate-600 mt-1">{deptStrategy.department}</p>
                        </div>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(deptStrategy.status)}`}>
                          {deptStrategy.status}
                        </span>
                      </div>
                      {deptStrategy.description && (
                        <p className="text-sm text-slate-700 mb-2">{deptStrategy.description}</p>
                      )}
                      <div className="text-xs text-slate-500">
                        Created by: {deptStrategy.creator?.full_name}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Create New Strategy</h2>
                <p className="text-slate-600 text-sm mt-1">Step {createStep} of 3</p>
              </div>
              <button onClick={() => { setShowCreateModal(false); resetForm(); }} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6">
              <div className="flex items-center justify-center mb-8">
                <div className="flex items-center gap-2">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${createStep >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'}`}>
                    1
                  </div>
                  <div className={`w-20 h-1 ${createStep >= 2 ? 'bg-blue-600' : 'bg-gray-200'}`} />
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${createStep >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'}`}>
                    2
                  </div>
                  <div className={`w-20 h-1 ${createStep >= 3 ? 'bg-blue-600' : 'bg-gray-200'}`} />
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${createStep >= 3 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'}`}>
                    3
                  </div>
                </div>
              </div>

              {createStep === 1 && (
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold text-slate-900">Strategy Details</h3>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Title <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={strategyForm.title}
                      onChange={(e) => setStrategyForm({ ...strategyForm, title: e.target.value })}
                      className={`input-field w-full ${errors.title ? 'border-red-500' : ''}`}
                      placeholder="e.g., Q1 2024 Growth Strategy"
                    />
                    {errors.title && <p className="text-red-500 text-sm mt-1">{errors.title}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                    <textarea
                      value={strategyForm.description}
                      onChange={(e) => setStrategyForm({ ...strategyForm, description: e.target.value })}
                      className="input-field w-full"
                      rows={4}
                      placeholder="Describe the strategy objectives and goals..."
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Start Date <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="date"
                        value={strategyForm.start_date}
                        onChange={(e) => setStrategyForm({ ...strategyForm, start_date: e.target.value })}
                        className={`input-field w-full ${errors.start_date ? 'border-red-500' : ''}`}
                      />
                      {errors.start_date && <p className="text-red-500 text-sm mt-1">{errors.start_date}</p>}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        End Date <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="date"
                        value={strategyForm.end_date}
                        onChange={(e) => setStrategyForm({ ...strategyForm, end_date: e.target.value })}
                        className={`input-field w-full ${errors.end_date ? 'border-red-500' : ''}`}
                      />
                      {errors.end_date && <p className="text-red-500 text-sm mt-1">{errors.end_date}</p>}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                    <select
                      value={strategyForm.status}
                      onChange={(e) => setStrategyForm({ ...strategyForm, status: e.target.value as any })}
                      className="input-field w-full"
                    >
                      <option value="draft">Draft</option>
                      <option value="active">Active</option>
                      <option value="completed">Completed</option>
                      <option value="archived">Archived</option>
                    </select>
                    <p className="text-sm text-gray-500 mt-1">
                      {strategyForm.status === 'draft' && 'Draft strategies are visible only to you'}
                      {strategyForm.status === 'active' && 'Active strategies will notify assigned leads and appear on dashboards'}
                    </p>
                  </div>
                </div>
              )}

              {createStep === 2 && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-slate-900">Focus Areas & Milestones</h3>
                    <button onClick={addFocusArea} className="btn-secondary text-sm flex items-center gap-1">
                      <Plus className="w-4 h-4" />
                      Add Focus Area
                    </button>
                  </div>

                  {errors.focus_areas && <p className="text-red-500 text-sm">{errors.focus_areas}</p>}

                  {focusAreaForms.map((focusForm, focusIdx) => (
                    <div key={focusIdx} className="border border-gray-200 rounded-lg p-4 space-y-4">
                      <div className="flex items-start justify-between">
                        <h4 className="font-medium text-slate-900">Focus Area {focusIdx + 1}</h4>
                        {focusAreaForms.length > 1 && (
                          <button onClick={() => removeFocusArea(focusIdx)} className="text-red-500 hover:text-red-700">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Title <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={focusForm.title}
                          onChange={(e) => updateFocusArea(focusIdx, 'title', e.target.value)}
                          className={`input-field w-full ${errors[`focus_area_${focusIdx}`] ? 'border-red-500' : ''}`}
                          placeholder="e.g., Customer Acquisition"
                        />
                        {errors[`focus_area_${focusIdx}`] && <p className="text-red-500 text-sm mt-1">{errors[`focus_area_${focusIdx}`]}</p>}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                        <textarea
                          value={focusForm.description}
                          onChange={(e) => updateFocusArea(focusIdx, 'description', e.target.value)}
                          className="input-field w-full"
                          rows={2}
                          placeholder="Describe this focus area..."
                        />
                      </div>

                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <label className="block text-sm font-medium text-gray-700">
                            Milestones <span className="text-red-500">*</span>
                          </label>
                          <button onClick={() => addMilestone(focusIdx)} className="text-blue-600 hover:text-blue-700 text-sm flex items-center gap-1">
                            <Plus className="w-3 h-3" />
                            Add Milestone
                          </button>
                        </div>
                        {errors[`focus_area_${focusIdx}_milestone`] && <p className="text-red-500 text-sm">{errors[`focus_area_${focusIdx}_milestone`]}</p>}

                        {focusForm.milestones.map((milestone, milestoneIdx) => (
                          <div key={milestoneIdx} className="flex gap-2 items-start bg-gray-50 p-3 rounded">
                            <div className="flex-1 space-y-2">
                              <input
                                type="text"
                                value={milestone.title}
                                onChange={(e) => updateMilestone(focusIdx, milestoneIdx, 'title', e.target.value)}
                                className="input-field w-full"
                                placeholder="Milestone title"
                              />
                              <input
                                type="text"
                                value={milestone.description}
                                onChange={(e) => updateMilestone(focusIdx, milestoneIdx, 'description', e.target.value)}
                                className="input-field w-full text-sm"
                                placeholder="Description (optional)"
                              />
                              <input
                                type="date"
                                value={milestone.target_date}
                                onChange={(e) => updateMilestone(focusIdx, milestoneIdx, 'target_date', e.target.value)}
                                className="input-field w-full text-sm"
                              />
                            </div>
                            {focusForm.milestones.length > 1 && (
                              <button onClick={() => removeMilestone(focusIdx, milestoneIdx)} className="text-red-500 hover:text-red-700 mt-2">
                                <X className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {createStep === 3 && (
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold text-slate-900">Assign Strategy Leads</h3>
                  <p className="text-sm text-slate-600">
                    Assign leads to each focus area. They will be able to create department strategies and manage progress.
                  </p>

                  {focusAreaForms.map((focusForm, focusIdx) => (
                    <div key={focusIdx} className="border border-gray-200 rounded-lg p-4 space-y-3">
                      <h4 className="font-medium text-slate-900">{focusForm.title}</h4>
                      <div className="grid grid-cols-2 gap-2">
                        {availableUsers.map(user => (
                          <label key={user.id} className="flex items-center gap-2 p-2 border border-gray-200 rounded hover:bg-gray-50 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={(leadAssignments[focusIdx] || []).includes(user.id)}
                              onChange={() => toggleLeadAssignment(focusIdx, user.id)}
                              className="w-4 h-4 text-blue-600"
                            />
                            <div className="text-sm">
                              <div className="font-medium text-slate-900">{user.full_name}</div>
                              <div className="text-xs text-slate-500 capitalize">{user.role}</div>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="sticky bottom-0 bg-white border-t border-gray-200 p-6 flex items-center justify-between">
              <button
                onClick={() => {
                  if (createStep > 1) setCreateStep(createStep - 1);
                  else { setShowCreateModal(false); resetForm(); }
                }}
                className="btn-secondary flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                {createStep > 1 ? 'Back' : 'Cancel'}
              </button>
              <button
                onClick={handleCreateStrategy}
                className="btn-primary flex items-center gap-2"
              >
                {createStep < 3 ? (
                  <>
                    Next
                    <ArrowRight className="w-4 h-4" />
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Create Strategy
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {showEditModal && editingStrategy && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Edit Strategy</h2>
                <p className="text-slate-600 text-sm mt-1">Update strategy details and status</p>
              </div>
              <button onClick={() => { setShowEditModal(false); resetForm(); }} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={strategyForm.title}
                  onChange={(e) => setStrategyForm({ ...strategyForm, title: e.target.value })}
                  className={`input-field w-full ${errors.title ? 'border-red-500' : ''}`}
                  placeholder="e.g., Q1 2024 Growth Strategy"
                />
                {errors.title && <p className="text-red-500 text-sm mt-1">{errors.title}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea
                  value={strategyForm.description}
                  onChange={(e) => setStrategyForm({ ...strategyForm, description: e.target.value })}
                  className="input-field w-full"
                  rows={4}
                  placeholder="Describe the strategy objectives and goals..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Start Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={strategyForm.start_date}
                    onChange={(e) => setStrategyForm({ ...strategyForm, start_date: e.target.value })}
                    className={`input-field w-full ${errors.start_date ? 'border-red-500' : ''}`}
                  />
                  {errors.start_date && <p className="text-red-500 text-sm mt-1">{errors.start_date}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    End Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={strategyForm.end_date}
                    onChange={(e) => setStrategyForm({ ...strategyForm, end_date: e.target.value })}
                    className={`input-field w-full ${errors.end_date ? 'border-red-500' : ''}`}
                  />
                  {errors.end_date && <p className="text-red-500 text-sm mt-1">{errors.end_date}</p>}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                <select
                  value={strategyForm.status}
                  onChange={(e) => setStrategyForm({ ...strategyForm, status: e.target.value as any })}
                  className="input-field w-full"
                >
                  <option value="draft">Draft</option>
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                  <option value="archived">Archived</option>
                </select>
                <p className="text-sm text-gray-500 mt-1">
                  {strategyForm.status === 'draft' && 'Draft strategies are visible only to you'}
                  {strategyForm.status === 'active' && 'Active strategies notify assigned leads and appear on dashboards'}
                  {strategyForm.status === 'completed' && 'Completed strategies are read-only'}
                  {strategyForm.status === 'archived' && 'Archived strategies remain visible for reporting but not editable'}
                </p>
              </div>

              {editingStrategy.status !== 'active' && strategyForm.status === 'active' && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-blue-900 mb-1">Activating Strategy</h4>
                      <p className="text-sm text-blue-700">
                        Changing status to Active will notify all assigned strategy leads and display this strategy on their dashboards.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="sticky bottom-0 bg-white border-t border-gray-200 p-6 flex items-center justify-between">
              <button
                onClick={() => { setShowEditModal(false); resetForm(); }}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateStrategy}
                className="btn-primary flex items-center gap-2"
              >
                <CheckCircle className="w-4 h-4" />
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
