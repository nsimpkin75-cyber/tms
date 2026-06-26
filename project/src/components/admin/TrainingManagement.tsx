import React, { useState, useEffect } from 'react';
import { Plus, CreditCard as Edit2, Trash2, Search, Calendar, LayoutGrid as Layout, ExternalLink } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { format } from 'date-fns';
import { ModuleBuilder } from './ModuleBuilder';

interface TrainingSession {
  id: string;
  title: string;
  type: string;
  date: string;
  time: string;
  trainer_name: string;
  method: string;
  max_attendees: number;
  description: string | null;
  created_at: string;
}

interface TrainingCourse {
  id: string;
  title: string;
  description: string | null;
  duration_minutes: number;
  category: string;
  module_url: string | null;
  module_type: 'external' | 'custom';
  is_published: boolean;
  thumbnail_url: string | null;
  created_at: string;
}

interface JobFamily {
  id: string;
  title: string;
  department: string;
}

interface ModuleLink {
  id: string;
  training_course_id: string;
  job_family_id: string;
  is_mandatory: boolean;
  job_families?: JobFamily;
}

export default function TrainingManagement() {
  const [view, setView] = useState<'sessions' | 'courses'>('sessions');
  const [sessions, setSessions] = useState<TrainingSession[]>([]);
  const [courses, setCourses] = useState<TrainingCourse[]>([]);
  const [jobFamilies, setJobFamilies] = useState<JobFamily[]>([]);
  const [moduleLinks, setModuleLinks] = useState<Record<string, ModuleLink[]>>({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<TrainingSession | TrainingCourse | null>(null);
  const [selectedJobFamilies, setSelectedJobFamilies] = useState<Array<{ id: string; mandatory: boolean }>>([]);
  const [showAddToCalendarPrompt, setShowAddToCalendarPrompt] = useState(false);
  const [newlyCreatedCourse, setNewlyCreatedCourse] = useState<TrainingCourse | null>(null);
  const [showModuleBuilder, setShowModuleBuilder] = useState(false);
  const [buildingCourseId, setBuildingCourseId] = useState<string | null>(null);

  const [sessionForm, setSessionForm] = useState({
    title: '',
    type: 'Upskill',
    date: '',
    time: '',
    trainer_name: '',
    method: 'Remote',
    max_attendees: 20,
    description: '',
  });

  const [courseForm, setCourseForm] = useState({
    title: '',
    description: '',
    duration_minutes: 60,
    category: '',
    module_url: '',
    module_type: 'external' as 'external' | 'custom',
    is_published: true,
    thumbnail_url: '',
  });

  useEffect(() => {
    fetchData();
    fetchJobFamilies();
  }, [view]);

  const fetchJobFamilies = async () => {
    try {
      const { data, error } = await supabase
        .from('job_families')
        .select('id, title, department')
        .order('department, title');
      if (error) throw error;
      setJobFamilies(data || []);
    } catch (error) {
      console.error('Error fetching job families:', error);
    }
  };

  const fetchModuleLinks = async () => {
    try {
      const { data, error } = await supabase
        .from('training_module_links')
        .select(`
          id,
          training_course_id,
          job_family_id,
          is_mandatory,
          job_families:job_family_id (
            id,
            title,
            department
          )
        `);
      if (error) throw error;

      const linksByModule: Record<string, ModuleLink[]> = {};
      (data || []).forEach((link: any) => {
        if (!linksByModule[link.training_course_id]) {
          linksByModule[link.training_course_id] = [];
        }
        linksByModule[link.training_course_id].push(link);
      });
      setModuleLinks(linksByModule);
    } catch (error) {
      console.error('Error fetching module links:', error);
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      if (view === 'sessions') {
        const { data, error } = await supabase
          .from('training_sessions')
          .select('*')
          .order('date', { ascending: false });
        if (error) throw error;
        setSessions(data || []);
      } else {
        const { data, error } = await supabase
          .from('training_courses')
          .select('*')
          .order('created_at', { ascending: false });
        if (error) throw error;
        setCourses(data || []);
        await fetchModuleLinks();
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSessionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingItem && 'date' in editingItem) {
        const { error } = await supabase
          .from('training_sessions')
          .update(sessionForm)
          .eq('id', editingItem.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('training_sessions')
          .insert([sessionForm]);
        if (error) throw error;
      }
      setShowModal(false);
      setEditingItem(null);
      resetForms();
      fetchData();
    } catch (error) {
      console.error('Error saving session:', error);
      alert('Failed to save training session');
    }
  };

  const handleCourseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      let courseId: string;
      let isNewCourse = false;
      let createdCourse: TrainingCourse | null = null;

      if (editingItem && 'duration_minutes' in editingItem) {
        const { error } = await supabase
          .from('training_courses')
          .update(courseForm)
          .eq('id', editingItem.id);
        if (error) throw error;
        courseId = editingItem.id;
      } else {
        const { data, error } = await supabase
          .from('training_courses')
          .insert([courseForm])
          .select()
          .single();
        if (error) throw error;
        courseId = data.id;
        isNewCourse = true;
        createdCourse = data;
      }

      // Update module links
      if (editingItem) {
        // Delete existing links
        await supabase
          .from('training_module_links')
          .delete()
          .eq('training_course_id', courseId);
      }

      // Insert new links
      if (selectedJobFamilies.length > 0) {
        const links = selectedJobFamilies.map(jf => ({
          training_course_id: courseId,
          job_family_id: jf.id,
          is_mandatory: jf.mandatory
        }));

        const { error: linksError } = await supabase
          .from('training_module_links')
          .insert(links);
        if (linksError) throw linksError;
      }

      setShowModal(false);
      setEditingItem(null);
      resetForms();
      fetchData();

      // Prompt to add to calendar if new course
      if (isNewCourse && createdCourse) {
        setNewlyCreatedCourse(createdCourse);
        setShowAddToCalendarPrompt(true);
      }
    } catch (error) {
      console.error('Error saving course:', error);
      alert('Failed to save training course');
    }
  };

  const handleAddToCalendar = () => {
    if (newlyCreatedCourse) {
      // Pre-fill session form with course details
      const defaultDate = new Date();
      defaultDate.setDate(defaultDate.getDate() + 7); // Default to next week

      // Map course category to valid session type
      const validTypes = ['Upskill', 'Soft Skill', 'Pathway'];
      const sessionType = validTypes.includes(newlyCreatedCourse.category)
        ? newlyCreatedCourse.category
        : 'Upskill';

      setSessionForm({
        title: newlyCreatedCourse.title,
        type: sessionType,
        date: defaultDate.toISOString().split('T')[0],
        time: '10:00',
        trainer_name: '',
        method: 'Remote',
        max_attendees: 20,
        description: newlyCreatedCourse.description || '',
      });
      setShowAddToCalendarPrompt(false);
      setNewlyCreatedCourse(null);
      setView('sessions'); // Switch to sessions view
      setShowModal(true);
    }
  };

  const handleSkipCalendar = () => {
    setShowAddToCalendarPrompt(false);
    setNewlyCreatedCourse(null);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this item?')) return;

    try {
      const table = view === 'sessions' ? 'training_sessions' : 'training_courses';
      const { error } = await supabase.from(table).delete().eq('id', id);
      if (error) throw error;
      fetchData();
    } catch (error) {
      console.error('Error deleting item:', error);
      alert('Failed to delete item');
    }
  };

  const openEditModal = (item: TrainingSession | TrainingCourse) => {
    setEditingItem(item);
    if ('date' in item) {
      setSessionForm({
        title: item.title,
        type: item.type,
        date: item.date,
        time: item.time,
        trainer_name: item.trainer_name,
        method: item.method,
        max_attendees: item.max_attendees,
        description: item.description || '',
      });
    } else {
      setCourseForm({
        title: item.title,
        description: item.description || '',
        duration_minutes: item.duration_minutes,
        category: item.category,
        module_url: item.module_url || '',
        module_type: item.module_type || 'external',
        is_published: item.is_published ?? true,
        thumbnail_url: item.thumbnail_url || '',
      });

      // Load existing job family links
      const links = moduleLinks[item.id] || [];
      setSelectedJobFamilies(
        links.map(link => ({
          id: link.job_family_id,
          mandatory: link.is_mandatory
        }))
      );
    }
    setShowModal(true);
  };

  const resetForms = () => {
    setSessionForm({
      title: '',
      type: 'Upskill',
      date: '',
      time: '',
      trainer_name: '',
      method: 'Remote',
      max_attendees: 20,
      description: '',
    });
    setCourseForm({
      title: '',
      description: '',
      duration_minutes: 60,
      category: '',
      module_url: '',
      module_type: 'external',
      is_published: true,
      thumbnail_url: '',
    });
    setSelectedJobFamilies([]);
  };

  const handleOpenModuleBuilder = (courseId: string) => {
    setBuildingCourseId(courseId);
    setShowModuleBuilder(true);
  };

  const handleCloseModuleBuilder = () => {
    setShowModuleBuilder(false);
    setBuildingCourseId(null);
    fetchData();
  };

  const filteredSessions = sessions.filter((session) =>
    session.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    session.trainer_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredCourses = courses.filter((course) =>
    course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    course.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div className="flex gap-2">
          <button
            onClick={() => setView('sessions')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              view === 'sessions'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Training Sessions
          </button>
          <button
            onClick={() => setView('courses')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              view === 'courses'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Training Courses
          </button>
        </div>
        <button
          onClick={() => {
            setEditingItem(null);
            resetForms();
            setShowModal(true);
          }}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Add {view === 'sessions' ? 'Session' : 'Course'}
        </button>
      </div>

      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8">Loading...</div>
      ) : view === 'sessions' ? (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Title</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Trainer</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Method</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Max Attendees</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredSessions.map((session) => (
                <tr key={session.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{session.title}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                      {session.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {format(new Date(session.date), 'MMM dd, yyyy')}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{session.trainer_name}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{session.method}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{session.max_attendees}</td>
                  <td className="px-6 py-4 text-right text-sm font-medium">
                    <button
                      onClick={() => openEditModal(session)}
                      className="text-blue-600 hover:text-blue-900 mr-4"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(session.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Title</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Duration</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Linked Roles</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredCourses.map((course) => {
                const links = moduleLinks[course.id] || [];
                return (
                  <tr key={course.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-900">{course.title}</span>
                        {!course.is_published && (
                          <span className="px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded text-xs">Draft</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        {course.module_type === 'custom' ? (
                          <>
                            <Layout className="w-4 h-4 text-purple-600" />
                            <span className="text-purple-600 font-medium">Custom</span>
                          </>
                        ) : (
                          <>
                            <ExternalLink className="w-4 h-4 text-blue-600" />
                            <span className="text-blue-600 font-medium">External</span>
                          </>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">
                        {course.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{course.duration_minutes} min</td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {links.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {links.map((link: any) => (
                            <span
                              key={link.id}
                              className={`px-2 py-1 rounded-full text-xs ${
                                link.is_mandatory
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-blue-100 text-blue-800'
                              }`}
                              title={link.is_mandatory ? 'Mandatory' : 'Optional'}
                            >
                              {link.job_families?.title || 'Unknown Role'}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-gray-400">No roles linked</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        {course.module_type === 'custom' && (
                          <button
                            onClick={() => handleOpenModuleBuilder(course.id)}
                            className="text-purple-600 hover:text-purple-900"
                            title="Edit module content"
                          >
                            <Layout className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => openEditModal(course)}
                          className="text-blue-600 hover:text-blue-900"
                          title="Edit settings"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(course.id)}
                          className="text-red-600 hover:text-red-900"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {showAddToCalendarPrompt && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-start gap-3 mb-4">
              <div className="bg-blue-100 p-2 rounded-lg">
                <Calendar className="w-6 h-6 text-blue-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold">Add to Training Calendar?</h3>
              </div>
            </div>
            <p className="text-gray-600 mb-6">
              Would you like to schedule this course on the training calendar? You can create a training session for "<span className="font-medium text-gray-900">{newlyCreatedCourse?.title}</span>".
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleAddToCalendar}
                className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Yes, Schedule It
              </button>
              <button
                onClick={handleSkipCalendar}
                className="flex-1 bg-gray-200 text-gray-800 py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors font-medium"
              >
                No Thanks
              </button>
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 my-8">
            <h3 className="text-lg font-semibold mb-4">
              {editingItem ? 'Edit' : 'Add'} {view === 'sessions' ? 'Training Session' : 'Training Course'}
            </h3>
            {view === 'sessions' ? (
              <form onSubmit={handleSessionSubmit}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                    <input
                      type="text"
                      value={sessionForm.title}
                      onChange={(e) => setSessionForm({ ...sessionForm, title: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                    <select
                      value={sessionForm.type}
                      onChange={(e) => setSessionForm({ ...sessionForm, type: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="Upskill">Upskill</option>
                      <option value="Soft Skill">Soft Skill</option>
                      <option value="Pathway">Pathway</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                    <input
                      type="date"
                      value={sessionForm.date}
                      onChange={(e) => setSessionForm({ ...sessionForm, date: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Time</label>
                    <input
                      type="time"
                      value={sessionForm.time}
                      onChange={(e) => setSessionForm({ ...sessionForm, time: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Trainer Name</label>
                    <input
                      type="text"
                      value={sessionForm.trainer_name}
                      onChange={(e) => setSessionForm({ ...sessionForm, trainer_name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Method</label>
                    <select
                      value={sessionForm.method}
                      onChange={(e) => setSessionForm({ ...sessionForm, method: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="Remote">Remote</option>
                      <option value="Classroom">Classroom</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Max Attendees</label>
                    <input
                      type="number"
                      value={sessionForm.max_attendees}
                      onChange={(e) => setSessionForm({ ...sessionForm, max_attendees: parseInt(e.target.value) || 20 })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <textarea
                      value={sessionForm.description}
                      onChange={(e) => setSessionForm({ ...sessionForm, description: e.target.value })}
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
                    {editingItem ? 'Update' : 'Create'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      setEditingItem(null);
                      resetForms();
                    }}
                    className="flex-1 bg-gray-200 text-gray-800 py-2 rounded-lg hover:bg-gray-300 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleCourseSubmit}>
                <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                    <input
                      type="text"
                      value={courseForm.title}
                      onChange={(e) => setCourseForm({ ...courseForm, title: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Module Type</label>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2">
                        <input
                          type="radio"
                          value="external"
                          checked={courseForm.module_type === 'external'}
                          onChange={(e) => setCourseForm({ ...courseForm, module_type: 'external' })}
                          className="border-gray-300"
                        />
                        <div className="flex items-center gap-1">
                          <ExternalLink className="w-4 h-4 text-blue-600" />
                          <span className="text-sm text-gray-700">External Link (YouTube, etc.)</span>
                        </div>
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="radio"
                          value="custom"
                          checked={courseForm.module_type === 'custom'}
                          onChange={(e) => setCourseForm({ ...courseForm, module_type: 'custom' })}
                          className="border-gray-300"
                        />
                        <div className="flex items-center gap-1">
                          <Layout className="w-4 h-4 text-purple-600" />
                          <span className="text-sm text-gray-700">Custom Built Module</span>
                        </div>
                      </label>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                    <input
                      type="text"
                      value={courseForm.category}
                      onChange={(e) => setCourseForm({ ...courseForm, category: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Duration (minutes)</label>
                    <input
                      type="number"
                      value={courseForm.duration_minutes}
                      onChange={(e) => setCourseForm({ ...courseForm, duration_minutes: parseInt(e.target.value) || 60 })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  {courseForm.module_type === 'external' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Module URL</label>
                      <input
                        type="url"
                        value={courseForm.module_url}
                        onChange={(e) => setCourseForm({ ...courseForm, module_url: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="https://youtube.com/watch?v=..."
                        required={courseForm.module_type === 'external'}
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        External link (YouTube, LinkedIn Learning, Udemy, etc.)
                      </p>
                    </div>
                  )}
                  {courseForm.module_type === 'custom' && (
                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                      <div className="flex items-start gap-2">
                        <Layout className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-purple-900 mb-1">Custom Module Builder</p>
                          <p className="text-xs text-purple-700">
                            After creating this module, you can use the module builder to add pages, content blocks, videos, images, and quizzes.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <textarea
                      value={courseForm.description}
                      onChange={(e) => setCourseForm({ ...courseForm, description: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      rows={3}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Thumbnail URL (optional)</label>
                    <input
                      type="url"
                      value={courseForm.thumbnail_url}
                      onChange={(e) => setCourseForm({ ...courseForm, thumbnail_url: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="https://example.com/image.jpg"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Preview image for the module
                    </p>
                  </div>
                  <div>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={courseForm.is_published}
                        onChange={(e) => setCourseForm({ ...courseForm, is_published: e.target.checked })}
                        className="rounded border-gray-300"
                      />
                      <span className="text-sm font-medium text-gray-700">Published</span>
                    </label>
                    <p className="text-xs text-gray-500 mt-1">
                      Only published modules are visible to learners
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Which roles does this module support?
                    </label>
                    <div className="border border-gray-300 rounded-lg p-3 max-h-48 overflow-y-auto space-y-2">
                      {jobFamilies.map((jobFamily) => {
                        const isSelected = selectedJobFamilies.some(jf => jf.id === jobFamily.id);
                        const selectedJobFamily = selectedJobFamilies.find(jf => jf.id === jobFamily.id);

                        return (
                          <div key={jobFamily.id} className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              id={`job-${jobFamily.id}`}
                              checked={isSelected}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedJobFamilies([...selectedJobFamilies, { id: jobFamily.id, mandatory: false }]);
                                } else {
                                  setSelectedJobFamilies(selectedJobFamilies.filter(jf => jf.id !== jobFamily.id));
                                }
                              }}
                              className="rounded border-gray-300"
                            />
                            <label htmlFor={`job-${jobFamily.id}`} className="flex-1 text-sm text-gray-700">
                              {jobFamily.title} <span className="text-gray-500">({jobFamily.department})</span>
                            </label>
                            {isSelected && (
                              <label className="flex items-center gap-2 text-sm">
                                <input
                                  type="checkbox"
                                  checked={selectedJobFamily?.mandatory || false}
                                  onChange={(e) => {
                                    setSelectedJobFamilies(
                                      selectedJobFamilies.map(jf =>
                                        jf.id === jobFamily.id ? { ...jf, mandatory: e.target.checked } : jf
                                      )
                                    );
                                  }}
                                  className="rounded border-gray-300"
                                />
                                <span className="text-red-600 font-medium">Mandatory</span>
                              </label>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Select roles and mark if mandatory for progression
                    </p>
                  </div>
                </div>
                <div className="flex gap-3 mt-6">
                  <button
                    type="submit"
                    className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    {editingItem ? 'Update' : 'Create'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      setEditingItem(null);
                      resetForms();
                    }}
                    className="flex-1 bg-gray-200 text-gray-800 py-2 rounded-lg hover:bg-gray-300 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {showModuleBuilder && buildingCourseId && (
        <ModuleBuilder
          courseId={buildingCourseId}
          onClose={handleCloseModuleBuilder}
          onSave={handleCloseModuleBuilder}
        />
      )}
    </div>
  );
}
