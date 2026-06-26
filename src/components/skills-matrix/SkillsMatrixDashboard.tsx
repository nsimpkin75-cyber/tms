import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import {
  BarChart2, Users, TrendingUp, Filter, Grid3x3, Eye,
  ChevronDown, ChevronRight, AlertTriangle, CheckCircle, ClipboardList, ExternalLink,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface SmMatrix {
  id: string;
  name: string;
  department: string;
  is_locked: boolean;
}

interface SmTopic {
  id: string;
  name: string;
  category_id: string;
}

interface SmCategory {
  id: string;
  name: string;
  type_id: string;
}

interface SmType {
  id: string;
  name: string;
}

interface RoleTopic {
  topic_id: string;
  job_family_id: string;
}

interface TrainingRecord {
  employee_id: string;
  topic_id: string;
  matrix_id: string;
  rating: number;
  training_date: string | null;
}

interface ProfileRow {
  id: string;
  full_name: string;
  department: string | null;
  job_title: string | null;
  job_family_id: string | null;
  manager_id: string | null;
  role: string;
}

interface JobFamily {
  id: string;
  title: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function cellColour(rating: number): string {
  if (rating <= 1) return 'bg-red-100 text-red-700';
  if (rating === 2) return 'bg-amber-100 text-amber-700';
  return 'bg-green-100 text-green-700';
}

function competencyPct(ratings: number[]): number {
  if (!ratings.length) return 0;
  const competent = ratings.filter(r => r >= 3).length;
  return Math.round((competent / ratings.length) * 100);
}

function trainingPct(ratings: number[]): number {
  if (!ratings.length) return 0;
  const trained = ratings.filter(r => r >= 1).length;
  return Math.round((trained / ratings.length) * 100);
}

function Spinner() {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
    </div>
  );
}

function ProgressBar({ pct, colour = 'blue' }: { pct: number; colour?: 'blue' | 'green' | 'red' | 'amber' }) {
  const bar = { blue: 'bg-blue-500', green: 'bg-green-500', red: 'bg-red-500', amber: 'bg-amber-500' }[colour];
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
        <div className={`${bar} h-2 rounded-full transition-all`} style={{ width: `${Math.min(100, pct)}%` }} />
      </div>
      <span className="text-xs font-semibold text-gray-700 w-9 text-right">{pct}%</span>
    </div>
  );
}

