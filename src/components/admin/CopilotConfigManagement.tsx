import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Save, Plus, Trash2, X, CheckCircle, MessageSquare, Clock,
  ChevronDown, ChevronUp, Filter, User, ThumbsUp, ThumbsDown,
  Sparkles, Sliders, Layers, Eye, EyeOff, Star, ChevronRight,
  Upload, Bot, Pencil, GripVertical, RotateCcw,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useBranding } from '../../contexts/BrandingContext';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Capability {
  id: string;
  title: string;
  description: string;
  icon: string;
}

interface PersonalityTraits {
  organiser: number;
  coach: number;
  challenger: number;
  analyst: number;
  strategic_thinker: number;
  mentor: number;
  encourager: number;
}

interface Communication {
  style: 'friendly' | 'professional' | 'formal' | 'conversational';
  british_english: boolean;
  message_length: 'concise' | 'balanced' | 'detailed';
  emoji_usage: 'none' | 'minimal' | 'moderate';
}

interface OpalSettings {
  opal_display_name: string;
  opal_welcome_message: string;
  opal_intro_heading: string;
  opal_about: string;
  opal_capabilities: Capability[];
  opal_personality: PersonalityTraits;
  opal_communication: Communication;
}

interface FeedbackLogEntry {
  id: string;
  created_at: string;
  employee_name: string;
  rating: number;
  rating_type: string;
  item_name: string;
  manager_input: string;
  sera_response_valid: boolean | null;
  sera_confidence: string | null;
  sera_message: string | null;
  sera_prompt: string | null;
  sera_summary: string | null;
  manager_overrode: boolean;
  override_reason: string | null;
  admin_feedback: 'helpful' | 'needs_improvement' | null;
  admin_notes: string | null;
  admin_reviewed_at: string | null;
}

type Section = 'profile' | 'about' | 'capabilities' | 'personality' | 'communication' | 'feedback';
type Toast = { type: 'success' | 'error'; message: string };

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

const DEFAULT_PERSONALITY: PersonalityTraits = {
  organiser: 50,
  coach: 70,
  challenger: 40,
  analyst: 60,
  strategic_thinker: 55,
  mentor: 65,
  encourager: 60,
};

const DEFAULT_COMMUNICATION: Communication = {
  style: 'friendly',
  british_english: true,
  message_length: 'balanced',
  emoji_usage: 'minimal',
};

const DEFAULT_CAPABILITIES: Capability[] = [
  { id: '1', title: 'Career Planning', description: 'Help map out career goals and development pathways.', icon: '🗺️' },
  { id: '2', title: 'Performance Coaching', description: 'Guide through performance improvement and goal-setting.', icon: '🎯' },
  { id: '3', title: 'Skills Development', description: 'Identify skill gaps and suggest learning opportunities.', icon: '📚' },
  { id: '4', title: 'Feedback & Reflection', description: 'Facilitate honest conversations and self-reflection.', icon: '💬' },
];

const ICON_OPTIONS = ['🗺️', '🎯', '📚', '💬', '⭐', '🚀', '💡', '🔑', '🏆', '🤝', '🌱', '📊'];

const PERSONALITY_LABELS: Record<keyof PersonalityTraits, string> = {
  organiser: 'Organiser',
  coach: 'Coach',
  challenger: 'Challenger',
  analyst: 'Analyst',
  strategic_thinker: 'Strategic Thinker',
  mentor: 'Mentor',
  encourager: 'Encourager',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function OpalOrb({ size = 48 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <defs>
        <radialGradient id="cfg-orb-bg" cx="40%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#67e8f9" />
          <stop offset="60%" stopColor="#0891b2" />
          <stop offset="100%" stopColor="#0e4f6d" />
        </radialGradient>
        <radialGradient id="cfg-orb-shimmer" cx="30%" cy="25%" r="50%">
          <stop offset="0%" stopColor="white" stopOpacity="0.35" />
          <stop offset="100%" stopColor="white" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="24" cy="24" r="23" fill="url(#cfg-orb-bg)" />
      <circle cx="24" cy="24" r="23" fill="url(#cfg-orb-shimmer)" />
      <ellipse cx="16" cy="16" rx="5" ry="3" fill="white" opacity="0.3" transform="rotate(-20 16 16)" />
    </svg>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 flex-shrink-0 rounded-full border-2 border-transparent transition-colors focus:outline-none ${checked ? 'bg-blue-600' : 'bg-gray-300'}`}
    >
      <span className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform ${checked ? 'translate-x-4' : 'translate-x-0'}`} />
    </button>
  );
}

