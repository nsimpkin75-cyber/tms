import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Award, Calendar, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';

interface PerformanceReviewsTabProps {
  employeeId: string;
}

export default function PerformanceReviewsTab({ employeeId }: PerformanceReviewsTabProps) {
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPerformanceReviews();
  }, [employeeId]);

  async function loadPerformanceReviews() {
    try {
      const { data, error } = await supabase
        .from('one_to_one_half_year_reviews')
        .select('*')
        .eq('employee_id', employeeId)
        .order('review_period_end', { ascending: false });

      if (error) throw error;
      setReviews(data || []);
    } catch (error) {
      console.error('Error loading performance reviews:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (reviews.length === 0) {
    return (
      <div className="text-center py-12">
        <Award className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Performance Reviews Yet</h3>
        <p className="text-gray-500">
          Half-year performance reviews will appear here once completed
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4">
        {reviews.map((review) => (
          <div key={review.id} className="border rounded-lg p-6 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h4 className="text-lg font-semibold text-gray-900">
                  {format(new Date(review.review_period_start), 'MMM yyyy')} - {format(new Date(review.review_period_end), 'MMM yyyy')}
                </h4>
                <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
                  <Calendar className="w-4 h-4" />
                  Submitted {review.submitted_at ? format(new Date(review.submitted_at), 'MMM dd, yyyy') : 'Draft'}
                </div>
              </div>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                review.status === 'completed' ? 'bg-green-100 text-green-700' :
                review.status === 'pending_self_assessment' ? 'bg-yellow-100 text-yellow-700' :
                'bg-gray-100 text-gray-700'
              }`}>
                {review.status.replace('_', ' ')}
              </span>
            </div>

            {review.nine_box_position && (
              <div className="mb-4 p-4 bg-blue-50 rounded-lg">
                <p className="text-sm font-medium text-gray-700 mb-2">9-Box Position</p>
                <p className="text-lg font-semibold text-blue-600">{review.nine_box_position}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 mb-4">
              {review.overall_performance_rating && (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-1">Performance Rating</p>
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-green-600" />
                    <span className="text-2xl font-bold text-gray-900">{review.overall_performance_rating}/5</span>
                  </div>
                </div>
              )}
              {review.overall_competency_rating && (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-1">Competency Rating</p>
                  <div className="flex items-center gap-2">
                    <Award className="w-5 h-5 text-blue-600" />
                    <span className="text-2xl font-bold text-gray-900">{review.overall_competency_rating}/5</span>
                  </div>
                </div>
              )}
            </div>

            {review.manager_summary && (
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm font-medium text-gray-700 mb-2">Manager Summary</p>
                <p className="text-sm text-gray-600">{review.manager_summary}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
