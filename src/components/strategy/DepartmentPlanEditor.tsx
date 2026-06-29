import { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, Plus, Trash2, Save, Send, CheckCircle, AlertTriangle, Target, Zap, BarChart2, FolderKanban, Milestone, ShieldAlert, Wrench, TrendingUp, Users, ChevronDown, Loader2, CreditCard as Edit2, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import StrategyCollaboration from './StrategyCollaboration';
import OpalStrategyPrompt from './OpalStrategyPrompt';

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

type PlanTab = 'overview' | 'objectives' | 'actions' | 'kpis' | 'projects' | 'milestones' | 'risks' | 'resources' | 'success';

const TABS: { id: PlanTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'overview',    label: 'Overview',          icon: TrendingUp },
  { id: 'objectives',  label: 'Objectives',        icon: Target },
  { id: 'actions',     label: 'Actions',           icon: Zap },
  { id: 'kpis',        label: 'KPIs',              icon: BarChart2 },
  { id: 'projects',    label: 'Projects',          icon: FolderKanban },
  { id: 'milestones',  label: 'Milestones',        icon: Milestone },
  { id: 'risks',       label: 'Risks',             icon: ShieldAlert },
  { id: 'resources',   label: 'Resources',         icon: Wrench },
  { id: 'success',     label: 'Success Measures',  icon: CheckCircle },
];

const STATUS_CONFIG: Record<string, { label: string; colour: string }> = {
  draft:                { label: 'Draft',               colour: 'bg-slate-100 text-slate-700' },
  submitted:            { label: 'Submitted',           colour: 'bg-blue-100 text-blue-700' },
  in_review:            { label: 'In Review',           colour: 'bg-amber-100 text-amber-700' },
  amendments_requested: { label: 'Amendments Needed',   colour: 'bg-rose-100 text-rose-700' },
  resubmitted:          { label: 'Resubmitted',         colour: 'bg-purple-100 text-purple-700' },
  approved:             { label: 'Approved',            colour: 'bg-green-100 text-green-700' },
  active:               { label: 'Active',              colour: 'bg-teal-100 text-teal-700' },
};

interface Props {
  plan: DeptPlan;
  strategyTitle: string;
  onBack: () => void;
  onPlanUpdated: () => void;
  isExec: boolean;
}

interface ItemRow { id: string; [key: string]: unknown }

function useTableData<T extends ItemRow>(table: string, planId: string) {
  const [rows, setRows] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from(table).select('*').eq('plan_id', planId).order('sort_order').order('created_at');
    setRows((data ?? []) as T[]);
    setLoading(false);
  }, [table, planId]);

  useEffect(() => { load(); }, [load]);

  return { rows, loading, reload: load };
}

async function addRow(table: string, planId: string, fields: Record<string, unknown>) {
  await supabase.from(table).insert([{ plan_id: planId, ...fields }]);
}

async function updateRow(table: string, id: string, fields: Record<string, unknown>) {
  await supabase.from(table).update(fields).eq('id', id);
}

async function deleteRow(table: string, id: string) {
  await supabase.from(table).delete().eq('id', id);
}

function InlineInput({ value, onSave, placeholder, multiline }: {
  value: string; onSave: (v: string) => void; placeholder?: string; multiline?: boolean;
}) {
  const [v, setV] = useState(value);
  const [editing, setEditing] = useState(false);

  if (!editing) {
    return (
      <div
        className="text-sm text-slate-700 cursor-pointer hover:bg-slate-50 rounded px-1 py-0.5 min-h-[1.5rem] flex items-center gap-1 group"
        onClick={() => setEditing(true)}
      >
        {v || <span className="text-slate-400">{placeholder}</span>}
        <Edit2 className="w-3 h-3 text-slate-300 group-hover:text-slate-400 opacity-0 group-hover:opacity-100 flex-shrink-0" />
      </div>
    );
  }

  const props = {
    value: v,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setV(e.target.value),
    onBlur: () => { setEditing(false); onSave(v); },
    onKeyDown: (e: React.KeyboardEvent) => { if (e.key === 'Enter' && !multiline) { setEditing(false); onSave(v); } if (e.key === 'Escape') { setV(value); setEditing(false); } },
    autoFocus: true,
    className: 'w-full px-2 py-1 text-sm border border-cyan-400 rounded focus:outline-none focus:ring-1 focus:ring-cyan-500',
    placeholder,
  };

  return multiline
    ? <textarea {...props} rows={2} className={props.className + ' resize-none'} />
    : <input {...props} />;
}

