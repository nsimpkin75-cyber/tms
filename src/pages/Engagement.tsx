import { useState, useEffect } from 'react';
import {
  Heart,
  TrendingUp,
  CheckCircle2,
  Clock,
  XCircle,
  Plus,
  X,
  Trash2,
  Calendar,
  Users,
  Building2,
  ArrowRight,
  BarChart3,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface Outcome {
  id: string;
  survey_id: string | null;
  title: string;
  description: string;
  category: string;
  status: 'planned' | 'in_progress' | 'completed';
  created_at: string;
}

interface ActionItem {
  id: string;
  survey_id: string | null;
  department: string | null;
  title: string;
  description: string;
  assigned_to: string | null;
  status: 'open' | 'in_progress' | 'completed';
  due_date: string | null;
  completed_at: string | null;
  created_at: string;
  assignee_name?: string;
}

interface SurveyResult {
  id: string;
  title: string;
  description: string;
  status: string;
  response_count: number;
  avg_score: number;
}

const STATUS_COLORS: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  completed: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200', dot: 'bg-green-500' },
  in_progress: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', dot: 'bg-blue-500' },
  planned: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', dot: 'bg-amber-500' },
  open: { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200', dot: 'bg-gray-400' },
};

const STATUS_LABELS: Record<string, string> = {
  completed: 'Completed',
  in_progress: 'In Progress',
  planned: 'Planned',
  open: 'Open',
};

export default function EngagementPage() {
  const { profile, effectiveProfile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [outcomes, setOutcomes] = useState<Outcome[]>([]);
  const [actionItems, setActionItems] = useState<ActionItem[]>([]);
  const [surveyResults, setSurveyResults] = useState<SurveyResult[]>([]);
  const [showActionModal, setShowActionModal] = useState(false);
  const [actionForm, setActionForm] = useState({ title: '', description: '', department: '', due_date: '' });
  const [departments, setDepartments] = useState<string[]>([]);

  const isManager = effectiveProfile?.role === 'manager' || effectiveProfile?.role === 'dept_lead';
  const isLeadership = effectiveProfile?.role === 'leadership' || effectiveProfile?.role === 'senior';
  const isAdmin = profile?.role === 'admin' || profile?.admin_type != null;
  const isEmployee = !isManager && !isLeadership && !isAdmin;

  const canManageActions = isManager || isLeadership || isAdmin;
  const canManageOutcomes = isLeadership || isAdmin;
  const userDept = effectiveProfile?.department || '';

  useEffect(() => {
    fetchData();
  }, [effectiveProfile?.id]);

  async function fetchData() {
    try {
      setLoading(true);
      await Promise.all([
        fetchOutcomes(),
        fetchActionItems(),
        fetchSurveyResults(),
        fetchDepartments(),
      ]);
    } finally {
      setLoading(false);
    }
  }

  async function fetchOutcomes() {
    try {
      const { data } = await supabase
        .from('engagement_outcomes')
        .select('*')
        .order('created_at', { ascending: false });
      if (data) setOutcomes(data as Outcome[]);
    } catch (error) {
      console.error('Error fetching outcomes:', error);
    }
  }

  async function fetchActionItems() {
    try {
      const { data } = await supabase
        .from('engagement_action_items')
        .select(`
          *,
          assignee:profiles!assigned_to(full_name)
        `)
        .order('created_at', { ascending: false });

      if (data) {
        const shaped: ActionItem[] = data.map((item: any) => ({
          ...item,
          assignee_name: item.assignee?.full_name,
        }));
        setActionItems(shaped);
      }
    } catch (error) {
      console.error('Error fetching action items:', error);
    }
  }

  async function fetchSurveyResults() {
    try {
      const { data: surveys } = await supabase
        .from('engagement_surveys')
        .select('*')
        .order('created_at', { ascending: false });

      if (!surveys) return;

      const results: SurveyResult[] = [];
      for (const survey of surveys) {
        const { count } = await supabase
          .from('engagement_responses')
          .select('*', { count: 'exact', head: true })
          .eq('survey_id', survey.id);

        const { data: answers } = await supabase
          .from('engagement_response_answers')
          .select('numeric_value')
          .not('numeric_value', 'is', null);

        const numericAnswers = answers || [];
        const avg = numericAnswers.length > 0
          ? numericAnswers.reduce((sum: number, a: any) => sum + Number(a.numeric_value), 0) / numericAnswers.length
          : 0;

        results.push({
          id: survey.id,
          title: survey.title,
          description: survey.description || '',
          status: survey.status,
          response_count: count || 0,
          avg_score: Math.round(avg * 10) / 10,
        });
      }
      setSurveyResults(results);
    } catch (error) {
      console.error('Error fetching survey results:', error);
    }
  }

  async function fetchDepartments() {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('department')
        .not('department', 'is', null);
      if (data) {
        const depts = [...new Set(data.map((p: any) => p.department).filter(Boolean))] as string[];
        setDepartments(depts);
      }
    } catch (error) {
      console.error('Error fetching departments:', error);
    }
  }

  async function handleCreateAction() {
    if (!actionForm.title.trim() || !profile?.id) return;
    try {
      const { error } = await supabase.from('engagement_action_items').insert({
        title: actionForm.title,
        description: actionForm.description,
        department: actionForm.department || (isManager ? userDept : null),
        due_date: actionForm.due_date || null,
        status: 'open',
        created_by: profile.id,
      });
      if (error) throw error;
      setShowActionModal(false);
      setActionForm({ title: '', description: '', department: '', due_date: '' });
      fetchActionItems();
    } catch (error) {
      console.error('Error creating action item:', error);
      alert('Failed to create action item');
    }
  }

  async function handleUpdateActionStatus(id: string, status: 'open' | 'in_progress' | 'completed') {
    try {
      const updates: any = { status, updated_at: new Date().toISOString() };
      if (status === 'completed') updates.completed_at = new Date().toISOString();
      await supabase.from('engagement_action_items').update(updates).eq('id', id);
      fetchActionItems();
    } catch (error) {
      console.error('Error updating action:', error);
    }
  }

  async function handleDeleteAction(id: string) {
    if (!confirm('Delete this action item?')) return;
    try {
      await supabase.from('engagement_action_items').delete().eq('id', id);
      fetchActionItems();
    } catch (error) {
      console.error('Error deleting action:', error);
    }
  }

  // Filter action items by role
  const visibleActions = actionItems.filter(item => {
    if (isAdmin || isLeadership) return true;
    if (isManager) return item.department === userDept || item.assigned_to === profile?.id;
    return item.department === userDept;
  });

  const actionStats = {
    open: visibleActions.filter(a => a.status === 'open').length,
    inProgress: visibleActions.filter(a => a.status === 'in_progress').length,
    completed: visibleActions.filter(a => a.status === 'completed').length,
    total: visibleActions.length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="inline-block w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <Heart className="w-7 h-7 text-blue-600" />
          <h1 className="text-3xl font-bold text-gray-900">Engagement Hub</h1>
        </div>
        <p className="text-gray-500 ml-10">
          {isEmployee && 'See what we heard and what we\'re doing about it'}
          {isManager && 'Track and manage engagement actions for your team'}
          {(isLeadership || isAdmin) && 'Organisation-wide engagement insights and action tracking'}
        </p>
      </div>

      {/* EMPLOYEE VIEW: You Said, We Did */}
      {isEmployee && (
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-blue-600 to-teal-600 rounded-2xl p-8 text-white">
            <h2 className="text-2xl font-bold mb-2">You Said, We Did</h2>
            <p className="text-blue-100">
              Transparent outcomes from your feedback. See the changes and improvements we've made in response to what you told us.
            </p>
          </div>

          {/* Survey scores */}
          {surveyResults.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-blue-600" />
                Survey Results
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {surveyResults.map(survey => (
                  <div key={survey.id} className="border border-gray-200 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 text-sm">{survey.title}</h4>
                    <p className="text-xs text-gray-500 mt-1">{survey.description}</p>
                    <div className="flex items-center gap-4 mt-3">
                      <div className="flex items-center gap-1.5">
                        <Users className="w-4 h-4 text-gray-400" />
                        <span className="text-sm font-medium text-gray-700">{survey.response_count} responses</span>
                      </div>
                      {survey.avg_score > 0 && (
                        <div className="flex items-center gap-1.5">
                          <TrendingUp className="w-4 h-4 text-blue-500" />
                          <span className="text-sm font-medium text-blue-700">{survey.avg_score}/5 avg</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Outcomes */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900">What We've Done</h3>
              <p className="text-sm text-gray-500 mt-0.5">Changes and improvements made based on your feedback</p>
            </div>
            {outcomes.length === 0 ? (
              <div className="p-12 text-center">
                <Heart className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No outcomes published yet. Check back soon!</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {outcomes.map(outcome => {
                  const cfg = STATUS_COLORS[outcome.status] || STATUS_COLORS.planned;
                  return (
                    <div key={outcome.id} className="px-6 py-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <div className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                            <h4 className="font-medium text-gray-900">{outcome.title}</h4>
                          </div>
                          <p className="text-sm text-gray-600 ml-4">{outcome.description}</p>
                          {outcome.category && (
                            <span className="inline-block mt-2 text-xs bg-gray-50 text-gray-600 px-2 py-0.5 rounded-full border border-gray-200">
                              {outcome.category}
                            </span>
                          )}
                        </div>
                        <span className={`text-xs px-2.5 py-1 rounded-full border ${cfg.bg} ${cfg.text} ${cfg.border} flex-shrink-0`}>
                          {STATUS_LABELS[outcome.status]}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Department actions visible to employee */}
          {visibleActions.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="font-semibold text-gray-900">Actions for Your Area</h3>
              </div>
              <div className="divide-y divide-gray-100">
                {visibleActions.map(item => (
                  <div key={item.id} className="px-6 py-4 flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-gray-900 text-sm">{item.title}</h4>
                      {item.description && <p className="text-xs text-gray-500 mt-0.5">{item.description}</p>}
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${STATUS_COLORS[item.status]?.bg} ${STATUS_COLORS[item.status]?.text} ${STATUS_COLORS[item.status]?.border}`}>
                      {STATUS_LABELS[item.status]}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* SLT / MANAGER VIEW: Departmental Performance & Actions */}
      {(isManager || isLeadership) && (
        <div className="space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-2">
                <Clock className="w-5 h-5 text-gray-400" />
                <span className="text-2xl font-bold text-gray-900">{actionStats.open}</span>
              </div>
              <p className="text-sm text-gray-600">Open Actions</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-2">
                <TrendingUp className="w-5 h-5 text-blue-500" />
                <span className="text-2xl font-bold text-blue-700">{actionStats.inProgress}</span>
              </div>
              <p className="text-sm text-gray-600">In Progress</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-2">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
                <span className="text-2xl font-bold text-green-700">{actionStats.completed}</span>
              </div>
              <p className="text-sm text-gray-600">Completed</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-2">
                <BarChart3 className="w-5 h-5 text-gray-400" />
                <span className="text-2xl font-bold text-gray-900">{actionStats.total}</span>
              </div>
              <p className="text-sm text-gray-600">Total Actions</p>
            </div>
          </div>

          {/* Survey results with departmental breakdown */}
          {surveyResults.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-blue-600" />
                Survey Performance {isManager && `— ${userDept}`}
              </h3>
              <div className="space-y-3">
                {surveyResults.map(survey => (
                  <div key={survey.id} className="flex items-center justify-between border border-gray-200 rounded-lg p-4">
                    <div>
                      <h4 className="font-medium text-gray-900 text-sm">{survey.title}</h4>
                      <p className="text-xs text-gray-500 mt-0.5">{survey.response_count} responses</p>
                    </div>
                    {survey.avg_score > 0 && (
                      <div className="text-right">
                        <div className="text-2xl font-bold text-blue-700">{survey.avg_score}</div>
                        <div className="text-xs text-gray-500">avg / 5.0</div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* You Said, We Did (visible to SLT too) */}
          {outcomes.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="font-semibold text-gray-900">You Said, We Did</h3>
              </div>
              <div className="divide-y divide-gray-100">
                {outcomes.map(outcome => {
                  const cfg = STATUS_COLORS[outcome.status] || STATUS_COLORS.planned;
                  return (
                    <div key={outcome.id} className="px-6 py-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900 text-sm">{outcome.title}</h4>
                          <p className="text-xs text-gray-600 mt-0.5">{outcome.description}</p>
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-full border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
                          {STATUS_LABELS[outcome.status]}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Action Planning Tool */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-gray-900">Action Planning Tool</h3>
                <p className="text-sm text-gray-500 mt-0.5">
                  {isManager ? `Actions for ${userDept}` : 'All departmental action items'}
                </p>
              </div>
              {canManageActions && (
                <button
                  onClick={() => setShowActionModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
                >
                  <Plus className="w-4 h-4" />
                  Add Action
                </button>
              )}
            </div>

            {visibleActions.length === 0 ? (
              <div className="p-12 text-center">
                <Clock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No action items yet. Create one to start tracking.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {visibleActions.map(item => {
                  const cfg = STATUS_COLORS[item.status] || STATUS_COLORS.open;
                  return (
                    <div key={item.id} className="px-6 py-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <div className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                            <h4 className="font-medium text-gray-900 text-sm">{item.title}</h4>
                            {item.department && (
                              <span className="text-xs bg-gray-50 text-gray-600 px-2 py-0.5 rounded-full border border-gray-200 flex items-center gap-1">
                                <Building2 className="w-3 h-3" />
                                {item.department}
                              </span>
                            )}
                          </div>
                          {item.description && <p className="text-xs text-gray-600 ml-4">{item.description}</p>}
                          <div className="flex items-center gap-3 ml-4 mt-2 text-xs text-gray-500">
                            {item.assignee_name && <span>Assigned: {item.assignee_name}</span>}
                            {item.due_date && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />Due: {item.due_date}</span>}
                          </div>
                        </div>
                        {canManageActions && (
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <select
                              value={item.status}
                              onChange={(e) => handleUpdateActionStatus(item.id, e.target.value as any)}
                              className={`text-xs px-2 py-1 rounded-full border ${cfg.bg} ${cfg.text} ${cfg.border} font-medium cursor-pointer`}
                            >
                              <option value="open">Open</option>
                              <option value="in_progress">In Progress</option>
                              <option value="completed">Completed</option>
                            </select>
                            {(isAdmin || isLeadership) && (
                              <button
                                onClick={() => handleDeleteAction(item.id)}
                                className="p-1 text-red-500 hover:bg-red-50 rounded"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* EXECUTIVE / ADMIN VIEW: Organisation-wide Control */}
      {isAdmin && (
        <div className="space-y-6">
          {/* Org-wide stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl p-6 text-white">
              <BarChart3 className="w-8 h-8 mb-3 text-blue-200" />
              <div className="text-3xl font-bold">{surveyResults.reduce((sum, s) => sum + s.response_count, 0)}</div>
              <p className="text-blue-100 text-sm mt-1">Total Survey Responses</p>
            </div>
            <div className="bg-gradient-to-br from-teal-600 to-teal-700 rounded-xl p-6 text-white">
              <CheckCircle2 className="w-8 h-8 mb-3 text-teal-200" />
              <div className="text-3xl font-bold">{actionItems.filter(a => a.status === 'completed').length}</div>
              <p className="text-teal-100 text-sm mt-1">Completed Actions (Org-wide)</p>
            </div>
            <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl p-6 text-white">
              <Clock className="w-8 h-8 mb-3 text-amber-200" />
              <div className="text-3xl font-bold">{actionItems.filter(a => a.status === 'open' || a.status === 'in_progress').length}</div>
              <p className="text-amber-100 text-sm mt-1">Outstanding Actions</p>
            </div>
          </div>

          {/* Department breakdown */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900">Actions by Department</h3>
            </div>
            <div className="divide-y divide-gray-100">
              {departments.map(dept => {
                const deptActions = actionItems.filter(a => a.department === dept);
                const deptCompleted = deptActions.filter(a => a.status === 'completed').length;
                const deptPct = deptActions.length > 0 ? Math.round((deptCompleted / deptActions.length) * 100) : 0;
                return (
                  <div key={dept} className="px-6 py-4 flex items-center gap-4">
                    <Building2 className="w-5 h-5 text-gray-400 flex-shrink-0" />
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-gray-900 text-sm">{dept}</span>
                        <span className="text-sm text-gray-500">{deptCompleted}/{deptActions.length} ({deptPct}%)</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all duration-700 ${deptPct >= 80 ? 'bg-green-500' : deptPct >= 50 ? 'bg-amber-500' : 'bg-red-500'}`}
                          style={{ width: `${deptPct}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
              {departments.length === 0 && (
                <div className="p-8 text-center text-gray-500">No department data available.</div>
              )}
            </div>
          </div>

          {/* Survey trend tracking */}
          {surveyResults.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-blue-600" />
                Historical Survey Scores
              </h3>
              <div className="space-y-3">
                {surveyResults.map(survey => (
                  <div key={survey.id} className="flex items-center justify-between border border-gray-200 rounded-lg p-4">
                    <div>
                      <h4 className="font-medium text-gray-900 text-sm">{survey.title}</h4>
                      <p className="text-xs text-gray-500 mt-0.5">{survey.description}</p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                        <span className="flex items-center gap-1"><Users className="w-3 h-3" />{survey.response_count} responses</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs ${
                          survey.status === 'active' ? 'bg-green-50 text-green-700' :
                          survey.status === 'closed' ? 'bg-gray-50 text-gray-600' : 'bg-amber-50 text-amber-700'
                        }`}>{survey.status}</span>
                      </div>
                    </div>
                    {survey.avg_score > 0 && (
                      <div className="text-right">
                        <div className="text-3xl font-bold text-blue-700">{survey.avg_score}</div>
                        <div className="text-xs text-gray-500">avg / 5.0</div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* All action items */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">All Outstanding Action Items</h3>
              <button
                onClick={() => setShowActionModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
              >
                <Plus className="w-4 h-4" />
                Add Action
              </button>
            </div>
            {actionItems.length === 0 ? (
              <div className="p-12 text-center text-gray-500">No action items across the organisation.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Action</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Department</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Assignee</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Due</th>
                      <th className="px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {actionItems.map(item => {
                      const cfg = STATUS_COLORS[item.status] || STATUS_COLORS.open;
                      return (
                        <tr key={item.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <div className="font-medium text-gray-900 text-sm">{item.title}</div>
                            {item.description && <div className="text-xs text-gray-500">{item.description}</div>}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">{item.department || '—'}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{item.assignee_name || '—'}</td>
                          <td className="px-4 py-3">
                            <select
                              value={item.status}
                              onChange={(e) => handleUpdateActionStatus(item.id, e.target.value as any)}
                              className={`text-xs px-2 py-1 rounded-full border ${cfg.bg} ${cfg.text} ${cfg.border} font-medium cursor-pointer`}
                            >
                              <option value="open">Open</option>
                              <option value="in_progress">In Progress</option>
                              <option value="completed">Completed</option>
                            </select>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">{item.due_date || '—'}</td>
                          <td className="px-4 py-3">
                            <button
                              onClick={() => handleDeleteAction(item.id)}
                              className="p-1 text-red-500 hover:bg-red-50 rounded"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* You Said, We Did management */}
          {canManageOutcomes && <OutcomeManager outcomes={outcomes} onSaved={fetchOutcomes} />}
        </div>
      )}

      {/* Action modal */}
      {showActionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">New Action Item</h3>
              <button onClick={() => setShowActionModal(false)} className="p-1 hover:bg-gray-100 rounded">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <input
                  type="text"
                  value={actionForm.title}
                  onChange={(e) => setActionForm({ ...actionForm, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="What action needs to be taken?"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={actionForm.description}
                  onChange={(e) => setActionForm({ ...actionForm, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Provide details about this action..."
                />
              </div>
              {(isLeadership || isAdmin) && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                  <select
                    value={actionForm.department}
                    onChange={(e) => setActionForm({ ...actionForm, department: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="">All departments</option>
                    {departments.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                <input
                  type="date"
                  value={actionForm.due_date}
                  onChange={(e) => setActionForm({ ...actionForm, due_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={handleCreateAction}
                className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 font-medium"
              >
                Create Action
              </button>
              <button
                onClick={() => setShowActionModal(false)}
                className="flex-1 bg-gray-200 text-gray-800 py-2 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function OutcomeManager({ outcomes, onSaved }: { outcomes: Outcome[]; onSaved: () => void }) {
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', category: '', status: 'planned' as const });
  const { profile } = useAuth();

  async function handleCreate() {
    if (!form.title.trim() || !profile?.id) return;
    try {
      await supabase.from('engagement_outcomes').insert({
        title: form.title,
        description: form.description,
        category: form.category || 'general',
        status: form.status,
        created_by: profile.id,
      });
      setShowModal(false);
      setForm({ title: '', description: '', category: '', status: 'planned' });
      onSaved();
    } catch (error) {
      console.error('Error creating outcome:', error);
      alert('Failed to create outcome');
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this outcome?')) return;
    try {
      await supabase.from('engagement_outcomes').delete().eq('id', id);
      onSaved();
    } catch (error) {
      console.error('Error deleting outcome:', error);
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
        <h3 className="font-semibold text-gray-900">"You Said, We Did" Management</h3>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          Add Outcome
        </button>
      </div>
      <div className="divide-y divide-gray-100">
        {outcomes.map(outcome => {
          const cfg = STATUS_COLORS[outcome.status] || STATUS_COLORS.planned;
          return (
            <div key={outcome.id} className="px-6 py-4 flex items-start justify-between">
              <div className="flex-1">
                <h4 className="font-medium text-gray-900 text-sm">{outcome.title}</h4>
                <p className="text-xs text-gray-600 mt-0.5">{outcome.description}</p>
                <span className={`inline-block mt-2 text-xs px-2 py-0.5 rounded-full border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
                  {STATUS_LABELS[outcome.status]}
                </span>
              </div>
              <button
                onClick={() => handleDelete(outcome.id)}
                className="p-1 text-red-500 hover:bg-red-50 rounded"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          );
        })}
        {outcomes.length === 0 && (
          <div className="p-8 text-center text-gray-500">No outcomes yet. Add one to show employees what changes have been made.</div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">New Outcome</h3>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-gray-100 rounded">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. Improved flexible working policy"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Describe what was changed and how it addresses feedback..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <input
                  type="text"
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. Wellbeing, Communication, Facilities"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="planned">Planned</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={handleCreate} className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 font-medium">
                Create
              </button>
              <button onClick={() => setShowModal(false)} className="flex-1 bg-gray-200 text-gray-800 py-2 rounded-lg hover:bg-gray-300">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
