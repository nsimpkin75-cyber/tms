import { useState, useEffect } from 'react';
import { TrendingUp, User, FileText, Compass, Brain, MessageSquare, Clock, Target, CheckCircle, Award, BookOpen, Download, Plus, CreditCard as Edit, Trash2, GraduationCap, Briefcase, Star, ChevronDown, ChevronUp, PenLine, X, Send, ArrowRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import InitiatedCareerPlanQuiz from '../components/career/InitiatedCareerPlanQuiz';

interface JobFamily {
  id: string;
  title: string;
  department: string;
  pathway: string | null;
  team: string | null;
  level: string;
  sort_order: number | null;
  description: string | null;
  reports_to: string | null;
  skills: string[];
  experience: string[];
  accountabilities: string[];
  what_great_looks_like: string[];
  qualifications_training: string[];
  recommended_learning: string[];
  recommended_prev_roles: string[];
  side_step_roles: string[];
  progression_to: string | null;
  alternative_paths: string[];
  how_do_i_get_there: string | null;
  typical_experience_required: string | null;
  internal_progression_criteria: string | null;
  mentoring_suggestions: string | null;
  sera_coaching_context: string | null;
}

interface RoleHistoryEntry {
  id: string;
  role_title: string;
  department: string;
  start_date: string;
  end_date: string;
  is_current: boolean;
  summary: string;
  achievements: string;
}

interface AdditionalSkill {
  id: string;
  skill_name: string;
  category: string;
  evidence: string;
  confidence_level: string;
}

interface QualificationEntry {
  id: string;
  name: string;
  provider: string;
  date_completed: string;
  expiry_date: string;
  evidence_link: string;
}

interface CareerProfile {
  id: string;
  user_id: string;
  current_role_title: string;
  current_department: string;
  role_purpose_summary: string;
  years_in_current_role: number;
  role_history: RoleHistoryEntry[];
  additional_skills: AdditionalSkill[];
  qualifications_training: QualificationEntry[];
  career_goals: string;
  skills_summary: any;
  profile_completeness: number;
  // legacy
  previous_roles: any[];
  external_qualifications: any[];
  external_experience: any[];
  external_skills: any[];
}

interface ProfileForm {
  role_purpose_summary: string;
  role_history: RoleHistoryEntry[];
  additional_skills: AdditionalSkill[];
  qualifications_training: QualificationEntry[];
  career_goals: string;
}

interface CareerPlan {
  id: string;
  user_id: string;
  profile_id: string;
  quiz_session_id: string;
  goal_role_custom_title: string;
  goal_role_title: string;
  status: string;
  created_at: string;
  updated_at: string;
  manager_comments: string | null;
  manager_notes: string | null;
  estimated_completion_date: string | null;
  created_by_role: string | null;
  created_by_name: string | null;
  target_department: string | null;
  recommended_timeline_months: number | null;
}

function makeId() {
  return Math.random().toString(36).slice(2);
}

const CONFIDENCE_LEVELS = ['Beginner', 'Developing', 'Competent', 'Proficient', 'Expert'];
const SKILL_CATEGORIES = ['Technical', 'Leadership', 'Communication', 'Analytical', 'Customer', 'Project Management', 'People', 'Other'];

interface PathwaysProps {
  onNavigate?: (path: string) => void;
}

export function Pathways({ onNavigate }: PathwaysProps = {}) {
  const { user, profile, effectiveProfile, isViewingAs, guardViewAs } = useAuth();
  const activeProfile = effectiveProfile || profile;
  const activeUserId = effectiveProfile?.id || user?.id;
  const [activeTab, setActiveTab] = useState<'progression' | 'profile' | 'plans' | 'explore'>('progression');
  const [jobFamilies, setJobFamilies] = useState<JobFamily[]>([]);
  const [currentJobFamily, setCurrentJobFamily] = useState<JobFamily | null>(null);
  const [careerProfile, setCareerProfile] = useState<CareerProfile | null>(null);
  const [myPlans, setMyPlans] = useState<CareerPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingProfile, setEditingProfile] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [expandedJobFamily, setExpandedJobFamily] = useState<string | null>(null);
  const [profileForm, setProfileForm] = useState<ProfileForm>({
    role_purpose_summary: '',
    role_history: [],
    additional_skills: [],
    qualifications_training: [],
    career_goals: '',
  });

  // Inline add-form state
  const [addingRole, setAddingRole] = useState(false);
  const [newRole, setNewRole] = useState<RoleHistoryEntry>({ id: '', role_title: '', department: '', start_date: '', end_date: '', is_current: false, summary: '', achievements: '' });
  const [addingSkill, setAddingSkill] = useState(false);
  const [newSkill, setNewSkill] = useState<AdditionalSkill>({ id: '', skill_name: '', category: '', evidence: '', confidence_level: '' });
  const [addingQual, setAddingQual] = useState(false);
  const [newQual, setNewQual] = useState<QualificationEntry>({ id: '', name: '', provider: '', date_completed: '', expiry_date: '', evidence_link: '' });
  const [managerName, setManagerName] = useState<string | null>(null);
  const [openInitiatedPlanId, setOpenInitiatedPlanId] = useState<string | null>(null);

  // Recommendation workflow (for dept leads)
  const [recommendingFor, setRecommendingFor] = useState<JobFamily | null>(null);
  const [recFieldName, setRecFieldName] = useState('');
  const [recSuggestedValue, setRecSuggestedValue] = useState('');
  const [recRationale, setRecRationale] = useState('');
  const [recSubmitting, setRecSubmitting] = useState(false);
  const [recSuccess, setRecSuccess] = useState(false);

  useEffect(() => {
    loadData();
  }, [activeProfile?.id]);

  const loadData = async () => {
    setLoading(true);
    await Promise.all([
      fetchJobFamilies(),
      fetchCareerProfile(),
      fetchMyPlans(),
      fetchManagerName(),
    ]);
    setLoading(false);
  };

  const fetchJobFamilies = async () => {
    try {
      const { data, error } = await supabase
        .from('job_families')
        .select('*')
        .order('department', { ascending: true })
        .order('sort_order', { ascending: true });

      if (error) throw error;
      setJobFamilies(data || []);

      if (activeProfile?.job_family_id) {
        const current = data?.find(jf => jf.id === activeProfile.job_family_id);
        setCurrentJobFamily(current || null);
      }
    } catch (error) {
      console.error('Error fetching job families:', error);
    }
  };

  const fetchCareerProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('career_profiles')
        .select('*')
        .eq('user_id', activeUserId)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setCareerProfile(data);
        setProfileForm({
          role_purpose_summary: data.role_purpose_summary || '',
          role_history: data.role_history || [],
          additional_skills: data.additional_skills || [],
          qualifications_training: data.qualifications_training || [],
          career_goals: data.career_goals || '',
        });
      }
    } catch (error) {
      console.error('Error fetching career profile:', error);
    }
  };

  const fetchMyPlans = async () => {
    if (!activeUserId) return;
    try {
      const { data, error } = await supabase
        .from('career_plans')
        .select('id, user_id, profile_id, quiz_session_id, goal_role_custom_title, goal_role_title, status, created_at, updated_at, manager_comments, target_department, recommended_timeline_months, created_by_role, created_by_name')
        .or(`user_id.eq.${activeUserId},profile_id.eq.${activeUserId}`)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMyPlans(data || []);
    } catch (error) {
      console.error('Error fetching career plans:', error);
    }
  };

  const fetchManagerName = async () => {
    const managerId = activeProfile?.manager_id;
    if (!managerId) return;
    try {
      const { data } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', managerId)
        .maybeSingle();
      if (data?.full_name) setManagerName(data.full_name);
    } catch {
      // non-critical
    }
  };

  const RECOMMEND_FIELDS: Array<{ name: string; label: string; isArray: boolean }> = [
    { name: 'description', label: 'Role Purpose', isArray: false },
    { name: 'accountabilities', label: 'Accountabilities', isArray: true },
    { name: 'what_great_looks_like', label: 'What Great Looks Like', isArray: true },
    { name: 'skills', label: 'Technical Skills', isArray: true },
    { name: 'experience', label: 'Knowledge', isArray: true },
    { name: 'qualifications_training', label: 'Qualifications', isArray: true },
    { name: 'recommended_prev_roles', label: 'Recommended Previous Roles', isArray: true },
    { name: 'recommended_learning', label: 'Recommended Learning', isArray: true },
    { name: 'progression_to', label: 'Progression To', isArray: false },
    { name: 'alternative_paths', label: 'Alternative Roles Based On This Skill Set', isArray: true },
    { name: 'how_do_i_get_there', label: 'How Do I Get There', isArray: false },
    { name: 'reports_to', label: 'Reports To', isArray: false },
  ];

  const getCurrentValueForField = (jf: JobFamily, fieldName: string): string => {
    const val = (jf as any)[fieldName];
    if (Array.isArray(val)) return val.join('\n');
    return val || '';
  };

  const submitRecommendation = async () => {
    if (!recommendingFor || !recFieldName || !recSuggestedValue.trim() || !recRationale.trim()) return;
    if (!user?.id) return;
    setRecSubmitting(true);
    try {
      const field = RECOMMEND_FIELDS.find(f => f.name === recFieldName);
      const currentValue = getCurrentValueForField(recommendingFor, recFieldName);
      const { error } = await supabase
        .from('role_profile_recommendations')
        .insert({
          job_family_id: recommendingFor.id,
          submitted_by: user.id,
          field_name: recFieldName,
          field_label: field?.label || recFieldName,
          current_value: currentValue,
          suggested_value: recSuggestedValue.trim(),
          rationale: recRationale.trim(),
          status: 'pending',
        });
      if (error) throw error;
      setRecSuccess(true);
      setTimeout(() => {
        setRecommendingFor(null);
        setRecFieldName('');
        setRecSuggestedValue('');
        setRecRationale('');
        setRecSuccess(false);
      }, 2000);
    } catch (err: any) {
      alert('Failed to submit recommendation: ' + (err.message || 'Unknown error'));
    } finally {
      setRecSubmitting(false);
    }
  };

  const saveProfile = async () => {
    if (guardViewAs()) return;
    setSavingProfile(true);
    try {
      const payload = {
        user_id: activeUserId,
        role_purpose_summary: profileForm.role_purpose_summary,
        role_history: profileForm.role_history,
        additional_skills: profileForm.additional_skills,
        qualifications_training: profileForm.qualifications_training,
        career_goals: profileForm.career_goals,
        last_updated: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('career_profiles')
        .upsert(payload, { onConflict: 'user_id' });

      if (error) throw error;
      await fetchCareerProfile();
      setEditingProfile(false);
    } catch (err: any) {
      console.error('Error saving profile:', err);
      alert('Failed to save profile: ' + (err.message || 'Unknown error'));
    } finally {
      setSavingProfile(false);
    }
  };

  const downloadProfile = () => {
    if (!careerProfile) return;

    const roleHistory = (careerProfile.role_history || []).map((r: RoleHistoryEntry) =>
      `- ${r.role_title} | ${r.department} | ${r.start_date || '?'} – ${r.is_current ? 'Present' : (r.end_date || '?')}\n  ${r.summary || ''}`
    ).join('\n') || 'None listed';

    const skills = (careerProfile.additional_skills || []).map((s: AdditionalSkill) =>
      `- ${s.skill_name} (${s.category}) — ${s.confidence_level}${s.evidence ? ': ' + s.evidence : ''}`
    ).join('\n') || 'None listed';

    const quals = (careerProfile.qualifications_training || []).map((q: QualificationEntry) =>
      `- ${q.name}${q.provider ? ' | ' + q.provider : ''}${q.date_completed ? ' | ' + q.date_completed : ''}`
    ).join('\n') || 'None listed';

    const profileText = `CAREER PROFILE — ${activeProfile?.full_name}
${'='.repeat(50)}

CURRENT ROLE
${activeProfile?.job_title || careerProfile.current_role_title || 'Unknown'}
${activeProfile?.department || careerProfile.current_department || ''}
${careerProfile.role_purpose_summary || ''}

ROLE HISTORY
${'─'.repeat(30)}
${roleHistory}

SKILLS
${'─'.repeat(30)}
${skills}

QUALIFICATIONS & TRAINING
${'─'.repeat(30)}
${quals}

CAREER INTERESTS & GOALS
${'─'.repeat(30)}
${careerProfile.career_goals || 'Not specified'}
`;

    const blob = new Blob([profileText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Career_Profile_${(activeProfile?.full_name || 'Profile').replace(/\s+/g, '_')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Returns the next role job family using progression_to first, then sort_order fallback.
  // Only returns roles with a higher sort_order than the current role (strictly above current).
  const getNextRole = (jf: JobFamily): JobFamily | null => {
    if (!jf) return null;
    // Restrict to same pathway if the current role has a pathway set
    const pathwayFamilies = jobFamilies.filter(j =>
      j.department === jf.department &&
      j.id !== jf.id &&
      (!jf.pathway || j.pathway === jf.pathway)
    );

    if (jf.progression_to) {
      const targets = jf.progression_to.split(',').map(s => s.trim().toLowerCase());
      const match = pathwayFamilies.find(j =>
        targets.some(t => j.title.trim().toLowerCase().includes(t) || t.includes(j.title.trim().toLowerCase()))
      );
      if (match) return match;
    }

    // Fall back to next higher sort_order within same pathway
    const sorted = pathwayFamilies
      .filter(j => (j.sort_order ?? 0) > (jf.sort_order ?? 0))
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
    return sorted[0] ?? null;
  };

  // Builds the ordered timeline for My Progression.
  // Scoped to the employee's current pathway (if set) within their department.
  // Status logic:
  //   'skipped'  — roles with sort_order BELOW current, not in previous_roles (hired mid-pathway)
  //   'past'     — roles in previous_roles history (explicitly completed)
  //   'current'  — the employee's current role
  //   'future'   — roles with sort_order ABOVE current
  const buildTimeline = () => {
    if (!currentJobFamily) return [];

    const prevRoleTitles = new Set(
      (Array.isArray((activeProfile as any)?.previous_roles) ? (activeProfile as any).previous_roles : [])
        .map((r: any) => r.role?.trim().toLowerCase()).filter(Boolean)
    );
    const currentTitle = (activeProfile?.job_title || currentJobFamily.title).trim().toLowerCase();
    const currentOrder = currentJobFamily.sort_order ?? 0;

    // Filter to same department + same pathway (if pathway is set)
    const scopedFamilies = jobFamilies
      .filter(j =>
        j.department === currentJobFamily.department &&
        (!currentJobFamily.pathway || j.pathway === currentJobFamily.pathway)
      )
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));

    return scopedFamilies.map(jf => {
      const t = jf.title.trim().toLowerCase();
      const order = jf.sort_order ?? 0;

      if (t === currentTitle) return { jf, status: 'current' as const };
      if (prevRoleTitles.has(t)) return { jf, status: 'past' as const };
      // Roles below current order that aren't in history = skipped/hired above them
      if (order < currentOrder) return { jf, status: 'skipped' as const };
      return { jf, status: 'future' as const };
    });
  };

  const renderProgression = () => {
    if (!currentJobFamily) {
      return (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <TrendingUp className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No job family assigned. Please contact your manager.</p>
        </div>
      );
    }

    const startDate = (activeProfile as any)?.start_date;
    const tenureMonths = startDate
      ? (() => {
          const s = new Date(startDate);
          const now = new Date();
          return (now.getFullYear() - s.getFullYear()) * 12 + (now.getMonth() - s.getMonth());
        })()
      : 0;
    const tenureYears = Math.floor(tenureMonths / 12);
    const remainingMonths = tenureMonths % 12;
    const timeline = buildTimeline();
    const nextRole = getNextRole(currentJobFamily);
    const currentIdx = timeline.findIndex(t => t.status === 'current');

    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg p-6 border border-blue-200">
          <div className="flex flex-wrap items-start justify-between gap-4 mb-3">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{activeProfile?.job_title || currentJobFamily.title}</h2>
              <p className="text-sm text-blue-700 font-medium mt-0.5">
                {activeProfile?.department}{currentJobFamily.team ? ` · ${currentJobFamily.team}` : ''} · {currentJobFamily.department} pathway
              </p>
            </div>
            <span className="px-3 py-1 bg-blue-600 text-white text-xs font-semibold rounded-full">{currentJobFamily.level}</span>
          </div>
          {currentJobFamily.description && (
            <p className="text-gray-700 mb-3 text-sm">{currentJobFamily.description}</p>
          )}
          <div className="flex items-center gap-2 text-sm">
            <Clock className="w-4 h-4 text-blue-600" />
            <span className="text-gray-700">
              Length of Service: {tenureYears > 0 ? `${tenureYears} year${tenureYears > 1 ? 's' : ''}` : ''}
              {tenureYears > 0 && remainingMonths > 0 ? ', ' : ''}
              {remainingMonths > 0 ? `${remainingMonths} month${remainingMonths > 1 ? 's' : ''}` : ''}
              {tenureMonths === 0 ? 'Not yet started' : ''}
            </span>
          </div>
        </div>

        {/* Timeline */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold mb-6 text-gray-900">Career Timeline</h3>
          <div className="relative">
            {/* Vertical line */}
            <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200" />
            <div className="space-y-4">
              {timeline.map(({ jf, status }, idx) => {
                const isNextMove = status === 'future' && idx === (currentIdx >= 0 ? currentIdx + 1 : timeline.findIndex(t => t.status === 'future'));
                return (
                  <div key={jf.id} className="relative flex items-start gap-4 pl-14">
                    {/* Node */}
                    <div className={`absolute left-3.5 w-5 h-5 rounded-full border-2 flex items-center justify-center z-10 ${
                      status === 'past' ? 'bg-green-500 border-green-600' :
                      status === 'current' ? 'bg-blue-600 border-blue-700 scale-125' :
                      status === 'skipped' ? 'bg-gray-300 border-gray-400' :
                      isNextMove ? 'bg-amber-400 border-amber-500' :
                      'bg-gray-200 border-gray-300'
                    }`} style={{ top: '10px' }}>
                      {status === 'past' && <CheckCircle className="w-3 h-3 text-white" />}
                      {status === 'current' && <div className="w-2 h-2 rounded-full bg-white" />}
                    </div>
                    {/* Card */}
                    <div className={`flex-1 rounded-lg border p-4 ${
                      status === 'past' ? 'bg-green-50 border-green-200' :
                      status === 'current' ? 'bg-blue-50 border-blue-300 shadow-md' :
                      status === 'skipped' ? 'bg-gray-50 border-gray-200 opacity-60' :
                      isNextMove ? 'bg-amber-50 border-amber-200' :
                      'bg-gray-50 border-gray-200'
                    }`}>
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <h4 className={`font-semibold text-sm ${
                          status === 'current' ? 'text-blue-900' :
                          status === 'past' ? 'text-green-900' :
                          status === 'skipped' ? 'text-gray-400' :
                          'text-gray-700'
                        }`}>{jf.title}</h4>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                          status === 'past' ? 'bg-green-200 text-green-800' :
                          status === 'current' ? 'bg-blue-600 text-white' :
                          status === 'skipped' ? 'bg-gray-200 text-gray-500' :
                          isNextMove ? 'bg-amber-200 text-amber-800' :
                          'bg-gray-200 text-gray-600'
                        }`}>
                          {status === 'past' ? 'Previous' : status === 'current' ? 'Current' : status === 'skipped' ? 'Not in Pathway' : isNextMove ? 'Next Move' : 'Future'}
                        </span>
                      </div>
                      {jf.level && (
                        <p className={`text-xs mt-0.5 ${status === 'skipped' ? 'text-gray-400' : 'text-gray-500'}`}>
                          {jf.level}{jf.team ? ` · ${jf.team}` : ''}
                        </p>
                      )}
                      {status === 'skipped' && (
                        <p className="text-xs text-gray-400 mt-1 italic">Entry point was above this level</p>
                      )}
                      {status === 'current' && tenureMonths > 0 && (
                        <p className="text-xs text-blue-700 mt-1">{tenureYears > 0 ? `${tenureYears}yr${tenureYears !== 1 ? 's' : ''}` : ''}{tenureYears > 0 && remainingMonths > 0 ? ' ' : ''}{remainingMonths > 0 ? `${remainingMonths}mo` : ''} service</p>
                      )}
                    </div>
                  </div>
                );
              })}
              {/* If next role is outside current dept (progression_to points cross-dept) */}
              {nextRole && nextRole.department !== currentJobFamily.department && (
                <div className="relative flex items-start gap-4 pl-14">
                  <div className="absolute left-3.5 w-5 h-5 rounded-full border-2 bg-amber-400 border-amber-500 z-10" style={{ top: '10px' }} />
                  <div className="flex-1 rounded-lg border border-amber-200 bg-amber-50 p-4">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <h4 className="font-semibold text-sm text-gray-700">{nextRole.title}</h4>
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-200 text-amber-800">Next Move</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">{nextRole.department} · {nextRole.level}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Previous role history for reference */}
        {Array.isArray((activeProfile as any)?.previous_roles) && (activeProfile as any).previous_roles.length > 0 && (
          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Role History</h3>
            <div className="flex flex-wrap gap-2">
              {(activeProfile as any).previous_roles.map((entry: any, idx: number) => (
                <div key={idx} className="px-3 py-1.5 bg-gray-50 rounded-lg border border-gray-200 text-xs">
                  <span className="font-medium text-gray-800">{entry.role}</span>
                  <span className="text-gray-500"> · {entry.department}</span>
                  {(entry.start_date || entry.end_date) && (
                    <span className="text-gray-400 block">{entry.start_date || '?'} – {entry.end_date || 'present'}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const cancelEdit = () => {
    setEditingProfile(false);
    setAddingRole(false);
    setAddingSkill(false);
    setAddingQual(false);
    if (careerProfile) {
      setProfileForm({
        role_purpose_summary: careerProfile.role_purpose_summary || '',
        role_history: careerProfile.role_history || [],
        additional_skills: careerProfile.additional_skills || [],
        qualifications_training: careerProfile.qualifications_training || [],
        career_goals: careerProfile.career_goals || '',
      });
    } else {
      setProfileForm({ role_purpose_summary: '', role_history: [], additional_skills: [], qualifications_training: [], career_goals: '' });
    }
  };

  const addRoleEntry = () => {
    if (!newRole.role_title.trim()) return;
    setProfileForm(f => ({ ...f, role_history: [...f.role_history, { ...newRole, id: makeId() }] }));
    setNewRole({ id: '', role_title: '', department: '', start_date: '', end_date: '', is_current: false, summary: '', achievements: '' });
    setAddingRole(false);
  };

  const removeRoleEntry = (id: string) => setProfileForm(f => ({ ...f, role_history: f.role_history.filter(r => r.id !== id) }));

  const addSkillEntry = () => {
    if (!newSkill.skill_name.trim()) return;
    setProfileForm(f => ({ ...f, additional_skills: [...f.additional_skills, { ...newSkill, id: makeId() }] }));
    setNewSkill({ id: '', skill_name: '', category: '', evidence: '', confidence_level: '' });
    setAddingSkill(false);
  };

  const removeSkillEntry = (id: string) => setProfileForm(f => ({ ...f, additional_skills: f.additional_skills.filter(s => s.id !== id) }));

  const addQualEntry = () => {
    if (!newQual.name.trim()) return;
    setProfileForm(f => ({ ...f, qualifications_training: [...f.qualifications_training, { ...newQual, id: makeId() }] }));
    setNewQual({ id: '', name: '', provider: '', date_completed: '', expiry_date: '', evidence_link: '' });
    setAddingQual(false);
  };

  const removeQualEntry = (id: string) => setProfileForm(f => ({ ...f, qualifications_training: f.qualifications_training.filter(q => q.id !== id) }));

  const renderProfile = () => {
    const isEditing = editingProfile;
    const cp = careerProfile;

    if (!cp && !isEditing) {
      return (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <User className="w-8 h-8 text-blue-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No profile yet</h3>
          <p className="text-gray-500 mb-6 max-w-xs mx-auto">Build your internal CV to showcase your experience, skills, and qualifications.</p>
          <button
            onClick={() => { if (!guardViewAs()) setEditingProfile(true); }}
            className={`px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium ${isViewingAs ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            Create My Profile
          </button>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">My Profile</h2>
            <p className="text-gray-500 text-sm mt-0.5">Your internal CV — experience, skills and career interests</p>
          </div>
          <div className="flex gap-2">
            {!isEditing ? (
              <>
                {cp && (
                  <button onClick={downloadProfile} className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-medium">
                    <Download className="w-4 h-4" />
                    Download
                  </button>
                )}
                <button
                  onClick={() => { if (!guardViewAs()) setEditingProfile(true); }}
                  className={`flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium ${isViewingAs ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <Edit className="w-4 h-4" />
                  Edit Profile
                </button>
              </>
            ) : (
              <>
                <button onClick={cancelEdit} disabled={savingProfile} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 text-sm font-medium disabled:opacity-50">Cancel</button>
                <button onClick={saveProfile} disabled={savingProfile} className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium disabled:opacity-60">
                  {savingProfile ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Saving...</> : 'Save Profile'}
                </button>
              </>
            )}
          </div>
        </div>

        {/* ── Section 1: Current Role ── */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="flex items-center gap-3 px-6 py-4 bg-gray-50 border-b border-gray-200">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center"><Briefcase className="w-4 h-4 text-blue-600" /></div>
            <h3 className="font-semibold text-gray-900">Current Role</h3>
          </div>
          <div className="p-6 space-y-4">
            <div className="grid sm:grid-cols-3 gap-4">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Role Title</p>
                <p className="text-sm font-semibold text-gray-900">{activeProfile?.job_title || cp?.current_role_title || '—'}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Department</p>
                <p className="text-sm font-semibold text-gray-900">{activeProfile?.department || cp?.current_department || '—'}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Manager</p>
                <p className="text-sm font-semibold text-gray-900">{managerName || '—'}</p>
              </div>
            </div>
            {isEditing ? (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Role Purpose Summary</label>
                <textarea
                  value={profileForm.role_purpose_summary}
                  onChange={e => setProfileForm(f => ({ ...f, role_purpose_summary: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                  placeholder="Briefly describe the purpose of your current role and your key responsibilities..."
                />
              </div>
            ) : cp?.role_purpose_summary ? (
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Role Purpose</p>
                <p className="text-sm text-gray-700 leading-relaxed">{cp.role_purpose_summary}</p>
              </div>
            ) : isEditing ? null : (
              <p className="text-sm text-gray-400 italic">No role purpose summary added yet.</p>
            )}
          </div>
        </div>

        {/* ── Section 2: Role History ── */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 bg-gray-50 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center"><Clock className="w-4 h-4 text-green-600" /></div>
              <h3 className="font-semibold text-gray-900">Role History</h3>
            </div>
            {isEditing && !addingRole && (
              <button onClick={() => setAddingRole(true)} className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium">
                <Plus className="w-4 h-4" />Add Role
              </button>
            )}
          </div>
          <div className="p-6">
            {/* Add form */}
            {isEditing && addingRole && (
              <div className="mb-5 p-4 bg-blue-50 rounded-lg border border-blue-200 space-y-3">
                <p className="text-sm font-semibold text-blue-900">Add Previous Role</p>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Role Title *</label>
                    <input type="text" value={newRole.role_title} onChange={e => setNewRole(r => ({ ...r, role_title: e.target.value }))} className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500" placeholder="e.g. Senior Advisor" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Department</label>
                    <input type="text" value={newRole.department} onChange={e => setNewRole(r => ({ ...r, department: e.target.value }))} className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500" placeholder="e.g. Operations" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Start Date</label>
                    <input type="month" value={newRole.start_date} onChange={e => setNewRole(r => ({ ...r, start_date: e.target.value }))} className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">End Date</label>
                    <div className="flex items-center gap-2">
                      <input type="month" value={newRole.end_date} disabled={newRole.is_current} onChange={e => setNewRole(r => ({ ...r, end_date: e.target.value }))} className="flex-1 px-3 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100" />
                      <label className="flex items-center gap-1 text-xs text-gray-600 cursor-pointer whitespace-nowrap">
                        <input type="checkbox" checked={newRole.is_current} onChange={e => setNewRole(r => ({ ...r, is_current: e.target.checked, end_date: e.target.checked ? '' : r.end_date }))} className="rounded" />
                        Current
                      </label>
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Role Summary</label>
                  <textarea value={newRole.summary} onChange={e => setNewRole(r => ({ ...r, summary: e.target.value }))} rows={2} className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500" placeholder="Brief description of the role purpose..." />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Key Achievements / Responsibilities</label>
                  <textarea value={newRole.achievements} onChange={e => setNewRole(r => ({ ...r, achievements: e.target.value }))} rows={2} className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500" placeholder="What did you achieve or deliver in this role?" />
                </div>
                <div className="flex gap-2">
                  <button onClick={addRoleEntry} className="px-4 py-1.5 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700">Add</button>
                  <button onClick={() => setAddingRole(false)} className="px-4 py-1.5 bg-gray-200 text-gray-700 rounded text-sm hover:bg-gray-300">Cancel</button>
                </div>
              </div>
            )}

            {/* Role list */}
            {profileForm.role_history.length === 0 && !addingRole ? (
              <p className="text-sm text-gray-400 italic py-2">{isEditing ? 'No previous roles added yet. Use "Add Role" above.' : 'No previous roles recorded.'}</p>
            ) : (
              <div className="space-y-3">
                {(isEditing ? profileForm.role_history : cp?.role_history || []).map((r) => (
                  <div key={r.id} className="flex gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-0.5">
                        <span className="font-semibold text-sm text-gray-900">{r.role_title}</span>
                        {r.is_current && <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">Current</span>}
                      </div>
                      <p className="text-xs text-gray-500 mb-1">
                        {r.department}{r.start_date ? ` · ${r.start_date}` : ''}{(r.end_date || r.is_current) ? ` – ${r.is_current ? 'Present' : r.end_date}` : ''}
                      </p>
                      {r.summary && <p className="text-sm text-gray-700 mb-1">{r.summary}</p>}
                      {r.achievements && <p className="text-xs text-gray-600 italic">{r.achievements}</p>}
                    </div>
                    {isEditing && (
                      <button onClick={() => removeRoleEntry(r.id)} className="text-red-400 hover:text-red-600 flex-shrink-0 mt-0.5">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Section 3: Skills ── */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 bg-gray-50 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center"><Star className="w-4 h-4 text-amber-600" /></div>
              <h3 className="font-semibold text-gray-900">Skills</h3>
            </div>
            {isEditing && !addingSkill && (
              <button onClick={() => setAddingSkill(true)} className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium">
                <Plus className="w-4 h-4" />Add Skill
              </button>
            )}
          </div>
          <div className="p-6">
            {isEditing && addingSkill && (
              <div className="mb-5 p-4 bg-amber-50 rounded-lg border border-amber-200 space-y-3">
                <p className="text-sm font-semibold text-amber-900">Add Skill</p>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Skill Name *</label>
                    <input type="text" value={newSkill.skill_name} onChange={e => setNewSkill(s => ({ ...s, skill_name: e.target.value }))} className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500" placeholder="e.g. Data Analysis" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Category</label>
                    <select value={newSkill.category} onChange={e => setNewSkill(s => ({ ...s, category: e.target.value }))} className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500">
                      <option value="">Select category</option>
                      {SKILL_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Confidence Level</label>
                    <select value={newSkill.confidence_level} onChange={e => setNewSkill(s => ({ ...s, confidence_level: e.target.value }))} className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500">
                      <option value="">Select level</option>
                      {CONFIDENCE_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Evidence / Example</label>
                    <input type="text" value={newSkill.evidence} onChange={e => setNewSkill(s => ({ ...s, evidence: e.target.value }))} className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500" placeholder="e.g. Led reporting project for Q1" />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={addSkillEntry} className="px-4 py-1.5 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700">Add</button>
                  <button onClick={() => setAddingSkill(false)} className="px-4 py-1.5 bg-gray-200 text-gray-700 rounded text-sm hover:bg-gray-300">Cancel</button>
                </div>
              </div>
            )}

            {profileForm.additional_skills.length === 0 && !addingSkill ? (
              <p className="text-sm text-gray-400 italic py-2">{isEditing ? 'No skills added yet. Use "Add Skill" above.' : 'No additional skills recorded.'}</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {(isEditing ? profileForm.additional_skills : cp?.additional_skills || []).map((s) => (
                  <div key={s.id} className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm ${
                    s.confidence_level === 'Expert' ? 'bg-green-50 border-green-300 text-green-800' :
                    s.confidence_level === 'Proficient' ? 'bg-blue-50 border-blue-300 text-blue-800' :
                    s.confidence_level === 'Competent' ? 'bg-teal-50 border-teal-300 text-teal-800' :
                    'bg-gray-50 border-gray-300 text-gray-700'
                  }`}>
                    <span className="font-medium">{s.skill_name}</span>
                    {s.category && <span className="text-xs opacity-70">· {s.category}</span>}
                    {s.confidence_level && <span className="text-xs opacity-70">· {s.confidence_level}</span>}
                    {isEditing && (
                      <button onClick={() => removeSkillEntry(s.id)} className="text-red-400 hover:text-red-600 ml-0.5">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Section 4: Qualifications & Training ── */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 bg-gray-50 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-teal-100 rounded-lg flex items-center justify-center"><GraduationCap className="w-4 h-4 text-teal-600" /></div>
              <h3 className="font-semibold text-gray-900">Qualifications & Training</h3>
            </div>
            {isEditing && !addingQual && (
              <button onClick={() => setAddingQual(true)} className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium">
                <Plus className="w-4 h-4" />Add Qualification
              </button>
            )}
          </div>
          <div className="p-6">
            {isEditing && addingQual && (
              <div className="mb-5 p-4 bg-teal-50 rounded-lg border border-teal-200 space-y-3">
                <p className="text-sm font-semibold text-teal-900">Add Qualification / Training</p>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Name *</label>
                    <input type="text" value={newQual.name} onChange={e => setNewQual(q => ({ ...q, name: e.target.value }))} className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500" placeholder="e.g. Level 3 Customer Service" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Provider</label>
                    <input type="text" value={newQual.provider} onChange={e => setNewQual(q => ({ ...q, provider: e.target.value }))} className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500" placeholder="e.g. City & Guilds" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Date Completed</label>
                    <input type="month" value={newQual.date_completed} onChange={e => setNewQual(q => ({ ...q, date_completed: e.target.value }))} className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Expiry Date (if applicable)</label>
                    <input type="month" value={newQual.expiry_date} onChange={e => setNewQual(q => ({ ...q, expiry_date: e.target.value }))} className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Evidence / Link</label>
                    <input type="text" value={newQual.evidence_link} onChange={e => setNewQual(q => ({ ...q, evidence_link: e.target.value }))} className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500" placeholder="Certificate reference or link" />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={addQualEntry} className="px-4 py-1.5 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700">Add</button>
                  <button onClick={() => setAddingQual(false)} className="px-4 py-1.5 bg-gray-200 text-gray-700 rounded text-sm hover:bg-gray-300">Cancel</button>
                </div>
              </div>
            )}

            {profileForm.qualifications_training.length === 0 && !addingQual ? (
              <p className="text-sm text-gray-400 italic py-2">{isEditing ? 'No qualifications added yet. Use "Add Qualification" above.' : 'No qualifications or training recorded.'}</p>
            ) : (
              <div className="space-y-3">
                {(isEditing ? profileForm.qualifications_training : cp?.qualifications_training || []).map((q) => (
                  <div key={q.id} className="flex gap-3 items-start p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="w-8 h-8 bg-teal-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                      <GraduationCap className="w-4 h-4 text-teal-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-gray-900">{q.name}</p>
                      <p className="text-xs text-gray-500">
                        {q.provider}{q.date_completed ? ` · Completed ${q.date_completed}` : ''}
                        {q.expiry_date ? ` · Expires ${q.expiry_date}` : ''}
                      </p>
                      {q.evidence_link && <p className="text-xs text-blue-600 mt-0.5 truncate">{q.evidence_link}</p>}
                    </div>
                    {isEditing && (
                      <button onClick={() => removeQualEntry(q.id)} className="text-red-400 hover:text-red-600 flex-shrink-0 mt-0.5">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Section 5: Career Interests / Goals ── */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="flex items-center gap-3 px-6 py-4 bg-gray-50 border-b border-gray-200">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center"><Target className="w-4 h-4 text-blue-600" /></div>
            <div>
              <h3 className="font-semibold text-gray-900">Career Interests & Goals</h3>
              <p className="text-xs text-gray-400">Used by SERA to support career coaching and the AI Career Quiz</p>
            </div>
          </div>
          <div className="p-6">
            {isEditing ? (
              <textarea
                value={profileForm.career_goals}
                onChange={e => setProfileForm(f => ({ ...f, career_goals: e.target.value }))}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                placeholder="Describe where you'd like to take your career — roles you're interested in, areas you want to develop, or longer-term aspirations..."
              />
            ) : cp?.career_goals ? (
              <p className="text-sm text-gray-700 leading-relaxed">{cp.career_goals}</p>
            ) : (
              <p className="text-sm text-gray-400 italic">No career goals added yet.</p>
            )}
          </div>
        </div>
      </div>
    );
  };

  const STATUS_LABELS: Record<string, string> = {
    draft: 'Draft',
    sent_to_manager: 'Sent to Manager',
    manager_approved: 'Manager Approved',
    admin_approved: 'Approved',
    rejected: 'Rejected',
    pending_employee_input: 'Action Required',
    pending_manager_wayforward: 'Awaiting Way Forward',
    in_progress: 'In Progress',
    completed: 'Completed',
  };

  const STATUS_COLORS: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-700',
    sent_to_manager: 'bg-yellow-100 text-yellow-800',
    manager_approved: 'bg-blue-100 text-blue-800',
    admin_approved: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
    pending_employee_input: 'bg-orange-100 text-orange-800',
    pending_manager_wayforward: 'bg-blue-100 text-blue-800',
    in_progress: 'bg-teal-100 text-teal-800',
    completed: 'bg-green-100 text-green-800',
  };

  const renderPlans = () => {
    const pendingInputPlans = myPlans.filter(p => p.status === 'pending_employee_input');
    const otherPlans = myPlans.filter(p => p.status !== 'pending_employee_input');

    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">My Career Plans</h2>
          <p className="text-gray-600">View and track your career development plans</p>
        </div>

        {/* Action-required banners */}
        {pendingInputPlans.map(plan => (
          <div key={plan.id} className="bg-teal-50 border border-teal-300 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 bg-teal-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                <Target className="w-5 h-5 text-teal-700" />
              </div>
              <div>
                <p className="font-semibold text-teal-900 text-sm">
                  Career Plan started for you: <span className="font-bold">{plan.goal_role_custom_title || plan.goal_role_title || 'New Role'}</span>
                </p>
                <p className="text-xs text-teal-700 mt-0.5">
                  {plan.created_by_name ? `${plan.created_by_name} has` : 'Your manager has'} started this plan and is waiting for your self-assessment.
                  {plan.target_department ? ` · ${plan.target_department}` : ''}
                </p>
              </div>
            </div>
            <button
              onClick={() => setOpenInitiatedPlanId(plan.id)}
              className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white text-sm font-semibold rounded-lg hover:bg-teal-700 transition-colors whitespace-nowrap flex-shrink-0"
            >
              Start Now
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        ))}

        {myPlans.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
            <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-4">No career plans yet</p>
            <button
              onClick={() => setActiveTab('explore')}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Explore Careers
            </button>
          </div>
        ) : otherPlans.length === 0 && pendingInputPlans.length > 0 ? null : (
          <div className="grid gap-4">
            {otherPlans.map(plan => {
              const creatorLabel =
                plan.created_by_role === 'admin'
                  ? `Created by admin${plan.created_by_name ? ` — ${plan.created_by_name}` : ''}`
                  : plan.created_by_role === 'manager' || plan.created_by_role === 'dept_lead'
                    ? `Created by your manager${plan.created_by_name ? ` — ${plan.created_by_name}` : ''}`
                    : null;

              const notes = plan.manager_comments || (plan as any).manager_notes || (plan as any).initiator_notes;
              const statusLabel = STATUS_LABELS[plan.status] || plan.status.replace(/_/g, ' ');
              const statusColor = STATUS_COLORS[plan.status] || 'bg-gray-100 text-gray-700';

              return (
                <div key={plan.id} className="bg-white rounded-xl border border-gray-200 p-6 hover:border-gray-300 transition-colors">
                  <div className="flex items-start justify-between mb-3 gap-3">
                    <div className="min-w-0">
                      <h3 className="text-lg font-semibold text-gray-900 truncate">
                        {plan.goal_role_custom_title || plan.goal_role_title || 'Career Plan'}
                      </h3>
                      <p className="text-sm text-gray-500 mt-0.5">
                        Created {new Date(plan.created_at).toLocaleDateString()}
                        {plan.recommended_timeline_months ? ` · ${plan.recommended_timeline_months} month timeline` : ''}
                        {plan.target_department ? ` · ${plan.target_department}` : ''}
                      </p>
                    </div>
                    <span className={`px-3 py-1 text-xs font-semibold rounded-full flex-shrink-0 whitespace-nowrap ${statusColor}`}>
                      {statusLabel}
                    </span>
                  </div>

                  {creatorLabel && (
                    <div className="flex items-center gap-1.5 mb-3 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg w-fit">
                      <User className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                      <span className="text-xs text-slate-600">{creatorLabel}</span>
                    </div>
                  )}

                  {plan.status === 'in_progress' && (
                    <div className="flex items-center gap-2 mb-3 px-3 py-2 bg-teal-50 border border-teal-200 rounded-lg">
                      <CheckCircle className="w-4 h-4 text-teal-600 flex-shrink-0" />
                      <span className="text-xs text-teal-700 font-medium">Way Forward confirmed — plan is active</span>
                    </div>
                  )}

                  {plan.status === 'pending_manager_wayforward' && (
                    <div className="flex items-center gap-2 mb-3 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg">
                      <Clock className="w-4 h-4 text-blue-600 flex-shrink-0" />
                      <span className="text-xs text-blue-700 font-medium">Your self-assessment is complete — waiting for your manager to add the Way Forward</span>
                    </div>
                  )}

                  {notes && (
                    <div className="bg-blue-50 rounded-lg p-3 mt-2">
                      <div className="text-sm font-semibold text-blue-900 mb-1">Notes</div>
                      <p className="text-sm text-blue-800">{notes}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const renderExplore = () => {
    const exploreDepts = [...new Set(jobFamilies.map(jf => jf.department))].sort();

    return (
      <div className="space-y-6">
        {/* Hero */}
        <div className="bg-gradient-to-r from-blue-50 to-teal-50 rounded-xl p-6 border border-blue-200">
          <div className="flex items-start gap-4 mb-4">
            <Compass className="w-10 h-10 text-blue-600 flex-shrink-0 mt-1" />
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-1">Explore Career Opportunities</h2>
              <p className="text-gray-600 text-sm">Browse role profiles across the organisation. Click any role to see the full profile, progression routes, and how to get there.</p>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => onNavigate?.('/career-quiz')}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold text-sm"
            >
              <Brain className="w-4 h-4" />
              Career Quiz
            </button>
            <button
              onClick={() => onNavigate?.('/career-coach')}
              className="flex items-center gap-2 px-5 py-2.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 font-semibold text-sm"
            >
              <MessageSquare className="w-4 h-4" />
              Talk to SERA
            </button>
          </div>
        </div>

        {exploreDepts.map(department => {
          const deptFamilies = jobFamilies
            .filter(jf => jf.department === department)
            .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));

          // Group by pathway within department
          const pathways = [...new Set(deptFamilies.map(jf => jf.pathway || ''))].sort();

          return (
            <div key={department} className="space-y-4">
              <h3 className="text-xl font-bold text-gray-900 border-b-2 border-gray-200 pb-2">{department}</h3>

              {pathways.map(pathway => {
                const pathFamilies = deptFamilies.filter(jf => (jf.pathway || '') === pathway);
                return (
                  <div key={pathway} className="space-y-3">
                    {pathway && (
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-teal-700 bg-teal-50 border border-teal-200 px-3 py-1 rounded-full">{pathway}</span>
                        <div className="flex-1 h-px bg-teal-100" />
                      </div>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {pathFamilies.map(jf => {
                        const isExpanded = expandedJobFamily === jf.id;
                        const isCurrent = jf.id === currentJobFamily?.id;

                        return (
                          <div
                            key={jf.id}
                            className={`bg-white rounded-xl border transition-all ${
                              isExpanded
                                ? 'border-blue-400 shadow-2xl col-span-1 md:col-span-2 lg:col-span-3'
                                : isCurrent
                                ? 'border-blue-300 shadow-md hover:shadow-lg'
                                : 'border-gray-200 hover:border-blue-300 hover:shadow-md'
                            }`}
                          >
                            {/* Card header — always visible */}
                            <div className="p-5">
                              <div className="flex items-start justify-between gap-3 mb-3">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap mb-1">
                                    <h4 className="font-bold text-gray-900 text-base">{jf.title}</h4>
                                    {isCurrent && (
                                      <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs font-semibold rounded-full">Your Role</span>
                                    )}
                                  </div>
                                  <div className="flex flex-wrap items-center gap-1.5">
                                    <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{jf.level}</span>
                                    {jf.reports_to && (
                                      <span className="text-xs text-gray-400">Reports to: {jf.reports_to}</span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {jf.description && (
                                <p className={`text-sm text-gray-600 leading-relaxed ${isExpanded ? '' : 'line-clamp-2'}`}>
                                  {jf.description}
                                </p>
                              )}

                              {/* Skill preview when collapsed */}
                              {!isExpanded && jf.skills && jf.skills.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-3">
                                  {jf.skills.slice(0, 4).map((s, i) => (
                                    <span key={i} className="text-xs px-2 py-0.5 bg-blue-50 text-blue-700 rounded border border-blue-100">{s}</span>
                                  ))}
                                  {jf.skills.length > 4 && (
                                    <span className="text-xs px-2 py-0.5 text-gray-400">+{jf.skills.length - 4}</span>
                                  )}
                                </div>
                              )}
                            </div>

                            {/* Expanded full role profile */}
                            {isExpanded && (
                              <div className="border-t border-gray-100 px-5 pb-5 space-y-6 pt-4">

                                {/* Accountabilities & What Great Looks Like */}
                                {jf.accountabilities && jf.accountabilities.length > 0 && (
                                  <div>
                                    <h5 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                      <CheckCircle className="w-4 h-4 text-blue-600" />
                                      Accountabilities &amp; What Great Looks Like
                                    </h5>
                                    <div className="space-y-2">
                                      {jf.accountabilities.map((acc, idx) => (
                                        <div key={idx} className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                          <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                                            <p className="text-xs font-semibold text-gray-500 mb-1">Accountability</p>
                                            <p className="text-sm text-gray-700">{acc}</p>
                                          </div>
                                          {jf.what_great_looks_like?.[idx] && (
                                            <div className="bg-green-50 rounded-lg p-3 border border-green-200">
                                              <p className="text-xs font-semibold text-green-700 mb-1">What Great Looks Like</p>
                                              <p className="text-sm text-gray-700">{jf.what_great_looks_like[idx]}</p>
                                            </div>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Technical Skills */}
                                {jf.skills && jf.skills.length > 0 && (
                                  <div>
                                    <h5 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                                      <Star className="w-4 h-4 text-blue-600" />
                                      Technical Skills
                                    </h5>
                                    <div className="flex flex-wrap gap-2">
                                      {jf.skills.map((skill, idx) => (
                                        <span key={idx} className="px-3 py-1 bg-blue-50 border border-blue-200 text-blue-800 text-sm rounded-full">{skill}</span>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Knowledge */}
                                {jf.experience && jf.experience.length > 0 && (
                                  <div>
                                    <h5 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                                      <BookOpen className="w-4 h-4 text-teal-600" />
                                      Knowledge
                                    </h5>
                                    <div className="flex flex-wrap gap-2">
                                      {jf.experience.map((exp, idx) => (
                                        <span key={idx} className="px-3 py-1 bg-teal-50 border border-teal-200 text-teal-800 text-sm rounded-full">{exp}</span>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Qualifications */}
                                {jf.qualifications_training && jf.qualifications_training.length > 0 && (
                                  <div>
                                    <h5 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                                      <GraduationCap className="w-4 h-4 text-gray-600" />
                                      Qualifications
                                    </h5>
                                    <div className="flex flex-wrap gap-2">
                                      {jf.qualifications_training.map((q, idx) => (
                                        <span key={idx} className="px-3 py-1 bg-gray-50 border border-gray-200 text-gray-700 text-sm rounded-full">{q}</span>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Recommended Previous Roles */}
                                {jf.recommended_prev_roles && jf.recommended_prev_roles.length > 0 && (
                                  <div>
                                    <h5 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                                      <Briefcase className="w-4 h-4 text-gray-600" />
                                      Recommended Previous Roles
                                    </h5>
                                    <div className="flex flex-wrap gap-2">
                                      {jf.recommended_prev_roles.map((r, idx) => (
                                        <span key={idx} className="px-3 py-1 bg-gray-50 border border-gray-200 text-gray-700 text-sm rounded-lg">{r}</span>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Recommended Learning */}
                                {jf.recommended_learning && jf.recommended_learning.length > 0 && (
                                  <div>
                                    <h5 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                                      <Award className="w-4 h-4 text-amber-600" />
                                      Recommended Learning
                                    </h5>
                                    <div className="grid md:grid-cols-2 gap-2">
                                      {jf.recommended_learning.map((r, idx) => (
                                        <div key={idx} className="flex items-start gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-sm text-gray-700">
                                          <CheckCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                                          {r}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Progression To */}
                                {jf.progression_to && (
                                  <div>
                                    <h5 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                                      <TrendingUp className="w-4 h-4 text-green-600" />
                                      Progression To
                                    </h5>
                                    <div className="flex flex-wrap gap-2">
                                      {jf.progression_to.split(',').map((t, idx) => (
                                        <span key={idx} className="px-3 py-2 bg-green-50 border border-green-200 text-green-800 text-sm rounded-lg font-medium flex items-center gap-1">
                                          <TrendingUp className="w-3.5 h-3.5" />
                                          {t.trim()}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Alternative Roles Based On This Skill Set */}
                                {jf.alternative_paths && jf.alternative_paths.length > 0 && (
                                  <div>
                                    <h5 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                                      <ChevronDown className="w-4 h-4 text-blue-500" />
                                      Alternative Roles Based On This Skill Set
                                    </h5>
                                    <div className="flex flex-wrap gap-2">
                                      {jf.alternative_paths.map((path, idx) => (
                                        <span key={idx} className="px-3 py-1.5 bg-blue-50 border border-blue-200 text-blue-800 text-sm rounded-lg">{path}</span>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* How Do I Get There */}
                                {jf.how_do_i_get_there && (
                                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                                    <h5 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                                      <Target className="w-4 h-4 text-amber-600" />
                                      How Do I Get There
                                    </h5>
                                    <p className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">{jf.how_do_i_get_there}</p>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Toggle button + Recommend Edit (dept leads only) */}
                            <div className={`px-5 pb-4 space-y-2 ${isExpanded ? '' : 'pt-0'}`}>
                              {isExpanded && activeProfile?.role === 'leadership' && (
                                <button
                                  onClick={() => {
                                    setRecommendingFor(jf);
                                    setRecFieldName('');
                                    setRecSuggestedValue('');
                                    setRecRationale('');
                                    setRecSuccess(false);
                                  }}
                                  className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium text-sm border border-teal-300 text-teal-700 bg-teal-50 hover:bg-teal-100 transition-colors"
                                >
                                  <PenLine className="w-4 h-4" />
                                  Recommend Edit
                                </button>
                              )}
                              <button
                                onClick={() => setExpandedJobFamily(isExpanded ? null : jf.id)}
                                className={`w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                                  isExpanded
                                    ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                    : 'bg-blue-600 text-white hover:bg-blue-700'
                                }`}
                              >
                                {isExpanded
                                  ? <><ChevronUp className="w-4 h-4" /> Hide Profile</>
                                  : <><ChevronDown className="w-4 h-4" /> View Full Profile</>
                                }
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="inline-block w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-gray-600">Loading career pathways...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Career Pathways</h1>
        <p className="text-gray-600 mt-2">Plan your professional growth and explore opportunities</p>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-gray-200">
        {[
          { id: 'progression', label: 'My Progression', icon: TrendingUp },
          { id: 'profile', label: 'My Profile', icon: User },
          { id: 'plans', label: 'My Plans', icon: FileText },
          { id: 'explore', label: 'Explore Careers', icon: Compass },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-3 font-medium transition-colors ${
                activeTab === tab.id
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Icon className="w-5 h-5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="min-h-screen">
        {activeTab === 'progression' && renderProgression()}
        {activeTab === 'profile' && renderProfile()}
        {activeTab === 'plans' && renderPlans()}
        {activeTab === 'explore' && renderExplore()}
      </div>

      {/* Initiated Career Plan Quiz Overlay */}
      {openInitiatedPlanId && (
        <div className="fixed inset-0 bg-black/50 z-50 overflow-y-auto">
          <InitiatedCareerPlanQuiz
            planId={openInitiatedPlanId}
            onClose={() => setOpenInitiatedPlanId(null)}
            onComplete={() => {
              setOpenInitiatedPlanId(null);
              fetchMyPlans();
            }}
          />
        </div>
      )}

      {/* Recommend Edit Modal */}
      {recommendingFor && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto">
            {recSuccess ? (
              <div className="p-8 text-center">
                <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-7 h-7 text-green-600" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">Recommendation Submitted</h3>
                <p className="text-sm text-gray-600">Your suggestion has been sent to the admin team for review.</p>
              </div>
            ) : (
              <>
                <div className="flex items-start justify-between p-6 border-b border-gray-200">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Recommend an Edit</h3>
                    <p className="text-sm text-gray-500 mt-0.5">{recommendingFor.title} · {recommendingFor.department}</p>
                  </div>
                  <button
                    onClick={() => setRecommendingFor(null)}
                    className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="p-6 space-y-5">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Which field are you recommending an edit for? *</label>
                    <select
                      value={recFieldName}
                      onChange={e => {
                        setRecFieldName(e.target.value);
                        setRecSuggestedValue('');
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                    >
                      <option value="">Select a field...</option>
                      {RECOMMEND_FIELDS.map(f => (
                        <option key={f.name} value={f.name}>{f.label}</option>
                      ))}
                    </select>
                  </div>

                  {recFieldName && (
                    <>
                      {/* Current value */}
                      {(() => {
                        const currentVal = getCurrentValueForField(recommendingFor, recFieldName);
                        return currentVal ? (
                          <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1.5">Current Value</label>
                            <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-600 whitespace-pre-wrap max-h-32 overflow-y-auto">
                              {currentVal}
                            </div>
                          </div>
                        ) : null;
                      })()}

                      {/* Suggested value */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                          Suggested Value *
                          {RECOMMEND_FIELDS.find(f => f.name === recFieldName)?.isArray && (
                            <span className="ml-2 text-xs font-normal text-gray-400">(one item per line)</span>
                          )}
                        </label>
                        <textarea
                          value={recSuggestedValue}
                          onChange={e => setRecSuggestedValue(e.target.value)}
                          rows={5}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                          placeholder={
                            RECOMMEND_FIELDS.find(f => f.name === recFieldName)?.isArray
                              ? 'Enter each item on a new line...'
                              : 'Enter your suggested replacement text...'
                          }
                        />
                      </div>

                      {/* Rationale */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Rationale *</label>
                        <textarea
                          value={recRationale}
                          onChange={e => setRecRationale(e.target.value)}
                          rows={3}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                          placeholder="Briefly explain why this change would improve the role profile..."
                        />
                      </div>
                    </>
                  )}

                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={() => setRecommendingFor(null)}
                      className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium text-sm"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={submitRecommendation}
                      disabled={recSubmitting || !recFieldName || !recSuggestedValue.trim() || !recRationale.trim()}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {recSubmitting ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                      Submit Recommendation
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}