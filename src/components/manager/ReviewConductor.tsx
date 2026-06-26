import React, { useState, useEffect } from 'react';
import { Plus, Save, CheckCircle, Trash2, ArrowLeft, Sparkles, AlertTriangle, FileText } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { format } from 'date-fns';
import SeraValidationModal from '../moderation/SeraValidationModal';

interface ReviewMeeting {
  id: string;
  employee_id: string;
  meeting_type: 'weekly_checkin' | 'monthly_review';
  status: string;
  scheduled_date: string;
  agenda: string | null;
  employee: {
    full_name: string;
    job_family_id: string | null;
  };
}

interface Action {
  id?: string;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed';
  due_date: string;
  progress_notes: string;
}

interface KPIRating {
  id?: string;
  kpi_name: string;
  kpi_description: string;
  rating: number;
  target_value: string;
  actual_value: string;
  notes: string;
}

interface CompetencyAssessment {
  id?: string;
  competency_id: string | null;
  competency_name: string;
  feedback: string;
  manager_rating: number | null;
  ai_recommended_rating: number | null;
  requires_approval: boolean;
}

interface Competency {
  id: string;
  name: string;
  description: string;
}

interface ReviewConductorProps {
  meetingId: string;
  onClose: () => void;
}

export default function ReviewConductor({ meetingId, onClose }: ReviewConductorProps) {
  const [meeting, setMeeting] = useState<ReviewMeeting | null>(null);
  const [activeTab, setActiveTab] = useState<'actions' | 'kpis' | 'competencies' | 'summary'>('actions');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [actions, setActions] = useState<Action[]>([]);
  const [kpiRatings, setKpiRatings] = useState<KPIRating[]>([]);
  const [competencyAssessments, setCompetencyAssessments] = useState<CompetencyAssessment[]>([]);
  const [availableCompetencies, setAvailableCompetencies] = useState<Competency[]>([]);
  const [summary, setSummary] = useState({
    overall_summary: '',
    areas_for_development: [] as string[],
    suggested_goals: [] as string[],
  });
  const [generatingSummary, setGeneratingSummary] = useState(false);
  const [showSubmitWarning, setShowSubmitWarning] = useState(false);

  const [seraModal, setSeraModal] = useState<{
    open: boolean;
    type: 'kpi' | 'competency';
    index: number;
    rating: number;
    itemName: string;
    comments: string;
    targetValue?: string;
    actualValue?: string;
  } | null>(null);

  const [pendingModerationItems, setPendingModerationItems] = useState<{
    type: 'kpi' | 'competency';
    index: number;
    rating: number;
    justification: string;
    aiSummary: string;
    aiValidationStatus: string;
    managerOverride: boolean;
    overrideNotes: string;
  }[]>([]);

  useEffect(() => {
    fetchMeetingDetails();
  }, [meetingId]);

  useEffect(() => {
    if (meeting?.employee.job_family_id) {
      fetchCompetencies();
    }
  }, [meeting]);

  const fetchMeetingDetails = async () => {
    try {
      setLoading(true);

      const { data: meetingData, error: meetingError } = await supabase
        .from('review_meetings')
        .select(`
          id,
          employee_id,
          meeting_type,
          status,
          scheduled_date,
          agenda,
          employee:profiles!review_meetings_employee_id_fkey(
            full_name,
            job_family_id
          )
        `)
        .eq('id', meetingId)
        .single();

      if (meetingError) throw meetingError;
      setMeeting(meetingData);

      const { data: actionsData } = await supabase
        .from('review_actions')
        .select('*')
        .eq('meeting_id', meetingId);
      setActions(actionsData || []);

      const { data: kpiData } = await supabase
        .from('review_kpi_ratings')
        .select('*')
        .eq('meeting_id', meetingId);
      setKpiRatings(kpiData || []);

      const { data: competencyData } = await supabase
        .from('review_competency_assessments')
        .select('*')
        .eq('meeting_id', meetingId);
      setCompetencyAssessments(competencyData || []);

      const { data: summaryData } = await supabase
        .from('review_summaries')
        .select('*')
        .eq('meeting_id', meetingId)
        .maybeSingle();

      if (summaryData) {
        setSummary({
          overall_summary: summaryData.overall_summary || '',
          areas_for_development: summaryData.areas_for_development || [],
          suggested_goals: summaryData.suggested_goals || [],
        });
      }

      if (meetingData.status === 'scheduled') {
        await supabase
          .from('review_meetings')
          .update({ status: 'in_progress' })
          .eq('id', meetingId);
      }
    } catch (error) {
      console.error('Error fetching meeting details:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCompetencies = async () => {
    if (!meeting?.employee.job_family_id) return;

    try {
      const { data: jfcData, error } = await supabase
        .from('job_family_competencies')
        .select(`
          competency_id,
          required_level_id,
          competencies!inner(id, title, description),
          competency_levels!inner(level_number, level_name)
        `)
        .eq('job_family_id', meeting.employee.job_family_id)
        .order('sort_order');

      if (error) throw error;

      const competencies = (jfcData || []).map((jfc: any) => ({
        id: jfc.competency_id,
        name: jfc.competencies.title,
        description: jfc.competencies.description
      }));

      setAvailableCompetencies(competencies);
    } catch (error) {
      console.error('Error fetching competencies:', error);
    }
  };

  const saveActions = async () => {
    setSaving(true);
    try {
      for (const action of actions) {
        if (action.id) {
          await supabase
            .from('review_actions')
            .update({
              title: action.title,
              description: action.description,
              status: action.status,
              due_date: action.due_date,
              progress_notes: action.progress_notes,
            })
            .eq('id', action.id);
        } else {
          await supabase.from('review_actions').insert({
            meeting_id: meetingId,
            ...action,
          });
        }
      }
      await fetchMeetingDetails();
    } catch (error) {
      console.error('Error saving actions:', error);
      alert('Failed to save actions');
    } finally {
      setSaving(false);
    }
  };

  const saveKPIs = async () => {
    setSaving(true);
    try {
      for (let i = 0; i < kpiRatings.length; i++) {
        const kpi = kpiRatings[i];
        let savedId = kpi.id;

        if (kpi.id) {
          await supabase
            .from('review_kpi_ratings')
            .update({
              kpi_name: kpi.kpi_name,
              kpi_description: kpi.kpi_description,
              rating: kpi.rating,
              target_value: kpi.target_value,
              actual_value: kpi.actual_value,
              notes: kpi.notes,
            })
            .eq('id', kpi.id);
        } else {
          const { data: newKpi } = await supabase.from('review_kpi_ratings').insert({
            meeting_id: meetingId,
            ...kpi,
          }).select().maybeSingle();
          savedId = newKpi?.id;
        }

        if (savedId && kpi.rating >= 4) {
          const modItem = pendingModerationItems.find(p => p.type === 'kpi' && p.index === i);
          if (modItem) {
            await createModerationCase(
              'kpi_rating',
              savedId,
              kpi.rating,
              modItem.justification,
              modItem.aiSummary,
              modItem.aiValidationStatus,
              modItem.managerOverride,
              modItem.overrideNotes
            );
          }
        }
      }
      await fetchMeetingDetails();
    } catch (error) {
      console.error('Error saving KPIs:', error);
      alert('Failed to save KPIs');
    } finally {
      setSaving(false);
    }
  };

  const saveCompetencies = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      for (let i = 0; i < competencyAssessments.length; i++) {
        const assessment = competencyAssessments[i];
        const requiresApproval = assessment.manager_rating !== null && assessment.manager_rating >= 4;
        let savedId = assessment.id;

        if (assessment.id) {
          await supabase
            .from('review_competency_assessments')
            .update({
              feedback: assessment.feedback,
              manager_rating: assessment.manager_rating,
              requires_approval: requiresApproval,
            })
            .eq('id', assessment.id);
        } else {
          const { data: newAssessment } = await supabase
            .from('review_competency_assessments')
            .insert({
              meeting_id: meetingId,
              competency_id: assessment.competency_id,
              competency_name: assessment.competency_name,
              feedback: assessment.feedback,
              manager_rating: assessment.manager_rating,
              ai_recommended_rating: assessment.ai_recommended_rating,
              requires_approval: requiresApproval,
              approval_status: requiresApproval ? 'pending' : 'not_required',
            })
            .select()
            .single();

          savedId = newAssessment?.id;

          if (requiresApproval && newAssessment) {
            const { data: managerProfile } = await supabase
              .from('profiles')
              .select('manager_id')
              .eq('id', user.id)
              .single();

            if (managerProfile?.manager_id) {
              await supabase.from('review_approvals').insert({
                competency_assessment_id: newAssessment.id,
                approver_id: managerProfile.manager_id,
                status: 'pending',
              });
            }
          }
        }

        if (savedId && assessment.manager_rating !== null && assessment.manager_rating >= 4) {
          const modItem = pendingModerationItems.find(p => p.type === 'competency' && p.index === i);
          if (modItem) {
            await createModerationCase(
              'competency_assessment',
              savedId,
              assessment.manager_rating,
              modItem.justification,
              modItem.aiSummary,
              modItem.aiValidationStatus,
              modItem.managerOverride,
              modItem.overrideNotes
            );
          }
        }
      }
      await fetchMeetingDetails();
    } catch (error) {
      console.error('Error saving competencies:', error);
      alert('Failed to save competencies');
    } finally {
      setSaving(false);
    }
  };

  const createModerationCase = async (
    sourceType: 'kpi_rating' | 'competency_assessment',
    sourceId: string,
    rating: number,
    justification: string,
    aiSummary: string,
    aiValidationStatus: string,
    managerOverride: boolean,
    overrideNotes: string
  ) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: workflow } = await supabase
        .from('moderation_workflow_configs')
        .select('id')
        .eq('is_active', true)
        .maybeSingle();

      if (!workflow) return;

      await supabase.from('moderation_cases').insert({
        workflow_id: workflow.id,
        source_type: sourceType,
        source_id: sourceId,
        meeting_id: meetingId,
        employee_id: meeting?.employee_id,
        manager_id: user.id,
        original_rating: rating,
        current_rating: rating,
        manager_justification: justification,
        ai_validation_status: aiValidationStatus,
        ai_summary: aiSummary,
        manager_override: managerOverride,
        manager_override_notes: overrideNotes,
        current_step: 1,
        status: 'pending',
      });
    } catch (error) {
      console.error('Error creating moderation case:', error);
    }
  };

  const handleKpiRatingChange = (index: number, newRating: number) => {
    const kpi = kpiRatings[index];
    if (newRating >= 4) {
      setSeraModal({
        open: true,
        type: 'kpi',
        index,
        rating: newRating,
        itemName: kpi.kpi_name || 'KPI',
        comments: kpi.notes,
        targetValue: kpi.target_value,
        actualValue: kpi.actual_value,
      });
    } else {
      const newKPIs = [...kpiRatings];
      newKPIs[index].rating = newRating;
      setKpiRatings(newKPIs);
    }
  };

  const handleCompetencyRatingChange = (index: number, newRating: number | null) => {
    if (newRating !== null && newRating >= 4) {
      const assessment = competencyAssessments[index];
      setSeraModal({
        open: true,
        type: 'competency',
        index,
        rating: newRating,
        itemName: assessment.competency_name || 'Competency',
        comments: assessment.feedback,
      });
    } else {
      const newAssessments = [...competencyAssessments];
      newAssessments[index].manager_rating = newRating;
      newAssessments[index].requires_approval = newRating === 4 || newRating === 5;
      setCompetencyAssessments(newAssessments);
    }
  };

  const handleSeraConfirm = async (updatedComments: string, overrideReason?: string) => {
    if (!seraModal) return;

    if (seraModal.type === 'kpi') {
      const newKPIs = [...kpiRatings];
      newKPIs[seraModal.index].rating = seraModal.rating;
      newKPIs[seraModal.index].notes = updatedComments;
      setKpiRatings(newKPIs);
    } else {
      const newAssessments = [...competencyAssessments];
      newAssessments[seraModal.index].manager_rating = seraModal.rating;
      newAssessments[seraModal.index].feedback = updatedComments;
      newAssessments[seraModal.index].requires_approval = true;
      setCompetencyAssessments(newAssessments);
    }

    setPendingModerationItems(prev => {
      const existing = prev.findIndex(p => p.type === seraModal.type && p.index === seraModal.index);
      const item = {
        type: seraModal.type,
        index: seraModal.index,
        rating: seraModal.rating,
        justification: updatedComments,
        aiSummary: '',
        aiValidationStatus: overrideReason ? 'overridden' : 'validated',
        managerOverride: !!overrideReason,
        overrideNotes: overrideReason || '',
      };
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = item;
        return updated;
      }
      return [...prev, item];
    });

    setSeraModal(null);
  };

  const generateAISummary = async () => {
    setGeneratingSummary(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-review-summary`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          meetingId,
          actions,
          kpiRatings,
          competencyAssessments,
        }),
      });

      if (!response.ok) throw new Error('Failed to generate summary');

      const result = await response.json();
      setSummary({
        overall_summary: result.overall_summary || '',
        areas_for_development: result.areas_for_development || [],
        suggested_goals: result.suggested_goals || [],
      });
    } catch (error) {
      console.error('Error generating AI summary:', error);
      alert('Failed to generate AI summary. Using manual mode.');
    } finally {
      setGeneratingSummary(false);
    }
  };

  const saveSummary = async () => {
    setSaving(true);
    try {
      const { data: existing } = await supabase
        .from('review_summaries')
        .select('id')
        .eq('meeting_id', meetingId)
        .maybeSingle();

      if (existing) {
        await supabase
          .from('review_summaries')
          .update({
            overall_summary: summary.overall_summary,
            areas_for_development: summary.areas_for_development,
            suggested_goals: summary.suggested_goals,
          })
          .eq('meeting_id', meetingId);
      } else {
        await supabase.from('review_summaries').insert({
          meeting_id: meetingId,
          overall_summary: summary.overall_summary,
          areas_for_development: summary.areas_for_development,
          suggested_goals: summary.suggested_goals,
        });
      }
    } catch (error) {
      console.error('Error saving summary:', error);
      alert('Failed to save summary');
    } finally {
      setSaving(false);
    }
  };

  const saveAsDraft = async () => {
    setSaving(true);
    try {
      await saveActions();
      await saveKPIs();
      if (meeting?.meeting_type === 'monthly_review') {
        await saveCompetencies();
        await saveSummary();
      }
      onClose();
    } catch (error) {
      console.error('Error saving draft:', error);
      alert('Failed to save draft');
    } finally {
      setSaving(false);
    }
  };

  const completeReview = async () => {
    try {
      await saveActions();
      await saveKPIs();
      if (meeting?.meeting_type === 'monthly_review') {
        await saveCompetencies();
        await saveSummary();
      }

      await supabase
        .from('review_meetings')
        .update({
          status: 'completed',
          completed_date: new Date().toISOString(),
        })
        .eq('id', meetingId);

      await supabase.rpc('create_performance_rating', {
        meeting_id_param: meetingId
      });

      setShowSubmitWarning(false);
      onClose();
    } catch (error) {
      console.error('Error completing review:', error);
      alert('Failed to complete review');
    }
  };

  const addAction = () => {
    setActions([
      ...actions,
      {
        title: '',
        description: '',
        status: 'pending',
        due_date: '',
        progress_notes: '',
      },
    ]);
  };

  const removeAction = (index: number) => {
    setActions(actions.filter((_, i) => i !== index));
  };

  const addKPI = () => {
    setKpiRatings([
      ...kpiRatings,
      {
        kpi_name: '',
        kpi_description: '',
        rating: 3,
        target_value: '',
        actual_value: '',
        notes: '',
      },
    ]);
  };

  const removeKPI = (index: number) => {
    setKpiRatings(kpiRatings.filter((_, i) => i !== index));
  };

  const addCompetency = () => {
    if (availableCompetencies.length === 0) {
      alert('No competencies available for this job family');
      return;
    }

    setCompetencyAssessments([
      ...competencyAssessments,
      {
        competency_id: null,
        competency_name: '',
        feedback: '',
        manager_rating: null,
        ai_recommended_rating: null,
        requires_approval: false,
      },
    ]);
  };

  const removeCompetency = (index: number) => {
    setCompetencyAssessments(competencyAssessments.filter((_, i) => i !== index));
  };

  if (loading) {
    return <div className="text-center py-12">Loading review...</div>;
  }

  if (!meeting) {
    return <div className="text-center py-12">Meeting not found</div>;
  }

  return (
    <>
    <div className="fixed inset-0 bg-gray-100 z-50 overflow-y-auto">
      <div className="max-w-5xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow-lg">
          <div className="border-b border-gray-200 p-6">
            <div className="flex justify-between items-start">
              <div>
                <button
                  onClick={onClose}
                  className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-3"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to Reviews
                </button>
                <h2 className="text-2xl font-bold text-gray-900">
                  {meeting.meeting_type === 'weekly_checkin' ? 'Weekly Check-in' : 'Monthly Review'}
                </h2>
                <p className="text-gray-600">
                  {meeting.employee.full_name} - {format(new Date(meeting.scheduled_date), 'PPp')}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={saveAsDraft}
                  disabled={saving}
                  className="bg-white border border-slate-300 text-slate-700 px-5 py-2 rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  <FileText className="w-4 h-4" />
                  {saving ? 'Saving...' : 'Save as Draft'}
                </button>
                <button
                  onClick={() => setShowSubmitWarning(true)}
                  className="bg-green-600 text-white px-5 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                >
                  <CheckCircle className="w-5 h-5" />
                  Submit Review
                </button>
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button
                onClick={() => setActiveTab('actions')}
                className={`px-4 py-2 rounded-lg font-medium ${
                  activeTab === 'actions'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                Actions & Milestones
              </button>
              <button
                onClick={() => setActiveTab('kpis')}
                className={`px-4 py-2 rounded-lg font-medium ${
                  activeTab === 'kpis'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                KPIs
              </button>
              {meeting.meeting_type === 'monthly_review' && (
                <>
                  <button
                    onClick={() => setActiveTab('competencies')}
                    className={`px-4 py-2 rounded-lg font-medium ${
                      activeTab === 'competencies'
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    Competencies
                  </button>
                  <button
                    onClick={() => setActiveTab('summary')}
                    className={`px-4 py-2 rounded-lg font-medium ${
                      activeTab === 'summary'
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    Summary
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="p-6">
            {activeTab === 'actions' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold">Actions & Milestones</h3>
                  <div className="flex gap-2">
                    <button
                      onClick={saveActions}
                      disabled={saving}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-blue-400 flex items-center gap-2"
                    >
                      <Save className="w-4 h-4" />
                      {saving ? 'Saving...' : 'Save Actions'}
                    </button>
                    <button
                      onClick={addAction}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      Add Action
                    </button>
                  </div>
                </div>

                {actions.length === 0 ? (
                  <div className="text-center py-12 bg-gray-50 rounded-lg">
                    <p className="text-gray-500">No actions yet. Add your first action item.</p>
                  </div>
                ) : (
                  actions.map((action, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4 space-y-3">
                      <div className="flex justify-between items-start">
                        <input
                          type="text"
                          value={action.title}
                          onChange={(e) => {
                            const newActions = [...actions];
                            newActions[index].title = e.target.value;
                            setActions(newActions);
                          }}
                          placeholder="Action title"
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                        <button
                          onClick={() => removeAction(index)}
                          className="ml-2 text-red-600 hover:text-red-800"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                      <textarea
                        value={action.description}
                        onChange={(e) => {
                          const newActions = [...actions];
                          newActions[index].description = e.target.value;
                          setActions(newActions);
                        }}
                        placeholder="Description"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        rows={2}
                      />
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                          <select
                            value={action.status}
                            onChange={(e) => {
                              const newActions = [...actions];
                              newActions[index].status = e.target.value as Action['status'];
                              setActions(newActions);
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="pending">Pending</option>
                            <option value="in_progress">In Progress</option>
                            <option value="completed">Completed</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                          <input
                            type="date"
                            value={action.due_date}
                            onChange={(e) => {
                              const newActions = [...actions];
                              newActions[index].due_date = e.target.value;
                              setActions(newActions);
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </div>
                      <textarea
                        value={action.progress_notes}
                        onChange={(e) => {
                          const newActions = [...actions];
                          newActions[index].progress_notes = e.target.value;
                          setActions(newActions);
                        }}
                        placeholder="Progress notes and feedback"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        rows={2}
                      />
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === 'kpis' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold">KPI Ratings</h3>
                  <div className="flex gap-2">
                    <button
                      onClick={saveKPIs}
                      disabled={saving}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-blue-400 flex items-center gap-2"
                    >
                      <Save className="w-4 h-4" />
                      {saving ? 'Saving...' : 'Save KPIs'}
                    </button>
                    <button
                      onClick={addKPI}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      Add KPI
                    </button>
                  </div>
                </div>

                {kpiRatings.length === 0 ? (
                  <div className="text-center py-12 bg-gray-50 rounded-lg">
                    <p className="text-gray-500">No KPIs yet. Add your first KPI rating.</p>
                  </div>
                ) : (
                  kpiRatings.map((kpi, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4 space-y-3">
                      <div className="flex justify-between items-start">
                        <input
                          type="text"
                          value={kpi.kpi_name}
                          onChange={(e) => {
                            const newKPIs = [...kpiRatings];
                            newKPIs[index].kpi_name = e.target.value;
                            setKpiRatings(newKPIs);
                          }}
                          placeholder="KPI name"
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                        <button
                          onClick={() => removeKPI(index)}
                          className="ml-2 text-red-600 hover:text-red-800"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                      <textarea
                        value={kpi.kpi_description}
                        onChange={(e) => {
                          const newKPIs = [...kpiRatings];
                          newKPIs[index].kpi_description = e.target.value;
                          setKpiRatings(newKPIs);
                        }}
                        placeholder="Description"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        rows={2}
                      />
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Target</label>
                          <input
                            type="text"
                            value={kpi.target_value}
                            onChange={(e) => {
                              const newKPIs = [...kpiRatings];
                              newKPIs[index].target_value = e.target.value;
                              setKpiRatings(newKPIs);
                            }}
                            placeholder="e.g., 100 units"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Actual</label>
                          <input
                            type="text"
                            value={kpi.actual_value}
                            onChange={(e) => {
                              const newKPIs = [...kpiRatings];
                              newKPIs[index].actual_value = e.target.value;
                              setKpiRatings(newKPIs);
                            }}
                            placeholder="e.g., 95 units"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Rating (1-5)
                            {kpi.rating >= 4 && (
                              <span className="ml-2 text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-medium">
                                Moderation required
                              </span>
                            )}
                          </label>
                          <select
                            value={kpi.rating}
                            onChange={(e) => handleKpiRatingChange(index, parseInt(e.target.value))}
                            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${kpi.rating >= 4 ? 'border-amber-400 bg-amber-50' : 'border-gray-300'}`}
                          >
                            <option value={1}>1 - Needs Improvement</option>
                            <option value={2}>2 - Below Expectations</option>
                            <option value={3}>3 - Meets Expectations</option>
                            <option value={4}>4 - Exceeds Expectations</option>
                            <option value={5}>5 - Outstanding</option>
                          </select>
                        </div>
                      </div>
                      <textarea
                        value={kpi.notes}
                        onChange={(e) => {
                          const newKPIs = [...kpiRatings];
                          newKPIs[index].notes = e.target.value;
                          setKpiRatings(newKPIs);
                        }}
                        placeholder="Notes and feedback"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        rows={2}
                      />
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === 'competencies' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold">Competency Assessments</h3>
                  <div className="flex gap-2">
                    <button
                      onClick={saveCompetencies}
                      disabled={saving}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-blue-400 flex items-center gap-2"
                    >
                      <Save className="w-4 h-4" />
                      {saving ? 'Saving...' : 'Save Competencies'}
                    </button>
                    <button
                      onClick={addCompetency}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      Add Competency
                    </button>
                  </div>
                </div>

                {competencyAssessments.length === 0 ? (
                  <div className="text-center py-12 bg-gray-50 rounded-lg">
                    <p className="text-gray-500">No competencies assessed yet. Add your first assessment.</p>
                  </div>
                ) : (
                  competencyAssessments.map((assessment, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4 space-y-3">
                      <div className="flex justify-between items-start">
                        <select
                          value={assessment.competency_id || ''}
                          onChange={(e) => {
                            const comp = availableCompetencies.find(c => c.id === e.target.value);
                            const newAssessments = [...competencyAssessments];
                            newAssessments[index].competency_id = e.target.value || null;
                            newAssessments[index].competency_name = comp?.name || '';
                            setCompetencyAssessments(newAssessments);
                          }}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">Select competency</option>
                          {availableCompetencies.map((comp) => (
                            <option key={comp.id} value={comp.id}>
                              {comp.name}
                            </option>
                          ))}
                        </select>
                        <button
                          onClick={() => removeCompetency(index)}
                          className="ml-2 text-red-600 hover:text-red-800"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                      <textarea
                        value={assessment.feedback}
                        onChange={(e) => {
                          const newAssessments = [...competencyAssessments];
                          newAssessments[index].feedback = e.target.value;
                          setCompetencyAssessments(newAssessments);
                        }}
                        placeholder="Provide detailed feedback on this competency"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        rows={3}
                      />
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Rating (1-5)
                            {assessment.manager_rating !== null && assessment.manager_rating >= 4 && (
                              <span className="ml-2 text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-medium">
                                Moderation required
                              </span>
                            )}
                          </label>
                          <select
                            value={assessment.manager_rating ?? ''}
                            onChange={(e) => handleCompetencyRatingChange(index, e.target.value ? parseInt(e.target.value) : null)}
                            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${assessment.manager_rating !== null && assessment.manager_rating >= 4 ? 'border-amber-400 bg-amber-50' : 'border-gray-300'}`}
                          >
                            <option value="">Select rating</option>
                            <option value={1}>1 - Developing</option>
                            <option value={2}>2 - Competent</option>
                            <option value={3}>3 - Proficient</option>
                            <option value={4}>4 - Exceeding (Moderation)</option>
                            <option value={5}>5 - Outstanding (Moderation)</option>
                          </select>
                        </div>
                        {assessment.manager_rating !== null && assessment.manager_rating >= 4 && (
                          <div className="col-span-2 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2">
                            <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                            <p className="text-sm text-amber-800">
                              Rating {assessment.manager_rating}/5 will trigger the moderation workflow. SERA has reviewed the justification.
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === 'summary' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold">Review Summary</h3>
                  <div className="flex gap-2">
                    <button
                      onClick={generateAISummary}
                      disabled={generatingSummary}
                      className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:bg-purple-400 flex items-center gap-2"
                    >
                      <Sparkles className="w-4 h-4" />
                      {generatingSummary ? 'Generating...' : 'Generate AI Summary'}
                    </button>
                    <button
                      onClick={saveSummary}
                      disabled={saving}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-blue-400 flex items-center gap-2"
                    >
                      <Save className="w-4 h-4" />
                      {saving ? 'Saving...' : 'Save Summary'}
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Overall Summary
                    </label>
                    <textarea
                      value={summary.overall_summary}
                      onChange={(e) => setSummary({ ...summary, overall_summary: e.target.value })}
                      placeholder="Provide an overall summary of the review"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      rows={5}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Areas for Development
                    </label>
                    {summary.areas_for_development.map((area, index) => (
                      <div key={index} className="flex gap-2 mb-2">
                        <input
                          type="text"
                          value={area}
                          onChange={(e) => {
                            const newAreas = [...summary.areas_for_development];
                            newAreas[index] = e.target.value;
                            setSummary({ ...summary, areas_for_development: newAreas });
                          }}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          placeholder="Area for development"
                        />
                        <button
                          onClick={() => {
                            const newAreas = summary.areas_for_development.filter((_, i) => i !== index);
                            setSummary({ ...summary, areas_for_development: newAreas });
                          }}
                          className="text-red-600 hover:text-red-800"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() => {
                        setSummary({
                          ...summary,
                          areas_for_development: [...summary.areas_for_development, ''],
                        });
                      }}
                      className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      Add Area
                    </button>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Suggested Goals
                    </label>
                    {summary.suggested_goals.map((goal, index) => (
                      <div key={index} className="flex gap-2 mb-2">
                        <input
                          type="text"
                          value={goal}
                          onChange={(e) => {
                            const newGoals = [...summary.suggested_goals];
                            newGoals[index] = e.target.value;
                            setSummary({ ...summary, suggested_goals: newGoals });
                          }}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          placeholder="Suggested goal"
                        />
                        <button
                          onClick={() => {
                            const newGoals = summary.suggested_goals.filter((_, i) => i !== index);
                            setSummary({ ...summary, suggested_goals: newGoals });
                          }}
                          className="text-red-600 hover:text-red-800"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() => {
                        setSummary({
                          ...summary,
                          suggested_goals: [...summary.suggested_goals, ''],
                        });
                      }}
                      className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      Add Goal
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>

    {seraModal && (
      <SeraValidationModal
        rating={seraModal.rating}
        ratingType={seraModal.type}
        ratingLabel={seraModal.rating === 4 ? 'Exceeds Expectations' : 'Outstanding'}
        itemName={seraModal.itemName}
        employeeName={meeting?.employee.full_name || ''}
        comments={seraModal.comments}
        targetValue={seraModal.targetValue}
        actualValue={seraModal.actualValue}
        onConfirm={handleSeraConfirm}
        onCancel={() => setSeraModal(null)}
      />
    )}

    {showSubmitWarning && (
      <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
          <div className="flex items-start gap-4 mb-5">
            <div className="p-2.5 bg-amber-100 rounded-lg flex-shrink-0">
              <AlertTriangle className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Submit Review</h3>
              <p className="text-sm text-slate-600 mt-1">
                You are about to submit this review for <span className="font-medium">{meeting?.employee.full_name}</span>.
              </p>
            </div>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
            <p className="text-sm font-semibold text-amber-800 mb-1">This action is final and cannot be undone.</p>
            <p className="text-sm text-amber-700">
              Once submitted, the review will be marked as completed and can no longer be edited. Make sure all sections are complete before proceeding.
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowSubmitWarning(false)}
              className="flex-1 px-4 py-2.5 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium"
            >
              Go Back
            </button>
            <button
              onClick={completeReview}
              className="flex-1 px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium flex items-center justify-center gap-2"
            >
              <CheckCircle className="w-4 h-4" />
              Confirm Submit
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
