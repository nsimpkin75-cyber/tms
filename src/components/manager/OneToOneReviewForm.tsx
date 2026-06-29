import { useState, useEffect } from 'react';
import { Calendar, Save, TrendingUp, User, AlertCircle, CheckCircle2, Clock } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { format } from 'date-fns';

interface ReviewInstance {
  id: string;
  cycle_id: string;
  employee_id: string;
  manager_id: string;
  template_id: string | null;
  template_type: string;
  status: string;
  last_weekly_checkin_date: string | null;
  total_weekly_checkins: number;
  last_monthly_review_date: string | null;
  total_monthly_reviews: number;
  half_year_unlocked: boolean;
  half_year_completed: boolean;
  employee: {
    full_name: string;
    email: string;
  };
}

interface TemplateKPI {
  id: string;
  kpi_title: string;
  kpi_target: string;
  underperforming_definition: string | null;
  on_target_definition: string | null;
  above_target_definition: string | null;
  over_achieving_definition: string | null;
  is_from_strategy: boolean;
  can_remove: boolean;
  sort_order: number;
}

interface KPIRating {
  template_kpi_id: string;
  rating: number;
  comment: string;
}

interface ReviewAction {
  id?: string;
  action_title: string;
  action_owner: string;
  target_date: string;
  status: string;
  is_overdue: boolean;
  is_carried_forward?: boolean;
}

interface CompetencyRating {
  competency_id: string;
  rating: number;
  manager_comment: string;
  evidence?: string;
}

