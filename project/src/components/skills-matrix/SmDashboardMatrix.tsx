import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import {
  Grid3x3, Users, TrendingUp, AlertTriangle, Filter, ChevronDown, ChevronRight,
} from 'lucide-react';

// ─── Types ─────────────────────────────────────────────────────────────────────

interface SmMatrix { id: string; name: string; department: string; }
interface SmTopic  { id: string; name: string; category_id: string; }
interface SmCategory { id: string; name: string; type_id: string; }
interface SmType   { id: string; name: string; }

interface EmpRow {
  id: string;
  full_name: string;
  department: string | null;
  job_title: string | null;
  job_family_id: string | null;
  manager_id: string | null;
  manager_name: string | null;
  role_title: string | null;
}

interface TrainingRecord {
  employee_id: string;
  topic_id: string;
  rating: number;
}

interface RoleTopic {
  topic_id: string;
  job_family_id: string;
  matrix_id: string;
}

interface Props {
  /** 'dept' shows locked matrix for a single department; 'org' shows all locked matrices */
  scope: 'dept' | 'org';
  department?: string;
  /** When true, only render the summary tiles — hide filters and the full matrix table */
  summaryOnly?: boolean;
}

// ─── Colour helper ─────────────────────────────────────────────────────────────

function cellColour(r: number) {
  if (r <= 1) return 'bg-red-100 text-red-700';
  if (r === 2) return 'bg-amber-100 text-amber-700';
  return 'bg-green-100 text-green-700';
}

function pbar(pct: number) {
  const col = pct >= 80 ? 'bg-green-500' : pct >= 50 ? 'bg-amber-500' : 'bg-red-500';
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
        <div className={`${col} h-1.5 rounded-full`} style={{ width: `${Math.min(100, pct)}%` }} />
      </div>
      <span className="text-xs font-medium text-gray-600 w-8 text-right">{pct}%</span>
    </div>
  );
}

// ─── Component ─────────────────────────────────────────────────────────────────

