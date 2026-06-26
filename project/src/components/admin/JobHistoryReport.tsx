import { useState, useEffect } from 'react';
import { History, Download, Filter, TrendingUp } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface JobHistoryEntry {
  id: string;
  user_id: string;
  job_title: string;
  department: string;
  change_type: string;
  effective_date: string;
  notes: string;
  created_at: string;
  user: {
    full_name: string;
    email: string;
  };
}

interface MovementStats {
  user_id: string;
  full_name: string;
  current_job_title: string;
  current_department: string;
  total_moves: number;
  promotions: number;
  lateral_moves: number;
  department_changes: number;
  role_changes: number;
  first_role_date: string;
  latest_change_date: string;
}

export default function JobHistoryReport() {
  const [history, setHistory] = useState<JobHistoryEntry[]>([]);
  const [stats, setStats] = useState<MovementStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'history' | 'stats'>('history');
  const [filterType, setFilterType] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchJobHistory();
    fetchMovementStats();
  }, []);

  const fetchJobHistory = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('job_history')
        .select(`
          *,
          user:profiles!job_history_user_id_fkey(full_name, email)
        `)
        .order('effective_date', { ascending: false })
        .limit(100);

      if (error) throw error;
      setHistory(data || []);
    } catch (error) {
      console.error('Error fetching job history:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMovementStats = async () => {
    try {
      const { data, error } = await supabase
        .from('job_movement_stats')
        .select('*')
        .order('total_moves', { ascending: false });

      if (error) throw error;
      setStats(data || []);
    } catch (error) {
      console.error('Error fetching movement stats:', error);
    }
  };

  const exportToCSV = () => {
    if (view === 'history') {
      const csvContent = [
        ['Name', 'Email', 'Job Title', 'Department', 'Change Type', 'Effective Date', 'Notes'],
        ...filteredHistory.map(entry => [
          entry.user.full_name,
          entry.user.email,
          entry.job_title,
          entry.department,
          entry.change_type,
          new Date(entry.effective_date).toLocaleDateString(),
          entry.notes || ''
        ])
      ].map(row => row.join(',')).join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `job-history-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      const csvContent = [
        ['Name', 'Current Title', 'Current Department', 'Total Moves', 'Promotions', 'Lateral Moves', 'Department Changes', 'Role Changes', 'Latest Change'],
        ...filteredStats.map(stat => [
          stat.full_name,
          stat.current_job_title || '-',
          stat.current_department || '-',
          stat.total_moves,
          stat.promotions,
          stat.lateral_moves,
          stat.department_changes,
          stat.role_changes,
          stat.latest_change_date ? new Date(stat.latest_change_date).toLocaleDateString() : '-'
        ])
      ].map(row => row.join(',')).join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `movement-stats-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const filteredHistory = history.filter(entry => {
    if (filterType !== 'all' && entry.change_type !== filterType) return false;
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      return (
        entry.user.full_name.toLowerCase().includes(search) ||
        entry.job_title.toLowerCase().includes(search) ||
        entry.department.toLowerCase().includes(search)
      );
    }
    return true;
  });

  const filteredStats = stats.filter(stat => {
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      return (
        stat.full_name.toLowerCase().includes(search) ||
        (stat.current_job_title && stat.current_job_title.toLowerCase().includes(search)) ||
        (stat.current_department && stat.current_department.toLowerCase().includes(search))
      );
    }
    return true;
  });

  const getChangeTypeColor = (type: string) => {
    switch (type) {
      case 'promotion':
        return 'bg-green-100 text-green-800';
      case 'lateral_move':
        return 'bg-blue-100 text-blue-800';
      case 'department_change':
        return 'bg-purple-100 text-purple-800';
      case 'role_change':
        return 'bg-yellow-100 text-yellow-800';
      case 'initial':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatChangeType = (type: string) => {
    return type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  if (loading) {
    return <div className="text-center py-8">Loading job history...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setView('history')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              view === 'history'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            <History className="w-4 h-4 inline-block mr-2" />
            Job History
          </button>
          <button
            onClick={() => setView('stats')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              view === 'stats'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            <TrendingUp className="w-4 h-4 inline-block mr-2" />
            Movement Stats
          </button>
        </div>
        <button
          onClick={exportToCSV}
          className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
        >
          <Download className="w-4 h-4" />
          Export CSV
        </button>
      </div>

      <div className="flex gap-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search by name, title, or department..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
        {view === 'history' && (
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-500" />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Changes</option>
              <option value="promotion">Promotions</option>
              <option value="lateral_move">Lateral Moves</option>
              <option value="department_change">Department Changes</option>
              <option value="role_change">Role Changes</option>
            </select>
          </div>
        )}
      </div>

      {view === 'history' ? (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Job Title</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Department</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Change Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Effective Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Notes</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredHistory.map((entry) => (
                <tr key={entry.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{entry.user.full_name}</div>
                    <div className="text-sm text-gray-500">{entry.user.email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {entry.job_title}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {entry.department}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getChangeTypeColor(entry.change_type)}`}>
                      {formatChangeType(entry.change_type)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {new Date(entry.effective_date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">
                    {entry.notes || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Current Title</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Department</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Total Moves</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Promotions</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Lateral</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Dept Changes</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Latest Change</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredStats.map((stat) => (
                <tr key={stat.user_id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {stat.full_name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {stat.current_job_title || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {stat.current_department || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span className="px-2 py-1 text-xs font-semibold bg-blue-100 text-blue-800 rounded-full">
                      {stat.total_moves}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span className="px-2 py-1 text-xs font-semibold bg-green-100 text-green-800 rounded-full">
                      {stat.promotions}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span className="px-2 py-1 text-xs font-semibold bg-purple-100 text-purple-800 rounded-full">
                      {stat.lateral_moves}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span className="px-2 py-1 text-xs font-semibold bg-yellow-100 text-yellow-800 rounded-full">
                      {stat.department_changes}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {stat.latest_change_date ? new Date(stat.latest_change_date).toLocaleDateString() : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
