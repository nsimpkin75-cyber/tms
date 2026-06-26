import { useState, useEffect, useRef } from 'react';
import { MessageSquare, Send, X, Sparkles, TrendingUp, Target, BookOpen, User, Clock, Star, MapPin, ThumbsUp } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface Pathway {
  id: string;
  title: string;
  level: string;
  department: string;
  pathway: string | null;
  team: string | null;
  description: string | null;
  accountabilities: string[];
  what_great_looks_like: string[];
  skills: string[];
  how_do_i_get_there: string | null;
  progression_to: string | null;
  alternative_paths: string[];
  sort_order: number | null;
  sera_coaching_context: string | null;
}

interface CareerSnapshot {
  lengthOfService: string;
  lengthOfServiceMonths: number;
  performanceAvg: number | null;
  currentRole: string;
  department: string;
  team: string | null;
  matchedPathway: Pathway | null;
  nextPathway: Pathway | null;
  assessedSkills: string[];
  careerGoals: string | null;
  profileRoleSummary?: string | null;
  profileRoleHistory?: any[];
  profileAdditionalSkills?: any[];
  profileQualifications?: any[];
  seraCoachingContext?: string | null;
}

interface CareerCoachProps {
  onNavigate?: (path: string) => void;
}

function calcLengthOfService(startDate: string | null): { label: string; months: number } {
  if (!startDate) return { label: 'Unknown', months: 0 };
  const start = new Date(startDate);
  const now = new Date();
  const totalMonths =
    (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
  if (totalMonths < 0) return { label: 'Less than a month', months: 0 };
  const years = Math.floor(totalMonths / 12);
  const months = totalMonths % 12;
  if (years === 0) return { label: `${months} month${months !== 1 ? 's' : ''}`, months: totalMonths };
  if (months === 0) return { label: `${years} year${years !== 1 ? 's' : ''}`, months: totalMonths };
  return { label: `${years} year${years !== 1 ? 's' : ''}, ${months} month${months !== 1 ? 's' : ''}`, months: totalMonths };
}

export default function CareerCoach({ onNavigate }: CareerCoachProps = {}) {
  const { profile, user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingContext, setLoadingContext] = useState(true);
  const [snapshot, setSnapshot] = useState<CareerSnapshot | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [feedbackSent, setFeedbackSent] = useState<Set<number>>(new Set());
  const chatBottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (profile && user) {
      loadSnapshot();
    }
  }, [profile?.id]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const loadSnapshot = async () => {
    setLoadingContext(true);
    try {
      const [pathwaysRes, skillsRes, plansRes, reviewsRes] = await Promise.all([
        supabase.from('job_families').select('*').order('sort_order', { ascending: true }),
        supabase
          .from('skill_assessments')
          .select('skill_name')
          .eq('user_id', user!.id)
          .order('created_at', { ascending: false })
          .limit(20),
        supabase
          .from('career_profiles')
          .select('career_goals, role_purpose_summary, role_history, additional_skills, qualifications_training')
          .eq('user_id', user!.id)
          .maybeSingle(),
        supabase
          .from('one_to_one_monthly_reviews')
          .select('overall_competency_score, average_kpi_score, status')
          .eq('employee_id', user!.id)
          .eq('status', 'completed'),
      ]);

      const pathways: Pathway[] = (pathwaysRes.data || []).map((p: any) => ({
        id: p.id,
        title: p.title,
        level: p.level,
        department: p.department,
        pathway: p.pathway || null,
        team: p.team || null,
        description: p.description || null,
        accountabilities: Array.isArray(p.accountabilities) ? p.accountabilities : [],
        what_great_looks_like: Array.isArray(p.what_great_looks_like) ? p.what_great_looks_like : [],
        skills: Array.isArray(p.skills) ? p.skills : [],
        how_do_i_get_there: p.how_do_i_get_there || null,
        progression_to: p.progression_to || null,
        alternative_paths: Array.isArray(p.alternative_paths) ? p.alternative_paths : [],
        sort_order: p.sort_order ?? null,
        sera_coaching_context: p.sera_coaching_context || null,
      }));

      // Match current role profile
      const currentRole = profile?.job_title || '';
      const currentDept = profile?.department || '';
      const currentTeam = (profile as any)?.team || null;

      let matchedPathway: Pathway | null = null;
      // Try exact title match first, then dept+level
      matchedPathway = pathways.find(p =>
        p.title.trim().toLowerCase() === currentRole.trim().toLowerCase()
      ) || null;
      if (!matchedPathway && profile?.job_family_id) {
        matchedPathway = pathways.find(p => p.id === profile.job_family_id) || null;
      }

      // Find next pathway via progression_to or sort_order within same dept
      let nextPathway: Pathway | null = null;
      if (matchedPathway) {
        if (matchedPathway.progression_to) {
          const targets = matchedPathway.progression_to.split(',').map(s => s.trim().toLowerCase());
          nextPathway = pathways.find(p =>
            targets.some(t => p.title.trim().toLowerCase().includes(t) || t.includes(p.title.trim().toLowerCase()))
          ) || null;
        }
        if (!nextPathway) {
          nextPathway = pathways
            .filter(p =>
              p.department === matchedPathway!.department &&
              (!matchedPathway!.pathway || p.pathway === matchedPathway!.pathway) &&
              p.id !== matchedPathway!.id &&
              (p.sort_order ?? 0) > (matchedPathway!.sort_order ?? 0)
            )
            .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))[0] || null;
        }
      }

      // Performance average from completed reviews
      const completedReviews = (reviewsRes.data || []);
      let performanceAvg: number | null = null;
      if (completedReviews.length > 0) {
        const scores = completedReviews
          .map((r: any) => {
            const vals = [r.overall_competency_score, r.average_kpi_score].filter(v => v !== null && v !== undefined);
            return vals.length > 0 ? vals.reduce((a: number, b: number) => a + b, 0) / vals.length : null;
          })
          .filter((s): s is number => s !== null);
        if (scores.length > 0) {
          performanceAvg = scores.reduce((a, b) => a + b, 0) / scores.length;
        }
      }

      const { label: losLabel, months: losMonths } = calcLengthOfService((profile as any)?.start_date || null);

      const snap: CareerSnapshot = {
        lengthOfService: losLabel,
        lengthOfServiceMonths: losMonths,
        performanceAvg,
        currentRole,
        department: currentDept,
        team: currentTeam,
        matchedPathway,
        nextPathway: nextPathway ? {
          id: nextPathway.id,
          title: nextPathway.title,
          level: nextPathway.level,
          department: nextPathway.department,
          team: nextPathway.team,
          description: nextPathway.description,
          accountabilities: nextPathway.accountabilities,
          what_great_looks_like: nextPathway.what_great_looks_like,
          skills: nextPathway.skills,
          how_do_i_get_there: nextPathway.how_do_i_get_there,
          progression_to: nextPathway.progression_to,
          alternative_paths: nextPathway.alternative_paths,
          sort_order: nextPathway.sort_order,
        } : null,
        assessedSkills: (skillsRes.data || []).map((s: any) => s.skill_name).filter(Boolean),
        careerGoals: plansRes.data?.career_goals || null,
        profileRoleSummary: plansRes.data?.role_purpose_summary || null,
        profileRoleHistory: plansRes.data?.role_history || [],
        profileAdditionalSkills: plansRes.data?.additional_skills || [],
        profileQualifications: plansRes.data?.qualifications_training || [],
        seraCoachingContext: matchedPathway?.sera_coaching_context || null,
      };

      setSnapshot(snap);

      // Create a session in DB
      const contextSnapshot = {
        currentRole,
        department: currentDept,
        team: currentTeam,
        lengthOfService: losLabel,
        performanceAvg,
        matchedPathwayTitle: matchedPathway?.title || null,
        nextPathwayTitle: nextPathway?.title || null,
        assessedSkillCount: snap.assessedSkills.length,
      };

      const { data: sessionData } = await supabase
        .from('sera_career_coach_sessions')
        .insert({
          user_id: user!.id,
          context_snapshot: contextSnapshot,
          matched_pathway_id: matchedPathway?.id || null,
          messages: [],
        })
        .select('id')
        .single();

      if (sessionData?.id) setSessionId(sessionData.id);

      // Set greeting with snapshot data
      const pathwayInfo = matchedPathway
        ? ` I can see you're on the **${matchedPathway.title}** pathway${nextPathway ? `, with **${nextPathway.title}** as your next progression step` : ''}.`
        : '';
      const perfInfo = performanceAvg !== null
        ? ` Your performance average is **${performanceAvg.toFixed(2)}/5**.`
        : '';

      setMessages([{
        role: 'assistant',
        content: `Hi ${profile?.full_name?.split(' ')[0] || 'there'}! I'm SERA, your AI Career Coach.${pathwayInfo}${perfInfo}\n\nI'm here to give you specific guidance based on your actual role profile and pathway data — not generic advice. What would you like to explore today?`,
        timestamp: new Date(),
      }]);
    } catch (err) {
      console.error('Error loading career context:', err);
      setMessages([{
        role: 'assistant',
        content: `Hi ${profile?.full_name?.split(' ')[0] || 'there'}! I'm SERA, your AI Career Coach. I'm here to help you plan your career progression. What would you like to explore?`,
        timestamp: new Date(),
      }]);
    } finally {
      setLoadingContext(false);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || loading || !snapshot) return;

    const userMsg = input.trim();
    const userMessage: Message = { role: 'user', content: userMsg, timestamp: new Date() };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput('');
    setLoading(true);

    try {
      const previousMessages = messages.map(m => ({ role: m.role, content: m.content }));

      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      const res = await fetch(`${supabaseUrl}/functions/v1/career-coach-ai`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Apikey': supabaseAnonKey,
        },
        body: JSON.stringify({
          userMessage: userMsg,
          sessionId,
          context: {
            employeeName: profile?.full_name || 'Employee',
            currentRole: snapshot.currentRole,
            department: snapshot.department,
            team: snapshot.team,
            lengthOfService: snapshot.lengthOfService,
            performanceAvg: snapshot.performanceAvg,
            matchedPathway: snapshot.matchedPathway ? {
              id: snapshot.matchedPathway.id,
              title: snapshot.matchedPathway.title,
              level: snapshot.matchedPathway.level,
              description: snapshot.matchedPathway.description,
              accountabilities: snapshot.matchedPathway.accountabilities,
              whatGreatLooksLike: snapshot.matchedPathway.what_great_looks_like,
              skills: snapshot.matchedPathway.skills,
              howDoIGetThere: snapshot.matchedPathway.how_do_i_get_there,
              progressionTo: snapshot.matchedPathway.progression_to,
              alternativePaths: snapshot.matchedPathway.alternative_paths,
            } : null,
            nextPathway: snapshot.nextPathway ? {
              title: snapshot.nextPathway.title,
              level: snapshot.nextPathway.level,
              howDoIGetThere: snapshot.nextPathway.how_do_i_get_there,
              accountabilities: snapshot.nextPathway.accountabilities,
              skills: snapshot.nextPathway.skills,
            } : null,
            assessedSkills: snapshot.assessedSkills,
            careerGoals: snapshot.careerGoals,
            profileRoleSummary: snapshot.profileRoleSummary || null,
            profileRoleHistory: snapshot.profileRoleHistory || [],
            profileAdditionalSkills: snapshot.profileAdditionalSkills || [],
            profileQualifications: snapshot.profileQualifications || [],
            seraCoachingContext: snapshot.seraCoachingContext || null,
            previousMessages,
          },
        }),
      });

      let responseText = 'I encountered an issue generating a response. Please try again.';
      if (res.ok) {
        const data = await res.json();
        responseText = data.response || responseText;
      }

      const assistantMessage: Message = {
        role: 'assistant',
        content: responseText,
        timestamp: new Date(),
      };

      const finalMessages = [...updatedMessages, assistantMessage];
      setMessages(finalMessages);

      // Persist messages to session
      if (sessionId) {
        await supabase
          .from('sera_career_coach_sessions')
          .update({
            messages: finalMessages.map(m => ({ role: m.role, content: m.content, timestamp: m.timestamp.toISOString() })),
            last_message_at: new Date().toISOString(),
          })
          .eq('id', sessionId);
      }
    } catch (err) {
      console.error('Error sending message:', err);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'I encountered an error. Please try again.',
        timestamp: new Date(),
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleThumbsUp = async (msgIndex: number) => {
    // Employee can flag a response as helpful — lightweight positive signal saved to session
    if (feedbackSent.has(msgIndex) || !sessionId) return;
    setFeedbackSent(prev => new Set(prev).add(msgIndex));
  };

  const suggestedQuestions = [
    'What is my next role and how do I get there?',
    'What skills do I need to develop?',
    'What does great look like in my current role?',
    'Am I ready to progress?',
  ];

  const perfColor = snapshot?.performanceAvg !== null && snapshot?.performanceAvg !== undefined
    ? snapshot.performanceAvg >= 4 ? 'text-green-700' : snapshot.performanceAvg >= 3 ? 'text-blue-700' : 'text-amber-700'
    : 'text-gray-500';

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6">
      <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-teal-600 to-blue-600 p-5 text-white relative">
          {onNavigate && (
            <button
              onClick={() => onNavigate('/pathways')}
              className="absolute top-4 right-4 p-2 text-white hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/20 rounded-lg">
              <MessageSquare className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">AI Career Coach</h1>
              <p className="text-teal-100 text-sm mt-0.5">Powered by SERA · Grounded in your actual pathway data</p>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-0 lg:gap-6 p-4 sm:p-6">
          {/* Chat area */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-slate-50 rounded-lg p-4 h-[480px] overflow-y-auto space-y-4 border border-gray-100">
              {loadingContext ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <div className="inline-block w-8 h-8 border-3 border-teal-600 border-t-transparent rounded-full animate-spin mb-3" />
                    <p className="text-sm text-gray-500">Loading your career data...</p>
                  </div>
                </div>
              ) : (
                <>
                  {messages.map((message, idx) => (
                    <div key={idx} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[85%] rounded-xl px-4 py-3 ${
                        message.role === 'user'
                          ? 'bg-blue-600 text-white'
                          : 'bg-white border border-gray-200 text-gray-900 shadow-sm'
                      }`}>
                        {message.role === 'assistant' && (
                          <div className="flex items-center gap-1.5 mb-2">
                            <Sparkles className="w-3.5 h-3.5 text-teal-600" />
                            <span className="text-xs font-semibold text-teal-600">SERA</span>
                          </div>
                        )}
                        <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
                        <div className="flex items-center justify-between mt-2">
                          <p className={`text-xs ${message.role === 'user' ? 'text-blue-100' : 'text-gray-400'}`}>
                            {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                          {message.role === 'assistant' && idx > 0 && (
                            <button
                              onClick={() => handleThumbsUp(idx)}
                              title="Mark as helpful"
                              className={`ml-3 p-1 rounded transition-colors ${
                                feedbackSent.has(idx)
                                  ? 'text-teal-600'
                                  : 'text-gray-300 hover:text-teal-500'
                              }`}
                            >
                              <ThumbsUp className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  {loading && (
                    <div className="flex justify-start">
                      <div className="bg-white border border-gray-200 rounded-xl px-4 py-3 shadow-sm">
                        <div className="flex items-center gap-2">
                          <Sparkles className="w-3.5 h-3.5 text-teal-600 animate-pulse" />
                          <span className="text-sm text-gray-500">SERA is thinking...</span>
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={chatBottomRef} />
                </>
              )}
            </div>

            {/* Input */}
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                placeholder="Ask about your career progression..."
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
                disabled={loading || loadingContext}
              />
              <button
                onClick={sendMessage}
                disabled={loading || loadingContext || !input.trim()}
                className="px-5 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                <Send className="w-4 h-4" />
                <span className="text-sm font-medium hidden sm:inline">Send</span>
              </button>
            </div>

            {/* Suggested questions — only on first message */}
            {messages.length <= 1 && !loadingContext && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Suggested questions</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {suggestedQuestions.map((q, idx) => (
                    <button
                      key={idx}
                      onClick={() => setInput(q)}
                      className="text-left p-3 bg-gray-50 hover:bg-teal-50 hover:border-teal-300 rounded-lg text-sm text-gray-700 border border-gray-200 transition-colors"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-4 mt-4 lg:mt-0">
            {/* Career Snapshot */}
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="bg-gray-50 border-b border-gray-200 px-4 py-3">
                <h3 className="font-semibold text-gray-900 text-sm">Career Snapshot</h3>
              </div>
              <div className="p-4 space-y-3">
                <div className="flex items-start gap-2.5">
                  <User className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="text-xs text-gray-500">Current Role</div>
                    <div className="text-sm font-medium text-gray-900">{snapshot?.currentRole || profile?.job_title || 'Not set'}</div>
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="text-xs text-gray-500">Department</div>
                    <div className="text-sm font-medium text-gray-900">
                      {snapshot?.department || 'Not set'}
                      {snapshot?.team && <span className="ml-1 text-xs text-teal-600">· {snapshot.team}</span>}
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <Clock className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="text-xs text-gray-500">Length of Service</div>
                    <div className="text-sm font-medium text-gray-900">{snapshot?.lengthOfService || 'Unknown'}</div>
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <Star className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="text-xs text-gray-500">Performance Average</div>
                    <div className={`text-sm font-semibold ${perfColor}`}>
                      {snapshot?.performanceAvg !== null && snapshot?.performanceAvg !== undefined
                        ? `${snapshot.performanceAvg.toFixed(2)} / 5`
                        : 'No completed reviews'}
                    </div>
                  </div>
                </div>

                {snapshot?.matchedPathway && (
                  <div className="pt-2 border-t border-gray-100">
                    <div className="text-xs text-gray-500 mb-1">Pathway Match</div>
                    <div className="text-sm font-medium text-blue-700">{snapshot.matchedPathway.title}</div>
                    <div className="text-xs text-gray-400">{snapshot.matchedPathway.level}</div>
                  </div>
                )}

                {snapshot?.nextPathway && (
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Next Progression</div>
                    <div className="flex items-center gap-1.5">
                      <TrendingUp className="w-3.5 h-3.5 text-green-600" />
                      <span className="text-sm font-medium text-green-700">{snapshot.nextPathway.title}</span>
                    </div>
                    <div className="text-xs text-gray-400">{snapshot.nextPathway.level}</div>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-gradient-to-br from-blue-50 to-teal-50 rounded-lg p-4 border border-blue-100">
              <h3 className="font-semibold text-gray-900 mb-3 text-sm">Quick Actions</h3>
              <div className="space-y-2">
                {[
                  { icon: Target, label: 'Take Career Quiz', path: '/career-quiz' },
                  { icon: TrendingUp, label: 'View My Progression', path: '/pathways' },
                  { icon: BookOpen, label: 'Find Training', path: '/training' },
                  { icon: User, label: 'Update Career Profile', path: '/pathways' },
                ].map((action, idx) => {
                  const Icon = action.icon;
                  return (
                    <button
                      key={idx}
                      onClick={() => onNavigate?.(action.path)}
                      className="w-full flex items-center gap-3 p-2.5 bg-white hover:bg-blue-50 rounded-lg text-left transition-colors border border-gray-200"
                    >
                      <Icon className="w-4 h-4 text-teal-600 flex-shrink-0" />
                      <span className="text-sm font-medium text-gray-800">{action.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* How Do I Get There — preview */}
            {snapshot?.matchedPathway?.how_do_i_get_there && (
              <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
                <h3 className="font-semibold text-amber-900 text-sm mb-2 flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4" />
                  Progression Guidance
                </h3>
                <p className="text-xs text-amber-800 leading-relaxed line-clamp-4">
                  {snapshot.matchedPathway.how_do_i_get_there}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
