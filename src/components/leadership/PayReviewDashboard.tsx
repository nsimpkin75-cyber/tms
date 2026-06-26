import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Award, DollarSign, TrendingUp, Check, Filter, Download } from 'lucide-react';

interface EligibleEmployee {
  employee_id: string;
  employee_name: string;
  department: string;
  average_performance_score: number;
  average_competency_score: number;
  review_id: string;
  manager_name: string;
  pay_review_recommended: boolean;
  bonus_recommended: boolean;
  promotion_recommended: boolean;
  recommendation_rationale: string;
}

export default function PayReviewDashboard() {
  const { profile } = useAuth();
  const [eligibleEmployees, setEligibleEmployees] = useState<EligibleEmployee[]>([]);
  const [filteredEmployees, setFilteredEmployees] = useState<EligibleEmployee[]>([]);
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [recommendationFilter, setRecommendationFilter] = useState('all');
  const [departments, setDepartments] = useState<string[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<EligibleEmployee | null>(null);
  const [reviewDetails, setReviewDetails] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (profile?.role === 'leadership' || profile?.role === 'admin') {
      loadEligibleEmployees();
    }
  }, [profile]);

  useEffect(() => {
    applyFilters();
  }, [eligibleEmployees, departmentFilter, recommendationFilter]);

  async function loadEligibleEmployees() {
    try {
      setLoading(true);

      const { data, error } = await supabase.rpc('get_employees_eligible_for_pay_review');

      if (error) throw error;

      // Also get detailed review data
      const reviewIds = data?.map(e => e.review_id) || [];
      const { data: reviews } = await supabase
        .from('review_six_month_performance')
        .select('*')
        .in('id', reviewIds);

      // Merge data
      const enriched = data?.map(emp => {
        const review = reviews?.find(r => r.id === emp.review_id);
        return {
          ...emp,
          pay_review_recommended: review?.pay_review_recommended || false,
          bonus_recommended: review?.bonus_recommended || false,
          promotion_recommended: review?.promotion_recommended || false,
          recommendation_rationale: review?.recommendation_rationale || ''
        };
      }) || [];

      setEligibleEmployees(enriched);

      // Extract unique departments
      const depts = Array.from(new Set(enriched.map(e => e.department).filter(Boolean)));
      setDepartments(depts);

    } catch (error) {
      console.error('Error loading eligible employees:', error);
    } finally {
      setLoading(false);
    }
  }

  function applyFilters() {
    let filtered = [...eligibleEmployees];

    if (departmentFilter !== 'all') {
      filtered = filtered.filter(e => e.department === departmentFilter);
    }

    if (recommendationFilter === 'pay') {
      filtered = filtered.filter(e => e.pay_review_recommended);
    } else if (recommendationFilter === 'bonus') {
      filtered = filtered.filter(e => e.bonus_recommended);
    } else if (recommendationFilter === 'promotion') {
      filtered = filtered.filter(e => e.promotion_recommended);
    }

    setFilteredEmployees(filtered);
  }

  async function loadReviewDetails(employee: EligibleEmployee) {
    try {
      const { data, error } = await supabase
        .from('review_six_month_performance')
        .select('*')
        .eq('id', employee.review_id)
        .single();

      if (error) throw error;

      // Load monthly reviews
      const { data: monthlyReviews } = await supabase
        .from('review_monthly_sessions')
        .select('*')
        .in('id', data.monthly_review_ids);

      setReviewDetails({
        ...data,
        monthly_reviews: monthlyReviews
      });
      setSelectedEmployee(employee);
    } catch (error) {
      console.error('Error loading review details:', error);
    }
  }

  async function approveForPayReview(employeeId: string, reviewId: string) {
    try {
      const { error } = await supabase
        .from('review_six_month_performance')
        .update({
          status: 'pay_review',
          approved_by: profile?.id,
          approved_at: new Date().toISOString()
        })
        .eq('id', reviewId);

      if (error) throw error;

      // Send notification
      await supabase.from('review_notifications').insert({
        recipient_id: employeeId,
        sender_id: profile?.id,
        notification_type: 'pay_review_approved',
        title: 'Approved for Pay Review',
        message: 'Your exceptional performance has been approved for pay review consideration',
        related_review_id: reviewId
      });

      alert('Employee approved for pay review!');
      setSelectedEmployee(null);
      loadEligibleEmployees();
    } catch (error) {
      console.error('Error approving for pay review:', error);
      alert('Failed to approve for pay review');
    }
  }

  function exportToCSV() {
    const headers = [
      'Employee Name',
      'Department',
      'Manager',
      'Avg Performance',
      'Avg Competency',
      'Pay Review',
      'Bonus',
      'Promotion'
    ];

    const rows = filteredEmployees.map(emp => [
      emp.employee_name,
      emp.department,
      emp.manager_name,
      emp.average_performance_score.toFixed(2),
      emp.average_competency_score.toFixed(2),
      emp.pay_review_recommended ? 'Yes' : 'No',
      emp.bonus_recommended ? 'Yes' : 'No',
      emp.promotion_recommended ? 'Yes' : 'No'
    ]);

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pay-review-eligible-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  }

  const stats = {
    total: filteredEmployees.length,
    payReview: filteredEmployees.filter(e => e.pay_review_recommended).length,
    bonus: filteredEmployees.filter(e => e.bonus_recommended).length,
    promotion: filteredEmployees.filter(e => e.promotion_recommended).length,
    avgPerformance: filteredEmployees.length > 0
      ? filteredEmployees.reduce((sum, e) => sum + e.average_performance_score, 0) / filteredEmployees.length
      : 0,
    avgCompetency: filteredEmployees.length > 0
      ? filteredEmployees.reduce((sum, e) => sum + e.average_competency_score, 0) / filteredEmployees.length
      : 0
  };

  if (selectedEmployee && reviewDetails) {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <button
            onClick={() => {
              setSelectedEmployee(null);
              setReviewDetails(null);
            }}
            className="mb-4 text-gray-600 hover:text-gray-900"
          >
            ← Back to Dashboard
          </button>

          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900">{selectedEmployee.employee_name}</h2>
            <p className="text-gray-600">{selectedEmployee.department}</p>
            <p className="text-sm text-gray-500">Manager: {selectedEmployee.manager_name}</p>
          </div>

          {/* Performance Summary */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-900 font-medium mb-2">Average Performance</p>
              <p className="text-3xl font-bold text-blue-700">{selectedEmployee.average_performance_score.toFixed(2)}</p>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-sm text-green-900 font-medium mb-2">Average Competency</p>
              <p className="text-3xl font-bold text-green-700">{selectedEmployee.average_competency_score.toFixed(2)}</p>
            </div>
          </div>

          {/* Review Details */}
          <div className="space-y-6">
            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-3">Manager Summary</h3>
              <p className="text-gray-700 whitespace-pre-wrap">{reviewDetails.manager_summary}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-3">Strengths</h3>
                <p className="text-gray-700 whitespace-pre-wrap">{reviewDetails.strengths}</p>
              </div>
              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-3">Development Areas</h3>
                <p className="text-gray-700 whitespace-pre-wrap">{reviewDetails.development_areas}</p>
              </div>
            </div>

            {reviewDetails.recommended_actions && (
              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-3">Recommended Actions</h3>
                <p className="text-gray-700 whitespace-pre-wrap">{reviewDetails.recommended_actions}</p>
              </div>
            )}

            {/* Recommendations */}
            <div className="border border-gray-200 rounded-lg p-4 bg-yellow-50">
              <h3 className="font-semibold text-gray-900 mb-4">Manager Recommendations</h3>
              <div className="space-y-3">
                {selectedEmployee.pay_review_recommended && (
                  <div className="flex items-center text-green-700">
                    <Check className="w-5 h-5 mr-2" />
                    <span className="font-medium">Pay Review Recommended</span>
                  </div>
                )}
                {selectedEmployee.bonus_recommended && (
                  <div className="flex items-center text-green-700">
                    <Check className="w-5 h-5 mr-2" />
                    <span className="font-medium">Bonus Recommended</span>
                  </div>
                )}
                {selectedEmployee.promotion_recommended && (
                  <div className="flex items-center text-green-700">
                    <Check className="w-5 h-5 mr-2" />
                    <span className="font-medium">Promotion Recommended</span>
                  </div>
                )}
              </div>

              {selectedEmployee.recommendation_rationale && (
                <div className="mt-4 pt-4 border-t border-yellow-200">
                  <p className="text-sm font-medium text-gray-700 mb-2">Rationale:</p>
                  <p className="text-gray-700">{selectedEmployee.recommendation_rationale}</p>
                </div>
              )}
            </div>

            {/* Trend Analysis */}
            {reviewDetails.trend_analysis && (
              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
                  <TrendingUp className="w-5 h-5 mr-2" />
                  Performance Trend
                </h3>
                <p className="text-gray-700">{reviewDetails.trend_analysis.trend}</p>
              </div>
            )}
          </div>

          {/* Approval Action */}
          {reviewDetails.status === 'submitted' && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <button
                onClick={() => approveForPayReview(selectedEmployee.employee_id, selectedEmployee.review_id)}
                className="w-full flex items-center justify-center px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                <Check className="w-5 h-5 mr-2" />
                Approve for Pay Review Process
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Pay Review & Bonus Eligible Employees</h2>
          <button
            onClick={exportToCSV}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </button>
        </div>

        {/* Stats Dashboard */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-blue-900">Total Eligible</span>
              <Award className="w-5 h-5 text-blue-600" />
            </div>
            <p className="text-2xl font-bold text-blue-700">{stats.total}</p>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-green-900">Pay Review</span>
              <DollarSign className="w-5 h-5 text-green-600" />
            </div>
            <p className="text-2xl font-bold text-green-700">{stats.payReview}</p>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-yellow-900">Bonus</span>
              <Award className="w-5 h-5 text-yellow-600" />
            </div>
            <p className="text-2xl font-bold text-yellow-700">{stats.bonus}</p>
          </div>

          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-purple-900">Promotion</span>
              <TrendingUp className="w-5 h-5 text-purple-600" />
            </div>
            <p className="text-2xl font-bold text-purple-700">{stats.promotion}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-4 mb-6">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Filters:</span>
          </div>

          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg"
          >
            <option value="all">All Departments</option>
            {departments.map(dept => (
              <option key={dept} value={dept}>{dept}</option>
            ))}
          </select>

          <select
            value={recommendationFilter}
            onChange={(e) => setRecommendationFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg"
          >
            <option value="all">All Recommendations</option>
            <option value="pay">Pay Review</option>
            <option value="bonus">Bonus</option>
            <option value="promotion">Promotion</option>
          </select>
        </div>

        {/* Employee List */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading eligible employees...</p>
          </div>
        ) : filteredEmployees.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Award className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p>No eligible employees found with the current filters</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredEmployees.map((employee) => (
              <div
                key={employee.employee_id}
                onClick={() => loadReviewDetails(employee)}
                className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">{employee.employee_name}</h3>
                    <p className="text-sm text-gray-600">
                      {employee.department} • Manager: {employee.manager_name}
                    </p>
                    <div className="flex gap-2 mt-2">
                      {employee.pay_review_recommended && (
                        <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                          Pay Review
                        </span>
                      )}
                      {employee.bonus_recommended && (
                        <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-medium rounded-full">
                          Bonus
                        </span>
                      )}
                      {employee.promotion_recommended && (
                        <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs font-medium rounded-full">
                          Promotion
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600">Performance</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {employee.average_performance_score.toFixed(1)}
                    </p>
                    <p className="text-sm text-gray-600 mt-2">Competency</p>
                    <p className="text-2xl font-bold text-green-600">
                      {employee.average_competency_score.toFixed(1)}
                    </p>
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
