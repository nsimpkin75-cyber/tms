import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Plus, Trash2, Save, X, CreditCard as Edit2 } from 'lucide-react';

interface SkillType {
  id: string;
  name: string;
  sort_order: number;
}

interface SkillCategory {
  id: string;
  name: string;
  description?: string;
}

interface Skill {
  id: string;
  name: string;
  skill_type_id: string;
  skill_category_id: string;
  definition: string;
  skill_type?: { name: string };
  skill_category?: { name: string };
}

interface Department {
  id: string;
  name: string;
}

interface JobTitle {
  id: string;
  title: string;
  department_id: string;
}

interface Matrix {
  id: string;
  name: string;
  department_id: string;
  job_title_ids: string[];
  description?: string;
  created_at: string;
}

interface AssignedEmployee {
  id: string;
  full_name: string;
  job_title: string;
  ratings: { [skillId: string]: { rating_value: number; rating_label: string } };
}

const RATING_OPTIONS = [
  { value: 0, label: 'Not Trained' },
  { value: 1, label: 'Trained' },
  { value: 2, label: 'Some Development Needs' },
  { value: 3, label: 'Competent' },
  { value: 4, label: 'Role Model' }
];

export default function SkillsMatrixBuilder() {
  const [activeTab, setActiveTab] = useState<'create' | 'view' | 'manage'>('create');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [skillTypes, setSkillTypes] = useState<SkillType[]>([]);
  const [skillCategories, setSkillCategories] = useState<SkillCategory[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [jobTitles, setJobTitles] = useState<JobTitle[]>([]);
  const [allSkills, setAllSkills] = useState<Skill[]>([]);
  const [matrices, setMatrices] = useState<Matrix[]>([]);

  const [matrixName, setMatrixName] = useState('');
  const [matrixDescription, setMatrixDescription] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [selectedJobTitles, setSelectedJobTitles] = useState<string[]>([]);

  const [newSkillTypeName, setNewSkillTypeName] = useState('');
  const [editingSkillType, setEditingSkillType] = useState<SkillType | null>(null);

  const [newSkillCategoryName, setNewSkillCategoryName] = useState('');
  const [newSkillCategoryDescription, setNewSkillCategoryDescription] = useState('');
  const [editingSkillCategory, setEditingSkillCategory] = useState<SkillCategory | null>(null);

  const [newSkillName, setNewSkillName] = useState('');
  const [newSkillType, setNewSkillType] = useState('');
  const [newSkillCategory, setNewSkillCategory] = useState('');
  const [newSkillDefinition, setNewSkillDefinition] = useState('');
  const [editingSkill, setEditingSkill] = useState<Skill | null>(null);

  const [selectedMatrix, setSelectedMatrix] = useState<string | null>(null);
  const [assignedEmployees, setAssignedEmployees] = useState<AssignedEmployee[]>([]);
  const [matrixSkills, setMatrixSkills] = useState<Skill[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedMatrix) {
      loadMatrixDetails(selectedMatrix);
    }
  }, [selectedMatrix]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [typesRes, categoriesRes, deptsRes, titlesRes, skillsRes, matricesRes] = await Promise.all([
        supabase.from('skill_types').select('*').order('sort_order'),
        supabase.from('skill_categories').select('*').eq('is_active', true).order('name'),
        supabase.from('departments_org').select('id, name').eq('active', true).order('name'),
        supabase.from('job_titles_org').select('id, title, department_id').eq('active', true).order('title'),
        supabase.from('skills_master').select('*, skill_type:skill_types(name), skill_category:skill_categories(name)').eq('is_active', true).order('name'),
        supabase.from('skills_matrices').select('*').eq('is_active', true).order('created_at', { ascending: false })
      ]);

      if (typesRes.data) setSkillTypes(typesRes.data);
      if (categoriesRes.data) setSkillCategories(categoriesRes.data);
      if (deptsRes.data) setDepartments(deptsRes.data);
      if (titlesRes.data) setJobTitles(titlesRes.data);
      if (skillsRes.data) setAllSkills(skillsRes.data);
      if (matricesRes.data) setMatrices(matricesRes.data);
    } catch (err) {
      console.error('Error loading data:', err);
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const loadMatrixDetails = async (matrixId: string) => {
    setLoading(true);
    try {
      const { data: matrixData } = await supabase
        .from('skills_matrices')
        .select('*')
        .eq('id', matrixId)
        .single();

      if (!matrixData) return;

      const { data: matrixSkillsData } = await supabase
        .from('matrix_skills')
        .select('skill_id, skills_master(*)')
        .eq('matrix_id', matrixId)
        .order('sort_order');

      if (matrixSkillsData) {
        setMatrixSkills(matrixSkillsData.map(ms => ms.skills_master).filter(Boolean));
      }

      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, full_name, job_title_id, job_titles_org(title)')
        .in('job_title_id', matrixData.job_title_ids);

      if (profilesData) {
        const employeeIds = profilesData.map(p => p.id);
        const { data: ratingsData } = await supabase
          .from('skill_ratings')
          .select('*')
          .eq('matrix_id', matrixId)
          .in('employee_id', employeeIds);

        const employees: AssignedEmployee[] = profilesData.map(profile => {
          const ratings: { [skillId: string]: { rating_value: number; rating_label: string } } = {};
          ratingsData?.filter(r => r.employee_id === profile.id).forEach(r => {
            ratings[r.skill_id] = {
              rating_value: r.rating_value,
              rating_label: r.rating_label
            };
          });
          return {
            id: profile.id,
            full_name: profile.full_name,
            job_title: (profile.job_titles_org as any)?.title || 'Unknown',
            ratings
          };
        });

        setAssignedEmployees(employees);
      }
    } catch (err) {
      console.error('Error loading matrix details:', err);
      setError('Failed to load matrix details');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateMatrix = async () => {
    if (!matrixName || !selectedDepartment || selectedJobTitles.length === 0) {
      setError('Please fill in Matrix Name, Department, and select at least one Job Title');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: matrixData, error: matrixError } = await supabase
        .from('skills_matrices')
        .insert({
          name: matrixName,
          department_id: selectedDepartment,
          job_title_ids: selectedJobTitles,
          description: matrixDescription,
          created_by: user.id
        })
        .select()
        .single();

      if (matrixError) throw matrixError;

      const matrixSkillsToInsert = allSkills.map((skill, index) => ({
        matrix_id: matrixData.id,
        skill_id: skill.id,
        is_required: false,
        sort_order: index
      }));

      if (matrixSkillsToInsert.length > 0) {
        const { error: skillsError } = await supabase
          .from('matrix_skills')
          .insert(matrixSkillsToInsert);

        if (skillsError) throw skillsError;
      }

      const { data: employeesData } = await supabase
        .from('profiles')
        .select('id')
        .in('job_title_id', selectedJobTitles);

      if (employeesData && employeesData.length > 0) {
        const assignments = employeesData.map(emp => ({
          matrix_id: matrixData.id,
          employee_id: emp.id
        }));

        await supabase.from('matrix_assignments').insert(assignments);
      }

      setMatrixName('');
      setMatrixDescription('');
      setSelectedDepartment('');
      setSelectedJobTitles([]);

      await loadData();
      setActiveTab('view');
      alert('Skills matrix created successfully!');
    } catch (err) {
      console.error('Error creating matrix:', err);
      setError('Failed to create skills matrix');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSkillType = async () => {
    if (!newSkillTypeName) {
      setError('Please enter a skill type name');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (editingSkillType) {
        const { error } = await supabase
          .from('skill_types')
          .update({ name: newSkillTypeName })
          .eq('id', editingSkillType.id);

        if (error) throw error;
      } else {
        const maxOrder = Math.max(...skillTypes.map(st => st.sort_order), 0);
        const { error } = await supabase
          .from('skill_types')
          .insert({ name: newSkillTypeName, sort_order: maxOrder + 1 });

        if (error) throw error;
      }

      setNewSkillTypeName('');
      setEditingSkillType(null);
      await loadData();
    } catch (err) {
      console.error('Error saving skill type:', err);
      setError('Failed to save skill type');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSkillType = async (id: string) => {
    if (!confirm('Are you sure you want to delete this skill type?')) return;

    setLoading(true);
    try {
      const { error } = await supabase.from('skill_types').delete().eq('id', id);
      if (error) throw error;
      await loadData();
    } catch (err) {
      console.error('Error deleting skill type:', err);
      setError('Failed to delete skill type');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSkillCategory = async () => {
    if (!newSkillCategoryName) {
      setError('Please enter a category name');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (editingSkillCategory) {
        const { error } = await supabase
          .from('skill_categories')
          .update({
            name: newSkillCategoryName,
            description: newSkillCategoryDescription
          })
          .eq('id', editingSkillCategory.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('skill_categories')
          .insert({
            name: newSkillCategoryName,
            description: newSkillCategoryDescription
          });

        if (error) throw error;
      }

      setNewSkillCategoryName('');
      setNewSkillCategoryDescription('');
      setEditingSkillCategory(null);
      await loadData();
    } catch (err) {
      console.error('Error saving category:', err);
      setError('Failed to save category');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSkillCategory = async (id: string) => {
    if (!confirm('Are you sure you want to delete this category?')) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('skill_categories')
        .update({ is_active: false })
        .eq('id', id);
      if (error) throw error;
      await loadData();
    } catch (err) {
      console.error('Error deleting category:', err);
      setError('Failed to delete category');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSkill = async () => {
    if (!newSkillName || !newSkillType || !newSkillCategory || !newSkillDefinition) {
      setError('Please fill in all skill fields');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (editingSkill) {
        const { error } = await supabase
          .from('skills_master')
          .update({
            name: newSkillName,
            skill_type_id: newSkillType,
            skill_category_id: newSkillCategory,
            definition: newSkillDefinition
          })
          .eq('id', editingSkill.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('skills_master')
          .insert({
            name: newSkillName,
            skill_type_id: newSkillType,
            skill_category_id: newSkillCategory,
            definition: newSkillDefinition
          });

        if (error) throw error;
      }

      setNewSkillName('');
      setNewSkillType('');
      setNewSkillCategory('');
      setNewSkillDefinition('');
      setEditingSkill(null);
      await loadData();
    } catch (err) {
      console.error('Error saving skill:', err);
      setError('Failed to save skill');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSkill = async (id: string) => {
    if (!confirm('Are you sure you want to delete this skill?')) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('skills_master')
        .update({ is_active: false })
        .eq('id', id);
      if (error) throw error;
      await loadData();
    } catch (err) {
      console.error('Error deleting skill:', err);
      setError('Failed to delete skill');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateRating = async (employeeId: string, skillId: string, ratingValue: number) => {
    if (!selectedMatrix) return;

    const ratingOption = RATING_OPTIONS.find(r => r.value === ratingValue);
    if (!ratingOption) return;

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('skill_ratings')
        .upsert({
          matrix_id: selectedMatrix,
          employee_id: employeeId,
          skill_id: skillId,
          rating_value: ratingValue,
          rating_label: ratingOption.label,
          rated_by: user.id,
          rated_at: new Date().toISOString()
        }, {
          onConflict: 'matrix_id,employee_id,skill_id'
        });

      if (error) throw error;

      await loadMatrixDetails(selectedMatrix);
    } catch (err) {
      console.error('Error updating rating:', err);
      setError('Failed to update rating');
    } finally {
      setLoading(false);
    }
  };

  const filteredJobTitles = selectedDepartment
    ? jobTitles.filter(jt => jt.department_id === selectedDepartment)
    : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Skills Matrix</h2>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('create')}
            className={`${
              activeTab === 'create'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            Create Matrix
          </button>
          <button
            onClick={() => setActiveTab('view')}
            className={`${
              activeTab === 'view'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            View Matrices
          </button>
          <button
            onClick={() => setActiveTab('manage')}
            className={`${
              activeTab === 'manage'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            Manage Skills
          </button>
        </nav>
      </div>

      {activeTab === 'create' && (
        <div className="bg-white shadow rounded-lg p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Matrix Name *
            </label>
            <input
              type="text"
              value={matrixName}
              onChange={(e) => setMatrixName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="e.g., Sales Team Skills Matrix Q1 2024"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={matrixDescription}
              onChange={(e) => setMatrixDescription(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="Optional description..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Department *
            </label>
            <select
              value={selectedDepartment}
              onChange={(e) => {
                setSelectedDepartment(e.target.value);
                setSelectedJobTitles([]);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="">Select Department</option>
              {departments.map(dept => (
                <option key={dept.id} value={dept.id}>{dept.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Job Titles * (Select multiple)
            </label>
            <div className="border border-gray-300 rounded-md p-3 max-h-48 overflow-y-auto">
              {!selectedDepartment ? (
                <p className="text-gray-500 text-sm">Select a department first</p>
              ) : filteredJobTitles.length === 0 ? (
                <p className="text-gray-500 text-sm">No job titles available for this department</p>
              ) : (
                filteredJobTitles.map(title => (
                  <label key={title.id} className="flex items-center space-x-2 py-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedJobTitles.includes(title.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedJobTitles([...selectedJobTitles, title.id]);
                        } else {
                          setSelectedJobTitles(selectedJobTitles.filter(id => id !== title.id));
                        }
                      }}
                      className="rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500 cursor-pointer h-4 w-4"
                    />
                    <span className="text-sm">{title.title}</span>
                  </label>
                ))
              )}
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
            <p className="text-sm text-blue-800">
              When you create this matrix, all existing skills will be added automatically.
              You can rate employees for each skill in the View Matrices tab.
            </p>
          </div>

          <div className="flex justify-end space-x-3">
            <button
              onClick={() => {
                setMatrixName('');
                setMatrixDescription('');
                setSelectedDepartment('');
                setSelectedJobTitles([]);
              }}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Clear
            </button>
            <button
              onClick={handleCreateMatrix}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
            >
              <Save className="h-5 w-5 inline mr-2" />
              Create Matrix
            </button>
          </div>
        </div>
      )}

      {activeTab === 'view' && (
        <div className="space-y-6">
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Existing Matrices</h3>
            {matrices.length === 0 ? (
              <p className="text-gray-500">No matrices created yet</p>
            ) : (
              <div className="space-y-3">
                {matrices.map(matrix => (
                  <div
                    key={matrix.id}
                    className={`border rounded-lg p-4 cursor-pointer transition ${
                      selectedMatrix === matrix.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setSelectedMatrix(matrix.id)}
                  >
                    <div className="font-medium text-gray-900">{matrix.name}</div>
                    {matrix.description && (
                      <div className="text-sm text-gray-600 mt-1">{matrix.description}</div>
                    )}
                    <div className="text-sm text-gray-500 mt-2">
                      Created: {new Date(matrix.created_at).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {selectedMatrix && matrixSkills.length > 0 && assignedEmployees.length > 0 && (
            <div className="bg-white shadow rounded-lg p-6 overflow-x-auto">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Skills Assessment</h3>
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="px-4 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase sticky left-0">
                      Employee
                    </th>
                    <th className="px-4 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase sticky left-0" style={{ left: '200px' }}>
                      Job Title
                    </th>
                    {matrixSkills.map(skill => (
                      <th key={skill.id} className="px-4 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase min-w-[200px]">
                        <div className="font-semibold">{skill.name}</div>
                        <div className="text-xs font-normal text-gray-400 mt-1">{skill.definition}</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {assignedEmployees.map(employee => (
                    <tr key={employee.id}>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 sticky left-0 bg-white">
                        {employee.full_name}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 sticky bg-white" style={{ left: '200px' }}>
                        {employee.job_title}
                      </td>
                      {matrixSkills.map(skill => {
                        const rating = employee.ratings[skill.id];
                        return (
                          <td key={skill.id} className="px-4 py-3 whitespace-nowrap">
                            <select
                              value={rating?.rating_value ?? ''}
                              onChange={(e) => handleUpdateRating(employee.id, skill.id, parseInt(e.target.value))}
                              className="text-sm border border-gray-300 rounded px-2 py-1 w-full"
                            >
                              <option value="">Not Rated</option>
                              {RATING_OPTIONS.map(option => (
                                <option key={option.value} value={option.value}>
                                  {option.value} - {option.label}
                                </option>
                              ))}
                            </select>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {selectedMatrix && assignedEmployees.length === 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
              <p className="text-sm text-yellow-800">
                No employees found with the selected job titles. Please ensure employees have their job titles assigned.
              </p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'manage' && (
        <div className="space-y-6">
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              {editingSkillType ? 'Edit' : 'Add'} Skill Type
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Skill Type Name *</label>
                <input
                  type="text"
                  value={newSkillTypeName}
                  onChange={(e) => setNewSkillTypeName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="e.g., Product Knowledge, Technical Skills"
                />
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={handleSaveSkillType}
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
                >
                  {editingSkillType ? <><Edit2 className="h-5 w-5 inline mr-2" />Update</> : <><Plus className="h-5 w-5 inline mr-2" />Add</>} Skill Type
                </button>
                {editingSkillType && (
                  <button
                    onClick={() => {
                      setEditingSkillType(null);
                      setNewSkillTypeName('');
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>

            <div className="mt-6">
              <h4 className="text-sm font-medium text-gray-700 mb-3">Existing Skill Types</h4>
              <div className="space-y-2">
                {skillTypes.map(type => (
                  <div key={type.id} className="flex items-center justify-between border border-gray-200 rounded-lg p-3">
                    <span className="text-sm text-gray-900">{type.name}</span>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => {
                          setEditingSkillType(type);
                          setNewSkillTypeName(type.name);
                        }}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteSkillType(type.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              {editingSkillCategory ? 'Edit' : 'Add'} Skill Category
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Category Name *</label>
                <input
                  type="text"
                  value={newSkillCategoryName}
                  onChange={(e) => setNewSkillCategoryName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="e.g., Salesforce, Payments"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea
                  value={newSkillCategoryDescription}
                  onChange={(e) => setNewSkillCategoryDescription(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="Optional description..."
                />
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={handleSaveSkillCategory}
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
                >
                  {editingSkillCategory ? <><Edit2 className="h-5 w-5 inline mr-2" />Update</> : <><Plus className="h-5 w-5 inline mr-2" />Add</>} Category
                </button>
                {editingSkillCategory && (
                  <button
                    onClick={() => {
                      setEditingSkillCategory(null);
                      setNewSkillCategoryName('');
                      setNewSkillCategoryDescription('');
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>

            <div className="mt-6">
              <h4 className="text-sm font-medium text-gray-700 mb-3">Existing Categories</h4>
              <div className="space-y-2">
                {skillCategories.map(category => (
                  <div key={category.id} className="flex items-center justify-between border border-gray-200 rounded-lg p-3">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{category.name}</div>
                      {category.description && (
                        <div className="text-xs text-gray-600 mt-1">{category.description}</div>
                      )}
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => {
                          setEditingSkillCategory(category);
                          setNewSkillCategoryName(category.name);
                          setNewSkillCategoryDescription(category.description || '');
                        }}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteSkillCategory(category.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              {editingSkill ? 'Edit' : 'Add'} Skill
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Skill Name *</label>
                <input
                  type="text"
                  value={newSkillName}
                  onChange={(e) => setNewSkillName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="e.g., Customer Relationship Management"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Skill Type *</label>
                  <select
                    value={newSkillType}
                    onChange={(e) => setNewSkillType(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="">Select Type</option>
                    {skillTypes.map(type => (
                      <option key={type.id} value={type.id}>{type.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Skill Category *</label>
                  <select
                    value={newSkillCategory}
                    onChange={(e) => setNewSkillCategory(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="">Select Category</option>
                    {skillCategories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Definition *</label>
                <textarea
                  value={newSkillDefinition}
                  onChange={(e) => setNewSkillDefinition(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="Describe what this skill means and how to assess it..."
                />
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={handleSaveSkill}
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
                >
                  {editingSkill ? <><Edit2 className="h-5 w-5 inline mr-2" />Update</> : <><Plus className="h-5 w-5 inline mr-2" />Add</>} Skill
                </button>
                {editingSkill && (
                  <button
                    onClick={() => {
                      setEditingSkill(null);
                      setNewSkillName('');
                      setNewSkillType('');
                      setNewSkillCategory('');
                      setNewSkillDefinition('');
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>

            <div className="mt-6">
              <h4 className="text-sm font-medium text-gray-700 mb-3">Existing Skills</h4>
              <div className="space-y-2">
                {allSkills.map(skill => (
                  <div key={skill.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">{skill.name}</div>
                        <div className="text-sm text-gray-500 mt-1">
                          {skill.skill_type?.name} - {skill.skill_category?.name}
                        </div>
                        <div className="text-sm text-gray-600 mt-2">{skill.definition}</div>
                      </div>
                      <div className="flex space-x-2 ml-4">
                        <button
                          onClick={() => {
                            setEditingSkill(skill);
                            setNewSkillName(skill.name);
                            setNewSkillType(skill.skill_type_id);
                            setNewSkillCategory(skill.skill_category_id);
                            setNewSkillDefinition(skill.definition);
                          }}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteSkill(skill.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
