import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import {
  Calendar, CheckCircle, Target, TrendingUp, AlertCircle,
  FileText, Save, Send, ArrowLeft, Sparkles, Clock, MessageSquare, X, Award
} from 'lucide-react';

interface Review {
  id: string;
  employee_id: string;
  review_month?: string;
  week_starting?: string;
  status: string;
  employee: {
    full_name: string;
    job_title: string;
    job_family_id: string | null;
    competency_level?: string | null;
  };
}

interface ValuesRating {
  value_id: string;
  value_title: string;
  competency_id: string;
  competency_title: string;
  competency_statement?: string;
  evidence_prompt?: string;
  what_good_looks_like?: string;
  what_great_looks_like?: string;
  manager_rating: number;
  manager_comment: string;
}

interface SeraFeedback {
  type: 'mismatch' | 'great' | 'loading';
  message: string;
}

const COMPETENCY_RATING_OPTIONS = [
  { value: 1, label: '1 — Development Needed' },
  { value: 3, label: '3 — On Target' },
  { value: 5, label: '5 — Exceptional' },
];


interface KPI {
  id: string;
  kpi_name: string;
  target_value: number;
  measurement_unit: string;
  frequency: string;
}

interface Goal {
  id: string;
  goal_description: string;
  progress_percent: number;
  status: string;
  source: string;
}

interface Competency {
  id: string;
  name: string;
  description: string;
  target_level: number;
}

