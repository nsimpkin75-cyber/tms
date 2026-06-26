import { useState, useEffect } from 'react';
import { Target, Brain, BookOpen, TrendingUp, Send, ArrowLeft, ArrowRight, X, CheckCircle, AlertCircle, Star, Clock, User, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

// Reuses exact skill-rating logic from AICareerQuiz

type QuizStep = 2 | 3 | 4;

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
  current_level: number;
}

interface ReadinessCheck {
  overall: 'ready' | 'partially_ready' | 'not_ready';
  criteria: Array<{ label: string; met: boolean; detail: string }>;
  caveat: string;
}

interface Recommendation {
  type: 'skill' | 'training' | 'action' | 'alternative_role';
  title: string;
  detail: string;
}

interface Props {
  planId: string;
  onClose: () => void;
  onComplete?: () => void;
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

export default function InitiatedCareerPlanQuiz({ planId, onClose, onComplete }: Props) {
  const { profile, user } = useAuth();

  const [currentStep, setCurrentStep] = useState<QuizStep>(2);
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);

  // Plan data loaded from DB
  const [planStatus, setPlanStatus] = useState('');
  const [initiatorNotes, setInitiatorNotes] = useState('');
  const [initiatorName, setInitiatorName] = useState('');
  const [targetPathway, setTargetPathway] = useState<Pathway | null>(null);
  const [allPathways, setAllPathways] = useState<Pathway[]>([]);

  // Step 2: Reality Check
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

  // Step 4: Summary
  const [readinessResult, setReadinessResult] = useState<ReadinessCheck | null>(null);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [showReadiness, setShowReadiness] = useState(true);

  useEffect(() => {
    init();
  }, [planId, profile?.id]);

  const init = async () => {
    setPageLoading(true);
    try {
      await Promise.all([loadPlan(), loadProfileData()]);
    } finally {
      setPageLoading(false);
    }
  };

  const loadPlan = async () => {
    const { data } = await supabase
      .from('career_plans')
      .select(`
        status, initiator_notes, created_by_name, target_job_family_id,
        quiz_data, skill_ratings, reality_data,
        started_from, current_owner_stage,
        target_job_family:job_families!career_plans_target_job_family_id_fkey(
          id, title, department, pathway, team, level, skills,
          how_do_i_get_there, progression_to, alternative_paths,
          sort_order, accountabilities, what_great_looks_like
        )
      `)
      .eq('id', planId)
      .maybeSingle();

    if (!data) return;

    setPlanStatus(data.status);
    setInitiatorNotes(data.initiator_notes || '');
    setInitiatorName(data.created_by_name || 'your manager');

    const tf = Array.isArray(data.target_job_family) ? data.target_job_family[0] : data.target_job_family;
    if (tf) {
      const pathway: Pathway = {
        id: tf.id,
        title: tf.title,
        department: tf.department,
        pathway: tf.pathway || null,
        team: tf.team || null,
        level: tf.level,
        skills: Array.isArray(tf.skills) ? tf.skills : [],
        how_do_i_get_there: tf.how_do_i_get_there || null,
        progression_to: tf.progression_to || null,
        alternative_paths: Array.isArray(tf.alternative_paths) ? tf.alternative_paths : [],
        sort_order: tf.sort_order ?? null,
        accountabilities: Array.isArray(tf.accountabilities) ? tf.accountabilities : [],
        what_great_looks_like: Array.isArray(tf.what_great_looks_like) ? tf.what_great_looks_like : [],
      };
      setTargetPathway(pathway);
    }

    // Restore previous progress if employee already started
    if (data.quiz_data && typeof data.quiz_data === 'object') {
      setExtraQualifications(data.quiz_data.extraQualifications || '');
      setExtraExperience(data.quiz_data.extraExperience || '');
      setExtraContext(data.quiz_data.extraContext || '');
    }
    if (data.skill_ratings && typeof data.skill_ratings === 'object') {
      setRoleSkillRatings(data.skill_ratings);
    }

    // Load all pathways for alternative role suggestions
    const { data: pws } = await supabase
      .from('job_families')
      .select('id, title, department, pathway, team, level, skills, how_do_i_get_there, progression_to, alternative_paths, sort_order, accountabilities, what_great_looks_like')
      .order('department');
    setAllPathways((pws || []).map((p: any) => ({
      id: p.id, title: p.title, department: p.department, pathway: p.pathway || null,
      team: p.team || null, level: p.level, skills: Array.isArray(p.skills) ? p.skills : [],
      how_do_i_get_there: p.how_do_i_get_there || null, progression_to: p.progression_to || null,
      alternative_paths: Array.isArray(p.alternative_paths) ? p.alternative_paths : [],
      sort_order: p.sort_order ?? null, accountabilities: Array.isArray(p.accountabilities) ? p.accountabilities : [],
      what_great_looks_like: Array.isArray(p.what_great_looks_like) ? p.what_great_looks_like : [],
    })));
  };

