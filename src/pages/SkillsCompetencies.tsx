import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Users, TrendingUp, AlertCircle, CheckCircle, Clock, Play, Eye, Plus, Settings, X, Calendar } from 'lucide-react';
import SkillsMatrixBuilder from '../components/admin/SkillsMatrixBuilder';

interface TeamMember {
  employee_id: string;
  employee_name: string;
  job_title: string;
  department: string;
  skill_id: string;
  skill_name: string;
  skill_type: string;
  is_mandatory: boolean;
  target_rating_value: number;
  current_rating: number;
  employee_status: string;
  manager_status: string;
  has_discrepancies: boolean;
  last_assessment_date: string;
  cycle_status: string;
}

interface CycleMetrics {
  cycle_id: string;
  cycle_name: string;
  cycle_status: string;
  total_assigned: number;
  employee_completed: number;
  manager_completed: number;
  overdue: number;
  in_progress: number;
  total_discrepancies: number;
  completion_percentage: number;
}

export default function SkillsCompetencies() {
  const { profile, effectiveProfile, isViewingAs } = useAuth();
  const activeProfile = effectiveProfile || profile;
  const [activeTab, setActiveTab] = useState<'overview' | 'matrix' | 'assessments' | 'settings'>('overview');
  const [teamMatrix, setTeamMatrix] = useState<TeamMember[]>([]);
  const [cycleMetrics, setCycleMetrics] = useState<CycleMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedEmployee, setSelectedEmployee] = useState<string>('');
  const [hasLockedMatrices, setHasLockedMatrices] = useState(false);
  const [showTriggerModal, setShowTriggerModal] = useState(false);

  useEffect(() => {
    loadData();
  }, [activeProfile?.id]);

  async function loadData() {
    try {
      setLoading(true);

      if (activeProfile?.role === 'admin' || activeProfile?.role === 'manager') {
        let matrixQuery = supabase
          .from('team_skills_matrix_view')
          .select('*')
          .order('employee_name', { ascending: true })
          .order('skill_type', { ascending: true });

        if (activeProfile.role === 'manager') {
          matrixQuery = matrixQuery.eq('manager_id', activeProfile.id);
        }

        const { data: matrixData, error: matrixError } = await matrixQuery;

        if (matrixError) throw matrixError;
        setTeamMatrix(matrixData || []);

        const { data: metricsData, error: metricsError } = await supabase
          .from('assessment_cycle_metrics')
          .select('*')
          .eq('cycle_status', 'active')
          .maybeSingle();

        if (metricsError) throw metricsError;
        setCycleMetrics(metricsData);

        const { data: lockedMatrices, error: matrixCheckError } = await supabase
          .from('department_skills_matrix')
          .select('id')
          .eq('is_locked', true)
          .limit(1)
          .maybeSingle();

        if (matrixCheckError && matrixCheckError.code !== 'PGRST116') {
          console.error('Error checking matrices:', matrixCheckError);
        }
        setHasLockedMatrices(!!lockedMatrices);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }

  const groupedByEmployee = teamMatrix.reduce((acc, row) => {
    if (!acc[row.employee_id]) {
      acc[row.employee_id] = {
        employee: {
          id: row.employee_id,
          name: row.employee_name,
          job_title: row.job_title,
          department: row.department,
          employee_status: row.employee_status,
          manager_status: row.manager_status,
          last_assessment_date: row.last_assessment_date
        },
        skills: []
      };
    }
    acc[row.employee_id].skills.push({
      skill_id: row.skill_id,
      skill_name: row.skill_name,
      skill_type: row.skill_type,
      is_mandatory: row.is_mandatory,
      target_rating: row.target_rating_value,
      current_rating: row.current_rating,
      has_discrepancy: row.has_discrepancies
    });
    return acc;
  }, {} as any);

  const getStatusBadge = (status: string) => {
    const badges: any = {
      pending: <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-700 flex items-center gap-1"><Clock className="w-3 h-3" /> Pending</span>,
      in_progress: <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-700 flex items-center gap-1"><Clock className="w-3 h-3" /> In Progress</span>,
      completed: <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-700 flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Completed</span>,
      overdue: <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-700 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Overdue</span>,
    };
    return badges[status] || badges.pending;
  };

  const getRatingColor = (current: number, target: number) => {
    if (!current) return 'bg-gray-100 text-gray-600';
    if (current >= target) return 'bg-green-100 text-green-700';
    if (current === target - 1) return 'bg-yellow-100 text-yellow-700';
    return 'bg-red-100 text-red-700';
  };

  async function handleTriggerAssessment(cycleName: string, startDate: string, endDate: string) {
    try {
      const { data: cycle, error: cycleError } = await supabase
        .from('skill_assessment_cycles')
        .insert({
          name: cycleName,
          start_date: startDate,
          end_date: endDate,
          status: 'active',
          created_by: activeProfile?.id
        })
        .select()
        .single();

      if (cycleError) throw cycleError;

      const { data: employees, error: employeesError } = await supabase
        .from('profiles')
        .select('id, manager_id, department, job_title')
        .eq('active', true)
        .not('role', 'eq', 'admin');

      if (employeesError) throw employeesError;

      const workflows = employees.map(emp => ({
        cycle_id: cycle.id,
        employee_id: emp.id,
        manager_id: emp.manager_id || activeProfile?.id,
        department: emp.department || '',
        job_title: emp.job_title || '',
        employee_status: 'pending',
        manager_status: 'pending'
      }));

      const { error: workflowError } = await supabase
        .from('skills_assessment_workflow')
        .insert(workflows);

      if (workflowError) throw workflowError;

      alert(`Assessment cycle "${cycleName}" created successfully with ${workflows.length} team members assigned`);
      setShowTriggerModal(false);
      await loadData();
    } catch (error) {
      console.error('Error creating assessment cycle:', error);
      alert('Failed to create assessment cycle. Please try again.');
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (activeProfile?.role === 'employee') {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">My Skills & Competencies</h1>
          <p className="text-gray-600 mt-1">View your skills assessment and development progress</p>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
          <Users className="w-16 h-16 text-blue-600 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Skills Assessment</h2>
          <p className="text-gray-600 mb-4">
            Your manager will invite you to complete skills assessments when cycles are active
          </p>
          <button
            disabled
            className="px-4 py-2 bg-gray-300 text-gray-600 rounded-lg cursor-not-allowed"
          >
            No Active Assessments
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Skills & Competencies</h1>
          <p className="text-gray-600 mt-1 text-sm sm:text-base">Manage team skills matrix and assessment cycles</p>
        </div>
        {activeProfile?.role === 'admin' && !isViewingAs && (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setActiveTab('settings')}
              className="flex items-center gap-2 px-3 sm:px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm"
            >
              <Settings className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="hidden xs:inline">Configure</span>
            </button>
            <button
              onClick={() => setShowTriggerModal(true)}
              disabled={!hasLockedMatrices}
              title={!hasLockedMatrices ? 'Build and lock a skills matrix first' : ''}
              className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-sm"
            >
              <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="hidden xs:inline">Trigger Assessment</span>
              <span className="xs:hidden">Assess</span>
            </button>
          </div>
        )}
      </div>

      <div className="border-b border-gray-200 overflow-x-auto">
        <nav className="flex gap-4 sm:gap-6 min-w-max">
          <button
            onClick={() => setActiveTab('overview')}
            className={`pb-3 px-1 border-b-2 font-medium text-sm sm:text-base whitespace-nowrap ${
              activeTab === 'overview'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('matrix')}
            className={`pb-3 px-1 border-b-2 font-medium text-sm sm:text-base whitespace-nowrap ${
              activeTab === 'matrix'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Team Matrix
          </button>
          <button
            onClick={() => setActiveTab('assessments')}
            className={`pb-3 px-1 border-b-2 font-medium text-sm sm:text-base whitespace-nowrap ${
              activeTab === 'assessments'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Assessments
          </button>
          {activeProfile?.role === 'admin' && (
            <button
              onClick={() => setActiveTab('settings')}
              className={`pb-3 px-1 border-b-2 font-medium text-sm sm:text-base whitespace-nowrap ${
                activeTab === 'settings'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Settings
            </button>
          )}
        </nav>
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-4 sm:space-y-6">
          {cycleMetrics && (
            <div className="bg-white rounded-lg border p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
                <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Active Assessment Cycle</h2>
                <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs sm:text-sm font-medium self-start sm:self-auto">
                  {cycleMetrics.cycle_name}
                </span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
                <div className="text-center p-3 sm:p-4 bg-blue-50 rounded-lg">
                  <p className="text-xs sm:text-sm text-gray-600 mb-1">Assigned</p>
                  <p className="text-2xl sm:text-3xl font-bold text-blue-600">{cycleMetrics.total_assigned}</p>
                </div>
                <div className="text-center p-3 sm:p-4 bg-green-50 rounded-lg">
                  <p className="text-xs sm:text-sm text-gray-600 mb-1">Completed</p>
                  <p className="text-2xl sm:text-3xl font-bold text-green-600">{cycleMetrics.employee_completed}</p>
                </div>
                <div className="text-center p-3 sm:p-4 bg-yellow-50 rounded-lg">
                  <p className="text-xs sm:text-sm text-gray-600 mb-1">In Progress</p>
                  <p className="text-2xl sm:text-3xl font-bold text-yellow-600">{cycleMetrics.in_progress}</p>
                </div>
                <div className="text-center p-3 sm:p-4 bg-red-50 rounded-lg">
                  <p className="text-xs sm:text-sm text-gray-600 mb-1">Overdue</p>
                  <p className="text-2xl sm:text-3xl font-bold text-red-600">{cycleMetrics.overdue}</p>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                    <span>Completion Progress</span>
                    <span className="font-semibold">{cycleMetrics.completion_percentage}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className="bg-blue-600 h-3 rounded-full transition-all"
                      style={{ width: `${cycleMetrics.completion_percentage}%` }}
                    ></div>
                  </div>
                </div>
              </div>

              {cycleMetrics.total_discrepancies > 0 && (
                <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-amber-600" />
                    <p className="text-sm text-amber-800">
                      <span className="font-semibold">{cycleMetrics.total_discrepancies}</span> assessment discrepancies require manager review
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {!cycleMetrics && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
              <Clock className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Active Assessment Cycle</h3>
              <p className="text-gray-600 mb-4">
                Start an assessment cycle to track team skills and competencies
              </p>
              {activeProfile?.role === 'admin' && (
                <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                  Trigger New Assessment
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {activeTab === 'matrix' && (
        <div className="space-y-4">
          {Object.values(groupedByEmployee).length === 0 ? (
            <div className="text-center py-16 bg-gray-50 rounded-lg">
              <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Team Members</h3>
              <p className="text-gray-500">
                No skills matrix data available for your team yet
              </p>
            </div>
          ) : (
            Object.values(groupedByEmployee).map((group: any) => (
              <div key={group.employee.id} className="bg-white rounded-lg border overflow-hidden">
                <div className="p-4 bg-gray-50 border-b flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900">{group.employee.name}</h3>
                    <p className="text-sm text-gray-600">{group.employee.job_title} - {group.employee.department}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-right text-sm mr-4">
                      <p className="text-gray-600">Employee: {getStatusBadge(group.employee.employee_status)}</p>
                      <p className="text-gray-600 mt-1">Manager: {getStatusBadge(group.employee.manager_status)}</p>
                    </div>
                    <button className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg">
                      <Eye className="w-5 h-5" />
                    </button>
                    <button className="p-2 text-green-600 hover:bg-green-50 rounded-lg">
                      <Play className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                <div className="p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {group.skills.map((skill: any) => (
                      <div
                        key={skill.skill_id}
                        className={`p-3 rounded-lg border ${
                          skill.has_discrepancy ? 'border-amber-300 bg-amber-50' : 'border-gray-200'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <p className="font-medium text-gray-900 text-sm">{skill.skill_name}</p>
                            <p className="text-xs text-gray-500">{skill.skill_type}</p>
                          </div>
                          {skill.has_discrepancy && (
                            <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                          )}
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">Rating:</span>
                          <span className={`px-2 py-1 rounded font-semibold ${getRatingColor(skill.current_rating, skill.target_rating)}`}>
                            {skill.current_rating || 'N/A'}/{skill.target_rating}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'assessments' && (
        <div className="bg-white rounded-lg border p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Assessment Management</h2>
          <p className="text-gray-600">Assessment management interface coming soon</p>
        </div>
      )}

      {activeTab === 'settings' && activeProfile?.role === 'admin' && (
        <SkillsMatrixBuilder />
      )}

      {!hasLockedMatrices && activeProfile?.role === 'admin' && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
            <div className="text-sm text-amber-800">
              <p className="font-semibold mb-1">No Locked Skills Matrices</p>
              <p>Before triggering an assessment cycle, you need to:</p>
              <ol className="list-decimal list-inside mt-2 space-y-1">
                <li>Build a skills matrix in the Settings tab</li>
                <li>Lock the matrix to make it read-only</li>
                <li>Return here to trigger the assessment</li>
              </ol>
            </div>
          </div>
        </div>
      )}

      {showTriggerModal && (
        <TriggerAssessmentModal
          onClose={() => setShowTriggerModal(false)}
          onSubmit={handleTriggerAssessment}
        />
      )}
    </div>
  );
}

function TriggerAssessmentModal({ onClose, onSubmit }: { onClose: () => void; onSubmit: (name: string, startDate: string, endDate: string) => void }) {
  const [cycleName, setCycleName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [creating, setCreating] = useState(false);

  const today = new Date().toISOString().split('T')[0];
  const threeMonthsFromNow = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!cycleName.trim() || !startDate || !endDate) {
      alert('Please fill in all fields');
      return;
    }

    if (new Date(endDate) <= new Date(startDate)) {
      alert('End date must be after start date');
      return;
    }

    setCreating(true);
    try {
      await onSubmit(cycleName.trim(), startDate, endDate);
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Trigger Skills Assessment</h2>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Assessment Cycle Name
            </label>
            <input
              type="text"
              value={cycleName}
              onChange={(e) => setCycleName(e.target.value)}
              placeholder="e.g., Q1 2024 Skills Assessment"
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Start Date
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  min={today}
                  className="w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                End Date
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  min={startDate || today}
                  className="w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-800">
              This will create a new assessment cycle and assign it to all active team members who have skills matrices defined.
            </p>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={creating}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300"
            >
              {creating ? 'Creating...' : 'Create Cycle'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
