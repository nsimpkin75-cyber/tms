import { useState, useEffect } from 'react';
import { Target, Brain, BookOpen, TrendingUp, Save, Send, ArrowLeft, ArrowRight, X, CheckCircle, AlertCircle, Star, Clock, User, Sparkles, ChevronDown, ChevronUp, RotateCcw } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

type QuizStep = 1 | 2 | 3 | 4;

interface Pathway {
  id: string;
  title: string;
  department: string;
  pathway: string | null;
  team: string | null;
  level: string;
  skills: string[];
  how_do_i_get_there: string | null;
  progression_to: string | null;
  alternative_paths: string[];
  sort_order: number | null;
  accountabilities: string[];
  what_great_looks_like: string[];
}

interface AssessedSkill {
  skill_id: string;
  skill_name: string;
  category: string;
  current_level: number; // 1-5
}

interface ReadinessCheck {
  overall: 'ready' | 'partially_ready' | 'not_ready';
  criteria: Array<{
    label: string;
    met: boolean;
    detail: string;
  }>;
  caveat: string;
}

interface Recommendation {
  type: 'skill' | 'training' | 'action' | 'alternative_role';
  title: string;
  detail: string;
}

interface AICareerQuizProps {
  onNavigate?: (path: string) => void;
}

const SKILL_RATING_OPTIONS = [
  { value: 'not_started', label: 'Not started', score: 1, color: 'bg-gray-100 text-gray-700 border-gray-300' },
  { value: 'developing', label: 'Developing', score: 2, color: 'bg-amber-50 text-amber-700 border-amber-300' },
  { value: 'competent', label: 'Competent', score: 3, color: 'bg-blue-50 text-blue-700 border-blue-300' },
  { value: 'proficient', label: 'Proficient', score: 4, color: 'bg-teal-50 text-teal-700 border-teal-300' },
  { value: 'expert', label: 'Expert', score: 5, color: 'bg-green-50 text-green-700 border-green-300' },
];

function ratingScore(r: string): number {
  return SKILL_RATING_OPTIONS.find(o => o.value === r)?.score ?? 1;
}

