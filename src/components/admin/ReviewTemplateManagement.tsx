import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Save, X, ChevronDown, ChevronUp, GripVertical, FileText, Power, PowerOff } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface Question {
  id: string;
  question_text: string;
  question_type: string;
  options: any;
  is_required: boolean;
  sort_order: number;
}

interface Section {
  id: string;
  title: string;
  description: string;
  sort_order: number;
  questions?: Question[];
}

interface Template {
  id: string;
  name: string;
  description: string;
  template_type: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export default function ReviewTemplateManagement() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showSectionModal, setShowSectionModal] = useState(false);
  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [editingSection, setEditingSection] = useState<Section | null>(null);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [currentSectionId, setCurrentSectionId] = useState<string | null>(null);

  const [templateForm, setTemplateForm] = useState({
    name: '',
    description: '',
    template_type: 'performance_review',
    is_active: true,
  });

  const [sectionForm, setSectionForm] = useState({
    title: '',
    description: '',
    sort_order: 0,
  });

  const [questionForm, setQuestionForm] = useState({
    question_text: '',
    question_type: 'text',
    options: '{}',
    is_required: true,
    sort_order: 0,
  });

  useEffect(() => {
    fetchTemplates();
  }, []);

  useEffect(() => {
    if (selectedTemplate) {
      fetchSections(selectedTemplate.id);
    }
  }, [selectedTemplate]);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('review_templates')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTemplates(data || []);
      if (data && data.length > 0 && !selectedTemplate) {
        setSelectedTemplate(data[0]);
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
      alert('Failed to load templates');
    } finally {
      setLoading(false);
    }
  };

  const fetchSections = async (templateId: string) => {
    try {
      const { data: sectionsData, error: sectionsError } = await supabase
        .from('review_template_sections')
        .select('*')
        .eq('template_id', templateId)
        .order('sort_order');

      if (sectionsError) throw sectionsError;

      const sectionsWithQuestions = await Promise.all(
        (sectionsData || []).map(async (section) => {
          const { data: questionsData } = await supabase
            .from('review_template_questions')
            .select('*')
            .eq('section_id', section.id)
            .order('sort_order');

          return {
            ...section,
            questions: questionsData || [],
          };
        })
      );

      setSections(sectionsWithQuestions);
    } catch (error) {
      console.error('Error fetching sections:', error);
    }
  };

  const handleSaveTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingTemplate) {
        const { error } = await supabase
          .from('review_templates')
          .update(templateForm)
          .eq('id', editingTemplate.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('review_templates').insert([templateForm]);
        if (error) throw error;
      }
      setShowTemplateModal(false);
      setEditingTemplate(null);
      resetTemplateForm();
      fetchTemplates();
    } catch (error) {
      console.error('Error saving template:', error);
      alert('Failed to save template');
    }
  };

  const handleToggleActive = async (template: Template) => {
    try {
      const { error } = await supabase
        .from('review_templates')
        .update({ is_active: !template.is_active })
        .eq('id', template.id);
      if (error) throw error;
      fetchTemplates();
    } catch (error) {
      console.error('Error toggling template:', error);
      alert('Failed to update template');
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    if (!confirm('Are you sure you want to delete this template? All sections and questions will be removed.')) return;
    try {
      const { error } = await supabase.from('review_templates').delete().eq('id', id);
      if (error) throw error;
      if (selectedTemplate?.id === id) {
        setSelectedTemplate(templates[0] || null);
      }
      fetchTemplates();
    } catch (error) {
      console.error('Error deleting template:', error);
      alert('Failed to delete template');
    }
  };

  const handleSaveSection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTemplate) return;

    try {
      const dataToSave = {
        ...sectionForm,
        template_id: selectedTemplate.id,
      };

      if (editingSection) {
        const { error } = await supabase
          .from('review_template_sections')
          .update(sectionForm)
          .eq('id', editingSection.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('review_template_sections').insert([dataToSave]);
        if (error) throw error;
      }
      setShowSectionModal(false);
      setEditingSection(null);
      resetSectionForm();
      fetchSections(selectedTemplate.id);
    } catch (error) {
      console.error('Error saving section:', error);
      alert('Failed to save section');
    }
  };

  const handleDeleteSection = async (id: string) => {
    if (!confirm('Are you sure you want to delete this section? All questions will be removed.')) return;
    try {
      const { error } = await supabase.from('review_template_sections').delete().eq('id', id);
      if (error) throw error;
      if (selectedTemplate) {
        fetchSections(selectedTemplate.id);
      }
    } catch (error) {
      console.error('Error deleting section:', error);
      alert('Failed to delete section');
    }
  };

  const handleSaveQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentSectionId) return;

    try {
      let parsedOptions;
      try {
        parsedOptions = JSON.parse(questionForm.options);
      } catch {
        alert('Invalid JSON in options');
        return;
      }

      const dataToSave = {
        ...questionForm,
        section_id: currentSectionId,
        options: parsedOptions,
      };

      if (editingQuestion) {
        const { error } = await supabase
          .from('review_template_questions')
          .update({ ...questionForm, options: parsedOptions })
          .eq('id', editingQuestion.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('review_template_questions').insert([dataToSave]);
        if (error) throw error;
      }
      setShowQuestionModal(false);
      setEditingQuestion(null);
      setCurrentSectionId(null);
      resetQuestionForm();
      if (selectedTemplate) {
        fetchSections(selectedTemplate.id);
      }
    } catch (error) {
      console.error('Error saving question:', error);
      alert('Failed to save question');
    }
  };

  const handleDeleteQuestion = async (id: string) => {
    if (!confirm('Are you sure you want to delete this question?')) return;
    try {
      const { error } = await supabase.from('review_template_questions').delete().eq('id', id);
      if (error) throw error;
      if (selectedTemplate) {
        fetchSections(selectedTemplate.id);
      }
    } catch (error) {
      console.error('Error deleting question:', error);
      alert('Failed to delete question');
    }
  };

  const openEditTemplateModal = (template: Template) => {
    setEditingTemplate(template);
    setTemplateForm({
      name: template.name,
      description: template.description,
      template_type: template.template_type,
      is_active: template.is_active,
    });
    setShowTemplateModal(true);
  };

  const openEditSectionModal = (section: Section) => {
    setEditingSection(section);
    setSectionForm({
      title: section.title,
      description: section.description,
      sort_order: section.sort_order,
    });
    setShowSectionModal(true);
  };

  const openEditQuestionModal = (question: Question, sectionId: string) => {
    setEditingQuestion(question);
    setCurrentSectionId(sectionId);
    setQuestionForm({
      question_text: question.question_text,
      question_type: question.question_type,
      options: JSON.stringify(question.options, null, 2),
      is_required: question.is_required,
      sort_order: question.sort_order,
    });
    setShowQuestionModal(true);
  };

  const resetTemplateForm = () => {
    setTemplateForm({
      name: '',
      description: '',
      template_type: 'performance_review',
      is_active: true,
    });
  };

  const resetSectionForm = () => {
    setSectionForm({
      title: '',
      description: '',
      sort_order: 0,
    });
  };

  const resetQuestionForm = () => {
    setQuestionForm({
      question_text: '',
      question_type: 'text',
      options: '{}',
      is_required: true,
      sort_order: 0,
    });
  };

  if (loading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Review Form Templates</h2>
          <p className="text-sm text-gray-600 mt-1">Configure review form templates with custom sections and questions</p>
        </div>
        <button
          onClick={() => {
            setEditingTemplate(null);
            resetTemplateForm();
            setShowTemplateModal(true);
          }}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          New Template
        </button>
      </div>

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-4">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <h3 className="font-semibold text-gray-900 mb-3">Templates</h3>
            <div className="space-y-2">
              {templates.map((template) => (
                <div
                  key={template.id}
                  className={`p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                    selectedTemplate?.id === template.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setSelectedTemplate(template)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-gray-900 text-sm truncate">{template.name}</h4>
                      <p className="text-xs text-gray-600 mt-1">{template.template_type}</p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleActive(template);
                      }}
                      className={`p-1 rounded transition-colors ${
                        template.is_active ? 'text-green-600 hover:bg-green-100' : 'text-gray-400 hover:bg-gray-100'
                      }`}
                    >
                      {template.is_active ? <Power className="w-4 h-4" /> : <PowerOff className="w-4 h-4" />}
                    </button>
                  </div>
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openEditTemplateModal(template);
                      }}
                      className="text-blue-600 hover:text-blue-900 text-xs"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteTemplate(template.id);
                      }}
                      className="text-red-600 hover:text-red-900 text-xs"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="col-span-8">
          {selectedTemplate ? (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{selectedTemplate.name}</h3>
                  <p className="text-sm text-gray-600 mt-1">{selectedTemplate.description}</p>
                </div>
                <button
                  onClick={() => {
                    setEditingSection(null);
                    resetSectionForm();
                    setSectionForm({ ...sectionForm, sort_order: sections.length + 1 });
                    setShowSectionModal(true);
                  }}
                  className="flex items-center gap-2 bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm"
                >
                  <Plus className="w-4 h-4" />
                  Add Section
                </button>
              </div>

              <div className="space-y-4">
                {sections.map((section) => (
                  <div key={section.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900">{section.title}</h4>
                        {section.description && <p className="text-sm text-gray-600 mt-1">{section.description}</p>}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() =>
                            {
                              setCurrentSectionId(section.id);
                              resetQuestionForm();
                              setQuestionForm({ ...questionForm, sort_order: (section.questions?.length || 0) + 1 });
                              setShowQuestionModal(true);
                            }
                          }
                          className="text-green-600 hover:text-green-900 text-sm"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openEditSectionModal(section)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteSection(section.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {section.questions && section.questions.length > 0 && (
                      <div className="space-y-2 mt-3 pl-4 border-l-2 border-gray-200">
                        {section.questions.map((question) => (
                          <div key={question.id} className="bg-gray-50 p-3 rounded border border-gray-200">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <p className="text-sm text-gray-900">{question.question_text}</p>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                                    {question.question_type}
                                  </span>
                                  {question.is_required && (
                                    <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">Required</span>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-2 ml-4">
                                <button
                                  onClick={() => openEditQuestionModal(question, section.id)}
                                  className="text-blue-600 hover:text-blue-900"
                                >
                                  <Edit2 className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={() => handleDeleteQuestion(question.id)}
                                  className="text-red-600 hover:text-red-900"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}

                {sections.length === 0 && (
                  <div className="text-center py-12 text-gray-500">
                    <FileText className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                    <p>No sections yet. Add a section to get started.</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
              <FileText className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <p className="text-gray-600">Select a template to view its sections and questions</p>
            </div>
          )}
        </div>
      </div>

      {showTemplateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full">
            <h3 className="text-lg font-semibold mb-4">{editingTemplate ? 'Edit' : 'New'} Template</h3>
            <form onSubmit={handleSaveTemplate}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Template Name</label>
                  <input
                    type="text"
                    value={templateForm.name}
                    onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    value={templateForm.description}
                    onChange={(e) => setTemplateForm({ ...templateForm, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    rows={3}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Template Type</label>
                  <select
                    value={templateForm.template_type}
                    onChange={(e) => setTemplateForm({ ...templateForm, template_type: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="performance_review">Performance Review</option>
                    <option value="1to1">1-to-1</option>
                    <option value="probation">Probation Review</option>
                    <option value="exit">Exit Interview</option>
                  </select>
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={templateForm.is_active}
                    onChange={(e) => setTemplateForm({ ...templateForm, is_active: e.target.checked })}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="is_active" className="ml-2 text-sm font-medium text-gray-700">
                    Active
                  </label>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button type="submit" className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700">
                  {editingTemplate ? 'Update' : 'Create'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowTemplateModal(false);
                    setEditingTemplate(null);
                    resetTemplateForm();
                  }}
                  className="flex-1 bg-gray-200 text-gray-800 py-2 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showSectionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full">
            <h3 className="text-lg font-semibold mb-4">{editingSection ? 'Edit' : 'New'} Section</h3>
            <form onSubmit={handleSaveSection}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Section Title</label>
                  <input
                    type="text"
                    value={sectionForm.title}
                    onChange={(e) => setSectionForm({ ...sectionForm, title: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    value={sectionForm.description}
                    onChange={(e) => setSectionForm({ ...sectionForm, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    rows={2}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Sort Order</label>
                  <input
                    type="number"
                    value={sectionForm.sort_order}
                    onChange={(e) => setSectionForm({ ...sectionForm, sort_order: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button type="submit" className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700">
                  {editingSection ? 'Update' : 'Create'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowSectionModal(false);
                    setEditingSection(null);
                    resetSectionForm();
                  }}
                  className="flex-1 bg-gray-200 text-gray-800 py-2 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showQuestionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">{editingQuestion ? 'Edit' : 'New'} Question</h3>
            <form onSubmit={handleSaveQuestion}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Question Text</label>
                  <textarea
                    value={questionForm.question_text}
                    onChange={(e) => setQuestionForm({ ...questionForm, question_text: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    rows={3}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Question Type</label>
                  <select
                    value={questionForm.question_type}
                    onChange={(e) => setQuestionForm({ ...questionForm, question_type: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="text">Short Text</option>
                    <option value="textarea">Long Text</option>
                    <option value="rating">Rating Scale</option>
                    <option value="multiple_choice">Multiple Choice</option>
                    <option value="yes_no">Yes/No</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Options (JSON)
                  </label>
                  <textarea
                    value={questionForm.options}
                    onChange={(e) => setQuestionForm({ ...questionForm, options: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                    rows={4}
                    placeholder='{"min": 1, "max": 5, "labels": ["Poor", "Fair", "Good", "Very Good", "Excellent"]}'
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Sort Order</label>
                  <input
                    type="number"
                    value={questionForm.sort_order}
                    onChange={(e) => setQuestionForm({ ...questionForm, sort_order: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="is_required"
                    checked={questionForm.is_required}
                    onChange={(e) => setQuestionForm({ ...questionForm, is_required: e.target.checked })}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="is_required" className="ml-2 text-sm font-medium text-gray-700">
                    Required
                  </label>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button type="submit" className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700">
                  {editingQuestion ? 'Update' : 'Create'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowQuestionModal(false);
                    setEditingQuestion(null);
                    setCurrentSectionId(null);
                    resetQuestionForm();
                  }}
                  className="flex-1 bg-gray-200 text-gray-800 py-2 rounded-lg hover:bg-gray-300"
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
