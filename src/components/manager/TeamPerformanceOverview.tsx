import React, { useState, useEffect } from 'react';
import { Users, TrendingUp, Award, Eye, Filter } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { format } from 'date-fns';

interface TeamMemberRating {
  employee_id: string;
  employee_name: string;
  job_title: string | null;
  latest_rating: {
    overall_rating: number;
    performance_score: number;
    competency_score: number;
    rating_category: string;
    review_period: string;
  } | null;
  previous_rating: {
    overall_rating: number;
  } | null;
  ratings_count: number;
}

export default function TeamPerformanceOverview() {
  const [teamRatings, setTeamRatings] = useState<TeamMemberRating[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null);
  const [employeeHistory, setEmployeeHistory] = useState<any[]>([]);
  const [filterCategory, setFilterCategory] = useState<string>('all');

  useEffect(() => {
    fetchTeamRatings();
  }, []);

  const fetchTeamRatings = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: teamMembers } = await supabase
        .from('profiles')
        .select('id, full_name, job_title')
        .eq('manager_id', user.id);

      if (!teamMembers || teamMembers.length === 0) {
        setTeamRatings([]);
        setLoading(false);
        return;
      }

      const memberIds = teamMembers.map(m => m.id);

      const [{ data: allRatings }, { data: otoReviews }] = await Promise.all([
        supabase
          .from('performance_ratings')
          .select('*')
          .in('employee_id', memberIds)
          .order('review_period', { ascending: false }),
        supabase
          .from('one_to_one_monthly_reviews')
          .select('employee_id, overall_average, average_kpi_score, overall_competency_score, review_month, status')
          .in('employee_id', memberIds)
          .in('status', ['submitted', 'completed'])
          .order('review_month', { ascending: false }),
      ]);

      const teamRatingsData: TeamMemberRating[] = teamMembers.map(member => {
        const memberRatings = allRatings?.filter(r => r.employee_id === member.id) || [];
        const latest = memberRatings[0] || null;
        const previous = memberRatings[1] || null;

        // Fall back to completed 1:1 review data when no performance_ratings row exists
        const memberOtoReviews = otoReviews?.filter(r => r.employee_id === member.id) || [];
        const latestOto = memberOtoReviews[0] || null;
        const previousOto = memberOtoReviews[1] || null;

        const effectiveLatest = latest ?? (latestOto?.overall_average != null ? {
          overall_rating: latestOto.overall_average,
          performance_score: latestOto.average_kpi_score ?? latestOto.overall_average,
          competency_score: latestOto.overall_competency_score ?? latestOto.overall_average,
          rating_category: latestOto.overall_average >= 4.5 ? 'Outstanding'
            : latestOto.overall_average >= 3.5 ? 'Exceeds Expectations'
            : latestOto.overall_average >= 2.5 ? 'Meets Expectations'
            : 'Needs Improvement',
          review_period: latestOto.review_month,
        } : null);

        const effectivePrevious = previous ?? (previousOto?.overall_average != null ? {
          overall_rating: previousOto.overall_average,
        } : null);

        return {
          employee_id: member.id,
          employee_name: member.full_name,
          job_title: member.job_title,
          latest_rating: effectiveLatest,
          previous_rating: effectivePrevious,
          ratings_count: memberRatings.length || memberOtoReviews.length,
        };
      });

      setTeamRatings(teamRatingsData);
    } catch (error) {
      console.error('Error fetching team ratings:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployeeHistory = async (employeeId: string) => {
    try {
      const { data } = await supabase
        .from('performance_ratings')
        .select('*')
        .eq('employee_id', employeeId)
        .order('review_period', { ascending: false });

      setEmployeeHistory(data || []);
      setSelectedEmployee(employeeId);
    } catch (error) {
      console.error('Error fetching employee history:', error);
    }
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

  const getTrendIndicator = (current: number, previous: number | undefined) => {
    if (!previous) return null;
    const diff = current - previous;
    if (diff > 0) {
      return <span className="text-green-600 text-sm font-semibold">↑ {diff.toFixed(2)}</span>;
    } else if (diff < 0) {
      return <span className="text-red-600 text-sm font-semibold">↓ {Math.abs(diff).toFixed(2)}</span>;
    }
    return <span className="text-gray-600 text-sm">→</span>;
  };

  const filteredTeamRatings = filterCategory === 'all'
    ? teamRatings
    : teamRatings.filter(tr => tr.latest_rating?.rating_category === filterCategory);

  const teamStats = {
    total: teamRatings.length,
    withRatings: teamRatings.filter(tr => tr.latest_rating).length,
    avgRating: teamRatings.filter(tr => tr.latest_rating).length > 0
      ? teamRatings
          .filter(tr => tr.latest_rating)
          .reduce((sum, tr) => sum + (tr.latest_rating?.overall_rating || 0), 0) /
        teamRatings.filter(tr => tr.latest_rating).length
      : 0,
    outstanding: teamRatings.filter(tr => tr.latest_rating?.rating_category === 'Outstanding').length,
    exceeds: teamRatings.filter(tr => tr.latest_rating?.rating_category === 'Exceeds Expectations').length,
    meets: teamRatings.filter(tr => tr.latest_rating?.rating_category === 'Meets Expectations').length,
    developing: teamRatings.filter(tr => tr.latest_rating?.rating_category === 'Developing').length,
    needsImprovement: teamRatings.filter(tr => tr.latest_rating?.rating_category === 'Needs Improvement').length,
  };

  if (loading) {
    return <div className="text-center py-12">Loading team performance...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Team Performance Overview</h2>
        <p className="text-gray-600 mt-1">View and track your team's performance ratings</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border-2 border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Team Size</p>
              <p className="text-2xl font-bold text-gray-900">{teamStats.total}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border-2 border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Award className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Avg Rating</p>
              <p className="text-2xl font-bold text-gray-900">
                {teamStats.avgRating > 0 ? teamStats.avgRating.toFixed(2) : 'N/A'}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border-2 border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <TrendingUp className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">High Performers</p>
              <p className="text-2xl font-bold text-gray-900">
                {teamStats.outstanding + teamStats.exceeds}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border-2 border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Users className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Need Support</p>
              <p className="text-2xl font-bold text-gray-900">
                {teamStats.developing + teamStats.needsImprovement}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Rating Distribution</h3>
        </div>
        <div className="grid grid-cols-5 gap-3">
          {[
            { label: 'Outstanding', count: teamStats.outstanding, color: 'bg-purple-600' },
            { label: 'Exceeds', count: teamStats.exceeds, color: 'bg-green-600' },
            { label: 'Meets', count: teamStats.meets, color: 'bg-blue-600' },
            { label: 'Developing', count: teamStats.developing, color: 'bg-yellow-600' },
            { label: 'Needs Improvement', count: teamStats.needsImprovement, color: 'bg-red-600' },
          ].map(cat => (
            <div key={cat.label} className="text-center">
              <div className={`${cat.color} text-white rounded-lg p-4 mb-2`}>
                <p className="text-3xl font-bold">{cat.count}</p>
              </div>
              <p className="text-xs text-gray-600">{cat.label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Team Members</h3>
            <p className="text-sm text-gray-600 mt-1">Individual performance ratings</p>
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-600" />
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Categories</option>
              <option value="Outstanding">Outstanding</option>
              <option value="Exceeds Expectations">Exceeds Expectations</option>
              <option value="Meets Expectations">Meets Expectations</option>
              <option value="Developing">Developing</option>
              <option value="Needs Improvement">Needs Improvement</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Employee
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredTeamRatings.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                    {filterCategory === 'all' ? 'No team members found' : 'No team members in this category'}
                  </td>
                </tr>
              ) : (
                filteredTeamRatings.map((member) => (
                  <tr key={member.employee_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{member.employee_name}</div>
                        <div className="text-xs text-gray-500">{member.job_title || 'No title'}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {member.latest_rating ? (
                        <div className="text-sm font-bold text-gray-900">
                          {member.latest_rating.overall_rating.toFixed(2)}
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">No rating</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {member.latest_rating?.performance_score?.toFixed(2) || 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {member.latest_rating?.competency_score?.toFixed(2) || 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {member.latest_rating ? (
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getCategoryColor(member.latest_rating.rating_category)}`}>
                          {member.latest_rating.rating_category}
                        </span>
                      ) : (
                        <span className="text-sm text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {member.latest_rating && getTrendIndicator(
                        member.latest_rating.overall_rating,
                        member.previous_rating?.overall_rating
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => fetchEmployeeHistory(member.employee_id)}
                        disabled={!member.latest_rating}
                        className="text-blue-600 hover:text-blue-800 disabled:text-gray-400 disabled:cursor-not-allowed flex items-center gap-1 text-sm font-medium"
                      >
                        <Eye className="w-4 h-4" />
                        View History
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedEmployee && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 z-10">
              <h3 className="text-2xl font-bold text-gray-900">Performance History</h3>
              <p className="text-gray-600 mt-1">
                {teamRatings.find(tr => tr.employee_id === selectedEmployee)?.employee_name}
              </p>
            </div>

            <div className="p-6">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Period</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Overall</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Performance</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Competency</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {employeeHistory.map((rating) => (
                      <tr key={rating.id}>
                        <td className="px-4 py-4 text-sm text-gray-900">
                          {format(new Date(rating.review_period), 'MMM yyyy')}
                        </td>
                        <td className="px-4 py-4 text-sm font-bold text-gray-900">
                          {rating.overall_rating.toFixed(2)}
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-900">
                          {rating.performance_score?.toFixed(2) || 'N/A'}
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-900">
                          {rating.competency_score?.toFixed(2) || 'N/A'}
                        </td>
                        <td className="px-4 py-4">
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getCategoryColor(rating.rating_category)}`}>
                            {rating.rating_category}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 p-6 z-10">
              <button
                onClick={() => {
                  setSelectedEmployee(null);
                  setEmployeeHistory([]);
                }}
                className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