export default function SmDashboardMatrix({ scope, department, summaryOnly = false }: Props) {
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState<EmpRow[]>([]);
  const [topics, setTopics] = useState<SmTopic[]>([]);
  const [categories, setCategories] = useState<SmCategory[]>([]);
  const [types, setTypes] = useState<SmType[]>([]);
  const [ratingsMap, setRatingsMap] = useState<Record<string, Record<string, number>>>({});
  const [noMatrix, setNoMatrix] = useState(false);

  // Filters
  const [filterDept, setFilterDept] = useState('');
  const [filterManager, setFilterManager] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterTopic, setFilterTopic] = useState('');
  const [filterEmployee, setFilterEmployee] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Row expand
  const [expandedEmp, setExpandedEmp] = useState<string | null>(null);

  useEffect(() => {
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope, department]);

  async function load() {
    setLoading(true);
    setNoMatrix(false);
    try {
      // 1. Fetch locked matrices
      let matrixQuery = supabase
        .from('sm_matrices')
        .select('id, name, department')
        .eq('is_locked', true)
        .eq('archived', false);

      if (scope === 'dept' && department) {
        matrixQuery = matrixQuery.eq('department', department);
      }

      const { data: matrixData } = await matrixQuery;
      const matrices: SmMatrix[] = matrixData ?? [];

      if (!matrices.length) {
        setNoMatrix(true);
        setLoading(false);
        return;
      }

      const matrixIds = matrices.map(m => m.id);
      const deptByMatrix: Record<string, string> = {};
      matrices.forEach(m => { deptByMatrix[m.id] = m.department; });

      // 2. Fetch reference data
      const [topicsRes, catsRes, typesRes, roleTopicsRes] = await Promise.all([
        supabase.from('sm_topics').select('id, name, category_id').not('archived', 'eq', true),
        supabase.from('sm_categories').select('id, name, type_id').not('archived', 'eq', true),
        supabase.from('sm_types').select('id, name').not('archived', 'eq', true),
        supabase.from('sm_role_topics').select('topic_id, job_family_id, matrix_id').in('matrix_id', matrixIds).eq('is_applicable', true),
      ]);

      const allTopics: SmTopic[] = topicsRes.data ?? [];
      const allCats: SmCategory[] = catsRes.data ?? [];
      const allTypes: SmType[] = typesRes.data ?? [];
      const allRoleTopics: RoleTopic[] = roleTopicsRes.data ?? [];

      // 3. Fetch employees in relevant departments
      const depts = scope === 'dept' && department ? [department] : [...new Set(matrices.map(m => m.department))];
      const { data: empData } = await supabase
        .from('profiles')
        .select('id, full_name, department, job_title, job_family_id, manager_id, role')
        .in('department', depts)
        .eq('active', true)
        .in('role', ['employee', 'manager']);

      const emps = empData ?? [];

      // 4. Fetch manager names and job family names
      const managerIds = [...new Set(emps.map((e: any) => e.manager_id).filter(Boolean))] as string[];
      const jfIds = [...new Set(emps.map((e: any) => e.job_family_id).filter(Boolean))] as string[];

      const [mgrRes, jfRes] = await Promise.all([
        managerIds.length > 0
          ? supabase.from('profiles').select('id, full_name').in('id', managerIds)
          : Promise.resolve({ data: [] }),
        jfIds.length > 0
          ? supabase.from('job_families').select('id, title').in('id', jfIds)
          : Promise.resolve({ data: [] }),
      ]);

      const mgrMap: Record<string, string> = {};
      (mgrRes.data ?? []).forEach((m: any) => { mgrMap[m.id] = m.full_name; });
      const jfMap: Record<string, string> = {};
      (jfRes.data ?? []).forEach((jf: any) => { jfMap[jf.id] = jf.title; });

      // 5. Fetch training records
      const empIds = emps.map((e: any) => e.id);
      const { data: trainingData } = await supabase
        .from('sm_training_records')
        .select('employee_id, topic_id, rating')
        .in('matrix_id', matrixIds)
        .in('employee_id', empIds);

      const training: TrainingRecord[] = trainingData ?? [];

      // 6. Build per-employee ratings map
      const rMap: Record<string, Record<string, number>> = {};
      const applicableTopicIds = new Set<string>();

      for (const emp of emps) {
        const matrix = matrices.find(mx => mx.department === emp.department);
        if (!matrix) continue;

        const matrixRoleTopics = allRoleTopics.filter(rt => rt.matrix_id === matrix.id);
        let memberTopicIds: Set<string>;
        if (emp.job_family_id) {
          memberTopicIds = new Set(
            matrixRoleTopics
              .filter(rt => rt.job_family_id === emp.job_family_id)
              .map(rt => rt.topic_id)
          );
        } else {
          memberTopicIds = new Set(matrixRoleTopics.map(rt => rt.topic_id));
        }

        rMap[emp.id] = {};
        for (const tid of memberTopicIds) {
          rMap[emp.id][tid] = 0;
          applicableTopicIds.add(tid);
        }
        for (const tr of training.filter(t => t.employee_id === emp.id)) {
          if (memberTopicIds.has(tr.topic_id)) {
            rMap[emp.id][tr.topic_id] = tr.rating ?? 0;
          }
        }
      }

      // 7. Filter topic/category/type lists to only those used
      const usedTopics = allTopics.filter(t => applicableTopicIds.has(t.id));
      const usedCatIds = new Set(usedTopics.map(t => t.category_id));
      const usedCats = allCats.filter(c => usedCatIds.has(c.id));
      const usedTypeIds = new Set(usedCats.map(c => c.type_id));
      const usedTypes = allTypes.filter(t => usedTypeIds.has(t.id));

      const enrichedEmps: EmpRow[] = emps.map((e: any) => ({
        id: e.id,
        full_name: e.full_name,
        department: e.department,
        job_title: e.job_title,
        job_family_id: e.job_family_id,
        manager_id: e.manager_id,
        manager_name: mgrMap[e.manager_id] ?? null,
        role_title: jfMap[e.job_family_id] ?? null,
      }));

      setEmployees(enrichedEmps);
      setTopics(usedTopics);
      setCategories(usedCats);
      setTypes(usedTypes);
      setRatingsMap(rMap);
    } catch (err) {
      console.error('SmDashboardMatrix load error:', err);
    } finally {
      setLoading(false);
    }
  }

  // ─── Derived filter options ─────────────────────────────────────────────────

  const uniqueDepts = useMemo(() => [...new Set(employees.map(e => e.department).filter(Boolean))] as string[], [employees]);
  const uniqueManagers = useMemo(() => {
    const seen = new Map<string, string>();
    employees.forEach(e => { if (e.manager_id && e.manager_name) seen.set(e.manager_id, e.manager_name); });
    return [...seen.entries()].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [employees]);
  const uniqueRoles = useMemo(() => {
    const seen = new Map<string, string>();
    employees.forEach(e => { if (e.job_family_id && e.role_title) seen.set(e.job_family_id, e.role_title); });
    return [...seen.entries()].map(([id, title]) => ({ id, title })).sort((a, b) => a.title.localeCompare(b.title));
  }, [employees]);
  const filteredCats = useMemo(() => filterType ? categories.filter(c => c.type_id === filterType) : categories, [categories, filterType]);
  const filteredTopics = useMemo(() => {
    let t = topics;
    if (filterCategory) t = t.filter(tp => tp.category_id === filterCategory);
    else if (filterType) {
      const catIds = new Set(filteredCats.map(c => c.id));
      t = t.filter(tp => catIds.has(tp.category_id));
    }
    return t;
  }, [topics, filteredCats, filterCategory, filterType]);

  // ─── Filtered employees ─────────────────────────────────────────────────────

  const filteredEmps = useMemo(() => {
    return employees.filter(e => {
      if (filterDept && e.department !== filterDept) return false;
      if (filterManager && e.manager_id !== filterManager) return false;
      if (filterRole && e.job_family_id !== filterRole) return false;
      if (filterEmployee && !e.full_name.toLowerCase().includes(filterEmployee.toLowerCase())) return false;
      return true;
    });
  }, [employees, filterDept, filterManager, filterRole, filterEmployee]);

  // ─── Visible topics (after topic/category/type filter) ─────────────────────

  const visibleTopics = useMemo(() => {
    if (!filterTopic) return filteredTopics;
    return filteredTopics.filter(t => t.id === filterTopic);
  }, [filteredTopics, filterTopic]);

  // ─── Aggregate tiles ────────────────────────────────────────────────────────

  const tiles = useMemo(() => {
    const allRatings: number[] = [];
    filteredEmps.forEach(e => {
      Object.values(ratingsMap[e.id] ?? {}).forEach(r => allRatings.push(r));
    });
    if (!allRatings.length) return null;
    const competent = allRatings.filter(r => r >= 3).length;
    const total = allRatings.length;
    const compPct = Math.round((competent / total) * 100);
    const r0 = allRatings.filter(r => r === 0).length;
    const r1 = allRatings.filter(r => r === 1).length;
    const r2 = allRatings.filter(r => r === 2).length;

    // By type
    const byType = types.map(ty => {
      const catIds = new Set(categories.filter(c => c.type_id === ty.id).map(c => c.id));
      const topicIds = new Set(topics.filter(t => catIds.has(t.category_id)).map(t => t.id));
      const ratings: number[] = [];
      filteredEmps.forEach(e => {
        Object.entries(ratingsMap[e.id] ?? {}).forEach(([tid, r]) => { if (topicIds.has(tid)) ratings.push(r); });
      });
      if (!ratings.length) return null;
      const pct = Math.round((ratings.filter(r => r >= 3).length / ratings.length) * 100);
      return { id: ty.id, name: ty.name, pct };
    }).filter(Boolean) as { id: string; name: string; pct: number }[];

    // By category (top 5)
    const byCat = categories.map(cat => {
      const topicIds = new Set(topics.filter(t => t.category_id === cat.id).map(t => t.id));
      const ratings: number[] = [];
      filteredEmps.forEach(e => {
        Object.entries(ratingsMap[e.id] ?? {}).forEach(([tid, r]) => { if (topicIds.has(tid)) ratings.push(r); });
      });
      if (!ratings.length) return null;
      const pct = Math.round((ratings.filter(r => r >= 3).length / ratings.length) * 100);
      return { id: cat.id, name: cat.name, pct };
    }).filter(Boolean) as { id: string; name: string; pct: number }[];

    return { compPct, r0, r1, r2, total, competent, byType, byCat };
  }, [filteredEmps, ratingsMap, types, categories, topics]);

  const hasActiveFilters = !!(filterDept || filterManager || filterRole || filterType || filterCategory || filterTopic || filterEmployee);

  function clearFilters() {
    setFilterDept(''); setFilterManager(''); setFilterRole('');
    setFilterType(''); setFilterCategory(''); setFilterTopic(''); setFilterEmployee('');
  }

  // ─── Render ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10 gap-2 text-gray-400 text-sm">
        <div className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
        Loading Skills Matrix...
      </div>
    );
  }

  if (noMatrix) {
    return (
      <div className="text-center py-8 bg-gray-50 rounded-xl border border-dashed border-gray-200">
        <Grid3x3 className="w-8 h-8 text-gray-300 mx-auto mb-2" />
        <p className="text-sm text-gray-500">No locked Skills Matrix found{department ? ` for ${department}` : ''}.</p>
        <p className="text-xs text-gray-400 mt-1">Build and lock a matrix in the Skills Matrix Builder.</p>
      </div>
    );
  }

  if (!visibleTopics.length || !filteredEmps.length) {
    return (
      <div className="text-center py-8 bg-gray-50 rounded-xl border border-dashed border-gray-200">
        <Grid3x3 className="w-8 h-8 text-gray-300 mx-auto mb-2" />
        <p className="text-sm text-gray-500">No matrix data to display.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Tiles */}
      {tiles && (
        <div className="space-y-3">
          {/* Top row: summary tiles */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="col-span-2 sm:col-span-3 lg:col-span-2 bg-white border border-gray-200 rounded-xl p-4 shadow-sm flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-50 text-blue-600 flex-shrink-0"><TrendingUp className="w-5 h-5" /></div>
              <div>
                <p className="text-xs text-gray-500">Overall Competency</p>
                <p className="text-2xl font-bold text-gray-900">{tiles.compPct}%</p>
                <p className="text-xs text-gray-400">{tiles.competent} / {tiles.total} topics rated 3+</p>
              </div>
            </div>
            <div className="bg-white border border-red-100 rounded-xl p-4 shadow-sm">
              <p className="text-xs text-gray-500 mb-1">Rating 0 (none)</p>
              <p className="text-2xl font-bold text-red-600">{tiles.r0}</p>
            </div>
            <div className="bg-white border border-orange-100 rounded-xl p-4 shadow-sm">
              <p className="text-xs text-gray-500 mb-1">Rating 1 (trained)</p>
              <p className="text-2xl font-bold text-orange-600">{tiles.r1}</p>
            </div>
            <div className="bg-white border border-amber-100 rounded-xl p-4 shadow-sm">
              <p className="text-xs text-gray-500 mb-1">Rating 2 (developing)</p>
              <p className="text-2xl font-bold text-amber-600">{tiles.r2}</p>
            </div>
            <div className="bg-white border border-green-100 rounded-xl p-4 shadow-sm">
              <p className="text-xs text-gray-500 mb-1">Competent (3+)</p>
              <p className="text-2xl font-bold text-green-600">{tiles.competent}</p>
            </div>
          </div>

          {/* By type */}
          {tiles.byType.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {tiles.byType.map(ty => (
                <div key={ty.id} className="bg-white border border-gray-200 rounded-xl px-4 py-3 shadow-sm">
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-xs font-semibold text-gray-700 truncate">{ty.name}</p>
                    <span className={`text-xs font-bold ${ty.pct >= 80 ? 'text-green-700' : ty.pct >= 50 ? 'text-amber-600' : 'text-red-600'}`}>{ty.pct}%</span>
                  </div>
                  {pbar(ty.pct)}
                </div>
              ))}
            </div>
          )}

          {/* By category */}
          {tiles.byCat.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
              <p className="text-xs font-semibold text-gray-600 mb-3 uppercase tracking-wide">Competency % by Category</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-2.5">
                {tiles.byCat.map(cat => (
                  <div key={cat.id}>
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-xs text-gray-600 truncate">{cat.name}</p>
                      <span className={`text-xs font-semibold ${cat.pct >= 80 ? 'text-green-700' : cat.pct >= 50 ? 'text-amber-600' : 'text-red-600'}`}>{cat.pct}%</span>
                    </div>
                    {pbar(cat.pct)}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {!summaryOnly && (
      <>
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => setShowFilters(f => !f)}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border transition-colors ${showFilters || hasActiveFilters ? 'bg-blue-50 border-blue-300 text-blue-700' : 'border-gray-200 text-gray-500 hover:text-gray-700'}`}
        >
          <Filter className="w-3.5 h-3.5" />
          Filters{hasActiveFilters ? ' (active)' : ''}
        </button>
        {hasActiveFilters && (
          <button onClick={clearFilters} className="text-xs text-blue-600 hover:underline">Clear all</button>
        )}
      </div>

      {showFilters && (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 flex flex-wrap gap-3">
          {scope === 'org' && (
            <select value={filterDept} onChange={e => setFilterDept(e.target.value)}
              className="text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">All Departments</option>
              {uniqueDepts.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          )}
          {scope === 'org' && (
            <input value={filterEmployee} onChange={e => setFilterEmployee(e.target.value)}
              placeholder="Search employee..."
              className="text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[150px]" />
          )}
          {uniqueManagers.length > 0 && (
            <select value={filterManager} onChange={e => setFilterManager(e.target.value)}
              className="text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">All Managers</option>
              {uniqueManagers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
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
            <select value={filterType} onChange={e => { setFilterType(e.target.value); setFilterCategory(''); setFilterTopic(''); }}
              className="text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">All Types</option>
              {types.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          )}
          {filteredCats.length > 0 && (
            <select value={filterCategory} onChange={e => { setFilterCategory(e.target.value); setFilterTopic(''); }}
              className="text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">All Categories</option>
              {filteredCats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          )}
          {filteredTopics.length > 0 && (
            <select value={filterTopic} onChange={e => setFilterTopic(e.target.value)}
              className="text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">All Topics</option>
              {filteredTopics.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          )}
        </div>
      )}

      {/* Visual matrix table */}
      <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
        <table className="text-xs border-collapse min-w-max w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="sticky left-0 z-10 bg-gray-50 px-3 py-3 text-left font-semibold text-gray-600 border-r border-gray-200 min-w-[160px]">
                Employee
              </th>
              {scope === 'org' && (
                <th className="px-3 py-3 text-left font-semibold text-gray-500 border-r border-gray-100 min-w-[110px] whitespace-nowrap">
                  Department
                </th>
              )}
              <th className="px-3 py-3 text-left font-semibold text-gray-500 border-r border-gray-100 min-w-[110px] whitespace-nowrap">
                Manager
              </th>
              <th className="px-3 py-3 text-left font-semibold text-gray-500 border-r border-gray-200 min-w-[120px] whitespace-nowrap">
                Role
              </th>
              {visibleTopics.map(t => (
                <th key={t.id} className="px-2 py-3 text-center font-medium text-gray-500 border-l border-gray-100 max-w-[88px]" title={t.name}>
                  <div className="transform -rotate-45 origin-bottom-left whitespace-nowrap overflow-hidden text-ellipsis max-w-[80px]">
                    {t.name.length > 14 ? t.name.slice(0, 14) + '…' : t.name}
                  </div>
                </th>
              ))}
              <th className="px-3 py-3 text-center font-semibold text-gray-500 border-l border-gray-200 min-w-[70px]">
                Comp %
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredEmps.map(emp => {
              const empR = ratingsMap[emp.id] ?? {};
              const visRatings = visibleTopics.map(t => empR[t.id] ?? 0);
              const compPct = visRatings.length
                ? Math.round((visRatings.filter(r => r >= 3).length / visRatings.length) * 100)
                : 0;
              const isExpanded = expandedEmp === emp.id;

              return (
                <>
                  <tr key={emp.id} className="hover:bg-gray-50 transition-colors">
                    <td className="sticky left-0 z-10 bg-white px-3 py-2.5 font-medium text-gray-800 border-r border-gray-200">
                      <button
                        onClick={() => setExpandedEmp(isExpanded ? null : emp.id)}
                        className="flex items-center gap-1.5 hover:text-blue-600 transition-colors text-left w-full"
                      >
                        {isExpanded
                          ? <ChevronDown className="w-3 h-3 flex-shrink-0" />
                          : <ChevronRight className="w-3 h-3 flex-shrink-0" />}
                        <span className="truncate">{emp.full_name}</span>
                      </button>
                    </td>
                    {scope === 'org' && (
                      <td className="px-3 py-2.5 text-gray-500 border-r border-gray-100 whitespace-nowrap">{emp.department ?? '—'}</td>
                    )}
                    <td className="px-3 py-2.5 text-gray-500 border-r border-gray-100 whitespace-nowrap">{emp.manager_name ?? '—'}</td>
                    <td className="px-3 py-2.5 text-gray-500 border-r border-gray-200 whitespace-nowrap">{emp.role_title ?? emp.job_title ?? '—'}</td>
                    {visibleTopics.map(t => {
                      const r = empR[t.id] ?? 0;
                      return (
                        <td key={t.id} className={`px-2 py-2.5 text-center font-semibold border-l border-gray-100 ${cellColour(r)}`}>
                          {r}
                        </td>
                      );
                    })}
                    <td className="px-3 py-2.5 text-center border-l border-gray-200">
                      <span className={`font-semibold text-xs ${compPct >= 80 ? 'text-green-700' : compPct >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
                        {compPct}%
                      </span>
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr key={`${emp.id}-exp`} className="bg-blue-50 border-b border-gray-200">
                      <td colSpan={visibleTopics.length + (scope === 'org' ? 5 : 4)} className="px-5 py-3">
                        <p className="text-xs font-semibold text-gray-700 mb-2">{emp.full_name} — Topic Breakdown</p>
                        <div className="flex flex-wrap gap-2">
                          {visibleTopics.map(t => {
                            const r = empR[t.id] ?? 0;
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

      <p className="text-xs text-gray-400">
        {filteredEmps.length} employee{filteredEmps.length !== 1 ? 's' : ''} · {visibleTopics.length} topic{visibleTopics.length !== 1 ? 's' : ''}
        {hasActiveFilters ? ' (filtered)' : ''}
        {' '}· Colour: <span className="text-red-600">0–1 red</span>, <span className="text-amber-600">2 amber</span>, <span className="text-green-600">3–5 green</span>
        {' '}· Competency: ratings 3+ ÷ total
      </p>
      </>
      )}
    </div>
  );
}
