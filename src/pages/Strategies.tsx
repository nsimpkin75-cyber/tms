import { useState, useEffect } from 'react';
import { Map, Plus, X, ChevronRight, Loader2, Building2, UserCheck, Calendar, Clock, MessageSquare, ClipboardList, Sparkles, AlertCircle, CreditCard as Edit2, Save, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import DepartmentPlanEditor from '../components/strategy/DepartmentPlanEditor';
import StrategyCollaboration from '../components/strategy/StrategyCollaboration';

// ── Types ──────────────────────────────────────────────────────────────────
interface Strategy {
  id: string;
  title: string;
  description: string | null;
  strategic_theme: string | null;
  success_measures: string | null;
  supporting_notes: string | null;
  target_date: string | null;
  start_date: string | null;
  end_date: string | null;
  status: 'draft' | 'active' | 'completed' | 'archived';
  creator_id: string;
  created_at: string;
  creator?: { full_name: string };
}

interface DeptAssignment {
  id: string;
  strategy_id: string;
  department_name: string;
  strategic_lead_id: string | null;
  lead?: { full_name: string; role: string };
}

interface DeptPlan {
  id: string;
  strategy_id: string;
  assignment_id: string | null;
  department_name: string;
  strategic_lead_id: string;
  title: string;
  overview: string | null;
  status: 'draft' | 'submitted' | 'in_review' | 'amendments_requested' | 'resubmitted' | 'approved' | 'active';
  version: number;
  submitted_at: string | null;
  approved_at: string | null;
  approved_by_id: string | null;
  created_at: string;
  lead?: { full_name: string };
}

interface AuditEntry {
  id: string;
  action: string;
  old_status: string | null;
  new_status: string | null;
  comment: string | null;
  created_at: string;
  actor?: { full_name: string };
}

type RightTab = 'overview' | 'plans' | 'collaboration' | 'audit';

const STATUS_CFG: Record<string, { label: string; dot: string; badge: string }> = {
  draft:     { label: 'Draft',     dot: 'bg-slate-400', badge: 'bg-slate-100 text-slate-600' },
  active:    { label: 'Active',    dot: 'bg-green-500', badge: 'bg-green-100 text-green-700' },
  completed: { label: 'Completed', dot: 'bg-blue-400',  badge: 'bg-blue-100 text-blue-700' },
  archived:  { label: 'Archived',  dot: 'bg-slate-300', badge: 'bg-slate-50 text-slate-400' },
};

const PLAN_STATUS_CFG: Record<string, { label: string; colour: string }> = {
  draft:                { label: 'Draft',             colour: 'bg-slate-100 text-slate-600' },
  submitted:            { label: 'Submitted',         colour: 'bg-blue-100 text-blue-700' },
  in_review:            { label: 'In Review',         colour: 'bg-amber-100 text-amber-700' },
  amendments_requested: { label: 'Amendments Needed', colour: 'bg-rose-100 text-rose-700' },
  resubmitted:          { label: 'Resubmitted',       colour: 'bg-purple-100 text-purple-700' },
  approved:             { label: 'Approved',          colour: 'bg-green-100 text-green-700' },
  active:               { label: 'Active',            colour: 'bg-teal-100 text-teal-700' },
};

const emptyForm = {
  title: '', strategic_theme: '', description: '',
  success_measures: '', target_date: '', supporting_notes: '',
  start_date: '', end_date: '', status: 'draft' as Strategy['status'],
};

// ── Component ─────────────────────────────────────────────────────────────
export default function Strategies() {
  const { profile } = useAuth();
  const isAdmin   = profile?.role === 'admin';
  const isExec    = profile?.role === 'leadership' || isAdmin;

  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [selected, setSelected]     = useState<Strategy | null>(null);
  const [assignments, setAssignments] = useState<DeptAssignment[]>([]);
  const [plans, setPlans]           = useState<DeptPlan[]>([]);
  const [audit, setAudit]           = useState<AuditEntry[]>([]);
  const [loading, setLoading]       = useState(true);
  const [rightTab, setRightTab]     = useState<RightTab>('overview');
  const [activePlan, setActivePlan] = useState<DeptPlan | null>(null);

  // Modals
  const [showCreate, setShowCreate]         = useState(false);
  const [editingStrategy, setEditing]       = useState<Strategy | null>(null);
  const [showAddDept, setShowAddDept]       = useState(false);
  const [showCreatePlan, setShowCreatePlan] = useState<DeptAssignment | null>(null);
  const [availableUsers, setAvailableUsers] = useState<{ id: string; full_name: string; role: string }[]>([]);

  const [form, setForm]         = useState(emptyForm);
  const [deptForm, setDeptForm] = useState({ department_name: '', strategic_lead_id: '' });
  const [planForm, setPlanForm] = useState({ title: '', overview: '' });
  const [saving, setSaving]     = useState(false);

  useEffect(() => { loadStrategies(); loadUsers(); }, []);
  useEffect(() => {
    if (selected) {
      loadAssignments(selected.id);
      loadPlans(selected.id);
      loadAudit(selected.id);
    }
  }, [selected]);

  async function loadStrategies() {
    setLoading(true);
    const { data } = await supabase
      .from('strategies')
      .select('*, creator:creator_id(full_name)')
      .order('created_at', { ascending: false });
    setStrategies((data ?? []) as Strategy[]);
    setLoading(false);
  }

  async function loadUsers() {
    const { data } = await supabase.from('profiles').select('id, full_name, role').order('full_name');
    setAvailableUsers(data ?? []);
  }

  async function loadAssignments(strategyId: string) {
    const { data } = await supabase
      .from('strategy_department_assignments')
      .select('*, lead:strategic_lead_id(full_name, role)')
      .eq('strategy_id', strategyId)
      .order('created_at');
    setAssignments((data ?? []) as DeptAssignment[]);
  }

  async function loadPlans(strategyId: string) {
    const { data } = await supabase
      .from('department_strategic_plans')
      .select('*, lead:strategic_lead_id(full_name)')
      .eq('strategy_id', strategyId)
      .order('created_at');
    setPlans((data ?? []) as DeptPlan[]);
  }

  async function loadAudit(strategyId: string) {
    const { data } = await supabase
      .from('strategy_audit_log')
      .select('*, actor:actor_id(full_name)')
      .eq('strategy_id', strategyId)
      .order('created_at', { ascending: false })
      .limit(50);
    setAudit((data ?? []) as AuditEntry[]);
  }

  function selectStrategy(s: Strategy) {
    setSelected(s);
    setActivePlan(null);
    setRightTab('overview');
  }

  async function saveStrategy() {
    if (!form.title.trim() || !profile) return;
    setSaving(true);
    const payload = {
      title: form.title.trim(),
      strategic_theme: form.strategic_theme || null,
      description: form.description || null,
      success_measures: form.success_measures || null,
      supporting_notes: form.supporting_notes || null,
      target_date: form.target_date || null,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
      status: form.status,
    };
    if (editingStrategy) {
      await supabase.from('strategies').update(payload).eq('id', editingStrategy.id);
    } else {
      await supabase.from('strategies').insert([{ ...payload, creator_id: profile.id }]);
    }
    setSaving(false);
    setShowCreate(false);
    setEditing(null);
    setForm(emptyForm);
    loadStrategies();
  }

  async function addDeptAssignment() {
    if (!deptForm.department_name.trim() || !selected || !profile) return;
    setSaving(true);
    const { data: inserted } = await supabase
      .from('strategy_department_assignments')
      .insert([{
        strategy_id: selected.id,
        department_name: deptForm.department_name,
        strategic_lead_id: deptForm.strategic_lead_id || null,
        assigned_by_id: profile.id,
      }])
      .select()
      .maybeSingle();

    if (deptForm.strategic_lead_id && inserted) {
      await supabase.from('strategy_notifications').insert([{
        strategy_id: selected.id,
        user_id: deptForm.strategic_lead_id,
        message: `You have been assigned as Strategic Lead for ${deptForm.department_name} on "${selected.title}"`,
      }]).maybeSingle().catch(() => {});
    }
    setSaving(false);
    setShowAddDept(false);
    setDeptForm({ department_name: '', strategic_lead_id: '' });
    loadAssignments(selected.id);
  }

  async function removeAssignment(id: string) {
    await supabase.from('strategy_department_assignments').delete().eq('id', id);
    loadAssignments(selected!.id);
  }

  async function createPlan(assignment: DeptAssignment) {
    if (!planForm.title.trim() || !profile) return;
    setSaving(true);
    await supabase.from('department_strategic_plans').insert([{
      strategy_id: assignment.strategy_id,
      assignment_id: assignment.id,
      department_name: assignment.department_name,
      strategic_lead_id: assignment.strategic_lead_id ?? profile.id,
      title: planForm.title.trim(),
      overview: planForm.overview || null,
    }]);
    await supabase.from('strategy_audit_log').insert([{
      strategy_id: assignment.strategy_id,
      actor_id: profile.id,
      action: 'Department Strategic Plan created',
      new_status: 'draft',
    }]);
    setSaving(false);
    setShowCreatePlan(null);
    setPlanForm({ title: '', overview: '' });
    loadPlans(assignment.strategy_id);
    setRightTab('plans');
  }

  function openEditStrategy(s: Strategy) {
    setEditing(s);
    setForm({
      title: s.title,
      strategic_theme: s.strategic_theme ?? '',
      description: s.description ?? '',
      success_measures: s.success_measures ?? '',
      target_date: s.target_date ?? '',
      supporting_notes: s.supporting_notes ?? '',
      start_date: s.start_date ?? '',
      end_date: s.end_date ?? '',
      status: s.status,
    });
    setShowCreate(true);
  }

  // Dept plan editor full view
  if (activePlan && selected) {
    return (
      <div className="h-full flex flex-col">
        <DepartmentPlanEditor
          plan={activePlan}
          strategyTitle={selected.title}
          onBack={() => setActivePlan(null)}
          onPlanUpdated={() => loadPlans(selected.id)}
          isExec={isExec}
        />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Page header */}
      <div className="flex-shrink-0 px-6 py-4 border-b border-slate-200 bg-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-cyan-50 rounded-lg">
              <Map className="w-5 h-5 text-cyan-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Strategic Mapping</h1>
              <p className="text-sm text-slate-500">Translate business strategy into departmental action</p>
            </div>
          </div>
          {isExec && (
            <button
              onClick={() => { setForm(emptyForm); setEditing(null); setShowCreate(true); }}
              className="flex items-center gap-2 px-4 py-2 bg-cyan-600 text-white rounded-xl text-sm font-medium hover:bg-cyan-700 transition-colors"
            >
              <Plus className="w-4 h-4" /> New Business Strategy
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left panel */}
        <div className="w-72 flex-shrink-0 border-r border-slate-200 bg-slate-50 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 text-slate-300 animate-spin" />
            </div>
          ) : strategies.length === 0 ? (
            <div className="p-6 text-center">
              <Map className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-400">No strategies yet.</p>
              {isExec && <p className="text-xs text-slate-400 mt-1">Click "New Business Strategy" to begin.</p>}
            </div>
          ) : (
            <div className="p-3 space-y-1.5">
              {strategies.map(s => {
                const cfg = STATUS_CFG[s.status] ?? STATUS_CFG.draft;
                return (
                  <button
                    key={s.id}
                    onClick={() => selectStrategy(s)}
                    className={`w-full text-left px-3 py-3 rounded-xl transition-colors ${selected?.id === s.id ? 'bg-white border border-slate-200 shadow-sm' : 'hover:bg-white'}`}
                  >
                    <div className="flex items-start gap-2">
                      <span className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${cfg.dot}`} />
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-semibold truncate ${selected?.id === s.id ? 'text-cyan-700' : 'text-slate-800'}`}>{s.title}</p>
                        {s.strategic_theme && <p className="text-xs text-slate-500 truncate">{s.strategic_theme}</p>}
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`text-xs px-1.5 py-0.5 rounded-full ${cfg.badge}`}>{cfg.label}</span>
                          {s.target_date && <span className="text-xs text-slate-400">{new Date(s.target_date).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}</span>}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Right panel */}
        {!selected ? (
          <div className="flex-1 flex items-center justify-center bg-white">
            <div className="text-center">
              <Map className="w-12 h-12 text-slate-200 mx-auto mb-3" />
              <p className="text-slate-400 text-sm">Select a strategy to view details</p>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col overflow-hidden bg-white">
            {/* Strategy header */}
            <div className="flex-shrink-0 px-6 py-4 border-b border-slate-200">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${STATUS_CFG[selected.status]?.badge}`}>
                      {STATUS_CFG[selected.status]?.label}
                    </span>
                    {selected.target_date && (
                      <span className="flex items-center gap-1 text-xs text-slate-400">
                        <Calendar className="w-3 h-3" />
                        {new Date(selected.target_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </span>
                    )}
                  </div>
                  <h2 className="text-xl font-bold text-slate-900">{selected.title}</h2>
                  {selected.strategic_theme && <p className="text-sm text-slate-500 mt-0.5">{selected.strategic_theme}</p>}
                </div>
                {isExec && (
                  <button onClick={() => openEditStrategy(selected)} className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50 transition-colors flex-shrink-0">
                    <Edit2 className="w-3.5 h-3.5" /> Edit
                  </button>
                )}
              </div>

              {/* Tab nav */}
              <div className="flex gap-0.5 mt-4">
                {([
                  { id: 'overview',      label: 'Overview',      icon: Map },
                  { id: 'plans',         label: 'Dept Plans',    icon: ClipboardList },
                  { id: 'collaboration', label: 'Collaboration', icon: MessageSquare },
                  { id: 'audit',         label: 'Audit Trail',   icon: Clock },
                ] as const).map(tab => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setRightTab(tab.id)}
                      className={`flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg transition-colors ${rightTab === tab.id ? 'bg-cyan-50 text-cyan-700 font-medium' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}
                    >
                      <Icon className="w-3.5 h-3.5" /> {tab.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Tab content */}
            <div className="flex-1 overflow-y-auto p-6">

              {/* Overview */}
              {rightTab === 'overview' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    {selected.description && (
                      <div>
                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Description</p>
                        <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{selected.description}</p>
                      </div>
                    )}
                    {selected.success_measures && (
                      <div>
                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Success Measures</p>
                        <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{selected.success_measures}</p>
                      </div>
                    )}
                    {selected.supporting_notes && (
                      <div>
                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Supporting Notes</p>
                        <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{selected.supporting_notes}</p>
                      </div>
                    )}
                    {selected.creator && (
                      <p className="text-xs text-slate-400">
                        Created by {selected.creator.full_name} &middot;{' '}
                        {new Date(selected.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    )}
                  </div>

                  {/* Dept assignments */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Department Assignments</p>
                      {isExec && (
                        <button onClick={() => setShowAddDept(true)} className="flex items-center gap-1 text-xs text-cyan-600 hover:text-cyan-700 font-medium">
                          <Plus className="w-3.5 h-3.5" /> Assign Department
                        </button>
                      )}
                    </div>
                    {assignments.length === 0 ? (
                      <div className="text-center py-6 border-2 border-dashed border-slate-200 rounded-xl text-slate-400 text-sm">
                        <Building2 className="w-6 h-6 mx-auto mb-1 opacity-50" />
                        No departments assigned yet.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {assignments.map(a => (
                          <div key={a.id} className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                            <div className="w-8 h-8 bg-cyan-100 rounded-lg flex items-center justify-center flex-shrink-0">
                              <Building2 className="w-4 h-4 text-cyan-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-slate-800 truncate">{a.department_name}</p>
                              {a.lead ? (
                                <div className="flex items-center gap-1 text-xs text-slate-500">
                                  <UserCheck className="w-3 h-3" /> {a.lead.full_name}
                                </div>
                              ) : (
                                <span className="text-xs text-amber-500 flex items-center gap-1">
                                  <AlertCircle className="w-3 h-3" /> No lead assigned
                                </span>
                              )}
                            </div>
                            {isExec && (
                              <button onClick={() => removeAssignment(a.id)} className="text-slate-300 hover:text-rose-500 transition-colors">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Dept Plans */}
              {rightTab === 'plans' && (
                <div>
                  {plans.length === 0 && assignments.length === 0 && (
                    <div className="text-center py-12 text-slate-400">
                      <ClipboardList className="w-10 h-10 mx-auto mb-2 opacity-30" />
                      <p className="text-sm">Assign departments first, then Strategic Leads can create their plans.</p>
                    </div>
                  )}

                  {/* Assignments awaiting plans */}
                  {assignments.filter(a => !plans.some(p => p.assignment_id === a.id)).length > 0 && (
                    <div className="mb-6">
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Awaiting Department Plan</p>
                      <div className="space-y-2">
                        {assignments
                          .filter(a => !plans.some(p => p.assignment_id === a.id))
                          .map(a => (
                            <div key={a.id} className="flex items-center gap-3 p-3 border border-dashed border-slate-200 rounded-xl">
                              <Building2 className="w-4 h-4 text-slate-400 flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm text-slate-600">{a.department_name}</p>
                                {a.lead && <p className="text-xs text-slate-400">Lead: {a.lead.full_name}</p>}
                              </div>
                              {(isExec || profile?.id === a.strategic_lead_id) && (
                                <button
                                  onClick={() => {
                                    setShowCreatePlan(a);
                                    setPlanForm({ title: `${a.department_name} Strategic Plan`, overview: '' });
                                  }}
                                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-cyan-600 border border-cyan-200 rounded-lg hover:bg-cyan-50 font-medium transition-colors"
                                >
                                  <Plus className="w-3 h-3" /> Create Plan
                                </button>
                              )}
                            </div>
                          ))}
                      </div>
                    </div>
                  )}

                  {/* Existing plans */}
                  {plans.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Department Strategic Plans</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {plans.map(p => {
                          const pCfg = PLAN_STATUS_CFG[p.status] ?? PLAN_STATUS_CFG.draft;
                          return (
                            <button
                              key={p.id}
                              onClick={() => setActivePlan(p)}
                              className="text-left p-4 border border-slate-200 rounded-xl hover:border-cyan-300 hover:shadow-sm transition-all bg-white group"
                            >
                              <div className="flex items-start justify-between gap-2 mb-2">
                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${pCfg.colour}`}>{pCfg.label}</span>
                                <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-cyan-500 transition-colors flex-shrink-0" />
                              </div>
                              <p className="text-sm font-semibold text-slate-800 mb-1">{p.title}</p>
                              <p className="text-xs text-slate-500 mb-2">{p.department_name}</p>
                              {p.lead && (
                                <div className="flex items-center gap-1 text-xs text-slate-400">
                                  <UserCheck className="w-3 h-3" /> {p.lead.full_name}
                                </div>
                              )}
                              {p.approved_at && (
                                <p className="text-xs text-green-600 mt-1">
                                  Approved {new Date(p.approved_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                                </p>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Collaboration */}
              {rightTab === 'collaboration' && (
                <div className="max-w-2xl">
                  <p className="text-xs text-slate-400 mb-4">
                    Strategy-level discussion. Comments on individual department plans appear within each plan.
                  </p>
                  <StrategyCollaboration strategyId={selected.id} />
                </div>
              )}

              {/* Audit Trail */}
              {rightTab === 'audit' && (
                <div className="max-w-2xl">
                  {audit.length === 0 ? (
                    <div className="text-center py-8 text-slate-400 text-sm">No audit entries yet.</div>
                  ) : (
                    <div className="space-y-2">
                      {audit.map(e => (
                        <div key={e.id} className="flex items-start gap-3 py-2.5 border-b border-slate-100 last:border-0">
                          <div className="w-2 h-2 rounded-full bg-slate-300 mt-2 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-medium text-slate-700">{e.action}</span>
                              {e.new_status && (
                                <span className={`text-xs px-1.5 py-0.5 rounded-full ${PLAN_STATUS_CFG[e.new_status]?.colour ?? 'bg-slate-100 text-slate-600'}`}>
                                  → {PLAN_STATUS_CFG[e.new_status]?.label ?? e.new_status}
                                </span>
                              )}
                            </div>
                            {e.comment && <p className="text-xs text-slate-500 mt-0.5">{e.comment}</p>}
                            <p className="text-xs text-slate-400 mt-0.5">
                              {e.actor?.full_name ?? 'Unknown'} &middot;{' '}
                              {new Date(e.created_at).toLocaleDateString('en-GB', {
                                day: 'numeric', month: 'short', year: 'numeric',
                                hour: '2-digit', minute: '2-digit',
                              })}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Create / Edit Business Strategy Modal ── */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 z-40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full max-h-[90vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 flex-shrink-0">
              <h2 className="text-lg font-bold text-slate-900">{editingStrategy ? 'Edit Business Strategy' : 'New Business Strategy'}</h2>
              <button onClick={() => { setShowCreate(false); setEditing(null); }} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Strategy Title <span className="text-rose-500">*</span></label>
                <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-cyan-500" placeholder="e.g. Operational Excellence 2026" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Strategic Theme</label>
                <input value={form.strategic_theme} onChange={e => setForm(f => ({ ...f, strategic_theme: e.target.value }))} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-cyan-500" placeholder="e.g. Growth, Efficiency, People" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-cyan-500 resize-none" placeholder="Describe the strategic intent..." />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Success Measures</label>
                <textarea value={form.success_measures} onChange={e => setForm(f => ({ ...f, success_measures: e.target.value }))} rows={2} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-cyan-500 resize-none" placeholder="How will success be measured?" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Supporting Notes</label>
                <textarea value={form.supporting_notes} onChange={e => setForm(f => ({ ...f, supporting_notes: e.target.value }))} rows={2} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-cyan-500 resize-none" placeholder="Any additional context or notes..." />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Start Date</label>
                  <input type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-cyan-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Target Date</label>
                  <input type="date" value={form.target_date} onChange={e => setForm(f => ({ ...f, target_date: e.target.value }))} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-cyan-500" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
                <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as Strategy['status'] }))} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-cyan-500">
                  <option value="draft">Draft</option>
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
            </div>
            <div className="flex-shrink-0 px-6 py-4 border-t border-slate-200 flex justify-end gap-3">
              <button onClick={() => { setShowCreate(false); setEditing(null); }} className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50">Cancel</button>
              <button onClick={saveStrategy} disabled={saving || !form.title.trim()} className="flex items-center gap-2 px-4 py-2 bg-cyan-600 text-white rounded-lg text-sm font-medium hover:bg-cyan-700 disabled:opacity-50">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {editingStrategy ? 'Save Changes' : 'Create Strategy'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Add Department Modal ── */}
      {showAddDept && (
        <div className="fixed inset-0 bg-black/50 z-40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h2 className="text-lg font-bold text-slate-900">Assign Department</h2>
              <button onClick={() => setShowAddDept(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Department Name <span className="text-rose-500">*</span></label>
                <input value={deptForm.department_name} onChange={e => setDeptForm(f => ({ ...f, department_name: e.target.value }))} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-cyan-500" placeholder="e.g. Sales, Engineering, People" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Strategic Lead</label>
                <select value={deptForm.strategic_lead_id} onChange={e => setDeptForm(f => ({ ...f, strategic_lead_id: e.target.value }))} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-cyan-500">
                  <option value="">Select a person...</option>
                  {availableUsers.map(u => (
                    <option key={u.id} value={u.id}>{u.full_name} ({u.role})</option>
                  ))}
                </select>
                <p className="text-xs text-slate-400 mt-1">The Strategic Lead will be notified and can create the department plan.</p>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button onClick={() => setShowAddDept(false)} className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50">Cancel</button>
                <button onClick={addDeptAssignment} disabled={saving || !deptForm.department_name.trim()} className="flex items-center gap-2 px-4 py-2 bg-cyan-600 text-white rounded-lg text-sm font-medium hover:bg-cyan-700 disabled:opacity-50">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  Assign
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Create Dept Plan Modal ── */}
      {showCreatePlan && (
        <div className="fixed inset-0 bg-black/50 z-40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Create Department Strategic Plan</h2>
                <p className="text-sm text-slate-500">{showCreatePlan.department_name}</p>
              </div>
              <button onClick={() => setShowCreatePlan(null)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Plan Title <span className="text-rose-500">*</span></label>
                <input value={planForm.title} onChange={e => setPlanForm(f => ({ ...f, title: e.target.value }))} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-cyan-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Overview</label>
                <textarea value={planForm.overview} onChange={e => setPlanForm(f => ({ ...f, overview: e.target.value }))} rows={3} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-cyan-500 resize-none" placeholder="How will your department contribute to the strategy?" />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button onClick={() => setShowCreatePlan(null)} className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50">Cancel</button>
                <button onClick={() => createPlan(showCreatePlan)} disabled={saving || !planForm.title.trim()} className="flex items-center gap-2 px-4 py-2 bg-cyan-600 text-white rounded-lg text-sm font-medium hover:bg-cyan-700 disabled:opacity-50">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  Create Plan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
