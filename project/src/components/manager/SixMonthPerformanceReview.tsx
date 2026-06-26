import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { TrendingUp, Award, Target, Send, Save, Calendar } from 'lucide-react';

interface Employee {
  id: string;
  full_name: string;
  job_title: string;
  department: string;
}

interface MonthlyReview {
  id: string;
  review_month: string;
  overall_performance_score: number;
  overall_competency_score: number;
  status: string;
}

export default function SixMonthPerformanceReview() {
  const { profile } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<string>('');
  const [monthlyReviews, setMonthlyReviews] = useState<MonthlyReview[]>([]);
  const [selectedReviews, setSelectedReviews] = useState<string[]>([]);
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');

  const [averagePerformance, setAveragePerformance] = useState(0);
  const [averageCompetency, setAverageCompetency] = useState(0);
  const [trendAnalysis, setTrendAnalysis] = useState('');
  const [managerSummary, setManagerSummary] = useState('');
  const [strengths, setStrengths] = useState('');
  const [developmentAreas, setDevelopmentAreas] = useState('');
  const [recommendedActions, setRecommendedActions] = useState('');
  const [payReviewRecommended, setPayReviewRecommended] = useState(false);
  const [bonusRecommended, setBonusRecommended] = useState(false);
  const [promotionRecommended, setPromotionRecommended] = useState(false);
  const [recommendationRationale, setRecommendationRationale] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (profile?.id) {
      loadTeamMembers();
    }
  }, [profile]);

  useEffect(() => {
    if (selectedEmployee) {
      loadMonthlyReviews();
    }
  }, [selectedEmployee]);

  useEffect(() => {
    if (selectedReviews.length > 0) {
      calculateAverages();
      generateTrendAnalysis();
    }
  }, [selectedReviews, monthlyReviews]);

  async function loadTeamMembers() {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, job_title, department')
        .eq('manager_id', profile?.id);

      if (error) throw error;
      setEmployees(data || []);
    } catch (error) {
      console.error('Error loading team members:', error);
    }
  }

  async function loadMonthlyReviews() {
    try {
      const { data, error } = await supabase
        .from('review_monthly_sessions')
        .select('id, review_month, overall_performance_score, overall_competency_score, status')
        .eq('employee_id', selectedEmployee)
        .eq('status', 'completed')
        .order('review_month', { ascending: false })
        .limit(12);

      if (error) throw error;
      setMonthlyReviews(data || []);
    } catch (error) {
      console.error('Error loading monthly reviews:', error);
    }
  }

  function toggleReviewSelection(reviewId: string) {
    setSelectedReviews(prev => {
      const updated = prev.includes(reviewId)
        ? prev.filter(id => id !== reviewId)
        : [...prev, reviewId];

      // Limit to 6 reviews
      if (updated.length > 6) {
        alert('You can only select up to 6 monthly reviews');
        return prev;
      }

      return updated;
    });
  }

  function calculateAverages() {
    const selected = monthlyReviews.filter(r => selectedReviews.includes(r.id));

    if (selected.length === 0) return;

    const avgPerf = selected.reduce((sum, r) => sum + (r.overall_performance_score || 0), 0) / selected.length;
    const avgComp = selected.reduce((sum, r) => sum + (r.overall_competency_score || 0), 0) / selected.length;

    setAveragePerformance(avgPerf);
    setAverageCompetency(avgComp);

    // Auto-suggest pay review if both scores are 4+
    if (avgPerf >= 4 && avgComp >= 4) {
      setPayReviewRecommended(true);
      setBonusRecommended(true);
    }
  }

  function generateTrendAnalysis() {
    const selected = monthlyReviews
      .filter(r => selectedReviews.includes(r.id))
      .sort((a, b) => new Date(a.review_month).getTime() - new Date(b.review_month).getTime());

    if (selected.length < 2) return;

    const firstHalf = selected.slice(0, Math.ceil(selected.length / 2));
    const secondHalf = selected.slice(Math.ceil(selected.length / 2));

    const firstAvg = firstHalf.reduce((sum, r) => sum + (r.overall_performance_score || 0), 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, r) => sum + (r.overall_performance_score || 0), 0) / secondHalf.length;

    let trend = '';
    if (secondAvg > firstAvg + 0.3) {
      trend = 'Strong upward trend - Performance has significantly improved over the period.';
    } else if (secondAvg > firstAvg) {
      trend = 'Positive trend - Performance has gradually improved.';
    } else if (secondAvg < firstAvg - 0.3) {
      trend = 'Declining trend - Performance has decreased and requires attention.';
    } else {
      trend = 'Consistent performance - Stable scores throughout the period.';
    }

    setTrendAnalysis(trend);
  }

  async function saveDraft() {
    await saveReview('draft');
  }

  async function submitForApproval() {
    if (!managerSummary || !strengths || !developmentAreas) {
      alert('Please complete all required fields: Summary, Strengths, and Development Areas');
      return;
    }

    if ((payReviewRecommended || bonusRecommended || promotionRecommended) && !recommendationRationale) {
      alert('Please provide rationale for your pay/bonus/promotion recommendations');
      return;
    }

    await saveReview('submitted');
  }

  async function saveReview(status: string) {
    if (!selectedEmployee || selectedReviews.length !== 6) {
      alert('Please select exactly 6 monthly reviews');
      return;
    }

    try {
      setLoading(true);

      // Get period dates from selected reviews
      const selected = monthlyReviews.filter(r => selectedReviews.includes(r.id));
      const dates = selected.map(r => new Date(r.review_month)).sort((a, b) => a.getTime() - b.getTime());
      const start = dates[0];
      const end = dates[dates.length - 1];

      const { data, error } = await supabase
        .from('review_six_month_performance')
        .insert({
          employee_id: selectedEmployee,
          manager_id: profile?.id,
          review_period_start: start.toISOString().split('T')[0],
          review_period_end: end.toISOString().split('T')[0],
          monthly_review_ids: selectedReviews,
          average_performance_score: averagePerformance,
          average_competency_score: averageCompetency,
          trend_analysis: { trend: trendAnalysis, reviews: selected },
          manager_summary: managerSummary,
          strengths,
          development_areas: developmentAreas,
          recommended_actions: recommendedActions,
          pay_review_recommended: payReviewRecommended,
          bonus_recommended: bonusRecommended,
          promotion_recommended: promotionRecommended,
          recommendation_rationale: recommendationRationale,
          status,
          submitted_at: status === 'submitted' ? new Date().toISOString() : null
        })
        .select()
        .single();

      if (error) throw error;

      // If submitted and has high ratings, notify head of dept for approval
      if (status === 'submitted' && averagePerformance >= 4 && averageCompetency >= 4) {
        const { data: hod } = await supabase.rpc('get_head_of_department', {
          p_employee_id: selectedEmployee
        });

        if (hod) {
          await supabase.from('review_notifications').insert({
            recipient_id: hod,
            sender_id: profile?.id,
            notification_type: 'approval_needed',
            title: '6-Month Review Approval Required',
            message: 'A 6-month performance review with high ratings requires your approval',
            related_review_id: data.id
          });
        }
      }

      // Notify employee
      await supabase.from('review_notifications').insert({
        recipient_id: selectedEmployee,
        sender_id: profile?.id,
        notification_type: 'review_completed',
        title: '6-Month Performance Review Completed',
        message: `Your 6-month performance review has been ${status === 'submitted' ? 'submitted' : 'saved as draft'}`
      });

      alert(`6-month performance review ${status === 'submitted' ? 'submitted' : 'saved'} successfully!`);

      // Reset form
      setSelectedEmployee('');
      setSelectedReviews([]);
      setMonthlyReviews([]);
      resetForm();

    } catch (error) {
      console.error('Error saving review:', error);
      alert('Failed to save review');
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setManagerSummary('');
    setStrengths('');
    setDevelopmentAreas('');
    setRecommendedActions('');
    setPayReviewRecommended(false);
    setBonusRecommended(false);
    setPromotionRecommended(false);
    setRecommendationRationale('');
    setAveragePerformance(0);
    setAverageCompetency(0);
    setTrendAnalysis('');
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">6-Month Performance Review</h2>

        <div className="space-y-6">
          {/* Employee Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Employee
            </label>
            <select
              value={selectedEmployee}
              onChange={(e) => {
                setSelectedEmployee(e.target.value);
                setSelectedReviews([]);
                resetForm();
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            >
              <option value="">Choose an employee...</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.full_name} - {emp.job_title}
                </option>
              ))}
            </select>
          </div>

          {selectedEmployee && monthlyReviews.length > 0 && (
            <>
              {/* Review Selection */}
              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
                  <Calendar className="w-5 h-5 mr-2" />
                  Select 6 Monthly Reviews ({selectedReviews.length}/6)
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {monthlyReviews.map((review) => (
                    <label
                      key={review.id}
                      className={`border rounded-lg p-3 cursor-pointer transition-colors ${
                        selectedReviews.includes(review.id)
                          ? 'border-blue-600 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedReviews.includes(review.id)}
                        onChange={() => toggleReviewSelection(review.id)}
                        className="mr-2"
                      />
                      <span className="text-sm font-medium">
                        {new Date(review.review_month).toLocaleDateString('en-US', {
                          month: 'short',
                          year: 'numeric'
                        })}
                      </span>
                      <div className="text-xs text-gray-600 mt-1">
                        Perf: {review.overall_performance_score?.toFixed(1) || 'N/A'} |
                        Comp: {review.overall_competency_score?.toFixed(1) || 'N/A'}
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {selectedReviews.length === 6 && (
                <>
                  {/* Performance Summary */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-blue-900">Avg Performance</span>
                        <Target className="w-5 h-5 text-blue-600" />
                      </div>
                      <p className="text-3xl font-bold text-blue-700">{averagePerformance.toFixed(2)}</p>
                      <p className="text-xs text-blue-600 mt-1">out of 4.0</p>
                    </div>

                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-green-900">Avg Competency</span>
                        <Award className="w-5 h-5 text-green-600" />
                      </div>
                      <p className="text-3xl font-bold text-green-700">{averageCompetency.toFixed(2)}</p>
                      <p className="text-xs text-green-600 mt-1">out of 4.0</p>
                    </div>

                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-purple-900">Trend</span>
                        <TrendingUp className="w-5 h-5 text-purple-600" />
                      </div>
                      <p className="text-sm text-purple-700 mt-2">{trendAnalysis}</p>
                    </div>
                  </div>

                  {/* Manager Assessment */}
                  <div className="border border-gray-200 rounded-lg p-4 space-y-4">
                    <h3 className="font-semibold text-gray-900">Manager Assessment</h3>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Overall Summary *
                      </label>
                      <textarea
                        value={managerSummary}
                        onChange={(e) => setManagerSummary(e.target.value)}
                        rows={4}
                        placeholder="Provide a comprehensive summary of performance over the 6-month period..."
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Key Strengths *
                        </label>
                        <textarea
                          value={strengths}
                          onChange={(e) => setStrengths(e.target.value)}
                          rows={3}
                          placeholder="List the employee's key strengths..."
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Development Areas *
                        </label>
                        <textarea
                          value={developmentAreas}
                          onChange={(e) => setDevelopmentAreas(e.target.value)}
                          rows={3}
                          placeholder="Areas for continued development..."
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Recommended Actions
                      </label>
                      <textarea
                        value={recommendedActions}
                        onChange={(e) => setRecommendedActions(e.target.value)}
                        rows={3}
                        placeholder="Specific actions or next steps..."
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                  </div>

                  {/* Recommendations */}
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h3 className="font-semibold text-gray-900 mb-4">Recommendations</h3>

                    <div className="space-y-3">
                      <label className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={payReviewRecommended}
                          onChange={(e) => setPayReviewRecommended(e.target.checked)}
                          className="w-4 h-4 text-blue-600 rounded"
                        />
                        <span className="ml-3 font-medium text-gray-900">Recommend for Pay Review</span>
                      </label>

                      <label className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={bonusRecommended}
                          onChange={(e) => setBonusRecommended(e.target.checked)}
                          className="w-4 h-4 text-blue-600 rounded"
                        />
                        <span className="ml-3 font-medium text-gray-900">Recommend for Bonus</span>
                      </label>

                      <label className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={promotionRecommended}
                          onChange={(e) => setPromotionRecommended(e.target.checked)}
                          className="w-4 h-4 text-blue-600 rounded"
                        />
                        <span className="ml-3 font-medium text-gray-900">Recommend for Promotion</span>
                      </label>

                      {(payReviewRecommended || bonusRecommended || promotionRecommended) && (
                        <div className="mt-4">
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Recommendation Rationale *
                          </label>
                          <textarea
                            value={recommendationRationale}
                            onChange={(e) => setRecommendationRationale(e.target.value)}
                            rows={3}
                            placeholder="Provide detailed justification for your recommendations..."
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex justify-end gap-4 pt-6 border-t border-gray-200">
                    <button
                      onClick={saveDraft}
                      disabled={loading}
                      className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                    >
                      <Save className="w-4 h-4 inline mr-2" />
                      Save Draft
                    </button>
                    <button
                      onClick={submitForApproval}
                      disabled={loading}
                      className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                      <Send className="w-4 h-4 inline mr-2" />
                      Submit for Approval
                    </button>
                  </div>
                </>
              )}
            </>
          )}

          {selectedEmployee && monthlyReviews.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <p>No completed monthly reviews found for this employee.</p>
              <p className="text-sm mt-2">Employees need at least 6 completed monthly reviews.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
