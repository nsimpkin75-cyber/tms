import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { MessageSquare, CheckCircle, AlertCircle, XCircle, Database, ChevronDown, ChevronRight, Save, X, User, Clock, Star } from 'lucide-react';

type FeedbackRating = 'good' | 'needs_detail' | 'incorrect' | 'missing_data';

interface Session {
  id: string;
  user_id: string;
  started_at: string;
  last_message_at: string;
  messages: Array<{ role: string; content: string; timestamp: string }>;
  context_snapshot: Record<string, any>;
  matched_pathway_id: string | null;
  profiles: { full_name: string; job_title: string | null; department: string | null } | null;
  feedback: FeedbackRecord[];
}

interface FeedbackRecord {
  id: string;
  message_index: number;
  feedback_rating: FeedbackRating;
  correction_notes: string | null;
  reviewed_by: string;
  reviewed_at: string;
  reviewer?: { full_name: string };
}

interface PendingFeedback {
  rating: FeedbackRating | null;
  notes: string;
}

const RATING_CONFIG: Record<FeedbackRating, { label: string; icon: typeof CheckCircle; color: string; bg: string; border: string }> = {
  good: { label: 'Good response', icon: CheckCircle, color: 'text-green-700', bg: 'bg-green-50', border: 'border-green-300' },
  needs_detail: { label: 'Needs more detail', icon: AlertCircle, color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-300' },
  incorrect: { label: 'Incorrect', icon: XCircle, color: 'text-red-700', bg: 'bg-red-50', border: 'border-red-300' },
  missing_data: { label: 'Missing data', icon: Database, color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-300' },
};

export default function SeraCareerFeedback() {
  const { profile } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedSession, setExpandedSession] = useState<string | null>(null);
  const [pendingFeedback, setPendingFeedback] = useState<Record<string, PendingFeedback>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [filterRating, setFilterRating] = useState<FeedbackRating | 'all' | 'unflagged'>('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('sera_career_coach_sessions')
        .select(`
          id, user_id, started_at, last_message_at, messages, context_snapshot, matched_pathway_id,
          profiles!sera_career_coach_sessions_user_id_fkey(full_name, job_title, department),
          sera_career_coach_feedback(id, message_index, feedback_rating, correction_notes, reviewed_by, reviewed_at)
        `)
        .order('last_message_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setSessions((data || []) as unknown as Session[]);
    } catch (err) {
      console.error('Error loading sessions:', err);
    } finally {
      setLoading(false);
    }
  };

  const saveFeedback = async (sessionId: string, messageIndex: number) => {
    const key = `${sessionId}-${messageIndex}`;
    const fb = pendingFeedback[key];
    if (!fb?.rating || !profile?.id) return;

    setSaving(key);
    try {
      // Check if feedback already exists
      const session = sessions.find(s => s.id === sessionId);
      const existing = session?.feedback?.find(f => f.message_index === messageIndex);

      if (existing) {
        await supabase
          .from('sera_career_coach_feedback')
          .update({
            feedback_rating: fb.rating,
            correction_notes: fb.notes || null,
            reviewed_by: profile.id,
            reviewed_at: new Date().toISOString(),
          })
          .eq('id', existing.id);
      } else {
        await supabase
          .from('sera_career_coach_feedback')
          .insert({
            session_id: sessionId,
            message_index: messageIndex,
            user_id: session!.user_id,
            feedback_rating: fb.rating,
            correction_notes: fb.notes || null,
            reviewed_by: profile.id,
            reviewed_at: new Date().toISOString(),
          });
      }

      // Clear pending and reload
      setPendingFeedback(prev => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
      await loadSessions();
    } catch (err) {
      console.error('Error saving feedback:', err);
    } finally {
      setSaving(null);
    }
  };

  const initPendingFeedback = (sessionId: string, messageIndex: number, existing?: FeedbackRecord) => {
    const key = `${sessionId}-${messageIndex}`;
    if (pendingFeedback[key] !== undefined) return;
    setPendingFeedback(prev => ({
      ...prev,
      [key]: {
        rating: existing?.feedback_rating || null,
        notes: existing?.correction_notes || '',
      },
    }));
  };

  const filteredSessions = sessions.filter(s => {
    if (search) {
      const name = s.profiles?.full_name?.toLowerCase() || '';
      const role = s.profiles?.job_title?.toLowerCase() || '';
      const dept = s.profiles?.department?.toLowerCase() || '';
      if (!name.includes(search.toLowerCase()) && !role.includes(search.toLowerCase()) && !dept.includes(search.toLowerCase())) return false;
    }
    if (filterRating === 'unflagged') {
      const assistantCount = (s.messages || []).filter(m => m.role === 'assistant').length - 1; // exclude greeting
      return assistantCount > (s.feedback?.length || 0);
    }
    if (filterRating !== 'all') {
      return s.feedback?.some(f => f.feedback_rating === filterRating);
    }
    return true;
  });

  const totalSessions = sessions.length;
  const totalFeedback = sessions.reduce((acc, s) => acc + (s.feedback?.length || 0), 0);
  const goodCount = sessions.reduce((acc, s) => acc + (s.feedback?.filter(f => f.feedback_rating === 'good').length || 0), 0);
  const issueCount = sessions.reduce((acc, s) => acc + (s.feedback?.filter(f => f.feedback_rating !== 'good').length || 0), 0);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Opal Career Coach Feedback</h2>
        <p className="text-gray-600 mt-1">Review AI career coaching responses and provide quality feedback. This does not affect review ratings or moderation.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Sessions', value: totalSessions, color: 'text-blue-700', bg: 'bg-blue-50' },
          { label: 'Responses Reviewed', value: totalFeedback, color: 'text-gray-700', bg: 'bg-gray-50' },
          { label: 'Good Responses', value: goodCount, color: 'text-green-700', bg: 'bg-green-50' },
          { label: 'Flagged for Review', value: issueCount, color: 'text-amber-700', bg: 'bg-amber-50' },
        ].map(stat => (
          <div key={stat.label} className={`${stat.bg} rounded-lg p-4 border border-gray-200`}>
            <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
            <div className="text-xs text-gray-600 mt-0.5">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <input
          type="text"
          placeholder="Search by name, role or department..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex-1 min-w-48 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <div className="flex flex-wrap gap-2">
          {([
            { id: 'all', label: 'All' },
            { id: 'unflagged', label: 'Unflagged' },
            { id: 'good', label: 'Good' },
            { id: 'needs_detail', label: 'Needs Detail' },
            { id: 'incorrect', label: 'Incorrect' },
            { id: 'missing_data', label: 'Missing Data' },
          ] as { id: typeof filterRating; label: string }[]).map(f => (
            <button
              key={f.id}
              onClick={() => setFilterRating(f.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                filterRating === f.id
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Sessions list */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filteredSessions.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No sessions found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredSessions.map(session => {
            const isExpanded = expandedSession === session.id;
            const assistantMessages = (session.messages || [])
              .map((m, i) => ({ ...m, originalIndex: i }))
              .filter(m => m.role === 'assistant')
              .slice(1); // skip greeting
            const reviewedCount = session.feedback?.length || 0;
            const totalResponses = assistantMessages.length;

            return (
              <div key={session.id} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                {/* Session header */}
                <button
                  onClick={() => setExpandedSession(isExpanded ? null : session.id)}
                  className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors text-left"
                >
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="flex-shrink-0 w-9 h-9 bg-teal-100 rounded-full flex items-center justify-center">
                      <User className="w-4 h-4 text-teal-700" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-medium text-gray-900 text-sm">{session.profiles?.full_name || 'Unknown User'}</div>
                      <div className="text-xs text-gray-500 truncate">
                        {session.profiles?.job_title || 'No role'} · {session.profiles?.department || 'No dept'}
                      </div>
                    </div>
                    <div className="hidden sm:flex items-center gap-3 ml-4 flex-shrink-0">
                      <div className="flex items-center gap-1 text-xs text-gray-400">
                        <Clock className="w-3.5 h-3.5" />
                        {new Date(session.started_at).toLocaleDateString()}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-gray-400">
                        <MessageSquare className="w-3.5 h-3.5" />
                        {totalResponses} response{totalResponses !== 1 ? 's' : ''}
                      </div>
                      {/* Context snapshot badges */}
                      {session.context_snapshot?.matchedPathwayTitle && (
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
                          {session.context_snapshot.matchedPathwayTitle}
                        </span>
                      )}
                      {session.context_snapshot?.performanceAvg !== null && session.context_snapshot?.performanceAvg !== undefined && (
                        <span className="flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
                          <Star className="w-3 h-3" />
                          {Number(session.context_snapshot.performanceAvg).toFixed(1)}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 ml-3 flex-shrink-0">
                    <div className="text-xs text-gray-500 hidden sm:block">
                      {reviewedCount}/{totalResponses} reviewed
                    </div>
                    <div className={`w-2 h-2 rounded-full ${reviewedCount >= totalResponses && totalResponses > 0 ? 'bg-green-400' : 'bg-amber-400'}`} />
                    {isExpanded ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
                  </div>
                </button>

                {/* Expanded: messages */}
                {isExpanded && (
                  <div className="border-t border-gray-100 bg-gray-50 p-4 space-y-6">
                    {/* Context snapshot */}
                    <div className="bg-white rounded-lg border border-gray-200 p-4">
                      <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Context Opal had access to</h4>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {Object.entries(session.context_snapshot || {}).map(([k, v]) => {
                          if (v === null || v === undefined) return null;
                          const label = k.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase());
                          return (
                            <div key={k}>
                              <div className="text-xs text-gray-400">{label}</div>
                              <div className="text-xs font-medium text-gray-800">{String(v)}</div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {assistantMessages.length === 0 ? (
                      <p className="text-sm text-gray-400 text-center py-4">No coaching responses in this session yet.</p>
                    ) : (
                      assistantMessages.map(msg => {
                        const fbKey = `${session.id}-${msg.originalIndex}`;
                        const existingFb = session.feedback?.find(f => f.message_index === msg.originalIndex);
                        const pending = pendingFeedback[fbKey];
                        const userMsg = session.messages[msg.originalIndex - 1];

                        return (
                          <div key={msg.originalIndex} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                            {/* User question context */}
                            {userMsg?.role === 'user' && (
                              <div className="bg-blue-50 border-b border-gray-200 px-4 py-2">
                                <span className="text-xs text-blue-600 font-medium">Employee asked: </span>
                                <span className="text-xs text-blue-800">{userMsg.content}</span>
                              </div>
                            )}

                            {/* Opal response */}
                            <div className="px-4 py-3">
                              <div className="flex items-center gap-1.5 mb-2">
                                <span className="text-xs font-semibold text-teal-600">Opal responded:</span>
                                {existingFb && !pending && (
                                  <span className={`ml-2 px-2 py-0.5 text-xs rounded-full border ${RATING_CONFIG[existingFb.feedback_rating].bg} ${RATING_CONFIG[existingFb.feedback_rating].border} ${RATING_CONFIG[existingFb.feedback_rating].color}`}>
                                    {RATING_CONFIG[existingFb.feedback_rating].label}
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                            </div>

                            {/* Feedback panel */}
                            <div className="border-t border-gray-100 bg-gray-50 px-4 py-3">
                              {!pending ? (
                                <button
                                  onClick={() => initPendingFeedback(session.id, msg.originalIndex, existingFb)}
                                  className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                                >
                                  {existingFb ? 'Edit feedback' : 'Add feedback'}
                                </button>
                              ) : (
                                <div className="space-y-3">
                                  <div className="flex flex-wrap gap-2">
                                    {(Object.entries(RATING_CONFIG) as [FeedbackRating, typeof RATING_CONFIG[FeedbackRating]][]).map(([rating, cfg]) => {
                                      const Icon = cfg.icon;
                                      const selected = pending.rating === rating;
                                      return (
                                        <button
                                          key={rating}
                                          onClick={() => setPendingFeedback(prev => ({ ...prev, [fbKey]: { ...prev[fbKey], rating } }))}
                                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                                            selected ? `${cfg.bg} ${cfg.border} ${cfg.color}` : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                                          }`}
                                        >
                                          <Icon className="w-3.5 h-3.5" />
                                          {cfg.label}
                                        </button>
                                      );
                                    })}
                                  </div>
                                  <textarea
                                    value={pending.notes}
                                    onChange={e => setPendingFeedback(prev => ({ ...prev, [fbKey]: { ...prev[fbKey], notes: e.target.value } }))}
                                    placeholder="Correction notes or suggestions for improvement (optional)..."
                                    rows={3}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                                  />
                                  <div className="flex gap-2">
                                    <button
                                      onClick={() => saveFeedback(session.id, msg.originalIndex)}
                                      disabled={!pending.rating || saving === fbKey}
                                      className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed"
                                    >
                                      <Save className="w-3.5 h-3.5" />
                                      {saving === fbKey ? 'Saving...' : 'Save feedback'}
                                    </button>
                                    <button
                                      onClick={() => setPendingFeedback(prev => { const n = { ...prev }; delete n[fbKey]; return n; })}
                                      className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-200 text-gray-700 text-xs font-medium rounded-lg hover:bg-gray-300"
                                    >
                                      <X className="w-3.5 h-3.5" />
                                      Cancel
                                    </button>
                                  </div>
                                  {existingFb && (
                                    <p className="text-xs text-gray-400">
                                      Last reviewed {new Date(existingFb.reviewed_at).toLocaleDateString()}
                                    </p>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