  const loadProfileData = async () => {
    if (!user?.id) return;
    const [profileRes, skillsRes, reviewsRes] = await Promise.all([
      supabase.from('profiles').select('job_title, department, start_date').eq('id', user.id).maybeSingle(),
      supabase
        .from('skill_assessments')
        .select('skill_id, current_level, skills!skill_assessments_skill_id_fkey(name, category)')
        .eq('profile_id', user.id)
        .order('assessment_date', { ascending: false }),
      supabase
        .from('one_to_one_monthly_reviews')
        .select('overall_competency_score, overall_kpi_average')
        .eq('employee_id', user.id)
        .eq('status', 'completed'),
    ]);

    let los = 'Unknown';
    if (profileRes.data?.start_date) {
      const start = new Date(profileRes.data.start_date);
      const now = new Date();
      const months = (now.getFullYear() - start.getFullYear()) * 12 + now.getMonth() - start.getMonth();
      const yrs = Math.floor(months / 12);
      const mo = months % 12;
      los = yrs > 0 ? `${yrs}yr${yrs !== 1 ? 's' : ''}${mo > 0 ? ` ${mo}mo` : ''}` : `${mo} month${mo !== 1 ? 's' : ''}`;
    }

    let perfAvg: number | null = null;
    const completed = reviewsRes.data || [];
    if (completed.length > 0) {
      const scores = completed.map((r: any) => {
        const vals = [r.overall_competency_score, r.overall_kpi_average].filter((v): v is number => v !== null);
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

    const skills: AssessedSkill[] = (skillsRes.data || []).map((s: any) => {
      const skillRow = Array.isArray(s.skills) ? s.skills[0] : s.skills;
      return { skill_id: s.skill_id, skill_name: skillRow?.name || '', category: skillRow?.category || '', current_level: s.current_level || 1 };
    }).filter(s => s.skill_name);
    setAssessedSkills(skills);

    // Pre-fill skill ratings from assessed skills
    if (targetPathway) {
      const initialRatings: Record<string, string> = {};
      (targetPathway.skills || []).forEach(skillName => {
        const assessed = skills.find(a => a.skill_name.trim().toLowerCase() === skillName.trim().toLowerCase());
        if (assessed) {
          const option = SKILL_RATING_OPTIONS.find(o => o.score === assessed.current_level);
          if (option) initialRatings[skillName] = option.value;
        }
      });
      setRoleSkillRatings(prev => ({ ...initialRatings, ...prev }));
    }
  };

  const saveProgress = async () => {
    if (!user?.id) return;
    try {
      await supabase.from('career_plans').update({
        quiz_data: { extraQualifications, extraExperience, extraContext },
        reality_data: profileSnapshot,
        skill_ratings: roleSkillRatings,
        sera_readiness_result: readinessResult || {},
        sera_recommendations: recommendations,
        current_owner_stage: 'employee',
      }).eq('id', planId);
    } catch (err) {
      console.warn('saveProgress failed:', err);
    }
  };

  const buildReadinessResult = (): ReadinessCheck => {
    const criteria: ReadinessCheck['criteria'] = [];
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
    criteria.push({
      label: 'Performance average',
      met: profileSnapshot.performanceAvg !== null && profileSnapshot.performanceAvg >= 3.0,
      detail: profileSnapshot.performanceAvg !== null
        ? `Average of ${profileSnapshot.performanceAvg.toFixed(2)}/5 from completed reviews`
        : 'No completed review data available',
    });
    const targetSkills = targetPathway?.skills || [];
    const ratedSkills = Object.entries(roleSkillRatings).filter(([, v]) => v !== '');
    const proficientCount = ratedSkills.filter(([, v]) => ratingScore(v) >= 3).length;
    const totalRequired = targetSkills.length;
    const skillsMet = totalRequired === 0 || (totalRequired > 0 && proficientCount / totalRequired >= 0.6);
    criteria.push({
      label: 'Skills match against target role',
      met: skillsMet,
      detail: totalRequired > 0
        ? `${proficientCount} of ${totalRequired} required skills rated competent or above`
        : 'No specific skills defined for this role profile yet',
    });
    const crossDept = targetPathway && targetPathway.department !== profileSnapshot.department;
    if (crossDept) {
      criteria.push({
        label: 'Cross-department move',
        met: false,
        detail: `This role is in ${targetPathway!.department}, which is a different department. Cross-department moves typically require demonstrating relevant skills or a stepping-stone role first.`,
      });
    }
    const metCount = criteria.filter(c => c.met).length;
    const overall: ReadinessCheck['overall'] = metCount === criteria.length ? 'ready'
      : metCount >= criteria.length - 1 ? 'partially_ready' : 'not_ready';
    return {
      overall,
      criteria,
      caveat: 'SERA does not have access to your full HR file. This guidance assumes there are no live conduct issues, warnings or pending investigations.',
    };
  };

  const buildRecommendations = (readiness: ReadinessCheck): Recommendation[] => {
    const recs: Recommendation[] = [];
    const targetSkills = targetPathway?.skills || [];
    const gapSkills = targetSkills.filter(skill => {
      const rating = roleSkillRatings[skill];
      return !rating || ratingScore(rating) < 3;
    });
    gapSkills.slice(0, 5).forEach(skill => {
      recs.push({ type: 'skill', title: `Develop: ${skill}`, detail: `This skill is required for ${targetPathway?.title} and your current self-rating suggests it needs development.` });
    });
    if (targetPathway?.how_do_i_get_there) {
      recs.push({ type: 'action', title: 'Follow your pathway guidance', detail: targetPathway.how_do_i_get_there });
    }
    if (targetPathway?.accountabilities?.length) {
      recs.push({ type: 'action', title: 'Build evidence of key accountabilities', detail: `You will need to demonstrate: ${targetPathway.accountabilities.slice(0, 3).join('; ')}` });
    }
    if (readiness.overall === 'not_ready' && targetPathway) {
      const alternatives = allPathways.filter(p => {
        if (p.id === targetPathway.id) return false;
        const overlap = p.skills.filter(s => targetPathway.skills.includes(s)).length;
        return overlap >= 2 && (p.sort_order ?? 99) < (targetPathway.sort_order ?? 99);
      }).slice(0, 2);
      alternatives.forEach(alt => {
        recs.push({ type: 'alternative_role', title: `Alternative route: ${alt.title}`, detail: `${alt.title} (${alt.department} · ${alt.level}) shares key skills with your target role and may be a more achievable stepping stone.` });
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
      saveProgress().catch(console.warn);
    } else {
      saveProgress().catch(console.warn);
    }
    setCurrentStep(step);
  };

  const handleSendToManager = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const finalReadiness = readinessResult ?? buildReadinessResult();
      const finalRecs = recommendations.length > 0 ? recommendations : buildRecommendations(finalReadiness);
      const gapSkills = (targetPathway?.skills || []).filter(s => !roleSkillRatings[s] || ratingScore(roleSkillRatings[s]) < 3);

      await supabase.from('career_plans').update({
        quiz_data: { extraQualifications, extraExperience, extraContext },
        reality_data: profileSnapshot,
        skill_ratings: roleSkillRatings,
        skills_gaps: gapSkills,
        sera_readiness_result: finalReadiness,
        sera_recommendations: finalRecs,
        status: 'pending_manager_wayforward',
        current_owner_stage: 'manager',
        confirmed_at: new Date().toISOString(),
        sent_to_manager_at: new Date().toISOString(),
      }).eq('id', planId);

      // Seed SERA recommendations as actions
      const actionInserts = finalRecs
        .filter(r => r.type !== 'alternative_role')
        .map(r => ({
          plan_id: planId,
          title: r.title,
          description: r.detail,
          source: 'sera' as const,
          added_by: user.id,
        }));
      if (actionInserts.length > 0) {
        await supabase.from('career_plan_actions').insert(actionInserts);
      }

      // Notify the manager
      const { data: planRow } = await supabase
        .from('career_plans')
        .select('manager_id, created_by_user_id')
        .eq('id', planId)
        .maybeSingle();

      const managerId = planRow?.manager_id || planRow?.created_by_user_id;
      if (managerId) {
        await supabase.from('career_plan_notifications').insert({
          career_plan_id: planId,
          recipient_id: managerId,
          sender_id: user.id,
          notification_type: 'employee_completed',
          message: `${profile?.full_name || 'An employee'} has completed their career plan self-assessment and it's now ready for your Way Forward input.`,
        });
      }

      onComplete?.();
    } catch (err) {
      console.error('handleSendToManager error:', err);
      alert('Failed to submit. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const stepLabels = ['', 'Reality Check', 'Skills Match', 'Summary'];
  const canProceedStep3 = !targetPathway || targetPathway.skills.every(s => roleSkillRatings[s]);

  const renderStep2 = () => (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <Brain className="w-7 h-7 text-teal-600" />
        <h2 className="text-xl font-bold text-gray-900">Step 1: Reality Check</h2>
      </div>

      {/* Target role info (pre-set by initiator) */}
      {targetPathway && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
          <div className="flex items-center gap-2 mb-1">
            <Target className="w-4 h-4 text-blue-600" />
            <span className="text-xs font-semibold text-blue-700 uppercase tracking-wide">Target Role Set By {initiatorName}</span>
          </div>
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-blue-900">{targetPathway.title}</h3>
            <span className="px-2 py-0.5 bg-blue-200 text-blue-800 text-xs font-medium rounded-full">{targetPathway.level}</span>
          </div>
          <div className="text-sm text-blue-700">{targetPathway.department}{targetPathway.team ? ` · ${targetPathway.team}` : ''}</div>
          {targetPathway.skills.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-1">
              {targetPathway.skills.slice(0, 6).map(s => (
                <span key={s} className="px-2 py-0.5 bg-white border border-blue-200 text-blue-700 text-xs rounded">{s}</span>
              ))}
              {targetPathway.skills.length > 6 && <span className="text-xs text-blue-500">+{targetPathway.skills.length - 6} more</span>}
            </div>
          )}
        </div>
      )}

      {/* Initiator notes */}
      {initiatorNotes && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-1">
            <MessageSquareIcon className="w-4 h-4 text-amber-600" />
            <span className="text-xs font-semibold text-amber-700">Notes from {initiatorName}</span>
          </div>
          <p className="text-sm text-amber-800">{initiatorNotes}</p>
        </div>
      )}

      <p className="text-gray-600 text-sm">SERA has pulled your profile data below. Add context to strengthen your plan.</p>

      {/* Live profile data */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-5 space-y-4">
        <div className="flex items-center gap-2 mb-3">
          <User className="w-4 h-4 text-gray-500" />
          <h3 className="text-sm font-semibold text-gray-800">Your Current Profile</h3>
          <span className="text-xs text-gray-400 ml-auto">Read-only</span>
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

      <div className="space-y-4">
        {[
          { label: 'Additional Qualifications', value: extraQualifications, setter: setExtraQualifications, placeholder: 'Any external certifications, degrees or training not in your profile...' },
          { label: 'Relevant Experience', value: extraExperience, setter: setExtraExperience, placeholder: 'Previous roles, projects or responsibilities relevant to your target role...' },
          { label: 'Additional Context', value: extraContext, setter: setExtraContext, placeholder: 'Anything else SERA should know about your situation or motivations...' },
        ].map(({ label, value, setter, placeholder }) => (
          <div key={label} className="border border-gray-200 rounded-lg bg-white px-4 py-3">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {label} <span className="text-xs text-gray-400">(optional)</span>
            </label>
            <textarea
              value={value}
              onChange={e => setter(e.target.value)}
              placeholder={placeholder}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm resize-none"
            />
          </div>
        ))}
      </div>
    </div>
  );

  const renderStep3 = () => {
    const targetSkills = targetPathway?.skills || [];
    if (targetSkills.length === 0) {
      return (
        <div className="space-y-6">
          <div className="flex items-center gap-3 mb-2">
            <BookOpen className="w-7 h-7 text-green-600" />
            <h2 className="text-xl font-bold text-gray-900">Step 2: Skills Match</h2>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <p className="text-sm text-amber-800">No specific skills have been defined for the <strong>{targetPathway?.title}</strong> role profile yet. You can proceed to the summary.</p>
          </div>
        </div>
      );
    }
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3 mb-2">
          <BookOpen className="w-7 h-7 text-green-600" />
          <h2 className="text-xl font-bold text-gray-900">Step 2: Skills Match</h2>
        </div>
        <p className="text-gray-600 text-sm">Rate yourself honestly against each skill required for <strong>{targetPathway?.title}</strong>.</p>
        <div className="bg-teal-50 border border-teal-200 rounded-lg p-3">
          <p className="text-sm text-teal-800">
            <span className="font-semibold">Be honest with yourself.</span> This is not a pass or fail. Your answers help SERA build the right development plan.
          </p>
        </div>
        <div className="space-y-3">
          {targetSkills.map(skill => {
            const assessed = assessedSkills.find(a => a.skill_name.trim().toLowerCase() === skill.trim().toLowerCase());
            const currentRating = roleSkillRatings[skill] || '';
            return (
              <div key={skill} className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900">{skill}</div>
                    {assessed && (
                      <div className="text-xs text-gray-400 mt-0.5">Last assessed: {assessed.current_level}/5</div>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {SKILL_RATING_OPTIONS.map(opt => (
                      <button
                        key={opt.value}
                        onClick={() => setRoleSkillRatings(prev => ({ ...prev, [skill]: opt.value }))}
                        className={`px-2.5 py-1 text-xs font-medium rounded border transition-colors ${
                          currentRating === opt.value ? opt.color + ' ring-2 ring-offset-1 ring-blue-400' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
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
    const result = readinessResult ?? buildReadinessResult();
    const recs = recommendations.length > 0 ? recommendations : buildRecommendations(result);
    if (!readinessResult) { setReadinessResult(result); setRecommendations(recs); }

    const gapSkills = (targetPathway?.skills || []).filter(s => !roleSkillRatings[s] || ratingScore(roleSkillRatings[s]) < 3);
    const overallColor = result.overall === 'ready' ? 'green' : result.overall === 'partially_ready' ? 'amber' : 'red';
    const overallLabel = result.overall === 'ready' ? 'Appears Ready to Explore' : result.overall === 'partially_ready' ? 'Partially Ready' : 'Not Yet Ready';

    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3 mb-2">
          <Sparkles className="w-7 h-7 text-blue-600" />
          <h2 className="text-xl font-bold text-gray-900">Step 3: SERA Summary</h2>
        </div>

        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="text-xs text-gray-500 mb-1">Target Role</div>
          <div className="font-semibold text-gray-900">{targetPathway?.title}</div>
          <div className="text-sm text-gray-600">{targetPathway?.department}{targetPathway?.team ? ` · ${targetPathway.team}` : ''} · {targetPathway?.level}</div>
        </div>

        <div className={`border rounded-lg overflow-hidden`} style={{ borderColor: overallColor === 'green' ? '#86efac' : overallColor === 'amber' ? '#fcd34d' : '#fca5a5' }}>
          <button
            onClick={() => setShowReadiness(v => !v)}
            className={`w-full flex items-center justify-between p-4 text-left ${overallColor === 'green' ? 'bg-green-50' : overallColor === 'amber' ? 'bg-amber-50' : 'bg-red-50'}`}
          >
            <div className="flex items-center gap-3">
              {result.overall === 'ready' ? <CheckCircle className="w-5 h-5 text-green-600" /> : <AlertCircle className={`w-5 h-5 ${overallColor === 'amber' ? 'text-amber-600' : 'text-red-600'}`} />}
              <div>
                <div className={`font-semibold text-sm ${overallColor === 'green' ? 'text-green-900' : overallColor === 'amber' ? 'text-amber-900' : 'text-red-900'}`}>
                  SERA Readiness: {overallLabel}
                </div>
                <div className="text-xs text-gray-500 mt-0.5">
                  {result.overall === 'ready' ? 'You appear to meet the criteria to explore this pathway.' : 'Some criteria are not currently met — see details below.'}
                </div>
              </div>
            </div>
            {showReadiness ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
          </button>
          {showReadiness && (
            <div className="bg-white p-4 space-y-3">
              {result.criteria.map((c, i) => (
                <div key={i} className="flex items-start gap-3">
                  {c.met ? <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" /> : <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />}
                  <div>
                    <div className={`text-sm font-medium ${c.met ? 'text-gray-900' : 'text-amber-800'}`}>{c.label}</div>
                    <div className="text-xs text-gray-600 mt-0.5">{c.detail}</div>
                  </div>
                </div>
              ))}
              <div className="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-400 italic">{result.caveat}</div>
            </div>
          )}
        </div>

        {recs.length > 0 && (
          <div className="space-y-3">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-teal-600" />
              SERA Recommendations
            </h3>
            {recs.map((rec, i) => {
              const bg = rec.type === 'alternative_role' ? 'bg-blue-50 border-blue-200' : rec.type === 'skill' ? 'bg-amber-50 border-amber-200' : 'bg-green-50 border-green-200';
              return (
                <div key={i} className={`border rounded-lg p-3 ${bg}`}>
                  <div className="text-sm font-medium text-gray-900">{rec.title}</div>
                  <div className="text-xs text-gray-600 mt-0.5">{rec.detail}</div>
                </div>
              );
            })}
          </div>
        )}

        {gapSkills.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-2">Skills to Develop ({gapSkills.length})</h3>
            <div className="flex flex-wrap gap-1.5">
              {gapSkills.map(s => <span key={s} className="px-2.5 py-1 bg-amber-100 border border-amber-200 text-amber-800 text-xs rounded-full">{s}</span>)}
            </div>
          </div>
        )}

        <div className="border-t border-gray-100 pt-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <div className="flex items-start gap-2">
              <TrendingUp className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <div className="text-sm font-semibold text-blue-900">What happens next?</div>
                <div className="text-xs text-blue-700 mt-0.5">
                  Your SERA assessment will be sent to {initiatorName}. They will review it and add a Way Forward — objectives, actions, and a development timeline. You'll be notified when that's complete.
                </div>
              </div>
            </div>
          </div>
          <button
            onClick={handleSendToManager}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 p-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-40 transition-colors font-medium"
          >
            <Send className="w-4 h-4" />
            {loading ? 'Sending...' : `Send to ${initiatorName}`}
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
          <p className="text-gray-500 text-sm">Loading your career plan...</p>
        </div>
      </div>
    );
  }

  if (planStatus !== 'pending_employee_input') {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <div className="bg-white rounded-xl shadow border border-gray-200 p-8 text-center">
          <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
          <h2 className="text-lg font-semibold text-gray-900 mb-1">Already Completed</h2>
          <p className="text-sm text-gray-500">This career plan has already been submitted for manager review.</p>
          <button onClick={onClose} className="mt-4 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm">Close</button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-4 sm:p-6">
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-teal-600 to-blue-600 p-5 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          <h1 className="text-2xl font-bold">Career Plan — Your Input</h1>
          <p className="text-teal-100 text-sm mt-1">Complete your self-assessment · Powered by SERA</p>
        </div>

        {/* Progress */}
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
          <div className="flex items-center justify-between">
            {([2, 3, 4] as QuizStep[]).map((step, i) => {
              const isDone = currentStep > step;
              const isCurrent = currentStep === step;
              const label = stepLabels[step];
              return (
                <div key={step} className={`flex items-center ${i < 2 ? 'flex-1' : ''}`}>
                  <div className="flex flex-col items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${isDone ? 'bg-green-500 text-white' : isCurrent ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'}`}>
                      {isDone ? <CheckCircle className="w-4 h-4" /> : i + 1}
                    </div>
                    <span className={`text-xs mt-1 font-medium hidden sm:block ${isCurrent ? 'text-blue-600' : 'text-gray-400'}`}>{label}</span>
                  </div>
                  {i < 2 && <div className={`flex-1 h-0.5 mx-2 ${isDone ? 'bg-green-400' : 'bg-gray-200'}`} />}
                </div>
              );
            })}
          </div>
        </div>

        {/* Step content */}
        <div className="p-6 min-h-[400px]">
          {currentStep === 2 && renderStep2()}
          {currentStep === 3 && renderStep3()}
          {currentStep === 4 && renderStep4()}
        </div>

        {/* Navigation */}
        {currentStep < 4 && (
          <div className="flex justify-between px-6 py-4 border-t border-gray-100 bg-gray-50">
            <div>
              {currentStep > 2 && (
                <button
                  onClick={() => setCurrentStep(prev => (prev - 1) as QuizStep)}
                  className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </button>
              )}
            </div>
            <button
              onClick={() => goToStep((currentStep + 1) as QuizStep)}
              disabled={currentStep === 3 && !canProceedStep3}
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

// Inline icon to avoid MessageSquare import conflict
function MessageSquareIcon({ className }: { className?: string }) {
  return <MessageSquare className={className} />;
}
