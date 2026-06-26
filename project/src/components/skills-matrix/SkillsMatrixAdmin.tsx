import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import {
  Plus, Lock, Unlock, ChevronDown, ChevronRight, CheckSquare, Square,
  Save, X, Archive, RotateCcw, AlertCircle, Layers, BookOpen,
  Building2, Users, Tag, ArrowRight, ArrowLeft, CheckCircle2,
  Pencil, ClipboardList, Trash2, CheckCircle,
} from 'lucide-react';
import TrainingRecord from './TrainingRecord';

// ─── Interfaces ───────────────────────────────────────────────────────────────

interface SmType    { id: string; name: string; sort_order: number; archived: boolean; created_by: string; created_at: string; }
interface SmCategory { id: string; type_id: string; name: string; sort_order: number; archived: boolean; }
interface SmTopic {
  id: string; category_id: string; name: string; sort_order: number; archived: boolean;
  training_trackable: boolean;
  def_rating_3: string | null; def_rating_4: string | null; def_rating_5: string | null;
}
interface SmMatrix {
  id: string; name: string; department: string; is_locked: boolean;
  locked_at: string | null; locked_by: string | null; created_by: string;
  created_at: string; updated_at: string; archived: boolean;
}
interface SmRoleTopic { id: string; matrix_id: string; job_family_id: string; topic_id: string; is_applicable: boolean; }
interface JobFamily  { id: string; title: string; department: string; pathway: string | null; level: number | null; sort_order: number | null; }
interface SmCycle {
  id: string; matrix_id: string; name: string; frequency: string; due_date: string | null;
  status: string; created_by: string; created_at: string;
  sm_matrices?: { name: string; department: string };
}

type Tab = 'topics' | 'matrices' | 'training' | 'cycles';
// Steps for the new matrix wizard
type WizardStep = 1 | 2 | 3 | 4;

// ─── Blank form defaults ──────────────────────────────────────────────────────

const blankTypeForm     = { name: '' };
const blankCategoryForm = { type_id: '', name: '' };
const blankTopicForm    = { type_id: '', category_id: '', name: '', training_trackable: false, def_rating_3: '', def_rating_4: '', def_rating_5: '' };
const blankCycleForm    = { matrix_id: '', name: '', frequency: 'Quarterly', due_date: '' };

// ─── EditModeLibrary ─────────────────────────────────────────────────────────
// Inline topic-library management panel surfaced inside Edit Matrix mode.
// Provides: add/edit/archive type, category, topic — same controls as Topics tab.

interface EditModeLibraryProps {
  types: SmType[];
  categories: SmCategory[];
  topics: SmTopic[];
  onRefresh: () => void;
  onOpenTopicPanel: (catId?: string) => void;
  onEditTopicPanel: (topic: SmTopic) => void;
  onArchive: (kind: 'type' | 'category' | 'topic', id: string, current: boolean) => void;
  editingNode: { kind: 'type' | 'category'; id: string } | null;
  editForm: Record<string, string>;
  onStartEditNode: (kind: 'type' | 'category', item: SmType | SmCategory) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onEditFormChange: (name: string) => void;
}

