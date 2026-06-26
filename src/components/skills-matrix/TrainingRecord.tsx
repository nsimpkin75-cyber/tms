import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import {
  ClipboardList, User, Calendar, CheckCircle2, Clock, X, Save,
  Pencil, Search, Users, AlertCircle,
  Tag, BookOpen, Layers,
} from 'lucide-react';

// ─── Interfaces ───────────────────────────────────────────────────────────────

interface Props {
  matrixId: string;
  matrixName: string;
  matrixDepartment: string;
}

interface SmType   { id: string; name: string; }
interface SmCategory { id: string; type_id: string; name: string; }
interface SmTopic {
  id: string; name: string; category_id: string;
  training_trackable: boolean;
}

interface JobFamily { id: string; title: string; department: string; }

interface Employee {
  id: string;
  full_name: string;
  department: string | null;
  job_family_id: string | null;
  job_family_title: string | null;
}

interface TrainingRecordRow {
  id: string;
  employee_id: string;
  topic_id: string;
  matrix_id: string;
  training_date: string | null;
  rating: number;
  notes: string | null;
}

// (employee_id, topic_id) → applicable
type ApplicabilityMap = Map<string, Set<string>>;

interface VirtualRow {
  key: string;          // `${employee_id}::${topic_id}`
  employee: Employee;
  topic: SmTopic;
  type: SmType | null;
  category: SmCategory | null;
  jobFamily: JobFamily | null;
  record: TrainingRecordRow | null;
  rating: number;
  training_date: string | null;
}

type TrainingStatus = 'no_training' | 'completed';

function rowStatus(r: VirtualRow): TrainingStatus {
  return r.training_date ? 'completed' : 'no_training';
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: TrainingStatus }) {
  if (status === 'completed') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
        <CheckCircle2 className="w-3 h-3" /> Completed
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
      <Clock className="w-3 h-3" /> No Training
    </span>
  );
}