function SliderRow({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-sm font-medium text-gray-700">{label}</span>
        <span className="text-xs font-semibold text-blue-600 w-10 text-right">{value}%</span>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-xs text-gray-400 w-8">Low</span>
        <input
          type="range"
          min={0}
          max={100}
          step={5}
          value={value}
          onChange={e => onChange(Number(e.target.value))}
          className="flex-1 accent-blue-600"
        />
        <span className="text-xs text-gray-400 w-8 text-right">High</span>
      </div>
    </div>
  );
}

function SectionHeader({ title, subtitle, icon }: { title: string; subtitle?: string; icon: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 mb-6">
      <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0 mt-0.5">
        <span className="text-blue-600">{icon}</span>
      </div>
      <div>
        <h3 className="text-base font-semibold text-gray-900">{title}</h3>
        {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Live Preview
// ---------------------------------------------------------------------------

interface PreviewProps {
  settings: OpalSettings;
  avatarUrl: string | null;
}

function OpalLivePreview({ settings, avatarUrl }: PreviewProps) {
  const displayName = settings.opal_display_name || 'Opal';
  const heading = settings.opal_intro_heading || `Hello, I'm ${displayName}`;

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      {/* Hero */}
      <div className="p-5 border-b border-gray-100" style={{ background: 'linear-gradient(135deg, #fff 0%, rgba(8,145,178,0.05) 100%)' }}>
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full overflow-hidden flex-shrink-0 ring-2 ring-cyan-200">
            {avatarUrl ? (
              <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" />
            ) : (
              <OpalOrb size={64} />
            )}
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">{heading}</h2>
            <p className="text-sm text-slate-500 mt-0.5">{settings.opal_welcome_message || `Hi! I'm ${displayName}, your AI Growth Guide.`}</p>
          </div>
        </div>
      </div>

      {/* About */}
      {settings.opal_about && (
        <div className="px-5 py-4 border-b border-gray-100">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">About {displayName}</p>
          <p className="text-sm text-gray-700 leading-relaxed line-clamp-3">{settings.opal_about}</p>
        </div>
      )}

      {/* Suggested actions */}
      <div className="px-5 py-4 border-b border-gray-100">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Suggested actions</p>
        <div className="flex flex-wrap gap-2">
          {['Help me plan my career', 'Review my progress', 'Explore training options'].map(a => (
            <span key={a} className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-full text-xs text-slate-600">{a}</span>
          ))}
        </div>
      </div>

      {/* Capabilities */}
      {settings.opal_capabilities.length > 0 && (
        <div className="px-5 py-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">What I can help with</p>
          <div className="grid grid-cols-2 gap-2">
            {settings.opal_capabilities.slice(0, 4).map(cap => (
              <div key={cap.id} className="flex items-start gap-2 p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                <span className="text-base flex-shrink-0 leading-tight">{cap.icon}</span>
                <div>
                  <p className="text-xs font-semibold text-gray-800 leading-tight">{cap.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5 leading-snug line-clamp-2">{cap.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Capability Editor
// ---------------------------------------------------------------------------

interface CapabilityEditorProps {
  capabilities: Capability[];
  onChange: (caps: Capability[]) => void;
}

function CapabilityEditor({ capabilities, onChange }: CapabilityEditorProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Partial<Capability>>({});

  function addNew() {
    const id = crypto.randomUUID();
    const newCap: Capability = { id, title: '', description: '', icon: '⭐' };
    onChange([...capabilities, newCap]);
    setEditingId(id);
    setDraft({ title: '', description: '', icon: '⭐' });
  }

  function startEdit(cap: Capability) {
    setEditingId(cap.id);
    setDraft({ title: cap.title, description: cap.description, icon: cap.icon });
  }

  function commitEdit(id: string) {
    onChange(capabilities.map(c => c.id === id ? { ...c, ...draft } as Capability : c));
    setEditingId(null);
    setDraft({});
  }

  function remove(id: string) {
    onChange(capabilities.filter(c => c.id !== id));
    if (editingId === id) setEditingId(null);
  }

  return (
    <div className="space-y-3">
      {capabilities.map(cap => (
        <div key={cap.id} className="border border-gray-200 rounded-lg overflow-hidden">
          {editingId === cap.id ? (
            <div className="p-4 space-y-3 bg-blue-50/30">
              <div className="flex items-center gap-3">
                {/* Icon picker */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Icon</label>
                  <div className="flex flex-wrap gap-1 max-w-[200px]">
                    {ICON_OPTIONS.map(ic => (
                      <button
                        key={ic}
                        type="button"
                        onClick={() => setDraft(d => ({ ...d, icon: ic }))}
                        className={`w-8 h-8 rounded text-base flex items-center justify-center transition-colors ${draft.icon === ic ? 'bg-blue-100 ring-2 ring-blue-400' : 'bg-white border border-gray-200 hover:bg-gray-50'}`}
                      >
                        {ic}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex-1 space-y-2">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Title</label>
                    <input
                      type="text"
                      value={draft.title || ''}
                      onChange={e => setDraft(d => ({ ...d, title: e.target.value }))}
                      className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g. Career Planning"
                      autoFocus
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
                    <textarea
                      value={draft.description || ''}
                      onChange={e => setDraft(d => ({ ...d, description: e.target.value }))}
                      rows={2}
                      className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm resize-none focus:ring-2 focus:ring-blue-500"
                      placeholder="What Opal helps with here..."
                    />
                  </div>
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <button type="button" onClick={() => { setEditingId(null); setDraft({}); }} className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
                <button type="button" onClick={() => commitEdit(cap.id)} disabled={!draft.title?.trim()} className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50">Save</button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 px-4 py-3">
              <GripVertical className="w-4 h-4 text-gray-300 flex-shrink-0" />
              <span className="text-xl flex-shrink-0">{cap.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">{cap.title || <span className="text-gray-400 italic">Untitled</span>}</p>
                <p className="text-xs text-gray-500 truncate">{cap.description}</p>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button type="button" onClick={() => startEdit(cap)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button type="button" onClick={() => remove(cap.id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      ))}
      <button
        type="button"
        onClick={addNew}
        className="w-full flex items-center justify-center gap-2 py-2.5 border-2 border-dashed border-gray-200 rounded-lg text-sm text-gray-500 hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50/30 transition-colors"
      >
        <Plus className="w-4 h-4" />
        Add capability
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Feedback section (merged from SeraCareerFeedback)
// ---------------------------------------------------------------------------

interface FeedbackSectionProps {
  toast: (t: Toast) => void;
}

function FeedbackSection({ toast }: FeedbackSectionProps) {
  const [feedbackLog, setFeedbackLog] = useState<FeedbackLogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingNotesId, setEditingNotesId] = useState<string | null>(null);
  const [notesDraft, setNotesDraft] = useState('');
  const [savingId, setSavingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'helpful' | 'needs_improvement' | 'unreviewed'>('all');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('sera_feedback_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      setFeedbackLog(data || []);
      setLoaded(true);
    } catch {
      toast({ type: 'error', message: 'Failed to load feedback log.' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  async function markFeedback(entry: FeedbackLogEntry, rating: 'helpful' | 'needs_improvement') {
    setSavingId(entry.id);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const next = entry.admin_feedback === rating ? null : rating;
      const { error } = await supabase.from('sera_feedback_log').update({
        admin_feedback: next,
        admin_reviewed_at: new Date().toISOString(),
        admin_reviewed_by: user?.id ?? null,
      }).eq('id', entry.id);
      if (error) throw error;
      setFeedbackLog(prev => prev.map(e => e.id === entry.id ? { ...e, admin_feedback: next, admin_reviewed_at: new Date().toISOString() } : e));
    } catch {
      toast({ type: 'error', message: 'Failed to save feedback.' });
    } finally {
      setSavingId(null);
    }
  }

  async function saveNotes(entryId: string) {
    setSavingId(entryId);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from('sera_feedback_log').update({
        admin_notes: notesDraft,
        admin_reviewed_at: new Date().toISOString(),
        admin_reviewed_by: user?.id ?? null,
      }).eq('id', entryId);
      if (error) throw error;
      setFeedbackLog(prev => prev.map(e => e.id === entryId ? { ...e, admin_notes: notesDraft } : e));
      setEditingNotesId(null);
      setNotesDraft('');
    } catch {
      toast({ type: 'error', message: 'Failed to save notes.' });
    } finally {
      setSavingId(null);
    }
  }

  const filtered = feedbackLog.filter(e => {
    if (filter === 'helpful') return e.admin_feedback === 'helpful';
    if (filter === 'needs_improvement') return e.admin_feedback === 'needs_improvement';
    if (filter === 'unreviewed') return e.admin_feedback === null;
    return true;
  });

  return (
    <div className="space-y-6">
      <SectionHeader
        icon={<MessageSquare className="w-4 h-4" />}
        title="Feedback"
        subtitle="Review Opal interactions and provide quality signals to guide future improvements."
      />

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total', value: feedbackLog.length, color: 'text-gray-700', bg: 'bg-gray-50 border-gray-200' },
          { label: 'Helpful', value: feedbackLog.filter(e => e.admin_feedback === 'helpful').length, color: 'text-green-700', bg: 'bg-green-50 border-green-200' },
          { label: 'Needs Improvement', value: feedbackLog.filter(e => e.admin_feedback === 'needs_improvement').length, color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200' },
          { label: 'Unreviewed', value: feedbackLog.filter(e => e.admin_feedback === null).length, color: 'text-slate-600', bg: 'bg-slate-50 border-slate-200' },
        ].map(s => (
          <div key={s.label} className={`${s.bg} border rounded-lg p-3 text-center`}>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filter bar */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <select
            value={filter}
            onChange={e => setFilter(e.target.value as typeof filter)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All entries</option>
            <option value="unreviewed">Unreviewed</option>
            <option value="helpful">Helpful</option>
            <option value="needs_improvement">Needs improvement</option>
          </select>
        </div>
        <button onClick={load} className="text-sm text-blue-600 hover:text-blue-800 font-medium">Refresh</button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-7 w-7 border-b-2 border-blue-600" /></div>
      ) : !loaded || filtered.length === 0 ? (
        <div className="text-center py-14 border-2 border-dashed border-gray-200 rounded-xl">
          <MessageSquare className="w-10 h-10 mx-auto mb-3 text-gray-300" />
          <p className="text-gray-500 font-medium">No entries yet</p>
          <p className="text-sm text-gray-400 mt-1">
            {filter === 'all' ? 'Opal interaction feedback will appear here.' : 'No entries match the current filter.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(entry => (
            <div key={entry.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div
                className="flex items-start justify-between gap-3 px-5 py-4 cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
              >
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${entry.sera_response_valid ? 'bg-green-500' : 'bg-rose-500'}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="font-medium text-sm text-gray-900">{entry.employee_name}</span>
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">Rating {entry.rating}/5</span>
                      {entry.manager_overrode && <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">Overridden</span>}
                      {entry.admin_feedback === 'helpful' && (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full flex items-center gap-1"><ThumbsUp className="w-3 h-3" />Helpful</span>
                      )}
                      {entry.admin_feedback === 'needs_improvement' && (
                        <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full flex items-center gap-1"><ThumbsDown className="w-3 h-3" />Needs improvement</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                      <Clock className="w-3 h-3" />
                      {new Date(entry.created_at).toLocaleString()}
                      <span>·</span>
                      <span className="truncate">{entry.item_name}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button onClick={e => { e.stopPropagation(); markFeedback(entry, 'helpful'); }} disabled={savingId === entry.id}
                    className={`p-1.5 rounded-lg transition-colors ${entry.admin_feedback === 'helpful' ? 'bg-green-100 text-green-700' : 'text-gray-400 hover:bg-green-50 hover:text-green-600'}`}>
                    <ThumbsUp className="w-4 h-4" />
                  </button>
                  <button onClick={e => { e.stopPropagation(); markFeedback(entry, 'needs_improvement'); }} disabled={savingId === entry.id}
                    className={`p-1.5 rounded-lg transition-colors ${entry.admin_feedback === 'needs_improvement' ? 'bg-amber-100 text-amber-700' : 'text-gray-400 hover:bg-amber-50 hover:text-amber-600'}`}>
                    <ThumbsDown className="w-4 h-4" />
                  </button>
                  {expandedId === entry.id ? <ChevronUp className="w-4 h-4 text-gray-400 ml-1" /> : <ChevronDown className="w-4 h-4 text-gray-400 ml-1" />}
                </div>
              </div>

              {expandedId === entry.id && (
                <div className="border-t border-gray-100 px-5 py-4 space-y-4 bg-gray-50/50">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Manager Input</p>
                      <p className="text-sm text-gray-800 bg-white border border-gray-200 rounded-lg p-3 whitespace-pre-wrap">
                        {entry.manager_input || <span className="text-gray-400 italic">No input recorded</span>}
                      </p>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Opal Response</p>
                        <div className={`text-sm rounded-lg p-3 border ${entry.sera_response_valid ? 'bg-green-50 border-green-200 text-green-800' : 'bg-rose-50 border-rose-200 text-rose-800'}`}>
                          <p className="font-medium mb-1">
                            {entry.sera_response_valid ? 'Justification valid' : 'More detail needed'}
                            {entry.sera_confidence && <span className="ml-2 text-xs opacity-70">({entry.sera_confidence} confidence)</span>}
                          </p>
                          <p className="text-xs">{entry.sera_message}</p>
                        </div>
                      </div>
                      {entry.sera_prompt && (
                        <div>
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Opal Suggestion</p>
                          <p className="text-sm text-blue-800 bg-blue-50 border border-blue-200 rounded-lg p-3">{entry.sera_prompt}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Admin Notes</p>
                      {editingNotesId !== entry.id && (
                        <button onClick={() => { setEditingNotesId(entry.id); setNotesDraft(entry.admin_notes || ''); }} className="text-xs text-blue-600 hover:text-blue-800 font-medium">
                          {entry.admin_notes ? 'Edit' : 'Add notes'}
                        </button>
                      )}
                    </div>
                    {editingNotesId === entry.id ? (
                      <div>
                        <textarea value={notesDraft} onChange={e => setNotesDraft(e.target.value)} rows={3}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 resize-none"
                          placeholder="Notes for improving Opal..." autoFocus />
                        <div className="flex gap-2 mt-2">
                          <button onClick={() => saveNotes(entry.id)} disabled={savingId === entry.id}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 disabled:opacity-60">
                            <Save className="w-3.5 h-3.5" />{savingId === entry.id ? 'Saving...' : 'Save'}
                          </button>
                          <button onClick={() => { setEditingNotesId(null); setNotesDraft(''); }}
                            className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-xs font-medium hover:bg-gray-200">Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-600 bg-white border border-gray-200 rounded-lg p-3 min-h-[2.5rem]">
                        {entry.admin_notes || <span className="text-gray-400 italic">No notes yet</span>}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function CopilotConfigManagement() {
  const { branding, refresh: refreshBranding } = useBranding();

  const [settings, setSettings] = useState<OpalSettings>({
    opal_display_name: branding.opal_display_name || 'Opal',
    opal_welcome_message: branding.opal_welcome_message || "Hi! I'm Opal, your AI Growth Guide. How can I help you today?",
    opal_intro_heading: (branding as any).opal_intro_heading || '',
    opal_about: (branding as any).opal_about || '',
    opal_capabilities: (() => {
      const raw = (branding as any).opal_capabilities;
      if (Array.isArray(raw) && raw.length > 0) return raw;
      return DEFAULT_CAPABILITIES;
    })(),
    opal_personality: (() => {
      const raw = (branding as any).opal_personality;
      if (raw && typeof raw === 'object' && !Array.isArray(raw) && Object.keys(raw).length > 0) return raw as PersonalityTraits;
      return DEFAULT_PERSONALITY;
    })(),
    opal_communication: (() => {
      const raw = (branding as any).opal_communication;
      if (raw && typeof raw === 'object' && !Array.isArray(raw) && Object.keys(raw).length > 0) return raw as Communication;
      return DEFAULT_COMMUNICATION;
    })(),
  });

  const [activeSection, setActiveSection] = useState<Section>('profile');
  const [previewVisible, setPreviewVisible] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);

  const showToast = useCallback((t: Toast) => {
    setToast(t);
    setTimeout(() => setToast(null), 4000);
  }, []);

  // Sync from branding context on first load
  useEffect(() => {
    if (branding.opal_display_name) {
      setSettings(prev => ({
        ...prev,
        opal_display_name: branding.opal_display_name,
        opal_welcome_message: branding.opal_welcome_message,
        opal_intro_heading: (branding as any).opal_intro_heading || prev.opal_intro_heading,
        opal_about: (branding as any).opal_about || prev.opal_about,
        opal_capabilities: (() => {
          const raw = (branding as any).opal_capabilities;
          if (Array.isArray(raw) && raw.length > 0) return raw;
          return prev.opal_capabilities;
        })(),
        opal_personality: (() => {
          const raw = (branding as any).opal_personality;
          if (raw && typeof raw === 'object' && !Array.isArray(raw) && Object.keys(raw).length > 0) return raw as PersonalityTraits;
          return prev.opal_personality;
        })(),
        opal_communication: (() => {
          const raw = (branding as any).opal_communication;
          if (raw && typeof raw === 'object' && !Array.isArray(raw) && Object.keys(raw).length > 0) return raw as Communication;
          return prev.opal_communication;
        })(),
      }));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branding.id]);

  async function handleSave() {
    setSaving(true);
    try {
      const { data: existing } = await supabase
        .from('organisation_branding')
        .select('id')
        .eq('is_active', true)
        .maybeSingle();

      if (!existing?.id) {
        showToast({ type: 'error', message: 'No active branding record found. Please configure branding first.' });
        return;
      }

      const { error } = await supabase.from('organisation_branding').update({
        opal_display_name: settings.opal_display_name,
        opal_welcome_message: settings.opal_welcome_message,
        opal_intro_heading: settings.opal_intro_heading,
        opal_about: settings.opal_about,
        opal_capabilities: settings.opal_capabilities,
        opal_personality: settings.opal_personality,
        opal_communication: settings.opal_communication,
        updated_at: new Date().toISOString(),
      }).eq('id', existing.id);

      if (error) throw error;
      await refreshBranding();
      showToast({ type: 'success', message: 'Opal configuration saved successfully.' });
    } catch (err) {
      console.error('Error saving Opal config:', err);
      showToast({ type: 'error', message: 'Failed to save configuration. Please try again.' });
    } finally {
      setSaving(false);
    }
  }

  const navItems: Array<{ id: Section; label: string; icon: React.ReactNode }> = [
    { id: 'profile', label: 'Opal Profile', icon: <User className="w-4 h-4" /> },
    { id: 'about', label: 'About Opal', icon: <Sparkles className="w-4 h-4" /> },
    { id: 'capabilities', label: 'Capabilities', icon: <Layers className="w-4 h-4" /> },
    { id: 'personality', label: 'Personality', icon: <Sliders className="w-4 h-4" /> },
    { id: 'communication', label: 'Communication Style', icon: <MessageSquare className="w-4 h-4" /> },
    { id: 'feedback', label: 'Feedback', icon: <Star className="w-4 h-4" /> },
  ];

  return (
    <div className="space-y-0">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg text-sm font-medium ${toast.type === 'success' ? 'bg-green-50 border border-green-200 text-green-800' : 'bg-red-50 border border-red-200 text-red-800'}`}>
          {toast.type === 'success' ? <CheckCircle className="w-4 h-4 flex-shrink-0" /> : <X className="w-4 h-4 flex-shrink-0" />}
          {toast.message}
          <button onClick={() => setToast(null)} className="ml-2 opacity-60 hover:opacity-100"><X className="w-3.5 h-3.5" /></button>
        </div>
      )}

      {/* Page header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Opal Configuration</h2>
          <p className="text-sm text-gray-500 mt-1">Introduce a trusted colleague, not an AI chatbot. Define who Opal is, what she knows, and how she communicates.</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            type="button"
            onClick={() => setPreviewVisible(v => !v)}
            className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors"
          >
            {previewVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            {previewVisible ? 'Hide preview' : 'Show preview'}
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-60"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save changes'}
          </button>
        </div>
      </div>

      <div className={`grid gap-6 ${previewVisible ? 'grid-cols-1 xl:grid-cols-[1fr_360px]' : 'grid-cols-1'}`}>
        {/* Left: nav + form */}
        <div className="space-y-6">
          {/* Section nav */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <nav className="flex flex-wrap gap-0">
              {navItems.filter(n => n.id !== 'feedback').map((item, idx) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveSection(item.id)}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors border-b-2 ${
                    activeSection === item.id
                      ? 'border-blue-600 text-blue-600 bg-blue-50/50'
                      : 'border-transparent text-gray-500 hover:text-gray-800 hover:bg-gray-50'
                  }`}
                >
                  {item.icon}
                  {item.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Form sections */}
          <div className="bg-white border border-gray-200 rounded-xl p-6">

            {/* Profile */}
            {activeSection === 'profile' && (
              <div>
                <SectionHeader
                  icon={<User className="w-4 h-4" />}
                  title="Opal Profile"
                  subtitle="Define Opal's identity — the name and first impression users see when they open the Opal page."
                />
                <div className="space-y-5">
                  {/* Avatar */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Avatar</label>
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-full overflow-hidden flex-shrink-0 ring-2 ring-gray-200">
                        {branding.opal_avatar_url ? (
                          <img src={branding.opal_avatar_url} alt="Opal" className="w-full h-full object-cover" />
                        ) : (
                          <OpalOrb size={64} />
                        )}
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Avatar is managed in the <strong>Branding Centre</strong> under the Opal section.</p>
                        <p className="text-xs text-gray-400 mt-0.5">Changes made there will reflect here automatically.</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Display Name</label>
                      <input
                        type="text"
                        value={settings.opal_display_name}
                        onChange={e => setSettings(s => ({ ...s, opal_display_name: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                        placeholder="Opal"
                      />
                      <p className="text-xs text-gray-400 mt-1">The name users see throughout the platform.</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Introduction Heading</label>
                      <input
                        type="text"
                        value={settings.opal_intro_heading}
                        onChange={e => setSettings(s => ({ ...s, opal_intro_heading: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                        placeholder={`Hello, I'm ${settings.opal_display_name || 'Opal'}`}
                      />
                      <p className="text-xs text-gray-400 mt-1">The greeting headline at the top of the Opal page.</p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Welcome Message</label>
                    <textarea
                      value={settings.opal_welcome_message}
                      onChange={e => setSettings(s => ({ ...s, opal_welcome_message: e.target.value }))}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 resize-none"
                      placeholder="Hi! I'm Opal, your AI Growth Guide. How can I help you today?"
                    />
                    <p className="text-xs text-gray-400 mt-1">Shown beneath the greeting. Keep it warm and inviting.</p>
                  </div>
                </div>
              </div>
            )}

            {/* About */}
            {activeSection === 'about' && (
              <div>
                <SectionHeader
                  icon={<Sparkles className="w-4 h-4" />}
                  title="About Opal"
                  subtitle="Write a description of who Opal is and what she's here to do. This appears on the Opal page."
                />
                <div>
                  <textarea
                    value={settings.opal_about}
                    onChange={e => setSettings(s => ({ ...s, opal_about: e.target.value }))}
                    rows={8}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 resize-none leading-relaxed"
                    placeholder={`${settings.opal_display_name || 'Opal'} is your personal AI Growth Guide — here to help you reflect, plan, and grow. Whether you're navigating a career move, preparing for a performance conversation, or simply looking for your next step, ${settings.opal_display_name || 'Opal'} is there to guide you with clarity and care.\n\nUnlike generic assistants, ${settings.opal_display_name || 'Opal'} understands your organisation's career pathways, competency framework, and development culture — giving you advice that's relevant, actionable, and grounded in how your organisation actually works.`}
                  />
                  <p className="text-xs text-gray-400 mt-1.5">{settings.opal_about.length} characters. Aim for 2–4 paragraphs that feel human and reassuring.</p>
                </div>
              </div>
            )}

            {/* Capabilities */}
            {activeSection === 'capabilities' && (
              <div>
                <SectionHeader
                  icon={<Layers className="w-4 h-4" />}
                  title="What Opal Can Help With"
                  subtitle="Capability cards shown to users when they open Opal. Add, edit, or reorder them here."
                />
                <CapabilityEditor
                  capabilities={settings.opal_capabilities}
                  onChange={caps => setSettings(s => ({ ...s, opal_capabilities: caps }))}
                />
              </div>
            )}

            {/* Personality */}
            {activeSection === 'personality' && (
              <div>
                <SectionHeader
                  icon={<Sliders className="w-4 h-4" />}
                  title="Personality"
                  subtitle="Adjust the balance of personality traits that shape how Opal responds and engages. These inform her tone and approach."
                />
                <div className="space-y-5">
                  {(Object.keys(PERSONALITY_LABELS) as (keyof PersonalityTraits)[]).map(trait => (
                    <SliderRow
                      key={trait}
                      label={PERSONALITY_LABELS[trait]}
                      value={settings.opal_personality[trait]}
                      onChange={v => setSettings(s => ({ ...s, opal_personality: { ...s.opal_personality, [trait]: v } }))}
                    />
                  ))}
                  <button
                    type="button"
                    onClick={() => setSettings(s => ({ ...s, opal_personality: DEFAULT_PERSONALITY }))}
                    className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mt-2"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Reset to defaults
                  </button>
                </div>
              </div>
            )}

            {/* Communication */}
            {activeSection === 'communication' && (
              <div>
                <SectionHeader
                  icon={<MessageSquare className="w-4 h-4" />}
                  title="Communication Style"
                  subtitle="Define how Opal writes and communicates with users."
                />
                <div className="space-y-6">
                  {/* Tone */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Tone</label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {(['friendly', 'professional', 'formal', 'conversational'] as const).map(style => (
                        <button
                          key={style}
                          type="button"
                          onClick={() => setSettings(s => ({ ...s, opal_communication: { ...s.opal_communication, style } }))}
                          className={`px-3 py-2.5 rounded-lg text-sm font-medium border transition-colors capitalize ${
                            settings.opal_communication.style === style
                              ? 'bg-blue-600 text-white border-blue-600'
                              : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                          }`}
                        >
                          {style}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Message length */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Message Length</label>
                    <div className="grid grid-cols-3 gap-2">
                      {([
                        { value: 'concise', label: 'Concise', desc: 'Short, focused replies' },
                        { value: 'balanced', label: 'Balanced', desc: 'Moderate depth' },
                        { value: 'detailed', label: 'Detailed', desc: 'Thorough explanations' },
                      ] as const).map(opt => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setSettings(s => ({ ...s, opal_communication: { ...s.opal_communication, message_length: opt.value } }))}
                          className={`px-3 py-3 rounded-lg text-left border transition-colors ${
                            settings.opal_communication.message_length === opt.value
                              ? 'bg-blue-50 border-blue-400 text-blue-700'
                              : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                          }`}
                        >
                          <p className="text-sm font-medium">{opt.label}</p>
                          <p className="text-xs text-gray-500 mt-0.5">{opt.desc}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Emoji usage */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Emoji Usage</label>
                    <div className="grid grid-cols-3 gap-2">
                      {([
                        { value: 'none', label: 'None', desc: 'No emojis' },
                        { value: 'minimal', label: 'Minimal', desc: 'Occasional' },
                        { value: 'moderate', label: 'Moderate', desc: 'Regular use' },
                      ] as const).map(opt => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setSettings(s => ({ ...s, opal_communication: { ...s.opal_communication, emoji_usage: opt.value } }))}
                          className={`px-3 py-3 rounded-lg text-left border transition-colors ${
                            settings.opal_communication.emoji_usage === opt.value
                              ? 'bg-blue-50 border-blue-400 text-blue-700'
                              : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                          }`}
                        >
                          <p className="text-sm font-medium">{opt.label}</p>
                          <p className="text-xs text-gray-500 mt-0.5">{opt.desc}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* British English toggle */}
                  <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-gray-800">British English</p>
                      <p className="text-xs text-gray-500 mt-0.5">Use British spellings and expressions (e.g. "organisation", "colour").</p>
                    </div>
                    <Toggle
                      checked={settings.opal_communication.british_english}
                      onChange={v => setSettings(s => ({ ...s, opal_communication: { ...s.opal_communication, british_english: v } }))}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: Live Preview */}
        {previewVisible && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-600">
              <Eye className="w-4 h-4" />
              Live Preview
              <span className="text-xs text-gray-400 font-normal ml-1">— updates as you edit</span>
            </div>
            <OpalLivePreview settings={settings} avatarUrl={branding.opal_avatar_url} />
          </div>
        )}
      </div>

      {/* Feedback section — always shown below */}
      <div className="mt-6 bg-white border border-gray-200 rounded-xl p-6">
        <FeedbackSection toast={showToast} />
      </div>
    </div>
  );
}