export default function DepartmentPlanEditor({ plan: initialPlan, strategyTitle, onBack, onPlanUpdated, isExec }: Props) {
  const { profile } = useAuth();
  const [plan, setPlan] = useState<DeptPlan>(initialPlan);
  const [activeTab, setActiveTab] = useState<PlanTab>('overview');
  const [overview, setOverview] = useState(initialPlan.overview ?? '');
  const [overviewTitle, setOverviewTitle] = useState(initialPlan.title);
  const [savingOverview, setSavingOverview] = useState(false);
  const [actionNote, setActionNote] = useState('');
  const [showActionNote, setShowActionNote] = useState(false);
  const [showOpalPrompt, setShowOpalPrompt] = useState(false);
  const [showCollab, setShowCollab] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const isLead = profile?.id === plan.strategic_lead_id;
  const canEdit = isLead && ['draft', 'amendments_requested'].includes(plan.status);

  const objectives  = useTableData<ItemRow>('dept_plan_objectives', plan.id);
  const actions     = useTableData<ItemRow>('dept_plan_actions', plan.id);
  const kpis        = useTableData<ItemRow>('dept_plan_kpis', plan.id);
  const projects    = useTableData<ItemRow>('dept_plan_projects', plan.id);
  const milestones  = useTableData<ItemRow>('dept_plan_milestones', plan.id);
  const risks       = useTableData<ItemRow>('dept_plan_risks', plan.id);
  const resources   = useTableData<ItemRow>('dept_plan_resources', plan.id);
  const success     = useTableData<ItemRow>('dept_plan_success_measures', plan.id);

  async function saveOverview() {
    setSavingOverview(true);
    await supabase.from('department_strategic_plans').update({ title: overviewTitle, overview, updated_at: new Date().toISOString() }).eq('id', plan.id);
    setSavingOverview(false);
  }

  async function performAction(action: string, newStatus: string) {
    if (!profile) return;
    setActionLoading(true);
    const now = new Date().toISOString();
    const patch: Record<string, unknown> = { status: newStatus, updated_at: now };
    if (newStatus === 'submitted' || newStatus === 'resubmitted') patch.submitted_at = now;
    if (newStatus === 'in_review') patch.reviewed_at = now;
    if (newStatus === 'approved' || newStatus === 'active') { patch.approved_at = now; patch.approved_by_id = profile.id; }

    await supabase.from('department_strategic_plans').update(patch).eq('id', plan.id);
    await supabase.from('strategy_audit_log').insert([{
      strategy_id: plan.strategy_id,
      plan_id: plan.id,
      action,
      actor_id: profile.id,
      old_status: plan.status,
      new_status: newStatus,
      comment: actionNote || null,
    }]);

    // Notify the relevant party
    const notifyUserId = isExec ? plan.strategic_lead_id : plan.strategic_lead_id;
    await supabase.from('strategy_notifications').insert([{
      strategy_id: plan.strategy_id,
      user_id: notifyUserId,
      message: `${action}: ${plan.department_name} Department Strategic Plan`,
      created_at: now,
    }]).maybeSingle().catch(() => {});

    const updated = { ...plan, status: newStatus as DeptPlan['status'] };
    setPlan(updated);
    onPlanUpdated();
    setShowActionNote(false);
    setActionNote('');
    setActionLoading(false);

    if (newStatus === 'approved') setShowOpalPrompt(true);
  }

  function WorkflowActions() {
    const s = plan.status;
    if (isLead && (s === 'draft' || s === 'amendments_requested')) {
      return (
        <button
          onClick={() => performAction(s === 'amendments_requested' ? 'Resubmitted' : 'Submitted for Review', s === 'amendments_requested' ? 'resubmitted' : 'submitted')}
          disabled={actionLoading}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          {s === 'amendments_requested' ? 'Resubmit' : 'Submit for Review'}
        </button>
      );
    }
    if (isExec && (s === 'submitted' || s === 'resubmitted')) {
      return (
        <div className="flex items-center gap-2">
          <button
            onClick={() => performAction('Moved to Review', 'in_review')}
            disabled={actionLoading}
            className="flex items-center gap-2 px-3 py-2 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700 disabled:opacity-50 transition-colors"
          >
            {actionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
            Start Review
          </button>
        </div>
      );
    }
    if (isExec && s === 'in_review') {
      return (
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setShowActionNote(true); }}
            className="flex items-center gap-2 px-3 py-2 bg-rose-600 text-white rounded-lg text-sm font-medium hover:bg-rose-700 transition-colors"
          >
            <AlertTriangle className="w-4 h-4" /> Request Amendments
          </button>
          <button
            onClick={() => performAction('Approved', 'approved')}
            disabled={actionLoading}
            className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
          >
            {actionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
            Approve
          </button>
        </div>
      );
    }
    if (isExec && s === 'approved') {
      return (
        <button
          onClick={() => performAction('Activated', 'active')}
          disabled={actionLoading}
          className="flex items-center gap-2 px-3 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 disabled:opacity-50 transition-colors"
        >
          {actionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <TrendingUp className="w-4 h-4" />}
          Activate
        </button>
      );
    }
    return null;
  }

  function SimpleList({ hook, table, addFields, renderRow, addLabel }: {
    hook: ReturnType<typeof useTableData>;
    table: string;
    addLabel: string;
    addFields: Record<string, unknown>;
    renderRow: (row: ItemRow, editable: boolean) => React.ReactNode;
  }) {
    const [adding, setAdding] = useState(false);
    const [form, setForm] = useState<Record<string, string>>({});

    const fieldKeys = Object.keys(addFields);

    async function submit() {
      const payload: Record<string, unknown> = {};
      fieldKeys.forEach(k => { payload[k] = form[k] ?? ''; });
      await addRow(table, plan.id, payload);
      setForm({});
      setAdding(false);
      hook.reload();
    }

    return (
      <div className="space-y-2">
        {hook.loading ? (
          <div className="py-4 text-center text-sm text-slate-400">Loading...</div>
        ) : hook.rows.length === 0 && !adding ? (
          <div className="py-6 text-center text-sm text-slate-400">Nothing added yet.</div>
        ) : (
          hook.rows.map(row => (
            <div key={row.id} className="flex items-start gap-2 bg-white border border-slate-100 rounded-xl p-3">
              <div className="flex-1 min-w-0">
                {renderRow(row, canEdit)}
              </div>
              {canEdit && (
                <button onClick={async () => { await deleteRow(table, row.id as string); hook.reload(); }} className="text-slate-300 hover:text-rose-500 transition-colors flex-shrink-0 mt-0.5">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))
        )}

        {canEdit && !adding && (
          <button onClick={() => setAdding(true)} className="flex items-center gap-2 text-sm text-cyan-600 hover:text-cyan-700 font-medium px-1 py-1">
            <Plus className="w-4 h-4" /> {addLabel}
          </button>
        )}

        {adding && (
          <div className="border border-cyan-200 rounded-xl p-3 bg-cyan-50 space-y-2">
            {(Object.entries(addFields) as [string, unknown][]).map(([k, meta]: [string, unknown]) => {
              const m = meta as { placeholder: string; multiline?: boolean };
              return m.multiline ? (
                <textarea
                  key={k}
                  value={form[k] ?? ''}
                  onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))}
                  placeholder={m.placeholder}
                  rows={2}
                  className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-cyan-500 resize-none"
                />
              ) : (
                <input
                  key={k}
                  value={form[k] ?? ''}
                  onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))}
                  placeholder={m.placeholder}
                  className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-cyan-500"
                />
              );
            })}
            <div className="flex gap-2">
              <button onClick={submit} className="px-3 py-1.5 bg-cyan-600 text-white rounded-lg text-sm hover:bg-cyan-700 transition-colors">Add</button>
              <button onClick={() => { setAdding(false); setForm({}); }} className="px-3 py-1.5 text-slate-500 text-sm hover:text-slate-700">Cancel</button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex-shrink-0 px-6 py-4 border-b border-slate-200 bg-white">
        <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-3 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to strategy
        </button>
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${STATUS_CONFIG[plan.status]?.colour}`}>
                {STATUS_CONFIG[plan.status]?.label}
              </span>
              <span className="text-xs text-slate-400">v{plan.version}</span>
            </div>
            <h2 className="text-lg font-bold text-slate-900">{plan.title}</h2>
            <p className="text-sm text-slate-500">{plan.department_name} — Lead: {plan.lead?.full_name ?? '—'}</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => setShowCollab(!showCollab)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${showCollab ? 'bg-slate-100 border-slate-300 text-slate-700' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}
            >
              <Users className="w-4 h-4" /> Collaboration
            </button>
            <WorkflowActions />
          </div>
        </div>

        {/* Amendment note input */}
        {showActionNote && (
          <div className="mt-3 flex gap-2 items-start bg-rose-50 border border-rose-200 rounded-xl p-3">
            <div className="flex-1">
              <p className="text-xs font-semibold text-rose-700 mb-1">Add a note explaining the amendments required</p>
              <textarea
                value={actionNote}
                onChange={e => setActionNote(e.target.value)}
                rows={2}
                className="w-full px-3 py-1.5 text-sm border border-rose-200 rounded-lg focus:ring-2 focus:ring-rose-400 resize-none bg-white"
                placeholder="Describe what amendments are needed..."
              />
            </div>
            <div className="flex flex-col gap-1 flex-shrink-0">
              <button onClick={() => performAction('Amendments Requested', 'amendments_requested')} disabled={actionLoading} className="px-3 py-1.5 bg-rose-600 text-white rounded-lg text-xs font-medium hover:bg-rose-700 disabled:opacity-50">
                {actionLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Send'}
              </button>
              <button onClick={() => setShowActionNote(false)} className="px-3 py-1.5 text-slate-500 text-xs"><X className="w-3 h-3" /></button>
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Main content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Tab nav */}
          <div className="flex-shrink-0 flex gap-0.5 px-6 pt-3 overflow-x-auto border-b border-slate-100">
            {TABS.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-t-lg transition-colors whitespace-nowrap ${activeTab === tab.id ? 'bg-white border border-b-0 border-slate-200 text-cyan-700' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-y-auto p-6">
            {activeTab === 'overview' && (
              <div className="space-y-4 max-w-2xl">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Plan Title</label>
                  {canEdit ? (
                    <input
                      value={overviewTitle}
                      onChange={e => setOverviewTitle(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-cyan-500"
                    />
                  ) : (
                    <p className="text-sm text-slate-800 font-medium">{plan.title}</p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Department Overview</label>
                  {canEdit ? (
                    <textarea
                      value={overview}
                      onChange={e => setOverview(e.target.value)}
                      rows={5}
                      placeholder="Describe how this department will contribute to the business strategy..."
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-cyan-500 resize-none"
                    />
                  ) : (
                    <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{plan.overview || 'No overview added.'}</p>
                  )}
                </div>
                {canEdit && (
                  <button onClick={saveOverview} disabled={savingOverview} className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-lg text-sm font-medium hover:bg-slate-700 disabled:opacity-50">
                    {savingOverview ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save Overview
                  </button>
                )}
                {plan.approved_at && (
                  <div className="p-4 bg-green-50 border border-green-200 rounded-xl text-sm text-green-800">
                    <strong>Approved</strong> on {new Date(plan.approved_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'objectives' && (
              <SimpleList
                hook={objectives}
                table="dept_plan_objectives"
                addLabel="Add Objective"
                addFields={{ title: { placeholder: 'Objective title *' }, description: { placeholder: 'Description', multiline: true } }}
                renderRow={(row, editable) => (
                  <div>
                    {editable ? (
                      <InlineInput value={row.title as string} onSave={v => updateRow('dept_plan_objectives', row.id, { title: v }).then(objectives.reload)} placeholder="Objective title" />
                    ) : (
                      <p className="text-sm font-medium text-slate-800">{row.title as string}</p>
                    )}
                    {row.description && <p className="text-xs text-slate-500 mt-0.5">{row.description as string}</p>}
                  </div>
                )}
              />
            )}

            {activeTab === 'actions' && (
              <SimpleList
                hook={actions}
                table="dept_plan_actions"
                addLabel="Add Action"
                addFields={{ title: { placeholder: 'Action title *' }, description: { placeholder: 'Description', multiline: true }, due_date: { placeholder: 'Due date (YYYY-MM-DD)' } }}
                renderRow={(row, editable) => (
                  <div>
                    {editable ? (
                      <InlineInput value={row.title as string} onSave={v => updateRow('dept_plan_actions', row.id, { title: v }).then(actions.reload)} placeholder="Action title" />
                    ) : (
                      <p className="text-sm font-medium text-slate-800">{row.title as string}</p>
                    )}
                    <div className="flex items-center gap-3 mt-0.5">
                      {row.description && <span className="text-xs text-slate-500">{row.description as string}</span>}
                      {row.due_date && <span className="text-xs text-slate-400">Due: {row.due_date as string}</span>}
                      <span className={`text-xs px-1.5 py-0.5 rounded-full ${(row.status as string) === 'completed' ? 'bg-green-100 text-green-700' : (row.status as string) === 'in_progress' ? 'bg-blue-100 text-blue-700' : (row.status as string) === 'blocked' ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-600'}`}>
                        {(row.status as string).replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                )}
              />
            )}

            {activeTab === 'kpis' && (
              <SimpleList
                hook={kpis}
                table="dept_plan_kpis"
                addLabel="Add KPI"
                addFields={{ title: { placeholder: 'KPI name *' }, target_value: { placeholder: 'Target value' }, measurement_unit: { placeholder: 'Unit (%, £, #...)' }, frequency: { placeholder: 'Review frequency' } }}
                renderRow={(row, editable) => (
                  <div>
                    {editable ? (
                      <InlineInput value={row.title as string} onSave={v => updateRow('dept_plan_kpis', row.id, { title: v }).then(kpis.reload)} placeholder="KPI name" />
                    ) : (
                      <p className="text-sm font-medium text-slate-800">{row.title as string}</p>
                    )}
                    <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                      {row.target_value && <span className="text-xs text-slate-500">Target: <strong>{row.target_value as string}</strong>{row.measurement_unit ? ` ${row.measurement_unit}` : ''}</span>}
                      {row.frequency && <span className="text-xs text-slate-400">{row.frequency as string}</span>}
                    </div>
                  </div>
                )}
              />
            )}

            {activeTab === 'projects' && (
              <SimpleList
                hook={projects}
                table="dept_plan_projects"
                addLabel="Add Project"
                addFields={{ title: { placeholder: 'Project title *' }, description: { placeholder: 'Description', multiline: true }, start_date: { placeholder: 'Start date (YYYY-MM-DD)' }, end_date: { placeholder: 'End date (YYYY-MM-DD)' } }}
                renderRow={(row, editable) => (
                  <div>
                    {editable ? (
                      <InlineInput value={row.title as string} onSave={v => updateRow('dept_plan_projects', row.id, { title: v }).then(projects.reload)} placeholder="Project title" />
                    ) : (
                      <p className="text-sm font-medium text-slate-800">{row.title as string}</p>
                    )}
                    <div className="flex items-center gap-3 mt-0.5">
                      {row.description && <span className="text-xs text-slate-500">{row.description as string}</span>}
                      {(row.start_date || row.end_date) && <span className="text-xs text-slate-400">{row.start_date as string} → {row.end_date as string}</span>}
                      <span className={`text-xs px-1.5 py-0.5 rounded-full ${(row.status as string) === 'completed' ? 'bg-green-100 text-green-700' : (row.status as string) === 'in_progress' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>
                        {(row.status as string).replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                )}
              />
            )}

            {activeTab === 'milestones' && (
              <SimpleList
                hook={milestones}
                table="dept_plan_milestones"
                addLabel="Add Milestone"
                addFields={{ title: { placeholder: 'Milestone title *' }, description: { placeholder: 'Description' }, target_date: { placeholder: 'Target date (YYYY-MM-DD)' } }}
                renderRow={(row, editable) => (
                  <div>
                    {editable ? (
                      <InlineInput value={row.title as string} onSave={v => updateRow('dept_plan_milestones', row.id, { title: v }).then(milestones.reload)} placeholder="Milestone title" />
                    ) : (
                      <p className="text-sm font-medium text-slate-800">{row.title as string}</p>
                    )}
                    <div className="flex items-center gap-3 mt-0.5">
                      {row.target_date && <span className="text-xs text-slate-400">Due: {row.target_date as string}</span>}
                      <span className={`text-xs px-1.5 py-0.5 rounded-full ${(row.status as string) === 'completed' ? 'bg-green-100 text-green-700' : (row.status as string) === 'blocked' ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-600'}`}>
                        {(row.status as string).replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                )}
              />
            )}

            {activeTab === 'risks' && (
              <SimpleList
                hook={risks}
                table="dept_plan_risks"
                addLabel="Add Risk"
                addFields={{ title: { placeholder: 'Risk description *' }, likelihood: { placeholder: 'Likelihood (low/medium/high)' }, impact: { placeholder: 'Impact (low/medium/high)' }, mitigation: { placeholder: 'Mitigation strategy', multiline: true } }}
                renderRow={(row, editable) => (
                  <div>
                    {editable ? (
                      <InlineInput value={row.title as string} onSave={v => updateRow('dept_plan_risks', row.id, { title: v }).then(risks.reload)} placeholder="Risk" />
                    ) : (
                      <p className="text-sm font-medium text-slate-800">{row.title as string}</p>
                    )}
                    <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                      {row.likelihood && <span className={`text-xs px-1.5 py-0.5 rounded-full ${(row.likelihood as string) === 'high' ? 'bg-rose-100 text-rose-700' : (row.likelihood as string) === 'medium' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>L: {row.likelihood as string}</span>}
                      {row.impact && <span className={`text-xs px-1.5 py-0.5 rounded-full ${(row.impact as string) === 'high' ? 'bg-rose-100 text-rose-700' : (row.impact as string) === 'medium' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>I: {row.impact as string}</span>}
                      {row.mitigation && <span className="text-xs text-slate-500 truncate max-w-[200px]">{row.mitigation as string}</span>}
                    </div>
                  </div>
                )}
              />
            )}

            {activeTab === 'resources' && (
              <SimpleList
                hook={resources}
                table="dept_plan_resources"
                addLabel="Add Resource"
                addFields={{ title: { placeholder: 'Resource title *' }, resource_type: { placeholder: 'Type (headcount/budget/technology/training/other)' }, quantity: { placeholder: 'Quantity/amount' }, estimated_cost: { placeholder: 'Estimated cost' }, required_by: { placeholder: 'Required by (YYYY-MM-DD)' } }}
                renderRow={(row, editable) => (
                  <div>
                    {editable ? (
                      <InlineInput value={row.title as string} onSave={v => updateRow('dept_plan_resources', row.id, { title: v }).then(resources.reload)} placeholder="Resource" />
                    ) : (
                      <p className="text-sm font-medium text-slate-800">{row.title as string}</p>
                    )}
                    <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                      {row.resource_type && <span className="text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-full">{row.resource_type as string}</span>}
                      {row.quantity && <span className="text-xs text-slate-500">Qty: {row.quantity as string}</span>}
                      {row.estimated_cost && <span className="text-xs text-slate-500">Cost: {row.estimated_cost as string}</span>}
                      {row.required_by && <span className="text-xs text-slate-400">By: {row.required_by as string}</span>}
                    </div>
                  </div>
                )}
              />
            )}

            {activeTab === 'success' && (
              <SimpleList
                hook={success}
                table="dept_plan_success_measures"
                addLabel="Add Success Measure"
                addFields={{ title: { placeholder: 'Success measure title *' }, description: { placeholder: 'Description', multiline: true }, target_value: { placeholder: 'Target value' }, measurement_unit: { placeholder: 'Unit' }, review_frequency: { placeholder: 'Review frequency' } }}
                renderRow={(row, editable) => (
                  <div>
                    {editable ? (
                      <InlineInput value={row.title as string} onSave={v => updateRow('dept_plan_success_measures', row.id, { title: v }).then(success.reload)} placeholder="Success measure" />
                    ) : (
                      <p className="text-sm font-medium text-slate-800">{row.title as string}</p>
                    )}
                    <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                      {row.target_value && <span className="text-xs text-slate-500">Target: <strong>{row.target_value as string}</strong>{row.measurement_unit ? ` ${row.measurement_unit}` : ''}</span>}
                      {row.review_frequency && <span className="text-xs text-slate-400">{row.review_frequency as string}</span>}
                    </div>
                  </div>
                )}
              />
            )}
          </div>
        </div>

        {/* Collaboration sidebar */}
        {showCollab && (
          <div className="w-80 flex-shrink-0 border-l border-slate-200 flex flex-col bg-slate-50">
            <div className="flex-shrink-0 px-4 py-3 border-b border-slate-200 flex items-center justify-between bg-white">
              <span className="text-sm font-semibold text-slate-700">Collaboration</span>
              <button onClick={() => setShowCollab(false)} className="text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <StrategyCollaboration planId={plan.id} />
            </div>
          </div>
        )}
      </div>

      {showOpalPrompt && (
        <OpalStrategyPrompt
          plan={plan}
          strategyTitle={strategyTitle}
          onClose={() => setShowOpalPrompt(false)}
          onPublished={() => { setShowOpalPrompt(false); }}
        />
      )}

      {/* Workflow progress bar */}
      <div className="flex-shrink-0 border-t border-slate-100 bg-white px-6 py-2">
        <div className="flex items-center gap-1 text-xs text-slate-400">
          {['draft','submitted','in_review','amendments_requested','resubmitted','approved','active'].map((s, i, arr) => (
            <span key={s} className="flex items-center gap-1">
              <span className={`${plan.status === s ? 'text-cyan-700 font-semibold' : arr.indexOf(plan.status) > i ? 'text-slate-500' : 'text-slate-300'}`}>
                {STATUS_CONFIG[s]?.label}
              </span>
              {i < arr.length - 1 && <ChevronDown className="w-3 h-3 rotate-[-90deg] text-slate-300" />}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