export function OneToOneReviewForm({
  reviewInstanceId,
  onClose,
  onSave
}: {
  reviewInstanceId: string;
  onClose: () => void;
  onSave?: () => void;
}) {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<'weekly' | 'monthly' | 'halfyear'>('weekly');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [reviewInstance, setReviewInstance] = useState<ReviewInstance | null>(null);
  const [templateKPIs, setTemplateKPIs] = useState<TemplateKPI[]>([]);
  const [kpiRatings, setKpiRatings] = useState<KPIRating[]>([]);
  const [actions, setActions] = useState<ReviewAction[]>([]);
  const [competencies, setCompetencies] = useState<any[]>([]);
  const [competencyRatings, setCompetencyRatings] = useState<CompetencyRating[]>([]);
  const [aiSummary, setAiSummary] = useState('');
  const [managerSummary, setManagerSummary] = useState('');

  useEffect(() => {
    loadReviewData();
  }, [reviewInstanceId]);

  async function loadReviewData() {
    try {
      setLoading(true);

      const { data: instance, error: instanceError } = await supabase
        .from('review_instances')
        .select(`
          *,
          employee:profiles!review_instances_employee_id_fkey(full_name, email)
        `)
        .eq('id', reviewInstanceId)
        .single();

      if (instanceError) throw instanceError;
      setReviewInstance(instance);

      const { data: cycleKpis, error: kpisError } = await supabase
        .from('review_cycle_kpis')
        .select('*')
        .eq('cycle_id', instance.cycle_id)
        .order('sort_order');

      if (kpisError) throw kpisError;

      const mappedKpis = cycleKpis?.map(kpi => ({
        id: kpi.id,
        kpi_title: kpi.kpi_name,
        kpi_target: kpi.kpi_target || '',
        underperforming_definition: null,
        on_target_definition: null,
        above_target_definition: null,
        over_achieving_definition: null,
        is_from_strategy: kpi.from_strategy || false,
        can_remove: kpi.can_remove || true,
        sort_order: kpi.sort_order || 0
      })) || [];

      setTemplateKPIs(mappedKpis);

      setKpiRatings(mappedKpis.map(kpi => ({
        template_kpi_id: kpi.id,
        rating: 3,
        comment: ''
      })));

      const { data: employeeActions, error: actionsError } = await supabase
        .from('review_employee_actions')
        .select('*')
        .eq('cycle_id', instance.cycle_id)
        .eq('employee_id', instance.employee_id)
        .order('created_at', { ascending: false });

      if (actionsError) throw actionsError;

      if (employeeActions && employeeActions.length > 0) {
        setActions(employeeActions.map(action => ({
          id: action.id,
          action_title: action.action_title,
          action_owner: action.action_owner,
          target_date: action.target_date || '',
          status: action.status,
          is_overdue: action.is_overdue,
          is_carried_forward: action.is_carried_forward
        })));
      } else {
        setActions([{
          action_title: '',
          action_owner: instance.employee_id,
          target_date: '',
          status: 'in_progress',
          is_overdue: false
        }]);
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('job_family_id')
        .eq('id', instance.employee_id)
        .single();

      if (profile?.job_family_id) {
        const { data: jfcData, error: compsError } = await supabase
          .from('job_family_competencies')
          .select(`
            competency_id,
            required_level_id,
            competencies!inner(id, title, description),
            competency_levels!inner(level_number, level_name)
          `)
          .eq('job_family_id', profile.job_family_id)
          .order('sort_order');

        if (!compsError && jfcData) {
          const comps = jfcData.map((jfc: any) => ({
            id: jfc.competency_id,
            name: jfc.competencies.title,
            description: jfc.competencies.description
          }));

          setCompetencies(comps);
          setCompetencyRatings(comps.map(c => ({
            competency_id: c.id,
            rating: 3,
            manager_comment: ''
          })));
        }
      }

    } catch (error) {
      console.error('Error loading review data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveWeekly() {
    if (!reviewInstance || !profile) return;

    setSaving(true);
    try {
      const reviewDate = new Date().toISOString().split('T')[0];

      for (const kpiRating of kpiRatings) {
        if (kpiRating.comment) {
          await supabase
            .from('review_kpi_ratings')
            .insert({
              review_instance_id: reviewInstanceId,
              template_kpi_id: kpiRating.template_kpi_id,
              review_type: 'weekly',
              review_date: reviewDate,
              rating: kpiRating.rating,
              comment: kpiRating.comment,
              recorded_by: profile.id
            });
        }
      }

      for (const action of actions) {
        if (action.action_title.trim()) {
          if (action.id) {
            await supabase
              .from('review_employee_actions')
              .update({
                status: action.status,
                target_date: action.target_date
              })
              .eq('id', action.id);
          } else {
            await supabase
              .from('review_employee_actions')
              .insert({
                cycle_id: reviewInstance.cycle_id,
                employee_id: reviewInstance.employee_id,
                action_title: action.action_title,
                action_owner: reviewInstance.employee_id,
                target_date: action.target_date,
                status: 'in_progress',
                is_overdue: false
              });
          }
        }
      }

      if (managerSummary) {
        await supabase
          .from('review_summaries')
          .upsert({
            review_instance_id: reviewInstanceId,
            review_type: 'weekly',
            review_date: reviewDate,
            manager_edited_summary: managerSummary,
            ai_generated_summary: aiSummary
          });
      }

      await supabase
        .from('review_instances')
        .update({
          last_weekly_checkin_date: reviewDate,
          total_weekly_checkins: reviewInstance.total_weekly_checkins + 1,
          status: 'in_progress'
        })
        .eq('id', reviewInstanceId);

      onSave?.();
      onClose();
    } catch (error) {
      console.error('Error saving weekly check-in:', error);
      alert('Failed to save check-in');
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveMonthly() {
    if (!reviewInstance || !profile) return;

    setSaving(true);
    try {
      const reviewDate = new Date().toISOString().split('T')[0];

      for (const kpiRating of kpiRatings) {
        if (kpiRating.comment) {
          await supabase
            .from('review_kpi_ratings')
            .insert({
              review_instance_id: reviewInstanceId,
              template_kpi_id: kpiRating.template_kpi_id,
              review_type: 'monthly',
              review_date: reviewDate,
              rating: kpiRating.rating,
              comment: kpiRating.comment,
              recorded_by: profile.id
            });
        }
      }

      for (const compRating of competencyRatings) {
        if (compRating.manager_comment) {
          await supabase
            .from('review_competency_ratings')
            .insert({
              review_instance_id: reviewInstanceId,
              competency_id: compRating.competency_id,
              review_type: 'monthly',
              review_date: reviewDate,
              rating: compRating.rating,
              manager_comment: compRating.manager_comment,
              evidence: compRating.evidence,
              recorded_by: profile.id
            });
        }
      }

      await supabase
        .from('review_instances')
        .update({
          last_monthly_review_date: reviewDate,
          total_monthly_reviews: reviewInstance.total_monthly_reviews + 1,
          status: 'in_progress'
        })
        .eq('id', reviewInstanceId);

      onSave?.();
      onClose();
    } catch (error) {
      console.error('Error saving monthly review:', error);
      alert('Failed to save review');
    } finally {
      setSaving(false);
    }
  }

  const getRatingLabel = (rating: number) => {
    const labels = ['New to Role', 'Under Target', 'Developing', 'On Target', 'Above Target'];
    return labels[rating] || '';
  };

  const getRatingColor = (rating: number) => {
    if (rating <= 1) return 'text-red-600 bg-red-50 border-red-200';
    if (rating === 2) return 'text-orange-600 bg-orange-50 border-orange-200';
    if (rating === 3) return 'text-blue-600 bg-blue-50 border-blue-200';
    return 'text-green-600 bg-green-50 border-green-200';
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-2xl p-8">
          <div className="text-center">Loading review...</div>
        </div>
      </div>
    );
  }

  if (!reviewInstance) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full my-8">
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">One-to-One Review</h2>
              <p className="text-sm text-slate-600 mt-1">
                {reviewInstance.employee.full_name} • {reviewInstance.template_type === 'strategy_linked' ? 'Strategy Linked' : reviewInstance.template_type === 'probation' ? 'Probation' : 'Generic One to One'}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600"
            >
              <span className="text-2xl">&times;</span>
            </button>
          </div>
        </div>

        <div className="flex border-b border-slate-200 px-6 bg-slate-50">
          <button
            onClick={() => setActiveTab('weekly')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'weekly'
                ? 'text-blue-600 border-b-2 border-blue-600 bg-white'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Weekly Check-In
          </button>
          <button
            onClick={() => setActiveTab('monthly')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'monthly'
                ? 'text-blue-600 border-b-2 border-blue-600 bg-white'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Monthly One to One
          </button>
          <button
            onClick={() => setActiveTab('halfyear')}
            disabled={!reviewInstance.half_year_unlocked}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'halfyear'
                ? 'text-blue-600 border-b-2 border-blue-600 bg-white'
                : reviewInstance.half_year_unlocked
                  ? 'text-slate-600 hover:text-slate-900'
                  : 'text-slate-400 cursor-not-allowed'
            }`}
          >
            Half Year Review
            {!reviewInstance.half_year_unlocked && (
              <span className="ml-2 text-xs bg-slate-200 px-2 py-1 rounded">Locked</span>
            )}
          </button>
        </div>

        <div className="p-6 max-h-[calc(100vh-300px)] overflow-y-auto">
          {activeTab === 'weekly' && (
            <div className="space-y-6">
              <div className="card bg-blue-50 border-blue-200">
                <div className="flex items-start gap-3">
                  <Calendar className="w-5 h-5 text-blue-600 mt-1" />
                  <div>
                    <h3 className="font-semibold text-blue-900">Weekly Check-In #{reviewInstance.total_weekly_checkins + 1}</h3>
                    <p className="text-sm text-blue-700 mt-1">
                      Quick progress update on KPIs and actions
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-slate-900">Key Performance Indicators</h3>
                {templateKPIs.map((kpi, index) => {
                  const rating = kpiRatings.find(r => r.template_kpi_id === kpi.id);
                  return (
                    <div key={kpi.id} className="card">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h4 className="font-medium text-slate-900">{kpi.kpi_title}</h4>
                          {kpi.kpi_target && (
                            <p className="text-sm text-slate-600 mt-1">Target: {kpi.kpi_target}</p>
                          )}
                        </div>
                        {kpi.is_from_strategy && (
                          <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs font-medium rounded">
                            Strategy KPI
                          </span>
                        )}
                      </div>

                      <div className="mb-3">
                        <label className="block text-sm font-medium text-slate-700 mb-2">Rating</label>
                        <div className="flex gap-2">
                          {[0, 1, 2, 3, 4].map((value) => (
                            <button
                              key={value}
                              type="button"
                              onClick={() => {
                                const newRatings = [...kpiRatings];
                                const idx = newRatings.findIndex(r => r.template_kpi_id === kpi.id);
                                if (idx >= 0) {
                                  newRatings[idx].rating = value;
                                  setKpiRatings(newRatings);
                                }
                              }}
                              className={`flex-1 py-2 px-3 text-sm rounded-lg border-2 transition-colors ${
                                rating?.rating === value
                                  ? getRatingColor(value) + ' font-medium'
                                  : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                              }`}
                            >
                              {value} - {getRatingLabel(value)}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Comment</label>
                        <textarea
                          value={rating?.comment || ''}
                          onChange={(e) => {
                            const newRatings = [...kpiRatings];
                            const idx = newRatings.findIndex(r => r.template_kpi_id === kpi.id);
                            if (idx >= 0) {
                              newRatings[idx].comment = e.target.value;
                              setKpiRatings(newRatings);
                            }
                          }}
                          className="input-field min-h-[80px]"
                          placeholder="Brief comment on progress this week..."
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-slate-900">Actions</h3>
                  <button
                    onClick={() => setActions([...actions, {
                      action_title: '',
                      action_owner: reviewInstance.employee_id,
                      target_date: '',
                      status: 'in_progress',
                      is_overdue: false
                    }])}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    + Add Action
                  </button>
                </div>

                {actions.map((action, index) => (
                  <div key={index} className={`card ${action.is_overdue ? 'border-red-300 bg-red-50' : ''}`}>
                    <div className="flex gap-4">
                      <div className="flex-1">
                        <input
                          type="text"
                          value={action.action_title}
                          onChange={(e) => {
                            const newActions = [...actions];
                            newActions[index].action_title = e.target.value;
                            setActions(newActions);
                          }}
                          className="input-field"
                          placeholder="Action title..."
                        />
                      </div>
                      <div className="w-48">
                        <input
                          type="date"
                          value={action.target_date}
                          onChange={(e) => {
                            const newActions = [...actions];
                            newActions[index].target_date = e.target.value;
                            setActions(newActions);
                          }}
                          className="input-field"
                        />
                      </div>
                      <select
                        value={action.status}
                        onChange={(e) => {
                          const newActions = [...actions];
                          newActions[index].status = e.target.value;
                          setActions(newActions);
                        }}
                        className="input-field w-40"
                      >
                        <option value="in_progress">In Progress</option>
                        <option value="completed">Completed</option>
                        <option value="closed">Closed</option>
                      </select>
                    </div>
                  </div>
                ))}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Summary (optional - can be AI generated)
                </label>
                <textarea
                  value={managerSummary}
                  onChange={(e) => setManagerSummary(e.target.value)}
                  className="input-field min-h-[100px]"
                  placeholder="Summary of this week's check-in..."
                />
              </div>
            </div>
          )}

          {activeTab === 'monthly' && (
            <div className="space-y-6">
              <div className="card bg-green-50 border-green-200">
                <div className="flex items-start gap-3">
                  <TrendingUp className="w-5 h-5 text-green-600 mt-1" />
                  <div>
                    <h3 className="font-semibold text-green-900">Monthly One to One #{reviewInstance.total_monthly_reviews + 1}</h3>
                    <p className="text-sm text-green-700 mt-1">
                      In-depth review with competency assessment and development planning
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-slate-900">KPI Performance</h3>
                {templateKPIs.map((kpi) => {
                  const rating = kpiRatings.find(r => r.template_kpi_id === kpi.id);
                  return (
                    <div key={kpi.id} className="card">
                      <h4 className="font-medium text-slate-900 mb-3">{kpi.kpi_title}</h4>
                      <div className="grid grid-cols-5 gap-2 mb-3">
                        {[0, 1, 2, 3, 4].map((value) => (
                          <button
                            key={value}
                            type="button"
                            onClick={() => {
                              const newRatings = [...kpiRatings];
                              const idx = newRatings.findIndex(r => r.template_kpi_id === kpi.id);
                              if (idx >= 0) {
                                newRatings[idx].rating = value;
                                setKpiRatings(newRatings);
                              }
                            }}
                            className={`py-3 px-2 text-xs rounded-lg border-2 transition-colors ${
                              rating?.rating === value
                                ? getRatingColor(value) + ' font-medium'
                                : 'bg-white border-slate-200 text-slate-600'
                            }`}
                          >
                            {value}<br/>{getRatingLabel(value)}
                          </button>
                        ))}
                      </div>
                      <textarea
                        value={rating?.comment || ''}
                        onChange={(e) => {
                          const newRatings = [...kpiRatings];
                          const idx = newRatings.findIndex(r => r.template_kpi_id === kpi.id);
                          if (idx >= 0) {
                            newRatings[idx].comment = e.target.value;
                            setKpiRatings(newRatings);
                          }
                        }}
                        className="input-field min-h-[60px]"
                        placeholder="Monthly performance comment..."
                      />
                    </div>
                  );
                })}
              </div>

              {competencies.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-slate-900">Competency Assessment</h3>
                  {competencies.map((comp) => {
                    const rating = competencyRatings.find(r => r.competency_id === comp.id);
                    return (
                      <div key={comp.id} className="card">
                        <h4 className="font-medium text-slate-900 mb-1">{comp.name}</h4>
                        <p className="text-sm text-slate-600 mb-3">{comp.description}</p>

                        <div className="grid grid-cols-5 gap-2 mb-3">
                          {[0, 1, 2, 3, 4].map((value) => (
                            <button
                              key={value}
                              type="button"
                              onClick={() => {
                                const newRatings = [...competencyRatings];
                                const idx = newRatings.findIndex(r => r.competency_id === comp.id);
                                if (idx >= 0) {
                                  newRatings[idx].rating = value;
                                  setCompetencyRatings(newRatings);
                                }
                              }}
                              className={`py-3 px-2 text-xs rounded-lg border-2 transition-colors ${
                                rating?.rating === value
                                  ? getRatingColor(value) + ' font-medium'
                                  : 'bg-white border-slate-200 text-slate-600'
                              }`}
                            >
                              {value}<br/>{getRatingLabel(value)}
                            </button>
                          ))}
                        </div>

                        <textarea
                          value={rating?.manager_comment || ''}
                          onChange={(e) => {
                            const newRatings = [...competencyRatings];
                            const idx = newRatings.findIndex(r => r.competency_id === comp.id);
                            if (idx >= 0) {
                              newRatings[idx].manager_comment = e.target.value;
                              setCompetencyRatings(newRatings);
                            }
                          }}
                          className="input-field min-h-[60px]"
                          placeholder="Manager comment (required)..."
                          required
                        />

                        {rating?.rating === 4 && (
                          <div className="mt-3">
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                              Evidence (Required for rating 4)
                            </label>
                            <textarea
                              value={rating?.evidence || ''}
                              onChange={(e) => {
                                const newRatings = [...competencyRatings];
                                const idx = newRatings.findIndex(r => r.competency_id === comp.id);
                                if (idx >= 0) {
                                  newRatings[idx].evidence = e.target.value;
                                  setCompetencyRatings(newRatings);
                                }
                              }}
                              className="input-field min-h-[60px]"
                              placeholder="Provide specific evidence of above target performance..."
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {activeTab === 'halfyear' && (
            <div className="space-y-6">
              <div className="card bg-purple-50 border-purple-200">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-purple-600 mt-1" />
                  <div>
                    <h3 className="font-semibold text-purple-900">Half Year Review</h3>
                    <p className="text-sm text-purple-700 mt-1">
                      Comprehensive 6-month review with self-assessment, gap analysis, and development planning
                    </p>
                  </div>
                </div>
              </div>

              <div className="card">
                <p className="text-slate-600">
                  Half-year review functionality will be unlocked after completing 6 monthly reviews.
                  This section will include:
                </p>
                <ul className="list-disc list-inside text-slate-600 mt-3 space-y-1">
                  <li>6-month KPI average and trend analysis</li>
                  <li>Overall competency score and development areas</li>
                  <li>Employee self-assessment</li>
                  <li>Gap analysis between current and target performance</li>
                  <li>Recommended learning path</li>
                  <li>Performance Grid positioning</li>
                </ul>
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-slate-200 px-6 py-4 bg-slate-50 rounded-b-2xl flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 btn-secondary"
            disabled={saving}
          >
            Cancel
          </button>
          <button
            onClick={activeTab === 'weekly' ? handleSaveWeekly : handleSaveMonthly}
            className="flex-1 btn-primary flex items-center justify-center gap-2"
            disabled={saving || activeTab === 'halfyear'}
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save Review'}
          </button>
        </div>
      </div>
    </div>
  );
}
