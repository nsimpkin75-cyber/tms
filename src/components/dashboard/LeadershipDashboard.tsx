import { useEffect, useState, useMemo, useRef } from 'react';
import { Building2, TrendingUp, Users, Target, FileText, CheckCircle2, Award, Calendar, Star, AlertCircle, ChevronDown, ChevronUp, ShieldCheck, Filter, X, MessageSquare, Send, Briefcase, PenLine } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import PayReviewDashboard from '../leadership/PayReviewDashboard';
import ModerationReviewPanel from '../moderation/ModerationReviewPanel';
import DeptLeadModerationPanel from '../moderation/DeptLeadModerationPanel';
import ExecModerationPanel from '../moderation/ExecModerationPanel';
import { CareerPlanWorkflow } from '../career/CareerPlanWorkflow';
import { computeReviewStatus } from '../../lib/reviewStatus';
import SmDashboardMatrix from '../skills-matrix/SmDashboardMatrix';

interface TalentGridItem {
  id: string;
  full_name: string;
  job_title: string;
  department: string;
  manager_id: string;
  manager_name: string;
  performance: number;
  potential: number;
  review_month: string;
}

interface NineBoxFilters {
  dateFrom: string;
  dateTo: string;
  department: string;
  managerId: string;
}

interface EmployeeRiskData {
  id: string;
  full_name: string;
  job_title: string;
  department: string;
  performance: number;
  potential: number;
  risk_level: 'high' | 'medium' | 'low';
}

interface PayReviewForecastItem {
  id: string;
  employee_name: string;
  job_title: string;
  department: string;
  avg_performance: number;
  avg_competency: number;
}

// Department-level employee summary for dept lead view
interface DeptEmployee {
  id: string;
  full_name: string;
  job_title: string;
  manager_id: string | null;
  manager_name: string;
  oneToOneStatus: string | null;
  careerPlanStatus: string | null;
  avgSkillProficiency: number | null;
  competencyAvg: number | null;
  moderationFlag: boolean;
}

interface DeptLeadFilters {
  managerId: string;
  oneToOneStatus: string;
  careerPlanStatus: string;
  moderationStatus: string;
  skillThreshold: string; // 'all' | 'gap' | 'strong'
}

interface OtoStatusItem {
  employee_id: string;
  employee_name: string;
  job_title: string;
  department: string;
  manager_name: string;
  scheduled_datetime: string | null;
  completion_status: string;
}

interface LeadershipDashboardProps {
  onNavigate?: (path: string) => void;
}

// Roles whose profile.role column permits org-level data access.
const ORG_LEVEL_ROLES = new Set(['admin', 'leadership', 'senior']);

