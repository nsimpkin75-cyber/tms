import { useState, useEffect } from 'react';
import { MessageSquare, Send, ClipboardCheck, CheckCircle, XCircle, AlertCircle, TrendingUp, Clock, Target, Award, Zap, Settings } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useBranding } from '../contexts/BrandingContext';

interface PerformanceRating {
  rating: number;
  review_date: string;
  reviewer_name: string;
}

interface SkillRequirement {
  name: string;
  description: string;
}

interface ExperienceRequirement {
  name: string;
  description: string;
}

interface ProgressionCriteria {
  id: string;
  from_level: string;
  to_level: string;
  minimum_tenure_months: number;
  required_skills: SkillRequirement[];
  required_experience: ExperienceRequirement[];
  minimum_performance_rating: number;
}

interface CopilotFunction {
  id: string;
  name: string;
  display_name: string;
  description: string;
  category: string;
  is_enabled: boolean;
}

interface CopilotProps {
  onNavigate?: (path: string) => void;
}

export function Copilot({ onNavigate }: CopilotProps) {
  const { user } = useAuth();
  const { branding } = useBranding();
  const displayName = branding.opal_display_name || 'Opal';
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content:
        "Hello! I'm Opal, your AI Growth Guide. I can help you with questions about career progression, skills development, and opportunities within the organisation. Ready to plan your career? Take the AI Career Quiz to get personalised recommendations. What would you like to know?",
    },
  ]);

  const [showQuiz, setShowQuiz] = useState(false);
  const [quizStep, setQuizStep] = useState(1);
  const [monthsInRole, setMonthsInRole] = useState('');
  const [performanceRatings, setPerformanceRatings] = useState<PerformanceRating[]>([]);
  const [criteria, setCriteria] = useState<ProgressionCriteria | null>(null);
  const [skillChecklist, setSkillChecklist] = useState<Record<string, boolean>>({});
  const [experienceChecklist, setExperienceChecklist] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [recommendation, setRecommendation] = useState<any>(null);
  const [availableFunctions, setAvailableFunctions] = useState<CopilotFunction[]>([]);
  const [showFunctions, setShowFunctions] = useState(false);

  useEffect(() => {
    fetchAvailableFunctions();
  }, []);

  async function fetchAvailableFunctions() {
    try {
      const { data, error } = await supabase
        .from('copilot_functions')
        .select('*')
        .eq('is_enabled', true)
        .order('category');

      if (error) throw error;
      setAvailableFunctions(data || []);
    } catch (error) {
      console.error('Error fetching functions:', error);
    }
  }

  function handleSend() {
    if (!message.trim()) return;

    setMessages([...messages, { role: 'user', content: message }]);
    setMessage('');

    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content:
            "I'm currently a simulation. In a full implementation, I would provide personalized career guidance based on your profile, performance data, and available opportunities.",
        },
      ]);
    }, 1000);
  }

  async function startProgressionQuiz() {
    setShowQuiz(true);
    setQuizStep(1);
    setLoading(true);

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('job_family_id, current_job_family:job_families(id, level, title)')
        .eq('id', user?.id)
        .single();

      if (profile?.current_job_family) {
        const { data: criteriaData } = await supabase
          .from('progression_criteria')
          .select('*')
          .eq('job_family_id', profile.current_job_family.id)
          .eq('from_level', profile.current_job_family.level)
          .maybeSingle();

        if (criteriaData) {
          setCriteria(criteriaData);
          const skillsObj: Record<string, boolean> = {};
          criteriaData.required_skills.forEach((skill: SkillRequirement) => {
            skillsObj[skill.name] = false;
          });
          setSkillChecklist(skillsObj);

          const expObj: Record<string, boolean> = {};
          criteriaData.required_experience.forEach((exp: ExperienceRequirement) => {
            expObj[exp.name] = false;
          });
          setExperienceChecklist(expObj);
        }
      }

      const { data: reviews } = await supabase
        .from('reviews')
        .select(`
          rating,
          review_date,
          reviewer:profiles!reviews_reviewer_id_fkey(full_name)
        `)
        .eq('reviewee_id', user?.id)
        .order('review_date', { ascending: false })
        .limit(5);

      if (reviews) {
        setPerformanceRatings(reviews.map(r => ({
          rating: r.rating,
          review_date: r.review_date,
          reviewer_name: r.reviewer?.full_name || 'Unknown'
        })));
      }
    } catch (error) {
      console.error('Error loading quiz data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function submitQuiz() {
    if (!criteria) return;

    setLoading(true);

    const avgRating = performanceRatings.length > 0
      ? performanceRatings.reduce((sum, r) => sum + r.rating, 0) / performanceRatings.length
      : 0;

    const skillsCount = Object.values(skillChecklist).filter(v => v).length;
    const totalSkills = Object.keys(skillChecklist).length;
    const skillsPercent = totalSkills > 0 ? (skillsCount / totalSkills) * 100 : 0;

    const experienceCount = Object.values(experienceChecklist).filter(v => v).length;
    const totalExperience = Object.keys(experienceChecklist).length;
    const experiencePercent = totalExperience > 0 ? (experienceCount / totalExperience) * 100 : 0;

    const meetsPerformance = avgRating >= criteria.minimum_performance_rating;
    const meetsTenure = parseInt(monthsInRole) >= criteria.minimum_tenure_months;
    const meetsSkills = skillsPercent >= 75;
    const meetsExperience = experiencePercent >= 75;

    const readyForProgression = meetsPerformance && meetsTenure && meetsSkills && meetsExperience;

    let recommendationText = '';
    const gaps = [];

    if (readyForProgression) {
      recommendationText = `Excellent news! You meet all the internal criteria for progression from ${criteria.from_level} to ${criteria.to_level}. You should speak with your manager about taking the next step in your career.`;
    } else {
      recommendationText = `Based on your current assessment, you're not quite ready for progression yet. Here's what you need to work on:`;

      if (!meetsTenure) {
        gaps.push({
          area: 'Time in Role',
          status: 'Not Met',
          current: `${monthsInRole} months`,
          required: `${criteria.minimum_tenure_months} months`,
          recommendation: `You need ${criteria.minimum_tenure_months - parseInt(monthsInRole)} more months in your current role.`
        });
      }

      if (!meetsPerformance) {
        gaps.push({
          area: 'Performance Rating',
          status: 'Below Target',
          current: avgRating.toFixed(2),
          required: criteria.minimum_performance_rating.toFixed(2),
          recommendation: 'Focus on improving your performance in 1-to-1s and reviews. Speak with your manager about specific areas for development.'
        });
      }

      if (!meetsSkills) {
        gaps.push({
          area: 'Skills',
          status: 'Development Needed',
          current: `${skillsCount}/${totalSkills} confirmed`,
          required: `At least ${Math.ceil(totalSkills * 0.75)}/${totalSkills}`,
          recommendation: 'Work on developing the skills you haven\'t yet acquired. Consider relevant training modules and on-the-job experience.'
        });
      }

      if (!meetsExperience) {
        gaps.push({
          area: 'Experience',
          status: 'Development Needed',
          current: `${experienceCount}/${totalExperience} confirmed`,
          required: `At least ${Math.ceil(totalExperience * 0.75)}/${totalExperience}`,
          recommendation: 'Seek opportunities to gain the required experience. Talk to your manager about stretch assignments or projects.'
        });
      }
    }

    const recommendationData = {
      ready: readyForProgression,
      text: recommendationText,
      gaps,
      scores: {
        tenure: { meets: meetsTenure, current: parseInt(monthsInRole), required: criteria.minimum_tenure_months },
        performance: { meets: meetsPerformance, current: avgRating, required: criteria.minimum_performance_rating },
        skills: { meets: meetsSkills, current: skillsPercent, required: 75 },
        experience: { meets: meetsExperience, current: experiencePercent, required: 75 }
      }
    };

    try {
      await supabase.from('career_quiz_responses').insert({
        user_id: user?.id,
        months_in_role: parseInt(monthsInRole),
        skill_assessments: skillChecklist,
        performance_check: {
          ratings: performanceRatings,
          average: avgRating
        },
        recommendation: JSON.stringify(recommendationData)
      });
    } catch (error) {
      console.error('Error saving quiz response:', error);
    }

    setRecommendation(recommendationData);
    setQuizStep(4);
    setLoading(false);
  }

  function resetQuiz() {
    setShowQuiz(false);
    setQuizStep(1);
    setMonthsInRole('');
    setSkillChecklist({});
    setExperienceChecklist({});
    setRecommendation(null);
  }

  if (showQuiz) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Opal Career Assessment</h1>
          <p className="text-slate-600 mt-2">Let's evaluate your readiness for the next step</p>
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${quizStep >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'}`}>
                1
              </div>
              <div className={`w-20 h-1 ${quizStep >= 2 ? 'bg-blue-600' : 'bg-gray-200'}`} />
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${quizStep >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'}`}>
                2
              </div>
              <div className={`w-20 h-1 ${quizStep >= 3 ? 'bg-blue-600' : 'bg-gray-200'}`} />
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${quizStep >= 3 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'}`}>
                3
              </div>
              <div className={`w-20 h-1 ${quizStep >= 4 ? 'bg-blue-600' : 'bg-gray-200'}`} />
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${quizStep >= 4 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'}`}>
                4
              </div>
            </div>
          </div>

          {quizStep === 1 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold mb-4">Step 1: Time in Current Role</h2>
                <p className="text-gray-600 mb-4">How long have you been in your current role?</p>
                <div className="max-w-xs">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Months in current role
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={monthsInRole}
                    onChange={(e) => setMonthsInRole(e.target.value)}
                    className="input-field w-full"
                    placeholder="e.g., 9"
                  />
                  {criteria && (
                    <p className="text-sm text-gray-600 mt-2">
                      Minimum required: {criteria.minimum_tenure_months} months
                    </p>
                  )}
                </div>
              </div>
              <div className="flex justify-end">
                <button
                  onClick={() => setQuizStep(2)}
                  disabled={!monthsInRole}
                  className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next: Performance Check
                </button>
              </div>
            </div>
          )}

          {quizStep === 2 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold mb-4">Step 2: Performance Review</h2>
                <p className="text-gray-600 mb-4">Here's your recent performance ratings from 1-to-1s:</p>

                {performanceRatings.length > 0 ? (
                  <div className="space-y-3">
                    {performanceRatings.map((rating, idx) => {
                      const meetsTarget = criteria ? rating.rating >= criteria.minimum_performance_rating : false;
                      return (
                        <div key={idx} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                          <div className="flex-1">
                            <div className="flex items-center gap-3">
                              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                                meetsTarget ? 'bg-green-100' : 'bg-orange-100'
                              }`}>
                                {meetsTarget ? (
                                  <CheckCircle className="w-6 h-6 text-green-600" />
                                ) : (
                                  <AlertCircle className="w-6 h-6 text-orange-600" />
                                )}
                              </div>
                              <div>
                                <div className="font-semibold text-gray-900">
                                  Rating: {rating.rating.toFixed(1)} / 5.0
                                </div>
                                <div className="text-sm text-gray-600">
                                  {new Date(rating.review_date).toLocaleDateString()} - Reviewed by {rating.reviewer_name}
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                            meetsTarget ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'
                          }`}>
                            {meetsTarget ? 'On Target' : 'Below Target'}
                          </div>
                        </div>
                      );
                    })}
                    {criteria && (
                      <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="flex items-start gap-3">
                          <Target className="w-5 h-5 text-blue-600 mt-0.5" />
                          <div>
                            <div className="font-medium text-blue-900">Performance Target</div>
                            <div className="text-sm text-blue-700">
                              Average rating of {criteria.minimum_performance_rating.toFixed(2)} or above required for progression
                            </div>
                            <div className="text-sm text-blue-700 mt-1">
                              Your current average: {(performanceRatings.reduce((sum, r) => sum + r.rating, 0) / performanceRatings.length).toFixed(2)}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-200">
                    <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-600">No performance reviews found yet.</p>
                  </div>
                )}
              </div>
              <div className="flex justify-between">
                <button onClick={() => setQuizStep(1)} className="btn-secondary">
                  Back
                </button>
                <button onClick={() => setQuizStep(3)} className="btn-primary">
                  Next: Skills & Experience
                </button>
              </div>
            </div>
          )}

          {quizStep === 3 && criteria && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold mb-4">Step 3: Skills & Experience Assessment</h2>
                <p className="text-gray-600 mb-6">
                  Please review the requirements for progressing to <strong>{criteria.to_level}</strong> and confirm which you've achieved:
                </p>

                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                      <Award className="w-5 h-5 text-blue-600" />
                      Required Skills
                    </h3>
                    <div className="space-y-3">
                      {criteria.required_skills.map((skill: SkillRequirement) => (
                        <label key={skill.name} className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg border-2 border-gray-200 hover:border-blue-300 cursor-pointer transition-colors">
                          <input
                            type="checkbox"
                            checked={skillChecklist[skill.name] || false}
                            onChange={(e) => setSkillChecklist({ ...skillChecklist, [skill.name]: e.target.checked })}
                            className="mt-1 w-5 h-5 text-blue-600 rounded"
                          />
                          <div className="flex-1">
                            <div className="font-medium text-gray-900">{skill.name}</div>
                            <div className="text-sm text-gray-600">{skill.description}</div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-blue-600" />
                      Required Experience
                    </h3>
                    <div className="space-y-3">
                      {criteria.required_experience.map((exp: ExperienceRequirement) => (
                        <label key={exp.name} className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg border-2 border-gray-200 hover:border-blue-300 cursor-pointer transition-colors">
                          <input
                            type="checkbox"
                            checked={experienceChecklist[exp.name] || false}
                            onChange={(e) => setExperienceChecklist({ ...experienceChecklist, [exp.name]: e.target.checked })}
                            className="mt-1 w-5 h-5 text-blue-600 rounded"
                          />
                          <div className="flex-1">
                            <div className="font-medium text-gray-900">{exp.name}</div>
                            <div className="text-sm text-gray-600">{exp.description}</div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex justify-between">
                <button onClick={() => setQuizStep(2)} className="btn-secondary">
                  Back
                </button>
                <button onClick={submitQuiz} className="btn-primary" disabled={loading}>
                  {loading ? 'Analyzing...' : 'Get My Recommendation'}
                </button>
              </div>
            </div>
          )}

          {quizStep === 4 && recommendation && (
            <div className="space-y-6">
              <div className={`p-6 rounded-lg border-2 ${
                recommendation.ready ? 'bg-green-50 border-green-300' : 'bg-orange-50 border-orange-300'
              }`}>
                <div className="flex items-start gap-4">
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
                    recommendation.ready ? 'bg-green-100' : 'bg-orange-100'
                  }`}>
                    {recommendation.ready ? (
                      <CheckCircle className="w-10 h-10 text-green-600" />
                    ) : (
                      <AlertCircle className="w-10 h-10 text-orange-600" />
                    )}
                  </div>
                  <div className="flex-1">
                    <h2 className={`text-2xl font-bold mb-2 ${
                      recommendation.ready ? 'text-green-900' : 'text-orange-900'
                    }`}>
                      {recommendation.ready ? 'Ready for Progression!' : 'Development Needed'}
                    </h2>
                    <p className={`text-lg ${
                      recommendation.ready ? 'text-green-800' : 'text-orange-800'
                    }`}>
                      {recommendation.text}
                    </p>
                  </div>
                </div>
              </div>

              {recommendation.gaps.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-4">Areas for Development</h3>
                  <div className="space-y-4">
                    {recommendation.gaps.map((gap: any, idx: number) => (
                      <div key={idx} className="p-4 bg-white border border-gray-200 rounded-lg">
                        <div className="flex items-start justify-between mb-2">
                          <div className="font-semibold text-gray-900">{gap.area}</div>
                          <span className="px-3 py-1 bg-orange-100 text-orange-800 text-xs font-medium rounded-full">
                            {gap.status}
                          </span>
                        </div>
                        <div className="text-sm text-gray-600 mb-2">
                          Current: <span className="font-medium">{gap.current}</span> | Required: <span className="font-medium">{gap.required}</span>
                        </div>
                        <div className="text-sm text-gray-700 bg-gray-50 p-3 rounded border-l-4 border-blue-500">
                          {gap.recommendation}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3">
                <button onClick={resetQuiz} className="btn-secondary">
                  Close
                </button>
                {recommendation.ready && (
                  <button className="btn-primary">
                    Schedule Progression Discussion
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 h-full flex flex-col">
      {/* Hero greeting */}
      <div className="card flex items-center gap-5" style={{ background: 'linear-gradient(135deg, var(--brand-card-bg, #fff) 0%, rgba(8,145,178,0.04) 100%)', borderColor: 'rgba(8,145,178,0.2)' }}>
        <div className="w-16 h-16 rounded-full overflow-hidden flex-shrink-0 ring-2" style={{ ringColor: 'var(--brand-primary)' }}>
          {branding.opal_avatar_url ? (
            <img src={branding.opal_avatar_url} alt={displayName} className="w-full h-full object-cover" />
          ) : (
            <svg width="64" height="64" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <defs>
                <radialGradient id="cp-opal-bg" cx="50%" cy="40%" r="55%">
                  <stop offset="0%" stopColor="#e0f7fa" />
                  <stop offset="40%" stopColor="#b2ebf2" />
                  <stop offset="100%" stopColor="#00bcd4" />
                </radialGradient>
                <radialGradient id="cp-opal-face" cx="50%" cy="45%" r="50%">
                  <stop offset="0%" stopColor="#ffffff" />
                  <stop offset="100%" stopColor="#e0f7fa" />
                </radialGradient>
                <radialGradient id="cp-opal-iris" cx="40%" cy="35%" r="55%">
                  <stop offset="0%" stopColor="#80deea" />
                  <stop offset="60%" stopColor="#00bcd4" />
                  <stop offset="100%" stopColor="#006064" />
                </radialGradient>
                <radialGradient id="cp-opal-shimmer" cx="30%" cy="30%" r="70%">
                  <stop offset="0%" stopColor="rgba(255,255,255,0.6)" />
                  <stop offset="100%" stopColor="rgba(255,255,255,0)" />
                </radialGradient>
              </defs>
              <circle cx="40" cy="40" r="36" fill="url(#cp-opal-bg)" />
              <circle cx="40" cy="40" r="36" fill="url(#cp-opal-shimmer)" />
              <ellipse cx="40" cy="42" rx="22" ry="24" fill="url(#cp-opal-face)" />
              <path d="M18 38 Q20 16 40 14 Q60 16 62 38 Q55 20 40 20 Q25 20 18 38Z" fill="#00838f" opacity="0.8" />
              <ellipse cx="32" cy="39" rx="5" ry="5.5" fill="white" />
              <ellipse cx="32" cy="39" rx="3.5" ry="3.8" fill="url(#cp-opal-iris)" />
              <ellipse cx="32" cy="39" rx="2" ry="2.2" fill="#004d40" />
              <circle cx="33.2" cy="37.8" r="0.9" fill="white" />
              <ellipse cx="48" cy="39" rx="5" ry="5.5" fill="white" />
              <ellipse cx="48" cy="39" rx="3.5" ry="3.8" fill="url(#cp-opal-iris)" />
              <ellipse cx="48" cy="39" rx="2" ry="2.2" fill="#004d40" />
              <circle cx="49.2" cy="37.8" r="0.9" fill="white" />
              <path d="M38.5 44 Q40 46 41.5 44" stroke="#80cbc4" strokeWidth="1" fill="none" strokeLinecap="round" />
              <path d="M34 50 Q40 55 46 50" stroke="#00838f" strokeWidth="1.5" fill="none" strokeLinecap="round" />
              <ellipse cx="29" cy="28" rx="6" ry="4" fill="white" opacity="0.3" transform="rotate(-20 29 28)" />
            </svg>
          )}
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Hello, I'm {displayName}</h1>
          <p className="text-slate-500 mt-0.5">Your AI Growth Guide — here to help you grow, plan, and succeed.</p>
        </div>
      </div>

      {availableFunctions.length > 0 && (
        <div className="card bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center flex-shrink-0">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-green-900 mb-2">Available Actions</h3>
                <p className="text-green-800">
                  I can help you take actions directly. Here are {availableFunctions.length} things I can do for you:
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowFunctions(!showFunctions)}
              className="text-green-700 hover:text-green-900 transition-colors"
            >
              {showFunctions ? 'Hide' : 'Show'}
            </button>
          </div>

          {showFunctions && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
              {availableFunctions.map((func) => (
                <div key={func.id} className="bg-white p-4 rounded-lg border border-green-200">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Zap className="w-5 h-5 text-green-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-gray-900 text-sm mb-1">{func.display_name}</h4>
                      <p className="text-xs text-gray-600">{func.description}</p>
                      <span className="inline-block mt-2 text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                        {func.category}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="card bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
            <ClipboardCheck className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-blue-900 mb-2">Career Progression Assessment</h3>
            <p className="text-blue-800 mb-4">
              Take our comprehensive assessment to see if you're ready for the next step in your career. We'll review your time in role, performance ratings, skills, and experience against internal progression criteria.
            </p>
            <button onClick={startProgressionQuiz} className="btn-primary" disabled={loading}>
              {loading ? 'Loading...' : 'Start Assessment'}
            </button>
          </div>
        </div>
      </div>

      <div className="card bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
            <Target className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-purple-900 mb-2">AI Career Planning Quiz</h3>
            <p className="text-purple-800 mb-4">
              Take the comprehensive 4-step AI Career Quiz to plan your career journey. Opal will analyse your current skills, identify gaps, recommend learning pathways, and help you create an action plan to achieve your career goals.
            </p>
            <button
              onClick={() => onNavigate?.('/career-quiz')}
              className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-semibold"
            >
              Take AI Career Quiz
            </button>
          </div>
        </div>
      </div>

      <div className="card flex-1 flex flex-col">
        <div className="flex-1 overflow-y-auto space-y-4 mb-4">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] p-4 rounded-lg ${
                  msg.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-900'
                }`}
              >
                <p className="text-sm">{msg.content}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask about your career path..."
            className="input-field flex-1"
          />
          <button onClick={handleSend} className="btn-primary">
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="card bg-blue-50 border-blue-200">
        <h3 className="font-semibold text-blue-900 mb-3">Suggested Questions</h3>
        <div className="space-y-2">
          {[
            'What skills do I need for the next level?',
            'What training is available for my role?',
            'How can I improve my performance rating?',
            'What internal opportunities match my skills?',
          ].map((question, idx) => (
            <button
              key={idx}
              onClick={() => setMessage(question)}
              className="w-full text-left p-3 bg-white hover:bg-blue-100 border border-blue-200 rounded-lg text-sm text-slate-700 transition-colors"
            >
              {question}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
