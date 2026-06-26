import React, { useState, useEffect } from 'react';
import { Plus, CreditCard as Edit2, Trash2, Building2, Briefcase, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface Department {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
}

interface JobTitle {
  id: string;
  title: string;
  department_id: string | null;
  description: string | null;
  is_active: boolean;
  created_at: string;
  department?: {
    name: string;
  };
}

export default function DepartmentsAndTitlesManagement() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [jobTitles, setJobTitles] = useState<JobTitle[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDepartmentModal, setShowDepartmentModal] = useState(false);
  const [showTitleModal, setShowTitleModal] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);
  const [editingTitle, setEditingTitle] = useState<JobTitle | null>(null);

  const [departmentForm, setDepartmentForm] = useState({
    name: '',
    description: '',
  });

  const [titleForm, setTitleForm] = useState({
    title: '',
    department_id: '',
    description: '',
    is_active: true,
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [deptResult, titlesResult] = await Promise.all([
        supabase.from('departments').select('*').order('name'),
        supabase.from('job_titles').select(`
          *,
          department:department_id (name)
        `).order('title'),
      ]);

      if (deptResult.error) throw deptResult.error;
      if (titlesResult.error) throw titlesResult.error;

      setDepartments(deptResult.data || []);
      setJobTitles(titlesResult.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      alert('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleDepartmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingDepartment) {
        const { error } = await supabase
          .from('departments')
          .update(departmentForm)
          .eq('id', editingDepartment.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('departments')
          .insert([departmentForm]);

        if (error) throw error;
      }

      setShowDepartmentModal(false);
      setEditingDepartment(null);
      setDepartmentForm({ name: '', description: '' });
      fetchData();
    } catch (error) {
      console.error('Error saving department:', error);
      alert('Failed to save department');
    }
  };

  const handleTitleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingTitle) {
        const { error } = await supabase
          .from('job_titles')
          .update(titleForm)
          .eq('id', editingTitle.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('job_titles')
          .insert([titleForm]);

        if (error) throw error;
      }

      setShowTitleModal(false);
      setEditingTitle(null);
      setTitleForm({ title: '', department_id: '', description: '', is_active: true });
      fetchData();
    } catch (error) {
      console.error('Error saving job title:', error);
      alert('Failed to save job title');
    }
  };

  const handleDeleteDepartment = async (id: string) => {
    if (!confirm('Are you sure you want to delete this department?')) return;

    try {
      const { error } = await supabase
        .from('departments')
        .delete()
        .eq('id', id);

      if (error) throw error;
      fetchData();
    } catch (error) {
      console.error('Error deleting department:', error);
      alert('Failed to delete department');
    }
  };

  const handleDeleteTitle = async (id: string) => {
    if (!confirm('Are you sure you want to delete this job title?')) return;

    try {
      const { error } = await supabase
        .from('job_titles')
        .delete()
        .eq('id', id);

      if (error) throw error;
      fetchData();
    } catch (error) {
      console.error('Error deleting job title:', error);
      alert('Failed to delete job title');
    }
  };

  const openEditDepartment = (dept: Department) => {
    setEditingDepartment(dept);
    setDepartmentForm({ name: dept.name, description: dept.description || '' });
    setShowDepartmentModal(true);
  };

  const openEditTitle = (title: JobTitle) => {
    setEditingTitle(title);
    setTitleForm({
      title: title.title,
      department_id: title.department_id || '',
      description: title.description || '',
      is_active: title.is_active,
    });
    setShowTitleModal(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="inline-block w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <Building2 className="w-6 h-6 text-blue-600" />
              Departments
            </h2>
            <p className="text-sm text-gray-600 mt-1">Manage organizational departments</p>
          </div>
          <button
            onClick={() => {
              setEditingDepartment(null);
              setDepartmentForm({ name: '', description: '' });
              setShowDepartmentModal(true);
            }}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Department
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {departments.map((dept) => (
            <div key={dept.id} className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors">
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-medium text-gray-900">{dept.name}</h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => openEditDepartment(dept)}
                    className="text-blue-600 hover:text-blue-700"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteDepartment(dept.id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              {dept.description && (
                <p className="text-sm text-gray-600">{dept.description}</p>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <Briefcase className="w-6 h-6 text-green-600" />
              Job Titles
            </h2>
            <p className="text-sm text-gray-600 mt-1">Manage job titles across departments</p>
          </div>
          <button
            onClick={() => {
              setEditingTitle(null);
              setTitleForm({ title: '', department_id: '', description: '', is_active: true });
              setShowTitleModal(true);
            }}
            className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Job Title
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">Title</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">Department</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">Description</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">Status</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-gray-900">Actions</th>
              </tr>
            </thead>
            <tbody>
              {jobTitles.map((title) => (
                <tr key={title.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4 text-sm font-medium text-gray-900">{title.title}</td>
                  <td className="py-3 px-4 text-sm text-gray-600">
                    {title.department ? (
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
                        {title.department.name}
                      </span>
                    ) : (
                      <span className="text-gray-400">No department</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-600">{title.description || '-'}</td>
                  <td className="py-3 px-4 text-sm">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      title.is_active
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      {title.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-sm text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => openEditTitle(title)}
                        className="text-blue-600 hover:text-blue-700"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteTitle(title.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showDepartmentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">
                {editingDepartment ? 'Edit Department' : 'Add Department'}
              </h3>
              <button
                onClick={() => setShowDepartmentModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleDepartmentSubmit}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={departmentForm.name}
                    onChange={(e) => setDepartmentForm({ ...departmentForm, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    value={departmentForm.description}
                    onChange={(e) => setDepartmentForm({ ...departmentForm, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    rows={3}
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  {editingDepartment ? 'Update' : 'Create'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowDepartmentModal(false)}
                  className="flex-1 bg-gray-200 text-gray-800 py-2 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showTitleModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">
                {editingTitle ? 'Edit Job Title' : 'Add Job Title'}
              </h3>
              <button
                onClick={() => setShowTitleModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleTitleSubmit}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={titleForm.title}
                    onChange={(e) => setTitleForm({ ...titleForm, title: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                  <select
                    value={titleForm.department_id}
                    onChange={(e) => setTitleForm({ ...titleForm, department_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  >
                    <option value="">No department</option>
                    {departments.map((dept) => (
                      <option key={dept.id} value={dept.id}>
                        {dept.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    value={titleForm.description}
                    onChange={(e) => setTitleForm({ ...titleForm, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    rows={2}
                  />
                </div>
                <div>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={titleForm.is_active}
                      onChange={(e) => setTitleForm({ ...titleForm, is_active: e.target.checked })}
                      className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                    />
                    <span className="text-sm font-medium text-gray-700">Active</span>
                  </label>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  type="submit"
                  className="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition-colors"
                >
                  {editingTitle ? 'Update' : 'Create'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowTitleModal(false)}
                  className="flex-1 bg-gray-200 text-gray-800 py-2 rounded-lg hover:bg-gray-300 transition-colors"
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