export function LeadershipDashboard({ onNavigate }: LeadershipDashboardProps = {}) {
  const { profile: realProfile, effectiveProfile: profile, resolvedDashboardRole, viewedUserRole, isViewingAs } = useAuth();
  // Render the viewed user's dashboard variant (dept lead or org-level).
  // When isViewingAs, use the viewed user's role to pick the dashboard branch —
  // the admin sees that user's full dashboard in read-only mode.
  const activeRole = isViewingAs ? viewedUserRole : resolvedDashboardRole;
  const isDeptLead = activeRole === 'dept_lead';

  // Hard guard: org-level data queries only run when the REAL signed-in user's
  // profile.role is admin/leadership/senior. Access level permissions can grant
  // dashboard_admin in the UI, but cannot substitute for the actual role check
  // that RLS enforces at the database layer.
  const canAccessOrgData = isViewingAs
    ? ORG_LEVEL_ROLES.has(realProfile?.role ?? '')
    : ORG_LEVEL_ROLES.has(realProfile?.role ?? '');

  const [stats, setStats] = useState({
    totalEmployees: 0,
    departments: 0,
    avgPerformance: 0,
    oneToOneCompletion: 0,
    careerPlansActive: 0,
    activeReviewCycles: 0,
  });
  const [talentGridRaw, setTalentGridRaw] = useState<TalentGridItem[]>([]);
  const [atRiskEmployees, setAtRiskEmployees] = useState<EmployeeRiskData[]>([]);
  const [highPotentialEmployees, setHighPotentialEmployees] = useState<EmployeeRiskData[]>([]);
  const [payReviewForecast, setPayReviewForecast] = useState<PayReviewForecastItem[]>([]);
  const [moderationQueue, setModerationQueue] = useState<any[]>([]);
  const [recCounts, setRecCounts] = useState({ pending: 0, approved: 0, dismissed: 0, mostRecentRole: '' });
  const [loading, setLoading] = useState(true);
  const [selectedView, setSelectedView] = useState<'overview' | 'grid'>('overview');
  const [showPayReview, setShowPayReview] = useState(false);
  const [showModerationPanel, setShowModerationPanel] = useState(false);
  const [moderationPanelMode, setModerationPanelMode] = useState<'dept' | 'exec'>('exec');
  const [expandedNineBox, setExpandedNineBox] = useState(false);

  // Org-wide 9-box filters
  const [nineBoxFilters, setNineBoxFilters] = useState<NineBoxFilters>({
    dateFrom: '',
    dateTo: '',
    department: '',
    managerId: '',
  });
  const [showNineBoxFilters, setShowNineBoxFilters] = useState(false);
  const [allDepartments, setAllDepartments] = useState<string[]>([]);
  const [allManagers, setAllManagers] = useState<{ id: string; name: string }[]>([]);

  // Dept lead specific state
  const [deptEmployees, setDeptEmployees] = useState<DeptEmployee[]>([]);
  const [deptManagers, setDeptManagers] = useState<{ id: string; name: string }[]>([]);
  const [deptLeadFilters, setDeptLeadFilters] = useState<DeptLeadFilters>({
    managerId: '',
    oneToOneStatus: '',
    careerPlanStatus: '',
    moderationStatus: '',
    skillThreshold: 'all',
  });
  const [showDeptFilters, setShowDeptFilters] = useState(false);
  const [deptTalentGridRaw, setDeptTalentGridRaw] = useState<TalentGridItem[]>([]);
  const [deptNineBoxManagerId, setDeptNineBoxManagerId] = useState('');
  const [expandedDeptNineBox, setExpandedDeptNineBox] = useState(false);

  // 1:1 status drill-down
  const [otoItems, setOtoItems] = useState<OtoStatusItem[]>([]);
  const [otoDrawer, setOtoDrawer] = useState<'in_progress'|'missed'|'overdue'|'completed'|'due_soon'|null>(null);

  // Dept lead collapsible sections
  const [showEmployeeList, setShowEmployeeList] = useState(false);
  const [showFullMatrix, setShowFullMatrix] = useState(false);

  // Org-level collapsible sections
  const [showOrgEmployeeList, setShowOrgEmployeeList] = useState(false);
  const [showOrgFullMatrix, setShowOrgFullMatrix] = useState(false);
  const [orgEmployees, setOrgEmployees] = useState<Array<{
    id: string; full_name: string; department: string; job_title: string;
    manager_name: string; role: string;
  }>>([]);
  const [orgEmpFilterDept, setOrgEmpFilterDept] = useState('');
  const [orgEmpFilterManager, setOrgEmpFilterManager] = useState('');
  const [orgEmpFilterRole, setOrgEmpFilterRole] = useState('');
  const [orgEmpSearch, setOrgEmpSearch] = useState('');
  const [showOrgEmpFilters, setShowOrgEmpFilters] = useState(false);

  // Dept lead career plans (plans targeting this dept's roles)
  const [deptTargetedCareerPlans, setDeptTargetedCareerPlans] = useState<Array<{
    id: string;
    status: string;
    goal_role_title: string | null;
    target_department: string | null;
    confirmed_at: string | null;
    employee: { full_name: string; job_title: string | null } | null;
  }>>([]);
  const [selectedDeptPlanId, setSelectedDeptPlanId] = useState<string | null>(null);

  // Lightweight Opal widget
  const [seraQuery, setSeraQuery] = useState('');
  const [seraResponse, setSeraResponse] = useState('');
  const seraInputRef = useRef<HTMLInputElement>(null);

  const talentGrid = useMemo(() => {
    return talentGridRaw.filter(emp => {
      if (nineBoxFilters.dateFrom && emp.review_month < nineBoxFilters.dateFrom) return false;
      if (nineBoxFilters.dateTo && emp.review_month > nineBoxFilters.dateTo) return false;
      if (nineBoxFilters.department && emp.department !== nineBoxFilters.department) return false;
      if (nineBoxFilters.managerId && emp.manager_id !== nineBoxFilters.managerId) return false;
      return true;
    });
  }, [talentGridRaw, nineBoxFilters]);

  const filteredDeptEmployees = useMemo(() => {
    return deptEmployees.filter(emp => {
      if (deptLeadFilters.managerId && emp.manager_id !== deptLeadFilters.managerId) return false;
      if (deptLeadFilters.oneToOneStatus) {
        if (deptLeadFilters.oneToOneStatus === 'none' && emp.oneToOneStatus !== null) return false;
        if (deptLeadFilters.oneToOneStatus !== 'none' && emp.oneToOneStatus !== deptLeadFilters.oneToOneStatus) return false;
      }
      if (deptLeadFilters.careerPlanStatus) {
        if (deptLeadFilters.careerPlanStatus === 'none' && emp.careerPlanStatus !== null) return false;
        if (deptLeadFilters.careerPlanStatus !== 'none' && emp.careerPlanStatus !== deptLeadFilters.careerPlanStatus) return false;
      }
      if (deptLeadFilters.moderationStatus === 'flagged' && !emp.moderationFlag) return false;
      if (deptLeadFilters.moderationStatus === 'clear' && emp.moderationFlag) return false;
      if (deptLeadFilters.skillThreshold === 'gap' && (emp.avgSkillProficiency === null || emp.avgSkillProficiency >= 3)) return false;
      if (deptLeadFilters.skillThreshold === 'strong' && (emp.avgSkillProficiency === null || emp.avgSkillProficiency < 4)) return false;
      return true;
    });
  }, [deptEmployees, deptLeadFilters]);

  const deptTalentGrid = useMemo(() => {
    if (!deptNineBoxManagerId) return deptTalentGridRaw;
    return deptTalentGridRaw.filter(e => e.manager_id === deptNineBoxManagerId);
  }, [deptTalentGridRaw, deptNineBoxManagerId]);

  const hasActiveNineBoxFilters = nineBoxFilters.dateFrom || nineBoxFilters.dateTo || nineBoxFilters.department || nineBoxFilters.managerId;
  const hasActiveDeptFilters = deptLeadFilters.managerId || deptLeadFilters.oneToOneStatus || deptLeadFilters.careerPlanStatus || deptLeadFilters.moderationStatus || deptLeadFilters.skillThreshold !== 'all';

  useEffect(() => {
    setLoading(true);
    if (isDeptLead) {
      loadDeptLeadData();
    } else {
      loadOrgData();
    }
  }, [isDeptLead, profile?.id]);

  async function loadDeptLeadData() {
    if (!profile?.id) {
      setLoading(false);
      return;
    }

    try {
      // Load direct reports to find which managers report to this dept lead
      const { data: directReports } = await supabase
        .from('profiles')
        .select('id, department')
        .eq('manager_id', profile.id)
        .eq('active', true);

      // Collect departments this dept lead owns (their own + all their direct reports' depts)
      const ownedDepts = new Set<string>();
      if (profile.department) ownedDepts.add(profile.department);
      (directReports || []).forEach(r => { if (r.department) ownedDepts.add(r.department); });

      // All active employees across all owned departments
      const { data: deptProfiles } = await supabase
        .from('profiles')
        .select('*')
        .in('department', [...ownedDepts])
        .eq('active', true);

      const profiles = deptProfiles || [];
      const profileIds = profiles.map(p => p.id);

      // Extract managers within the department
      const managerIdSet = new Set(profiles.map(p => p.manager_id).filter(Boolean));
      const managers = profiles.filter(p => managerIdSet.has(p.id));
      setDeptManagers(managers.map(m => ({ id: m.id, name: m.full_name })).sort((a, b) => a.name.localeCompare(b.name)));

      if (profileIds.length === 0) {
        setStats(s => ({ ...s, totalEmployees: 0 }));
        setLoading(false);
        return;
      }

      // Fetch all data in parallel
      const [meetingsRes, careerPlansRes, reviewsRes, moderationRes, nineBoxRes] = await Promise.all([
        supabase
          .from('one_to_one_scheduled_meetings')
          .select('id, employee_id, completion_status, scheduled_datetime, original_scheduled_datetime, manager_id')
          .in('employee_id', profileIds),
        supabase
          .from('career_plans')
          .select('profile_id, status')
          .in('profile_id', profileIds),
        supabase
          .from('one_to_one_monthly_reviews')
          .select('employee_id, overall_competency_score, overall_kpi_average, overall_average, status')
          .in('employee_id', profileIds)
          .eq('status', 'completed')
          .not('overall_competency_score', 'is', null)
          .gt('overall_competency_score', 0),
        supabase
          .from('moderation_cases')
          .select('id, employee_id, manager_id, status, current_step, original_rating, current_rating, final_rating, source_type, ai_summary, ai_validation_status, created_at')
          .in('employee_id', profileIds)
          .in('status', ['pending', 'in_review']),
        supabase
          .from('one_to_one_monthly_reviews')
          .select(`
            employee_id, manager_id, review_month,
            overall_kpi_average, overall_competency_score, status,
            employee:profiles!one_to_one_monthly_reviews_employee_id_fkey(full_name, job_title, department, manager_id),
            manager:profiles!one_to_one_monthly_reviews_manager_id_fkey(full_name)
          `)
          .in('employee_id', profileIds)
          .eq('status', 'completed')
          .not('overall_kpi_average', 'is', null)
          .not('overall_competency_score', 'is', null)
          .gt('overall_kpi_average', 0)
          .gt('overall_competency_score', 0)
          .order('review_month', { ascending: false }),
      ]);

      const meetings = meetingsRes.data || [];
      const careerPlans = careerPlansRes.data || [];
      const reviews = reviewsRes.data || [];
      const flaggedReviews = moderationRes.data || [];

      // Employees with open moderation cases are excluded from 9-box until finalised
      const deptOpenModIds = new Set(flaggedReviews.map((r: any) => r.employee_id));

      // Build dept 9-box grid (most recent completed review per employee, excluding open moderation)
      const latestNineBoxByEmployee = new Map<string, any>();
      (nineBoxRes.data || []).forEach(row => {
        if (!latestNineBoxByEmployee.has(row.employee_id)) {
          latestNineBoxByEmployee.set(row.employee_id, row);
        }
      });
      const deptTalent: TalentGridItem[] = Array.from(latestNineBoxByEmployee.values())
        .filter(row => !deptOpenModIds.has(row.employee_id))
        .map(row => {
          const emp = Array.isArray(row.employee) ? row.employee[0] : row.employee;
          const mgr = Array.isArray(row.manager) ? row.manager[0] : row.manager;
          return {
            id: row.employee_id,
            full_name: emp?.full_name || 'Unknown',
            job_title: emp?.job_title || '',
            department: emp?.department || '',
            manager_id: row.manager_id || '',
            manager_name: mgr?.full_name || '',
            performance: Number(row.overall_kpi_average),
            potential: Number(row.overall_competency_score),
            review_month: row.review_month || '',
          };
        });
      setDeptTalentGridRaw(deptTalent);

      // Build per-employee lookup maps
      const latestMeetingByEmployee = new Map<string, string | null>();
      meetings.forEach(m => {
        if (!latestMeetingByEmployee.has(m.employee_id)) {
          latestMeetingByEmployee.set(m.employee_id, m.completion_status);
        }
      });

      const careerPlanByEmployee = new Map<string, string>();
      careerPlans.forEach(cp => {
        careerPlanByEmployee.set(cp.profile_id, cp.status);
      });

      // Latest competency avg per employee
      const competencyByEmployee = new Map<string, number>();
      reviews.forEach(r => {
        if (!competencyByEmployee.has(r.employee_id)) {
          competencyByEmployee.set(r.employee_id, Number(r.overall_competency_score));
        }
      });

      // Employees with open moderation cases
      const flaggedEmployeeIds = new Set(flaggedReviews.map((r: any) => r.employee_id));

      // Build per-employee manager name map
      const managerNameMap = new Map<string, string>();
      profiles.forEach(p => {
        const mgr = profiles.find(m => m.id === p.manager_id);
        if (mgr) managerNameMap.set(p.id, mgr.full_name);
      });

      const deptEmpList: DeptEmployee[] = profiles.map(p => ({
        id: p.id,
        full_name: p.full_name,
        job_title: p.job_title || '',
        manager_id: p.manager_id || null,
        manager_name: managerNameMap.get(p.id) || '',
        oneToOneStatus: latestMeetingByEmployee.get(p.id) ?? null,
        careerPlanStatus: careerPlanByEmployee.get(p.id) || null,
        avgSkillProficiency: null,
        competencyAvg: competencyByEmployee.get(p.id) ?? null,
        moderationFlag: flaggedEmployeeIds.has(p.id),
      }));

      setDeptEmployees(deptEmpList);

      // Build 1:1 status items for drill-down — batch-resolve has_input
      const meetingIds = meetings.map((m: any) => m.id);
      let withInputIds = new Set<string>();
      if (meetingIds.length > 0) {
        const [ciRes, mrRes] = await Promise.all([
          supabase.from('one_to_one_weekly_checkins').select('meeting_id').in('meeting_id', meetingIds),
          supabase.from('one_to_one_monthly_reviews').select('meeting_id').in('meeting_id', meetingIds),
        ]);
        withInputIds = new Set([
          ...((ciRes.data || []).map((r: any) => r.meeting_id)),
          ...((mrRes.data || []).map((r: any) => r.meeting_id)),
        ]);
      }
      const profileMap = new Map(profiles.map(p => [p.id, p]));
      const otoStatusItems: OtoStatusItem[] = meetings.map((m: any) => {
        const emp = profileMap.get(m.employee_id);
        const mgr = emp?.manager_id ? profileMap.get(emp.manager_id) : null;
        const computed = computeReviewStatus({
          scheduled_datetime: m.scheduled_datetime,
          original_scheduled_datetime: m.original_scheduled_datetime,
          completion_status: m.completion_status,
          has_input: withInputIds.has(m.id),
        });
        return {
          employee_id: m.employee_id,
          employee_name: emp?.full_name || 'Unknown',
          job_title: emp?.job_title || '',
          department: emp?.department || '',
          manager_name: mgr?.full_name || '',
          scheduled_datetime: m.scheduled_datetime,
          completion_status: reviewStatusToDrawerKey(computed),
        };
      });
      setOtoItems(otoStatusItems);

      // Stats for dept lead
      const completedMeetings = meetings.filter(m => m.completion_status === 'completed').length;
      const oneToOneCompletion = meetings.length > 0 ? Math.round((completedMeetings / meetings.length) * 100) : 0;
      const activeCareerPlans = careerPlans.filter(cp => ['draft', 'sent_to_manager', 'manager_approved', 'in_progress'].includes(cp.status)).length;

      // Avg performance and competency from completed reviews
      const deptCompletedReviews = reviews.filter((r: any) => r.overall_average && Number(r.overall_average) > 0);
      const deptAvgPerformance = deptCompletedReviews.length > 0
        ? deptCompletedReviews.reduce((s: number, r: any) => s + Number(r.overall_average), 0) / deptCompletedReviews.length
        : 0;

      // At-risk and high-potential from dept talent grid (same logic as org)
      const deptAtRisk = deptTalent
        .filter(emp => emp.performance < 3 || (emp.performance < 3.5 && emp.potential < 3))
        .map(emp => ({
          ...emp,
          risk_level: (emp.performance < 2.5 ? 'high' : emp.performance < 3 ? 'medium' : 'low') as 'high' | 'medium' | 'low',
        }))
        .sort((a, b) => a.performance - b.performance)
        .slice(0, 5);
      const deptHighPotential = deptTalent
        .filter(emp => emp.potential >= 4 && emp.performance >= 3.5)
        .map(emp => ({ ...emp, risk_level: 'low' as const }))
        .sort((a, b) => b.potential - a.potential)
        .slice(0, 5);
      setAtRiskEmployees(deptAtRisk);
      setHighPotentialEmployees(deptHighPotential);

      // Moderation queue for dept (with employee/manager details)
      const deptModQueue = (flaggedReviews as any[]).map(r => {
        const emp = profileMap.get(r.employee_id);
        const mgr = r.manager_id ? profileMap.get(r.manager_id) : null;
        return {
          id: r.id || '',
          employee_name: emp?.full_name || 'Unknown',
          job_title: emp?.job_title || '',
          department: emp?.department || '',
          manager_name: mgr?.full_name || '',
          original_rating: r.original_rating ?? null,
          current_rating: r.current_rating ?? null,
          final_rating: r.final_rating ?? null,
          source_type: r.source_type || '',
          current_step: r.current_step,
          status: r.status,
          ai_summary: r.ai_summary || null,
          ai_validation_status: r.ai_validation_status || null,
          review_date: r.created_at || null,
        };
      });
      setModerationQueue(deptModQueue);

      // Career plans targeting this dept lead's department (by target_department)
      if (profile.department) {
        const { data: targetedPlans } = await supabase
          .from('career_plans')
          .select(`
            id, status, goal_role_title, target_department, confirmed_at,
            employee:profiles!career_plans_user_id_fkey(full_name, job_title)
          `)
          .eq('target_department', profile.department)
          .in('status', ['confirmed', 'sent_to_manager', 'manager_approved'])
          .order('confirmed_at', { ascending: false });
        setDeptTargetedCareerPlans((targetedPlans || []).map((p: any) => ({
          ...p,
          employee: Array.isArray(p.employee) ? p.employee[0] : p.employee,
        })));
      }

      setStats({
        totalEmployees: profiles.length,
        departments: 1,
        avgPerformance: deptAvgPerformance,
        oneToOneCompletion,
        careerPlansActive: activeCareerPlans,
        activeReviewCycles: 0,
      });

    } catch (error) {
      console.error('Error loading dept lead data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadOrgData() {
    // Only users whose real profile.role grants org-level RLS access may run these queries.
    if (!canAccessOrgData) {
      setLoading(false);
      return;
    }
    try {
      const { data: allProfiles } = await supabase
        .from('profiles')
        .select('*')
        .eq('active', true);

      const profileIds = (allProfiles || []).map(p => p.id);
      const uniqueDepts = new Set((allProfiles || []).map(d => d.department).filter(Boolean));

      setAllDepartments([...uniqueDepts].sort() as string[]);
      const managerIds = new Set((allProfiles || []).map(p => p.manager_id).filter(Boolean));
      const managers = (allProfiles || []).filter(p => managerIds.has(p.id));
      setAllManagers(managers.map(m => ({ id: m.id, name: m.full_name })).sort((a, b) => a.name.localeCompare(b.name)));

      // Store org employees for collapsible list
      const mgrNameMap: Record<string, string> = {};
      managers.forEach(m => { mgrNameMap[m.id] = m.full_name; });
      setOrgEmployees(
        (allProfiles || []).map(p => ({
          id: p.id,
          full_name: p.full_name,
          department: p.department || '',
          job_title: p.job_title || '',
          manager_name: p.manager_id ? (mgrNameMap[p.manager_id] || '') : '',
          role: p.role || '',
        })).sort((a, b) => a.full_name.localeCompare(b.full_name))
      );

      const { count: careerPlansCount } = await supabase
        .from('career_plans')
        .select('*', { count: 'exact', head: true })
        .in('status', ['draft', 'sent_to_manager', 'manager_approved', 'in_progress']);

      const { data: performanceData } = await supabase
        .from('one_to_one_monthly_reviews')
        .select('employee_id, overall_kpi_average, overall_competency_score, overall_average')
        .eq('status', 'completed')
        .not('overall_average', 'is', null)
        .gt('overall_average', 0);

      const avgPerformance = performanceData && performanceData.length > 0
        ? performanceData.reduce((sum, r) => sum + Number(r.overall_average), 0) / performanceData.length
        : 0;

      const { data: oneToOneData } = await supabase
        .from('one_to_one_scheduled_meetings')
        .select('id, employee_id, manager_id, completion_status, scheduled_datetime, original_scheduled_datetime');

      const totalOneToOnes = oneToOneData?.length || 0;
      const completedOneToOnes = oneToOneData?.filter(r => r.completion_status === 'completed').length || 0;
      const oneToOneCompletion = totalOneToOnes > 0
        ? Math.round((completedOneToOnes / totalOneToOnes) * 100)
        : 0;

      // Build 1:1 status items for org-wide drill-down — batch-resolve has_input
      const orgMeetingIds = (oneToOneData || []).map((m: any) => m.id);
      let orgWithInputIds = new Set<string>();
      if (orgMeetingIds.length > 0) {
        const [ciRes2, mrRes2] = await Promise.all([
          supabase.from('one_to_one_weekly_checkins').select('meeting_id').in('meeting_id', orgMeetingIds),
          supabase.from('one_to_one_monthly_reviews').select('meeting_id').in('meeting_id', orgMeetingIds),
        ]);
        orgWithInputIds = new Set([
          ...((ciRes2.data || []).map((r: any) => r.meeting_id)),
          ...((mrRes2.data || []).map((r: any) => r.meeting_id)),
        ]);
      }
      const profileLookup = new Map((allProfiles || []).map(p => [p.id, p]));
      const orgOtoItems: OtoStatusItem[] = (oneToOneData || []).map((m: any) => {
        const emp = profileLookup.get(m.employee_id);
        const mgr = m.manager_id ? profileLookup.get(m.manager_id) : null;
        const computed = computeReviewStatus({
          scheduled_datetime: m.scheduled_datetime,
          original_scheduled_datetime: m.original_scheduled_datetime,
          completion_status: m.completion_status,
          has_input: orgWithInputIds.has(m.id),
        });
        return {
          employee_id: m.employee_id,
          employee_name: emp?.full_name || 'Unknown',
          job_title: emp?.job_title || '',
          department: emp?.department || '',
          manager_name: mgr?.full_name || '',
          scheduled_datetime: m.scheduled_datetime,
          completion_status: reviewStatusToDrawerKey(computed),
        };
      });
      setOtoItems(orgOtoItems);

      const { count: reviewCyclesCount } = await supabase
        .from('review_cycles')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active');

      const [nineBoxRes, openModCasesRes] = await Promise.all([
        supabase
          .from('one_to_one_monthly_reviews')
          .select(`
            id, employee_id, manager_id, review_month,
            overall_kpi_average, overall_competency_score, status,
            employee:profiles!one_to_one_monthly_reviews_employee_id_fkey(full_name, job_title, department, manager_id),
            manager:profiles!one_to_one_monthly_reviews_manager_id_fkey(full_name)
          `)
          .eq('status', 'completed')
          .not('overall_kpi_average', 'is', null)
          .not('overall_competency_score', 'is', null)
          .gt('overall_kpi_average', 0)
          .gt('overall_competency_score', 0)
          .order('review_month', { ascending: false }),
        supabase
          .from('moderation_cases')
          .select('employee_id')
          .not('status', 'in', '("approved","rejected","adjusted")'),
      ]);

      // Employees with open moderation cases are excluded from 9-box until finalised
      const openModerationEmployeeIds = new Set((openModCasesRes.data || []).map((r: any) => r.employee_id));

      const latestByEmployee = new Map<string, any>();
      (nineBoxRes.data || []).forEach(row => {
        if (!latestByEmployee.has(row.employee_id)) {
          latestByEmployee.set(row.employee_id, row);
        }
      });

      const talentWithRatings: TalentGridItem[] = Array.from(latestByEmployee.values())
        .filter(row => !openModerationEmployeeIds.has(row.employee_id))
        .map(row => {
          const emp = Array.isArray(row.employee) ? row.employee[0] : row.employee;
          const mgr = Array.isArray(row.manager) ? row.manager[0] : row.manager;
          return {
            id: row.employee_id,
            full_name: emp?.full_name || 'Unknown',
            job_title: emp?.job_title || '',
            department: emp?.department || '',
            manager_id: row.manager_id || '',
            manager_name: mgr?.full_name || '',
            performance: Number(row.overall_kpi_average),
            potential: Number(row.overall_competency_score),
            review_month: row.review_month || '',
          };
        });

      const atRisk = talentWithRatings
        .filter(emp => emp.performance < 3 || (emp.performance < 3.5 && emp.potential < 3))
        .map(emp => ({
          ...emp,
          risk_level: (emp.performance < 2.5 ? 'high' : emp.performance < 3 ? 'medium' : 'low') as 'high' | 'medium' | 'low',
        }))
        .sort((a, b) => a.performance - b.performance)
        .slice(0, 5);

      const highPotential = talentWithRatings
        .filter(emp => emp.potential >= 4 && emp.performance >= 3.5)
        .map(emp => ({ ...emp, risk_level: 'low' as const }))
        .sort((a, b) => b.potential - a.potential)
        .slice(0, 5);

      const { data: highPerformersData } = await supabase
        .from('review_six_month_performance')
        .select(`id, employee_id, avg_performance_rating, average_competency_score, employee:profiles!review_six_month_performance_employee_id_fkey(full_name, job_title, department)`)
        .or('avg_performance_rating.gte.4,average_competency_score.gte.4')
        .eq('status', 'submitted')
        .order('avg_performance_rating', { ascending: false })
        .limit(10);

      const payForecast: PayReviewForecastItem[] = (highPerformersData || []).map((r: any) => ({
        id: r.id,
        employee_name: r.employee?.full_name || 'Unknown',
        job_title: r.employee?.job_title || 'N/A',
        department: r.employee?.department || 'N/A',
        avg_performance: r.avg_performance_rating,
        avg_competency: r.average_competency_score,
      }));

      const { data: modData } = await supabase
        .from('moderation_cases')
        .select(`
          id, source_type, original_rating, current_rating, final_rating,
          current_step, status, created_at,
          ai_validation_status, ai_summary,
          employee:profiles!moderation_cases_employee_id_fkey(full_name, job_title, department),
          manager:profiles!moderation_cases_manager_id_fkey(full_name)
        `)
        .not('status', 'in', '("approved","rejected")')
        .order('created_at', { ascending: false })
        .limit(20);

      setModerationQueue((modData || []).map((r: any) => {
        const emp = Array.isArray(r.employee) ? r.employee[0] : r.employee;
        const mgr = Array.isArray(r.manager) ? r.manager[0] : r.manager;
        return {
          id: r.id,
          employee_name: emp?.full_name || 'Unknown',
          job_title: emp?.job_title || '',
          department: emp?.department || '',
          manager_name: mgr?.full_name || '',
          original_rating: r.original_rating,
          current_rating: r.current_rating,
          final_rating: r.final_rating,
          source_type: r.source_type,
          current_step: r.current_step,
          status: r.status,
          ai_summary: r.ai_summary,
          ai_validation_status: r.ai_validation_status,
          review_date: r.created_at,
        };
      }));

      // Recommendations tile counts
      try {
        const { data: recData } = await supabase
          .from('role_profile_recommendations')
          .select('status, field_label, job_family_id, created_at, job_families(title)')
          .order('created_at', { ascending: false });
        if (recData) {
          const pending = recData.filter(r => r.status === 'pending').length;
          const approved = recData.filter(r => r.status === 'approved').length;
          const dismissed = recData.filter(r => r.status === 'dismissed').length;
          const mostRecent = recData[0];
          const mostRecentRole = mostRecent
            ? ((mostRecent as any).job_families?.title || '')
            : '';
          setRecCounts({ pending, approved, dismissed, mostRecentRole });
        }
      } catch {
        // non-critical
      }

      setStats({
        totalEmployees: allProfiles?.length || 0,
        departments: uniqueDepts.size,
        avgPerformance,
        oneToOneCompletion,
        careerPlansActive: careerPlansCount || 0,
        activeReviewCycles: reviewCyclesCount || 0,
      });
      setTalentGridRaw(talentWithRatings);
      setAtRiskEmployees(atRisk);
      setHighPotentialEmployees(highPotential);
      setPayReviewForecast(payForecast);

    } catch (error) {
      console.error('Error loading org data:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-slate-600">Loading dashboard...</p>
      </div>
    );
  }

  if (showPayReview) {
    return (
      <div>
        <button onClick={() => setShowPayReview(false)} className="mb-4 text-blue-600 hover:text-blue-800 font-medium">
          ← Back to Dashboard
        </button>
        <PayReviewDashboard />
      </div>
    );
  }

  if (showModerationPanel) {
    return (
      <div>
        <button onClick={() => setShowModerationPanel(false)} className="mb-4 text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1">
          ← Back to Dashboard
        </button>
        {moderationPanelMode === 'dept'
          ? <DeptLeadModerationPanel department={profile?.department ?? undefined} readOnly={isViewingAs} />
          : <ExecModerationPanel readOnly={isViewingAs} />
        }
      </div>
    );
  }

  function answerSeraQuery(q: string): string {
    const ql = q.toLowerCase();
    const now = new Date();
    if (ql.includes('missed') || (ql.includes('1:1') && ql.includes('miss'))) {
      const n = otoItems.filter(i => i.completion_status === 'missed').length;
      return `There are ${n} missed 1:1${n !== 1 ? 's' : ''} across the ${isDeptLead ? 'department' : 'organisation'}.`;
    }
    if (ql.includes('overdue')) {
      const n = otoItems.filter(i => i.completion_status === 'overdue').length;
      return `${n} 1:1${n !== 1 ? 's are' : ' is'} overdue.`;
    }
    if (ql.includes('due soon') || (ql.includes('this week') && ql.includes('1:1'))) {
      const n = otoItems.filter(i => i.completion_status === 'due_soon').length;
      return `${n} 1:1${n !== 1 ? 's are' : ' is'} scheduled in the next 7 days.`;
    }
    if (ql.includes('complet') && ql.includes('1:1')) {
      const n = otoItems.filter(i => i.completion_status === 'completed').length;
      return `${n} 1:1${n !== 1 ? 's have' : ' has'} been completed.`;
    }
    if (ql.includes('1:1') || ql.includes('review')) {
      const inProg = otoItems.filter(i => i.completion_status === 'in_progress').length;
      const missed = otoItems.filter(i => i.completion_status === 'missed').length;
      const overdue = otoItems.filter(i => i.completion_status === 'overdue').length;
      return `1:1 summary: ${inProg} in progress, ${overdue} overdue, ${missed} missed.`;
    }
    if (ql.includes('employee') || ql.includes('headcount') || ql.includes('team size')) {
      return `There are ${stats.totalEmployees} active employee${stats.totalEmployees !== 1 ? 's' : ''}.`;
    }
    if (ql.includes('moderation') || ql.includes('flagged')) {
      return `There are ${moderationQueue.length} case${moderationQueue.length !== 1 ? 's' : ''} in the moderation queue.`;
    }
    if (ql.includes('career plan')) {
      return `${stats.careerPlansActive} active career plan${stats.careerPlansActive !== 1 ? 's' : ''} across the ${isDeptLead ? 'department' : 'organisation'}.`;
    }
    if (ql.includes('rating') || ql.includes('performance')) {
      return stats.avgPerformance > 0
        ? `Average performance rating is ${stats.avgPerformance.toFixed(1)}/5.`
        : 'No performance rating data available yet.';
    }
    void now;
    return 'I can answer questions about 1:1 status, headcount, moderation queue, career plans and performance ratings. Try asking about missed 1:1s, overdue reviews, or team size.';
  }

  function getNineBoxPosition(performance: number, potential: number) {
    const perfCategory = performance >= 4 ? 'high' : performance >= 3 ? 'medium' : 'low';
    const potCategory = potential >= 4 ? 'high' : potential >= 3 ? 'medium' : 'low';
    return { perfCategory, potCategory };
  }

  function getNineBoxColor(perfCategory: string, potCategory: string) {
    if (perfCategory === 'high' && potCategory === 'high') return 'bg-green-500';
    if (perfCategory === 'high' || potCategory === 'high') return 'bg-blue-500';
    if (perfCategory === 'medium' && potCategory === 'medium') return 'bg-yellow-500';
    return 'bg-orange-500';
  }

  const nineBoxSummary = [
    { label: 'Stars',          count: talentGrid.filter(e => e.performance >= 4 && e.potential >= 4).length,                                                color: 'bg-green-100 text-green-800 border-green-200' },
    { label: 'High Potential', count: talentGrid.filter(e => e.performance >= 3 && e.performance < 4 && e.potential >= 4).length,                           color: 'bg-teal-100 text-teal-800 border-teal-200' },
    { label: 'Core Team',      count: talentGrid.filter(e => e.performance >= 3 && e.potential >= 3 && e.performance < 4 && e.potential < 4).length,         color: 'bg-blue-100 text-blue-800 border-blue-200' },
    { label: 'Developing',     count: talentGrid.filter(e => e.performance < 3 && e.potential >= 3).length,                                                  color: 'bg-amber-100 text-amber-800 border-amber-200' },
    { label: 'At Risk',        count: talentGrid.filter(e => e.performance < 3 && e.potential < 3).length,                                                   color: 'bg-rose-100 text-rose-800 border-rose-200' },
  ];

  // ─── Department Lead View ────────────────────────────────────────────────────
  if (isDeptLead) {
    const deptName = profile?.department || 'Department';

    const oneToOneStatusLabels: Record<string, string> = {
      completed: 'Completed',
      submitted: 'Submitted',
      in_progress: 'In Progress',
      scheduled: 'Scheduled',
      missed: 'Missed',
      none: 'No 1:1 found',
    };

    const careerPlanStatusLabels: Record<string, string> = {
      draft: 'Draft',
      sent_to_manager: 'Awaiting Review',
      manager_approved: 'Approved',
      in_progress: 'In Progress',
      none: 'No Plan',
    };

    function getOneToOneBadge(status: string | null) {
      if (!status) return 'bg-slate-100 text-slate-500';
      if (status === 'completed') return 'bg-green-100 text-green-800';
      if (status === 'missed') return 'bg-red-100 text-red-800';
      if (status === 'in_progress') return 'bg-blue-100 text-blue-800';
      if (status === 'scheduled') return 'bg-teal-100 text-teal-800';
      return 'bg-slate-100 text-slate-600';
    }

    function getCareerPlanBadge(status: string | null) {
      if (!status) return 'bg-slate-100 text-slate-500';
      if (status === 'manager_approved') return 'bg-green-100 text-green-800';
      if (status === 'sent_to_manager') return 'bg-amber-100 text-amber-800';
      if (status === 'in_progress') return 'bg-blue-100 text-blue-800';
      return 'bg-slate-100 text-slate-600';
    }

    const flaggedCount = deptEmployees.filter(e => e.moderationFlag).length;
    const noCareerPlan = deptEmployees.filter(e => !e.careerPlanStatus).length;
    const missedOneToOnes = otoItems.filter(e => e.completion_status === 'missed').length;

    return (
      <div className="space-y-8">
        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-4 pt-2">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Department Dashboard</h1>
            <p className="text-slate-500 mt-1">{deptName} — talent insights and team management</p>
          </div>
        </div>

        {/* Dept summary stats — same tiles as org view */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          <button
            onClick={() => setShowEmployeeList(v => !v)}
            className="card p-5 flex flex-col gap-3 text-left hover:shadow-md hover:border-blue-200 transition-all border border-transparent"
          >
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Employees</p>
              <div className="p-2 bg-blue-100 rounded-lg"><Users className="w-4 h-4 text-blue-600" /></div>
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{stats.totalEmployees}</p>
              <p className="text-xs text-blue-600 mt-0.5 font-medium">{showEmployeeList ? 'Hide team list' : 'View team list'}</p>
            </div>
          </button>

          <div className="card p-5 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Career Plans</p>
              <div className="p-2 bg-emerald-100 rounded-lg"><FileText className="w-4 h-4 text-emerald-600" /></div>
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{stats.careerPlansActive}</p>
              <p className="text-xs text-slate-500 mt-0.5">In progress</p>
            </div>
          </div>

          <div className="card p-5 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Avg Rating</p>
              <div className="p-2 bg-amber-100 rounded-lg"><Star className="w-4 h-4 text-amber-600" /></div>
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{stats.avgPerformance > 0 ? stats.avgPerformance.toFixed(1) : '—'}</p>
              <p className="text-xs text-slate-500 mt-0.5">Completed 1:1 avg</p>
            </div>
          </div>

          <button onClick={() => setOtoDrawer('completed')} className="card p-5 flex flex-col gap-3 text-left hover:shadow-md hover:border-teal-200 transition-all border border-transparent">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">1:1 Rate</p>
              <div className="p-2 bg-teal-100 rounded-lg"><CheckCircle2 className="w-4 h-4 text-teal-600" /></div>
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{stats.oneToOneCompletion}%</p>
              <p className="text-xs text-teal-600 mt-0.5 font-medium">Click to drill down</p>
            </div>
          </button>

          <div className="card p-5 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Dept</p>
              <div className="p-2 bg-slate-100 rounded-lg"><Building2 className="w-4 h-4 text-slate-600" /></div>
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">1</p>
              <p className="text-xs text-slate-500 mt-0.5 truncate">{deptName}</p>
            </div>
          </div>

          <button
            onClick={() => { setModerationPanelMode('dept'); setShowModerationPanel(true); }}
            className="card p-5 flex flex-col gap-3 text-left hover:shadow-md hover:border-amber-200 transition-all border border-transparent"
          >
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Moderation</p>
              <div className="p-2 bg-amber-100 rounded-lg"><ShieldCheck className="w-4 h-4 text-amber-600" /></div>
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{flaggedCount}</p>
              <p className="text-xs text-amber-600 mt-0.5 font-medium">Click to review queue</p>
            </div>
          </button>
        </div>

        {/* 1:1 status tiles — same as org view */}
        {otoItems.length > 0 && (() => {
          const deptOtoStatuses: { key: 'in_progress'|'missed'|'overdue'|'completed'|'due_soon'; label: string; color: string; dotColor: string }[] = [
            { key: 'in_progress', label: 'In Progress', color: 'bg-blue-50 border-blue-100 hover:border-blue-300',     dotColor: 'bg-blue-500' },
            { key: 'missed',      label: 'Missed',      color: 'bg-red-50 border-red-100 hover:border-red-300',       dotColor: 'bg-red-500' },
            { key: 'overdue',     label: 'Overdue',     color: 'bg-amber-50 border-amber-100 hover:border-amber-300', dotColor: 'bg-amber-500' },
            { key: 'completed',   label: 'Completed',   color: 'bg-green-50 border-green-100 hover:border-green-300', dotColor: 'bg-green-500' },
            { key: 'due_soon',    label: 'Due Soon',    color: 'bg-sky-50 border-sky-100 hover:border-sky-300',       dotColor: 'bg-sky-500' },
          ];
          return (
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
              {deptOtoStatuses.map(s => {
                const count = otoItems.filter(i => i.completion_status === s.key).length;
                return (
                  <button key={s.key} onClick={() => setOtoDrawer(s.key)} className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${s.color}`}>
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className={`w-2 h-2 rounded-full ${s.dotColor}`} />
                      <span className="text-xs font-medium text-slate-600">{s.label}</span>
                    </div>
                    <p className="text-2xl font-bold text-slate-900">{count}</p>
                  </button>
                );
              })}
            </div>
          );
        })()}

        {/* 9-Box Grid for department */}
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-100 rounded-lg">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">Performance Grid</h3>
                <p className="text-xs text-slate-500">
                  {deptTalentGrid.length} employee{deptTalentGrid.length !== 1 ? 's' : ''} with completed reviews
                  {deptNineBoxManagerId ? ' (filtered by team leader)' : ''}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {deptManagers.length > 0 && (
                <select
                  value={deptNineBoxManagerId}
                  onChange={e => setDeptNineBoxManagerId(e.target.value)}
                  className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">All team leaders</option>
                  {deptManagers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              )}
              <button onClick={() => setExpandedDeptNineBox(!expandedDeptNineBox)} className="text-slate-400 hover:text-slate-600">
                {expandedDeptNineBox ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {deptTalentGrid.length === 0 ? (
            <div className="py-6 text-center text-sm text-slate-400">
              No completed reviews with both performance and competency ratings found{deptNineBoxManagerId ? ' for this team leader' : ''}.
            </div>
          ) : (
            <>
              {/* Summary badges */}
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 mb-3">
                {[
                  { label: 'Stars',          count: deptTalentGrid.filter(e => e.performance >= 4 && e.potential >= 4).length,                                                color: 'bg-green-100 text-green-800 border-green-200' },
                  { label: 'High Potential', count: deptTalentGrid.filter(e => e.performance >= 3 && e.performance < 4 && e.potential >= 4).length,                           color: 'bg-teal-100 text-teal-800 border-teal-200' },
                  { label: 'Core Team',      count: deptTalentGrid.filter(e => e.performance >= 3 && e.potential >= 3 && e.performance < 4 && e.potential < 4).length,         color: 'bg-blue-100 text-blue-800 border-blue-200' },
                  { label: 'Developing',     count: deptTalentGrid.filter(e => e.performance < 3 && e.potential >= 3).length,                                                  color: 'bg-amber-100 text-amber-800 border-amber-200' },
                  { label: 'At Risk',        count: deptTalentGrid.filter(e => e.performance < 3 && e.potential < 3).length,                                                   color: 'bg-rose-100 text-rose-800 border-rose-200' },
                ].map((box, idx) => (
                  <div key={idx} className={`p-3 rounded-lg border text-center ${box.color}`}>
                    <p className="text-xs font-medium mb-1">{box.label}</p>
                    <p className="text-xl font-bold">{box.count}</p>
                  </div>
                ))}
              </div>

              {expandedDeptNineBox && (
                <div className="overflow-x-auto mt-2">
                  <div className="min-w-[560px]">
                    <div className="grid grid-cols-4 gap-1 mb-1">
                      <div className="text-xs font-semibold text-slate-500 flex items-end pb-2 pl-1">Performance →</div>
                      <div className="text-center text-xs font-semibold text-slate-500 py-2 bg-slate-100 rounded">Low Competency<br/><span className="font-normal">(1–2.9)</span></div>
                      <div className="text-center text-xs font-semibold text-slate-500 py-2 bg-slate-100 rounded">Mid Competency<br/><span className="font-normal">(3–3.9)</span></div>
                      <div className="text-center text-xs font-semibold text-slate-500 py-2 bg-slate-100 rounded">High Competency<br/><span className="font-normal">(4–5)</span></div>
                    </div>
                    {[
                      { label: 'High Perf (4–5)', perfCat: 'high' as const, perfIdx: 0 },
                      { label: 'Mid Perf (3–3.9)', perfCat: 'medium' as const, perfIdx: 1 },
                      { label: 'Low Perf (1–2.9)', perfCat: 'low' as const, perfIdx: 2 },
                    ].map(({ label, perfCat, perfIdx }) => (
                      <div key={perfIdx} className="grid grid-cols-4 gap-1 mb-1">
                        <div className={`text-xs font-semibold text-slate-500 py-3 px-2 rounded flex items-center justify-center text-center ${perfIdx === 0 ? 'bg-green-50' : perfIdx === 1 ? 'bg-amber-50' : 'bg-rose-50'}`}>
                          {label}
                        </div>
                        {(['low', 'medium', 'high'] as const).map((potCat, potIdx) => {
                          const employees = deptTalentGrid.filter(emp => {
                            const pos = getNineBoxPosition(emp.performance, emp.potential);
                            return pos.perfCategory === perfCat && pos.potCategory === potCat;
                          });
                          const boxLabel = [
                            ['High Perf / Low Comp', 'High Perf / Mid Comp', 'Stars'],
                            ['Solid / Low Comp', 'Core Team', 'High Potential'],
                            ['At Risk', 'Developing', 'Emerging'],
                          ][perfIdx][potIdx];
                          return (
                            <div key={`${perfIdx}-${potIdx}`} className="border border-slate-200 rounded-lg p-2.5 min-h-[80px] bg-white">
                              <div className="flex items-center justify-between mb-1.5">
                                <span className="text-xs font-semibold text-slate-600">{boxLabel}</span>
                                {employees.length > 0 && (
                                  <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full text-white ${getNineBoxColor(perfCat, potCat)}`}>{employees.length}</span>
                                )}
                              </div>
                              <div className="space-y-1">
                                {employees.map(emp => (
                                  <div key={emp.id} className="text-xs p-1.5 bg-slate-50 rounded border border-slate-100">
                                    <div className="font-medium text-slate-900 truncate">{emp.full_name}</div>
                                    <div className="text-slate-400">{emp.manager_name ? `Led by ${emp.manager_name}` : emp.job_title}</div>
                                    <div className="text-slate-400">P:{emp.performance.toFixed(1)} C:{emp.potential.toFixed(1)}</div>
                                  </div>
                                ))}
                                {employees.length === 0 && <div className="text-xs text-slate-300 text-center py-2">—</div>}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Team member list — collapsed by default */}
        {showEmployeeList && (
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-100 rounded-lg">
                  <Users className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">{deptName} Team</h3>
                  <p className="text-xs text-slate-500">
                    {filteredDeptEmployees.length} of {deptEmployees.length} employees
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowDeptFilters(!showDeptFilters)}
                  className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg border transition-colors ${
                    hasActiveDeptFilters
                      ? 'bg-blue-50 border-blue-300 text-blue-700'
                      : 'border-slate-200 text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <Filter className="w-3.5 h-3.5" />
                  Filter{hasActiveDeptFilters ? ' (active)' : ''}
                </button>
                <button
                  onClick={() => setShowEmployeeList(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
                  title="Collapse"
                >
                  <ChevronUp className="w-4 h-4" />
                </button>
              </div>
            </div>

            {showDeptFilters && (
              <div className="mb-4 p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-3">
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Team Leader</label>
                    <select
                      value={deptLeadFilters.managerId}
                      onChange={e => setDeptLeadFilters(f => ({ ...f, managerId: e.target.value }))}
                      className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="">All leaders</option>
                      {deptManagers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">1:1 Status</label>
                    <select
                      value={deptLeadFilters.oneToOneStatus}
                      onChange={e => setDeptLeadFilters(f => ({ ...f, oneToOneStatus: e.target.value }))}
                      className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="">Any status</option>
                      <option value="completed">Completed</option>
                      <option value="scheduled">Scheduled</option>
                      <option value="in_progress">In Progress</option>
                      <option value="missed">Missed</option>
                      <option value="none">No 1:1 found</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Career Plan</label>
                    <select
                      value={deptLeadFilters.careerPlanStatus}
                      onChange={e => setDeptLeadFilters(f => ({ ...f, careerPlanStatus: e.target.value }))}
                      className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="">Any status</option>
                      <option value="in_progress">In Progress</option>
                      <option value="sent_to_manager">Awaiting Review</option>
                      <option value="manager_approved">Approved</option>
                      <option value="draft">Draft</option>
                      <option value="none">No Plan</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Skills</label>
                    <select
                      value={deptLeadFilters.skillThreshold}
                      onChange={e => setDeptLeadFilters(f => ({ ...f, skillThreshold: e.target.value }))}
                      className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="all">All levels</option>
                      <option value="gap">Skill gap (&lt; 3)</option>
                      <option value="strong">Strong (≥ 4)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Moderation</label>
                    <select
                      value={deptLeadFilters.moderationStatus}
                      onChange={e => setDeptLeadFilters(f => ({ ...f, moderationStatus: e.target.value }))}
                      className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="">All</option>
                      <option value="flagged">Flagged only</option>
                      <option value="clear">Clear only</option>
                    </select>
                  </div>
                </div>
                {hasActiveDeptFilters && (
                  <button
                    onClick={() => setDeptLeadFilters({ managerId: '', oneToOneStatus: '', careerPlanStatus: '', moderationStatus: '', skillThreshold: 'all' })}
                    className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700"
                  >
                    <X className="w-3 h-3" /> Clear filters
                  </button>
                )}
              </div>
            )}

            {filteredDeptEmployees.length === 0 ? (
              <div className="py-8 text-center text-sm text-slate-400">
                No employees match the current filters.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="text-left py-2.5 px-3 text-xs font-semibold text-slate-600">Employee</th>
                      <th className="text-left py-2.5 px-3 text-xs font-semibold text-slate-600">Team Leader</th>
                      <th className="text-left py-2.5 px-3 text-xs font-semibold text-slate-600">1:1 Status</th>
                      <th className="text-left py-2.5 px-3 text-xs font-semibold text-slate-600">Career Plan</th>
                      <th className="text-left py-2.5 px-3 text-xs font-semibold text-slate-600">Avg Skills</th>
                      <th className="text-left py-2.5 px-3 text-xs font-semibold text-slate-600">Competency</th>
                      <th className="text-left py-2.5 px-3 text-xs font-semibold text-slate-600">Moderation</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDeptEmployees.map(emp => (
                      <tr key={emp.id} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs font-medium flex-shrink-0">
                              {emp.full_name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-slate-900">{emp.full_name}</p>
                              <p className="text-xs text-slate-500 truncate max-w-[140px]">{emp.job_title}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-sm text-slate-600">{emp.manager_name || '—'}</td>
                        <td className="py-2.5 px-3">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${getOneToOneBadge(emp.oneToOneStatus)}`}>
                            {emp.oneToOneStatus ? (oneToOneStatusLabels[emp.oneToOneStatus] || emp.oneToOneStatus) : 'None'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${getCareerPlanBadge(emp.careerPlanStatus)}`}>
                            {emp.careerPlanStatus ? (careerPlanStatusLabels[emp.careerPlanStatus] || emp.careerPlanStatus) : 'None'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-sm text-slate-700">
                          {emp.avgSkillProficiency !== null ? `${emp.avgSkillProficiency.toFixed(1)}/5` : '—'}
                        </td>
                        <td className="py-2.5 px-3 text-sm text-slate-700">
                          {emp.competencyAvg !== null ? `${emp.competencyAvg.toFixed(1)}` : '—'}
                        </td>
                        <td className="py-2.5 px-3">
                          {emp.moderationFlag ? (
                            <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">Flagged</span>
                          ) : (
                            <span className="text-xs text-slate-400">Clear</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Skills Matrix — summary tile + expandable full matrix */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-teal-100 rounded-lg">
                <Award className="w-5 h-5 text-teal-600" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">Department Skills Matrix</h3>
                <p className="text-xs text-slate-500">{deptName} — locked matrix ratings</p>
              </div>
            </div>
            <button
              onClick={() => setShowFullMatrix(v => !v)}
              className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors ${
                showFullMatrix
                  ? 'bg-teal-50 border-teal-300 text-teal-700 hover:bg-teal-100'
                  : 'border-slate-200 text-slate-600 hover:border-teal-300 hover:text-teal-700'
              }`}
            >
              {showFullMatrix ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              {showFullMatrix ? 'Hide Full Matrix' : 'View Full Matrix'}
            </button>
          </div>
          <SmDashboardMatrix scope="dept" department={deptName} summaryOnly={!showFullMatrix} />
        </div>

        {/* At Risk / High Potential + Moderation Queue — same as org view */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card">
            <div className="flex items-center gap-3 mb-5">
              <div className="p-2.5 bg-orange-100 rounded-lg"><Users className="w-5 h-5 text-orange-600" /></div>
              <div>
                <h3 className="font-semibold text-slate-900">Employees At Risk & High Potential</h3>
                <p className="text-xs text-slate-500">Performance and potential analysis</p>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <p className="text-xs font-semibold text-rose-700 uppercase tracking-wide mb-2">At Risk</p>
                {atRiskEmployees.length === 0 ? (
                  <p className="text-sm text-slate-400">No at-risk employees identified</p>
                ) : (
                  <div className="space-y-1.5">
                    {atRiskEmployees.slice(0, 3).map(emp => (
                      <div key={emp.id} className="flex items-center justify-between p-2.5 bg-rose-50 border border-rose-100 rounded-lg">
                        <div>
                          <p className="text-sm font-medium text-slate-900">{emp.full_name}</p>
                          <p className="text-xs text-slate-500">{emp.job_title}</p>
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${emp.risk_level === 'high' ? 'bg-red-100 text-red-800' : emp.risk_level === 'medium' ? 'bg-orange-100 text-orange-800' : 'bg-yellow-100 text-yellow-800'}`}>
                          {emp.performance.toFixed(1)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <p className="text-xs font-semibold text-green-700 uppercase tracking-wide mb-2">High Potential</p>
                {highPotentialEmployees.length === 0 ? (
                  <p className="text-sm text-slate-400">No high potential employees identified</p>
                ) : (
                  <div className="space-y-1.5">
                    {highPotentialEmployees.slice(0, 3).map(emp => (
                      <div key={emp.id} className="flex items-center justify-between p-2.5 bg-green-50 border border-green-100 rounded-lg">
                        <div>
                          <p className="text-sm font-medium text-slate-900">{emp.full_name}</p>
                          <p className="text-xs text-slate-500">{emp.job_title}</p>
                        </div>
                        <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full">{emp.potential.toFixed(1)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* No career plan alert */}
        {noCareerPlan > 0 && (
          <div className="card bg-amber-50 border border-amber-200">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-amber-100 rounded-lg">
                <FileText className="w-5 h-5 text-amber-700" />
              </div>
              <div>
                <p className="font-semibold text-slate-900">{noCareerPlan} employee{noCareerPlan !== 1 ? 's' : ''} without a career plan</p>
                <p className="text-sm text-amber-700 mt-0.5">Encourage team leaders to initiate career planning conversations.</p>
              </div>
            </div>
          </div>
        )}

        {/* Career Plans targeting this department */}
        {deptTargetedCareerPlans.length > 0 && (
          <div className="card">
            <div className="flex items-center gap-3 mb-5">
              <div className="p-2.5 bg-blue-100 rounded-lg">
                <Briefcase className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">Career Plans Targeting {profile?.department}</h3>
                <p className="text-xs text-slate-500">{deptTargetedCareerPlans.length} confirmed plan{deptTargetedCareerPlans.length !== 1 ? 's' : ''} for roles in your department</p>
              </div>
            </div>
            <div className="space-y-3">
              {deptTargetedCareerPlans.map(plan => (
                <div key={plan.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200 hover:border-blue-200 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-sm font-medium text-slate-900 truncate">{plan.employee?.full_name || 'Unknown'}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${
                        plan.status === 'confirmed' ? 'bg-teal-100 text-teal-800' :
                        plan.status === 'sent_to_manager' ? 'bg-amber-100 text-amber-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {plan.status === 'confirmed' ? 'Confirmed' :
                         plan.status === 'sent_to_manager' ? 'With Manager' :
                         'Manager Approved'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 truncate">
                      {plan.employee?.job_title || ''}{plan.goal_role_title ? ` → ${plan.goal_role_title}` : ''}
                    </p>
                    {plan.confirmed_at && (
                      <p className="text-xs text-slate-400 mt-0.5">Confirmed {new Date(plan.confirmed_at).toLocaleDateString()}</p>
                    )}
                  </div>
                  <button
                    onClick={() => setSelectedDeptPlanId(plan.id)}
                    className="ml-3 text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 transition-colors flex-shrink-0"
                  >
                    View Way Forward
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Lightweight Opal widget */}
        <SeraWidget answerFn={answerSeraQuery} inputRef={seraInputRef} query={seraQuery} setQuery={setSeraQuery} response={seraResponse} setResponse={setSeraResponse} />

        {/* 1:1 Status Drawer */}
        <OtoDrawer items={otoItems} status={otoDrawer} onClose={() => setOtoDrawer(null)} />

        {/* Career Plan Way Forward modal */}
        {selectedDeptPlanId && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
              <CareerPlanWorkflow
                planId={selectedDeptPlanId}
                viewerRole="dept_lead"
                onClose={() => setSelectedDeptPlanId(null)}
              />
            </div>
          </div>
        )}
      </div>
    );
  }

  // ─── Exec / Admin View (full org-wide) ──────────────────────────────────────
  return (
    <div className="space-y-8">
      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-4 pt-2">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Leadership Dashboard</h1>
          <p className="text-slate-500 mt-1">Organisation-wide talent insights and strategic planning</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => onNavigate?.('/strategies')}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
          >
            <Target className="w-4 h-4" />
            Strategies
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <button
          onClick={() => setShowOrgEmployeeList(v => !v)}
          className="card p-5 flex flex-col gap-3 text-left hover:shadow-md hover:border-blue-200 transition-all border border-transparent"
        >
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Employees</p>
            <div className="p-2 bg-blue-100 rounded-lg"><Users className="w-4 h-4 text-blue-600" /></div>
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-900">{stats.totalEmployees}</p>
            <p className="text-xs text-blue-600 mt-0.5 font-medium">{showOrgEmployeeList ? 'Hide list' : 'View all employees'}</p>
          </div>
        </button>
        <div className="card p-5 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Career Plans</p>
            <div className="p-2 bg-emerald-100 rounded-lg"><FileText className="w-4 h-4 text-emerald-600" /></div>
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-900">{stats.careerPlansActive}</p>
            <p className="text-xs text-slate-500 mt-0.5">In progress</p>
          </div>
        </div>
        <div className="card p-5 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Avg Rating</p>
            <div className="p-2 bg-amber-100 rounded-lg"><Star className="w-4 h-4 text-amber-600" /></div>
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-900">{stats.avgPerformance > 0 ? stats.avgPerformance.toFixed(1) : '—'}</p>
            <p className="text-xs text-slate-500 mt-0.5">Completed 1:1 avg</p>
          </div>
        </div>
        <button onClick={() => setOtoDrawer('completed')} className="card p-5 flex flex-col gap-3 text-left hover:shadow-md hover:border-teal-200 transition-all border border-transparent">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">1:1 Rate</p>
            <div className="p-2 bg-teal-100 rounded-lg"><CheckCircle2 className="w-4 h-4 text-teal-600" /></div>
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-900">{stats.oneToOneCompletion}%</p>
            <p className="text-xs text-teal-600 mt-0.5 font-medium">Click to drill down</p>
          </div>
        </button>
        <div className="card p-5 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Departments</p>
            <div className="p-2 bg-slate-100 rounded-lg"><Building2 className="w-4 h-4 text-slate-600" /></div>
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-900">{stats.departments}</p>
            <p className="text-xs text-slate-500 mt-0.5">Active</p>
          </div>
        </div>
        <button
          onClick={() => {
            sessionStorage.setItem('adminPendingTab', 'role-recommendations');
            onNavigate?.('/admin');
          }}
          className="card p-5 flex flex-col gap-3 text-left hover:shadow-md hover:border-orange-200 transition-all border border-transparent group"
        >
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Role Edits</p>
            <div className="p-2 bg-orange-100 rounded-lg"><PenLine className="w-4 h-4 text-orange-600" /></div>
          </div>
          <div>
            <div className="flex items-baseline gap-1.5">
              <p className="text-2xl font-bold text-slate-900">{recCounts.pending}</p>
              {recCounts.pending > 0 && (
                <span className="text-xs font-semibold px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded-full">pending</span>
              )}
            </div>
            {recCounts.mostRecentRole ? (
              <p className="text-xs text-slate-500 mt-0.5 truncate" title={recCounts.mostRecentRole}>Latest: {recCounts.mostRecentRole}</p>
            ) : (
              <p className="text-xs text-orange-600 mt-0.5 font-medium group-hover:underline">View recommendations</p>
            )}
          </div>
        </button>
      </div>

      {/* 1:1 status tiles */}
      {otoItems.length > 0 && (() => {
        const statuses: { key: 'in_progress'|'missed'|'overdue'|'completed'|'due_soon'; label: string; color: string; dotColor: string }[] = [
          { key: 'in_progress', label: 'In Progress', color: 'bg-blue-50 border-blue-100 hover:border-blue-300', dotColor: 'bg-blue-500' },
          { key: 'missed',      label: 'Missed',      color: 'bg-red-50 border-red-100 hover:border-red-300',   dotColor: 'bg-red-500' },
          { key: 'overdue',     label: 'Overdue',     color: 'bg-amber-50 border-amber-100 hover:border-amber-300', dotColor: 'bg-amber-500' },
          { key: 'completed',   label: 'Completed',   color: 'bg-green-50 border-green-100 hover:border-green-300', dotColor: 'bg-green-500' },
          { key: 'due_soon',    label: 'Due Soon',    color: 'bg-sky-50 border-sky-100 hover:border-sky-300',   dotColor: 'bg-sky-500' },
        ];
        return (
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
            {statuses.map(s => {
              const count = otoItems.filter(i => i.completion_status === s.key).length;
              return (
                <button key={s.key} onClick={() => setOtoDrawer(s.key)} className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${s.color}`}>
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className={`w-2 h-2 rounded-full ${s.dotColor}`} />
                    <span className="text-xs font-medium text-slate-600">{s.label}</span>
                  </div>
                  <p className="text-2xl font-bold text-slate-900">{count}</p>
                </button>
              );
            })}
          </div>
        );
      })()}

      {/* Org employee list — collapsed by default */}
      {showOrgEmployeeList && (() => {
        const hasOrgEmpFilters = !!(orgEmpFilterDept || orgEmpFilterManager || orgEmpFilterRole || orgEmpSearch);
        const filteredOrgEmps = orgEmployees.filter(e => {
          if (orgEmpFilterDept && e.department !== orgEmpFilterDept) return false;
          if (orgEmpFilterManager && e.manager_name !== orgEmpFilterManager) return false;
          if (orgEmpFilterRole && e.role !== orgEmpFilterRole) return false;
          if (orgEmpSearch && !e.full_name.toLowerCase().includes(orgEmpSearch.toLowerCase())) return false;
          return true;
        });
        const uniqueOrgDepts = [...new Set(orgEmployees.map(e => e.department).filter(Boolean))].sort();
        const uniqueOrgManagers = [...new Set(orgEmployees.map(e => e.manager_name).filter(Boolean))].sort();
        const uniqueOrgRoles = [...new Set(orgEmployees.map(e => e.role).filter(Boolean))].sort();
        return (
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-100 rounded-lg"><Users className="w-5 h-5 text-blue-600" /></div>
                <div>
                  <h3 className="font-semibold text-slate-900">All Employees</h3>
                  <p className="text-xs text-slate-500">
                    {filteredOrgEmps.length} of {orgEmployees.length} employees
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowOrgEmpFilters(v => !v)}
                  className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg border transition-colors ${
                    hasOrgEmpFilters ? 'bg-blue-50 border-blue-300 text-blue-700' : 'border-slate-200 text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <Filter className="w-3.5 h-3.5" />
                  Filter{hasOrgEmpFilters ? ' (active)' : ''}
                </button>
                <button
                  onClick={() => setShowOrgEmployeeList(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
                  title="Collapse"
                >
                  <ChevronUp className="w-4 h-4" />
                </button>
              </div>
            </div>

            {showOrgEmpFilters && (
              <div className="mb-4 p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-3">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <input
                    value={orgEmpSearch}
                    onChange={e => setOrgEmpSearch(e.target.value)}
                    placeholder="Search name..."
                    className="col-span-2 sm:col-span-1 w-full px-2 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500"
                  />
                  <select
                    value={orgEmpFilterDept}
                    onChange={e => setOrgEmpFilterDept(e.target.value)}
                    className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="">All departments</option>
                    {uniqueOrgDepts.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                  <select
                    value={orgEmpFilterManager}
                    onChange={e => setOrgEmpFilterManager(e.target.value)}
                    className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="">All managers</option>
                    {uniqueOrgManagers.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                  <select
                    value={orgEmpFilterRole}
                    onChange={e => setOrgEmpFilterRole(e.target.value)}
                    className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="">All access levels</option>
                    {uniqueOrgRoles.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                {hasOrgEmpFilters && (
                  <button
                    onClick={() => { setOrgEmpFilterDept(''); setOrgEmpFilterManager(''); setOrgEmpFilterRole(''); setOrgEmpSearch(''); }}
                    className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700"
                  >
                    <X className="w-3 h-3" /> Clear filters
                  </button>
                )}
              </div>
            )}

            {filteredOrgEmps.length === 0 ? (
              <div className="py-8 text-center text-sm text-slate-400">No employees match the current filters.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="text-left py-2.5 px-3 text-xs font-semibold text-slate-600">Employee</th>
                      <th className="text-left py-2.5 px-3 text-xs font-semibold text-slate-600">Department</th>
                      <th className="text-left py-2.5 px-3 text-xs font-semibold text-slate-600">Manager</th>
                      <th className="text-left py-2.5 px-3 text-xs font-semibold text-slate-600">Access Level</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOrgEmps.map(emp => (
                      <tr key={emp.id} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs font-medium flex-shrink-0">
                              {emp.full_name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-slate-900">{emp.full_name}</p>
                              <p className="text-xs text-slate-500 truncate max-w-[160px]">{emp.job_title}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-sm text-slate-600">{emp.department || '—'}</td>
                        <td className="py-2.5 px-3 text-sm text-slate-600">{emp.manager_name || '—'}</td>
                        <td className="py-2.5 px-3">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            emp.role === 'admin' ? 'bg-rose-100 text-rose-800' :
                            emp.role === 'leadership' ? 'bg-blue-100 text-blue-800' :
                            emp.role === 'dept_lead' ? 'bg-teal-100 text-teal-800' :
                            emp.role === 'manager' ? 'bg-amber-100 text-amber-800' :
                            'bg-slate-100 text-slate-600'
                          }`}>
                            {emp.role || 'employee'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })()}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-100 rounded-lg"><Users className="w-5 h-5 text-blue-600" /></div>
              <div>
                <h3 className="font-semibold text-slate-900">Performance Grid Overview</h3>
                <p className="text-xs text-slate-500">
                  Performance vs competency — {talentGrid.length} employee{talentGrid.length !== 1 ? 's' : ''} with completed reviews
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowNineBoxFilters(!showNineBoxFilters)}
                className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg border transition-colors ${hasActiveNineBoxFilters ? 'bg-blue-50 border-blue-300 text-blue-700' : 'border-slate-200 text-slate-500 hover:text-slate-700'}`}
              >
                <Filter className="w-3.5 h-3.5" />
                Filter{hasActiveNineBoxFilters ? ' (active)' : ''}
              </button>
              <button onClick={() => setSelectedView(selectedView === 'grid' ? 'overview' : 'grid')} className="text-xs text-blue-600 hover:text-blue-800 font-medium">
                Full grid
              </button>
              <button onClick={() => setExpandedNineBox(!expandedNineBox)} className="text-slate-400 hover:text-slate-600">
                {expandedNineBox ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {showNineBoxFilters && (
            <div className="mb-4 p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">From</label>
                  <input type="date" value={nineBoxFilters.dateFrom} onChange={e => setNineBoxFilters(f => ({ ...f, dateFrom: e.target.value }))} className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">To</label>
                  <input type="date" value={nineBoxFilters.dateTo} onChange={e => setNineBoxFilters(f => ({ ...f, dateTo: e.target.value }))} className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Department</label>
                  <select value={nineBoxFilters.department} onChange={e => setNineBoxFilters(f => ({ ...f, department: e.target.value }))} className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500">
                    <option value="">All departments</option>
                    {allDepartments.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Manager</label>
                  <select value={nineBoxFilters.managerId} onChange={e => setNineBoxFilters(f => ({ ...f, managerId: e.target.value }))} className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500">
                    <option value="">All managers</option>
                    {allManagers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                </div>
              </div>
              {hasActiveNineBoxFilters && (
                <button onClick={() => setNineBoxFilters({ dateFrom: '', dateTo: '', department: '', managerId: '' })} className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700">
                  <X className="w-3 h-3" /> Clear all filters
                </button>
              )}
            </div>
          )}

          {talentGrid.length === 0 ? (
            <div className="py-6 text-center text-sm text-slate-400">
              No completed reviews with both performance and competency ratings found{hasActiveNineBoxFilters ? ' matching the current filters' : ''}.
            </div>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                {nineBoxSummary.map((box, idx) => (
                  <div key={idx} className={`p-3 rounded-lg border text-center ${box.color}`}>
                    <p className="text-xs font-medium mb-1">{box.label}</p>
                    <p className="text-xl font-bold">{box.count}</p>
                  </div>
                ))}
              </div>
              {expandedNineBox && (
                <div className="mt-4 space-y-2">
                  {talentGrid.slice(0, 6).map(emp => {
                    const pos = getNineBoxPosition(emp.performance, emp.potential);
                    return (
                      <div key={emp.id} className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs font-medium">
                            {emp.full_name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-slate-900">{emp.full_name}</p>
                            <p className="text-xs text-slate-500">{emp.department}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-400">P:{emp.performance.toFixed(1)} C:{emp.potential.toFixed(1)}</span>
                          <div className={`w-3 h-3 rounded-full ${getNineBoxColor(pos.perfCategory, pos.potCategory)}`} />
                        </div>
                      </div>
                    );
                  })}
                  {talentGrid.length > 6 && (
                    <p className="text-xs text-slate-400 text-center">+{talentGrid.length - 6} more — open Full grid to see all</p>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-teal-100 rounded-lg"><Award className="w-5 h-5 text-teal-600" /></div>
              <div>
                <h3 className="font-semibold text-slate-900">Organisation Skills Matrix</h3>
                <p className="text-xs text-slate-500">Business-wide locked matrix ratings</p>
              </div>
            </div>
            <button
              onClick={() => setShowOrgFullMatrix(v => !v)}
              className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors ${
                showOrgFullMatrix
                  ? 'bg-teal-50 border-teal-300 text-teal-700 hover:bg-teal-100'
                  : 'border-slate-200 text-slate-600 hover:border-teal-300 hover:text-teal-700'
              }`}
            >
              {showOrgFullMatrix ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              {showOrgFullMatrix ? 'Hide Full Matrix' : 'View Full Matrix'}
            </button>
          </div>
          <SmDashboardMatrix scope="org" summaryOnly={!showOrgFullMatrix} />
        </div>
      </div>

      {selectedView === 'grid' && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-slate-900 text-lg">Full Performance Grid</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {talentGrid.length} employee{talentGrid.length !== 1 ? 's' : ''} with completed reviews{hasActiveNineBoxFilters ? ' (filtered)' : ''}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowNineBoxFilters(!showNineBoxFilters)}
                className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg border transition-colors ${hasActiveNineBoxFilters ? 'bg-blue-50 border-blue-300 text-blue-700' : 'border-slate-200 text-slate-500 hover:text-slate-700'}`}
              >
                <Filter className="w-3.5 h-3.5" />
                Filter{hasActiveNineBoxFilters ? ' (active)' : ''}
              </button>
              <button onClick={() => setSelectedView('overview')} className="text-sm text-slate-500 hover:text-slate-900">Close</button>
            </div>
          </div>

          {showNineBoxFilters && (
            <div className="mb-4 p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">From</label>
                  <input type="date" value={nineBoxFilters.dateFrom} onChange={e => setNineBoxFilters(f => ({ ...f, dateFrom: e.target.value }))} className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">To</label>
                  <input type="date" value={nineBoxFilters.dateTo} onChange={e => setNineBoxFilters(f => ({ ...f, dateTo: e.target.value }))} className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Department</label>
                  <select value={nineBoxFilters.department} onChange={e => setNineBoxFilters(f => ({ ...f, department: e.target.value }))} className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500">
                    <option value="">All departments</option>
                    {allDepartments.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Manager</label>
                  <select value={nineBoxFilters.managerId} onChange={e => setNineBoxFilters(f => ({ ...f, managerId: e.target.value }))} className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500">
                    <option value="">All managers</option>
                    {allManagers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                </div>
              </div>
              {hasActiveNineBoxFilters && (
                <button onClick={() => setNineBoxFilters({ dateFrom: '', dateTo: '', department: '', managerId: '' })} className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700">
                  <X className="w-3 h-3" /> Clear all filters
                </button>
              )}
            </div>
          )}

          {talentGrid.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-400 border-2 border-dashed border-slate-200 rounded-lg">
              No completed reviews with both performance and competency ratings found{hasActiveNineBoxFilters ? ' matching the current filters' : ''}.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <div className="min-w-[600px]">
                <div className="grid grid-cols-4 gap-1 mb-1">
                  <div className="text-xs font-semibold text-slate-500 flex items-end pb-2 pl-1">Performance →</div>
                  <div className="text-center text-xs font-semibold text-slate-500 py-2 bg-slate-100 rounded">Low Competency<br/><span className="font-normal">(1–2.9)</span></div>
                  <div className="text-center text-xs font-semibold text-slate-500 py-2 bg-slate-100 rounded">Mid Competency<br/><span className="font-normal">(3–3.9)</span></div>
                  <div className="text-center text-xs font-semibold text-slate-500 py-2 bg-slate-100 rounded">High Competency<br/><span className="font-normal">(4–5)</span></div>
                </div>
                {[
                  { label: 'High Perf (4–5)', perfIdx: 0 },
                  { label: 'Mid Perf (3–3.9)', perfIdx: 1 },
                  { label: 'Low Perf (1–2.9)', perfIdx: 2 },
                ].map(({ label, perfIdx }) => (
                  <div key={perfIdx} className="grid grid-cols-4 gap-1 mb-1">
                    <div className={`text-xs font-semibold text-slate-500 py-3 px-2 rounded flex items-center justify-center text-center ${perfIdx === 0 ? 'bg-green-50' : perfIdx === 1 ? 'bg-amber-50' : 'bg-rose-50'}`}>
                      {label}
                    </div>
                    {['low', 'medium', 'high'].map((potCategory, potIdx) => {
                      const perfCategory = perfIdx === 0 ? 'high' : perfIdx === 1 ? 'medium' : 'low';
                      const employees = talentGrid.filter(emp => {
                        const pos = getNineBoxPosition(emp.performance, emp.potential);
                        return pos.perfCategory === perfCategory && pos.potCategory === potCategory;
                      });
                      const boxLabel = [
                        ['High Perf / Low Comp', 'High Perf / Mid Comp', 'Stars'],
                        ['Solid / Low Comp', 'Core Team', 'High Potential'],
                        ['At Risk', 'Developing', 'Emerging'],
                      ][perfIdx][potIdx];
                      const colorClass = getNineBoxColor(perfIdx === 0 ? 'high' : perfIdx === 1 ? 'medium' : 'low', potCategory);
                      return (
                        <div key={`${perfIdx}-${potIdx}`} className="border border-slate-200 rounded-lg p-3 min-h-[90px] bg-white">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-semibold text-slate-600">{boxLabel}</span>
                            {employees.length > 0 && (
                              <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full text-white ${colorClass}`}>{employees.length}</span>
                            )}
                          </div>
                          <div className="space-y-1">
                            {employees.map(emp => (
                              <div key={emp.id} className="text-xs p-1.5 bg-slate-50 rounded border border-slate-100">
                                <div className="font-medium text-slate-900 truncate">{emp.full_name}</div>
                                <div className="text-slate-400 truncate">{emp.department}</div>
                                <div className="text-slate-400">P:{emp.performance.toFixed(1)} C:{emp.potential.toFixed(1)}</div>
                              </div>
                            ))}
                            {employees.length === 0 && <div className="text-xs text-slate-300 text-center py-2">—</div>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}


      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <div className="flex items-center gap-3 mb-5">
            <div className="p-2.5 bg-orange-100 rounded-lg"><Users className="w-5 h-5 text-orange-600" /></div>
            <div>
              <h3 className="font-semibold text-slate-900">Employees At Risk & High Potential</h3>
              <p className="text-xs text-slate-500">Performance and potential analysis</p>
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <p className="text-xs font-semibold text-rose-700 uppercase tracking-wide mb-2">At Risk</p>
              {atRiskEmployees.length === 0 ? (
                <p className="text-sm text-slate-400">No at-risk employees identified</p>
              ) : (
                <div className="space-y-1.5">
                  {atRiskEmployees.slice(0, 3).map(emp => (
                    <div key={emp.id} className="flex items-center justify-between p-2.5 bg-rose-50 border border-rose-100 rounded-lg">
                      <div>
                        <p className="text-sm font-medium text-slate-900">{emp.full_name}</p>
                        <p className="text-xs text-slate-500">{emp.job_title}</p>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${emp.risk_level === 'high' ? 'bg-red-100 text-red-800' : emp.risk_level === 'medium' ? 'bg-orange-100 text-orange-800' : 'bg-yellow-100 text-yellow-800'}`}>
                        {emp.performance.toFixed(1)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div>
              <p className="text-xs font-semibold text-green-700 uppercase tracking-wide mb-2">High Potential</p>
              {highPotentialEmployees.length === 0 ? (
                <p className="text-sm text-slate-400">No high potential employees identified</p>
              ) : (
                <div className="space-y-1.5">
                  {highPotentialEmployees.slice(0, 3).map(emp => (
                    <div key={emp.id} className="flex items-center justify-between p-2.5 bg-green-50 border border-green-100 rounded-lg">
                      <div>
                        <p className="text-sm font-medium text-slate-900">{emp.full_name}</p>
                        <p className="text-xs text-slate-500">{emp.job_title}</p>
                      </div>
                      <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full">{emp.potential.toFixed(1)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-amber-100 rounded-lg"><AlertCircle className="w-5 h-5 text-amber-600" /></div>
              <div>
                <h3 className="font-semibold text-slate-900">Moderation Queue</h3>
                <p className="text-xs text-slate-500">
                  {moderationQueue.length} case{moderationQueue.length !== 1 ? 's' : ''} pending review
                </p>
              </div>
            </div>
            <button onClick={() => { setModerationPanelMode('exec'); setShowModerationPanel(true); }} className="flex items-center gap-2 text-sm font-medium text-amber-600 hover:text-amber-800 transition-colors">
              <ShieldCheck className="w-4 h-4" />
              Open Queue
            </button>
          </div>
          {moderationQueue.length === 0 ? (
            <p className="text-sm text-slate-400 py-4 text-center">No cases pending moderation</p>
          ) : (
            <div className="space-y-2">
              {moderationQueue.map((item: any) => {
                const stepLabel = item.current_step === 1 ? 'Dept Lead Review' : item.current_step === 2 ? 'Exec Review' : `Step ${item.current_step}`;
                const statusColor = item.status === 'pending' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800';
                return (
                  <button
                    key={item.id}
                    onClick={() => { setModerationPanelMode('exec'); setShowModerationPanel(true); }}
                    className="w-full text-left flex items-center justify-between p-3 bg-amber-50 border border-amber-100 rounded-xl hover:bg-amber-100 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-slate-900">{item.employee_name}</p>
                      <p className="text-xs text-slate-500">{item.department} · Manager: {item.manager_name}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor}`}>{stepLabel}</span>
                      <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{Number(item.current_rating).toFixed(1)}/5</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="card">
        <div className="flex items-center gap-3 mb-5">
          <div className="p-2.5 bg-green-100 rounded-lg"><TrendingUp className="w-5 h-5 text-green-600" /></div>
          <div>
            <h3 className="font-semibold text-slate-900">Pay Review Forecast</h3>
            <p className="text-xs text-slate-500">Employees rated 4 or 5 — view only</p>
          </div>
          <span className="ml-auto text-xs bg-slate-100 text-slate-500 px-2.5 py-1 rounded-full font-medium">View Only</span>
        </div>
        {payReviewForecast.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-6">No employees currently rated 4 or 5</p>
        ) : (
          <div className="space-y-2">
            {payReviewForecast.map(item => (
              <div key={item.id} className="flex items-center justify-between p-3 bg-green-50 border border-green-100 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-slate-900">{item.employee_name}</p>
                  <p className="text-xs text-slate-500">{item.job_title} · {item.department}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs bg-green-100 text-green-800 px-2.5 py-1 rounded-full font-semibold">Perf {item.avg_performance.toFixed(1)}</span>
                  <span className="text-xs bg-blue-100 text-blue-800 px-2.5 py-1 rounded-full font-semibold">Comp {item.avg_competency.toFixed(1)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Lightweight Opal widget */}
      <SeraWidget answerFn={answerSeraQuery} inputRef={seraInputRef} query={seraQuery} setQuery={setSeraQuery} response={seraResponse} setResponse={setSeraResponse} />

      {/* 1:1 Status Drawer */}
      <OtoDrawer items={otoItems} status={otoDrawer} onClose={() => setOtoDrawer(null)} />
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function SeraWidget({ answerFn, inputRef, query, setQuery, response, setResponse }: {
  answerFn: (q: string) => string;
  inputRef: React.RefObject<HTMLInputElement>;
  query: string;
  setQuery: (v: string) => void;
  response: string;
  setResponse: (v: string) => void;
}) {
  function handleAsk() {
    if (!query.trim()) return;
    setResponse(answerFn(query.trim()));
  }
  return (
    <div className="card border border-sky-100 bg-sky-50/50">
      <div className="flex items-center gap-3 mb-3">
        <div className="p-2 bg-sky-100 rounded-lg"><MessageSquare className="w-4 h-4 text-sky-600" /></div>
        <div>
          <h3 className="font-semibold text-slate-900 text-sm">Opal — Ask about your dashboard</h3>
          <p className="text-xs text-slate-500">Try: "How many missed 1:1s?", "Show overdue reviews", "How many career plans?"</p>
        </div>
      </div>
      <div className="flex gap-2">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAsk()}
          placeholder="Ask about 1:1s, performance, headcount..."
          className="flex-1 px-3 py-2 text-sm border border-sky-200 rounded-lg focus:ring-2 focus:ring-sky-400 focus:outline-none bg-white"
        />
        <button
          onClick={handleAsk}
          disabled={!query.trim()}
          className="px-3 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 disabled:opacity-40 transition-colors"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
      {response && (
        <div className="mt-2 p-3 bg-white border border-sky-200 rounded-lg text-sm text-slate-700">
          {response}
        </div>
      )}
    </div>
  );
}

function reviewStatusToDrawerKey(status: string): string {
  switch (status) {
    case 'Completed':    return 'completed';
    case 'Missed':       return 'missed';
    case 'Overdue':      return 'overdue';
    case 'In Progress':  return 'in_progress';
    case 'Due Soon':     return 'due_soon';
    case 'Rescheduled':  return 'overdue'; // fold into overdue bucket for drawer
    default:             return 'not_started';
  }
}

function OtoDrawer({ items, status, onClose }: {
  items: OtoStatusItem[];
  status: 'in_progress'|'missed'|'overdue'|'completed'|'due_soon'|null;
  onClose: () => void;
}) {
  if (!status) return null;
  const filtered = items.filter(i => i.completion_status === status);
  const labelMap: Record<string, string> = {
    in_progress: 'In Progress', missed: 'Missed', overdue: 'Overdue', completed: 'Completed', due_soon: 'Due Soon',
  };
  const colorMap: Record<string, string> = {
    in_progress: 'bg-blue-100 text-blue-800', missed: 'bg-red-100 text-red-800',
    overdue: 'bg-amber-100 text-amber-800', completed: 'bg-green-100 text-green-800', due_soon: 'bg-sky-100 text-sky-800',
  };
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div className="flex items-center gap-3">
            <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${colorMap[status]}`}>{labelMap[status]}</span>
            <span className="text-sm text-slate-500">{filtered.length} record{filtered.length !== 1 ? 's' : ''}</span>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
        </div>
        <div className="overflow-y-auto overflow-x-auto flex-1">
          {filtered.length === 0 ? (
            <p className="text-center text-slate-400 py-12 text-sm">No records in this category</p>
          ) : (
            <table className="w-full text-sm min-w-[500px]">
              <thead className="sticky top-0 bg-slate-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Employee</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Manager</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Department</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Scheduled</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900">{item.employee_name}</p>
                      <p className="text-xs text-slate-400">{item.job_title}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{item.manager_name || '—'}</td>
                    <td className="px-4 py-3 text-slate-600">{item.department || '—'}</td>
                    <td className="px-4 py-3 text-slate-600">
                      {item.scheduled_datetime
                        ? new Date(item.scheduled_datetime).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                        : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${colorMap[status]}`}>{labelMap[status]}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
