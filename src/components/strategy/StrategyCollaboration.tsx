import { useState, useEffect } from 'react';
import { MessageSquare, Reply, CheckCircle, ChevronDown, ChevronRight, Send } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface CollabEntry {
  id: string;
  strategy_id: string | null;
  plan_id: string | null;
  author_id: string;
  comment_type: 'comment' | 'question' | 'amendment_request' | 'concern' | 'response';
  content: string;
  parent_id: string | null;
  resolved: boolean;
  created_at: string;
  author?: { full_name: string; role: string };
  replies?: CollabEntry[];
}

const TYPE_LABELS: Record<string, { label: string; colour: string }> = {
  comment:           { label: 'Comment',            colour: 'bg-slate-100 text-slate-700' },
  question:          { label: 'Question',           colour: 'bg-blue-100 text-blue-700' },
  amendment_request: { label: 'Amendment Request',  colour: 'bg-amber-100 text-amber-700' },
  concern:           { label: 'Concern',             colour: 'bg-rose-100 text-rose-700' },
  response:          { label: 'Response',            colour: 'bg-green-100 text-green-700' },
};

interface Props {
  strategyId?: string;
  planId?: string;
  readOnly?: boolean;
}

export default function StrategyCollaboration({ strategyId, planId, readOnly = false }: Props) {
  const { profile } = useAuth();
  const [entries, setEntries] = useState<CollabEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState('');
  const [commentType, setCommentType] = useState<CollabEntry['comment_type']>('comment');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { load(); }, [strategyId, planId]);

  async function load() {
    setLoading(true);
    let q = supabase
      .from('strategy_collaboration')
      .select('*, author:author_id(full_name, role)')
      .order('created_at', { ascending: true });
    if (planId) q = q.eq('plan_id', planId);
    else if (strategyId) q = q.eq('strategy_id', strategyId).is('plan_id', null);

    const { data } = await q;
    if (data) {
      const topLevel = (data as CollabEntry[]).filter(e => !e.parent_id);
      const replies = (data as CollabEntry[]).filter(e => e.parent_id);
      topLevel.forEach(e => {
        e.replies = replies.filter(r => r.parent_id === e.id);
      });
      setEntries(topLevel);
    }
    setLoading(false);
  }

  async function addComment(parentId?: string) {
    const text = parentId ? replyContent : content;
    if (!text.trim() || !profile) return;
    setSubmitting(true);
    const payload: Record<string, unknown> = {
      author_id: profile.id,
      comment_type: parentId ? 'response' : commentType,
      content: text.trim(),
      parent_id: parentId ?? null,
    };
    if (planId) payload.plan_id = planId;
    else if (strategyId) payload.strategy_id = strategyId;

    await supabase.from('strategy_collaboration').insert([payload]);
    if (parentId) { setReplyingTo(null); setReplyContent(''); }
    else { setContent(''); }
    setSubmitting(false);
    load();
  }

  async function toggleResolved(id: string, current: boolean) {
    await supabase.from('strategy_collaboration').update({ resolved: !current }).eq('id', id);
    load();
  }

  function toggleExpand(id: string) {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  if (loading) return <div className="py-8 text-center text-sm text-slate-400">Loading...</div>;

  return (
    <div className="space-y-4">
      {entries.length === 0 && (
        <div className="text-center py-8 text-slate-400">
          <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-40" />
          <p className="text-sm">No comments yet.</p>
        </div>
      )}

      {entries.map(entry => (
        <div key={entry.id} className={`rounded-xl border ${entry.resolved ? 'border-slate-100 opacity-60' : 'border-slate-200'} bg-white`}>
          <div className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <div className="w-8 h-8 rounded-full bg-cyan-100 flex items-center justify-center text-cyan-700 text-xs font-bold flex-shrink-0">
                  {entry.author?.full_name?.charAt(0) ?? '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-sm font-semibold text-slate-800">{entry.author?.full_name ?? 'Unknown'}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_LABELS[entry.comment_type]?.colour ?? ''}`}>
                      {TYPE_LABELS[entry.comment_type]?.label}
                    </span>
                    <span className="text-xs text-slate-400">{new Date(entry.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                    {entry.resolved && <span className="text-xs text-green-600 font-medium">Resolved</span>}
                  </div>
                  <p className="text-sm text-slate-700 leading-relaxed">{entry.content}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {!readOnly && profile && (
                  <button
                    onClick={() => toggleResolved(entry.id, entry.resolved)}
                    className={`p-1.5 rounded-lg transition-colors ${entry.resolved ? 'text-slate-300 hover:text-slate-500' : 'text-green-500 hover:text-green-700'}`}
                    title={entry.resolved ? 'Mark unresolved' : 'Mark resolved'}
                  >
                    <CheckCircle className="w-4 h-4" />
                  </button>
                )}
                {(entry.replies?.length ?? 0) > 0 && (
                  <button onClick={() => toggleExpand(entry.id)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg">
                    {expanded.has(entry.id) ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </button>
                )}
              </div>
            </div>

            {/* Replies */}
            {(entry.replies?.length ?? 0) > 0 && expanded.has(entry.id) && (
              <div className="mt-3 ml-11 space-y-3 border-l-2 border-slate-100 pl-4">
                {entry.replies!.map(reply => (
                  <div key={reply.id} className="flex items-start gap-2">
                    <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 text-xs font-bold flex-shrink-0">
                      {reply.author?.full_name?.charAt(0) ?? '?'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-xs font-semibold text-slate-700">{reply.author?.full_name}</span>
                        <span className="text-xs text-slate-400">{new Date(reply.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
                      </div>
                      <p className="text-sm text-slate-600">{reply.content}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Reply input */}
            {!readOnly && replyingTo === entry.id ? (
              <div className="mt-3 ml-11 flex gap-2">
                <input
                  value={replyContent}
                  onChange={e => setReplyContent(e.target.value)}
                  placeholder="Write a reply..."
                  className="flex-1 px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); addComment(entry.id); } }}
                />
                <button onClick={() => addComment(entry.id)} disabled={submitting} className="px-3 py-1.5 bg-cyan-600 text-white rounded-lg text-sm hover:bg-cyan-700 disabled:opacity-50">
                  <Send className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => setReplyingTo(null)} className="px-3 py-1.5 text-slate-500 text-sm hover:text-slate-700">Cancel</button>
              </div>
            ) : !readOnly && (
              <button
                onClick={() => { setReplyingTo(entry.id); setExpanded(prev => new Set([...prev, entry.id])); }}
                className="mt-2 ml-11 flex items-center gap-1 text-xs text-slate-400 hover:text-cyan-600 transition-colors"
              >
                <Reply className="w-3 h-3" /> Reply
              </button>
            )}
          </div>
        </div>
      ))}

      {!readOnly && (
        <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
          <p className="text-sm font-medium text-slate-700 mb-3">Add a comment</p>
          <div className="flex gap-2 mb-3">
            {(Object.entries(TYPE_LABELS) as [CollabEntry['comment_type'], { label: string; colour: string }][]).filter(([k]) => k !== 'response').map(([k, v]) => (
              <button
                key={k}
                onClick={() => setCommentType(k)}
                className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${commentType === k ? v.colour + ' ring-2 ring-offset-1 ring-current' : 'bg-white border border-slate-200 text-slate-500 hover:border-slate-300'}`}
              >
                {v.label}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="Write your comment..."
              rows={2}
              className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 resize-none"
            />
            <button
              onClick={() => addComment()}
              disabled={submitting || !content.trim()}
              className="px-4 py-2 bg-cyan-600 text-white rounded-lg text-sm font-medium hover:bg-cyan-700 disabled:opacity-50 flex items-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" /> Post
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
