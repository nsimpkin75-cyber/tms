import React, { useState, useEffect } from 'react';
import { Trash2, AlertTriangle, ChevronDown, ChevronUp, Users, Calendar, Eye } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { format } from 'date-fns';
import AdminCycleDetailView from './AdminCycleDetailView';

interface ReviewCycle {
  id: string;
  cycle_name: string;
  template_title: string | null;
  quarter: string | null;
  cycle_type: string | null;
  cycle_start_date: string;
  template_start_date: string | null;
  template_end_date: string | null;
  review_frequency: string | null;
  status: string;
  created_at: string;
  manager: {
    full_name: string;
    department: string | null;
  } | null;
  assignment_count: number;
  meeting_count: number;
  completed_count: number;
  in_progress_count: number;
  overdue_count: number;
}

interface GroupedCycles {
  [department: string]: ReviewCycle[];
}

export default function ReviewCyclesManagement() {
  const [cycles, setCycles] = useState<ReviewCycle[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedDepts, setExpandedDepts] = useState<Set<string>>(new Set());
  const [deleteTarget, setDeleteTarget] = useState<ReviewCycle | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [selectedCycleId, setSelectedCycleId] = useState<string | null>(null);

  useEffect(() => {
    fetchCycles();
  }, []);

  const fetchCycles = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('one_to_one_review_cycles')
        .select(`
          id,
          cycle_name,
          template_title,
          quarter,
          cycle_type,
          cycle_start_date,
          cycle_end_date,
          template_start_date,
          template_end_date,
          review_frequency,
          status,
          created_at,
          manager:profiles!one_to_one_review_cycles_manager_id_fkey(
            full_name,
            department
          )
        `)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const missedCutoff = new Date(today);
      missedCutoff.setDate(missedCutoff.getDate() - 4);

      const cyclesWithCounts = await Promise.all(
        (data || []).map(async (cycle: any) => {
          const [assignmentsRes, meetingsRes, completedRes, inProgressRes, overdueRes] = await Promise.all([
            supabase
              .from('one_to_one_cycle_employee_assignments')
              .select('id', { count: 'exact', head: true })
              .eq('cycle_id', cycle.id)
              .eq('is_active', true),
            supabase
              .from('one_to_one_scheduled_meetings')
              .select('id', { count: 'exact', head: true })
              .eq('oto_cycle_id', cycle.id),
            supabase
              .from('one_to_one_scheduled_meetings')
              .select('id', { count: 'exact', head: true })
              .eq('oto_cycle_id', cycle.id)
              .eq('completion_status', 'completed'),
            supabase
              .from('one_to_one_scheduled_meetings')
              .select('id', { count: 'exact', head: true })
              .eq('oto_cycle_id', cycle.id)
              .eq('completion_status', 'scheduled'),
            supabase
              .from('one_to_one_scheduled_meetings')
              .select('id', { count: 'exact', head: true })
              .eq('oto_cycle_id', cycle.id)
              .neq('completion_status', 'completed')
              .lt('scheduled_datetime', missedCutoff.toISOString()),
          ]);

          return {
            ...cycle,
            manager: Array.isArray(cycle.manager) ? cycle.manager[0] : cycle.manager,
            assignment_count: assignmentsRes.count ?? 0,
            meeting_count: meetingsRes.count ?? 0,
            completed_count: completedRes.count ?? 0,
            in_progress_count: inProgressRes.count ?? 0,
            overdue_count: overdueRes.count ?? 0,
          };
        })
      );

      setCycles(cyclesWithCounts);

      const depts = new Set(
        cyclesWithCounts.map((c) => c.manager?.department || 'No Department')
      );
      setExpandedDepts(depts);
    } catch (error) {
      console.error('Error fetching review cycles:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const { error } = await supabase
        .from('one_to_one_review_cycles')
        .delete()
        .eq('id', deleteTarget.id);

      if (error) throw error;

      setDeleteTarget(null);
      await fetchCycles();
    } catch (error) {
      console.error('Error deleting cycle:', error);
      alert('Failed to delete review cycle');
    } finally {
      setDeleting(false);
    }
  };

  const toggleDept = (dept: string) => {
    setExpandedDepts((prev) => {
      const next = new Set(prev);
      if (next.has(dept)) next.delete(dept);
      else next.add(dept);
      return next;
    });
  };

  const grouped: GroupedCycles = cycles.reduce((acc, cycle) => {
    const dept = cycle.manager?.department || 'No Department';
    if (!acc[dept]) acc[dept] = [];
    acc[dept].push(cycle);
    return acc;
  }, {} as GroupedCycles);

  const cycleTypeLabel = (type: string | null) => {
    const map: Record<string, string> = {
      standard: '1:1 Review',
      probation: 'Probation Review',
      other: 'Other',
      performance_support: 'Performance Support',
      development: 'Development Plan',
    };
    return type ? (map[type] || type) : '—';
  };

  const frequencyLabel = (freq: string | null) => {
    const map: Record<string, string> = {
      weekly: 'Weekly',
      biweekly: 'Bi-weekly',
      monthly: 'Monthly',
    };
    return freq ? (map[freq] || freq) : '—';
  };

  if (selectedCycleId) {
    return (
      <AdminCycleDetailView
        cycleId={selectedCycleId}
        onBack={() => setSelectedCycleId(null)}
      />
    );
  }

  if (loading) {
    return <div className="text-center py-12 text-gray-500">Loading review cycles...</div>;
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Live Review Templates</h2>
        <p className="text-gray-500 mt-1 text-sm">
          All active review templates across the organisation, grouped by department. Deleting a template removes it and its configuration, but all completed one-to-ones are preserved.
        </p>
      </div>

      {cycles.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
          <Calendar className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No active review cycles found</p>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(grouped)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([dept, deptCycles]) => (
              <div key={dept} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <button
                  onClick={() => toggleDept(dept)}
                  className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-gray-900">{dept}</span>
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                      {deptCycles.length} {deptCycles.length === 1 ? 'cycle' : 'cycles'}
                    </span>
                  </div>
                  {expandedDepts.has(dept) ? (
                    <ChevronUp className="w-4 h-4 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  )}
                </button>

                {expandedDepts.has(dept) && (
                  <div className="border-t border-gray-100">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50 text-left">
                          <th className="px-5 py-3 font-medium text-gray-600">Template Name</th>
                          <th className="px-4 py-3 font-medium text-gray-600">Manager</th>
                          <th className="px-4 py-3 font-medium text-gray-600">Review Type</th>
                          <th className="px-4 py-3 font-medium text-gray-600">Frequency</th>
                          <th className="px-4 py-3 font-medium text-gray-600">Start Date</th>
                          <th className="px-4 py-3 font-medium text-gray-600">Employees</th>
                          <th className="px-4 py-3 font-medium text-gray-600">Status</th>
                          <th className="px-4 py-3"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {deptCycles.map((cycle) => (
                          <tr key={cycle.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-5 py-3">
                              <div className="font-medium text-gray-900">
                                {cycle.template_title || cycle.cycle_name}
                              </div>
                              <div className="text-xs text-gray-500 mt-0.5">
                                {cycleTypeLabel(cycle.cycle_type)}
                                {(cycle.template_start_date || cycle.cycle_start_date) && (
                                  <> · From {format(new Date(cycle.template_start_date || cycle.cycle_start_date), 'dd MMM yyyy')}</>
                                )}
                                {cycle.template_end_date && (
                                  <> — {format(new Date(cycle.template_end_date), 'dd MMM yyyy')}</>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-gray-700">
                              {cycle.manager?.full_name || '—'}
                            </td>
                            <td className="px-4 py-3 text-gray-600">
                              {cycleTypeLabel(cycle.cycle_type)}
                            </td>
                            <td className="px-4 py-3 text-gray-600">
                              {frequencyLabel(cycle.review_frequency)}
                            </td>
                            <td className="px-4 py-3 text-gray-600">
                              {(cycle.template_start_date || cycle.cycle_start_date)
                                ? format(new Date(cycle.template_start_date || cycle.cycle_start_date), 'dd MMM yyyy')
                                : '—'}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-1.5 text-gray-600">
                                <Users className="w-3.5 h-3.5" />
                                {cycle.assignment_count}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2 flex-wrap">
                                {cycle.completed_count > 0 && (
                                  <span className="text-xs font-medium px-1.5 py-0.5 bg-green-100 text-green-700 rounded">
                                    {cycle.completed_count} done
                                  </span>
                                )}
                                {cycle.in_progress_count > 0 && (
                                  <span className="text-xs font-medium px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded">
                                    {cycle.in_progress_count} scheduled
                                  </span>
                                )}
                                {cycle.overdue_count > 0 && (
                                  <span className="text-xs font-medium px-1.5 py-0.5 bg-red-100 text-red-700 rounded">
                                    {cycle.overdue_count} overdue
                                  </span>
                                )}
                                {cycle.completed_count === 0 && cycle.in_progress_count === 0 && cycle.overdue_count === 0 && (
                                  <span className="text-xs text-gray-400">{cycle.meeting_count} meetings</span>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-1 justify-end">
                                <button
                                  onClick={() => setSelectedCycleId(cycle.id)}
                                  className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
                                  title="View cycle details"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => setDeleteTarget(cycle)}
                                  className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                                  title="Delete cycle"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ))}
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-start gap-4 mb-5">
              <div className="p-2.5 bg-red-100 rounded-lg flex-shrink-0">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Delete Review Template</h3>
                <p className="text-sm text-gray-600 mt-1">
                  You are about to delete <span className="font-medium">"{deleteTarget.cycle_name}"</span>.
                </p>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-2">
              <p className="text-sm font-semibold text-amber-800 mb-1">What will be deleted:</p>
              <ul className="text-sm text-amber-700 list-disc list-inside space-y-0.5">
                <li>The review template configuration</li>
                <li>KPI definitions linked to this template</li>
                <li>Employee assignments to this template</li>
              </ul>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <p className="text-sm font-semibold text-green-800 mb-1">What will be preserved:</p>
              <ul className="text-sm text-green-700 list-disc list-inside space-y-0.5">
                <li>All completed one-to-one meetings and their records</li>
                <li>All historical weekly check-ins and monthly reviews</li>
                <li>All performance data and notes</li>
              </ul>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-50"
              >
                {deleting ? 'Deleting...' : 'Delete Template'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
