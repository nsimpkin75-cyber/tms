import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Grid3x3, CheckCircle, AlertCircle, ClipboardList, ExternalLink } from 'lucide-react';

interface Topic {
  id: string;
  name: string;
  category_id: string;
  category_name: string;
}

interface RatingsMap {
  [topicId: string]: number;
}

interface OutstandingAssessment {
  id: string;
  cycle_id: string;
  cycle_name: string;
  employee_id: string;
  assessor_type: string;
  due_date: string | null;
}

interface Props {
  employeeId: string;
  monthlyReviewId?: string;
  isManager: boolean;
  onNavigateToAssessment?: (cycleId: string, employeeId: string, assessorType: 'employee' | 'manager') => void;
}

function cellColour(rating: number): string {
  if (rating <= 1) return 'bg-red-100 text-red-700';
  if (rating === 2) return 'bg-amber-100 text-amber-700';
  return 'bg-green-100 text-green-700';
}

export default function SkillsMatrixPanel({ employeeId, onNavigateToAssessment }: Props) {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [ratingsMap, setRatingsMap] = useState<RatingsMap>({});
  const [employeeName, setEmployeeName] = useState('');
  const [loading, setLoading] = useState(true);
  const [noMatrix, setNoMatrix] = useState(false);
  const [outstandingAssessments, setOutstandingAssessments] = useState<OutstandingAssessment[]>([]);

  useEffect(() => {
    if (employeeId) loadData();
  }, [employeeId]);

  async function loadData() {
    setLoading(true);
    setNoMatrix(false);
    try {
      // 1. Employee profile
      const { data: emp } = await supabase
        .from('profiles')
        .select('id, full_name, department, job_family_id')
        .eq('id', employeeId)
        .maybeSingle();

      if (!emp) { setLoading(false); return; }
      setEmployeeName(emp.full_name || '');

      // 2. Locked matrix for their department
      const { data: matrixRow } = await supabase
        .from('sm_matrices')
        .select('id')
        .eq('department', emp.department)
        .eq('is_locked', true)
        .eq('archived', false)
        .limit(1)
        .maybeSingle();

      if (!matrixRow) { setNoMatrix(true); setLoading(false); return; }
      const matrixId = matrixRow.id;

      // 3. Role topics — flat query, no nested joins
      const roleTopicsQuery = supabase
        .from('sm_role_topics')
        .select('topic_id')
        .eq('matrix_id', matrixId)
        .eq('is_applicable', true);

      const { data: roleTopicsData } = emp.job_family_id
        ? await roleTopicsQuery.eq('job_family_id', emp.job_family_id)
        : await roleTopicsQuery;

      let topicIds = [...new Set((roleTopicsData ?? []).map((r: { topic_id: string }) => r.topic_id))];

      // Fall back to all matrix topics if none match this role
      if (topicIds.length === 0) {
        const { data: allRt } = await supabase
          .from('sm_role_topics')
          .select('topic_id')
          .eq('matrix_id', matrixId)
          .eq('is_applicable', true);
        topicIds = [...new Set((allRt ?? []).map((r: { topic_id: string }) => r.topic_id))];
      }

      if (topicIds.length === 0) { setLoading(false); return; }

      // 4. Topic names — flat
      const { data: topicsData } = await supabase
        .from('sm_topics')
        .select('id, name, category_id')
        .in('id', topicIds)
        .eq('archived', false);

      // 5. Category names — flat
      const catIds = [...new Set((topicsData ?? []).map((t: { category_id: string }) => t.category_id))];
      const { data: catsData } = catIds.length > 0
        ? await supabase.from('sm_categories').select('id, name').in('id', catIds)
        : { data: [] };

      const catMap: Record<string, string> = {};
      (catsData ?? []).forEach((c: { id: string; name: string }) => { catMap[c.id] = c.name; });

      const resolvedTopics: Topic[] = (topicsData ?? []).map((t: { id: string; name: string; category_id: string }) => ({
        id: t.id,
        name: t.name,
        category_id: t.category_id,
        category_name: catMap[t.category_id] ?? '',
      }));

      setTopics(resolvedTopics);

      // 6. Training records — default 0 for missing
      const { data: records } = await supabase
        .from('sm_training_records')
        .select('topic_id, rating')
        .eq('matrix_id', matrixId)
        .eq('employee_id', employeeId)
        .in('topic_id', topicIds);

      const map: RatingsMap = {};
      (records ?? []).forEach((r: { topic_id: string; rating: number | null }) => {
        map[r.topic_id] = r.rating ?? 0;
      });
      // Fill 0 for topics with no record yet
      topicIds.forEach(tid => { if (!(tid in map)) map[tid] = 0; });
      setRatingsMap(map);

      // 7. Outstanding assessments — flat query
      const { data: assessments } = await supabase
        .from('sm_assessments')
        .select('id, cycle_id, employee_id, assessor_type, status')
        .eq('employee_id', employeeId)
        .in('status', ['pending', 'in_progress']);

      if (assessments && assessments.length > 0) {
        const cycleIds = assessments.map((a: { cycle_id: string }) => a.cycle_id);
        const { data: cycles } = await supabase
          .from('sm_assessment_cycles')
          .select('id, name, due_date, status')
          .in('id', cycleIds)
          .eq('status', 'active');

        const cycleMap: Record<string, { name: string; due_date: string | null }> = {};
        (cycles ?? []).forEach((c: { id: string; name: string; due_date: string | null }) => {
          cycleMap[c.id] = { name: c.name, due_date: c.due_date };
        });

        setOutstandingAssessments(
          assessments
            .filter((a: { cycle_id: string }) => cycleMap[a.cycle_id])
            .map((a: { id: string; cycle_id: string; employee_id: string; assessor_type: string }) => ({
              id: a.id,
              cycle_id: a.cycle_id,
              cycle_name: cycleMap[a.cycle_id]?.name ?? 'Assessment',
              employee_id: a.employee_id,
              assessor_type: a.assessor_type,
              due_date: cycleMap[a.cycle_id]?.due_date ?? null,
            }))
        );
      }
    } catch (err) {
      console.error('SkillsMatrixPanel error:', err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (noMatrix) {
    return (
      <div className="text-center py-8 text-sm text-gray-500">
        No locked Skills Matrix found for this employee's department.
      </div>
    );
  }

  if (topics.length === 0) {
    return (
      <div className="text-center py-8 text-sm text-gray-500">
        No applicable topics found in the Skills Matrix.
      </div>
    );
  }

  // Group topics by category
  const categoryMap = new Map<string, { name: string; topics: Topic[] }>();
  topics.forEach(t => {
    if (!categoryMap.has(t.category_id)) {
      categoryMap.set(t.category_id, { name: t.category_name, topics: [] });
    }
    categoryMap.get(t.category_id)!.topics.push(t);
  });

  const trainedCount = topics.filter(t => (ratingsMap[t.id] ?? 0) >= 1).length;
  const trainingPct = Math.round((trainedCount / topics.length) * 100);

  return (
    <div className="space-y-5">
      {/* Outstanding assessments */}
      {outstandingAssessments.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-2">
          <div className="flex items-center gap-2 mb-1">
            <ClipboardList className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <span className="text-sm font-semibold text-amber-900">
              Outstanding Assessment{outstandingAssessments.length !== 1 ? 's' : ''} ({outstandingAssessments.length})
            </span>
            <span className="text-xs text-amber-700">— complete to update ratings</span>
          </div>
          {outstandingAssessments.map(a => (
            <div key={a.id} className="flex items-center justify-between bg-white border border-amber-100 rounded-lg px-3 py-2.5 gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">{a.cycle_name}</p>
                <p className="text-xs text-gray-500">
                  {a.assessor_type === 'manager' ? 'Manager assessment' : 'Self-assessment'}
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
      )}

      {/* Summary bar */}
      <div className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-xl p-4">
        <div className="flex items-center gap-2">
          <Grid3x3 className="w-5 h-5 text-blue-600" />
          <span className="font-semibold text-gray-900">{employeeName} — Skills Matrix</span>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <span className="text-gray-600">{topics.length} topics</span>
          <span className={`font-semibold px-2.5 py-1 rounded-full text-xs ${
            trainingPct >= 80 ? 'bg-green-100 text-green-700' :
            trainingPct >= 50 ? 'bg-amber-100 text-amber-700' :
            'bg-red-100 text-red-700'
          }`}>
            {trainingPct}% trained
          </span>
        </div>
      </div>

      {/* Category sections */}
      {Array.from(categoryMap.values()).map(cat => {
        const catTrained = cat.topics.filter(t => (ratingsMap[t.id] ?? 0) >= 1).length;
        return (
          <div key={cat.name} className="border border-gray-200 rounded-xl overflow-hidden">
            <div className="flex items-center justify-between bg-gray-50 px-4 py-2.5 border-b border-gray-200">
              <span className="font-medium text-gray-800 text-sm">{cat.name}</span>
              <span className="text-xs text-gray-500">{catTrained}/{cat.topics.length} trained</span>
            </div>
            <div className="divide-y divide-gray-100">
              {cat.topics.map(topic => {
                const rating = ratingsMap[topic.id] ?? 0;
                const trained = rating >= 1;
                return (
                  <div key={topic.id} className="flex items-center justify-between px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      {trained
                        ? <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                        : <AlertCircle className="w-4 h-4 text-gray-300 flex-shrink-0" />
                      }
                      <span className="text-sm text-gray-800">{topic.name}</span>
                    </div>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full min-w-[2rem] text-center ${cellColour(rating)}`}>
                      {rating}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
