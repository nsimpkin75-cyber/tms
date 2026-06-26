import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Minus, Award, Target, Brain } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { format } from 'date-fns';

interface PerformanceRating {
  id: string;
  review_period: string;
  competency_score: number;
  performance_score: number;
  overall_rating: number;
  rating_category: string;
  created_at: string;
}

export default function PerformanceTracking() {
  const [ratings, setRatings] = useState<PerformanceRating[]>([]);
  const [loading, setLoading] = useState(true);
  const [latestRating, setLatestRating] = useState<PerformanceRating | null>(null);

  useEffect(() => {
    fetchPerformanceRatings();
  }, []);

  const fetchPerformanceRatings = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('performance_ratings')
        .select('*')
        .eq('employee_id', user.id)
        .order('review_period', { ascending: false });

      if (error) throw error;

      setRatings(data || []);
      if (data && data.length > 0) {
        setLatestRating(data[0]);
      }
    } catch (error) {
      console.error('Error fetching performance ratings:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTrendIcon = (current: number, previous: number | undefined) => {
    if (!previous) return <Minus className="w-5 h-5 text-gray-400" />;
    if (current > previous) return <TrendingUp className="w-5 h-5 text-green-600" />;
    if (current < previous) return <TrendingDown className="w-5 h-5 text-red-600" />;
    return <Minus className="w-5 h-5 text-gray-400" />;
  };

  const getTrendColor = (current: number, previous: number | undefined) => {
    if (!previous) return 'text-gray-600';
    if (current > previous) return 'text-green-600';
    if (current < previous) return 'text-red-600';
    return 'text-gray-600';
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'Outstanding':
        return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'Exceeds Expectations':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'Meets Expectations':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'Developing':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'Needs Improvement':
        return 'bg-red-100 text-red-800 border-red-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getRatingBarColor = (rating: number) => {
    if (rating >= 4.5) return 'bg-purple-600';
    if (rating >= 3.5) return 'bg-green-600';
    if (rating >= 3.0) return 'bg-blue-600';
    if (rating >= 2.0) return 'bg-yellow-600';
    return 'bg-red-600';
  };

  if (loading) {
    return <div className="text-center py-12">Loading performance data...</div>;
  }

  if (ratings.length === 0) {
    return (
      <div className="text-center py-12 bg-gray-50 rounded-lg">
        <Award className="w-12 h-12 text-gray-400 mx-auto mb-3" />
        <p className="text-gray-500 text-lg">No performance ratings yet</p>
        <p className="text-gray-400 text-sm mt-2">Your ratings will appear here after your first review</p>
      </div>
    );
  }

  const previousRating = ratings.length > 1 ? ratings[1] : undefined;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">My Performance</h2>
        <p className="text-gray-600 mt-1">Track your performance and competency scores over time</p>
      </div>

      {latestRating && (
        <>
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6 border-2 border-blue-200">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Current Overall Rating</h3>
                <p className="text-sm text-gray-600">
                  {format(new Date(latestRating.review_period), 'MMMM yyyy')}
                </p>
              </div>
              <div className={`px-4 py-2 rounded-lg border-2 ${getCategoryColor(latestRating.rating_category)}`}>
                <p className="font-bold text-lg">{latestRating.rating_category}</p>
              </div>
            </div>

            <div className="flex items-end gap-4">
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-4xl font-bold text-gray-900">
                    {latestRating.overall_rating.toFixed(2)}
                  </span>
                  <span className="text-sm text-gray-600">out of 5.00</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-4">
                  <div
                    className={`h-4 rounded-full ${getRatingBarColor(latestRating.overall_rating)}`}
                    style={{ width: `${(latestRating.overall_rating / 5) * 100}%` }}
                  ></div>
                </div>
              </div>
              {previousRating && (
                <div className={`flex items-center gap-2 ${getTrendColor(latestRating.overall_rating, previousRating.overall_rating)}`}>
                  {getTrendIcon(latestRating.overall_rating, previousRating.overall_rating)}
                  <span className="font-semibold">
                    {Math.abs(latestRating.overall_rating - previousRating.overall_rating).toFixed(2)}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg border-2 border-gray-200 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Target className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Performance Score</h3>
                  <p className="text-xs text-gray-600">Based on KPI achievements</p>
                </div>
              </div>

              <div className="flex items-end justify-between">
                <div className="flex-1">
                  <div className="flex items-baseline gap-2 mb-2">
                    <span className="text-3xl font-bold text-gray-900">
                      {latestRating.performance_score?.toFixed(2) || 'N/A'}
                    </span>
                    <span className="text-sm text-gray-600">/ 5.00</span>
                  </div>
                  {latestRating.performance_score && (
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div
                        className="bg-blue-600 h-3 rounded-full"
                        style={{ width: `${(latestRating.performance_score / 5) * 100}%` }}
                      ></div>
                    </div>
                  )}
                </div>
                {previousRating?.performance_score && latestRating.performance_score && (
                  <div className={`ml-4 flex items-center gap-1 ${getTrendColor(latestRating.performance_score, previousRating.performance_score)}`}>
                    {getTrendIcon(latestRating.performance_score, previousRating.performance_score)}
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white rounded-lg border-2 border-gray-200 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-purple-100 rounded-lg">
                  <Brain className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Competency Score</h3>
                  <p className="text-xs text-gray-600">Based on skill assessments</p>
                </div>
              </div>

              <div className="flex items-end justify-between">
                <div className="flex-1">
                  <div className="flex items-baseline gap-2 mb-2">
                    <span className="text-3xl font-bold text-gray-900">
                      {latestRating.competency_score?.toFixed(2) || 'N/A'}
                    </span>
                    <span className="text-sm text-gray-600">/ 4.00</span>
                  </div>
                  {latestRating.competency_score && (
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div
                        className="bg-purple-600 h-3 rounded-full"
                        style={{ width: `${(latestRating.competency_score / 4) * 100}%` }}
                      ></div>
                    </div>
                  )}
                </div>
                {previousRating?.competency_score && latestRating.competency_score && (
                  <div className={`ml-4 flex items-center gap-1 ${getTrendColor(latestRating.competency_score, previousRating.competency_score)}`}>
                    {getTrendIcon(latestRating.competency_score, previousRating.competency_score)}
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      <div className="bg-white rounded-lg border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Performance History</h3>
          <p className="text-sm text-gray-600 mt-1">Month-on-month tracking</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Period
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Overall Rating
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Performance
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Competency
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Trend
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {ratings.map((rating, index) => {
                const prevRating = index < ratings.length - 1 ? ratings[index + 1] : undefined;
                return (
                  <tr key={rating.id} className={index === 0 ? 'bg-blue-50' : ''}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {format(new Date(rating.review_period), 'MMM yyyy')}
                      </div>
                      {index === 0 && (
                        <div className="text-xs text-blue-600 font-semibold">Current</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-bold text-gray-900">
                        {rating.overall_rating.toFixed(2)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {rating.performance_score?.toFixed(2) || 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {rating.competency_score?.toFixed(2) || 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getCategoryColor(rating.rating_category)}`}>
                        {rating.rating_category}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {getTrendIcon(rating.overall_rating, prevRating?.overall_rating)}
                        {prevRating && (
                          <span className={`text-sm font-medium ${getTrendColor(rating.overall_rating, prevRating.overall_rating)}`}>
                            {rating.overall_rating > prevRating.overall_rating ? '+' : ''}
                            {(rating.overall_rating - prevRating.overall_rating).toFixed(2)}
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-semibold text-blue-900 mb-2">How Ratings are Calculated</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• <strong>Performance Score:</strong> Average of all KPI ratings (1-5 scale)</li>
          <li>• <strong>Competency Score:</strong> Average of all competency assessments (1-4 scale)</li>
          <li>• <strong>Overall Rating:</strong> 60% Performance + 40% Competency (normalized to 1-5 scale)</li>
          <li>• <strong>Categories:</strong> Outstanding (4.5+), Exceeds Expectations (3.5-4.5), Meets Expectations (3.0-3.5), Developing (2.0-3.0), Needs Improvement (&lt;2.0)</li>
        </ul>
      </div>
    </div>
  );
}