function EditModeLibrary({
  types, categories, topics,
  onRefresh, onOpenTopicPanel, onEditTopicPanel, onArchive,
  editingNode, editForm, onStartEditNode, onSaveEdit, onCancelEdit, onEditFormChange,
}: EditModeLibraryProps) {
  const [open, setOpen] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [expandedTypes, setExpandedTypes] = useState<Set<string>>(new Set());
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [addingType, setAddingType] = useState(false);
  const [typeFormName, setTypeFormName] = useState('');
  const [addingCategory, setAddingCategory] = useState<string | null>(null);
  const [addingCategoryTop, setAddingCategoryTop] = useState(false);
  const [categoryForm, setCategoryForm] = useState({ type_id: '', name: '' });
  const { profile } = useAuth();

  const visibleTypes = types.filter(t => showArchived || !t.archived);
  const catsForType = (typeId: string) => categories.filter(c => c.type_id === typeId && (showArchived || !c.archived));
  const topicsForCat = (catId: string) => topics.filter(t => t.category_id === catId && (showArchived || !t.archived));

  async function saveType() {
    if (!typeFormName.trim()) return;
    const maxOrder = types.length > 0 ? Math.max(...types.map(t => t.sort_order)) + 1 : 0;
    await supabase.from('sm_types').insert({ name: typeFormName.trim(), sort_order: maxOrder, created_by: profile?.id });
    setTypeFormName(''); setAddingType(false); onRefresh();
  }

  async function saveCategory(typeId: string) {
    if (!categoryForm.name.trim()) return;
    const catsInType = categories.filter(c => c.type_id === typeId);
    const maxOrder = catsInType.length > 0 ? Math.max(...catsInType.map(c => c.sort_order)) + 1 : 0;
    await supabase.from('sm_categories').insert({ type_id: typeId, name: categoryForm.name.trim(), sort_order: maxOrder });
    setCategoryForm({ type_id: '', name: '' }); setAddingCategory(null); setAddingCategoryTop(false); onRefresh();
  }

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      {/* Toggle header */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
      >
        <div className="flex items-center gap-2">
          {open ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
          <Layers className="w-4 h-4 text-blue-500" />
          <span className="text-sm font-semibold text-gray-800">Manage Topics Library</span>
          <span className="text-xs text-gray-400 ml-1">— add, edit, archive types, categories & topics</span>
        </div>
        <span className="text-xs text-gray-400">{open ? 'collapse' : 'expand'}</span>
      </button>

      {open && (
        <div className="p-4 border-t border-gray-100 space-y-4 bg-white">
          {/* Toolbar */}
          <div className="flex items-center gap-2 flex-wrap">
            <label className="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer mr-2">
              <input type="checkbox" checked={showArchived} onChange={e => setShowArchived(e.target.checked)} className="rounded border-gray-300" />
              Show archived
            </label>
            <button onClick={() => { setAddingType(true); setAddingCategoryTop(false); setTypeFormName(''); }}
              className="flex items-center gap-1 px-2.5 py-1.5 border border-gray-300 text-gray-700 text-xs rounded-lg hover:bg-gray-50 transition-colors">
              <Tag className="w-3 h-3" /> Add Type
            </button>
            <button onClick={() => { setAddingCategoryTop(true); setAddingType(false); setCategoryForm({ type_id: '', name: '' }); }}
              className="flex items-center gap-1 px-2.5 py-1.5 border border-gray-300 text-gray-700 text-xs rounded-lg hover:bg-gray-50 transition-colors">
              <BookOpen className="w-3 h-3" /> Add Category
            </button>
            <button onClick={() => onOpenTopicPanel()}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700 transition-colors">
              <Plus className="w-3 h-3" /> Add Topic
            </button>
          </div>

          {/* Add Type inline form */}
          {addingType && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-xs font-semibold text-blue-700 mb-2 flex items-center gap-1"><Tag className="w-3 h-3" /> New Type</p>
              <input className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2"
                placeholder='e.g. "Product Knowledge"' value={typeFormName} onChange={e => setTypeFormName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && saveType()} autoFocus />
              <div className="flex gap-2">
                <button onClick={saveType} disabled={!typeFormName.trim()} className="flex items-center gap-1 px-2.5 py-1 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700 disabled:opacity-50"><Save className="w-3 h-3" /> Save</button>
                <button onClick={() => setAddingType(false)} className="px-2.5 py-1 bg-gray-100 text-gray-600 text-xs rounded-lg hover:bg-gray-200">Cancel</button>
              </div>
            </div>
          )}

          {/* Add Category (top-level) inline form */}
          {addingCategoryTop && (
            <div className="p-3 bg-teal-50 border border-teal-200 rounded-lg">
              <p className="text-xs font-semibold text-teal-700 mb-2 flex items-center gap-1"><BookOpen className="w-3 h-3" /> New Category</p>
              <div className="space-y-2">
                <select className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500"
                  value={categoryForm.type_id} onChange={e => setCategoryForm(f => ({ ...f, type_id: e.target.value }))}>
                  <option value="">Select a type...</option>
                  {types.filter(t => !t.archived).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
                <input className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:bg-gray-50"
                  placeholder='e.g. "Payments"' value={categoryForm.name} disabled={!categoryForm.type_id}
                  onChange={e => setCategoryForm(f => ({ ...f, name: e.target.value }))}
                  onKeyDown={e => e.key === 'Enter' && categoryForm.type_id && saveCategory(categoryForm.type_id)} />
              </div>
              <div className="flex gap-2 mt-2">
                <button onClick={() => categoryForm.type_id && saveCategory(categoryForm.type_id)}
                  disabled={!categoryForm.type_id || !categoryForm.name.trim()}
                  className="flex items-center gap-1 px-2.5 py-1 bg-teal-600 text-white text-xs rounded-lg hover:bg-teal-700 disabled:opacity-50"><Save className="w-3 h-3" /> Save</button>
                <button onClick={() => setAddingCategoryTop(false)} className="px-2.5 py-1 bg-gray-100 text-gray-600 text-xs rounded-lg hover:bg-gray-200">Cancel</button>
              </div>
            </div>
          )}

          {/* Type / Category / Topic tree */}
          <div className="space-y-2">
            {visibleTypes.map(type => {
              const cats = catsForType(type.id);
              const isEditingType = editingNode?.kind === 'type' && editingNode.id === type.id;
              const isTypeExpanded = expandedTypes.has(type.id);

              return (
                <div key={type.id} className={`rounded-xl border ${type.archived ? 'border-gray-200 bg-gray-50 opacity-60' : 'border-gray-200 bg-white'}`}>
                  <div className="flex items-center gap-2 px-3 py-2.5">
                    <button type="button" onClick={() => setExpandedTypes(prev => { const s = new Set(prev); s.has(type.id) ? s.delete(type.id) : s.add(type.id); return s; })} className="text-gray-400 hover:text-gray-600 flex-shrink-0">
                      {isTypeExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                    </button>
                    <Tag className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                    {isEditingType ? (
                      <div className="flex items-center gap-2 flex-1">
                        <input className="border border-gray-300 rounded-lg px-2 py-1 text-xs flex-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          value={editForm.name} onChange={e => onEditFormChange(e.target.value)} onKeyDown={e => e.key === 'Enter' && onSaveEdit()} autoFocus />
                        <button type="button" onClick={onSaveEdit} className="p-1 text-blue-600 hover:text-blue-800 rounded"><Save className="w-3.5 h-3.5" /></button>
                        <button type="button" onClick={onCancelEdit} className="p-1 text-gray-400 hover:text-gray-600 rounded"><X className="w-3.5 h-3.5" /></button>
                      </div>
                    ) : (
                      <>
                        <div className="flex-1 min-w-0">
                          <span className={`text-xs font-semibold ${type.archived ? 'text-gray-400 line-through' : 'text-gray-900'}`}>{type.name}</span>
                          <span className="ml-2 text-xs text-gray-400">{cats.length} {cats.length === 1 ? 'category' : 'categories'}</span>
                        </div>
                        <button type="button" onClick={() => onStartEditNode('type', type)} className="p-1 text-gray-400 hover:text-blue-600 rounded transition-colors"><Pencil className="w-3 h-3" /></button>
                        <button type="button" onClick={() => onArchive('type', type.id, type.archived)} className={`p-1 rounded transition-colors ${type.archived ? 'text-green-500 hover:text-green-700' : 'text-gray-400 hover:text-amber-600'}`}>
                          {type.archived ? <RotateCcw className="w-3 h-3" /> : <Archive className="w-3 h-3" />}
                        </button>
                      </>
                    )}
                  </div>

                  {isTypeExpanded && (
                    <div className="ml-8 border-t border-gray-100 py-1.5 space-y-1 pr-2">
                      {cats.map(cat => {
                        const topicList = topicsForCat(cat.id);
                        const isEditingCat = editingNode?.kind === 'category' && editingNode.id === cat.id;
                        const isCatExpanded = expandedCategories.has(cat.id);

                        return (
                          <div key={cat.id} className={`rounded-lg border ${cat.archived ? 'border-gray-100 bg-gray-50 opacity-60' : 'border-gray-100 bg-white'}`}>
                            <div className="flex items-center gap-2 px-3 py-2">
                              <button type="button" onClick={() => setExpandedCategories(prev => { const s = new Set(prev); s.has(cat.id) ? s.delete(cat.id) : s.add(cat.id); return s; })} className="text-gray-400 hover:text-gray-600 flex-shrink-0">
                                {isCatExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                              </button>
                              <BookOpen className="w-3 h-3 text-teal-500 flex-shrink-0" />
                              {isEditingCat ? (
                                <div className="flex items-center gap-2 flex-1">
                                  <input className="border border-gray-300 rounded-lg px-2 py-1 text-xs flex-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    value={editForm.name} onChange={e => onEditFormChange(e.target.value)} onKeyDown={e => e.key === 'Enter' && onSaveEdit()} autoFocus />
                                  <button type="button" onClick={onSaveEdit} className="p-1 text-blue-600 hover:text-blue-800 rounded"><Save className="w-3 h-3" /></button>
                                  <button type="button" onClick={onCancelEdit} className="p-1 text-gray-400 hover:text-gray-600 rounded"><X className="w-3 h-3" /></button>
                                </div>
                              ) : (
                                <>
                                  <div className="flex-1 min-w-0">
                                    <span className={`text-xs font-medium ${cat.archived ? 'text-gray-400 line-through' : 'text-gray-700'}`}>{cat.name}</span>
                                    <span className="ml-2 text-xs text-gray-400">{topicList.length} {topicList.length === 1 ? 'topic' : 'topics'}</span>
                                  </div>
                                  <button type="button" onClick={() => onStartEditNode('category', cat)} className="p-1 text-gray-400 hover:text-blue-600 rounded transition-colors"><Pencil className="w-3 h-3" /></button>
                                  <button type="button" onClick={() => onArchive('category', cat.id, cat.archived)} className={`p-1 rounded transition-colors ${cat.archived ? 'text-green-500 hover:text-green-700' : 'text-gray-400 hover:text-amber-600'}`}>
                                    {cat.archived ? <RotateCcw className="w-3 h-3" /> : <Archive className="w-3 h-3" />}
                                  </button>
                                </>
                              )}
                            </div>

                            {isCatExpanded && (
                              <div className="ml-6 border-t border-gray-50 py-1 space-y-0.5">
                                {topicList.map(topic => (
                                  <div key={topic.id} className="flex items-center gap-2 px-2 py-1.5 mx-1 rounded-lg hover:bg-gray-50 group">
                                    <Layers className="w-3 h-3 text-gray-400 flex-shrink-0" />
                                    <span className={`flex-1 text-xs ${topic.archived ? 'text-gray-400 line-through' : 'text-gray-700'}`}>{topic.name}</span>
                                    {topic.training_trackable && (
                                      <span className="text-xs text-teal-600 bg-teal-50 px-1.5 py-0.5 rounded border border-teal-100">Training</span>
                                    )}
                                    {(topic.def_rating_3 || topic.def_rating_4 || topic.def_rating_5) && (
                                      <span className="text-xs text-green-600 bg-green-50 px-1.5 py-0.5 rounded hidden group-hover:inline-block">Definitions set</span>
                                    )}
                                    <div className="hidden group-hover:flex items-center gap-1">
                                      <button type="button" onClick={() => onEditTopicPanel(topic)} className="p-1 text-gray-400 hover:text-blue-600 rounded transition-colors" title="Edit topic / target ratings"><Pencil className="w-3 h-3" /></button>
                                      <button type="button" onClick={() => onArchive('topic', topic.id, topic.archived)} className={`p-1 rounded transition-colors ${topic.archived ? 'text-green-500 hover:text-green-700' : 'text-gray-400 hover:text-amber-600'}`}>
                                        {topic.archived ? <RotateCcw className="w-3 h-3" /> : <Archive className="w-3 h-3" />}
                                      </button>
                                    </div>
                                  </div>
                                ))}
                                <button type="button" onClick={() => onOpenTopicPanel(cat.id)}
                                  className="flex items-center gap-1 mx-1 px-2.5 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                                  <Plus className="w-3 h-3" /> Add Topic to {cat.name}
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}

                      {/* Add category to this type */}
                      {addingCategory === type.id ? (
                        <div className="mx-1 mt-1 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                          <p className="text-xs font-semibold text-blue-700 mb-1.5 flex items-center gap-1"><BookOpen className="w-3 h-3" /> New Category under {type.name}</p>
                          <input className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2"
                            placeholder='e.g. "Payments"' value={categoryForm.name} onChange={e => setCategoryForm(f => ({ ...f, name: e.target.value }))}
                            onKeyDown={e => e.key === 'Enter' && saveCategory(type.id)} autoFocus />
                          <div className="flex gap-2">
                            <button type="button" onClick={() => saveCategory(type.id)} disabled={!categoryForm.name.trim()} className="flex items-center gap-1 px-2.5 py-1 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700 disabled:opacity-50"><Save className="w-3 h-3" /> Save</button>
                            <button type="button" onClick={() => setAddingCategory(null)} className="px-2.5 py-1 bg-gray-100 text-gray-600 text-xs rounded-lg hover:bg-gray-200">Cancel</button>
                          </div>
                        </div>
                      ) : (
                        <button type="button" onClick={() => { setAddingCategory(type.id); setAddingCategoryTop(false); setCategoryForm({ type_id: type.id, name: '' }); }}
                          className="flex items-center gap-1 mx-1 mt-0.5 px-2.5 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                          <Plus className="w-3 h-3" /> Add Category to {type.name}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {visibleTypes.length === 0 && (
              <p className="text-xs text-gray-400 text-center py-4">No types yet. Click <strong>Add Type</strong> above.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function SkillsMatrixAdmin() {
  const { profile } = useAuth();

  const isAdmin = profile?.role === 'admin' || (profile?.admin_type != null && profile.admin_type !== '');

  // ── Tab ──
  const [activeTab, setActiveTab] = useState<Tab>('topics');

  // ── Topics Library ──
  const [types,      setTypes]      = useState<SmType[]>([]);
  const [categories, setCategories] = useState<SmCategory[]>([]);
  const [topics,     setTopics]     = useState<SmTopic[]>([]);
  const [showArchived, setShowArchived] = useState(false);
  const [expandedTypes,      setExpandedTypes]      = useState<Set<string>>(new Set());
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  const [addingType, setAddingType] = useState(false);
  const [typeForm,   setTypeForm]   = useState(blankTypeForm);

  const [addingCategory,    setAddingCategory]    = useState<string | null>(null);
  const [addingCategoryTop, setAddingCategoryTop] = useState(false);
  const [categoryForm,      setCategoryForm]      = useState(blankCategoryForm);

  const [topicPanelOpen, setTopicPanelOpen] = useState(false);
  const [topicForm,      setTopicForm]      = useState(blankTopicForm);
  const [editingTopicId, setEditingTopicId] = useState<string | null>(null);

  const [editingNode, setEditingNode] = useState<{ kind: 'type' | 'category'; id: string } | null>(null);
  const [editForm,    setEditForm]    = useState<Record<string, string>>({});

  // ── Department Matrix ──
  const [matrices,               setMatrices]               = useState<SmMatrix[]>([]);
  const [selectedMatrix,         setSelectedMatrix]         = useState<SmMatrix | null>(null);
  const [showArchivedMatrices,   setShowArchivedMatrices]   = useState(false);
  const [roleTopics,      setRoleTopics]      = useState<SmRoleTopic[]>([]);
  const [jobFamilies,     setJobFamilies]     = useState<JobFamily[]>([]);
  const [departments,     setDepartments]     = useState<string[]>([]);

  // ── New-matrix wizard state ──
  const [wizardMode,      setWizardMode]      = useState(false);
  const [wizardStep,      setWizardStep]      = useState<WizardStep>(1);
  const [wizardDept,      setWizardDept]      = useState('');
  const [wizardMatrixName, setWizardMatrixName] = useState('');
  // Set of topic IDs selected in step 2
  const [wizardTopicIds,  setWizardTopicIds]  = useState<Set<string>>(new Set());
  // Map: topicId -> Set of jobFamilyId (roles assigned to that topic)
  const [wizardTopicRoles, setWizardTopicRoles] = useState<Record<string, Set<string>>>({});
  const [wizardDeptRoles,  setWizardDeptRoles]  = useState<JobFamily[]>([]);
  const [wizardSaving,     setWizardSaving]     = useState(false);
  // Wizard expanded state for types/categories
  const [wizardExpandedTypes,      setWizardExpandedTypes]      = useState<Set<string>>(new Set());
  const [wizardExpandedCategories, setWizardExpandedCategories] = useState<Set<string>>(new Set());

  // ── Edit existing matrix ──
  const [editingMatrix, setEditingMatrix] = useState(false);
  const [editTopicIds,  setEditTopicIds]  = useState<Set<string>>(new Set());
  const [editTopicRoles, setEditTopicRoles] = useState<Record<string, Set<string>>>({});
  const [editSaving,    setEditSaving]    = useState(false);
  const [editExpandedTypes,      setEditExpandedTypes]      = useState<Set<string>>(new Set());
  const [editExpandedCategories, setEditExpandedCategories] = useState<Set<string>>(new Set());

  // ── Training Record ──
  const [trainingMatrices,         setTrainingMatrices]         = useState<SmMatrix[]>([]);
  const [selectedTrainingMatrixId, setSelectedTrainingMatrixId] = useState<string>('');

  // ── Assessment Cycles ──
  const [cycles,         setCycles]         = useState<SmCycle[]>([]);
  const [lockedMatrices, setLockedMatrices] = useState<SmMatrix[]>([]);
  const [addingCycle,    setAddingCycle]    = useState(false);
  const [cycleForm,      setCycleForm]      = useState(blankCycleForm);

  // ── Reset modal ──
  const [showResetModal,  setShowResetModal]  = useState(false);
  const [resetConfirmText, setResetConfirmText] = useState('');
  const [resetting,        setResetting]        = useState(false);
  const [resetResult,      setResetResult]      = useState<{ success: boolean; message: string } | null>(null);

  // ── Shared ──
  const [loading,        setLoading]        = useState(false);
  const [topicsLoading,  setTopicsLoading]  = useState(false);
  const [error,          setError]          = useState<string | null>(null);
  const [success,        setSuccess]        = useState<string | null>(null);

  useEffect(() => {
    if (!isAdmin) return;
    if (activeTab === 'topics')   loadTopicsLibrary();
    if (activeTab === 'matrices') { loadMatrices(); loadDepartments(); loadTopicsLibrary(); }
    if (activeTab === 'training') loadTrainingMatrices();
    if (activeTab === 'cycles')   { loadCycles(); loadLockedMatrices(); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, isAdmin]);

  // ─── Topics Library loaders ────────────────────────────────────────────────

  async function loadTopicsLibrary() {
    // Use topicsLoading so this never blanks out the matrices wizard/edit view
    setTopicsLoading(true);
    setError(null);
    try {
      const [tr, cr, tpr] = await Promise.all([
        supabase.from('sm_types').select('*').order('sort_order'),
        supabase.from('sm_categories').select('*').order('sort_order'),
        supabase.from('sm_topics').select('*').order('sort_order'),
      ]);
      if (tr.error) throw tr.error;
      if (cr.error) throw cr.error;
      if (tpr.error) throw tpr.error;
      setTypes(tr.data ?? []);
      setCategories(cr.data ?? []);
      setTopics(tpr.data ?? []);
    } catch (e: unknown) { setError((e as Error).message); }
    finally { setTopicsLoading(false); }
  }

  async function loadTrainingMatrices() {
    const { data } = await supabase.from('sm_matrices').select('*').eq('is_locked', true).eq('archived', false).order('name');
    setTrainingMatrices(data ?? []);
    if (data && data.length > 0 && !selectedTrainingMatrixId) {
      setSelectedTrainingMatrixId(data[0].id);
    }
  }

  function visibleTypes() { return types.filter(t => showArchived || !t.archived); }
  function categoriesForType(typeId: string) { return categories.filter(c => c.type_id === typeId && (showArchived || !c.archived)); }
  function topicsForCategory(catId: string)  { return topics.filter(t => t.category_id === catId && (showArchived || !t.archived)); }
  function activeTopicsForCategory(catId: string) { return topics.filter(t => t.category_id === catId && !t.archived); }

  // ─── Topics Library CRUD ───────────────────────────────────────────────────

  async function saveType() {
    if (!typeForm.name.trim()) return;
    const maxOrder = types.length > 0 ? Math.max(...types.map(t => t.sort_order)) + 1 : 0;
    const { error: e } = await supabase.from('sm_types').insert({ name: typeForm.name.trim(), sort_order: maxOrder, created_by: profile?.id });
    if (e) { setError(e.message); return; }
    setTypeForm(blankTypeForm); setAddingType(false); loadTopicsLibrary();
  }

  async function saveCategory(typeId: string) {
    if (!categoryForm.name.trim()) return;
    const catsInType = categories.filter(c => c.type_id === typeId);
    const maxOrder = catsInType.length > 0 ? Math.max(...catsInType.map(c => c.sort_order)) + 1 : 0;
    const { error: e } = await supabase.from('sm_categories').insert({ type_id: typeId, name: categoryForm.name.trim(), sort_order: maxOrder });
    if (e) { setError(e.message); return; }
    setCategoryForm(blankCategoryForm); setAddingCategory(null); loadTopicsLibrary();
  }

  async function saveTopic() {
    if (!topicForm.category_id || !topicForm.name.trim()) return;
    const topicsInCat = topics.filter(t => t.category_id === topicForm.category_id);
    const maxOrder = topicsInCat.length > 0 ? Math.max(...topicsInCat.map(t => t.sort_order)) + 1 : 0;
    if (editingTopicId) {
      const { error: e } = await supabase.from('sm_topics').update({
        category_id: topicForm.category_id, name: topicForm.name.trim(),
        training_trackable: topicForm.training_trackable,
        def_rating_3: topicForm.def_rating_3 || null, def_rating_4: topicForm.def_rating_4 || null, def_rating_5: topicForm.def_rating_5 || null,
      }).eq('id', editingTopicId);
      if (e) { setError(e.message); return; }
    } else {
      const { error: e } = await supabase.from('sm_topics').insert({
        category_id: topicForm.category_id, name: topicForm.name.trim(), sort_order: maxOrder,
        training_trackable: topicForm.training_trackable,
        def_rating_3: topicForm.def_rating_3 || null, def_rating_4: topicForm.def_rating_4 || null, def_rating_5: topicForm.def_rating_5 || null,
        created_by: profile?.id,
      });
      if (e) { setError(e.message); return; }
    }
    setTopicForm(blankTopicForm); setTopicPanelOpen(false); setEditingTopicId(null); loadTopicsLibrary();
  }

  function openAddTopicPanel(prefillCategoryId?: string) {
    setEditingTopicId(null);
    const cat = prefillCategoryId ? categories.find(c => c.id === prefillCategoryId) : undefined;
    setTopicForm({ ...blankTopicForm, category_id: prefillCategoryId || '', type_id: cat?.type_id || '' });
    setTopicPanelOpen(true);
  }

  function openEditTopicPanel(topic: SmTopic) {
    const cat = categories.find(c => c.id === topic.category_id);
    setEditingTopicId(topic.id);
    setTopicForm({ type_id: cat?.type_id || '', category_id: topic.category_id, name: topic.name,
      training_trackable: topic.training_trackable ?? false,
      def_rating_3: topic.def_rating_3 || '', def_rating_4: topic.def_rating_4 || '', def_rating_5: topic.def_rating_5 || '' });
    setTopicPanelOpen(true);
  }

  function startEditNode(kind: 'type' | 'category', item: SmType | SmCategory) {
    setEditingNode({ kind, id: item.id }); setEditForm({ name: item.name });
  }

  async function saveEdit() {
    if (!editingNode) return;
    const table = editingNode.kind === 'type' ? 'sm_types' : 'sm_categories';
    const { error: e } = await supabase.from(table).update({ name: editForm.name.trim() }).eq('id', editingNode.id);
    if (e) { setError(e.message); return; }
    setEditingNode(null); loadTopicsLibrary();
  }

  async function toggleArchive(kind: 'type' | 'category' | 'topic', id: string, current: boolean) {
    const table = kind === 'type' ? 'sm_types' : kind === 'category' ? 'sm_categories' : 'sm_topics';
    const { error: e } = await supabase.from(table).update({ archived: !current }).eq('id', id);
    if (e) { setError(e.message); return; }
    const label = kind === 'topic' ? (!current ? 'Topic archived.' : 'Topic restored.') : (!current ? `${kind.charAt(0).toUpperCase() + kind.slice(1)} archived.` : `${kind.charAt(0).toUpperCase() + kind.slice(1)} restored.`);
    setSuccess(label);
    loadTopicsLibrary();
  }

  async function deleteTopic(topicId: string) {
    setError(null);
    // Check for any linked records before allowing delete
    const [rtCheck, trCheck, aiCheck] = await Promise.all([
      supabase.from('sm_role_topics').select('id', { count: 'exact', head: true }).eq('topic_id', topicId),
      supabase.from('sm_training_records').select('id', { count: 'exact', head: true }).eq('topic_id', topicId),
      supabase.from('sm_assessment_items').select('id', { count: 'exact', head: true }).eq('topic_id', topicId),
    ]);
    const hasRecords = (rtCheck.count ?? 0) > 0 || (trCheck.count ?? 0) > 0 || (aiCheck.count ?? 0) > 0;
    if (hasRecords) {
      setError('This Topic has existing records and cannot be deleted. Archive it instead.');
      return;
    }
    if (!confirm('Delete this topic permanently? This cannot be undone.')) return;
    const { error: e } = await supabase.from('sm_topics').delete().eq('id', topicId);
    if (e) { setError(e.message); return; }
    setSuccess('Topic deleted.');
    loadTopicsLibrary();
  }

  // ─── Department Matrix loaders ─────────────────────────────────────────────

  async function loadMatrices() {
    setLoading(true); setError(null);
    try {
      const { data, error: e } = await supabase.from('sm_matrices').select('*').order('created_at', { ascending: false });
      if (e) throw e; setMatrices(data ?? []);
    } catch (e: unknown) { setError((e as Error).message); }
    finally { setLoading(false); }
  }

  async function loadDepartments() {
    const { data } = await supabase.from('profiles').select('department').not('department', 'is', null);
    const depts = [...new Set((data ?? []).map((d: { department: string }) => d.department))].sort();
    setDepartments(depts);
  }

  async function loadRolesForDept(dept: string) {
    const { data } = await supabase.from('job_families').select('*').eq('department', dept).order('sort_order');
    return (data ?? []) as JobFamily[];
  }

  // Load full matrix detail — returns role topics so openEditMode can use fresh data
  const loadMatrixDetail = useCallback(async (matrix: SmMatrix): Promise<SmRoleTopic[]> => {
    setSelectedMatrix(matrix);
    setEditingMatrix(false);
    const roles = await loadRolesForDept(matrix.department);
    setJobFamilies(roles);
    const { data: rtData } = await supabase.from('sm_role_topics').select('*').eq('matrix_id', matrix.id);
    const rt = rtData ?? [];
    setRoleTopics(rt);
    return rt;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function buildEditMapsFromRoleTopics(rt: SmRoleTopic[]) {
    const topicIds = new Set<string>();
    const topicRoles: Record<string, Set<string>> = {};
    rt.forEach(r => {
      if (r.is_applicable) {
        topicIds.add(r.topic_id);
        if (!topicRoles[r.topic_id]) topicRoles[r.topic_id] = new Set();
        topicRoles[r.topic_id].add(r.job_family_id);
      }
    });
    return { topicIds, topicRoles };
  }

  // Accept fresh rt data directly so we never rely on stale roleTopics state
  function openEditMode(rt?: SmRoleTopic[]) {
    const source = rt ?? roleTopics;
    const { topicIds, topicRoles } = buildEditMapsFromRoleTopics(source);
    setEditTopicIds(topicIds);
    setEditTopicRoles(topicRoles);
    setEditExpandedTypes(new Set(types.filter(t => !t.archived).map(t => t.id)));
    setEditExpandedCategories(new Set(categories.filter(c => !c.archived).map(c => c.id)));
    setEditingMatrix(true);
  }

  async function saveMatrixEdit() {
    if (!selectedMatrix) return;
    setEditSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await persistRoleTopics(selectedMatrix.id, editTopicIds, editTopicRoles);
      setSuccess(`Matrix "${selectedMatrix.name}" updated successfully.`);
      setEditingMatrix(false);
      await loadMatrixDetail(selectedMatrix);
    } catch (e: unknown) {
      setError((e as Error).message);
    } finally {
      setEditSaving(false);
    }
  }

  // ─── Wizard helpers ────────────────────────────────────────────────────────

  async function startWizard() {
    setWizardMode(true);
    setWizardStep(1);
    setWizardDept('');
    setWizardMatrixName('');
    setWizardTopicIds(new Set());
    setWizardTopicRoles({});
    setWizardDeptRoles([]);
    setWizardExpandedTypes(new Set());
    setWizardExpandedCategories(new Set());
    setSelectedMatrix(null);
    setEditingMatrix(false);
  }

  async function wizardStep1Next() {
    if (!wizardDept) return;
    const roles = await loadRolesForDept(wizardDept);
    setWizardDeptRoles(roles);
    // Auto-expand all types/categories for easier selection
    setWizardExpandedTypes(new Set(types.filter(t => !t.archived).map(t => t.id)));
    setWizardExpandedCategories(new Set(categories.filter(c => !c.archived).map(c => c.id)));
    setWizardStep(2);
  }

  function toggleWizardTopic(topicId: string) {
    setWizardTopicIds(prev => {
      const s = new Set(prev);
      if (s.has(topicId)) {
        s.delete(topicId);
        // Also remove role assignments for this topic
        setWizardTopicRoles(pr => { const n = { ...pr }; delete n[topicId]; return n; });
      } else {
        s.add(topicId);
        // Default: all roles selected
        setWizardTopicRoles(pr => ({ ...pr, [topicId]: new Set(wizardDeptRoles.map(r => r.id)) }));
      }
      return s;
    });
  }

  function toggleWizardTopicRole(topicId: string, roleId: string) {
    setWizardTopicRoles(prev => {
      const current = new Set(prev[topicId] || []);
      current.has(roleId) ? current.delete(roleId) : current.add(roleId);
      return { ...prev, [topicId]: current };
    });
  }

  // Edit mode equivalents — capture jobFamilies at call time to avoid stale closure
  function toggleEditTopic(topicId: string, currentJobFamilies?: JobFamily[]) {
    const roles = currentJobFamilies ?? jobFamilies;
    setEditTopicIds(prev => {
      const s = new Set(prev);
      if (s.has(topicId)) {
        s.delete(topicId);
        setEditTopicRoles(pr => { const n = { ...pr }; delete n[topicId]; return n; });
      } else {
        s.add(topicId);
        setEditTopicRoles(pr => ({ ...pr, [topicId]: new Set(roles.map(r => r.id)) }));
      }
      return s;
    });
  }

  function toggleEditTopicRole(topicId: string, roleId: string) {
    setEditTopicRoles(prev => {
      const current = new Set(prev[topicId] || []);
      current.has(roleId) ? current.delete(roleId) : current.add(roleId);
      return { ...prev, [topicId]: current };
    });
  }

  // Core persist function: writes sm_role_topics rows for a matrix
  async function persistRoleTopics(
    matrixId: string,
    topicIds: Set<string>,
    topicRoles: Record<string, Set<string>>,
  ) {
    // Delete all existing role_topics for this matrix, then re-insert
    await supabase.from('sm_role_topics').delete().eq('matrix_id', matrixId);
    const rows: { matrix_id: string; job_family_id: string; topic_id: string; is_applicable: boolean }[] = [];
    topicIds.forEach(tid => {
      const roleSet = topicRoles[tid] || new Set();
      roleSet.forEach(rid => {
        rows.push({ matrix_id: matrixId, job_family_id: rid, topic_id: tid, is_applicable: true });
      });
    });
    if (rows.length > 0) {
      const { error: e } = await supabase.from('sm_role_topics').insert(rows);
      if (e) throw e;
    }
  }

  async function saveWizardMatrix() {
    if (!wizardMatrixName.trim() || !wizardDept) return;
    setWizardSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const { data, error: e } = await supabase
        .from('sm_matrices')
        .insert({ name: wizardMatrixName.trim(), department: wizardDept, is_locked: false, created_by: profile?.id })
        .select().single();
      if (e) throw e;
      await persistRoleTopics(data.id, wizardTopicIds, wizardTopicRoles);
      setWizardMode(false);
      setSuccess(`Matrix "${wizardMatrixName.trim()}" saved successfully.`);
      await loadMatrices();
      await loadMatrixDetail(data as SmMatrix);
    } catch (e: unknown) {
      setError((e as Error).message);
    } finally {
      setWizardSaving(false);
    }
  }

  async function lockMatrix(matrixId: string) {
    const { error: e } = await supabase.from('sm_matrices').update({ is_locked: true, locked_at: new Date().toISOString(), locked_by: profile?.id }).eq('id', matrixId);
    if (e) { setError(e.message); return; }
    const { data } = await supabase.from('sm_matrices').select('*').eq('id', matrixId).single();
    if (data) setSelectedMatrix(data as SmMatrix);
    loadMatrices();
  }

  async function unlockMatrix(matrixId: string) {
    const { error: e } = await supabase.from('sm_matrices').update({ is_locked: false, locked_at: null, locked_by: null }).eq('id', matrixId);
    if (e) { setError(e.message); return; }
    const { data } = await supabase.from('sm_matrices').select('*').eq('id', matrixId).single();
    if (data) setSelectedMatrix(data as SmMatrix);
    loadMatrices();
  }

  async function archiveMatrix(matrixId: string, archive: boolean) {
    const { error: e } = await supabase.from('sm_matrices').update({ archived: archive }).eq('id', matrixId);
    if (e) { setError(e.message); return; }
    const { data } = await supabase.from('sm_matrices').select('*').eq('id', matrixId).single();
    if (data) setSelectedMatrix(data as SmMatrix);
    loadMatrices();
  }

  // ─── Assessment Cycles ─────────────────────────────────────────────────────

  async function loadCycles() {
    setLoading(true); setError(null);
    try {
      const { data, error: e } = await supabase.from('sm_assessment_cycles').select('*, sm_matrices(name, department)').order('created_at', { ascending: false });
      if (e) throw e; setCycles(data ?? []);
    } catch (e: unknown) { setError((e as Error).message); }
    finally { setLoading(false); }
  }

  async function loadLockedMatrices() {
    const { data } = await supabase.from('sm_matrices').select('*').eq('is_locked', true).eq('archived', false).order('name');
    setLockedMatrices(data ?? []);
  }

  async function saveCycle() {
    if (!cycleForm.matrix_id || !cycleForm.name.trim()) return;
    const { error: e } = await supabase.from('sm_assessment_cycles').insert({
      matrix_id: cycleForm.matrix_id, name: cycleForm.name.trim(), frequency: cycleForm.frequency,
      due_date: cycleForm.due_date || null, status: 'active', created_by: profile?.id,
    });
    if (e) { setError(e.message); return; }
    setCycleForm(blankCycleForm); setAddingCycle(false); loadCycles();
  }

  async function updateCycleStatus(cycleId: string, status: string) {
    const { error: e } = await supabase.from('sm_assessment_cycles').update({ status }).eq('id', cycleId);
    if (e) { setError(e.message); return; }
    loadCycles();
  }

  // ─── Access denied ─────────────────────────────────────────────────────────

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
          <h2 className="text-lg font-semibold text-gray-800">Access Denied</h2>
          <p className="text-gray-500 mt-1">You need Full Admin or L&D Admin access to manage the Skills Matrix.</p>
        </div>
      </div>
    );
  }

  // ─── Topic Panel ──────────────────────────────────────────────────────────

  function renderTopicPanel() {
    const filteredCats = topicForm.type_id ? categories.filter(c => c.type_id === topicForm.type_id && !c.archived) : [];
    const isValid = topicForm.type_id && topicForm.category_id && topicForm.name.trim();

    return (
      <div className="fixed inset-0 bg-black/40 z-50 flex items-start justify-end p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[95vh] flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-blue-600" />
              <h2 className="text-lg font-semibold text-gray-900">{editingTopicId ? 'Edit Topic' : 'Add New Topic'}</h2>
            </div>
            <button onClick={() => { setTopicPanelOpen(false); setEditingTopicId(null); setTopicForm(blankTopicForm); }} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-1">Type <span className="text-red-500">*</span></label>
              <p className="text-xs text-gray-500 mb-2">e.g. Product Knowledge, Technical Skills, Behavioural Skills</p>
              <select value={topicForm.type_id} onChange={e => setTopicForm(f => ({ ...f, type_id: e.target.value, category_id: '' }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Select a type...</option>
                {types.filter(t => !t.archived).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-1">Category <span className="text-red-500">*</span></label>
              <p className="text-xs text-gray-500 mb-2">e.g. Payments, CRM Systems, Communication</p>
              <select value={topicForm.category_id} onChange={e => setTopicForm(f => ({ ...f, category_id: e.target.value }))}
                disabled={!topicForm.type_id}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-400">
                <option value="">{topicForm.type_id ? 'Select a category...' : 'Select a type first'}</option>
                {filteredCats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-1">Topic Name <span className="text-red-500">*</span></label>
              <p className="text-xs text-gray-500 mb-2">e.g. Embedded Finance, Account Navigation, Stakeholder Management</p>
              <input value={topicForm.name} onChange={e => setTopicForm(f => ({ ...f, name: e.target.value }))}
                disabled={!topicForm.category_id} placeholder="e.g. Embedded Finance"
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-400" />
            </div>

            <div className="border border-teal-200 bg-teal-50 rounded-xl px-4 py-3">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={topicForm.training_trackable}
                  onChange={e => setTopicForm(f => ({ ...f, training_trackable: e.target.checked }))}
                  className="mt-0.5 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                />
                <div>
                  <p className="text-sm font-semibold text-teal-900">Add to Training Record</p>
                  <p className="text-xs text-teal-700 mt-0.5">Track formal training completion for this topic. Employees start at rating 0 (no training) and move to rating 1 when a training date is recorded.</p>
                </div>
              </label>
            </div>

            <div className="border-t border-gray-200 pt-1">
              <p className="text-sm font-semibold text-gray-700 mb-1">Performance Definitions</p>
              <p className="text-xs text-gray-500 mb-4">Describe what each rating level looks like. Shown during assessments to guide ratings.</p>
            </div>

            {[
              { key: 'def_rating_3' as const, label: 'What good looks like', num: '3', hint: 'Consistently meets expectations for this topic.' },
              { key: 'def_rating_4' as const, label: 'What excellent looks like', num: '4', hint: 'Exceeds expectations and demonstrates strong capability.' },
              { key: 'def_rating_5' as const, label: 'Role model / SME', num: '5', hint: 'Recognised expert who coaches others in this area.' },
            ].map(({ key, label, num, hint }) => (
              <div key={key}>
                <label className="block text-sm font-semibold text-gray-800 mb-1">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-green-100 text-green-700 text-xs font-bold flex items-center justify-center">{num}</span>
                    {label}
                  </span>
                </label>
                <p className="text-xs text-gray-500 mb-2">{hint}</p>
                <textarea value={topicForm[key]} onChange={e => setTopicForm(f => ({ ...f, [key]: e.target.value }))}
                  rows={3} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
              </div>
            ))}
          </div>

          <div className="px-6 py-4 border-t border-gray-200 flex gap-3">
            <button onClick={saveTopic} disabled={!isValid}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
              <Save className="w-4 h-4" />{editingTopicId ? 'Save Changes' : 'Add Topic'}
            </button>
            <button onClick={() => { setTopicPanelOpen(false); setEditingTopicId(null); setTopicForm(blankTopicForm); }}
              className="px-4 py-2.5 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors">
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Topics Library tab ───────────────────────────────────────────────────

  function renderTopicsTab() {
    return (
      <div className="p-6">
        {/* Structure banner */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
          <p className="text-sm font-semibold text-blue-800 mb-1">Topics Library structure</p>
          <div className="flex items-center gap-2 text-sm text-blue-700 flex-wrap">
            <span className="flex items-center gap-1 bg-blue-100 px-2.5 py-1 rounded-full font-medium"><Tag className="w-3.5 h-3.5" /> Type</span>
            <span className="text-blue-400">→</span>
            <span className="flex items-center gap-1 bg-blue-100 px-2.5 py-1 rounded-full font-medium"><BookOpen className="w-3.5 h-3.5" /> Category</span>
            <span className="text-blue-400">→</span>
            <span className="flex items-center gap-1 bg-blue-100 px-2.5 py-1 rounded-full font-medium"><Layers className="w-3.5 h-3.5" /> Topic</span>
          </div>
          <p className="text-xs text-blue-600 mt-2">Example: <strong>Product Knowledge</strong> → <strong>Payments</strong> → <strong>Embedded Finance</strong></p>
        </div>

        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-4">
            <h2 className="text-base font-semibold text-gray-800">Topics Library</h2>
            <label className="flex items-center gap-2 text-xs text-gray-500 cursor-pointer">
              <input type="checkbox" checked={showArchived} onChange={e => setShowArchived(e.target.checked)} className="rounded border-gray-300" />
              Show archived
            </label>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => { setAddingType(true); setAddingCategoryTop(false); setTypeForm(blankTypeForm); }}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50 transition-colors">
              <Tag className="w-3.5 h-3.5" /> Add Type
            </button>
            <button onClick={() => { setAddingCategoryTop(true); setAddingType(false); setCategoryForm(blankCategoryForm); }}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50 transition-colors">
              <BookOpen className="w-3.5 h-3.5" /> Add Category
            </button>
            <button onClick={() => openAddTopicPanel()}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors">
              <Plus className="w-4 h-4" /> Add Topic
            </button>
          </div>
        </div>

        {addingType && (
          <div className="mb-5 p-4 bg-white border border-blue-300 rounded-xl shadow-sm">
            <p className="text-sm font-semibold text-gray-800 mb-1 flex items-center gap-1.5"><Tag className="w-4 h-4 text-blue-600" /> New Type</p>
            <p className="text-xs text-gray-500 mb-3">Top-level grouping — e.g. <em>Product Knowledge</em>, <em>Technical Skills</em>, <em>Behavioural Skills</em></p>
            <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 mb-3"
              placeholder='e.g. "Product Knowledge"' value={typeForm.name} onChange={e => setTypeForm(f => ({ ...f, name: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && saveType()} autoFocus />
            <div className="flex gap-2">
              <button onClick={saveType} disabled={!typeForm.name.trim()} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"><Save className="w-3.5 h-3.5" /> Save Type</button>
              <button onClick={() => setAddingType(false)} className="px-3 py-1.5 bg-gray-100 text-gray-600 text-sm rounded-lg hover:bg-gray-200 transition-colors">Cancel</button>
            </div>
          </div>
        )}

        {addingCategoryTop && (
          <div className="mb-5 p-4 bg-white border border-teal-300 rounded-xl shadow-sm">
            <p className="text-sm font-semibold text-gray-800 mb-1 flex items-center gap-1.5"><BookOpen className="w-4 h-4 text-teal-600" /> New Category</p>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Parent Type <span className="text-red-500">*</span></label>
                <select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  value={categoryForm.type_id} onChange={e => setCategoryForm(f => ({ ...f, type_id: e.target.value }))}>
                  <option value="">Select a type...</option>
                  {types.filter(t => !t.archived).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Category Name <span className="text-red-500">*</span></label>
                <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:bg-gray-50"
                  placeholder='e.g. "Payments"' value={categoryForm.name} disabled={!categoryForm.type_id}
                  onChange={e => setCategoryForm(f => ({ ...f, name: e.target.value }))}
                  onKeyDown={e => e.key === 'Enter' && categoryForm.type_id && saveCategory(categoryForm.type_id)} autoFocus />
              </div>
            </div>
            <div className="flex gap-2 mt-3">
              <button onClick={() => { if (categoryForm.type_id) { saveCategory(categoryForm.type_id); setAddingCategoryTop(false); } }}
                disabled={!categoryForm.type_id || !categoryForm.name.trim()}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-600 text-white text-sm rounded-lg hover:bg-teal-700 disabled:opacity-50 transition-colors">
                <Save className="w-3.5 h-3.5" /> Save Category
              </button>
              <button onClick={() => setAddingCategoryTop(false)} className="px-3 py-1.5 bg-gray-100 text-gray-600 text-sm rounded-lg hover:bg-gray-200 transition-colors">Cancel</button>
            </div>
          </div>
        )}

        <div className="space-y-2">
          {visibleTypes().map(type => renderTypeNode(type))}
          {visibleTypes().length === 0 && !loading && (
            <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-300">
              <Tag className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-sm font-medium text-gray-500 mb-1">No types yet</p>
              <p className="text-xs text-gray-400">Click <strong>Add Type</strong> above to get started.</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  function renderTypeNode(type: SmType) {
    const expanded = expandedTypes.has(type.id);
    const cats = categoriesForType(type.id);
    const isEditing = editingNode?.kind === 'type' && editingNode.id === type.id;

    return (
      <div key={type.id} className={`rounded-xl border ${type.archived ? 'border-gray-200 bg-gray-50 opacity-60' : 'border-gray-200 bg-white'}`}>
        <div className="flex items-center gap-2 px-4 py-3">
          <button onClick={() => setExpandedTypes(prev => { const s = new Set(prev); s.has(type.id) ? s.delete(type.id) : s.add(type.id); return s; })} className="text-gray-400 hover:text-gray-600 flex-shrink-0">
            {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
          <Tag className="w-4 h-4 text-blue-500 flex-shrink-0" />
          {isEditing ? (
            <div className="flex items-center gap-2 flex-1">
              <input className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm flex-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} onKeyDown={e => e.key === 'Enter' && saveEdit()} autoFocus />
              <button onClick={saveEdit} className="p-1.5 text-blue-600 hover:text-blue-800 rounded"><Save className="w-4 h-4" /></button>
              <button onClick={() => setEditingNode(null)} className="p-1.5 text-gray-400 hover:text-gray-600 rounded"><X className="w-4 h-4" /></button>
            </div>
          ) : (
            <>
              <div className="flex-1 min-w-0">
                <span className={`text-sm font-semibold ${type.archived ? 'text-gray-400 line-through' : 'text-gray-900'}`}>{type.name}</span>
                <span className="ml-2 text-xs text-gray-400">{cats.length} {cats.length === 1 ? 'category' : 'categories'}</span>
              </div>
              <button onClick={() => startEditNode('type', type)} className="p-1.5 text-gray-400 hover:text-blue-600 rounded transition-colors"><Pencil className="w-3.5 h-3.5" /></button>
              <button onClick={() => toggleArchive('type', type.id, type.archived)} className={`p-1.5 rounded transition-colors ${type.archived ? 'text-green-500 hover:text-green-700' : 'text-gray-400 hover:text-amber-600'}`}>
                {type.archived ? <RotateCcw className="w-3.5 h-3.5" /> : <Archive className="w-3.5 h-3.5" />}
              </button>
            </>
          )}
        </div>

        {expanded && (
          <div className="ml-9 border-t border-gray-100 py-2 space-y-1 pr-2">
            {cats.map(cat => renderCategoryNode(cat))}
            {addingCategory === type.id ? (
              <div className="mx-2 mt-2 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-xs font-semibold text-blue-700 mb-2 flex items-center gap-1"><BookOpen className="w-3.5 h-3.5" /> New Category under {type.name}</p>
                <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2"
                  placeholder='e.g. "Payments"' value={categoryForm.name} onChange={e => setCategoryForm(f => ({ ...f, name: e.target.value }))}
                  onKeyDown={e => e.key === 'Enter' && saveCategory(type.id)} autoFocus />
                <div className="flex gap-2">
                  <button onClick={() => saveCategory(type.id)} disabled={!categoryForm.name.trim()} className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"><Save className="w-3 h-3" /> Save</button>
                  <button onClick={() => setAddingCategory(null)} className="px-3 py-1.5 bg-gray-100 text-gray-600 text-xs rounded-lg hover:bg-gray-200 transition-colors">Cancel</button>
                </div>
              </div>
            ) : (
              <button onClick={() => { setAddingCategory(type.id); setAddingCategoryTop(false); setCategoryForm(blankCategoryForm); }}
                className="flex items-center gap-1.5 mx-2 mt-1 px-3 py-1.5 text-xs text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                <Plus className="w-3 h-3" /> Add Category to {type.name}
              </button>
            )}
          </div>
        )}
      </div>
    );
  }

  function renderCategoryNode(cat: SmCategory) {
    const expanded = expandedCategories.has(cat.id);
    const topicList = topicsForCategory(cat.id);
    const isEditing = editingNode?.kind === 'category' && editingNode.id === cat.id;

    return (
      <div key={cat.id} className={`rounded-lg border mx-1 ${cat.archived ? 'border-gray-100 bg-gray-50 opacity-60' : 'border-gray-100 bg-white'}`}>
        <div className="flex items-center gap-2 px-3 py-2.5">
          <button onClick={() => setExpandedCategories(prev => { const s = new Set(prev); s.has(cat.id) ? s.delete(cat.id) : s.add(cat.id); return s; })} className="text-gray-400 hover:text-gray-600 flex-shrink-0">
            {expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          </button>
          <BookOpen className="w-3.5 h-3.5 text-teal-500 flex-shrink-0" />
          {isEditing ? (
            <div className="flex items-center gap-2 flex-1">
              <input className="border border-gray-300 rounded-lg px-2 py-1 text-sm flex-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} onKeyDown={e => e.key === 'Enter' && saveEdit()} autoFocus />
              <button onClick={saveEdit} className="p-1.5 text-blue-600 hover:text-blue-800 rounded"><Save className="w-3.5 h-3.5" /></button>
              <button onClick={() => setEditingNode(null)} className="p-1.5 text-gray-400 hover:text-gray-600 rounded"><X className="w-3.5 h-3.5" /></button>
            </div>
          ) : (
            <>
              <div className="flex-1 min-w-0">
                <span className={`text-sm font-medium ${cat.archived ? 'text-gray-400 line-through' : 'text-gray-700'}`}>{cat.name}</span>
                <span className="ml-2 text-xs text-gray-400">{topicList.length} {topicList.length === 1 ? 'topic' : 'topics'}</span>
              </div>
              <button onClick={() => startEditNode('category', cat)} className="p-1 text-gray-400 hover:text-blue-600 rounded transition-colors"><Pencil className="w-3 h-3" /></button>
              <button onClick={() => toggleArchive('category', cat.id, cat.archived)} className={`p-1 rounded transition-colors ${cat.archived ? 'text-green-500 hover:text-green-700' : 'text-gray-400 hover:text-amber-600'}`}>
                {cat.archived ? <RotateCcw className="w-3 h-3" /> : <Archive className="w-3 h-3" />}
              </button>
            </>
          )}
        </div>

        {expanded && (
          <div className="ml-7 border-t border-gray-50 py-2 space-y-0.5">
            {topicList.map(topic => (
              <div key={topic.id} className="flex items-center gap-2 px-3 py-1.5 mx-1 rounded-lg hover:bg-gray-50 group">
                <Layers className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                <span className={`flex-1 text-xs ${topic.archived ? 'text-gray-400 line-through' : 'text-gray-700'}`}>{topic.name}</span>
                {topic.training_trackable && (
                  <span className="text-xs text-teal-600 bg-teal-50 px-1.5 py-0.5 rounded border border-teal-100">Training</span>
                )}
                {(topic.def_rating_3 || topic.def_rating_4 || topic.def_rating_5) && (
                  <span className="text-xs text-green-600 bg-green-50 px-1.5 py-0.5 rounded hidden group-hover:inline-block">Definitions set</span>
                )}
                <div className="hidden group-hover:flex items-center gap-1">
                  <button onClick={() => openEditTopicPanel(topic)} className="p-1 text-gray-400 hover:text-blue-600 rounded transition-colors"><Pencil className="w-3 h-3" /></button>
                  <button onClick={() => toggleArchive('topic', topic.id, topic.archived)} className={`p-1 rounded transition-colors ${topic.archived ? 'text-green-500 hover:text-green-700' : 'text-gray-400 hover:text-amber-600'}`}>
                    {topic.archived ? <RotateCcw className="w-3 h-3" /> : <Archive className="w-3 h-3" />}
                  </button>
                  <button onClick={() => deleteTopic(topic.id)} className="p-1 text-gray-400 hover:text-red-600 rounded transition-colors" title="Delete topic">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
            <button onClick={() => openAddTopicPanel(cat.id)} className="flex items-center gap-1.5 mx-2 mt-0.5 px-3 py-1.5 text-xs text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
              <Plus className="w-3 h-3" /> Add Topic to {cat.name}
            </button>
          </div>
        )}
      </div>
    );
  }

  // ─── Topic+Role selection tree (shared between wizard and edit mode) ───────

  function renderTopicRoleTree(opts: {
    roles: JobFamily[];
    selectedTopicIds: Set<string>;
    topicRoles: Record<string, Set<string>>;
    onToggleTopic: (topicId: string) => void;
    onToggleRole: (topicId: string, roleId: string) => void;
    expandedT: Set<string>; setExpandedT: (s: Set<string>) => void;
    expandedC: Set<string>; setExpandedC: (s: Set<string>) => void;
    readonly?: boolean;
  }) {
    const { roles, selectedTopicIds, topicRoles, onToggleTopic, onToggleRole, expandedT, setExpandedT, expandedC, setExpandedC, readonly = false } = opts;

    // Show inline spinner while topics are being loaded
    if (topicsLoading) {
      return (
        <div className="flex items-center justify-center py-10 text-gray-400 gap-2 text-sm">
          <div className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
          Loading topics...
        </div>
      );
    }

    const activeTypes = types.filter(t => !t.archived);

    // Check if there are any active topics at all
    const hasActiveTopics = activeTypes.some(type => {
      const cats = categories.filter(c => c.type_id === type.id && !c.archived);
      return cats.some(c => activeTopicsForCategory(c.id).length > 0);
    });

    if (!hasActiveTopics) {
      return (
        <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-300">
          <Layers className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-500 mb-1">No active Topics found</p>
          <p className="text-xs text-gray-400">Add Topics in <strong>Topics Library</strong> first.</p>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {activeTypes.map(type => {
          const cats = categories.filter(c => c.type_id === type.id && !c.archived);
          const typeTopics = cats.flatMap(c => activeTopicsForCategory(c.id));
          if (typeTopics.length === 0) return null;
          const expandedType = expandedT.has(type.id);

          return (
            <div key={type.id} className="rounded-xl border border-gray-200 bg-white overflow-hidden">
              <button
                type="button"
                className="w-full flex items-center gap-2 px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
                onClick={() => { const s = new Set(expandedT); s.has(type.id) ? s.delete(type.id) : s.add(type.id); setExpandedT(s); }}
              >
                {expandedType ? <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" /> : <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />}
                <Tag className="w-4 h-4 text-blue-500 flex-shrink-0" />
                <span className="font-semibold text-gray-800 text-sm">{type.name}</span>
                <span className="ml-auto text-xs text-gray-400">
                  {typeTopics.filter(t => selectedTopicIds.has(t.id)).length} / {typeTopics.length} selected
                </span>
              </button>

              {expandedType && (
                <div className="divide-y divide-gray-100">
                  {cats.map(cat => {
                    const catTopics = activeTopicsForCategory(cat.id);
                    if (catTopics.length === 0) return null;
                    const expandedCat = expandedC.has(cat.id);

                    return (
                      <div key={cat.id}>
                        <button
                          type="button"
                          className="w-full flex items-center gap-2 px-6 py-2.5 bg-white hover:bg-gray-50 transition-colors text-left"
                          onClick={() => { const s = new Set(expandedC); s.has(cat.id) ? s.delete(cat.id) : s.add(cat.id); setExpandedC(s); }}
                        >
                          {expandedCat ? <ChevronDown className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" /> : <ChevronRight className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />}
                          <BookOpen className="w-3.5 h-3.5 text-teal-500 flex-shrink-0" />
                          <span className="text-sm font-medium text-gray-700">{cat.name}</span>
                          <span className="ml-auto text-xs text-gray-400">
                            {catTopics.filter(t => selectedTopicIds.has(t.id)).length} / {catTopics.length}
                          </span>
                        </button>

                        {expandedCat && (
                          <div className="px-8 py-2 space-y-3 bg-gray-50/40">
                            {catTopics.map(topic => {
                              const isSelected = selectedTopicIds.has(topic.id);
                              const assignedRoles = topicRoles[topic.id] || new Set();

                              return (
                                <div key={topic.id} className={`rounded-lg border transition-colors ${isSelected ? 'border-blue-200 bg-white' : 'border-gray-200 bg-white'}`}>
                                  {/* Topic row */}
                                  <div className="flex items-center gap-3 px-3 py-2.5">
                                    <button
                                      type="button"
                                      onClick={() => !readonly && onToggleTopic(topic.id)}
                                      disabled={readonly}
                                      className={`flex-shrink-0 transition-colors ${isSelected ? 'text-blue-600' : 'text-gray-300 hover:text-gray-400'} disabled:cursor-default`}
                                    >
                                      {isSelected ? <CheckSquare className="w-4.5 h-4.5" /> : <Square className="w-4.5 h-4.5" />}
                                    </button>
                                    <Layers className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                                    <span className={`text-sm font-medium flex-1 ${isSelected ? 'text-gray-900' : 'text-gray-500'}`}>{topic.name}</span>
                                    {isSelected && (
                                      <span className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                                        {assignedRoles.size} / {roles.length} roles
                                      </span>
                                    )}
                                  </div>

                                  {/* Role checkboxes — only shown when topic is selected */}
                                  {isSelected && roles.length > 0 && (
                                    <div className="px-10 pb-3 pt-1 border-t border-blue-100">
                                      <p className="text-xs text-gray-500 mb-2">Which roles does this topic apply to?</p>
                                      <div className="flex flex-wrap gap-2">
                                        {roles.map(role => {
                                          const checked = assignedRoles.has(role.id);
                                          return (
                                            <button
                                              key={role.id}
                                              type="button"
                                              onClick={() => !readonly && onToggleRole(topic.id, role.id)}
                                              disabled={readonly}
                                              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                                                checked
                                                  ? 'bg-blue-600 text-white border-blue-600'
                                                  : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400'
                                              } disabled:cursor-default`}
                                            >
                                              {checked ? <CheckSquare className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
                                              {role.title}
                                            </button>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  // ─── Department Matrix tab ────────────────────────────────────────────────

  function renderMatricesTab() {
    return (
      <div className="flex h-full">
        {/* Sidebar */}
        <div className="w-72 flex-shrink-0 border-r border-gray-200 flex flex-col">
          <div className="p-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-blue-600" /> Department Matrix
            </h2>
            <button onClick={startWizard} className="flex items-center gap-1 px-2.5 py-1.5 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700 transition-colors">
              <Plus className="w-3.5 h-3.5" /> New
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
            {matrices.filter(m => showArchivedMatrices || !m.archived).map(m => (
              <button key={m.id} onClick={() => { setWizardMode(false); setEditingMatrix(false); loadMatrixDetail(m); loadTopicsLibrary(); }}
                className={`w-full text-left px-3 py-2.5 rounded-lg border transition-colors ${
                  selectedMatrix?.id === m.id && !wizardMode ? 'border-blue-300 bg-blue-50' :
                  m.archived ? 'border-gray-200 bg-gray-50 opacity-60 hover:opacity-80' :
                  'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                }`}>
                <div className="flex items-start justify-between gap-1">
                  <span className={`text-sm font-medium leading-tight ${m.archived ? 'text-gray-400 line-through' : 'text-gray-800'}`}>{m.name}</span>
                  {m.archived ? <Archive className="w-3.5 h-3.5 text-gray-400 flex-shrink-0 mt-0.5" /> :
                    m.is_locked ? <Lock className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" /> :
                    <Unlock className="w-3.5 h-3.5 text-gray-400 flex-shrink-0 mt-0.5" />}
                </div>
                <span className="text-xs text-gray-500">{m.department}</span>
              </button>
            ))}
            {matrices.filter(m => !m.archived).length === 0 && !loading && (
              <p className="text-xs text-gray-400 text-center py-8">No matrices yet.</p>
            )}
            <label className="flex items-center gap-2 px-2 py-1 text-xs text-gray-400 cursor-pointer mt-1">
              <input type="checkbox" checked={showArchivedMatrices} onChange={e => setShowArchivedMatrices(e.target.checked)} className="rounded border-gray-300" />
              Show archived
            </label>
          </div>
        </div>

        {/* Main area */}
        <div className="flex-1 overflow-y-auto p-6">
          {wizardMode && renderWizard()}
          {!wizardMode && selectedMatrix && !editingMatrix && renderMatrixDetail()}
          {!wizardMode && selectedMatrix && editingMatrix && renderMatrixEdit()}
          {!wizardMode && !selectedMatrix && (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
              <Building2 className="w-12 h-12 mb-3 opacity-30" />
              <p className="text-sm">Select a matrix or create a new one</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ─── Wizard ───────────────────────────────────────────────────────────────

  function renderWizard() {
    const activeTopicsAll = topics.filter(t => !t.archived);
    const selectedCount = wizardTopicIds.size;

    return (
      <div className="max-w-3xl">
        {/* Wizard header */}
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => setWizardMode(false)} className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Create Department Matrix</h3>
            <p className="text-sm text-gray-500">Select department → choose topics → assign roles → save</p>
          </div>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-8">
          {([
            { step: 1, label: 'Department' },
            { step: 2, label: 'Select Topics' },
            { step: 3, label: 'Assign Roles' },
            { step: 4, label: 'Save' },
          ] as { step: WizardStep; label: string }[]).map(({ step, label }, i) => (
            <div key={step} className="flex items-center gap-2">
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                wizardStep === step ? 'bg-blue-600 text-white' :
                wizardStep > step ? 'bg-green-100 text-green-700' :
                'bg-gray-100 text-gray-400'
              }`}>
                {wizardStep > step ? <CheckCircle2 className="w-3.5 h-3.5" /> : <span>{step}</span>}
                {label}
              </div>
              {i < 3 && <ArrowRight className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" />}
            </div>
          ))}
        </div>

        {/* ── Step 1: Department + name ── */}
        {wizardStep === 1 && (
          <div className="space-y-5 max-w-md">
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-1">Matrix Name <span className="text-red-500">*</span></label>
              <p className="text-xs text-gray-500 mb-2">Give this matrix a clear name.</p>
              <input value={wizardMatrixName} onChange={e => setWizardMatrixName(e.target.value)}
                placeholder='e.g. "Sales Department Skills Matrix 2026"'
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-1">Department <span className="text-red-500">*</span></label>
              <p className="text-xs text-gray-500 mb-2">Roles and assessments will be scoped to this department.</p>
              <select value={wizardDept} onChange={e => setWizardDept(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Select department...</option>
                {departments.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <button onClick={wizardStep1Next} disabled={!wizardDept || !wizardMatrixName.trim()}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
              Next: Select Topics <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* ── Step 2: Select Topics + assign roles ── */}
        {(wizardStep === 2 || wizardStep === 3) && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="text-sm font-semibold text-gray-800">Select Topics &amp; Assign Roles</h4>
                <p className="text-xs text-gray-500 mt-0.5">
                  Check each topic that applies to <strong>{wizardDept}</strong>. For each selected topic, choose which roles it applies to.
                </p>
              </div>
              <span className="text-xs bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-1 rounded-full font-medium">
                {selectedCount} / {activeTopicsAll.length} topics selected
              </span>
            </div>

            {renderTopicRoleTree({
                roles: wizardDeptRoles,
                selectedTopicIds: wizardTopicIds,
                topicRoles: wizardTopicRoles,
                onToggleTopic: toggleWizardTopic,
                onToggleRole: toggleWizardTopicRole,
                expandedT: wizardExpandedTypes,
                setExpandedT: setWizardExpandedTypes,
                expandedC: wizardExpandedCategories,
                setExpandedC: setWizardExpandedCategories,
              })}

            <div className="flex items-center gap-3 mt-6 pt-4 border-t border-gray-200">
              <button onClick={() => setWizardStep(1)} className="flex items-center gap-1.5 px-4 py-2 bg-gray-100 text-gray-700 text-sm rounded-lg hover:bg-gray-200 transition-colors">
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
              <button onClick={() => setWizardStep(4)} disabled={wizardTopicIds.size === 0}
                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                Next: Review &amp; Save <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ── Step 4: Review & Save ── */}
        {wizardStep === 4 && (
          <div className="space-y-5 max-w-lg">
            <div className="bg-green-50 border border-green-200 rounded-xl p-4">
              <p className="text-sm font-semibold text-green-800 mb-3 flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4" /> Ready to save</p>
              <div className="space-y-1.5 text-sm text-green-900">
                <p><span className="font-medium">Matrix:</span> {wizardMatrixName}</p>
                <p><span className="font-medium">Department:</span> {wizardDept}</p>
                <p><span className="font-medium">Topics selected:</span> {wizardTopicIds.size}</p>
                <p><span className="font-medium">Roles in department:</span> {wizardDeptRoles.length}</p>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-800 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>After saving, review the matrix then click <strong>Lock &amp; Activate</strong> when you're ready to use it for assessment cycles.</span>
            </div>

            <div className="flex items-center gap-3">
              <button onClick={() => setWizardStep(2)} className="flex items-center gap-1.5 px-4 py-2 bg-gray-100 text-gray-700 text-sm rounded-lg hover:bg-gray-200 transition-colors">
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
              <button onClick={saveWizardMatrix} disabled={wizardSaving}
                className="flex items-center gap-2 px-6 py-2.5 bg-green-600 text-white text-sm font-semibold rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors">
                {wizardSaving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
                Save Matrix
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ─── Matrix detail (read-only view) ──────────────────────────────────────

  function renderMatrixDetail() {
    if (!selectedMatrix) return null;

    // Build a display map: type → category → topic → assigned roles
    const activeTypes = types.filter(t => !t.archived);
    const usedTopicIds = new Set(roleTopics.filter(r => r.is_applicable).map(r => r.topic_id));

    return (
      <div>
        <div className="flex items-start justify-between mb-5">
          <div>
            <h3 className="text-lg font-semibold text-gray-800">{selectedMatrix.name}</h3>
            <p className="text-sm text-gray-500 mt-0.5">{selectedMatrix.department}</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {selectedMatrix.archived ? (
              <>
                <span className="flex items-center gap-1.5 text-xs text-gray-500 bg-gray-100 border border-gray-200 px-2.5 py-1.5 rounded-full">
                  <Archive className="w-3 h-3" /> Archived
                </span>
                <button onClick={() => archiveMatrix(selectedMatrix.id, false)} className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-700 text-sm rounded-lg hover:bg-gray-200 transition-colors">
                  <RotateCcw className="w-3.5 h-3.5" /> Restore
                </button>
              </>
            ) : (
              <>
                {selectedMatrix.is_locked ? (
                  <>
                    <span className="flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1.5 rounded-full">
                      <Lock className="w-3 h-3" /> Locked
                    </span>
                    <button onClick={() => unlockMatrix(selectedMatrix.id)} className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-700 text-sm rounded-lg hover:bg-gray-200 transition-colors">
                      <Unlock className="w-4 h-4" /> Unlock to Edit
                    </button>
                  </>
                ) : (
                  <>
                    <button onClick={() => openEditMode()} className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50 transition-colors">
                      <Pencil className="w-3.5 h-3.5" /> Edit Matrix
                    </button>
                    <button onClick={() => lockMatrix(selectedMatrix.id)} className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 text-white text-sm rounded-lg hover:bg-amber-600 transition-colors">
                      <Lock className="w-4 h-4" /> Lock &amp; Activate
                    </button>
                  </>
                )}
                <button onClick={() => archiveMatrix(selectedMatrix.id, true)} className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 text-gray-600 text-sm rounded-lg hover:bg-gray-50 hover:text-gray-800 transition-colors">
                  <Archive className="w-3.5 h-3.5" /> Archive
                </button>
              </>
            )}
          </div>
        </div>

        {usedTopicIds.size === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-300">
            <Layers className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500 mb-1">No topics assigned yet</p>
            {!selectedMatrix.is_locked && (
              <button onClick={() => openEditMode()} className="mt-2 flex items-center gap-1.5 mx-auto px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors">
                <Pencil className="w-3.5 h-3.5" /> Edit Matrix to Add Topics
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {activeTypes.map(type => {
              const cats = categories.filter(c => c.type_id === type.id && !c.archived);
              const typeTopics = cats.flatMap(c => topics.filter(t => t.category_id === c.id && !t.archived && usedTopicIds.has(t.id)));
              if (typeTopics.length === 0) return null;
              return (
                <div key={type.id} className="rounded-xl border border-gray-200 overflow-hidden">
                  <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-200 flex items-center gap-2">
                    <Tag className="w-3.5 h-3.5 text-blue-500" />
                    <span className="text-sm font-semibold text-gray-800">{type.name}</span>
                  </div>
                  <div className="divide-y divide-gray-100">
                    {cats.map(cat => {
                      const catTopics = topics.filter(t => t.category_id === cat.id && !t.archived && usedTopicIds.has(t.id));
                      if (catTopics.length === 0) return null;
                      return (
                        <div key={cat.id}>
                          <div className="px-6 py-2 bg-white flex items-center gap-2">
                            <BookOpen className="w-3.5 h-3.5 text-teal-500" />
                            <span className="text-sm font-medium text-gray-700">{cat.name}</span>
                          </div>
                          {catTopics.map(topic => {
                            const assignedRoleIds = roleTopics.filter(r => r.topic_id === topic.id && r.is_applicable).map(r => r.job_family_id);
                            const assignedRoles = jobFamilies.filter(jf => assignedRoleIds.includes(jf.id));
                            return (
                              <div key={topic.id} className="px-8 py-3 border-t border-gray-50">
                                <div className="flex items-start gap-2">
                                  <Layers className="w-3.5 h-3.5 text-gray-400 mt-0.5 flex-shrink-0" />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm text-gray-800 font-medium">{topic.name}</p>
                                    {assignedRoles.length > 0 && (
                                      <div className="flex flex-wrap gap-1 mt-1.5">
                                        {assignedRoles.map(r => (
                                          <span key={r.id} className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded-full border border-blue-100">
                                            <Users className="w-2.5 h-2.5" /> {r.title}
                                          </span>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ─── Matrix edit mode ─────────────────────────────────────────────────────

  function renderMatrixEdit() {
    if (!selectedMatrix) return null;
    const selectedCount = editTopicIds.size;
    const activeTopicsAll = topics.filter(t => !t.archived);

    return (
      <div className="max-w-3xl">
        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <button onClick={() => { setEditingMatrix(false); }} className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Edit: {selectedMatrix.name}</h3>
            <p className="text-sm text-gray-500">{selectedMatrix.department}</p>
          </div>
          <span className="ml-auto text-xs bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-1 rounded-full font-medium">
            {selectedCount} / {activeTopicsAll.length} topics selected
          </span>
        </div>

        {/* ── Inline Library Management ── */}
        <EditModeLibrary
          types={types}
          categories={categories}
          topics={topics}
          onRefresh={loadTopicsLibrary}
          onOpenTopicPanel={openAddTopicPanel}
          onEditTopicPanel={openEditTopicPanel}
          onArchive={toggleArchive}
          editingNode={editingNode}
          editForm={editForm}
          onStartEditNode={startEditNode}
          onSaveEdit={saveEdit}
          onCancelEdit={() => setEditingNode(null)}
          onEditFormChange={(name) => setEditForm(f => ({ ...f, name }))}
        />

        {/* ── Topic & Role Assignment Tree ── */}
        <div className="mt-6">
          <h4 className="text-sm font-semibold text-gray-800 mb-1">Topic & Role Assignment</h4>
          <p className="text-xs text-gray-500 mb-4">Check each topic that applies to <strong>{selectedMatrix.department}</strong>. For each selected topic, choose which roles it applies to.</p>
          {renderTopicRoleTree({
            roles: jobFamilies,
            selectedTopicIds: editTopicIds,
            topicRoles: editTopicRoles,
            onToggleTopic: (topicId) => toggleEditTopic(topicId, jobFamilies),
            onToggleRole: toggleEditTopicRole,
            expandedT: editExpandedTypes,
            setExpandedT: setEditExpandedTypes,
            expandedC: editExpandedCategories,
            setExpandedC: setEditExpandedCategories,
          })}
        </div>

        <div className="flex items-center gap-3 mt-6 pt-4 border-t border-gray-200">
          <button onClick={() => setEditingMatrix(false)} className="px-4 py-2 bg-gray-100 text-gray-700 text-sm rounded-lg hover:bg-gray-200 transition-colors">
            Cancel
          </button>
          <button onClick={saveMatrixEdit} disabled={editSaving}
            className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
            {editSaving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
            Save Changes
          </button>
        </div>
      </div>
    );
  }

  // ─── Training Record tab ─────────────────────────────────────────────────

  function renderTrainingTab() {
    const selectedMatrix = trainingMatrices.find(m => m.id === selectedTrainingMatrixId);
    return (
      <div className="p-6">
        <div className="flex items-center gap-3 mb-2">
          <ClipboardList className="w-5 h-5 text-teal-600" />
          <h2 className="text-base font-semibold text-gray-800">Training Record</h2>
        </div>
        <p className="text-sm text-gray-500 mb-5">
          Track formal training completion for topics marked as training-trackable. Ratings 0–1 are managed here; ratings 2–5 come from skills assessments.
        </p>

        {trainingMatrices.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-300">
            <Lock className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-sm font-medium text-gray-500 mb-1">No locked matrices</p>
            <p className="text-xs text-gray-400">Lock a Department Matrix first, then return here to manage training records.</p>
          </div>
        ) : (
          <>
            <div className="mb-5">
              <label className="block text-xs font-semibold text-gray-600 mb-1">Select Matrix</label>
              <select
                value={selectedTrainingMatrixId}
                onChange={e => setSelectedTrainingMatrixId(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 min-w-64"
              >
                {trainingMatrices.map(m => (
                  <option key={m.id} value={m.id}>{m.name} — {m.department}</option>
                ))}
              </select>
            </div>

            {selectedTrainingMatrixId && selectedMatrix && (
              <TrainingRecord
                matrixId={selectedTrainingMatrixId}
                matrixName={selectedMatrix.name}
                matrixDepartment={selectedMatrix.department}
              />
            )}
          </>
        )}
      </div>
    );
  }

  // ─── Assessment Cycles tab ────────────────────────────────────────────────

  function renderCyclesTab() {
    return (
      <div className="p-6">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-base font-semibold text-gray-800 flex items-center gap-2">
            <RotateCcw className="w-5 h-5 text-blue-600" /> Assessment Cycles
          </h2>
          <button onClick={() => { setAddingCycle(true); setCycleForm(blankCycleForm); }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors">
            <Plus className="w-4 h-4" /> New Cycle
          </button>
        </div>
        <p className="text-sm text-gray-500 mb-5">Assessment cycles trigger employee and manager assessments. A matrix must be locked first.</p>

        {addingCycle && (
          <div className="mb-6 p-5 bg-white border border-blue-300 rounded-xl shadow-sm max-w-lg">
            <h3 className="text-sm font-semibold text-gray-800 mb-4 flex items-center gap-1.5"><RotateCcw className="w-4 h-4 text-blue-600" /> New Assessment Cycle</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Which matrix is this cycle for?</label>
                <p className="text-xs text-gray-400 mb-1.5">Only locked matrices are available.</p>
                <select className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={cycleForm.matrix_id} onChange={e => setCycleForm(f => ({ ...f, matrix_id: e.target.value }))}>
                  <option value="">Select a matrix...</option>
                  {lockedMatrices.map(m => <option key={m.id} value={m.id}>{m.name} — {m.department}</option>)}
                </select>
                {lockedMatrices.length === 0 && (
                  <p className="text-xs text-amber-600 mt-1.5 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> No locked matrices. Go to Department Matrix and lock one first.</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Cycle Name</label>
                <input className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder='e.g. "Q2 2026 Skills Assessment"' value={cycleForm.name} onChange={e => setCycleForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Frequency</label>
                  <select className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={cycleForm.frequency} onChange={e => setCycleForm(f => ({ ...f, frequency: e.target.value }))}>
                    <option value="Monthly">Monthly</option>
                    <option value="Quarterly">Quarterly</option>
                    <option value="Bi-Annual">Bi-Annual</option>
                    <option value="Annual">Annual</option>
                    <option value="Ad Hoc">Ad Hoc</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Due Date <span className="text-gray-400 font-normal">(optional)</span></label>
                  <input type="date" className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={cycleForm.due_date} onChange={e => setCycleForm(f => ({ ...f, due_date: e.target.value }))} />
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <button onClick={saveCycle} disabled={!cycleForm.matrix_id || !cycleForm.name.trim()}
                  className="flex items-center gap-1.5 px-4 py-2.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                  <Save className="w-4 h-4" /> Start Cycle
                </button>
                <button onClick={() => setAddingCycle(false)} className="px-4 py-2.5 bg-gray-100 text-gray-600 text-sm rounded-lg hover:bg-gray-200 transition-colors">Cancel</button>
              </div>
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                {['Matrix', 'Cycle Name', 'Frequency', 'Due Date', 'Status', 'Created', ''].map(h => (
                  <th key={h} className="text-left py-2.5 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {cycles.map(cycle => (
                <tr key={cycle.id} className="hover:bg-gray-50">
                  <td className="py-3 px-3"><p className="text-sm font-medium text-gray-800">{cycle.sm_matrices?.name ?? '—'}</p><p className="text-xs text-gray-500">{cycle.sm_matrices?.department}</p></td>
                  <td className="py-3 px-3 text-gray-800 font-medium">{cycle.name}</td>
                  <td className="py-3 px-3"><span className="inline-block px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">{cycle.frequency}</span></td>
                  <td className="py-3 px-3 text-gray-600 text-sm">{cycle.due_date ? new Date(cycle.due_date).toLocaleDateString() : <span className="text-gray-400">—</span>}</td>
                  <td className="py-3 px-3">
                    <span className={`inline-block px-2 py-0.5 text-xs rounded-full font-medium ${
                      cycle.status === 'active' ? 'bg-green-100 text-green-700' :
                      cycle.status === 'completed' ? 'bg-blue-100 text-blue-700' :
                      cycle.status === 'cancelled' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'
                    }`}>{cycle.status}</span>
                  </td>
                  <td className="py-3 px-3 text-gray-500 text-xs">{new Date(cycle.created_at).toLocaleDateString()}</td>
                  <td className="py-3 px-3">
                    {cycle.status === 'active' && (
                      <div className="flex items-center gap-1">
                        <button onClick={() => updateCycleStatus(cycle.id, 'completed')} className="px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded transition-colors">Complete</button>
                        <button onClick={() => updateCycleStatus(cycle.id, 'cancelled')} className="px-2 py-1 text-xs text-red-500 hover:bg-red-50 rounded transition-colors">Cancel</button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {cycles.length === 0 && !loading && (
            <div className="text-center py-12 bg-gray-50 rounded-xl mt-2">
              <p className="text-sm text-gray-400">No assessment cycles yet. Create one above once your matrix is locked.</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ─── Main render ──────────────────────────────────────────────────────────

  async function handleReset() {
    setResetting(true);
    setResetResult(null);
    try {
      const { data, error: fnError } = await supabase.rpc('reset_skills_matrix_data');
      if (fnError) throw fnError;
      const counts = (data as any)?.deleted ?? {};
      const total = Object.values(counts).reduce((s: number, v) => s + (v as number), 0);
      setResetResult({
        success: true,
        message: `Reset complete. Removed ${counts.matrices ?? 0} matri${(counts.matrices ?? 0) !== 1 ? 'ces' : 'x'}, ${counts.role_topics ?? 0} role topic assignments, ${counts.training_records ?? 0} training records, ${counts.cycles ?? 0} cycles, ${counts.assessments ?? 0} assessments, and ${(counts.mismatches ?? 0) + (counts.escalations ?? 0)} other records (${total} total rows deleted).`,
      });
      setResetConfirmText('');
      // Reload current tab data
      if (activeTab === 'topics')   loadTopicsLibrary();
      if (activeTab === 'matrices') { loadMatrices(); loadDepartments(); loadTopicsLibrary(); }
      if (activeTab === 'training') loadTrainingMatrices();
      if (activeTab === 'cycles')   { loadCycles(); loadLockedMatrices(); }
    } catch (err: any) {
      setResetResult({ success: false, message: err.message ?? 'An unknown error occurred.' });
    } finally {
      setResetting(false);
    }
  }

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'topics',   label: 'Topics Library',   icon: <Layers className="w-4 h-4" /> },
    { key: 'matrices', label: 'Department Matrix', icon: <Building2 className="w-4 h-4" /> },
    { key: 'training', label: 'Training Record',   icon: <ClipboardList className="w-4 h-4" /> },
    { key: 'cycles',   label: 'Assessment Cycles', icon: <RotateCcw className="w-4 h-4" /> },
  ];

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm min-h-[600px] flex flex-col">
      {/* Header with setup order banner */}
      <div className="px-6 pt-5 pb-0 border-b border-gray-200">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-blue-600" />
            <h1 className="text-xl font-semibold text-gray-900">Skills Matrix Setup</h1>
          </div>
          <button
            onClick={() => { setShowResetModal(true); setResetConfirmText(''); setResetResult(null); }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Reset Skills Matrix Test Data
          </button>
        </div>

        {/* Setup order banner */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 mb-4 flex flex-wrap items-center gap-2 text-xs text-slate-600">
          <span className="font-semibold text-slate-700 mr-1">Setup order:</span>
          {[
            'Create Topics',
            'Create Department Matrix',
            'Select Topics',
            'Assign Roles',
            'Save Matrix',
            'Lock Matrix',
            'Set Training Records',
            'Create Assessment Cycle',
          ].map((step, i) => (
            <span key={i} className="flex items-center gap-1">
              {i > 0 && <ArrowRight className="w-3 h-3 text-slate-400" />}
              <span className="bg-white border border-slate-200 px-2 py-0.5 rounded-full">{step}</span>
            </span>
          ))}
        </div>

        <div className="flex gap-0">
          {tabs.map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
                activeTab === tab.key ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}>
              {tab.icon}{tab.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span className="flex-1">{error}</span>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600"><X className="w-4 h-4" /></button>
        </div>
      )}

      {success && (
        <div className="mx-6 mt-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-green-700 text-sm">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span className="flex-1">{success}</span>
          <button onClick={() => setSuccess(null)} className="text-green-400 hover:text-green-600"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Topics tab uses topicsLoading spinner; matrices/training/cycles use their own loading */}
      {activeTab === 'topics' && topicsLoading && (
        <div className="flex justify-center py-10">
          <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {activeTab === 'topics' && !topicsLoading && (
        <div className="flex-1">
          {renderTopicsTab()}
        </div>
      )}

      {activeTab !== 'topics' && loading && (
        <div className="flex justify-center py-10">
          <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {activeTab !== 'topics' && !loading && (
        <div className={`flex-1 ${activeTab === 'matrices' ? 'overflow-hidden flex flex-col' : ''}`}>
          {activeTab === 'matrices' && renderMatricesTab()}
          {activeTab === 'training' && renderTrainingTab()}
          {activeTab === 'cycles'   && renderCyclesTab()}
        </div>
      )}

      {topicPanelOpen && renderTopicPanel()}

      {showResetModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center gap-3 px-6 py-5 border-b border-gray-200">
              <div className="p-2 bg-red-100 rounded-lg">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Reset Skills Matrix Test Data</h2>
                <p className="text-xs text-gray-500 mt-0.5">Full Admin only — this cannot be undone</p>
              </div>
              <button onClick={() => setShowResetModal(false)} className="ml-auto p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              {resetResult ? (
                <div className={`flex items-start gap-3 p-4 rounded-xl border ${resetResult.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                  {resetResult.success
                    ? <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    : <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  }
                  <p className={`text-sm ${resetResult.success ? 'text-green-800' : 'text-red-800'}`}>{resetResult.message}</p>
                </div>
              ) : (
                <>
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800 space-y-1.5">
                    <p className="font-semibold">This will permanently delete:</p>
                    <ul className="list-disc list-inside space-y-0.5 text-amber-700">
                      <li>All Skills Matrices</li>
                      <li>All role &amp; topic assignments</li>
                      <li>All training records</li>
                      <li>All assessment cycles, assessments &amp; items</li>
                      <li>All mismatches &amp; escalations</li>
                    </ul>
                  </div>
                  <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-sm text-green-800 space-y-0.5">
                    <p className="font-semibold">This will NOT delete:</p>
                    <ul className="list-disc list-inside space-y-0.5 text-green-700">
                      <li>Topics Library (types, categories, topics)</li>
                      <li>Users, roles, departments</li>
                      <li>One to One records</li>
                      <li>Career Pathways data</li>
                    </ul>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-800 mb-1.5">
                      Type <span className="font-mono bg-gray-100 px-1 py-0.5 rounded text-red-600">RESET</span> to confirm
                    </label>
                    <input
                      type="text"
                      value={resetConfirmText}
                      onChange={e => setResetConfirmText(e.target.value)}
                      placeholder="Type RESET here..."
                      className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                      autoFocus
                    />
                  </div>
                </>
              )}
            </div>

            <div className="flex gap-3 px-6 py-4 border-t border-gray-200">
              {resetResult?.success ? (
                <button
                  onClick={() => setShowResetModal(false)}
                  className="flex-1 px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium text-sm transition-colors"
                >
                  Done
                </button>
              ) : (
                <>
                  <button
                    onClick={() => setShowResetModal(false)}
                    className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium text-sm transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleReset}
                    disabled={resetConfirmText !== 'RESET' || resetting}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed font-medium text-sm transition-colors"
                  >
                    {resetting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Resetting...
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-4 h-4" />
                        Reset All Data
                      </>
                    )}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
