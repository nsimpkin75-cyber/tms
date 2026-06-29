import React, { useState, useEffect } from 'react';
import { Plus, CreditCard as Edit2, Trash2, Search, ArrowRight, GitBranch, MoveRight, X, Route, Brain, Lock } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface JobFamily {
  id: string;
  title: string;
  department: string;
  pathway: string | null;
  team: string | null;
  level: 'IC1' | 'IC2' | 'IC3' | 'Technical IC1' | 'Technical IC2' | 'Technical IC3' | 'Technical IC4' | 'Technical IC5' | 'Manager M1' | 'Manager M2' | 'Manager M3' | 'Manager M4' | 'Manager M5' | 'Leader' | 'Executive';
  sort_order: number;
  description: string | null;
  reports_to: string | null;
  accountabilities: string[];
  what_great_looks_like: string[];
  skills: string[];
  experience: string[];
  qualifications_training: string[];
  recommended_prev_roles: string[];
  recommended_learning: string[];
  progression_to: string | null;
  alternative_paths: string[];
  how_do_i_get_there: string | null;
  side_step_roles: string[];
  typical_experience_required: string | null;
  internal_progression_criteria: string | null;
  mentoring_suggestions: string | null;
  sera_coaching_context: string | null;
  created_at: string;
}

export default function JobFamiliesManagement() {
  const [jobFamilies, setJobFamilies] = useState<JobFamily[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingJob, setEditingJob] = useState<JobFamily | null>(null);
  const [viewMode, setViewMode] = useState<'department' | 'pathways'>('department');
  const [accountabilityPairs, setAccountabilityPairs] = useState<Array<{ accountability: string; whatGreatLooksLike: string }>>([]);

  const [formData, setFormData] = useState({
    title: '',
    department: '',
    pathway: '',
    team: '',
    level: 'IC2' as JobFamily['level'],
    sort_order: 2,
    reports_to: '',
    description: '',
    skills: '',
    experience: '',
    qualifications_training: '',
    recommended_prev_roles: '',
    recommended_learning: '',
    progression_to: '',
    alternative_paths: '',
    how_do_i_get_there: '',
    sera_coaching_context: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    await Promise.all([fetchJobFamilies(), fetchDepartments()]);
  };

  const fetchDepartments = async () => {
    try {
      const { data } = await supabase
        .from('departments_org')
        .select('name')
        .eq('active', true)
        .order('name', { ascending: true });
      setDepartments((data || []).map(d => d.name));
    } catch (error) {
      console.error('Error fetching departments:', error);
    }
  };

  const getLevelOrder = (level: JobFamily['level']): number => {
    const levelMap: Record<string, number> = {
      'IC1': 1, 'IC2': 2, 'IC3': 3,
      'Technical IC1': 4, 'Technical IC2': 5, 'Technical IC3': 6, 'Technical IC4': 7, 'Technical IC5': 8,
      'Manager M1': 9, 'Manager M2': 10, 'Manager M3': 11, 'Manager M4': 12, 'Manager M5': 13,
      'Leader': 14, 'Executive': 15,
    };
    return levelMap[level] || 0;
  };

  const fetchJobFamilies = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('job_families')
        .select('*')
        .order('department', { ascending: true });
      if (error) throw error;
      setJobFamilies(data || []);
    } catch (error) {
      console.error('Error fetching role profiles:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const splitCSV = (s: string) => s.split(',').map(x => x.trim()).filter(Boolean);
      const accountabilitiesArray = accountabilityPairs.filter(p => p.accountability.trim()).map(p => p.accountability.trim());
      const whatGreatLooksLikeArray = accountabilityPairs.filter(p => p.whatGreatLooksLike.trim()).map(p => p.whatGreatLooksLike.trim());

      const dataToSave = {
        title: formData.title,
        department: formData.department,
        pathway: formData.pathway.trim() || null,
        team: formData.team.trim() || null,
        level: formData.level,
        sort_order: formData.sort_order,
        description: formData.description || null,
        reports_to: formData.reports_to.trim() || null,
        accountabilities: accountabilitiesArray,
        what_great_looks_like: whatGreatLooksLikeArray,
        skills: splitCSV(formData.skills),
        experience: splitCSV(formData.experience),
        qualifications_training: splitCSV(formData.qualifications_training),
        recommended_prev_roles: splitCSV(formData.recommended_prev_roles),
        recommended_learning: splitCSV(formData.recommended_learning),
        progression_to: formData.progression_to || null,
        alternative_paths: splitCSV(formData.alternative_paths),
        how_do_i_get_there: formData.how_do_i_get_there.trim() || null,
        sera_coaching_context: formData.sera_coaching_context.trim() || null,
      };

      if (editingJob) {
        const { error } = await supabase.from('job_families').update(dataToSave).eq('id', editingJob.id);
        if (error) { alert(`Failed to update role profile: ${error.message}`); return; }
      } else {
        const { error } = await supabase.from('job_families').insert([dataToSave]);
        if (error) { alert(`Failed to create role profile: ${error.message}`); return; }
      }

      setShowModal(false);
      setEditingJob(null);
      resetForm();
      fetchJobFamilies();
    } catch (error: any) {
      alert(`Failed to save role profile: ${error?.message || 'Unknown error'}`);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this role profile?')) return;
    try {
      const { error } = await supabase.from('job_families').delete().eq('id', id);
      if (error) throw error;
      fetchJobFamilies();
    } catch (error) {
      alert('Failed to delete role profile');
    }
  };

  const openEditModal = (job: JobFamily) => {
    setEditingJob(job);
    setFormData({
      title: job.title,
      department: job.department,
      pathway: job.pathway || '',
      team: job.team || '',
      level: job.level,
      sort_order: job.sort_order,
      description: job.description || '',
      reports_to: job.reports_to || '',
      skills: job.skills?.join(', ') || '',
      experience: job.experience?.join(', ') || '',
      qualifications_training: job.qualifications_training?.join(', ') || '',
      recommended_prev_roles: job.recommended_prev_roles?.join(', ') || '',
      recommended_learning: job.recommended_learning?.join(', ') || '',
      progression_to: job.progression_to || '',
      alternative_paths: job.alternative_paths?.join(', ') || '',
      how_do_i_get_there: job.how_do_i_get_there || '',
      sera_coaching_context: job.sera_coaching_context || '',
    });

    const maxLength = Math.max(job.accountabilities?.length || 0, job.what_great_looks_like?.length || 0);
    const pairs = [];
    for (let i = 0; i < maxLength; i++) {
      pairs.push({
        accountability: job.accountabilities?.[i] || '',
        whatGreatLooksLike: job.what_great_looks_like?.[i] || '',
      });
    }
    setAccountabilityPairs(pairs.length > 0 ? pairs : [{ accountability: '', whatGreatLooksLike: '' }]);
    setShowModal(true);
  };

  const resetForm = () => {
    setFormData({
      title: '', department: '', pathway: '', team: '', level: 'IC2', sort_order: 2,
      description: '', reports_to: '', skills: '', experience: '',
      qualifications_training: '', recommended_prev_roles: '', recommended_learning: '',
      progression_to: '', alternative_paths: '', how_do_i_get_there: '',
      sera_coaching_context: '',
    });
    setAccountabilityPairs([{ accountability: '', whatGreatLooksLike: '' }]);
  };

  const addAccountabilityPair = () => {
    setAccountabilityPairs([...accountabilityPairs, { accountability: '', whatGreatLooksLike: '' }]);
  };

  const removeAccountabilityPair = (index: number) => {
    if (accountabilityPairs.length > 1) {
      setAccountabilityPairs(accountabilityPairs.filter((_, i) => i !== index));
    }
  };

  const updateAccountabilityPair = (index: number, field: 'accountability' | 'whatGreatLooksLike', value: string) => {
    const updated = [...accountabilityPairs];
    updated[index] = { ...updated[index], [field]: value };
    setAccountabilityPairs(updated);
  };

  const filteredJobs = jobFamilies.filter(job =>
    job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    job.department.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (job.pathway || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (job.team || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    job.level.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const groupedJobs = filteredJobs.reduce((acc, job) => {
    if (!acc[job.department]) acc[job.department] = [];
    acc[job.department].push(job);
    return acc;
  }, {} as Record<string, JobFamily[]>);

  Object.keys(groupedJobs).forEach(dept => {
    groupedJobs[dept].sort((a, b) => {
      if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
      return getLevelOrder(a.level) - getLevelOrder(b.level);
    });
  });

  const findCrossPathConnections = () => {
    const connections: Array<{ from: JobFamily; to: JobFamily; type: 'progression' | 'alternative' }> = [];
    jobFamilies.forEach(fromJob => {
      if (fromJob.progression_to) {
        const toJob = jobFamilies.find(j => j.title === fromJob.progression_to);
        if (toJob && toJob.department !== fromJob.department) {
          connections.push({ from: fromJob, to: toJob, type: 'progression' });
        }
      }
      fromJob.alternative_paths?.forEach(toTitle => {
        const toJob = jobFamilies.find(j => j.title === toTitle);
        if (toJob) connections.push({ from: fromJob, to: toJob, type: 'alternative' });
      });
    });
    return connections;
  };

  const levelColors: Record<JobFamily['level'], string> = {
    'IC1': 'bg-emerald-100 text-emerald-800 border-emerald-300',
    'IC2': 'bg-green-100 text-green-800 border-green-300',
    'IC3': 'bg-teal-100 text-teal-800 border-teal-300',
    'Technical IC1': 'bg-blue-100 text-blue-800 border-blue-300',
    'Technical IC2': 'bg-sky-100 text-sky-800 border-sky-300',
    'Technical IC3': 'bg-cyan-100 text-cyan-800 border-cyan-300',
    'Technical IC4': 'bg-blue-200 text-blue-900 border-blue-400',
    'Technical IC5': 'bg-blue-300 text-blue-900 border-blue-500',
    'Manager M1': 'bg-amber-100 text-amber-800 border-amber-300',
    'Manager M2': 'bg-yellow-100 text-yellow-800 border-yellow-300',
    'Manager M3': 'bg-orange-100 text-orange-800 border-orange-300',
    'Manager M4': 'bg-red-100 text-red-800 border-red-300',
    'Manager M5': 'bg-rose-100 text-rose-800 border-rose-300',
    'Leader': 'bg-slate-200 text-slate-800 border-slate-400',
    'Executive': 'bg-slate-800 text-white border-slate-900',
  };

  const RoleCard = ({ job, showConnections = true }: { job: JobFamily; showConnections?: boolean }) => {
    const nextRole = job.progression_to || '';
    const targetJob = nextRole ? jobFamilies.find(j => j.title === nextRole) : null;
    const crossDeptProgressions = targetJob && targetJob.department !== job.department ? [nextRole] : [];
    const sameDeptProgressions = targetJob && targetJob.department === job.department ? [nextRole] : [];

    return (
      <div className="bg-white rounded-lg p-4 border-2 border-gray-200 hover:border-blue-400 transition-colors shadow-sm">
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-semibold text-gray-900 mb-2 break-words">{job.title}</h4>
            <div className="flex flex-wrap gap-1.5 items-center">
              <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full border ${levelColors[job.level]}`}>
                {job.level}
              </span>
              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{job.department}</span>
              {job.pathway && (
                <span className="text-xs text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-200">{job.pathway}</span>
              )}
              {job.team && (
                <span className="text-xs text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">{job.team}</span>
              )}
              {job.sera_coaching_context && (
                <span className="text-xs text-orange-700 bg-orange-50 px-2 py-0.5 rounded-full border border-orange-200 flex items-center gap-1">
                  <Brain className="w-3 h-3" /> Opal context
                </span>
              )}
            </div>
          </div>
          <div className="flex gap-1 ml-2 shrink-0">
            <button onClick={() => openEditModal(job)} className="text-blue-600 hover:text-blue-900 p-1">
              <Edit2 className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => handleDelete(job.id)} className="text-red-600 hover:text-red-900 p-1">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {job.description && (
          <p className="text-xs text-gray-600 mb-2 line-clamp-2">{job.description}</p>
        )}

        {job.reports_to && (
          <p className="text-xs text-gray-500 mb-2 italic">Reports to: {job.reports_to}</p>
        )}

        {job.skills && job.skills.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {job.skills.slice(0, 3).map((skill, idx) => (
              <span key={idx} className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs border border-blue-200">{skill}</span>
            ))}
            {job.skills.length > 3 && (
              <span className="px-2 py-0.5 text-gray-500 text-xs">+{job.skills.length - 3} more</span>
            )}
          </div>
        )}

        {showConnections && (
          <>
            {sameDeptProgressions.length > 0 && (
              <div className="mt-2 pt-2 border-t border-gray-200">
                <div className="flex items-start gap-1 text-xs">
                  <ArrowRight className="w-3 h-3 text-blue-600 mt-0.5 shrink-0" />
                  <span className="font-medium text-gray-700">Next: </span>
                  <span className="text-gray-600 ml-1">{sameDeptProgressions.join(', ')}</span>
                </div>
              </div>
            )}
            {crossDeptProgressions.length > 0 && (
              <div className="mt-2 pt-2 border-t border-gray-200">
                <div className="flex items-start gap-1 text-xs">
                  <MoveRight className="w-3 h-3 text-teal-600 mt-0.5 shrink-0" />
                  <span className="font-medium text-teal-700">Cross-dept: </span>
                  <span className="text-gray-600 ml-1">
                    {crossDeptProgressions.map(title => {
                      const t = jobFamilies.find(j => j.title === title);
                      return t ? `${title} (${t.department})` : title;
                    }).join(', ')}
                  </span>
                </div>
              </div>
            )}
            {job.alternative_paths && job.alternative_paths.length > 0 && (
              <div className="mt-2 pt-2 border-t border-gray-200">
                <div className="flex items-start gap-1 text-xs">
                  <GitBranch className="w-3 h-3 text-slate-500 mt-0.5 shrink-0" />
                  <span className="font-medium text-slate-600">Lateral moves: </span>
                  <span className="text-gray-600 ml-1">
                    {job.alternative_paths.map(title => {
                      const t = jobFamilies.find(j => j.title === title);
                      return t ? `${title} (${t.department})` : title;
                    }).join(', ')}
                  </span>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    );
  };

  const DepartmentView = () => (
    <div className="space-y-6">
      {Object.entries(groupedJobs).map(([department, jobs]) => (
        <div key={department} className="border border-gray-200 rounded-lg p-6 bg-gray-50">
          <h3 className="text-xl font-bold text-gray-900 mb-4 pb-3 border-b border-gray-300">{department}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {jobs.map(job => <RoleCard key={job.id} job={job} />)}
          </div>
        </div>
      ))}
    </div>
  );

  const PathwaysView = () => {
    const crossConnections = findCrossPathConnections();
    return (
      <div className="space-y-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-semibold text-blue-900 mb-2">Career Path Visualization</h4>
          <p className="text-sm text-blue-800 mb-3">
            This view shows how roles connect across departments. Follow the arrows to see possible career journeys.
          </p>
          <div className="flex flex-wrap gap-4 text-xs">
            <div className="flex items-center gap-1"><ArrowRight className="w-4 h-4 text-blue-600" /><span>Same department</span></div>
            <div className="flex items-center gap-1"><MoveRight className="w-4 h-4 text-teal-600" /><span>Cross-department</span></div>
            <div className="flex items-center gap-1"><GitBranch className="w-4 h-4 text-slate-500" /><span>Lateral move</span></div>
          </div>
        </div>

        {crossConnections.length > 0 && (
          <div className="border border-gray-200 rounded-lg p-6 bg-white">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Cross-Department Career Paths</h3>
            <div className="space-y-4">
              {crossConnections.map((conn, idx) => (
                <div key={idx} className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex-1"><RoleCard job={conn.from} showConnections={false} /></div>
                  <div className="flex flex-col items-center justify-center px-2">
                    {conn.type === 'progression'
                      ? <><MoveRight className="w-8 h-8 text-teal-600" /><span className="text-xs text-teal-600 font-medium mt-1">Progress</span></>
                      : <><GitBranch className="w-8 h-8 text-slate-500" /><span className="text-xs text-slate-500 font-medium mt-1">Lateral</span></>
                    }
                  </div>
                  <div className="flex-1"><RoleCard job={conn.to} showConnections={false} /></div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {Object.entries(groupedJobs).map(([department, jobs]) => (
            <div key={department} className="border border-gray-200 rounded-lg p-6 bg-gray-50">
              <h3 className="text-lg font-bold text-gray-900 mb-4 pb-2 border-b border-gray-300">{department}</h3>
              <div className="space-y-3">
                {jobs.map(job => <RoleCard key={job.id} job={job} />)}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6 gap-4 flex-wrap">
        <div className="relative flex-1 min-w-48 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search role profiles..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setViewMode('department')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${viewMode === 'department' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
          >
            By Department
          </button>
          <button
            onClick={() => setViewMode('pathways')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${viewMode === 'pathways' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
          >
            Career Pathways
          </button>
        </div>

        <button
          onClick={() => { setEditingJob(null); resetForm(); setShowModal(true); }}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
        >
          <Plus className="w-5 h-5" />
          Add Role Profile
        </button>
      </div>

      {loading ? (
        <div className="text-center py-8 text-slate-500">Loading...</div>
      ) : viewMode === 'department' ? (
        <DepartmentView />
      ) : (
        <PathwaysView />
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
          <div className="bg-white rounded-xl p-6 max-w-4xl w-full mx-4 my-8 shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Route className="w-5 h-5 text-blue-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {editingJob ? 'Edit Role Profile' : 'Add Role Profile'}
                </h3>
              </div>
              <button onClick={() => { setShowModal(false); setEditingJob(null); resetForm(); }} className="text-gray-400 hover:text-gray-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="space-y-5 max-h-[70vh] overflow-y-auto pr-1">

                {/* 1. Job Title */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Job Title <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Implementation Consultant"
                    required
                  />
                </div>

                {/* 2–4. Department + Pathway + Team */}
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Department <span className="text-red-500">*</span></label>
                    <select
                      value={formData.department}
                      onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      <option value="">Select department...</option>
                      {departments.map(dept => <option key={dept} value={dept}>{dept}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Pathway</label>
                    <input
                      type="text"
                      value={formData.pathway}
                      onChange={(e) => setFormData({ ...formData, pathway: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., HR, L&D, Talent Acquisition"
                      list="pathway-options"
                    />
                    <datalist id="pathway-options">
                      {[...new Set(jobFamilies.map(j => j.pathway).filter(Boolean))].map(p => (
                        <option key={p!} value={p!} />
                      ))}
                    </datalist>
                    <p className="text-xs text-gray-400 mt-1">Specialist track within the department</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Team</label>
                    <input
                      type="text"
                      value={formData.team}
                      onChange={(e) => setFormData({ ...formData, team: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., Money, Data, Outreach"
                    />
                    <p className="text-xs text-gray-400 mt-1">Sub-group within the department</p>
                  </div>
                </div>

                {/* 5–6. Level + Display Order */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Level <span className="text-red-500">*</span></label>
                    <select
                      value={formData.level}
                      onChange={(e) => {
                        const newLevel = e.target.value as JobFamily['level'];
                        setFormData({ ...formData, level: newLevel, sort_order: getLevelOrder(newLevel) });
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      <optgroup label="Individual Contributor">
                        <option value="IC1">IC1</option>
                        <option value="IC2">IC2</option>
                        <option value="IC3">IC3</option>
                      </optgroup>
                      <optgroup label="Technical Individual Contributor">
                        <option value="Technical IC1">Technical IC1</option>
                        <option value="Technical IC2">Technical IC2</option>
                        <option value="Technical IC3">Technical IC3</option>
                        <option value="Technical IC4">Technical IC4</option>
                        <option value="Technical IC5">Technical IC5</option>
                      </optgroup>
                      <optgroup label="Management">
                        <option value="Manager M1">Manager M1</option>
                        <option value="Manager M2">Manager M2</option>
                        <option value="Manager M3">Manager M3</option>
                        <option value="Manager M4">Manager M4</option>
                        <option value="Manager M5">Manager M5</option>
                      </optgroup>
                      <optgroup label="Leadership">
                        <option value="Leader">Leader</option>
                        <option value="Executive">Executive</option>
                      </optgroup>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Display Order</label>
                    <input
                      type="number"
                      value={formData.sort_order}
                      onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      min="0"
                    />
                    <p className="text-xs text-gray-400 mt-1">Controls progression order within the pathway</p>
                  </div>
                </div>

                {/* 7. Reports To */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Reports To</label>
                  <input
                    type="text"
                    value={formData.reports_to}
                    onChange={(e) => setFormData({ ...formData, reports_to: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Head of Implementation, Engineering Manager"
                    list="reports-to-options"
                  />
                  <datalist id="reports-to-options">
                    {jobFamilies
                      .filter(j => !editingJob || j.id !== editingJob.id)
                      .map(j => <option key={j.id} value={j.title} />)
                    }
                  </datalist>
                </div>

                {/* 8. Role Purpose */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Role Purpose</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    rows={2}
                    placeholder="What is this role here to achieve? What problem does it solve for the organisation?"
                  />
                </div>

                {/* 9. Accountabilities & What Great Looks Like */}
                <div className="border-t border-gray-200 pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Accountabilities &amp; What Great Looks Like</label>
                      <p className="text-xs text-gray-500 mt-0.5">Define key accountabilities and the standard of excellence for each</p>
                    </div>
                    <button
                      type="button"
                      onClick={addAccountabilityPair}
                      className="flex items-center gap-1 bg-green-600 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-green-700"
                    >
                      <Plus className="w-4 h-4" /> Add Row
                    </button>
                  </div>
                  <div className="space-y-3 max-h-80 overflow-y-auto">
                    {accountabilityPairs.map((pair, idx) => (
                      <div key={idx} className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                        <div className="flex items-start gap-2">
                          <span className="text-xs font-semibold text-gray-500 mt-2 w-5 shrink-0">{idx + 1}.</span>
                          <div className="flex-1 grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">Accountability</label>
                              <textarea
                                value={pair.accountability}
                                onChange={(e) => updateAccountabilityPair(idx, 'accountability', e.target.value)}
                                className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 resize-none"
                                rows={2}
                                placeholder="e.g., Deliver projects on time"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">What Great Looks Like</label>
                              <textarea
                                value={pair.whatGreatLooksLike}
                                onChange={(e) => updateAccountabilityPair(idx, 'whatGreatLooksLike', e.target.value)}
                                className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 resize-none"
                                rows={2}
                                placeholder="e.g., Consistently delivers ahead of schedule"
                              />
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeAccountabilityPair(idx)}
                            disabled={accountabilityPairs.length === 1}
                            className="text-red-400 hover:text-red-700 p-1 disabled:opacity-30 mt-1 shrink-0"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 10. Technical Skills */}
                <div className="border-t border-gray-200 pt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Technical Skills (comma-separated)</label>
                  <p className="text-xs text-gray-500 mb-2">Specific technical skills, tools, systems, or methodologies required for this role</p>
                  <textarea
                    value={formData.skills}
                    onChange={(e) => setFormData({ ...formData, skills: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    rows={2}
                    placeholder="e.g., SQL, Salesforce, Project Management, Agile methodology"
                  />
                </div>

                {/* 11. Knowledge */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Knowledge (comma-separated)</label>
                  <p className="text-xs text-gray-500 mb-2">Domain knowledge, subject matter expertise, or understanding required</p>
                  <input
                    type="text"
                    value={formData.experience}
                    onChange={(e) => setFormData({ ...formData, experience: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Employment law, Financial services regulation, SaaS business models"
                  />
                </div>

                {/* 12–13 removed (competencies & KPIs) — fields preserved in DB only */}

                {/* 12. Qualifications */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Qualifications (comma-separated)</label>
                  <input
                    type="text"
                    value={formData.qualifications_training}
                    onChange={(e) => setFormData({ ...formData, qualifications_training: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., CIPD Level 5, Prince2 Foundation, Degree in relevant field"
                  />
                </div>

                {/* 13. Recommended Previous Roles */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Recommended Previous Roles (comma-separated)</label>
                  <p className="text-xs text-gray-500 mb-1">Roles that typically provide good preparation for this position</p>
                  <input
                    type="text"
                    value={formData.recommended_prev_roles}
                    onChange={(e) => setFormData({ ...formData, recommended_prev_roles: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Junior Consultant, Customer Support Specialist, Graduate Analyst"
                  />
                </div>

                {/* 14. Recommended Learning */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Recommended Learning (comma-separated)</label>
                  <input
                    type="text"
                    value={formData.recommended_learning}
                    onChange={(e) => setFormData({ ...formData, recommended_learning: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., LinkedIn Learning: Project Management, Internal mentoring programme"
                  />
                </div>

                {/* 15. Progression To */}
                <div className="border-t border-gray-200 pt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Progression To (Next Role)</label>
                  <input
                    type="text"
                    value={formData.progression_to}
                    onChange={(e) => setFormData({ ...formData, progression_to: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Senior Consultant"
                    list="progression-to-options"
                  />
                  <datalist id="progression-to-options">
                    {jobFamilies
                      .filter(j => !editingJob || j.id !== editingJob.id)
                      .map(j => <option key={j.id} value={j.title} />)
                    }
                  </datalist>
                </div>

                {/* 16. Alternative Roles Based On This Skill Set */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Alternative Roles Based On This Skill Set (comma-separated)</label>
                  <p className="text-xs text-gray-500 mb-1">Roles someone with this profile could also move into (lateral / cross-functional)</p>
                  <input
                    type="text"
                    value={formData.alternative_paths}
                    onChange={(e) => setFormData({ ...formData, alternative_paths: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Customer Success Manager, Junior Product Owner"
                  />
                </div>

                {/* How Do I Get There — progression guidance */}
                <div className="border-t border-gray-200 pt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">How Do I Get There</label>
                  <p className="text-xs text-gray-500 mb-2">
                    Actions, learning, experience, or preparation an employee can take to progress into this role.
                    Shown to employees in Explore Careers and used by Opal for coaching recommendations.
                  </p>
                  <textarea
                    value={formData.how_do_i_get_there}
                    onChange={(e) => setFormData({ ...formData, how_do_i_get_there: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    rows={4}
                    placeholder="e.g., Complete the Advanced Project Management certification, shadow a Senior Consultant on at least 2 client engagements, lead a small internal project, demonstrate stakeholder management in current role..."
                  />
                </div>

                {/* Opal Private Coaching Section */}
                <div className="border-t-2 border-orange-200 pt-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="p-1.5 bg-orange-100 rounded">
                      <Brain className="w-4 h-4 text-orange-600" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                        Opal Coaching Context
                        <span className="flex items-center gap-1 text-xs font-normal text-orange-700 bg-orange-50 border border-orange-200 px-2 py-0.5 rounded-full">
                          <Lock className="w-3 h-3" /> Internal only — not visible to employees
                        </span>
                      </h4>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Richer context for Opal to use when career coaching, recommending pathways, and guiding progression conversations.
                      </p>
                    </div>
                  </div>
                  <textarea
                    value={formData.sera_coaching_context}
                    onChange={(e) => setFormData({ ...formData, sera_coaching_context: e.target.value })}
                    className="w-full px-3 py-2 border border-orange-200 rounded-lg focus:ring-2 focus:ring-orange-400 bg-orange-50/30"
                    rows={5}
                    placeholder="Describe the ideal person for this role from a coaching perspective. Include:&#10;- Behaviours commonly seen in high performers&#10;- Mindset and working style traits&#10;- Communication style&#10;- Strengths that typically succeed here&#10;- Common development gaps for people transitioning into this role&#10;- Transition advice&#10;- Coaching considerations"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6 pt-4 border-t border-gray-200">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white py-2.5 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  {editingJob ? 'Update Role Profile' : 'Create Role Profile'}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowModal(false); setEditingJob(null); resetForm(); }}
                  className="flex-1 bg-gray-100 text-gray-800 py-2.5 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