export default function ComprehensiveReviewConductor() {
  const { profile } = useAuth();
  const [reviewType, setReviewType] = useState<'weekly' | 'monthly'>('monthly');
  const [reviews, setReviews] = useState<Review[]>([]);
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);
  const [loading, setLoading] = useState(false);

  // Weekly check-in state
  const [weeklyKPIs, setWeeklyKPIs] = useState<Array<{
    kpi_id: string;
    kpi_name: string;
    target_value: number;
    actual_value: number;
    measurement_unit: string;
    achievement_percent: number;
    notes: string;
  }>>([]);
  const [weeklyGoals, setWeeklyGoals] = useState<Array<{
    goal_id: string;
    goal_description: string;
    progress_percent: number;
    comments: string;
  }>>([]);
  const [highlights, setHighlights] = useState('');
  const [challenges, setChallenges] = useState('');
  const [supportNeeded, setSupportNeeded] = useState('');
  const [managerComments, setManagerComments] = useState('');

  // Monthly review state
  const [monthlyKPIs, setMonthlyKPIs] = useState<Array<{
    kpi_id: string;
    kpi_name: string;
    target_value: number;
    actual_value: number;
    measurement_unit: string;
    achievement_percent: number;
  }>>([]);
  const [weeklyAverage, setWeeklyAverage] = useState<number>(0);
  const [competencyRatings, setCompetencyRatings] = useState<Array<{
    competency_id: string;
    competency_name: string;
    target_level: number;
    rating: number;
    comments: string;
    evidence: string;
    requires_approval: boolean;
  }>>([]);
  const [overallPerformanceScore, setOverallPerformanceScore] = useState<number>(0);
  const [overallCompetencyScore, setOverallCompetencyScore] = useState<number>(0);
  const [employeeComments, setEmployeeComments] = useState('');
  const [monthlyManagerComments, setMonthlyManagerComments] = useState('');
  const [aiWeeklySummary, setAiWeeklySummary] = useState('');
  const [validatingAI, setValidatingAI] = useState(false);
  const [valuesRatings, setValuesRatings] = useState<ValuesRating[]>([]);
  const [seraFeedbacks, setSeraFeedbacks] = useState<Record<string, SeraFeedback | null>>({});
  const seraTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const [seraSystemPrompt, setSeraSystemPrompt] = useState<string | null>(null);

  // Active career plan actions (read-only context in review form)
  const [activePlanActions, setActivePlanActions] = useState<Array<{
    id: string;
    title: string;
    source: string;
    due_date: string | null;
    completed_at: string | null;
  }>>([]);
  const [activePlanTitle, setActivePlanTitle] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from('copilot_config')
      .select('config_data')
      .eq('is_active', true)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.config_data?.system_prompt) {
          setSeraSystemPrompt(data.config_data.system_prompt);
        }
      });
  }, []);

  useEffect(() => {
    if (profile?.id) {
      loadReviews();
    }
  }, [profile, reviewType]);

  useEffect(() => {
    if (selectedReview) {
      loadReviewData();
    }
  }, [selectedReview]);

  async function loadReviews() {
    try {
      setLoading(true);
      const table = reviewType === 'weekly' ? 'review_weekly_checkins' : 'review_monthly_sessions';
      const dateField = reviewType === 'weekly' ? 'week_starting' : 'review_month';

      const { data, error } = await supabase
        .from(table)
        .select(`
          id,
          employee_id,
          ${dateField},
          status,
          employee:profiles!employee_id (
            full_name,
            job_title,
            job_family_id,
            competency_level
          )
        `)
        .eq('manager_id', profile?.id)
        .eq('status', 'scheduled')
        .order(dateField, { ascending: true });

      if (error) throw error;
      setReviews(data || []);
    } catch (error) {
      console.error('Error loading reviews:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadReviewData() {
    if (!selectedReview) return;

    try {
      setLoading(true);

      // Load employee KPIs
      const { data: kpis, error: kpiError } = await supabase
        .from('review_kpis')
        .select('*')
        .eq('employee_id', selectedReview.employee_id)
        .eq('active', true);

      if (kpiError) throw kpiError;

      // Load goals
      const { data: careerPlans } = await supabase
        .from('career_plans')
        .select('*')
        .eq('employee_id', selectedReview.employee_id)
        .eq('status', 'active');

      // Load active confirmed career plan and its outstanding actions (read-only in review)
      const { data: confirmedPlan } = await supabase
        .from('career_plans')
        .select('id, goal_role_title, goal_role_custom_title')
        .or(`user_id.eq.${selectedReview.employee_id},profile_id.eq.${selectedReview.employee_id}`)
        .in('status', ['confirmed', 'sent_to_manager', 'manager_approved'])
        .order('confirmed_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (confirmedPlan?.id) {
        setActivePlanTitle(confirmedPlan.goal_role_title || confirmedPlan.goal_role_custom_title || 'Career Plan');
        const { data: planActions } = await supabase
          .from('career_plan_actions')
          .select('id, title, source, due_date, completed_at')
          .eq('plan_id', confirmedPlan.id)
          .is('completed_at', null)
          .order('created_at', { ascending: true });
        setActivePlanActions(planActions || []);
      } else {
        setActivePlanTitle(null);
        setActivePlanActions([]);
      }

      // Load competencies if monthly
      if (reviewType === 'monthly') {
        await loadValuesCompetencies(selectedReview.employee.competency_level || 'Employee');

        // Calculate weekly average if exists
        try {
          const { data: avgData } = await supabase.rpc('calculate_weekly_average_performance', {
            p_employee_id: selectedReview.employee_id,
            p_review_month: selectedReview.review_month
          });
          if (avgData) setWeeklyAverage(avgData);
        } catch {}

        await generateAIWeeklySummary();
      }

      // Initialize KPI arrays
      if (kpis) {
        const kpiData = kpis.map(kpi => ({
          kpi_id: kpi.id,
          kpi_name: kpi.kpi_name,
          target_value: kpi.target_value,
          actual_value: 0,
          measurement_unit: kpi.measurement_unit,
          achievement_percent: 0,
          notes: reviewType === 'weekly' ? '' : undefined
        }));

        if (reviewType === 'weekly') {
          setWeeklyKPIs(kpiData as any);
        } else {
          setMonthlyKPIs(kpiData);
        }
      }

      // Initialize goals
      if (careerPlans && careerPlans.length > 0) {
        const goalData = careerPlans.map(cp => ({
          goal_id: cp.id,
          goal_description: cp.target_role || 'Career development goal',
          progress_percent: 0,
          comments: ''
        }));

        setWeeklyGoals(goalData);
      }

    } catch (error) {
      console.error('Error loading review data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function generateAIWeeklySummary() {
    try {
      setValidatingAI(true);

      const { data: weeklyCheckins } = await supabase
        .from('review_weekly_checkins')
        .select('*')
        .eq('employee_id', selectedReview?.employee_id)
        .gte('week_starting', new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString())
        .eq('status', 'completed');

      if (weeklyCheckins && weeklyCheckins.length > 0) {
        // Call AI edge function to generate summary
        const { data: summary } = await supabase.functions.invoke('generate-review-summary', {
          body: {
            weeklyCheckins,
            employeeId: selectedReview?.employee_id
          }
        });

        if (summary?.summary) {
          setAiWeeklySummary(summary.summary);
        }
      }
    } catch (error) {
      console.error('Error generating AI summary:', error);
    } finally {
      setValidatingAI(false);
    }
  }

  async function loadValuesCompetencies(competencyLevel: string) {
    try {
      const { data: valuesData } = await supabase
        .from('values')
        .select('id, title')
        .eq('is_active', true)
        .order('sort_order');

      if (!valuesData || valuesData.length === 0) { setValuesRatings([]); return; }

      const ratings: ValuesRating[] = [];

      for (const value of valuesData) {
        const { data: competenciesData } = await supabase
          .from('competencies')
          .select(`
            id, title, competency_statement,
            employee_evidence_prompt, employee_what_good_looks_like, employee_what_great_looks_like,
            manager_evidence_prompt, manager_what_good_looks_like, manager_what_great_looks_like,
            senior_leader_evidence_prompt, senior_leader_what_good_looks_like, senior_leader_what_great_looks_like
          `)
          .eq('value_id', value.id)
          .eq('is_active', true)
          .order('sort_order');

        if (!competenciesData) continue;

        for (const comp of competenciesData) {
          let evidence_prompt: string | undefined;
          let what_good_looks_like: string | undefined;
          let what_great_looks_like: string | undefined;

          if (competencyLevel === 'Manager') {
            evidence_prompt = comp.manager_evidence_prompt;
            what_good_looks_like = comp.manager_what_good_looks_like;
            what_great_looks_like = comp.manager_what_great_looks_like;
          } else if (competencyLevel === 'Senior Leader') {
            evidence_prompt = comp.senior_leader_evidence_prompt;
            what_good_looks_like = comp.senior_leader_what_good_looks_like;
            what_great_looks_like = comp.senior_leader_what_great_looks_like;
          } else {
            evidence_prompt = comp.employee_evidence_prompt;
            what_good_looks_like = comp.employee_what_good_looks_like;
            what_great_looks_like = comp.employee_what_great_looks_like;
          }

          ratings.push({
            value_id: value.id,
            value_title: value.title,
            competency_id: comp.id,
            competency_title: comp.title,
            competency_statement: comp.competency_statement,
            evidence_prompt,
            what_good_looks_like,
            what_great_looks_like,
            manager_rating: 3,
            manager_comment: '',
          });
        }
      }

      setValuesRatings(ratings);
    } catch (error) {
      console.error('Error loading values competencies:', error);
    }
  }

  function updateValuesRating(index: number, field: keyof ValuesRating, value: any) {
    setValuesRatings(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });

    if (field === 'manager_comment' || field === 'manager_rating') {
      // Read from current state snapshot — DO NOT rely on stale closure for merged values
      const vrCurrent = valuesRatings[index];
      if (!vrCurrent) return;
      const key = `${vrCurrent.value_id}-${vrCurrent.competency_id}`;

      // Merge the incoming change with current state so both rating and comment are up-to-date
      const rating = field === 'manager_rating' ? (value as number) : vrCurrent.manager_rating;
      const comment = field === 'manager_comment' ? (value as string) : vrCurrent.manager_comment;

      const commentTrimmed = (comment || '').trim();
      if (commentTrimmed.length < 15) {
        if (seraTimers.current[key]) clearTimeout(seraTimers.current[key]);
        if (field === 'manager_comment' && commentTrimmed.length === 0) {
          setSeraFeedbacks(prev => ({ ...prev, [key]: null }));
        }
        return;
      }

      // Capture all competency context NOW before the async closure runs
      const competencyTitle = vrCurrent.competency_title;
      const competencyStatement = vrCurrent.competency_statement;
      const whatGoodLooksLike = vrCurrent.what_good_looks_like;
      const whatGreatLooksLike = vrCurrent.what_great_looks_like;
      const employeeName = selectedReview?.employee?.full_name || 'Employee';
      const capturedSeraSystemPrompt = seraSystemPrompt;

      if (seraTimers.current[key]) clearTimeout(seraTimers.current[key]);
      setSeraFeedbacks(prev => ({ ...prev, [key]: { type: 'loading', message: 'Opal is evaluating...' } }));

      seraTimers.current[key] = setTimeout(async () => {
        try {
          const ratingLabels: Record<number, string> = { 1: 'Development Needed', 3: 'On Target', 5: 'Exceptional' };
          const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

          const { data: { session } } = await supabase.auth.getSession();
          const token = session?.access_token || import.meta.env.VITE_SUPABASE_ANON_KEY;

          const res = await fetch(`${supabaseUrl}/functions/v1/validate-rating-justification`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({
              rating,
              ratingType: 'competency',
              ratingLabel: ratingLabels[rating] || String(rating),
              managerComments: commentTrimmed,
              employeeName,
              competencyName: competencyTitle,
              competencyStatement,
              whatGoodLooksLike,
              whatGreatLooksLike,
              seraSystemPrompt: capturedSeraSystemPrompt || undefined,
            }),
          });

          if (!res.ok) throw new Error(`HTTP ${res.status}`);

          const data = await res.json();
          const isPositive = data.valid && (rating <= 3 || data.confidence === 'high');
          setSeraFeedbacks(prev => ({
            ...prev,
            [key]: {
              type: isPositive ? 'great' : 'mismatch',
              message: data.message || 'Unable to evaluate at this time.',
            },
          }));
        } catch (err) {
          console.error('[Opal] Feedback request failed:', err);
          const fallbackMsg = rating >= 5
            ? 'Opal feedback is unavailable right now. Please ensure level 5 ratings include measurable impact, multiple examples and clear business or merchant outcomes.'
            : rating === 4
            ? 'Opal feedback is unavailable right now. Please ensure this rating is supported by specific evidence and measurable outcomes.'
            : null;
          setSeraFeedbacks(prev => ({
            ...prev,
            [key]: fallbackMsg ? { type: 'mismatch', message: fallbackMsg } : null,
          }));
        }
      }, 1200);
    }
  }

  function dismissSeraFeedback(key: string) {
    setSeraFeedbacks(prev => ({ ...prev, [key]: null }));
  }

function updateKPIValue(index: number, field: string, value: any) {
    if (reviewType === 'weekly') {
      const updated = [...weeklyKPIs];
      updated[index] = { ...updated[index], [field]: value };

      // Calculate achievement percentage
      if (field === 'actual_value') {
        const percent = (value / updated[index].target_value) * 100;
        updated[index].achievement_percent = Math.round(percent);
      }

      setWeeklyKPIs(updated);
    } else {
      const updated = [...monthlyKPIs];
      updated[index] = { ...updated[index], [field]: value };

      if (field === 'actual_value') {
        const percent = (value / updated[index].target_value) * 100;
        updated[index].achievement_percent = Math.round(percent);
      }

      setMonthlyKPIs(updated);

      // Recalculate overall performance score
      const avgAchievement = updated.reduce((sum, kpi) => sum + kpi.achievement_percent, 0) / updated.length;
      setOverallPerformanceScore(Math.round(avgAchievement) / 25); // Convert to 1-4 scale
    }
  }

  function updateCompetencyRating(index: number, field: string, value: any) {
    const updated = [...competencyRatings];
    updated[index] = { ...updated[index], [field]: value };

    // Mark for approval if rating is 4
    if (field === 'rating' && value === 4) {
      updated[index].requires_approval = true;
    }

    setCompetencyRatings(updated);

    // Recalculate overall competency score
    const ratings = updated.filter(c => c.rating > 0);
    if (ratings.length > 0) {
      const avg = ratings.reduce((sum, c) => sum + c.rating, 0) / ratings.length;
      setOverallCompetencyScore(avg);
    }
  }

  async function validateCompetencyWithAI(index: number) {
    const competency = competencyRatings[index];

    if (!competency.comments || competency.comments.length < 20) {
      alert('Please provide more detailed comments (at least 20 characters) before AI validation');
      return;
    }

    try {
      setValidatingAI(true);

      // Call AI validation function
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/validate-competency-rating`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            competencyName: competency.competency_name,
            rating: competency.rating,
            comments: competency.comments,
            evidence: competency.evidence,
            targetLevel: competency.target_level
          })
        }
      );

      const result = await response.json();

      if (result.validation_status === 'needs_more_info') {
        alert(`AI Feedback: ${result.feedback}\n\nPlease provide more details.`);
      } else {
        alert('AI validation passed. Comments are sufficient to support this rating.');
      }

      // Update validation status in state
      const updated = [...competencyRatings];
      updated[index] = {
        ...updated[index],
        ...result
      };
      setCompetencyRatings(updated);

    } catch (error) {
      console.error('Error validating with AI:', error);
      alert('Failed to validate with AI');
    } finally {
      setValidatingAI(false);
    }
  }

  async function saveReview(submitForApproval: boolean = false) {
    if (!selectedReview) return;

    try {
      setLoading(true);

      if (reviewType === 'weekly') {
        // Save weekly check-in
        const { error } = await supabase
          .from('review_weekly_checkins')
          .update({
            kpi_results: weeklyKPIs,
            goal_updates: weeklyGoals,
            highlights,
            challenges,
            support_needed: supportNeeded,
            manager_comments: managerComments,
            status: submitForApproval ? 'completed' : 'in_progress',
            completed_at: submitForApproval ? new Date().toISOString() : null
          })
          .eq('id', selectedReview.id);

        if (error) throw error;

      } else {
        // Build competency payload from valuesRatings (what the manager actually filled in)
        const competencyPayload = valuesRatings.map(vr => ({
          competency_id: vr.competency_id,
          competency_name: vr.competency_title,
          value_id: vr.value_id,
          value_title: vr.value_title,
          rating: vr.manager_rating,
          comments: vr.manager_comment,
        }));

        const ratedCompetencies = valuesRatings.filter(vr => vr.manager_rating > 0);
        const computedCompetencyScore = ratedCompetencies.length > 0
          ? ratedCompetencies.reduce((sum, vr) => sum + vr.manager_rating, 0) / ratedCompetencies.length
          : 0;

        // Save monthly review
        const { error } = await supabase
          .from('review_monthly_sessions')
          .update({
            kpi_results: monthlyKPIs,
            kpi_summary: '',
            weekly_average_performance: weeklyAverage,
            overall_performance_score: overallPerformanceScore,
            overall_competency_score: computedCompetencyScore,
            competency_ratings: competencyPayload,
            employee_comments: employeeComments,
            manager_comments: monthlyManagerComments,
            ai_weekly_summary: aiWeeklySummary,
            status: submitForApproval ? 'completed' : 'in_progress',
            completed_at: submitForApproval ? new Date().toISOString() : null
          })
          .eq('id', selectedReview.id);

        if (error) throw error;

        // Save detailed competency ratings to review_competency_ratings (upsert to avoid duplicates on re-save)
        if (valuesRatings.length > 0) {
          // Delete existing rows for this review first so re-saves don't duplicate
          await supabase
            .from('review_competency_ratings')
            .delete()
            .eq('review_id', selectedReview.id);

          const competencyRows = valuesRatings.map(vr => ({
            review_id: selectedReview.id,
            employee_id: selectedReview.employee_id,
            competency_id: vr.competency_id,
            competency_name: vr.competency_title,
            actual_rating: vr.manager_rating,
            comments: vr.manager_comment,
            ai_validation_status: 'pending',
          }));

          const { error: compError } = await supabase
            .from('review_competency_ratings')
            .insert(competencyRows);

          if (compError) throw compError;
        }
      }

      // Send notification to employee
      await supabase.from('review_notifications').insert({
        recipient_id: selectedReview.employee_id,
        sender_id: profile?.id,
        notification_type: 'review_completed',
        title: `${reviewType === 'weekly' ? 'Weekly Check-in' : 'Monthly Review'} Completed`,
        message: `Your ${reviewType} review has been ${submitForApproval ? 'completed' : 'saved as draft'}`
      });

      alert(`Review ${submitForApproval ? 'submitted' : 'saved'} successfully!`);
      setSelectedReview(null);
      loadReviews();

    } catch (error) {
      console.error('Error saving review:', error);
      alert('Failed to save review');
    } finally {
      setLoading(false);
    }
  }

  if (selectedReview) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <button
          onClick={() => setSelectedReview(null)}
          className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Reviews
        </button>

        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900">
            {reviewType === 'weekly' ? 'Weekly Check-in' : 'Monthly Review'}
          </h2>
          <p className="text-gray-600">
            {selectedReview.employee.full_name} - {selectedReview.employee.job_title}
          </p>
          <p className="text-sm text-gray-500">
            {reviewType === 'weekly'
              ? `Week starting: ${new Date(selectedReview.week_starting!).toLocaleDateString()}`
              : `Review month: ${new Date(selectedReview.review_month!).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`
            }
          </p>
        </div>

        {reviewType === 'weekly' ? (
          <div className="space-y-6">
            {/* KPI Results */}
            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
                <Target className="w-5 h-5 mr-2" />
                KPI Results
              </h3>
              <div className="space-y-4">
                {weeklyKPIs.map((kpi, index) => (
                  <div key={index} className="grid grid-cols-6 gap-4">
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-gray-700">{kpi.kpi_name}</label>
                      <p className="text-sm text-gray-500">Target: {kpi.target_value} {kpi.measurement_unit}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Actual</label>
                      <input
                        type="number"
                        value={kpi.actual_value}
                        onChange={(e) => updateKPIValue(index, 'actual_value', parseFloat(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Achievement</label>
                      <div className="flex items-center h-10">
                        <span className={`text-lg font-semibold ${
                          kpi.achievement_percent >= 100 ? 'text-green-600' :
                          kpi.achievement_percent >= 80 ? 'text-blue-600' :
                          'text-orange-600'
                        }`}>
                          {kpi.achievement_percent}%
                        </span>
                      </div>
                    </div>
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-gray-700">Notes</label>
                      <input
                        type="text"
                        value={kpi.notes}
                        onChange={(e) => updateKPIValue(index, 'notes', e.target.value)}
                        placeholder="Any notes or context..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Goals Progress */}
            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
                <TrendingUp className="w-5 h-5 mr-2" />
                Goal Updates
              </h3>
              <div className="space-y-4">
                {weeklyGoals.map((goal, index) => (
                  <div key={index}>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {goal.goal_description}
                    </label>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={goal.progress_percent}
                          onChange={(e) => {
                            const updated = [...weeklyGoals];
                            updated[index].progress_percent = parseInt(e.target.value);
                            setWeeklyGoals(updated);
                          }}
                          className="w-full"
                        />
                        <p className="text-sm text-gray-600 text-center">{goal.progress_percent}% Complete</p>
                      </div>
                      <textarea
                        value={goal.comments}
                        onChange={(e) => {
                          const updated = [...weeklyGoals];
                          updated[index].comments = e.target.value;
                          setWeeklyGoals(updated);
                        }}
                        placeholder="Progress update..."
                        rows={2}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Weekly Reflection */}
            <div className="border border-gray-200 rounded-lg p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Highlights This Week
                </label>
                <textarea
                  value={highlights}
                  onChange={(e) => setHighlights(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Challenges Faced
                </label>
                <textarea
                  value={challenges}
                  onChange={(e) => setChallenges(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Support Needed
                </label>
                <textarea
                  value={supportNeeded}
                  onChange={(e) => setSupportNeeded(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Manager Comments
                </label>
                <textarea
                  value={managerComments}
                  onChange={(e) => setManagerComments(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Weekly Average Banner */}
            {weeklyAverage > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 mb-2">Weekly Check-in Average</h4>
                <p className="text-2xl font-bold text-blue-700">{weeklyAverage.toFixed(1)}%</p>
                <p className="text-sm text-blue-600">Based on completed weekly check-ins this month</p>
              </div>
            )}

            {/* AI Weekly Summary */}
            {aiWeeklySummary && (
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <h4 className="font-medium text-purple-900 mb-2 flex items-center">
                  <Sparkles className="w-4 h-4 mr-2" />
                  AI Summary of Weekly Check-ins
                </h4>
                <p className="text-sm text-purple-800">{aiWeeklySummary}</p>
              </div>
            )}

            {/* Monthly KPIs */}
            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-4">Monthly KPI Results</h3>
              <div className="space-y-3">
                {monthlyKPIs.map((kpi, index) => (
                  <div key={index} className="grid grid-cols-5 gap-4 items-center">
                    <div className="col-span-2">
                      <p className="font-medium text-gray-900">{kpi.kpi_name}</p>
                      <p className="text-sm text-gray-500">Target: {kpi.target_value} {kpi.measurement_unit}</p>
                    </div>
                    <input
                      type="number"
                      value={kpi.actual_value}
                      onChange={(e) => updateKPIValue(index, 'actual_value', parseFloat(e.target.value))}
                      className="px-3 py-2 border border-gray-300 rounded-lg"
                    />
                    <div className="col-span-2">
                      <div className="flex items-center">
                        <div className="flex-1 bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${
                              kpi.achievement_percent >= 100 ? 'bg-green-600' :
                              kpi.achievement_percent >= 80 ? 'bg-blue-600' :
                              'bg-orange-600'
                            }`}
                            style={{ width: `${Math.min(kpi.achievement_percent, 100)}%` }}
                          />
                        </div>
                        <span className="ml-3 font-semibold">{kpi.achievement_percent}%</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {monthlyKPIs.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <p className="text-sm text-gray-600">
                    Overall Performance Score: <span className="font-bold text-lg">{overallPerformanceScore.toFixed(1)}/4</span>
                  </p>
                </div>
              )}
            </div>

            {/* Values & Behaviours */}
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <Award className="w-5 h-5" />
                  Values & Behaviours
                </h3>
                <span className="text-xs bg-blue-50 text-blue-600 border border-blue-200 px-2.5 py-1 rounded-full font-medium">
                  {selectedReview.employee.competency_level || 'Employee'} level
                </span>
              </div>

              {valuesRatings.length === 0 ? (
                <p className="text-sm text-gray-500 py-4 text-center">No competencies found. Add competencies in Admin settings.</p>
              ) : (
                <div className="space-y-6">
                  {Array.from(new Set(valuesRatings.map(r => r.value_id))).map(valueId => {
                    const rows = valuesRatings.filter(r => r.value_id === valueId);
                    const valueTitle = rows[0]?.value_title;
                    return (
                      <div key={valueId}>
                        <h4 className="text-sm font-bold text-gray-800 mb-3 pb-1.5 border-b border-gray-200">{valueTitle}</h4>
                        <div className="space-y-3">
                          {rows.map(vr => {
                            const idx = valuesRatings.findIndex(r => r.value_id === vr.value_id && r.competency_id === vr.competency_id);
                            const feedbackKey = `${vr.value_id}-${vr.competency_id}`;
                            const sera = seraFeedbacks[feedbackKey];
                            return (
                              <div key={vr.competency_id} className="rounded-lg border border-gray-200 bg-white p-4 space-y-3">
                                <p className="font-semibold text-gray-900 text-sm leading-snug">{vr.competency_title}</p>
                                <p className="text-xs text-gray-600 leading-relaxed">
                                  {vr.evidence_prompt || 'Describe observed behaviours and examples.'}
                                </p>
                                <div>
                                  <label className="block text-xs font-medium text-gray-500 mb-1">Rating</label>
                                  <select
                                    value={vr.manager_rating}
                                    onChange={e => updateValuesRating(idx, 'manager_rating', parseInt(e.target.value))}
                                    className={`w-40 px-2 py-1.5 border rounded-lg text-xs font-semibold focus:ring-2 focus:ring-blue-500 ${
                                      vr.manager_rating === 1 ? 'text-red-700 border-red-300 bg-red-50' :
                                      vr.manager_rating === 5 ? 'text-emerald-700 border-emerald-300 bg-emerald-50' :
                                      'text-blue-700 border-blue-300 bg-blue-50'
                                    }`}
                                  >
                                    {COMPETENCY_RATING_OPTIONS.map(opt => (
                                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                                    ))}
                                  </select>
                                </div>
                                <div>
                                  <label className="block text-xs font-medium text-gray-500 mb-1">Evidence &amp; Examples</label>
                                  <textarea
                                    value={vr.manager_comment}
                                    onChange={e => updateValuesRating(idx, 'manager_comment', e.target.value)}
                                    rows={5}
                                    required
                                    placeholder="Enter evidence and examples..."
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 resize-y"
                                  />
                                  {sera && (
                                    <div className={`flex items-start gap-2 p-2 rounded-lg text-xs mt-1.5 ${
                                      sera.type === 'loading' ? 'bg-gray-50 border border-gray-200 text-gray-500' :
                                      sera.type === 'great' ? 'bg-emerald-50 border border-emerald-200 text-emerald-800' :
                                      'bg-amber-50 border border-amber-300 text-amber-900'
                                    }`}>
                                      {sera.type === 'loading'
                                        ? <Clock className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-gray-400 animate-spin" />
                                        : sera.type === 'great'
                                          ? <Sparkles className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-emerald-600" />
                                          : <MessageSquare className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-amber-600" />
                                      }
                                      <span className="flex-1">{sera.message}</span>
                                      {sera.type !== 'loading' && (
                                        <button onClick={() => dismissSeraFeedback(feedbackKey)}>
                                          <X className="w-3.5 h-3.5" />
                                        </button>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Active Career Plan Actions — only shown when a confirmed plan exists */}
            {activePlanTitle && activePlanActions.length > 0 && (
              <div className="border border-teal-200 rounded-lg p-4 bg-teal-50">
                <h3 className="font-semibold text-teal-900 mb-1 flex items-center gap-2">
                  <Target className="w-4 h-4" />
                  Active Career Plan — Outstanding Actions
                </h3>
                <p className="text-xs text-teal-700 mb-3">Target Role: <strong>{activePlanTitle}</strong> · These are outstanding actions from the employee's confirmed career plan. Reviewing them here does not change the career plan.</p>
                <div className="space-y-2">
                  {activePlanActions.map(action => (
                    <div key={action.id} className="flex items-start gap-2 bg-white border border-teal-100 rounded p-2.5">
                      <div className="w-4 h-4 rounded-full border-2 border-teal-300 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-gray-900">{action.title}</div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-teal-600 capitalize">{action.source}</span>
                          {action.due_date && (
                            <span className="text-xs text-gray-400">Due {new Date(action.due_date).toLocaleDateString()}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Comments */}
            <div className="border border-gray-200 rounded-lg p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Manager Summary
                </label>
                <textarea
                  value={monthlyManagerComments}
                  onChange={(e) => setMonthlyManagerComments(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-end gap-4 mt-6 pt-6 border-t border-gray-200">
          <button
            onClick={() => saveReview(false)}
            disabled={loading}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            <Save className="w-4 h-4 inline mr-2" />
            Save Draft
          </button>
          <button
            onClick={() => saveReview(true)}
            disabled={loading}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            <Send className="w-4 h-4 inline mr-2" />
            Complete Review
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Conduct Reviews</h2>

        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setReviewType('weekly')}
            className={`flex-1 px-6 py-3 rounded-lg font-medium ${
              reviewType === 'weekly'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Clock className="w-5 h-5 inline mr-2" />
            Weekly Check-ins
          </button>
          <button
            onClick={() => setReviewType('monthly')}
            className={`flex-1 px-6 py-3 rounded-lg font-medium ${
              reviewType === 'monthly'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Calendar className="w-5 h-5 inline mr-2" />
            Monthly Reviews
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading reviews...</p>
          </div>
        ) : reviews.length === 0 ? (
          <div className="text-center py-12">
            <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No scheduled {reviewType} reviews</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {reviews.map((review) => (
              <div
                key={review.id}
                className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors cursor-pointer"
                onClick={() => setSelectedReview(review)}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900">{review.employee.full_name}</h3>
                    <p className="text-sm text-gray-600">{review.employee.job_title}</p>
                    <p className="text-sm text-gray-500 mt-1">
                      {reviewType === 'weekly'
                        ? `Week: ${new Date(review.week_starting!).toLocaleDateString()}`
                        : `Month: ${new Date(review.review_month!).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`
                      }
                    </p>
                  </div>
                  <div className="flex items-center">
                    <span className="px-3 py-1 bg-yellow-100 text-yellow-800 text-sm font-medium rounded-full">
                      {review.status}
                    </span>
                    <CheckCircle className="w-5 h-5 text-gray-400 ml-4" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
