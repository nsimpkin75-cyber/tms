import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { computeReviewStatus, ReviewStatus, STATUS_STYLES } from '../../lib/reviewStatus';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { BarChart2, ChevronDown, ChevronUp } from 'lucide-react';

interface MeetingRow {
  id: string;
  employee_id: string;
  manager_id: string;
  scheduled_datetime: string | null;
  original_scheduled_datetime: string | null;
  completion_status: string | null;
  submitted_at: string | null;
  employee_name: string;
  employee_dept: string;
  manager_name: string;
  has_input: boolean;
}

interface StatusCount {
  'Not Started': number;
  'Due Soon': number;
  'In Progress': number;
  'Overdue': number;
  'Rescheduled': number;
  'Missed': number;
  'Completed': number;
  total: number;
}

interface MonthGroup {
  label: string;       // "March 2026"
  monthKey: string;    // "2026-03"
  departments: Record<string, MeetingRow[]>;
  counts: StatusCount;
}

const ALL_STATUSES: ReviewStatus[] = [
  'Not Started', 'Due Soon', 'In Progress', 'Overdue', 'Rescheduled', 'Missed', 'Completed',
];

function emptyCount(): StatusCount {
  return { 'Not Started': 0, 'Due Soon': 0, 'In Progress': 0, 'Overdue': 0, 'Rescheduled': 0, 'Missed': 0, 'Completed': 0, total: 0 };
}