export default function AICareerQuiz({ onNavigate }: AICareerQuizProps = {}) {
  const { profile, user } = useAuth();
  const [currentStep, setCurrentStep] = useState<QuizStep>(1);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);

  // Step 1: Choose Role
  const [departments, setDepartments] = useState<string[]>([]);
  const [allPathways, setAllPathways] = useState<Pathway[]>([]);
  const [selectedDept, setSelectedDept] = useState('');
  const [deptPathways, setDeptPathways] = useState<Pathway[]>([]);
  const [selectedPathwayId, setSelectedPathwayId] = useState('');
  const [selectedPathway, setSelectedPathway] = useState<Pathway | null>(null);

  // Step 2: Reality Check (pulled from profile, expandable)
  const [profileSnapshot, setProfileSnapshot] = useState({
    currentRole: '',
    department: '',
    team: '',
    lengthOfService: '',
    performanceAvg: null as number | null,
  });
  const [assessedSkills, setAssessedSkills] = useState<AssessedSkill[]>([]);
  const [extraQualifications, setExtraQualifications] = useState('');
  const [extraExperience, setExtraExperience] = useState('');
  const [extraContext, setExtraContext] = useState('');

  // Step 3: Skills Match
  const [roleSkillRatings, setRoleSkillRatings] = useState<Record<string, string>>({});

  // Step 4: Summary & Decision
  const [readinessResult, setReadinessResult] = useState<ReadinessCheck | null>(null);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [showReadiness, setShowReadiness] = useState(true);

  useEffect(() => {
    init();
  }, [profile?.id]);

  useEffect(() => {
    if (selectedDept) {
      const filtered = allPathways.filter(p => p.department === selectedDept);
      setDeptPathways(filtered);
      setSelectedPathwayId('');
      setSelectedPathway(null);
    }
  }, [selectedDept, allPathways]);

  useEffect(() => {
    if (selectedPathwayId) {
      const pw = deptPathways.find(p => p.id === selectedPathwayId) || null;
      setSelectedPathway(pw);
      // Pre-fill skill ratings from assessed skills where name matches
      if (pw && assessedSkills.length > 0) {
        const initialRatings: Record<string, string> = {};
        pw.skills.forEach(skillName => {
          const assessed = assessedSkills.find(
            a => a.skill_name.trim().toLowerCase() === skillName.trim().toLowerCase()
          );
          if (assessed) {
            const lvl = assessed.current_level;
            const option = SKILL_RATING_OPTIONS.find(o => o.score === lvl);
            if (option) initialRatings[skillName] = option.value;
          }
        });
        setRoleSkillRatings(prev => ({ ...initialRatings, ...prev }));
      }
    }
  }, [selectedPathwayId]);

  const init = async () => {
    setPageLoading(true);
    try {
      // Timeout guard: never let the page spinner run forever
      const timeout = new Promise<void>(resolve => setTimeout(resolve, 10000));
      await Promise.race([
        Promise.allSettled([loadPathways(), loadProfileData(), loadExistingSession()]),
        timeout,
      ]);
    } finally {
      setPageLoading(false);
    }
  };

  const loadPathways = async () => {
    try {
    const { data } = await supabase
      .from('job_families')
      .select('id, title, department, pathway, team, level, skills, how_do_i_get_there, progression_to, alternative_paths, sort_order, accountabilities, what_great_looks_like')
      .order('department')
      .order('sort_order', { ascending: true });

    const pathways: Pathway[] = (data || []).map((p: any) => ({
      id: p.id,
      title: p.title,
      department: p.department,
      pathway: p.pathway || null,
      team: p.team || null,
      level: p.level,
      skills: Array.isArray(p.skills) ? p.skills : [],
      how_do_i_get_there: p.how_do_i_get_there || null,
      progression_to: p.progression_to || null,
      alternative_paths: Array.isArray(p.alternative_paths) ? p.alternative_paths : [],
      sort_order: p.sort_order ?? null,
      accountabilities: Array.isArray(p.accountabilities) ? p.accountabilities : [],
      what_great_looks_like: Array.isArray(p.what_great_looks_like) ? p.what_great_looks_like : [],
    }));
    setAllPathways(pathways);
    const depts = [...new Set(pathways.map(p => p.department))].sort();
    setDepartments(depts);
    } catch (err) {
      console.error('loadPathways error:', err);
    }
  };

  const loadProfileData = async () => {
    if (!user?.id) return;
    try {
    const [profileRes, skillsRes, reviewsRes] = await Promise.all([
      supabase.from('profiles').select('job_title, department, start_date').eq('id', user.id).maybeSingle(),
      supabase
        .from('skill_assessments')
        .select('skill_id, current_level, skills!skill_assessments_skill_id_fkey(name, category)')
        .eq('profile_id', user.id)
        .order('assessment_date', { ascending: false }),
      supabase
        .from('one_to_one_monthly_reviews')
        .select('overall_competency_score, overall_kpi_average, status')
        .eq('employee_id', user.id)
        .eq('status', 'completed'),
    ]);

    // Length of service
    let los = 'Unknown';
    if (profileRes.data?.start_date) {
      const start = new Date(profileRes.data.start_date);
      const now = new Date();
      const months = (now.getFullYear() - start.getFullYear()) * 12 + now.getMonth() - start.getMonth();
      const yrs = Math.floor(months / 12);
      const mo = months % 12;
      los = yrs > 0 ? `${yrs}yr${yrs !== 1 ? 's' : ''}${mo > 0 ? ` ${mo}mo` : ''}` : `${mo} month${mo !== 1 ? 's' : ''}`;
    }

    // Performance avg
    let perfAvg: number | null = null;
    const completed = reviewsRes.data || [];
    if (completed.length > 0) {
      const scores = completed.map((r: any) => {
        const vals = [r.overall_competency_score, r.overall_kpi_average].filter((v): v is number => v !== null && v !== undefined);
        return vals.length > 0 ? vals.reduce((a: number, b: number) => a + b, 0) / vals.length : null;
      }).filter((s): s is number => s !== null);
      if (scores.length > 0) perfAvg = scores.reduce((a, b) => a + b, 0) / scores.length;
    }

    setProfileSnapshot({
      currentRole: profileRes.data?.job_title || '',
      department: profileRes.data?.department || '',
      team: (profile as any)?.team || '',
      lengthOfService: los,
      performanceAvg: perfAvg,
    });

    // Assessed skills — join alias matches the FK name used in select
    const skills: AssessedSkill[] = (skillsRes.data || []).map((s: any) => {
      const skillRow = Array.isArray(s.skills) ? s.skills[0] : s.skills;
      return {
        skill_id: s.skill_id,
        skill_name: skillRow?.name || '',
        category: skillRow?.category || '',
        current_level: s.current_level || 1,
      };
    }).filter(s => s.skill_name);
    setAssessedSkills(skills);
    } catch (err) {
      console.error('loadProfileData error:', err);
    }
  };

  const loadExistingSession = async () => {
    if (!user?.id) return;
    try {
    const { data } = await supabase
      .from('career_quiz_sessions')
      .select('*')
      .eq('user_id', user.id)
      .eq('quiz_status', 'draft')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (data) {
      setSessionId(data.id);
      setCurrentStep(1);
      setSelectedDept(data.goal_department || '');
      setSelectedPathwayId(data.goal_role_id || '');
      setExtraQualifications(data.external_qualifications_text || '');
      setExtraExperience(data.external_experience_text || '');
      setExtraContext(data.external_skills_text || '');
      setRoleSkillRatings(data.skill_ratings || {});
      if (data.sera_readiness_result && Object.keys(data.sera_readiness_result).length > 0) {
        setReadinessResult(data.sera_readiness_result);
      }
      if (data.sera_recommendations && data.sera_recommendations.length > 0) {
        setRecommendations(data.sera_recommendations);
      }
    }
    } catch (err) {
      console.error('loadExistingSession error:', err);
    }
  };

  const saveProgress = async (stepOverride?: QuizStep) => {
    if (!user?.id) return;
    const sessionData: any = {
      user_id: user.id,
      goal_role_id: selectedPathwayId || null,
      goal_role_custom_title: selectedPathway?.title || null,
      goal_department: selectedDept || null,
      external_qualifications_text: extraQualifications,
      external_experience_text: extraExperience,
      external_skills_text: extraContext,
      skill_ratings: roleSkillRatings,
      sera_readiness_result: readinessResult || {},
      sera_recommendations: recommendations,
      current_step: stepOverride ?? currentStep,
      quiz_status: 'draft',
      updated_at: new Date().toISOString(),
    };

    try {
      if (sessionId) {
        await supabase.from('career_quiz_sessions').update(sessionData).eq('id', sessionId);
      } else {
        const { data } = await supabase
          .from('career_quiz_sessions')
          .insert({ ...sessionData, created_at: new Date().toISOString() })
          .select('id')
          .maybeSingle();
        if (data?.id) setSessionId(data.id);
      }
    } catch (err) {
      console.warn('saveProgress failed (non-blocking):', err);
    }
  };

  const buildReadinessResult = (): ReadinessCheck => {
    const criteria: ReadinessCheck['criteria'] = [];

    // Service length
    const startDate = (profile as any)?.start_date;
    let losMonths = 0;
    if (startDate) {
      const start = new Date(startDate);
      const now = new Date();
      losMonths = (now.getFullYear() - start.getFullYear()) * 12 + now.getMonth() - start.getMonth();
    }
    criteria.push({
      label: 'Length of service',
      met: losMonths >= 12,
      detail: losMonths >= 12
        ? `${Math.floor(losMonths / 12)} year${Math.floor(losMonths / 12) !== 1 ? 's' : ''} of service — meets the minimum 12 months`
        : `${losMonths} months of service — typically 12+ months is expected before progression`,
    });

    // Performance
    criteria.push({
      label: 'Performance average',
      met: profileSnapshot.performanceAvg !== null && profileSnapshot.performanceAvg >= 3.0,
      detail: profileSnapshot.performanceAvg !== null
        ? `Average of ${profileSnapshot.performanceAvg.toFixed(2)}/5 from completed reviews${profileSnapshot.performanceAvg >= 3.5 ? ' — strong foundation for progression' : ' — continued improvement will strengthen your case'}`
        : 'No completed review data available — speak with your manager to ensure reviews are being completed',
    });

    // Skills match
    const targetSkills = selectedPathway?.skills || [];
    const ratedSkills = Object.entries(roleSkillRatings).filter(([, v]) => v !== '');
    const proficientCount = ratedSkills.filter(([, v]) => ratingScore(v) >= 3).length;
    const totalRequired = targetSkills.length;
    const skillsMet = totalRequired === 0 || (totalRequired > 0 && proficientCount / totalRequired >= 0.6);
    criteria.push({
      label: 'Skills match against target role',
      met: skillsMet,
      detail: totalRequired > 0
        ? `${proficientCount} of ${totalRequired} required skills rated competent or above${skillsMet ? '' : ' — work towards closing the gaps identified below'}`
        : 'No specific skills defined for this role profile yet',
    });

    // Check if in same dept or cross-dept move
    const crossDept = selectedPathway && selectedPathway.department !== profileSnapshot.department;
    if (crossDept) {
      criteria.push({
        label: 'Cross-department move',
        met: false,
        detail: `This role is in ${selectedPathway!.department}, which is a different department. Cross-department moves typically require demonstrating relevant skills or a stepping-stone role first.`,
      });
    }

    const metCount = criteria.filter(c => c.met).length;
    const overall: ReadinessCheck['overall'] = metCount === criteria.length ? 'ready'
      : metCount >= criteria.length - 1 ? 'partially_ready'
      : 'not_ready';

    return {
      overall,
      criteria,
      caveat: 'SERA does not have access to your full HR file. This guidance assumes there are no live conduct issues, warnings or pending investigations.',
    };
  };

  const buildRecommendations = (readiness: ReadinessCheck): Recommendation[] => {
    const recs: Recommendation[] = [];
    const targetSkills = selectedPathway?.skills || [];
    const gapSkills = targetSkills.filter(skill => {
      const rating = roleSkillRatings[skill];
      return !rating || ratingScore(rating) < 3;
    });

    // Skills gaps
    gapSkills.slice(0, 5).forEach(skill => {
      recs.push({
        type: 'skill',
        title: `Develop: ${skill}`,
        detail: `This skill is required for ${selectedPathway?.title} and your current self-rating suggests it needs development.`,
      });
    });

    // How do I get there
    if (selectedPathway?.how_do_i_get_there) {
      recs.push({
        type: 'action',
        title: 'Follow your pathway guidance',
        detail: selectedPathway.how_do_i_get_there,
      });
    }

    // Accountabilities to evidence
    if (selectedPathway?.accountabilities?.length) {
      recs.push({
        type: 'action',
        title: 'Build evidence of key accountabilities',
        detail: `You will need to demonstrate: ${selectedPathway.accountabilities.slice(0, 3).join('; ')}`,
      });
    }

    // Cross-dept suggestion
    const crossDept = selectedPathway && selectedPathway.department !== profileSnapshot.department;
    if (crossDept && profileSnapshot.department) {
      // Find a stepping-stone in current dept
      const currentDeptPathways = allPathways.filter(p => p.department === profileSnapshot.department);
      const steppingStone = currentDeptPathways.find(p => {
        // Look for a pathway that points toward target dept skills
        const hasOverlap = p.skills.some(s => selectedPathway!.skills.includes(s));
        return hasOverlap;
      });
      if (steppingStone) {
        recs.push({
          type: 'alternative_role',
          title: `Consider stepping stone: ${steppingStone.title}`,
          detail: `${steppingStone.title} in ${steppingStone.department} has skills overlap with your target role. Building experience there could position you better for the cross-department move.`,
        });
      }
    }

    // Alternative roles if not ready
    if (readiness.overall === 'not_ready' && selectedPathway) {
      const alternatives = allPathways.filter(p => {
        if (p.id === selectedPathway.id) return false;
        const overlap = p.skills.filter(s => selectedPathway.skills.includes(s)).length;
        return overlap >= 2 && (p.sort_order ?? 99) < (selectedPathway.sort_order ?? 99);
      }).slice(0, 2);

      alternatives.forEach(alt => {
        recs.push({
          type: 'alternative_role',
          title: `Alternative route: ${alt.title}`,
          detail: `${alt.title} (${alt.department} · ${alt.level}) shares key skills with your target role and may be a more achievable stepping stone given your current profile.`,
        });
      });
    }

    return recs;
  };

  const goToStep = (step: QuizStep) => {
    if (step === 4 && currentStep === 3) {
      const readiness = buildReadinessResult();
      const recs = buildRecommendations(readiness);
      setReadinessResult(readiness);
      setRecommendations(recs);
      saveProgress(step).catch(console.warn);
    } else {
      saveProgress(step).catch(console.warn);
    }
    setCurrentStep(step);
  };

  const handleSaveForLater = () => {
    saveProgress().catch(console.warn);
    alert('Progress saved. You can return to continue your career quiz any time.');
  };

  const handleDiscard = async () => {
    if (!confirm('Discard this draft career quiz? This cannot be undone.')) return;
    setLoading(true);
    try {
      if (sessionId) {
        await supabase
          .from('career_quiz_sessions')
          .update({ quiz_status: 'discarded' })
          .eq('id', sessionId);
      }
      // Reset all state
      setSessionId(null);
      setCurrentStep(1);
      setSelectedDept('');
      setSelectedPathwayId('');
      setSelectedPathway(null);
      setExtraQualifications('');
      setExtraExperience('');
      setExtraContext('');
      setRoleSkillRatings({});
      setReadinessResult(null);
      setRecommendations([]);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (!sessionId || !user?.id || !selectedPathwayId) return;
    setLoading(true);
    try {
      // Lock the quiz session
      await supabase
        .from('career_quiz_sessions')
        .update({ quiz_status: 'submitted', submitted_at: new Date().toISOString() })
        .eq('id', sessionId);

      // Create a confirmed career plan
      const managerProfile = await supabase
        .from('profiles')
        .select('manager_id')
        .eq('id', user.id)
        .single();

      const planData = {
        profile_id: user.id,
        user_id: user.id,
        target_job_family_id: selectedPathwayId,
        goal_role_title: selectedPathway?.title || '',
        goal_role_custom_title: selectedPathway?.title || '',
        target_department: selectedPathway?.department || '',
        quiz_session_id: sessionId,
        quiz_data: {
          extraQualifications,
          extraExperience,
          extraContext,
        },
        reality_data: profileSnapshot,
        skill_ratings: roleSkillRatings,
        skills_gaps: (selectedPathway?.skills || []).filter(s => {
          const r = roleSkillRatings[s];
          return !r || ratingScore(r) < 3;
        }),
        sera_readiness_result: readinessResult,
        sera_recommendations: recommendations,
        status: 'confirmed',
        confirmed_at: new Date().toISOString(),
        manager_id: managerProfile.data?.manager_id || null,
      };

      await supabase.from('career_plans').insert(planData);

      alert('Career quiz confirmed! Your readiness result and plan have been saved. You can now send this to your manager when ready.');
      onNavigate?.('/pathways');
    } finally {
      setLoading(false);
    }
  };

  const handleSendToManager = async () => {
    if (!user?.id || !sessionId) return;
    setLoading(true);
    try {
      // If not yet confirmed, confirm first
      let planData: any;
      if (!readinessResult) {
        alert('Please complete the quiz first.');
        setLoading(false);
        return;
      }

      const managerProfile = await supabase
        .from('profiles')
        .select('manager_id')
        .eq('id', user.id)
        .single();

      // Check if a confirmed plan already exists for this session
      const { data: existing } = await supabase
        .from('career_plans')
        .select('id')
        .eq('quiz_session_id', sessionId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (existing?.id) {
        await supabase
          .from('career_plans')
          .update({ status: 'sent_to_manager', sent_to_manager_at: new Date().toISOString() })
          .eq('id', existing.id);

        // Seed SERA recommendations as pre-populated actions
        const actionInserts = recommendations.filter(r => r.type !== 'alternative_role').map(r => ({
          plan_id: existing.id,
          title: r.title,
          description: r.detail,
          source: 'sera' as const,
          added_by: user.id,
        }));
        if (actionInserts.length > 0) {
          await supabase.from('career_plan_actions').insert(actionInserts);
        }
      } else {
        // Create and send plan
        const insertRes = await supabase.from('career_plans').insert({
          profile_id: user.id,
          user_id: user.id,
          target_job_family_id: selectedPathwayId,
          goal_role_title: selectedPathway?.title || '',
          goal_role_custom_title: selectedPathway?.title || '',
          target_department: selectedPathway?.department || '',
          quiz_session_id: sessionId,
          quiz_data: { extraQualifications, extraExperience, extraContext },
          reality_data: profileSnapshot,
          skill_ratings: roleSkillRatings,
          skills_gaps: (selectedPathway?.skills || []).filter(s => !roleSkillRatings[s] || ratingScore(roleSkillRatings[s]) < 3),
          sera_readiness_result: readinessResult,
          sera_recommendations: recommendations,
          status: 'sent_to_manager',
          confirmed_at: new Date().toISOString(),
          sent_to_manager_at: new Date().toISOString(),
          manager_id: managerProfile.data?.manager_id || null,
        }).select('id').single();

        if (insertRes.data?.id) {
          const actionInserts = recommendations.filter(r => r.type !== 'alternative_role').map(r => ({
            plan_id: insertRes.data.id,
            title: r.title,
            description: r.detail,
            source: 'sera' as const,
            added_by: user.id,
          }));
          if (actionInserts.length > 0) {
            await supabase.from('career_plan_actions').insert(actionInserts);
          }
        }
      }

      await supabase
        .from('career_quiz_sessions')
        .update({ quiz_status: 'submitted', submitted_at: new Date().toISOString() })
        .eq('id', sessionId);

      alert('Career plan sent to your manager! They will be able to review and add actions.');
      onNavigate?.('/pathways');
    } finally {
      setLoading(false);
    }
  };

  const stepLabels = ['Choose Role', 'Reality Check', 'Skills Match', 'Summary'];

  const canProceedStep1 = selectedDept && selectedPathwayId;
  const canProceedStep3 = selectedPathway && selectedPathway.skills.every(s => roleSkillRatings[s]);

  const renderStep1 = () => (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <Target className="w-7 h-7 text-blue-600" />
        <h2 className="text-xl font-bold text-gray-900">Step 1: Choose Your Target Role</h2>
      </div>
      <p className="text-gray-600 text-sm">Select a department and role from the available Role Profiles to begin your career planning journey.</p>

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">Department</label>
        <select
          value={selectedDept}
          onChange={e => setSelectedDept(e.target.value)}
          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
        >
          <option value="">Select a department...</option>
          {departments.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
      </div>

      {selectedDept && (
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Target Role</label>
          {deptPathways.length === 0 ? (
            <p className="text-sm text-gray-500 italic">No role profiles found for {selectedDept}.</p>
          ) : (
            <select
              value={selectedPathwayId}
              onChange={e => setSelectedPathwayId(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            >
              <option value="">Select a role...</option>
              {deptPathways.map(p => (
                <option key={p.id} value={p.id}>
                  {p.title} — {p.level}{p.team ? ` (${p.team})` : ''}
                </option>
              ))}
            </select>
          )}
        </div>
      )}

      {selectedPathway && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-blue-900">{selectedPathway.title}</h3>
            <span className="px-2 py-0.5 bg-blue-200 text-blue-800 text-xs font-medium rounded-full">{selectedPathway.level}</span>
          </div>
          {selectedPathway.skills.length > 0 && (
            <div>
              <div className="text-xs text-blue-700 font-medium mb-1">Required skills:</div>
              <div className="flex flex-wrap gap-1.5">
                {selectedPathway.skills.slice(0, 8).map(s => (
                  <span key={s} className="px-2 py-0.5 bg-white border border-blue-200 text-blue-700 text-xs rounded">{s}</span>
                ))}
                {selectedPathway.skills.length > 8 && (
                  <span className="text-xs text-blue-500">+{selectedPathway.skills.length - 8} more</span>
                )}
              </div>
            </div>
          )}
          {selectedPathway.how_do_i_get_there && (
            <div className="text-xs text-blue-800">
              <span className="font-medium">Progression guidance: </span>{selectedPathway.how_do_i_get_there.slice(0, 150)}{selectedPathway.how_do_i_get_there.length > 150 ? '...' : ''}
            </div>
          )}
        </div>
      )}
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <Brain className="w-7 h-7 text-teal-600" />
        <h2 className="text-xl font-bold text-gray-900">Step 2: Reality Check</h2>
      </div>
      <p className="text-gray-600 text-sm">SERA has pulled your profile data below. You can expand any section to add context, but your profile data will not be changed.</p>

      {/* Live profile data */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-5 space-y-4">
        <div className="flex items-center gap-2 mb-3">
          <User className="w-4 h-4 text-gray-500" />
          <h3 className="text-sm font-semibold text-gray-800">Your Current Profile</h3>
          <span className="text-xs text-gray-400 ml-auto">Pulled from your profile · read-only</span>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-xs text-gray-500">Current Role</div>
            <div className="text-sm font-medium text-gray-900">{profileSnapshot.currentRole || 'Not set'}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500">Department</div>
            <div className="text-sm font-medium text-gray-900">
              {profileSnapshot.department || 'Not set'}
              {profileSnapshot.team ? <span className="text-xs text-gray-400 ml-1">· {profileSnapshot.team}</span> : null}
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-500">Length of Service</div>
            <div className="text-sm font-medium text-gray-900 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-gray-400" />
              {profileSnapshot.lengthOfService}
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-500">Performance Average</div>
            <div className={`text-sm font-semibold flex items-center gap-1 ${
              profileSnapshot.performanceAvg === null ? 'text-gray-400' :
              profileSnapshot.performanceAvg >= 4 ? 'text-green-700' :
              profileSnapshot.performanceAvg >= 3 ? 'text-blue-700' : 'text-amber-700'
            }`}>
              <Star className="w-3.5 h-3.5" />
              {profileSnapshot.performanceAvg !== null ? `${profileSnapshot.performanceAvg.toFixed(2)} / 5` : 'No completed reviews'}
            </div>
          </div>
        </div>

        {assessedSkills.length > 0 && (
          <div>
            <div className="text-xs text-gray-500 mb-2">Skills from assessments ({assessedSkills.length})</div>
            <div className="flex flex-wrap gap-1.5">
              {assessedSkills.slice(0, 12).map(s => (
                <span key={s.skill_id} className="px-2 py-0.5 bg-white border border-gray-200 text-gray-700 text-xs rounded">
                  {s.skill_name} <span className="text-gray-400">· {s.current_level}/5</span>
                </span>
              ))}
              {assessedSkills.length > 12 && <span className="text-xs text-gray-400">+{assessedSkills.length - 12} more</span>}
            </div>
          </div>
        )}
      </div>

      {/* Expandable extra context */}
      <div className="space-y-4">
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <div className="bg-white px-4 py-3">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Additional Qualifications <span className="text-xs text-gray-400">(optional)</span>
            </label>
            <textarea
              value={extraQualifications}
              onChange={e => setExtraQualifications(e.target.value)}
              placeholder="Any external certifications, degrees or training not captured in your profile..."
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm resize-none"
            />
          </div>
        </div>
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <div className="bg-white px-4 py-3">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Relevant Experience <span className="text-xs text-gray-400">(optional)</span>
            </label>
            <textarea
              value={extraExperience}
              onChange={e => setExtraExperience(e.target.value)}
              placeholder="Previous roles, projects or responsibilities relevant to your target role..."
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm resize-none"
            />
          </div>
        </div>
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <div className="bg-white px-4 py-3">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Additional Context <span className="text-xs text-gray-400">(optional)</span>
            </label>
            <textarea
              value={extraContext}
              onChange={e => setExtraContext(e.target.value)}
              placeholder="Anything else SERA should know about your situation, motivations or constraints..."
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm resize-none"
            />
          </div>
        </div>
      </div>
    </div>
  );

  const renderStep3 = () => {
    const targetSkills = selectedPathway?.skills || [];
    if (targetSkills.length === 0) {
      return (
        <div className="space-y-6">
          <div className="flex items-center gap-3 mb-2">
            <BookOpen className="w-7 h-7 text-green-600" />
            <h2 className="text-xl font-bold text-gray-900">Step 3: Skills Match</h2>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <p className="text-sm text-amber-800">No specific skills have been defined for the <strong>{selectedPathway?.title}</strong> role profile yet. You can proceed to the summary.</p>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3 mb-2">
          <BookOpen className="w-7 h-7 text-green-600" />
          <h2 className="text-xl font-bold text-gray-900">Step 3: Skills Match</h2>
        </div>
        <p className="text-gray-600 text-sm">Rate yourself honestly against each skill required for <strong>{selectedPathway?.title}</strong>.</p>
        <div className="bg-teal-50 border border-teal-200 rounded-lg p-3">
          <p className="text-sm text-teal-800">
            <span className="font-semibold">Be honest with yourself.</span> This is not a pass or fail. Your answers help SERA build the right development plan and recommend the right next steps.
          </p>
        </div>

        <div className="space-y-3">
          {targetSkills.map(skill => {
            const assessed = assessedSkills.find(
              a => a.skill_name.trim().toLowerCase() === skill.trim().toLowerCase()
            );
            const currentRating = roleSkillRatings[skill] || '';
            return (
              <div key={skill} className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900">{skill}</div>
                    {assessed && (
                      <div className="text-xs text-gray-400 mt-0.5">
                        Last assessed: {assessed.current_level}/5
                        {currentRating === '' && (
                          <span className="ml-1 text-teal-600">(pre-filled from your assessment)</span>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {SKILL_RATING_OPTIONS.map(opt => (
                      <button
                        key={opt.value}
                        onClick={() => setRoleSkillRatings(prev => ({ ...prev, [skill]: opt.value }))}
                        className={`px-2.5 py-1 text-xs font-medium rounded border transition-colors ${
                          currentRating === opt.value
                            ? opt.color + ' ring-2 ring-offset-1 ring-blue-400'
                            : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {!canProceedStep3 && (
          <p className="text-sm text-amber-600 flex items-center gap-1.5">
            <AlertCircle className="w-4 h-4" />
            Please rate all {targetSkills.length} skills before continuing.
          </p>
        )}
      </div>
    );
  };

  const renderStep4 = () => {
    // Compute on-the-fly if arriving from a saved session that had no stored result
    const result = readinessResult ?? buildReadinessResult();
    const recs = recommendations.length > 0 ? recommendations : buildRecommendations(result);
    if (!readinessResult) {
      setReadinessResult(result);
      setRecommendations(recs);
    }

    const gapSkills = (selectedPathway?.skills || []).filter(s => {
      const r = roleSkillRatings[s];
      return !r || ratingScore(r) < 3;
    });

    const overallColor = result.overall === 'ready' ? 'green' :
      result.overall === 'partially_ready' ? 'amber' : 'red';

    const overallLabel = result.overall === 'ready' ? 'Appears Ready to Explore' :
      result.overall === 'partially_ready' ? 'Partially Ready' : 'Not Yet Ready';

    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3 mb-2">
          <Sparkles className="w-7 h-7 text-blue-600" />
          <h2 className="text-xl font-bold text-gray-900">Step 4: Summary & Decision</h2>
        </div>

        {/* Target role summary */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="text-xs text-gray-500 mb-1">Target Role</div>
          <div className="font-semibold text-gray-900">{selectedPathway?.title}</div>
          <div className="text-sm text-gray-600">{selectedPathway?.department}{selectedPathway?.team ? ` · ${selectedPathway.team}` : ''} · {selectedPathway?.level}</div>
        </div>

        {/* Readiness result */}
        <div className={`border rounded-lg overflow-hidden`} style={{ borderColor: overallColor === 'green' ? '#86efac' : overallColor === 'amber' ? '#fcd34d' : '#fca5a5' }}>
          <button
            onClick={() => setShowReadiness(v => !v)}
            className={`w-full flex items-center justify-between p-4 text-left ${
              overallColor === 'green' ? 'bg-green-50' : overallColor === 'amber' ? 'bg-amber-50' : 'bg-red-50'
            }`}
          >
            <div className="flex items-center gap-3">
              {result.overall === 'ready' ? (
                <CheckCircle className="w-5 h-5 text-green-600" />
              ) : (
                <AlertCircle className={`w-5 h-5 ${overallColor === 'amber' ? 'text-amber-600' : 'text-red-600'}`} />
              )}
              <div>
                <div className={`font-semibold text-sm ${
                  overallColor === 'green' ? 'text-green-900' : overallColor === 'amber' ? 'text-amber-900' : 'text-red-900'
                }`}>SERA Readiness Check: {overallLabel}</div>
                <div className="text-xs text-gray-500 mt-0.5">{result.overall === 'ready' ? 'You appear to meet the criteria to explore this pathway.' : 'Some criteria are not currently met — see details below.'}</div>
              </div>
            </div>
            {showReadiness ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
          </button>
          {showReadiness && (
            <div className="bg-white p-4 space-y-3">
              {result.criteria.map((c, i) => (
                <div key={i} className="flex items-start gap-3">
                  {c.met ? (
                    <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                  )}
                  <div>
                    <div className={`text-sm font-medium ${c.met ? 'text-gray-900' : 'text-amber-800'}`}>{c.label}</div>
                    <div className="text-xs text-gray-600 mt-0.5">{c.detail}</div>
                  </div>
                </div>
              ))}
              <div className="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-400 italic">
                {result.caveat}
              </div>
            </div>
          )}
        </div>

        {/* SERA Recommendations */}
        {recs.length > 0 && (
          <div className="space-y-3">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-teal-600" />
              SERA Recommendations
            </h3>
            {recs.map((rec, i) => {
              const icon = rec.type === 'skill' ? '🎯' : rec.type === 'training' ? '📚' : rec.type === 'alternative_role' ? '🔀' : '✅';
              const bg = rec.type === 'alternative_role' ? 'bg-blue-50 border-blue-200' : rec.type === 'skill' ? 'bg-amber-50 border-amber-200' : 'bg-green-50 border-green-200';
              return (
                <div key={i} className={`border rounded-lg p-3 ${bg}`}>
                  <div className="flex items-start gap-2">
                    <span className="text-base">{icon}</span>
                    <div>
                      <div className="text-sm font-medium text-gray-900">{rec.title}</div>
                      <div className="text-xs text-gray-600 mt-0.5">{rec.detail}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Skills gaps summary */}
        {gapSkills.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-2">Skills to Develop ({gapSkills.length})</h3>
            <div className="flex flex-wrap gap-1.5">
              {gapSkills.map(s => (
                <span key={s} className="px-2.5 py-1 bg-amber-100 border border-amber-200 text-amber-800 text-xs rounded-full">{s}</span>
              ))}
            </div>
          </div>
        )}

        {/* Decision buttons */}
        <div className="border-t border-gray-100 pt-4 space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <button
              onClick={handleConfirm}
              disabled={loading}
              className="flex flex-col items-center gap-1.5 p-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-40 transition-colors"
            >
              <CheckCircle className="w-5 h-5" />
              <span className="text-xs font-medium">Confirm</span>
              <span className="text-xs opacity-75">Lock and save result</span>
            </button>
            <button
              onClick={handleSaveForLater}
              disabled={loading}
              className="flex flex-col items-center gap-1.5 p-3 bg-gray-100 text-gray-800 border border-gray-200 rounded-lg hover:bg-gray-200 disabled:opacity-40 transition-colors"
            >
              <Save className="w-5 h-5" />
              <span className="text-xs font-medium">Save for Later</span>
              <span className="text-xs text-gray-500">Keep as draft</span>
            </button>
            <button
              onClick={handleDiscard}
              disabled={loading}
              className="flex flex-col items-center gap-1.5 p-3 bg-white text-red-600 border border-red-200 rounded-lg hover:bg-red-50 disabled:opacity-40 transition-colors"
            >
              <RotateCcw className="w-5 h-5" />
              <span className="text-xs font-medium">Discard</span>
              <span className="text-xs text-red-400">Delete draft</span>
            </button>
          </div>
          <button
            onClick={handleSendToManager}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 p-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-40 transition-colors font-medium"
          >
            <Send className="w-4 h-4" />
            Send to Manager
            <span className="text-xs opacity-75 ml-1">— creates active Career Plan</span>
          </button>
        </div>
      </div>
    );
  };

  if (pageLoading) {
    return (
      <div className="max-w-3xl mx-auto p-6 flex items-center justify-center min-h-64">
        <div className="text-center">
          <div className="inline-block w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-3" />
          <p className="text-gray-500 text-sm">Loading career quiz...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-4 sm:p-6">
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-teal-600 p-5 text-white relative">
          {onNavigate && (
            <button
              onClick={() => onNavigate('/pathways')}
              className="absolute top-4 right-4 p-1.5 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
          <h1 className="text-2xl font-bold">AI Career Planning Quiz</h1>
          <p className="text-blue-100 text-sm mt-1">Powered by SERA · Based on your actual pathway and profile data</p>
        </div>

        {/* Progress bar */}
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
          <div className="flex items-center justify-between">
            {stepLabels.map((label, i) => {
              const step = (i + 1) as QuizStep;
              const isDone = currentStep > step;
              const isCurrent = currentStep === step;
              return (
                <div key={step} className={`flex items-center ${i < 3 ? 'flex-1' : ''}`}>
                  <div className="flex flex-col items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                      isDone ? 'bg-green-500 text-white' : isCurrent ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'
                    }`}>
                      {isDone ? <CheckCircle className="w-4 h-4" /> : step}
                    </div>
                    <span className={`text-xs mt-1 font-medium hidden sm:block ${isCurrent ? 'text-blue-600' : 'text-gray-400'}`}>{label}</span>
                  </div>
                  {i < 3 && <div className={`flex-1 h-0.5 mx-2 ${isDone || (isCurrent && isDone) ? 'bg-green-400' : currentStep > step ? 'bg-green-400' : 'bg-gray-200'}`} />}
                </div>
              );
            })}
          </div>
        </div>

        {/* Step content */}
        <div className="p-6 min-h-[400px]">
          {currentStep === 1 && renderStep1()}
          {currentStep === 2 && renderStep2()}
          {currentStep === 3 && renderStep3()}
          {currentStep === 4 && renderStep4()}
        </div>

        {/* Navigation */}
        {currentStep < 4 && (
          <div className="flex justify-between px-6 py-4 border-t border-gray-100 bg-gray-50">
            <div className="flex gap-3">
              {currentStep > 1 && (
                <button
                  onClick={() => setCurrentStep(prev => Math.max(1, prev - 1) as QuizStep)}
                  className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </button>
              )}
              <button
                onClick={handleSaveForLater}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 text-sm disabled:opacity-40"
              >
                <Save className="w-4 h-4" />
                Save for Later
              </button>
            </div>
            <button
              onClick={() => goToStep((currentStep + 1) as QuizStep)}
              disabled={(currentStep === 1 && !canProceedStep1) || (currentStep === 3 && !canProceedStep3)}
              className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-sm font-medium"
            >
              Next
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
