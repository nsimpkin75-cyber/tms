import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { ChevronLeft, Calendar, TrendingUp, Plus, Clock, CheckCircle, ArrowRight, History } from 'lucide-react';
import { format, startOfMonth, addMonths } from 'date-fns';
import WeeklyCheckinsTab from './WeeklyCheckinsTab';
import ReviewFlow from './ReviewFlow';

interface OneToOneInterfaceProps {
  meetingId: string;
  employeeId: string;
  onBack: () => void;
  openHistory?: boolean;
}

interface EmployeeInfo {
  full_name: string;
  job_title: string;
  department: string;
  tenure: number;
  job_family_id: string;
  job_family_title?: string;
  job_family_level?: string;
  competency_level?: string;
}

interface WeeklySummary {
  id: string;
  week_starting: string;
  week_number: number;
  performance_score: number;
  kpi_discussion: Record<string, any>;
  short_term_actions: string[];
  summary: string;
  status: string;
}

interface MonthlyReviewStatus {
  id: string;
  review_month: string;
  status: string;
  overall_average?: number;
  overall_kpi_average?: number;
  overall_competency_score?: number;
}

type ReviewMode = 'select' | 'weekly' | 'monthly' | 'history';

export default function OneToOneInterface({ meetingId, employeeId, onBack, openHistory = false }: OneToOneInterfaceProps) {
  const { profile, isViewingAs } = useAuth();
  const [mode, setMode] = useState<ReviewMode>('select');
  const [employeeInfo, setEmployeeInfo] = useState<EmployeeInfo | null>(null);
  const [careerMapInfo, setCareerMapInfo] = useState<any>(null);
  const [weeklyCheckins, setWeeklyCheckins] = useState<WeeklySummary[]>([]);
  const [monthlyReview, setMonthlyReview] = useState<MonthlyReviewStatus | null>(null);
  const [reviewHistory, setReviewHistory] = useState<MonthlyReviewStatus[]>([]);
  const [selectedHistoryReview, setSelectedHistoryReview] = useState<MonthlyReviewStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const currentMonth = startOfMonth(new Date());
  const monthStr = format(currentMonth, 'yyyy-MM-dd');

  useEffect(() => {
    loadAll();
  }, [employeeId, meetingId]);

  async function loadAll() {
    setLoading(true);
    const [,,,, history] = await Promise.all([loadEmployeeInfo(), loadCareerMapPosition(), loadWeeklyCheckins(), loadMonthlyReview(), loadReviewHistory()]);
    setLoading(false);
    // If opened via "View Reviews" button, jump straight to the most recent review
    if (openHistory) {
      // Also check current month review in case it's the most recent completed one
      const { data: currentMonthReview } = await supabase
        .from('one_to_one_monthly_reviews')
        .select('id, review_month, status, overall_average, overall_kpi_average, overall_competency_score')
        .eq('meeting_id', meetingId)
        .eq('employee_id', employeeId)
        .eq('review_month', monthStr)
        .maybeSingle();

      // Build full list: current month (if exists) + history, sorted newest first
      const allReviews: MonthlyReviewStatus[] = [
        ...(currentMonthReview ? [currentMonthReview] : []),
        ...(history || []),
      ].sort((a, b) => b.review_month.localeCompare(a.review_month));

      if (allReviews.length > 0) {
        setSelectedHistoryReview(allReviews[0]);
        setMode('history');
      }
    }
  }

  async function loadEmployeeInfo() {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('full_name, job_title, department, tenure, job_family_id, competency_level')
        .eq('id', employeeId)
        .single();
      if (!data) return;
      if (data.job_family_id) {
        const { data: jf } = await supabase
          .from('job_families')
          .select('title, level')
          .eq('id', data.job_family_id)
          .maybeSingle();
        setEmployeeInfo({ ...data, job_family_title: jf?.title, job_family_level: jf?.level });
      } else {
        setEmployeeInfo(data);
      }
    } catch (e) {
      console.error('loadEmployeeInfo', e);
    }
  }

  async function loadCareerMapPosition() {
    try {
      const { data } = await supabase
        .from('career_pathway_progress')
        .select('current_position, target_position, progress_percentage, career_pathways(pathway_name, levels)')
        .eq('employee_id', employeeId)
        .eq('status', 'active')
        .maybeSingle();
      if (data) setCareerMapInfo(data);
    } catch (e) {
      console.error('loadCareerMap', e);
    }
  }

  async function loadWeeklyCheckins() {
    try {
      const nextMonthStr = format(addMonths(currentMonth, 1), 'yyyy-MM-dd');
      const { data } = await supabase
        .from('one_to_one_weekly_checkins')
        .select('id, week_starting, week_number, performance_score, kpi_discussion, short_term_actions, summary, status')
        .eq('meeting_id', meetingId)
        .eq('employee_id', employeeId)
        .gte('week_starting', monthStr)
        .lt('week_starting', nextMonthStr)
        .order('week_starting', { ascending: false });
      setWeeklyCheckins(data || []);
    } catch (e) {
      console.error('loadWeeklyCheckins', e);
    }
  }

  async function loadMonthlyReview() {
    try {
      const { data } = await supabase
        .from('one_to_one_monthly_reviews')
        .select('id, review_month, status, overall_average, overall_kpi_average, overall_competency_score')
        .eq('meeting_id', meetingId)
        .eq('employee_id', employeeId)
        .eq('review_month', monthStr)
        .maybeSingle();
      setMonthlyReview(data);
    } catch (e) {
      console.error('loadMonthlyReview', e);
    }
  }

  async function loadReviewHistory(): Promise<MonthlyReviewStatus[]> {
    try {
      const { data } = await supabase
        .from('one_to_one_monthly_reviews')
        .select('id, review_month, status, overall_average, overall_kpi_average, overall_competency_score')
        .eq('meeting_id', meetingId)
        .eq('employee_id', employeeId)
        .neq('review_month', monthStr)
        .order('review_month', { ascending: false });
      const history = data || [];
      setReviewHistory(history);
      return history;
    } catch (e) {
      console.error('loadReviewHistory', e);
      return [];
    }
  }

  function getLengthOfService() {
    if (!employeeInfo?.tenure) return 'N/A';
    const years = Math.floor(employeeInfo.tenure / 12);
    const months = employeeInfo.tenure % 12;
    if (years === 0) return `${months}m`;
    if (months === 0) return `${years}y`;
    return `${years}y ${months}m`;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (mode === 'weekly') {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <button onClick={() => { setMode('select'); loadAll(); }} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800">
            <ChevronLeft className="w-4 h-4" /> Back
          </button>
          <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 font-medium">
            <ChevronLeft className="w-4 h-4" /> Back to Reviews
          </button>
        </div>
        <EmployeeHeader employeeInfo={employeeInfo} careerMapInfo={careerMapInfo} los={getLengthOfService()} />
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <WeeklyCheckinsTab
            meetingId={meetingId}
            employeeId={employeeId}
            onCheckinSaved={() => { setMode('select'); loadAll(); }}
          />
        </div>
      </div>
    );
  }

  if (mode === 'monthly') {
    return (
      <div className="space-y-6">
        <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 font-medium">
          <ChevronLeft className="w-4 h-4" /> Back to Reviews
        </button>
        <EmployeeHeader employeeInfo={employeeInfo} careerMapInfo={careerMapInfo} los={getLengthOfService()} />
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <ReviewFlow
            meetingId={meetingId}
            employeeId={employeeId}
            competencyLevel={employeeInfo?.competency_level || 'Employee'}
            onBack={() => { setMode('select'); loadAll(); }}
            onSubmitted={() => { onBack(); }}
            previousWeeklySummaries={weeklyCheckins}
            readOnly={isViewingAs}
          />
        </div>
      </div>
    );
  }

  if (mode === 'history' && selectedHistoryReview) {
    return (
      <div className="space-y-6">
        <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 font-medium">
          <ChevronLeft className="w-4 h-4" /> Back to Reviews
        </button>
        <EmployeeHeader employeeInfo={employeeInfo} careerMapInfo={careerMapInfo} los={getLengthOfService()} />
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <ReviewFlow
            meetingId={meetingId}
            employeeId={employeeId}
            competencyLevel={employeeInfo?.competency_level || 'Employee'}
            onBack={() => { setMode('select'); setSelectedHistoryReview(null); loadAll(); }}
            previousWeeklySummaries={[]}
            reviewMonth={selectedHistoryReview.review_month}
            readOnly={true}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <button onClick={onBack} className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900">
        <ChevronLeft className="w-5 h-5" />
        Back to Team
      </button>

      <EmployeeHeader employeeInfo={employeeInfo} careerMapInfo={careerMapInfo} los={getLengthOfService()} />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <button
          onClick={() => setMode('weekly')}
          className="group flex flex-col items-start gap-4 p-6 bg-white border-2 border-gray-200 hover:border-blue-400 rounded-2xl text-left transition-all hover:shadow-md"
        >
          <div className="flex items-center justify-between w-full">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center group-hover:bg-blue-600 transition-colors">
              <Calendar className="w-6 h-6 text-blue-600 group-hover:text-white transition-colors" />
            </div>
            <ArrowRight className="w-5 h-5 text-gray-300 group-hover:text-blue-500 transition-colors" />
          </div>
          <div>
            <p className="text-lg font-bold text-gray-900">Weekly Check-in</p>
            <p className="text-sm text-gray-500 mt-1 leading-relaxed">
              Update KPI scores and actions for this week. Overall performance auto-calculated from KPI ratings.
            </p>
          </div>
          {weeklyCheckins.length > 0 && (
            <div className="flex items-center gap-1.5 mt-auto">
              <CheckCircle className="w-3.5 h-3.5 text-green-500" />
              <span className="text-xs text-green-700 font-medium">
                {weeklyCheckins.length} check-in{weeklyCheckins.length !== 1 ? 's' : ''} this month
              </span>
            </div>
          )}
        </button>

        <button
          onClick={() => setMode('monthly')}
          className="group flex flex-col items-start gap-4 p-6 bg-white border-2 border-gray-200 hover:border-emerald-400 rounded-2xl text-left transition-all hover:shadow-md"
        >
          <div className="flex items-center justify-between w-full">
            <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center group-hover:bg-emerald-600 transition-colors">
              <TrendingUp className="w-6 h-6 text-emerald-600 group-hover:text-white transition-colors" />
            </div>
            <ArrowRight className="w-5 h-5 text-gray-300 group-hover:text-emerald-500 transition-colors" />
          </div>
          <div>
            <p className="text-lg font-bold text-gray-900">Monthly Review</p>
            <p className="text-sm text-gray-500 mt-1 leading-relaxed">
              5-step flow: KPI performance, competencies, skills, actions, and submit.
            </p>
          </div>
          {monthlyReview ? (
            <div className="flex items-center gap-2 flex-wrap mt-auto">
              <span className={`flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
                monthlyReview.status === 'completed'
                  ? 'bg-green-100 text-green-700'
                  : 'bg-amber-100 text-amber-700'
              }`}>
                {monthlyReview.status === 'completed' ? <CheckCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                {monthlyReview.status === 'completed' ? 'Completed' : 'In progress'}
              </span>
              {monthlyReview.overall_average !== undefined && monthlyReview.overall_average !== null && (
                <span className="text-xs text-gray-500">
                  Overall: <strong>{Number(monthlyReview.overall_average).toFixed(2)}/5</strong>
                </span>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-1.5 mt-auto">
              <Plus className="w-3.5 h-3.5 text-gray-400" />
              <span className="text-xs text-gray-500">Start {format(currentMonth, 'MMMM')} review</span>
            </div>
          )}
        </button>
      </div>

      {weeklyCheckins.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-800">
              Weekly Check-ins — {format(currentMonth, 'MMMM yyyy')}
            </h3>
            <span className="text-xs text-gray-400">{weeklyCheckins.length} entries</span>
          </div>
          <div className="divide-y divide-gray-50">
            {weeklyCheckins.map((wc, i) => (
              <div key={i} className="flex items-center justify-between px-4 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-700">
                    Week {wc.week_number} — {format(new Date(wc.week_starting), 'dd MMM')}
                  </p>
                  {wc.summary && (
                    <p className="text-xs text-gray-500 mt-0.5 truncate">{wc.summary}</p>
                  )}
                </div>
                <div className="flex items-center gap-3 ml-4 flex-shrink-0">
                  <div className="text-right">
                    <p className="text-xs text-gray-400">Score</p>
                    <p className="text-lg font-bold text-blue-700">
                      {wc.performance_score}<span className="text-xs font-normal text-gray-400">/5</span>
                    </p>
                  </div>
                  <span className={`flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
                    wc.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                  }`}>
                    {wc.status === 'completed' ? <CheckCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                    {wc.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {reviewHistory.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="flex items-center gap-2 p-4 border-b border-gray-100">
            <History className="w-4 h-4 text-gray-500" />
            <h3 className="text-sm font-semibold text-gray-800">Previous Reviews</h3>
            <span className="text-xs text-gray-400 ml-auto">{reviewHistory.length} review{reviewHistory.length !== 1 ? 's' : ''}</span>
          </div>
          <div className="divide-y divide-gray-50">
            {reviewHistory.map((r) => (
              <button
                key={r.id}
                onClick={() => { setSelectedHistoryReview(r); setMode('history'); }}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors text-left"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800">
                    {format(new Date(r.review_month + 'T12:00:00'), 'MMMM yyyy')}
                  </p>
                  {r.overall_average !== undefined && r.overall_average !== null && (
                    <p className="text-xs text-gray-500 mt-0.5">
                      Overall: {Number(r.overall_average).toFixed(2)}/5
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-3 flex-shrink-0 ml-4">
                  <span className={`flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
                    r.status === 'completed'
                      ? 'bg-green-100 text-green-700'
                      : r.status === 'draft'
                      ? 'bg-gray-100 text-gray-600'
                      : 'bg-amber-100 text-amber-700'
                  }`}>
                    {r.status === 'completed' ? <CheckCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                    {r.status === 'completed' ? 'Completed' : r.status === 'draft' ? 'Draft' : r.status}
                  </span>
                  <ArrowRight className="w-4 h-4 text-gray-300" />
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function EmployeeHeader({ employeeInfo, careerMapInfo, los }: {
  employeeInfo: EmployeeInfo | null;
  careerMapInfo: any;
  los: string;
}) {
  return (
    <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-5 text-white">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold truncate">{employeeInfo?.full_name}</h1>
          <p className="text-blue-100 mt-0.5">{employeeInfo?.job_title}</p>
          <p className="text-blue-200 text-sm">{employeeInfo?.department}</p>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-xs text-blue-200">Service</p>
          <p className="text-lg font-semibold">{los}</p>
        </div>
      </div>
      {careerMapInfo && (
        <div className="mt-4 pt-4 border-t border-blue-500 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="text-xs text-blue-200">Pathway</p>
            <p className="font-semibold">{careerMapInfo.career_pathways?.pathway_name}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-blue-200">Current</p>
            <p className="font-semibold">{careerMapInfo.current_position}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-blue-200">Progress</p>
            <div className="flex items-center gap-2 justify-end">
              <div className="w-20 h-1.5 bg-blue-500 rounded-full overflow-hidden">
                <div className="h-full bg-white rounded-full" style={{ width: `${careerMapInfo.progress_percentage}%` }} />
              </div>
              <span className="font-semibold">{careerMapInfo.progress_percentage}%</span>
            </div>
          </div>
        </div>
      )}
      {!careerMapInfo && employeeInfo?.job_family_title && (
        <div className="mt-4 pt-4 border-t border-blue-500 flex items-center justify-between">
          <div>
            <p className="text-xs text-blue-200">Job Family</p>
            <p className="font-semibold">{employeeInfo.job_family_title}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-blue-200">Level</p>
            <p className="font-semibold">{employeeInfo.job_family_level}</p>
          </div>
        </div>
      )}
    </div>
  );
}