export default function ReviewStatusReport() {
  const { profile } = useAuth();
  const isDeptLead = profile?.role === 'dept_lead';
  const isAdmin = profile?.role === 'admin';

  const [months, setMonths] = useState<MonthGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set());
  const [expandedDepts, setExpandedDepts] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (isAdmin || isDeptLead) load();
  }, [profile?.id]);

  async function load() {
    setLoading(true);
    try {
      // Fetch meetings — RLS restricts dept_lead to their department automatically
      const { data: meetings, error } = await supabase
        .from('one_to_one_scheduled_meetings')
        .select(`
          id,
          employee_id,
          manager_id,
          scheduled_datetime,
          original_scheduled_datetime,
          completion_status,
          submitted_at,
          employee:profiles!one_to_one_scheduled_meetings_employee_id_fkey(full_name, department),
          manager:profiles!one_to_one_scheduled_meetings_manager_id_fkey(full_name)
        `)
        .order('scheduled_datetime', { ascending: false });

      if (error) throw error;

      const raw = (meetings || []).map((m: any) => ({
        id: m.id,
        employee_id: m.employee_id,
        manager_id: m.manager_id,
        scheduled_datetime: m.scheduled_datetime,
        original_scheduled_datetime: m.original_scheduled_datetime,
        completion_status: m.completion_status,
        submitted_at: m.submitted_at,
        employee_name: (Array.isArray(m.employee) ? m.employee[0] : m.employee)?.full_name || 'Unknown',
        employee_dept: (Array.isArray(m.employee) ? m.employee[0] : m.employee)?.department || 'No Department',
        manager_name: (Array.isArray(m.manager) ? m.manager[0] : m.manager)?.full_name || 'Unknown',
        has_input: false, // resolved below in batch
      })) as MeetingRow[];

      // Batch resolve has_input: fetch all weekly checkins and monthly reviews IDs
      if (raw.length > 0) {
        const meetingIds = raw.map(r => r.id);
        const [ciRes, mrRes] = await Promise.all([
          supabase.from('one_to_one_weekly_checkins').select('meeting_id').in('meeting_id', meetingIds),
          supabase.from('one_to_one_monthly_reviews').select('meeting_id').in('meeting_id', meetingIds),
        ]);
        const withInputIds = new Set([
          ...((ciRes.data || []).map((r: any) => r.meeting_id)),
          ...((mrRes.data || []).map((r: any) => r.meeting_id)),
        ]);
        raw.forEach(r => { r.has_input = withInputIds.has(r.id); });
      }

      // Group by month (use scheduled_datetime; fall back to submitted_at for completed)
      const byMonth: Record<string, MeetingRow[]> = {};
      for (const row of raw) {
        const dateStr = row.submitted_at || row.scheduled_datetime;
        const monthKey = dateStr
          ? format(new Date(dateStr), 'yyyy-MM')
          : 'unknown';
        if (!byMonth[monthKey]) byMonth[monthKey] = [];
        byMonth[monthKey].push(row);
      }

      const groups: MonthGroup[] = Object.entries(byMonth)
        .sort(([a], [b]) => b.localeCompare(a)) // newest first
        .map(([monthKey, rows]) => {
          const label = monthKey !== 'unknown'
            ? format(new Date(`${monthKey}-01`), 'MMMM yyyy')
            : 'No Date';

          const counts = emptyCount();
          const departments: Record<string, MeetingRow[]> = {};

          for (const row of rows) {
            const status = computeReviewStatus({
              scheduled_datetime: row.scheduled_datetime,
              original_scheduled_datetime: row.original_scheduled_datetime,
              completion_status: row.completion_status,
              has_input: row.has_input,
            });
            counts[status]++;
            counts.total++;

            const dept = row.employee_dept;
            if (!departments[dept]) departments[dept] = [];
            departments[dept].push({ ...row, _status: status } as any);
          }

          return { label, monthKey, departments, counts };
        });

      setMonths(groups);

      // Expand the most recent month by default
      if (groups.length > 0) {
        setExpandedMonths(new Set([groups[0].monthKey]));
      }
    } catch (err) {
      console.error('Error loading review report:', err);
    } finally {
      setLoading(false);
    }
  }

  function toggleMonth(key: string) {
    setExpandedMonths(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  function toggleDept(key: string) {
    setExpandedDepts(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  if (!isAdmin && !isDeptLead) return null;

  if (loading) {
    return <div className="text-center py-12 text-gray-500">Loading report...</div>;
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Review Status Report</h2>
        <p className="text-gray-500 mt-1 text-sm">
          {isDeptLead
            ? `Reviews for your department — grouped by month and status.`
            : 'All reviews across the organisation — grouped by month, department, and status.'}
          {' '}Read only.
        </p>
      </div>

      {months.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200 text-gray-400">
          No review data found
        </div>
      ) : (
        <div className="space-y-4">
          {months.map(month => (
            <div key={month.monthKey} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              {/* Month header */}
              <button
                onClick={() => toggleMonth(month.monthKey)}
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <span className="font-semibold text-gray-900">{month.label}</span>
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-medium">
                    {month.counts.total} total
                  </span>
                  {/* Status pill summary */}
                  <div className="hidden sm:flex items-center gap-1.5 flex-wrap">
                    {ALL_STATUSES.filter(s => month.counts[s] > 0).map(s => (
                      <span key={s} className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLES[s].class}`}>
                        {month.counts[s]} {s}
                      </span>
                    ))}
                  </div>
                </div>
                {expandedMonths.has(month.monthKey)
                  ? <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  : <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />}
              </button>

              {expandedMonths.has(month.monthKey) && (
                <div className="border-t border-gray-100">
                  {/* Status count bar */}
                  <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
                    <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                      {ALL_STATUSES.map(s => (
                        <div key={s} className="text-center">
                          <p className={`text-xs font-semibold px-1.5 py-0.5 rounded ${STATUS_STYLES[s].class}`}>
                            {month.counts[s]}
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5 truncate">{s}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Departments */}
                  <div className="divide-y divide-gray-100">
                    {Object.entries(month.departments)
                      .sort(([a], [b]) => a.localeCompare(b))
                      .map(([dept, rows]) => {
                        const deptKey = `${month.monthKey}-${dept}`;
                        const deptCounts = emptyCount();
                        rows.forEach(r => {
                          const s = (r as any)._status as ReviewStatus;
                          deptCounts[s]++;
                          deptCounts.total++;
                        });

                        return (
                          <div key={dept}>
                            <button
                              onClick={() => toggleDept(deptKey)}
                              className="w-full flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors text-left"
                            >
                              <div className="flex items-center gap-3">
                                <span className="text-sm font-medium text-gray-800">{dept}</span>
                                <span className="text-xs text-gray-500">{deptCounts.total} review{deptCounts.total !== 1 ? 's' : ''}</span>
                                <div className="hidden sm:flex items-center gap-1.5 flex-wrap">
                                  {ALL_STATUSES.filter(s => deptCounts[s] > 0).map(s => (
                                    <span key={s} className={`text-xs px-1.5 py-0.5 rounded font-medium ${STATUS_STYLES[s].class}`}>
                                      {deptCounts[s]} {s}
                                    </span>
                                  ))}
                                </div>
                              </div>
                              {expandedDepts.has(deptKey)
                                ? <ChevronUp className="w-3.5 h-3.5 text-gray-400" />
                                : <ChevronDown className="w-3.5 h-3.5 text-gray-400" />}
                            </button>

                            {expandedDepts.has(deptKey) && (
                              <div className="border-t border-gray-100 overflow-x-auto">
                                <table className="w-full text-sm">
                                  <thead>
                                    <tr className="bg-gray-50 text-left">
                                      <th className="px-5 py-2.5 font-medium text-gray-600">Employee</th>
                                      <th className="px-4 py-2.5 font-medium text-gray-600">Manager</th>
                                      <th className="px-4 py-2.5 font-medium text-gray-600">Scheduled</th>
                                      <th className="px-4 py-2.5 font-medium text-gray-600">Status</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-gray-50">
                                    {rows.map(row => {
                                      const status = (row as any)._status as ReviewStatus;
                                      const style = STATUS_STYLES[status];
                                      return (
                                        <tr key={row.id} className="hover:bg-gray-50/50">
                                          <td className="px-5 py-2.5 font-medium text-gray-900">{row.employee_name}</td>
                                          <td className="px-4 py-2.5 text-gray-600">{row.manager_name}</td>
                                          <td className="px-4 py-2.5 text-gray-600">
                                            {row.scheduled_datetime
                                              ? format(new Date(row.scheduled_datetime), 'dd MMM yyyy')
                                              : '—'}
                                          </td>
                                          <td className="px-4 py-2.5">
                                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${style.class}`}>
                                              {status}
                                            </span>
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