function StatCard({ icon, label, value, colour = 'blue', sub }: {
  icon: React.ReactNode; label: string; value: string | number;
  colour?: 'blue' | 'green' | 'red' | 'amber' | 'gray'; sub?: string;
}) {
  const colours = {
    blue: 'text-blue-600 bg-blue-50', green: 'text-green-600 bg-green-50',
    red: 'text-red-600 bg-red-50', amber: 'text-amber-600 bg-amber-50', gray: 'text-gray-500 bg-gray-50',
  };
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-start gap-4 shadow-sm">
      <div className={`p-2.5 rounded-lg flex-shrink-0 ${colours[colour]}`}>{icon}</div>
      <div className="min-w-0">
        <p className="text-xs text-gray-500 font-medium truncate">{label}</p>
        <p className="text-2xl font-bold text-gray-900 leading-tight">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// ─── Outstanding assessments ─────────────────────────────────────────────────

interface OutstandingAssessment {
  id: string;
  cycle_id: string;
  cycle_name: string;
  employee_id: string;
  employee_name: string;
  assessor_type: string;
  due_date: string | null;
}

function OutstandingAssessmentsBanner({
  assessments,
  onNavigateToAssessment,
}: {
  assessments: OutstandingAssessment[];
  onNavigateToAssessment?: (cycleId: string, employeeId: string, assessorType: 'employee' | 'manager') => void;
}) {
  if (!assessments.length) return null;

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-2">
      <div className="flex items-center gap-2 mb-1">
        <ClipboardList className="w-4 h-4 text-amber-600 flex-shrink-0" />
        <span className="text-sm font-semibold text-amber-900">
          Outstanding Assessment{assessments.length !== 1 ? 's' : ''} ({assessments.length})
        </span>
        <span className="text-xs text-amber-700">— complete to update matrix ratings</span>
      </div>
      {assessments.map(a => (
        <div key={a.id} className="flex items-center justify-between bg-white border border-amber-100 rounded-lg px-3 py-2.5 gap-3">
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-800 truncate">{a.cycle_name}</p>
            <p className="text-xs text-gray-500">
              {a.assessor_type === 'manager' ? `Manager assessment for ${a.employee_name}` : 'Self-assessment'}
              {a.due_date ? ` · Due ${new Date(a.due_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}` : ''}
            </p>
          </div>
          {onNavigateToAssessment && (
            <button
              onClick={() => onNavigateToAssessment(a.cycle_id, a.employee_id, a.assessor_type as 'employee' | 'manager')}
              className="flex items-center gap-1 text-xs font-medium text-amber-700 hover:text-amber-900 whitespace-nowrap flex-shrink-0 border border-amber-200 rounded-lg px-2.5 py-1.5 hover:bg-amber-100 transition-colors"
            >
              <ExternalLink className="w-3 h-3" /> Start
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

async function loadOutstandingAssessments(userId: string): Promise<OutstandingAssessment[]> {
  const { data } = await supabase
    .from('sm_assessments')
    .select(`
      id, cycle_id, employee_id, assessor_type,
      sm_assessment_cycles!inner(name, due_date, status),
      employee:profiles!sm_assessments_employee_id_fkey(full_name)
    `)
    .eq('assessor_id', userId)
    .in('status', ['pending', 'in_progress'])
    .eq('sm_assessment_cycles.status', 'active');

  return (data ?? []).map((row: any) => {
    const cycle = Array.isArray(row.sm_assessment_cycles) ? row.sm_assessment_cycles[0] : row.sm_assessment_cycles;
    const emp = Array.isArray(row.employee) ? row.employee[0] : row.employee;
    return {
      id: row.id,
      cycle_id: row.cycle_id,
      cycle_name: cycle?.name ?? 'Assessment',
      employee_id: row.employee_id,
      employee_name: emp?.full_name ?? '',
      assessor_type: row.assessor_type,
      due_date: cycle?.due_date ?? null,
    };
  });
}

// ─── Visual Matrix ────────────────────────────────────────────────────────────

interface VisualMatrixProps {
  employees: (ProfileRow & { manager_name: string | null; role_title: string | null })[];
  topics: SmTopic[];
  ratingsMap: Record<string, Record<string, number>>; // empId → topicId → rating
  categories: SmCategory[];
  types: SmType[];
  filterCategory?: string;
  filterType?: string;
}

function VisualMatrix({ employees, topics, ratingsMap, categories, types, filterCategory, filterType }: VisualMatrixProps) {
  const [expandedEmp, setExpandedEmp] = useState<string | null>(null);

  const visibleTopics = useMemo(() => {
    if (!filterType && !filterCategory) return topics;
    return topics.filter(t => {
      const cat = categories.find(c => c.id === t.category_id);
      if (!cat) return false;
      if (filterCategory && cat.id !== filterCategory) return false;
      if (filterType && cat.type_id !== filterType) return false;
      return true;
    });
  }, [topics, categories, filterType, filterCategory]);

  if (!employees.length || !visibleTopics.length) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-8 text-center text-gray-400 text-sm">
        No matrix data available. Ensure a matrix is locked and employees are assigned.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
      <table className="text-xs border-collapse min-w-max w-full">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            <th className="sticky left-0 z-10 bg-gray-50 px-3 py-3 text-left font-semibold text-gray-600 border-r border-gray-200 min-w-[180px]">
              Employee
            </th>
            <th className="px-3 py-3 text-left font-semibold text-gray-500 border-r border-gray-100 min-w-[120px] whitespace-nowrap">
              Manager
            </th>
            <th className="px-3 py-3 text-left font-semibold text-gray-500 border-r border-gray-200 min-w-[140px] whitespace-nowrap">
              Role
            </th>
            {visibleTopics.map(t => (
              <th
                key={t.id}
                className="px-2 py-3 text-center font-medium text-gray-500 border-l border-gray-100 max-w-[90px]"
                title={t.name}
              >
                <div className="writing-mode-vertical-lr transform -rotate-45 origin-bottom-left whitespace-nowrap overflow-hidden text-ellipsis max-w-[80px]">
                  {t.name.length > 14 ? t.name.slice(0, 14) + '…' : t.name}
                </div>
              </th>
            ))}
            <th className="px-3 py-3 text-center font-semibold text-gray-500 border-l border-gray-200 min-w-[70px]">
              Training %
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {employees.map(emp => {
            const empRatings = ratingsMap[emp.id] ?? {};
            const topicRatings = visibleTopics.map(t => empRatings[t.id] ?? 0);
            const pct = trainingPct(topicRatings);
            const isExpanded = expandedEmp === emp.id;

            return (
              <>
                <tr key={emp.id} className="hover:bg-gray-50 transition-colors">
                  <td className="sticky left-0 z-10 bg-white px-3 py-2.5 font-medium text-gray-800 border-r border-gray-200">
                    <button
                      onClick={() => setExpandedEmp(isExpanded ? null : emp.id)}
                      className="flex items-center gap-1.5 hover:text-blue-600 transition-colors text-left w-full"
                    >
                      {isExpanded ? <ChevronDown className="w-3 h-3 flex-shrink-0" /> : <ChevronRight className="w-3 h-3 flex-shrink-0" />}
                      <span className="truncate">{emp.full_name}</span>
                    </button>
                  </td>
                  <td className="px-3 py-2.5 text-gray-500 border-r border-gray-100 whitespace-nowrap">
                    {emp.manager_name ?? '—'}
                  </td>
                  <td className="px-3 py-2.5 text-gray-500 border-r border-gray-200 whitespace-nowrap">
                    {emp.role_title ?? emp.job_title ?? '—'}
                  </td>
                  {visibleTopics.map(t => {
                    const r = empRatings[t.id] ?? 0;
                    return (
                      <td key={t.id} className={`px-2 py-2.5 text-center font-semibold border-l border-gray-100 ${cellColour(r)}`}>
                        {r}
                      </td>
                    );
                  })}
                  <td className="px-3 py-2.5 text-center border-l border-gray-200">
                    <span className={`font-semibold text-xs ${pct >= 80 ? 'text-green-700' : pct >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
                      {pct}%
                    </span>
                  </td>
                </tr>
                {isExpanded && (
                  <tr key={`${emp.id}-exp`} className="bg-blue-50 border-b border-gray-200">
                    <td colSpan={visibleTopics.length + 4} className="px-5 py-3">
                      <p className="text-xs font-semibold text-gray-700 mb-2">{emp.full_name} — Topic Breakdown</p>
                      <div className="flex flex-wrap gap-2">
                        {visibleTopics.map(t => {
                          const r = empRatings[t.id] ?? 0;
                          return (
                            <div key={t.id} className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
                              r <= 1 ? 'bg-red-50 text-red-700 border-red-200' :
                              r === 2 ? 'bg-amber-50 text-amber-700 border-amber-200' :
                              'bg-green-50 text-green-700 border-green-200'
                            }`}>
                              <span>{t.name}</span>
                              <span className="font-bold">{r}</span>
                            </div>
                          );
                        })}
                      </div>
                    </td>
                  </tr>
                )}
              </>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── Category breakdown ───────────────────────────────────────────────────────

function CategoryBreakdown({ categories, types, topics, ratingsMap }: {
  categories: SmCategory[];
  types: SmType[];
  topics: SmTopic[];
  ratingsMap: Record<string, Record<string, number>>;
}) {
  const allRatings = Object.values(ratingsMap).flatMap(m => Object.values(m));

  const catBreakdown = useMemo(() => {
    return categories.map(cat => {
      const catTopicIds = new Set(topics.filter(t => t.category_id === cat.id).map(t => t.id));
      const ratings: number[] = [];
      for (const empMap of Object.values(ratingsMap)) {
        for (const [tid, r] of Object.entries(empMap)) {
          if (catTopicIds.has(tid)) ratings.push(r);
        }
      }
      const type = types.find(ty => ty.id === cat.type_id);
      return { cat, type, pct: trainingPct(ratings), count: ratings.length };
    }).filter(row => row.count > 0);
  }, [categories, topics, ratingsMap, types]);

  if (!catBreakdown.length) return null;

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm space-y-3">
      {catBreakdown.map(({ cat, type, pct }) => (
        <div key={cat.id} className="flex items-center gap-3">
          <div className="min-w-0 flex-shrink-0" style={{ width: 200 }}>
            <p className="text-sm text-gray-700 truncate font-medium">{cat.name}</p>
            {type && <p className="text-xs text-gray-400 truncate">{type.name}</p>}
          </div>
          <div className="flex-1">
            <ProgressBar pct={pct} colour={pct >= 80 ? 'green' : pct >= 50 ? 'amber' : 'red'} />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Core data hook ───────────────────────────────────────────────────────────

interface MatrixData {
  matrix: SmMatrix;
  topics: SmTopic[];
  categories: SmCategory[];
  types: SmType[];
  roleTopics: RoleTopic[];
  trainingRecords: TrainingRecord[];
  jobFamilies: JobFamily[];
}

async function loadLockedMatrixData(matrixIds: string[]): Promise<MatrixData[]> {
  if (!matrixIds.length) return [];

  const [topicsRes, categoriesRes, typesRes, roleTopicsRes, trainingRes, jfRes] = await Promise.all([
    supabase.from('sm_topics').select('id, name, category_id').not('archived', 'eq', true),
    supabase.from('sm_categories').select('id, name, type_id').not('archived', 'eq', true),
    supabase.from('sm_types').select('id, name').not('archived', 'eq', true),
    supabase.from('sm_role_topics').select('topic_id, job_family_id, matrix_id').in('matrix_id', matrixIds).eq('is_applicable', true),
    supabase.from('sm_training_records').select('employee_id, topic_id, matrix_id, rating, training_date').in('matrix_id', matrixIds),
    supabase.from('job_families').select('id, title'),
  ]);

  return matrixIds.map(mid => ({
    matrix: { id: mid, name: '', department: '', is_locked: true },
    topics: topicsRes.data ?? [],
    categories: categoriesRes.data ?? [],
    types: typesRes.data ?? [],
    roleTopics: (roleTopicsRes.data ?? []).filter((rt: RoleTopic & { matrix_id: string }) => rt.matrix_id === mid),
    trainingRecords: (trainingRes.data ?? []).filter((tr: TrainingRecord) => tr.matrix_id === mid),
    jobFamilies: jfRes.data ?? [],
  }));
}

// ─── Employee View ────────────────────────────────────────────────────────────

function EmployeeView({ userId, onNavigateToAssessment }: { userId: string; onNavigateToAssessment?: (cycleId: string, employeeId: string, assessorType: 'employee' | 'manager') => void }) {
  const [loading, setLoading] = useState(true);
  const [noMatrix, setNoMatrix] = useState(false);
  const [matrixName, setMatrixName] = useState('');
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [topics, setTopics] = useState<SmTopic[]>([]);
  const [categories, setCategories] = useState<SmCategory[]>([]);
  const [types, setTypes] = useState<SmType[]>([]);
  const [ratingsMap, setRatingsMap] = useState<Record<string, number>>({});
  const [outstandingAssessments, setOutstandingAssessments] = useState<OutstandingAssessment[]>([]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const profileRes = await supabase.from('profiles').select('id, full_name, department, job_title, job_family_id, manager_id, role').eq('id', userId).maybeSingle();
        const prof: ProfileRow | null = profileRes.data;
        setProfile(prof);

        if (!prof?.department) { setNoMatrix(true); setLoading(false); return; }

        // Find the locked matrix for this employee's department
        const matrixRes = await supabase.from('sm_matrices').select('id, name, department, is_locked').eq('department', prof.department).eq('is_locked', true).eq('archived', false).maybeSingle();
        const matrix: SmMatrix | null = matrixRes.data;
        if (!matrix) { setNoMatrix(true); setLoading(false); return; }
        setMatrixName(matrix.name);

        // Role topics for this employee's job family
        const roleTopicsRes = await supabase.from('sm_role_topics').select('topic_id, job_family_id').eq('matrix_id', matrix.id).eq('is_applicable', true);
        const allRoleTopics: RoleTopic[] = roleTopicsRes.data ?? [];

        // Applicable topics: filter to this employee's role if they have one;
        // if role has no topics assigned, fall back to all matrix topics so the view is never blank
        let applicableTopicIds: Set<string>;
        if (prof.job_family_id) {
          const roleFiltered = new Set(allRoleTopics.filter(rt => rt.job_family_id === prof.job_family_id).map(rt => rt.topic_id));
          applicableTopicIds = roleFiltered.size > 0 ? roleFiltered : new Set(allRoleTopics.map(rt => rt.topic_id));
        } else {
          applicableTopicIds = new Set(allRoleTopics.map(rt => rt.topic_id));
        }

        // If still no topics, show the whole topic library filtered to this matrix (unlocked view)
        const topicFilter = applicableTopicIds.size > 0
          ? supabase.from('sm_topics').select('id, name, category_id').in('id', [...applicableTopicIds])
          : supabase.from('sm_topics').select('id, name, category_id').not('archived', 'eq', true);

        const [topicsRes, categoriesRes, typesRes, trainingRes] = await Promise.all([
          topicFilter,
          supabase.from('sm_categories').select('id, name, type_id'),
          supabase.from('sm_types').select('id, name'),
          supabase.from('sm_training_records').select('topic_id, rating').eq('matrix_id', matrix.id).eq('employee_id', userId),
        ]);

        const myTopics: SmTopic[] = topicsRes.data ?? [];
        setTopics(myTopics);
        setCategories(categoriesRes.data ?? []);
        setTypes(typesRes.data ?? []);

        const rMap: Record<string, number> = {};
        for (const tr of (trainingRes.data ?? [])) rMap[tr.topic_id] = tr.rating ?? 0;
        // Default 0 for topics without a record
        for (const tid of applicableTopicIds) { if (!(tid in rMap)) rMap[tid] = 0; }
        setRatingsMap(rMap);

        // Load outstanding assessments for this user
        const pending = await loadOutstandingAssessments(userId);
        setOutstandingAssessments(pending);
      } catch (err) { console.error('EmployeeView error:', err); }
      finally { setLoading(false); }
    }
    load();
  }, [userId]);

  if (loading) return <Spinner />;

  const allRatings = topics.map(t => ratingsMap[t.id] ?? 0);
  const trained = allRatings.filter(r => r >= 1).length;
  const needsTraining = allRatings.filter(r => r === 0);

  // Category breakdown
  const categoryBreakdown = useMemo(() => {
    return categories
      .filter(cat => topics.some(t => t.category_id === cat.id))
      .map(cat => {
        const catTopicIds = topics.filter(t => t.category_id === cat.id).map(t => t.id);
        const ratings = catTopicIds.map(tid => ratingsMap[tid] ?? 0);
        const type = types.find(ty => ty.id === cat.type_id);
        return { cat, type, pct: trainingPct(ratings), total: ratings.length, trained: ratings.filter(r => r >= 1).length };
      });
  }, [categories, topics, ratingsMap, types]);

  return (
    <div className="space-y-6">
      {/* Outstanding assessments */}
      <OutstandingAssessmentsBanner assessments={outstandingAssessments} onNavigateToAssessment={onNavigateToAssessment} />

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <StatCard icon={<Grid3x3 className="w-5 h-5" />} label="Topics" value={topics.length} colour="blue" />
        <StatCard icon={<CheckCircle className="w-5 h-5" />} label="Trained" value={trained} colour="green" sub={`${trainingPct(allRatings)}% complete`} />
        <StatCard icon={<AlertTriangle className="w-5 h-5" />} label="Not Yet Trained" value={needsTraining.length} colour={needsTraining.length > 0 ? 'red' : 'green'} />
      </div>

      {/* My row visual */}
      {topics.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <Grid3x3 className="w-4 h-4 text-blue-500" /> My Skills Matrix Row
          </h2>
          <div className="bg-white border border-gray-200 rounded-xl overflow-x-auto shadow-sm">
            <table className="text-xs border-collapse min-w-max">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="sticky left-0 z-10 bg-gray-50 px-3 py-2.5 text-left font-semibold text-gray-600 border-r border-gray-200 min-w-[160px]">Topic</th>
                  <th className="px-3 py-2.5 text-center font-semibold text-gray-600 min-w-[60px]">Rating</th>
                  <th className="px-3 py-2.5 text-left font-semibold text-gray-600 min-w-[100px]">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {topics.map(t => {
                  const r = ratingsMap[t.id] ?? 0;
                  const cat = categories.find(c => c.id === t.category_id);
                  return (
                    <tr key={t.id} className="hover:bg-gray-50">
                      <td className="sticky left-0 z-10 bg-white px-3 py-2.5 border-r border-gray-200">
                        <p className="font-medium text-gray-800">{t.name}</p>
                        {cat && <p className="text-gray-400 text-xs">{cat.name}</p>}
                      </td>
                      <td className={`px-3 py-2.5 text-center font-bold ${cellColour(r)}`}>{r}</td>
                      <td className="px-3 py-2.5">
                        {r === 0 ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-50 text-red-600 text-xs rounded-full border border-red-100">Not Trained</span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-50 text-green-700 text-xs rounded-full border border-green-100"><CheckCircle className="w-3 h-3" /> Trained</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Category breakdown */}
      {categoryBreakdown.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-blue-500" /> Training % by Category
          </h2>
          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm space-y-3">
            {categoryBreakdown.map(({ cat, type, pct, total, trained }) => (
              <div key={cat.id} className="flex items-center gap-3">
                <div className="min-w-0 flex-shrink-0" style={{ width: 180 }}>
                  <p className="text-sm text-gray-700 truncate font-medium">{cat.name}</p>
                  {type && <p className="text-xs text-gray-400 truncate">{type.name}</p>}
                </div>
                <div className="flex-1"><ProgressBar pct={pct} colour={pct >= 80 ? 'green' : pct >= 50 ? 'amber' : 'red'} /></div>
                <span className="text-xs text-gray-400 whitespace-nowrap">{trained}/{total}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Topics rated 0 */}
      {topics.filter(t => (ratingsMap[t.id] ?? 0) === 0).length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-500" /> Not Yet Trained
          </h2>
          <div className="flex flex-wrap gap-2">
            {topics.filter(t => (ratingsMap[t.id] ?? 0) === 0).map(t => (
              <span key={t.id} className="inline-flex items-center px-3 py-1 bg-red-50 text-red-700 border border-red-200 rounded-full text-xs font-medium">
                {t.name}
              </span>
            ))}
          </div>
        </section>
      )}

      {topics.length === 0 && noMatrix && (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-8 text-center">
          <Grid3x3 className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-500 mb-1">No Skills Matrix available</p>
          <p className="text-xs text-gray-400">Your department does not yet have an active Skills Matrix. Contact your administrator.</p>
        </div>
      )}
      {topics.length === 0 && !noMatrix && !loading && (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-8 text-center">
          <Grid3x3 className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-500 mb-1">No topics assigned to your role</p>
          <p className="text-xs text-gray-400">{matrixName ? `Matrix: ${matrixName}` : 'Ask your administrator to assign topics to your role.'}</p>
        </div>
      )}
    </div>
  );
}

// ─── Manager View ─────────────────────────────────────────────────────────────

function ManagerView({ userId, onNavigateToAssessment }: { userId: string; onNavigateToAssessment?: (cycleId: string, employeeId: string, assessorType: 'employee' | 'manager') => void }) {
  const [loading, setLoading] = useState(true);
  const [team, setTeam] = useState<ProfileRow[]>([]);
  const [outstandingAssessments, setOutstandingAssessments] = useState<OutstandingAssessment[]>([]);
  const [topics, setTopics] = useState<SmTopic[]>([]);
  const [categories, setCategories] = useState<SmCategory[]>([]);
  const [types, setTypes] = useState<SmType[]>([]);
  const [ratingsMap, setRatingsMap] = useState<Record<string, Record<string, number>>>({});
  const [managerMap, setManagerMap] = useState<Record<string, string>>({});
  const [jobFamilyMap, setJobFamilyMap] = useState<Record<string, string>>({});
  const [filterType, setFilterType] = useState('');
  const [filterCategory, setFilterCategory] = useState('');

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const teamRes = await supabase.from('profiles').select('id, full_name, department, job_title, job_family_id, manager_id, role').eq('manager_id', userId).eq('active', true);
        const teamMembers: ProfileRow[] = teamRes.data ?? [];
        setTeam(teamMembers);
        if (!teamMembers.length) { setLoading(false); return; }

        // Get all departments in the team
        const departments = [...new Set(teamMembers.map(m => m.department).filter(Boolean))] as string[];

        // Get locked matrices for those departments
        const matrixRes = await supabase.from('sm_matrices').select('id, name, department, is_locked').in('department', departments).eq('is_locked', true).eq('archived', false);
        const matrices: SmMatrix[] = matrixRes.data ?? [];
        if (!matrices.length) { setLoading(false); return; }

        const matrixIds = matrices.map(m => m.id);
        const teamIds = teamMembers.map(m => m.id);

        const [roleTopicsRes, topicsRes, categoriesRes, typesRes, trainingRes, mgrsRes, jfRes] = await Promise.all([
          supabase.from('sm_role_topics').select('topic_id, job_family_id, matrix_id').in('matrix_id', matrixIds).eq('is_applicable', true),
          supabase.from('sm_topics').select('id, name, category_id').not('archived', 'eq', true),
          supabase.from('sm_categories').select('id, name, type_id').not('archived', 'eq', true),
          supabase.from('sm_types').select('id, name').not('archived', 'eq', true),
          supabase.from('sm_training_records').select('employee_id, topic_id, matrix_id, rating').in('matrix_id', matrixIds).in('employee_id', teamIds),
          supabase.from('profiles').select('id, full_name').in('id', teamMembers.map(m => m.manager_id).filter(Boolean) as string[]),
          supabase.from('job_families').select('id, title'),
        ]);

        const allRoleTopics = roleTopicsRes.data ?? [];
        const allTopics: SmTopic[] = topicsRes.data ?? [];
        const allCategories: SmCategory[] = categoriesRes.data ?? [];
        const allTypes: SmType[] = typesRes.data ?? [];
        const allTraining: TrainingRecord[] = trainingRes.data ?? [];
        const jfMap: Record<string, string> = {};
        for (const jf of (jfRes.data ?? [])) jfMap[jf.id] = jf.title;
        setJobFamilyMap(jfMap);

        // Build manager name map
        const mgMap: Record<string, string> = {};
        for (const m of (mgrsRes.data ?? [])) mgMap[m.id] = m.full_name;
        setManagerMap(mgMap);

        // Collect applicable topic IDs per employee
        const applicableTopicIds = new Set<string>();
        for (const member of teamMembers) {
          const matrix = matrices.find(mx => mx.department === member.department);
          if (!matrix) continue;
          const roleTopicsForMatrix = allRoleTopics.filter((rt: RoleTopic & { matrix_id: string }) => rt.matrix_id === matrix.id);
          if (member.job_family_id) {
            roleTopicsForMatrix.filter((rt: RoleTopic) => rt.job_family_id === member.job_family_id).forEach((rt: RoleTopic) => applicableTopicIds.add(rt.topic_id));
          } else {
            roleTopicsForMatrix.forEach((rt: RoleTopic) => applicableTopicIds.add(rt.topic_id));
          }
        }

        const visibleTopics = allTopics.filter(t => applicableTopicIds.has(t.id));
        const visibleCatIds = new Set(visibleTopics.map(t => t.category_id));
        const visibleCats = allCategories.filter(c => visibleCatIds.has(c.id));
        const visibleTypeIds = new Set(visibleCats.map(c => c.type_id));
        const visibleTypes = allTypes.filter(t => visibleTypeIds.has(t.id));

        setTopics(visibleTopics);
        setCategories(visibleCats);
        setTypes(visibleTypes);

        // Build ratingsMap
        const rMap: Record<string, Record<string, number>> = {};
        for (const member of teamMembers) {
          rMap[member.id] = {};
          const matrix = matrices.find(mx => mx.department === member.department);
          if (!matrix) continue;
          const roleTopicsForMatrix = allRoleTopics.filter((rt: RoleTopic & { matrix_id: string }) => rt.matrix_id === matrix.id);
          let memberTopicIds: Set<string>;
          if (member.job_family_id) {
            memberTopicIds = new Set(roleTopicsForMatrix.filter((rt: RoleTopic) => rt.job_family_id === member.job_family_id).map((rt: RoleTopic) => rt.topic_id));
          } else {
            memberTopicIds = new Set(roleTopicsForMatrix.map((rt: RoleTopic) => rt.topic_id));
          }
          for (const tid of memberTopicIds) rMap[member.id][tid] = 0;
          for (const tr of allTraining.filter(tr => tr.employee_id === member.id && tr.matrix_id === matrix.id)) {
            if (memberTopicIds.has(tr.topic_id)) rMap[member.id][tr.topic_id] = tr.rating ?? 0;
          }
        }
        setRatingsMap(rMap);

        // Load manager's outstanding assessments (manager assesses team members)
        const pending = await loadOutstandingAssessments(userId);
        setOutstandingAssessments(pending);
      } catch (err) { console.error('ManagerView error:', err); }
      finally { setLoading(false); }
    }
    load();
  }, [userId]);

  const enrichedTeam = useMemo(() => team.map(m => ({
    ...m,
    manager_name: managerMap[m.manager_id ?? ''] ?? null,
    role_title: jobFamilyMap[m.job_family_id ?? ''] ?? null,
  })), [team, managerMap, jobFamilyMap]);

  const allRatingsFlat = useMemo(() => Object.values(ratingsMap).flatMap(m => Object.values(m)), [ratingsMap]);

  const categoryBreakdown = useMemo(() => {
    return categories.map(cat => {
      const catTopicIds = new Set(topics.filter(t => t.category_id === cat.id).map(t => t.id));
      const ratings: number[] = [];
      for (const empMap of Object.values(ratingsMap)) {
        for (const [tid, r] of Object.entries(empMap)) {
          if (catTopicIds.has(tid)) ratings.push(r);
        }
      }
      const type = types.find(ty => ty.id === cat.type_id);
      return { cat, type, pct: trainingPct(ratings), count: ratings.length };
    }).filter(r => r.count > 0);
  }, [categories, topics, ratingsMap, types]);

  // Members with 0-rated topics
  const atRiskMembers = useMemo(() => {
    return team.filter(m => {
      const empMap = ratingsMap[m.id] ?? {};
      const vals = Object.values(empMap);
      if (!vals.length) return false;
      return vals.filter(r => r === 0).length > 0;
    });
  }, [team, ratingsMap]);

  const filteredCategories = filterType ? categories.filter(c => c.type_id === filterType) : categories;

  if (loading) return <Spinner />;

  return (
    <div className="space-y-6">
      {/* Outstanding assessments */}
      <OutstandingAssessmentsBanner assessments={outstandingAssessments} onNavigateToAssessment={onNavigateToAssessment} />

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard icon={<Users className="w-5 h-5" />} label="Team Size" value={team.length} colour="blue" />
        <StatCard icon={<TrendingUp className="w-5 h-5" />} label="Team Training %" value={`${trainingPct(allRatingsFlat)}%`} colour={trainingPct(allRatingsFlat) >= 80 ? 'green' : trainingPct(allRatingsFlat) >= 50 ? 'amber' : 'red'} />
        <StatCard icon={<Grid3x3 className="w-5 h-5" />} label="Topics" value={topics.length} colour="gray" />
        <StatCard icon={<AlertTriangle className="w-5 h-5" />} label="Needs Training" value={atRiskMembers.length} colour={atRiskMembers.length > 0 ? 'amber' : 'green'} sub="employees with 0 topics" />
      </div>

      {/* Category breakdown */}
      {categoryBreakdown.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-blue-500" /> Training % by Category
          </h2>
          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm space-y-3">
            {categoryBreakdown.map(({ cat, type, pct, count }) => (
              <div key={cat.id} className="flex items-center gap-3">
                <div className="min-w-0 flex-shrink-0" style={{ width: 180 }}>
                  <p className="text-sm text-gray-700 truncate font-medium">{cat.name}</p>
                  {type && <p className="text-xs text-gray-400">{type.name}</p>}
                </div>
                <div className="flex-1"><ProgressBar pct={pct} colour={pct >= 80 ? 'green' : pct >= 50 ? 'amber' : 'red'} /></div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Employees with untrained topics */}
      {atRiskMembers.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-500" /> Employees with Untrained Topics
          </h2>
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-4 py-2.5 text-left font-semibold text-gray-600">Employee</th>
                  <th className="px-4 py-2.5 text-left font-semibold text-gray-600">Role</th>
                  <th className="px-4 py-2.5 text-left font-semibold text-gray-600">Topics Untrained</th>
                  <th className="px-4 py-2.5 text-left font-semibold text-gray-600">Training %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {atRiskMembers.map(m => {
                  const empMap = ratingsMap[m.id] ?? {};
                  const vals = Object.values(empMap);
                  const untrained = vals.filter(r => r === 0).length;
                  const pct = trainingPct(vals);
                  return (
                    <tr key={m.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-800">{m.full_name}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{jobFamilyMap[m.job_family_id ?? ''] ?? m.job_title ?? '—'}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-50 text-red-700 text-xs rounded-full border border-red-100">
                          {untrained} topic{untrained !== 1 ? 's' : ''}
                        </span>
                      </td>
                      <td className="px-4 py-3 w-36">
                        <ProgressBar pct={pct} colour={pct >= 80 ? 'green' : pct >= 50 ? 'amber' : 'red'} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Filters */}
      {(types.length > 0 || categories.length > 0) && (
        <div className="flex flex-wrap items-center gap-3">
          <Filter className="w-4 h-4 text-gray-400 flex-shrink-0" />
          {types.length > 0 && (
            <select value={filterType} onChange={e => { setFilterType(e.target.value); setFilterCategory(''); }}
              className="text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">All Types</option>
              {types.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          )}
          {filteredCategories.length > 0 && (
            <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)}
              className="text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">All Categories</option>
              {filteredCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          )}
        </div>
      )}

      {/* Visual matrix */}
      <section>
        <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
          <Grid3x3 className="w-4 h-4 text-blue-500" /> Team Matrix
        </h2>
        <VisualMatrix
          employees={enrichedTeam}
          topics={topics}
          ratingsMap={ratingsMap}
          categories={categories}
          types={types}
          filterCategory={filterCategory}
          filterType={filterType}
        />
      </section>
    </div>
  );
}

// ─── Dept Lead View ───────────────────────────────────────────────────────────

function DeptLeadView({ department, userId, onNavigateToAssessment }: { department: string; userId: string; onNavigateToAssessment?: (cycleId: string, employeeId: string, assessorType: 'employee' | 'manager') => void }) {
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState<ProfileRow[]>([]);
  const [outstandingAssessments, setOutstandingAssessments] = useState<OutstandingAssessment[]>([]);
  const [topics, setTopics] = useState<SmTopic[]>([]);
  const [categories, setCategories] = useState<SmCategory[]>([]);
  const [types, setTypes] = useState<SmType[]>([]);
  const [ratingsMap, setRatingsMap] = useState<Record<string, Record<string, number>>>({});
  const [managerMap, setManagerMap] = useState<Record<string, string>>({});
  const [jobFamilyMap, setJobFamilyMap] = useState<Record<string, string>>({});
  const [managers, setManagers] = useState<ProfileRow[]>([]);

  const [filterManager, setFilterManager] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterCategory, setFilterCategory] = useState('');

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [empRes, matrixRes, jfRes] = await Promise.all([
          supabase.from('profiles').select('id, full_name, department, job_title, job_family_id, manager_id, role').eq('department', department).eq('active', true).in('role', ['employee', 'manager']),
          supabase.from('sm_matrices').select('id, name, department, is_locked').eq('department', department).eq('is_locked', true).eq('archived', false).maybeSingle(),
          supabase.from('job_families').select('id, title'),
        ]);

        const emps: ProfileRow[] = empRes.data ?? [];
        setEmployees(emps);
        const matrix: SmMatrix | null = matrixRes.data;

        const jfMap: Record<string, string> = {};
        for (const jf of (jfRes.data ?? [])) jfMap[jf.id] = jf.title;
        setJobFamilyMap(jfMap);

        // Load managers
        const mgIds = [...new Set(emps.map(e => e.manager_id).filter(Boolean))] as string[];
        if (mgIds.length) {
          const mgRes = await supabase.from('profiles').select('id, full_name, department, job_title, job_family_id, manager_id, role').in('id', mgIds);
          setManagers(mgRes.data ?? []);
          const mgMap: Record<string, string> = {};
          for (const m of (mgRes.data ?? [])) mgMap[m.id] = m.full_name;
          setManagerMap(mgMap);
        }

        if (!matrix || !emps.length) { setLoading(false); return; }

        const empIds = emps.map(e => e.id);
        const [roleTopicsRes, topicsRes, categoriesRes, typesRes, trainingRes] = await Promise.all([
          supabase.from('sm_role_topics').select('topic_id, job_family_id').eq('matrix_id', matrix.id).eq('is_applicable', true),
          supabase.from('sm_topics').select('id, name, category_id').not('archived', 'eq', true),
          supabase.from('sm_categories').select('id, name, type_id').not('archived', 'eq', true),
          supabase.from('sm_types').select('id, name').not('archived', 'eq', true),
          supabase.from('sm_training_records').select('employee_id, topic_id, rating').eq('matrix_id', matrix.id).in('employee_id', empIds),
        ]);

        const allRoleTopics: RoleTopic[] = roleTopicsRes.data ?? [];
        const allTopics: SmTopic[] = topicsRes.data ?? [];
        const allCategories: SmCategory[] = categoriesRes.data ?? [];
        const allTypes: SmType[] = typesRes.data ?? [];
        const allTraining: TrainingRecord[] = trainingRes.data ?? [];

        const applicableTopicIds = new Set(allRoleTopics.map(rt => rt.topic_id));
        const visibleTopics = allTopics.filter(t => applicableTopicIds.has(t.id));
        const visibleCatIds = new Set(visibleTopics.map(t => t.category_id));
        const visibleCats = allCategories.filter(c => visibleCatIds.has(c.id));
        const visibleTypeIds = new Set(visibleCats.map(c => c.type_id));
        const visibleTypes = allTypes.filter(t => visibleTypeIds.has(t.id));

        setTopics(visibleTopics);
        setCategories(visibleCats);
        setTypes(visibleTypes);

        const rMap: Record<string, Record<string, number>> = {};
        for (const emp of emps) {
          rMap[emp.id] = {};
          let memberTopicIds: Set<string>;
          if (emp.job_family_id) {
            memberTopicIds = new Set(allRoleTopics.filter(rt => rt.job_family_id === emp.job_family_id).map(rt => rt.topic_id));
          } else {
            memberTopicIds = applicableTopicIds;
          }
          for (const tid of memberTopicIds) rMap[emp.id][tid] = 0;
          for (const tr of allTraining.filter(tr => tr.employee_id === emp.id)) {
            if (memberTopicIds.has(tr.topic_id)) rMap[emp.id][tr.topic_id] = tr.rating ?? 0;
          }
        }
        setRatingsMap(rMap);

        const pending = await loadOutstandingAssessments(userId);
        setOutstandingAssessments(pending);
      } catch (err) { console.error('DeptLeadView error:', err); }
      finally { setLoading(false); }
    }
    load();
  }, [department, userId]);

  const enrichedEmployees = useMemo(() => employees.map(e => ({
    ...e,
    manager_name: managerMap[e.manager_id ?? ''] ?? null,
    role_title: jobFamilyMap[e.job_family_id ?? ''] ?? null,
  })), [employees, managerMap, jobFamilyMap]);

  const filteredEmployees = useMemo(() => enrichedEmployees.filter(e => {
    if (filterManager && e.manager_id !== filterManager) return false;
    if (filterRole && e.job_family_id !== filterRole) return false;
    return true;
  }), [enrichedEmployees, filterManager, filterRole]);

  const allRatingsFlat = useMemo(() => Object.values(ratingsMap).flatMap(m => Object.values(m)), [ratingsMap]);

  const categoryBreakdown = useMemo(() => {
    return categories.map(cat => {
      const catTopicIds = new Set(topics.filter(t => t.category_id === cat.id).map(t => t.id));
      const ratings: number[] = [];
      for (const empMap of Object.values(ratingsMap)) {
        for (const [tid, r] of Object.entries(empMap)) {
          if (catTopicIds.has(tid)) ratings.push(r);
        }
      }
      const type = types.find(ty => ty.id === cat.type_id);
      return { cat, type, pct: trainingPct(ratings), count: ratings.length };
    }).filter(r => r.count > 0);
  }, [categories, topics, ratingsMap, types]);

  const uniqueRoles = useMemo(() => {
    return Object.values(jobFamilyMap).length > 0
      ? [...new Map(employees.filter(e => e.job_family_id && jobFamilyMap[e.job_family_id]).map(e => [e.job_family_id!, { id: e.job_family_id!, title: jobFamilyMap[e.job_family_id!] }])).values()]
      : [];
  }, [employees, jobFamilyMap]);

  const filteredCategories = filterType ? categories.filter(c => c.type_id === filterType) : categories;

  if (loading) return <Spinner />;

  return (
    <div className="space-y-6">
      {/* Outstanding assessments */}
      <OutstandingAssessmentsBanner assessments={outstandingAssessments} onNavigateToAssessment={onNavigateToAssessment} />

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard icon={<Users className="w-5 h-5" />} label="Department" value={employees.length} colour="blue" sub="employees" />
        <StatCard icon={<TrendingUp className="w-5 h-5" />} label="Dept Training %" value={`${trainingPct(allRatingsFlat)}%`} colour={trainingPct(allRatingsFlat) >= 80 ? 'green' : trainingPct(allRatingsFlat) >= 50 ? 'amber' : 'red'} />
        <StatCard icon={<Grid3x3 className="w-5 h-5" />} label="Topics" value={topics.length} colour="gray" />
        <StatCard icon={<AlertTriangle className="w-5 h-5" />} label="Not Trained (any topic)" value={employees.filter(e => Object.values(ratingsMap[e.id] ?? {}).some(r => r === 0)).length} colour="amber" />
      </div>

      {/* Category breakdown */}
      {categoryBreakdown.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-blue-500" /> Training % by Category
          </h2>
          <CategoryBreakdown categories={categories} types={types} topics={topics} ratingsMap={ratingsMap} />
        </section>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <Filter className="w-4 h-4 text-gray-400 flex-shrink-0" />
        {managers.length > 0 && (
          <select value={filterManager} onChange={e => setFilterManager(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">All Managers</option>
            {managers.map(m => <option key={m.id} value={m.id}>{m.full_name}</option>)}
          </select>
        )}
        {uniqueRoles.length > 0 && (
          <select value={filterRole} onChange={e => setFilterRole(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">All Roles</option>
            {uniqueRoles.map(r => <option key={r.id} value={r.id}>{r.title}</option>)}
          </select>
        )}
        {types.length > 0 && (
          <select value={filterType} onChange={e => { setFilterType(e.target.value); setFilterCategory(''); }}
            className="text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">All Types</option>
            {types.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        )}
        {filteredCategories.length > 0 && (
          <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">All Categories</option>
            {filteredCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        )}
        {(filterManager || filterRole || filterType || filterCategory) && (
          <button onClick={() => { setFilterManager(''); setFilterRole(''); setFilterType(''); setFilterCategory(''); }} className="text-xs text-blue-600 hover:underline">
            Clear filters
          </button>
        )}
      </div>

      {/* Visual matrix */}
      <section>
        <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
          <Grid3x3 className="w-4 h-4 text-blue-500" /> Department Matrix
        </h2>
        <VisualMatrix
          employees={filteredEmployees}
          topics={topics}
          ratingsMap={ratingsMap}
          categories={categories}
          types={types}
          filterCategory={filterCategory}
          filterType={filterType}
        />
      </section>
    </div>
  );
}

// ─── Admin / Exec View ────────────────────────────────────────────────────────

function AdminView({ isExecOnly = false, userId = '', onNavigateToAssessment }: { isExecOnly?: boolean; userId?: string; onNavigateToAssessment?: (cycleId: string, employeeId: string, assessorType: 'employee' | 'manager') => void }) {
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState<ProfileRow[]>([]);
  const [outstandingAssessments, setOutstandingAssessments] = useState<OutstandingAssessment[]>([]);
  const [topics, setTopics] = useState<SmTopic[]>([]);
  const [categories, setCategories] = useState<SmCategory[]>([]);
  const [types, setTypes] = useState<SmType[]>([]);
  const [ratingsMap, setRatingsMap] = useState<Record<string, Record<string, number>>>({});
  const [managerMap, setManagerMap] = useState<Record<string, string>>({});
  const [jobFamilyMap, setJobFamilyMap] = useState<Record<string, string>>({});
  const [matrices, setMatrices] = useState<SmMatrix[]>([]);

  const [filterDept, setFilterDept] = useState('');
  const [filterManager, setFilterManager] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterCategory, setFilterCategory] = useState('');

  const [managers, setManagers] = useState<ProfileRow[]>([]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [empRes, matrixRes, jfRes] = await Promise.all([
          supabase.from('profiles').select('id, full_name, department, job_title, job_family_id, manager_id, role').eq('active', true).in('role', ['employee', 'manager']),
          supabase.from('sm_matrices').select('id, name, department, is_locked').eq('is_locked', true).eq('archived', false),
          supabase.from('job_families').select('id, title'),
        ]);

        const emps: ProfileRow[] = empRes.data ?? [];
        setEmployees(emps);
        const mxList: SmMatrix[] = matrixRes.data ?? [];
        setMatrices(mxList);

        const jfMap: Record<string, string> = {};
        for (const jf of (jfRes.data ?? [])) jfMap[jf.id] = jf.title;
        setJobFamilyMap(jfMap);

        const mgIds = [...new Set(emps.map(e => e.manager_id).filter(Boolean))] as string[];
        if (mgIds.length) {
          const mgRes = await supabase.from('profiles').select('id, full_name, department, job_title, job_family_id, manager_id, role').in('id', mgIds);
          setManagers(mgRes.data ?? []);
          const mgMap: Record<string, string> = {};
          for (const m of (mgRes.data ?? [])) mgMap[m.id] = m.full_name;
          setManagerMap(mgMap);
        }

        if (!mxList.length) { setLoading(false); return; }

        const matrixIds = mxList.map(m => m.id);
        const empIds = emps.map(e => e.id);

        const [roleTopicsRes, topicsRes, categoriesRes, typesRes, trainingRes] = await Promise.all([
          supabase.from('sm_role_topics').select('topic_id, job_family_id, matrix_id').in('matrix_id', matrixIds).eq('is_applicable', true),
          supabase.from('sm_topics').select('id, name, category_id').not('archived', 'eq', true),
          supabase.from('sm_categories').select('id, name, type_id').not('archived', 'eq', true),
          supabase.from('sm_types').select('id, name').not('archived', 'eq', true),
          supabase.from('sm_training_records').select('employee_id, topic_id, matrix_id, rating').in('matrix_id', matrixIds).in('employee_id', empIds),
        ]);

        const allRoleTopics: (RoleTopic & { matrix_id: string })[] = roleTopicsRes.data ?? [];
        const allTopics: SmTopic[] = topicsRes.data ?? [];
        const allCategories: SmCategory[] = categoriesRes.data ?? [];
        const allTypes: SmType[] = typesRes.data ?? [];
        const allTraining: TrainingRecord[] = trainingRes.data ?? [];

        const allApplicableTopicIds = new Set(allRoleTopics.map(rt => rt.topic_id));
        const visibleTopics = allTopics.filter(t => allApplicableTopicIds.has(t.id));
        const visibleCatIds = new Set(visibleTopics.map(t => t.category_id));
        const visibleCats = allCategories.filter(c => visibleCatIds.has(c.id));
        const visibleTypeIds = new Set(visibleCats.map(c => c.type_id));
        const visibleTypes = allTypes.filter(t => visibleTypeIds.has(t.id));

        setTopics(visibleTopics);
        setCategories(visibleCats);
        setTypes(visibleTypes);

        // Build ratingsMap per employee
        const rMap: Record<string, Record<string, number>> = {};
        for (const emp of emps) {
          rMap[emp.id] = {};
          const matrix = mxList.find(mx => mx.department === emp.department);
          if (!matrix) continue;
          const matrixRoleTopics = allRoleTopics.filter(rt => rt.matrix_id === matrix.id);
          let memberTopicIds: Set<string>;
          if (emp.job_family_id) {
            memberTopicIds = new Set(matrixRoleTopics.filter(rt => rt.job_family_id === emp.job_family_id).map(rt => rt.topic_id));
          } else {
            memberTopicIds = new Set(matrixRoleTopics.map(rt => rt.topic_id));
          }
          for (const tid of memberTopicIds) rMap[emp.id][tid] = 0;
          for (const tr of allTraining.filter(tr => tr.employee_id === emp.id && tr.matrix_id === matrix.id)) {
            if (memberTopicIds.has(tr.topic_id)) rMap[emp.id][tr.topic_id] = tr.rating ?? 0;
          }
        }
        setRatingsMap(rMap);

        if (userId) {
          const pending = await loadOutstandingAssessments(userId);
          setOutstandingAssessments(pending);
        }
      } catch (err) { console.error('AdminView error:', err); }
      finally { setLoading(false); }
    }
    load();
  }, [userId]);

  const enrichedEmployees = useMemo(() => employees.map(e => ({
    ...e,
    manager_name: managerMap[e.manager_id ?? ''] ?? null,
    role_title: jobFamilyMap[e.job_family_id ?? ''] ?? null,
  })), [employees, managerMap, jobFamilyMap]);

  const departments = useMemo(() => [...new Set(employees.map(e => e.department).filter(Boolean))] as string[], [employees]);

  const filteredEmployees = useMemo(() => enrichedEmployees.filter(e => {
    if (filterDept && e.department !== filterDept) return false;
    if (filterManager && e.manager_id !== filterManager) return false;
    if (filterRole && e.job_family_id !== filterRole) return false;
    return true;
  }), [enrichedEmployees, filterDept, filterManager, filterRole]);

  const allRatingsFlat = useMemo(() => Object.values(ratingsMap).flatMap(m => Object.values(m)), [ratingsMap]);

  const deptBreakdown = useMemo(() => {
    return departments.map(dept => {
      const deptEmps = employees.filter(e => e.department === dept);
      const ratings = deptEmps.flatMap(e => Object.values(ratingsMap[e.id] ?? {}));
      const pct = trainingPct(ratings);
      const matrix = matrices.find(mx => mx.department === dept);
      return { dept, count: deptEmps.length, pct, hasMatrix: !!matrix };
    }).sort((a, b) => a.dept.localeCompare(b.dept));
  }, [departments, employees, ratingsMap, matrices]);

  const categoryBreakdown = useMemo(() => {
    return categories.map(cat => {
      const catTopicIds = new Set(topics.filter(t => t.category_id === cat.id).map(t => t.id));
      const ratings: number[] = [];
      for (const empMap of Object.values(ratingsMap)) {
        for (const [tid, r] of Object.entries(empMap)) {
          if (catTopicIds.has(tid)) ratings.push(r);
        }
      }
      const type = types.find(ty => ty.id === cat.type_id);
      return { cat, type, pct: trainingPct(ratings), count: ratings.length };
    }).filter(r => r.count > 0);
  }, [categories, topics, ratingsMap, types]);

  const uniqueRoles = useMemo(() => {
    return [...new Map(employees.filter(e => e.job_family_id && jobFamilyMap[e.job_family_id]).map(e => [e.job_family_id!, { id: e.job_family_id!, title: jobFamilyMap[e.job_family_id!] }])).values()];
  }, [employees, jobFamilyMap]);

  const filteredCategories = filterType ? categories.filter(c => c.type_id === filterType) : categories;

  if (loading) return <Spinner />;

  return (
    <div className="space-y-6">
      {isExecOnly && (
        <div className="flex items-center gap-2 px-4 py-2.5 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
          <Eye className="w-4 h-4 flex-shrink-0" />
          You have view-only access to organisation-wide Skills Matrix data.
        </div>
      )}

      {/* Outstanding assessments */}
      <OutstandingAssessmentsBanner assessments={outstandingAssessments} onNavigateToAssessment={onNavigateToAssessment} />

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={<Users className="w-5 h-5" />} label="Employees" value={employees.length} colour="blue" sub={`${matrices.length} locked matrices`} />
        <StatCard icon={<TrendingUp className="w-5 h-5" />} label="Org Training %" value={`${trainingPct(allRatingsFlat)}%`} colour={trainingPct(allRatingsFlat) >= 80 ? 'green' : trainingPct(allRatingsFlat) >= 50 ? 'amber' : 'red'} />
        <StatCard icon={<Grid3x3 className="w-5 h-5" />} label="Topics (total)" value={topics.length} colour="gray" />
        <StatCard icon={<AlertTriangle className="w-5 h-5" />} label="Untrained (any topic)" value={employees.filter(e => Object.values(ratingsMap[e.id] ?? {}).some(r => r === 0)).length} colour="amber" />
      </div>

      {/* Department breakdown */}
      <section>
        <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
          <BarChart2 className="w-4 h-4 text-blue-500" /> Department Breakdown
        </h2>
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-4 py-2.5 text-left font-semibold text-gray-600">Department</th>
                <th className="px-4 py-2.5 text-right font-semibold text-gray-600">Employees</th>
                <th className="px-4 py-2.5 text-left font-semibold text-gray-600 w-40">Training %</th>
                <th className="px-4 py-2.5 text-center font-semibold text-gray-600">Matrix</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {deptBreakdown.map(row => (
                <tr key={row.dept} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-800">{row.dept}</td>
                  <td className="px-4 py-3 text-right text-gray-600">{row.count}</td>
                  <td className="px-4 py-3 w-40">
                    <ProgressBar pct={row.pct} colour={row.pct >= 80 ? 'green' : row.pct >= 50 ? 'amber' : 'red'} />
                  </td>
                  <td className="px-4 py-3 text-center">
                    {row.hasMatrix ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-50 text-green-700 text-xs rounded-full border border-green-100"><CheckCircle className="w-3 h-3" /> Locked</span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-500 text-xs rounded-full">No matrix</span>
                    )}
                  </td>
                </tr>
              ))}
              {deptBreakdown.length === 0 && (
                <tr><td colSpan={4} className="px-4 py-6 text-center text-gray-400 text-sm">No locked matrices found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Org-wide category breakdown */}
      {categoryBreakdown.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-green-500" /> Org-wide Training by Category
          </h2>
          <CategoryBreakdown categories={categories} types={types} topics={topics} ratingsMap={ratingsMap} />
        </section>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <Filter className="w-4 h-4 text-gray-400 flex-shrink-0" />
        {departments.length > 0 && (
          <select value={filterDept} onChange={e => setFilterDept(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">All Departments</option>
            {departments.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        )}
        {managers.length > 0 && (
          <select value={filterManager} onChange={e => setFilterManager(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">All Managers</option>
            {managers.map(m => <option key={m.id} value={m.id}>{m.full_name}</option>)}
          </select>
        )}
        {uniqueRoles.length > 0 && (
          <select value={filterRole} onChange={e => setFilterRole(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">All Roles</option>
            {uniqueRoles.map(r => <option key={r.id} value={r.id}>{r.title}</option>)}
          </select>
        )}
        {types.length > 0 && (
          <select value={filterType} onChange={e => { setFilterType(e.target.value); setFilterCategory(''); }}
            className="text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">All Types</option>
            {types.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        )}
        {filteredCategories.length > 0 && (
          <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">All Categories</option>
            {filteredCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        )}
        {(filterDept || filterManager || filterRole || filterType || filterCategory) && (
          <button onClick={() => { setFilterDept(''); setFilterManager(''); setFilterRole(''); setFilterType(''); setFilterCategory(''); }} className="text-xs text-blue-600 hover:underline">
            Clear filters
          </button>
        )}
      </div>

      {/* Full visual matrix */}
      <section>
        <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
          <Grid3x3 className="w-4 h-4 text-blue-500" /> Organisation Matrix
          {(filterDept || filterManager || filterRole) && <span className="text-xs text-gray-400 font-normal">(filtered)</span>}
        </h2>
        <VisualMatrix
          employees={filteredEmployees}
          topics={topics}
          ratingsMap={ratingsMap}
          categories={categories}
          types={types}
          filterCategory={filterCategory}
          filterType={filterType}
        />
      </section>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

interface Props {
  onStartAssessment?: (cycleId: string, employeeId: string, assessorType: 'employee' | 'manager') => void;
}

export default function SkillsMatrixDashboard({ onStartAssessment }: Props) {
  const { effectiveProfile, viewedUserRole } = useAuth();
  const profile = effectiveProfile;

  const isFullAdmin = (profile?.role === 'admin' || viewedUserRole === 'admin') && !!profile?.admin_type && profile.admin_type !== '';
  const isExecOnly = !isFullAdmin && (viewedUserRole === 'admin' || (profile?.role === 'admin' && (!profile?.admin_type || profile.admin_type === '')));
  const isAdminView = isFullAdmin || isExecOnly;
  const isDeptLead = !isAdminView && (profile?.role === 'leadership' || profile?.role === 'dept_lead' || viewedUserRole === 'dept_lead');
  const isManager = !isAdminView && !isDeptLead && (profile?.role === 'manager' || viewedUserRole === 'manager');

  const viewLabel = isFullAdmin ? 'Full Admin' : isExecOnly ? 'Executive (View Only)' : isDeptLead ? 'Department Lead' : isManager ? 'Manager' : 'Employee';

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="p-2 bg-blue-100 rounded-lg text-blue-600"><BarChart2 className="w-5 h-5" /></div>
          <h1 className="text-xl font-bold text-gray-900">Skills Matrix</h1>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded-full">
            {isAdminView ? <Eye className="w-3.5 h-3.5" /> : isDeptLead ? <Grid3x3 className="w-3.5 h-3.5" /> : isManager ? <Users className="w-3.5 h-3.5" /> : <BarChart2 className="w-3.5 h-3.5" />}
            {viewLabel}
          </span>
        </div>
        {profile?.full_name && (
          <p className="text-sm text-gray-500 ml-13 pl-11">
            {profile.full_name}{profile.department ? ` · ${profile.department}` : ''}
          </p>
        )}
      </div>

      {isAdminView ? (
        <AdminView isExecOnly={isExecOnly} onNavigateToAssessment={onStartAssessment} userId={profile?.id ?? ''} />
      ) : isDeptLead ? (
        <DeptLeadView department={profile?.department ?? ''} userId={profile?.id ?? ''} onNavigateToAssessment={onStartAssessment} />
      ) : isManager ? (
        <ManagerView userId={profile?.id ?? ''} onNavigateToAssessment={onStartAssessment} />
      ) : (
        <EmployeeView userId={profile?.id ?? ''} onNavigateToAssessment={onStartAssessment} />
      )}
    </div>
  );
}