function StatCard({ label, value, icon }: { label: string; value: string | number; icon: React.ReactNode }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm flex items-center gap-3">
      <div className="p-2 bg-gray-50 rounded-lg">{icon}</div>
      <div>
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-xl font-semibold text-gray-900">{value}</p>
      </div>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function TrainingRecord({ matrixId, matrixName, matrixDepartment }: Props) {
  const { profile } = useAuth();

  const isFullAdmin = profile?.role === 'admin' && !!profile?.admin_type && profile.admin_type !== '';
  const isManager   = profile?.role === 'manager';
  const isDeptLead  = profile?.role === 'admin' && (!profile?.admin_type || profile.admin_type === '');
  const canEdit     = isFullAdmin;
  const canView     = isFullAdmin || isManager || isDeptLead;

  // ── Raw data ──
  const [types,       setTypes]       = useState<SmType[]>([]);
  const [categories,  setCategories]  = useState<SmCategory[]>([]);
  const [topics,      setTopics]      = useState<SmTopic[]>([]);
  const [jobFamilies, setJobFamilies] = useState<JobFamily[]>([]);
  const [employees,   setEmployees]   = useState<Employee[]>([]);
  const [records,     setRecords]     = useState<TrainingRecordRow[]>([]);
  // employee_id → Set<topic_id> that are applicable for that employee
  const [applicability, setApplicability] = useState<ApplicabilityMap>(new Map());

  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  // ── Filters ──
  const [filterType,     setFilterType]     = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterTopic,    setFilterTopic]    = useState('');
  const [filterRole,     setFilterRole]     = useState('');
  const [filterEmployee, setFilterEmployee] = useState('');
  const [search,         setSearch]         = useState('');

  // ── Individual edit ──
  const [editingKey,  setEditingKey]  = useState<string | null>(null);
  const [editDate,    setEditDate]    = useState('');
  const [editNotes,   setEditNotes]   = useState('');
  const [editSaving,  setEditSaving]  = useState(false);
  const [editError,   setEditError]   = useState<string | null>(null);

  // ── Bulk update ──
  const [bulkMode,        setBulkMode]        = useState(false);
  const [bulkTopicId,     setBulkTopicId]     = useState('');
  const [bulkSelected,    setBulkSelected]    = useState<Set<string>>(new Set()); // employee ids
  const [bulkDate,        setBulkDate]        = useState('');
  const [bulkSaving,      setBulkSaving]      = useState(false);
  const [bulkError,       setBulkError]       = useState<string | null>(null);

  // ─── Load ────────────────────────────────────────────────────────────────

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Step 1: role-topic assignments for this matrix
      const { data: rtRows, error: rtErr } = await supabase
        .from('sm_role_topics')
        .select('topic_id, job_family_id')
        .eq('matrix_id', matrixId)
        .eq('is_applicable', true);
      if (rtErr) throw rtErr;

      const allTopicIds   = [...new Set((rtRows ?? []).map(r => r.topic_id))];
      const allJfIds      = [...new Set((rtRows ?? []).map(r => r.job_family_id))];

      // job_family_id → Set<topic_id>
      const jfTopics = new Map<string, Set<string>>();
      for (const r of (rtRows ?? [])) {
        if (!jfTopics.has(r.job_family_id)) jfTopics.set(r.job_family_id, new Set());
        jfTopics.get(r.job_family_id)!.add(r.topic_id);
      }

      // Step 2: all topics assigned to this matrix (training_trackable is informational, not a gate)
      let resolvedTopics: SmTopic[] = [];
      if (allTopicIds.length > 0) {
        const { data, error: e } = await supabase
          .from('sm_topics')
          .select('id, name, category_id, training_trackable')
          .in('id', allTopicIds);
        if (e) throw e;
        resolvedTopics = data ?? [];
      }

      const trackableTopicIds = new Set(resolvedTopics.map(t => t.id));

      // Step 3: categories and types for those topics
      const catIds = [...new Set(resolvedTopics.map(t => t.category_id))];
      let resolvedCategories: SmCategory[] = [];
      let resolvedTypes: SmType[] = [];
      if (catIds.length > 0) {
        const { data: catData, error: catErr } = await supabase
          .from('sm_categories').select('id, type_id, name').in('id', catIds);
        if (catErr) throw catErr;
        resolvedCategories = catData ?? [];

        const typeIds = [...new Set(resolvedCategories.map(c => c.type_id))];
        if (typeIds.length > 0) {
          const { data: typeData, error: typeErr } = await supabase
            .from('sm_types').select('id, name').in('id', typeIds);
          if (typeErr) throw typeErr;
          resolvedTypes = typeData ?? [];
        }
      }

      // Step 4: job families and employees
      // Fetch all job families assigned in this matrix
      let resolvedJFs: JobFamily[] = [];
      if (allJfIds.length > 0) {
        const { data: jfData, error: jfErr } = await supabase
          .from('job_families').select('id, title, department').in('id', allJfIds);
        if (jfErr) throw jfErr;
        resolvedJFs = jfData ?? [];
      }
      const jfMap = new Map<string, JobFamily>(resolvedJFs.map(jf => [jf.id, jf]));

      // Fetch ALL employees in this matrix's department — not just those with a matching job_family_id.
      // Many employees have job_family_id = null and would be silently excluded otherwise.
      const { data: profData, error: profErr } = await supabase
        .from('profiles')
        .select('id, full_name, department, job_family_id')
        .eq('department', matrixDepartment)
        .eq('role', 'employee');
      if (profErr) throw profErr;

      const resolvedEmployees: Employee[] = (profData ?? []).map(p => ({
        id: p.id,
        full_name: p.full_name ?? '(no name)',
        department: p.department,
        job_family_id: p.job_family_id,
        job_family_title: p.job_family_id ? (jfMap.get(p.job_family_id)?.title ?? null) : null,
      }));

      // Step 5: Build applicability map: employee_id → Set<topic_id>
      // - If the employee has a job_family_id that matches matrix role assignments → use those specific topics
      // - If the employee has no job_family_id (or their role isn't in the matrix) → show all matrix topics
      //   so that no department employee is silently excluded
      const allMatrixTopicIds = new Set(resolvedTopics.map(t => t.id));
      const appMap: ApplicabilityMap = new Map();
      for (const emp of resolvedEmployees) {
        let applicable: Set<string>;
        if (emp.job_family_id && jfTopics.has(emp.job_family_id)) {
          // Scope to the topics assigned to their specific role
          applicable = new Set<string>();
          for (const tid of jfTopics.get(emp.job_family_id)!) {
            if (trackableTopicIds.has(tid)) applicable.add(tid);
          }
        } else {
          // No role assignment — show all matrix topics for the department
          applicable = new Set(allMatrixTopicIds);
        }
        if (applicable.size > 0) appMap.set(emp.id, applicable);
      }

      // Step 6: training records
      const { data: recData, error: recErr } = await supabase
        .from('sm_training_records')
        .select('id, employee_id, topic_id, matrix_id, training_date, rating, notes')
        .eq('matrix_id', matrixId);
      if (recErr) throw recErr;

      setTypes(resolvedTypes);
      setCategories(resolvedCategories);
      setTopics(resolvedTopics);
      setJobFamilies(resolvedJFs);
      setEmployees(resolvedEmployees);
      setApplicability(appMap);
      setRecords(recData ?? []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load training records');
    } finally {
      setLoading(false);
    }
  }, [matrixId]);

  useEffect(() => { loadData(); }, [loadData]);

  // ─── Build virtual rows ───────────────────────────────────────────────────

  const recordMap = new Map<string, TrainingRecordRow>(
    records.map(r => [`${r.employee_id}::${r.topic_id}`, r])
  );

  const catMap  = new Map<string, SmCategory>(categories.map(c => [c.id, c]));
  const typeMap = new Map<string, SmType>(types.map(t => [t.id, t]));
  const jfMap   = new Map<string, JobFamily>(jobFamilies.map(jf => [jf.id, jf]));

  const allRows: VirtualRow[] = [];
  for (const emp of employees) {
    const applicable = applicability.get(emp.id);
    if (!applicable) continue;
    for (const topic of topics) {
      if (!applicable.has(topic.id)) continue;
      const key    = `${emp.id}::${topic.id}`;
      const record = recordMap.get(key) ?? null;
      const cat    = catMap.get(topic.category_id) ?? null;
      const type   = cat ? (typeMap.get(cat.type_id) ?? null) : null;
      const jf     = emp.job_family_id ? (jfMap.get(emp.job_family_id) ?? null) : null;
      allRows.push({
        key, employee: emp, topic, type, category: cat, jobFamily: jf,
        record,
        rating:        record?.rating        ?? 0,
        training_date: record?.training_date ?? null,
      });
    }
  }

  // ─── Filter options derived from allRows ─────────────────────────────────

  const typeOptions     = [...new Map(allRows.filter(r => r.type).map(r => [r.type!.id, r.type!])).values()].sort((a,b) => a.name.localeCompare(b.name));
  const categoryOptions = [...new Map(allRows.filter(r => r.category && (!filterType || r.type?.id === filterType)).map(r => [r.category!.id, r.category!])).values()].sort((a,b) => a.name.localeCompare(b.name));
  const topicOptions    = [...new Map(allRows.filter(r => (!filterType || r.type?.id === filterType) && (!filterCategory || r.category?.id === filterCategory)).map(r => [r.topic.id, r.topic])).values()].sort((a,b) => a.name.localeCompare(b.name));
  const roleOptions     = [...new Map(allRows.filter(r => r.jobFamily).map(r => [r.jobFamily!.id, r.jobFamily!])).values()].sort((a,b) => a.title.localeCompare(b.title));
  const employeeOptions = [...new Map(allRows.map(r => [r.employee.id, r.employee])).values()].sort((a,b) => a.full_name.localeCompare(b.full_name));

  // ─── Apply filters ────────────────────────────────────────────────────────

  const filteredRows = allRows.filter(row => {
    if (filterType     && row.type?.id     !== filterType)     return false;
    if (filterCategory && row.category?.id !== filterCategory) return false;
    if (filterTopic    && row.topic.id     !== filterTopic)    return false;
    if (filterRole     && row.jobFamily?.id !== filterRole)    return false;
    if (filterEmployee && row.employee.id  !== filterEmployee) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      if (!row.employee.full_name.toLowerCase().includes(q) && !row.topic.name.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  // ─── Stats ────────────────────────────────────────────────────────────────

  const totalEmployees    = new Set(filteredRows.map(r => r.employee.id)).size;
  const totalTopics       = new Set(filteredRows.map(r => r.topic.id)).size;
  const completedCount    = filteredRows.filter(r => r.training_date).length;
  const completionPct     = filteredRows.length > 0 ? Math.round((completedCount / filteredRows.length) * 100) : 0;

  // ─── Individual save ──────────────────────────────────────────────────────

  function openEdit(row: VirtualRow) {
    setEditingKey(row.key);
    setEditDate(row.training_date ?? '');
    setEditNotes(row.record?.notes ?? '');
    setEditError(null);
  }

  function cancelEdit() { setEditingKey(null); setEditError(null); }

  async function saveEdit(row: VirtualRow) {
    if (!profile) return;
    setEditSaving(true); setEditError(null);
    try {
      const rating = editDate ? 1 : 0;
      const payload = {
        employee_id: row.employee.id, topic_id: row.topic.id, matrix_id: matrixId,
        training_date: editDate || null, rating, notes: editNotes || null, updated_by: profile.id,
      };
      if (row.record) {
        const { error: e } = await supabase.from('sm_training_records').update(payload).eq('id', row.record.id);
        if (e) throw e;
      } else {
        const { error: e } = await supabase.from('sm_training_records').upsert(
          { ...payload, created_by: profile.id }, { onConflict: 'employee_id,topic_id,matrix_id' }
        );
        if (e) throw e;
      }
      await loadData();
      setEditingKey(null);
    } catch (err: unknown) {
      setEditError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setEditSaving(false);
    }
  }

  // ─── Bulk save ────────────────────────────────────────────────────────────

  const bulkTopicRows = bulkTopicId
    ? filteredRows.filter(r => r.topic.id === bulkTopicId)
    : [];

  async function saveBulk() {
    if (!profile || !bulkTopicId || bulkSelected.size === 0 || !bulkDate) return;
    setBulkSaving(true); setBulkError(null);
    try {
      const rows = bulkTopicRows.filter(r => bulkSelected.has(r.employee.id));
      for (const row of rows) {
        const payload = {
          employee_id: row.employee.id, topic_id: row.topic.id, matrix_id: matrixId,
          training_date: bulkDate, rating: 1, updated_by: profile.id,
        };
        if (row.record) {
          const { error: e } = await supabase.from('sm_training_records').update(payload).eq('id', row.record.id);
          if (e) throw e;
        } else {
          const { error: e } = await supabase.from('sm_training_records').upsert(
            { ...payload, created_by: profile.id }, { onConflict: 'employee_id,topic_id,matrix_id' }
          );
          if (e) throw e;
        }
      }
      await loadData();
      setBulkMode(false); setBulkTopicId(''); setBulkSelected(new Set()); setBulkDate('');
    } catch (err: unknown) {
      setBulkError(err instanceof Error ? err.message : 'Bulk save failed');
    } finally {
      setBulkSaving(false);
    }
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  if (!canView) {
    return (
      <div className="text-center py-12 text-gray-500">
        <AlertCircle className="w-10 h-10 mx-auto mb-3 text-gray-300" />
        <p className="text-sm">You do not have permission to view training records.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48 text-gray-500">
        <div className="animate-spin rounded-full h-6 w-6 border-2 border-teal-600 border-t-transparent mr-3" />
        Loading training records...
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm flex items-center gap-2">
        <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-teal-50 rounded-lg">
            <ClipboardList className="w-5 h-5 text-teal-600" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-gray-900">{matrixName} — Training Records</h2>
            <p className="text-sm text-gray-500">{matrixDepartment}</p>
          </div>
        </div>
        {canEdit && (
          <button
            onClick={() => { setBulkMode(true); setBulkTopicId(''); setBulkSelected(new Set()); setBulkDate(''); setBulkError(null); }}
            className="flex items-center gap-1.5 px-3 py-2 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 transition-colors"
          >
            <Users className="w-4 h-4" /> Bulk Update
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Employees" value={totalEmployees} icon={<User className="w-4 h-4 text-teal-500" />} />
        <StatCard label="Topics" value={totalTopics} icon={<ClipboardList className="w-4 h-4 text-blue-500" />} />
        <StatCard label="Completed" value={completedCount} icon={<CheckCircle2 className="w-4 h-4 text-green-500" />} />
        <StatCard label="Completion" value={`${completionPct}%`} icon={<Calendar className="w-4 h-4 text-gray-400" />} />
      </div>

      {/* Bulk update panel */}
      {bulkMode && canEdit && (
        <div className="bg-teal-50 border border-teal-200 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-teal-900 flex items-center gap-2">
              <Users className="w-4 h-4" /> Bulk Training Update
            </h3>
            <button onClick={() => setBulkMode(false)} className="text-teal-600 hover:text-teal-800"><X className="w-4 h-4" /></button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-teal-800 mb-1">Topic <span className="text-red-500">*</span></label>
              <select value={bulkTopicId} onChange={e => { setBulkTopicId(e.target.value); setBulkSelected(new Set()); }}
                className="w-full border border-teal-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
                <option value="">Select topic...</option>
                {topics.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-teal-800 mb-1">Training Date <span className="text-red-500">*</span></label>
              <input type="date" value={bulkDate} onChange={e => setBulkDate(e.target.value)}
                className="w-full border border-teal-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
            </div>
          </div>

          {bulkTopicId && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-teal-800">Select Employees <span className="text-red-500">*</span></label>
                <button
                  onClick={() => {
                    const all = new Set(bulkTopicRows.map(r => r.employee.id));
                    setBulkSelected(prev => prev.size === all.size ? new Set() : all);
                  }}
                  className="text-xs text-teal-600 hover:text-teal-800 underline"
                >
                  {bulkSelected.size === bulkTopicRows.length ? 'Deselect all' : 'Select all'}
                </button>
              </div>
              {bulkTopicRows.length === 0 ? (
                <p className="text-sm text-teal-700 italic">No employees assigned to this topic.</p>
              ) : (
                <div className="max-h-48 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {bulkTopicRows.map(row => (
                    <label key={row.employee.id} className="flex items-center gap-2 px-3 py-2 bg-white border border-teal-200 rounded-lg cursor-pointer hover:bg-teal-50 transition-colors">
                      <input type="checkbox" checked={bulkSelected.has(row.employee.id)}
                        onChange={e => {
                          setBulkSelected(prev => {
                            const s = new Set(prev);
                            e.target.checked ? s.add(row.employee.id) : s.delete(row.employee.id);
                            return s;
                          });
                        }}
                        className="rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                      />
                      <span className="text-xs text-gray-800 font-medium truncate">{row.employee.full_name}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}

          {bulkError && <p className="text-xs text-red-600">{bulkError}</p>}

          <div className="flex items-center gap-3">
            <button onClick={saveBulk}
              disabled={bulkSaving || !bulkTopicId || bulkSelected.size === 0 || !bulkDate}
              className="flex items-center gap-1.5 px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
              {bulkSaving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
              Save {bulkSelected.size > 0 ? `(${bulkSelected.size} employees)` : ''}
            </button>
            <button onClick={() => setBulkMode(false)} className="px-4 py-2 bg-white border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50 transition-colors">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" placeholder="Search employee or topic name..."
            value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-teal-500" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
          <select value={filterType} onChange={e => { setFilterType(e.target.value); setFilterCategory(''); setFilterTopic(''); }}
            className="border border-gray-300 rounded-lg px-2 py-1.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-teal-500">
            <option value="">All Types</option>
            {typeOptions.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          <select value={filterCategory} onChange={e => { setFilterCategory(e.target.value); setFilterTopic(''); }}
            className="border border-gray-300 rounded-lg px-2 py-1.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-teal-500">
            <option value="">All Categories</option>
            {categoryOptions.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select value={filterTopic} onChange={e => setFilterTopic(e.target.value)}
            className="border border-gray-300 rounded-lg px-2 py-1.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-teal-500">
            <option value="">All Topics</option>
            {topicOptions.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          <select value={filterRole} onChange={e => setFilterRole(e.target.value)}
            className="border border-gray-300 rounded-lg px-2 py-1.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-teal-500">
            <option value="">All Roles</option>
            {roleOptions.map(r => <option key={r.id} value={r.id}>{r.title}</option>)}
          </select>
          <select value={filterEmployee} onChange={e => setFilterEmployee(e.target.value)}
            className="border border-gray-300 rounded-lg px-2 py-1.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-teal-500">
            <option value="">All Employees</option>
            {employeeOptions.map(e => <option key={e.id} value={e.id}>{e.full_name}</option>)}
          </select>
        </div>
        {(filterType || filterCategory || filterTopic || filterRole || filterEmployee || search) && (
          <button onClick={() => { setFilterType(''); setFilterCategory(''); setFilterTopic(''); setFilterRole(''); setFilterEmployee(''); setSearch(''); }}
            className="text-xs text-teal-600 hover:text-teal-800 underline">
            Clear all filters
          </button>
        )}
      </div>

      {/* Empty states */}
      {allRows.length === 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-center">
          <AlertCircle className="w-10 h-10 text-amber-400 mx-auto mb-3" />
          <p className="text-sm font-semibold text-amber-800 mb-1">No employees found for this matrix</p>
          <p className="text-xs text-amber-700">
            No employees found for the selected matrix, topic and role assignment. Ensure this matrix has training-trackable topics with roles assigned, and that employees are assigned to those roles in their profiles.
          </p>
        </div>
      )}

      {allRows.length > 0 && filteredRows.length === 0 && (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 text-center">
          <Search className="w-8 h-8 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-500">No records match your filters.</p>
        </div>
      )}

      {/* Table */}
      {filteredRows.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Employee</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Department</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Role</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    <span className="flex items-center gap-1"><Tag className="w-3 h-3" /> Type</span>
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    <span className="flex items-center gap-1"><BookOpen className="w-3 h-3" /> Category</span>
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    <span className="flex items-center gap-1"><Layers className="w-3 h-3" /> Topic</span>
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Training Date</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Rating</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                  {canEdit && <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide"></th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredRows.map(row => {
                  const isEditing = editingKey === row.key;
                  return (
                    <tr key={row.key} className={`hover:bg-gray-50 transition-colors ${isEditing ? 'bg-teal-50/40' : ''}`}>
                      <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">{row.employee.full_name}</td>
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{row.employee.department ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{row.jobFamily?.title ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap text-xs">{row.type?.name ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap text-xs">{row.category?.name ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-800 whitespace-nowrap font-medium">{row.topic.name}</td>

                      <td className="px-4 py-3 whitespace-nowrap">
                        {isEditing ? (
                          <input type="date" value={editDate} onChange={e => setEditDate(e.target.value)}
                            className="border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                        ) : row.training_date ? (
                          <span className="flex items-center gap-1 text-gray-700">
                            <Calendar className="w-3.5 h-3.5 text-gray-400" />
                            {new Date(row.training_date).toLocaleDateString()}
                          </span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap">
                        {isEditing ? (
                          <span className="text-xs text-gray-400 italic">Auto ({editDate ? '1' : '0'})</span>
                        ) : (
                          <span className={`font-semibold ${row.rating === 1 ? 'text-green-600' : 'text-gray-400'}`}>
                            {row.rating}
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap">
                        <StatusBadge status={rowStatus(row)} />
                      </td>

                      {canEdit && (
                        <td className="px-4 py-3 whitespace-nowrap">
                          {isEditing ? (
                            <div className="space-y-2">
                              <textarea value={editNotes} onChange={e => setEditNotes(e.target.value)}
                                placeholder="Notes (optional)"
                                rows={2}
                                className="w-44 border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none" />
                              {editError && <p className="text-xs text-red-600">{editError}</p>}
                              <div className="flex gap-1.5">
                                <button onClick={() => saveEdit(row)} disabled={editSaving}
                                  className="flex items-center gap-1 px-2 py-1 bg-teal-600 text-white rounded text-xs font-medium hover:bg-teal-700 disabled:opacity-50 transition-colors">
                                  <Save className="w-3 h-3" />
                                  {editSaving ? 'Saving...' : 'Save'}
                                </button>
                                <button onClick={cancelEdit} disabled={editSaving}
                                  className="flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs hover:bg-gray-200 disabled:opacity-50 transition-colors">
                                  <X className="w-3 h-3" /> Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <button onClick={() => openEdit(row)}
                              className="flex items-center gap-1 px-2 py-1.5 text-gray-400 hover:text-teal-600 hover:bg-teal-50 rounded transition-colors text-xs">
                              <Pencil className="w-3.5 h-3.5" /> Edit
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

