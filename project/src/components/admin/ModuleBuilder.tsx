import React, { useState, useEffect } from 'react';
import { Plus, Trash2, MoveUp, MoveDown, Save, Eye, Type, Image, Video, List, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface ContentBlock {
  type: 'text' | 'image' | 'video' | 'quiz';
  content: any;
}

interface ModulePage {
  id?: string;
  title: string;
  sort_order: number;
  content: ContentBlock[];
}

interface ModuleBuilderProps {
  courseId: string;
  onClose: () => void;
  onSave: () => void;
}

export function ModuleBuilder({ courseId, onClose, onSave }: ModuleBuilderProps) {
  const [pages, setPages] = useState<ModulePage[]>([]);
  const [selectedPageIndex, setSelectedPageIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchPages();
  }, [courseId]);

  const fetchPages = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('training_module_pages')
        .select('*')
        .eq('course_id', courseId)
        .order('sort_order', { ascending: true });

      if (error) throw error;

      if (data && data.length > 0) {
        setPages(data.map(p => ({
          id: p.id,
          title: p.title,
          sort_order: p.sort_order,
          content: p.content || [],
        })));
      } else {
        setPages([{
          title: 'Introduction',
          sort_order: 0,
          content: [],
        }]);
      }
    } catch (error) {
      console.error('Error fetching pages:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      const deletePromises = [];
      const { data: existingPages } = await supabase
        .from('training_module_pages')
        .select('id')
        .eq('course_id', courseId);

      const existingIds = new Set(existingPages?.map(p => p.id) || []);
      const currentIds = new Set(pages.filter(p => p.id).map(p => p.id));

      for (const existingId of existingIds) {
        if (!currentIds.has(existingId)) {
          deletePromises.push(
            supabase
              .from('training_module_pages')
              .delete()
              .eq('id', existingId)
          );
        }
      }

      await Promise.all(deletePromises);

      const upsertPromises = pages.map((page, index) => {
        const pageData = {
          course_id: courseId,
          title: page.title,
          sort_order: index,
          content: page.content,
        };

        if (page.id) {
          return supabase
            .from('training_module_pages')
            .update(pageData)
            .eq('id', page.id);
        } else {
          return supabase
            .from('training_module_pages')
            .insert([pageData]);
        }
      });

      await Promise.all(upsertPromises);

      onSave();
    } catch (error) {
      console.error('Error saving pages:', error);
      alert('Failed to save module content');
    } finally {
      setSaving(false);
    }
  };

  const addPage = () => {
    setPages([...pages, {
      title: `Page ${pages.length + 1}`,
      sort_order: pages.length,
      content: [],
    }]);
    setSelectedPageIndex(pages.length);
  };

  const deletePage = (index: number) => {
    if (pages.length === 1) {
      alert('You must have at least one page');
      return;
    }
    const newPages = pages.filter((_, i) => i !== index);
    setPages(newPages);
    if (selectedPageIndex >= newPages.length) {
      setSelectedPageIndex(newPages.length - 1);
    }
  };

  const movePage = (index: number, direction: 'up' | 'down') => {
    const newPages = [...pages];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= pages.length) return;

    [newPages[index], newPages[targetIndex]] = [newPages[targetIndex], newPages[index]];
    setPages(newPages);
    setSelectedPageIndex(targetIndex);
  };

  const updatePageTitle = (index: number, title: string) => {
    const newPages = [...pages];
    newPages[index].title = title;
    setPages(newPages);
  };

  const addContentBlock = (type: ContentBlock['type']) => {
    const newPages = [...pages];
    const defaultContent: Record<ContentBlock['type'], any> = {
      text: { html: '<p>Enter your content here...</p>' },
      image: { url: '', caption: '' },
      video: { url: '', caption: '' },
      quiz: { question: '', options: ['', ''], correctIndex: 0 },
    };

    newPages[selectedPageIndex].content.push({
      type,
      content: defaultContent[type],
    });
    setPages(newPages);
  };

  const updateContentBlock = (blockIndex: number, content: any) => {
    const newPages = [...pages];
    newPages[selectedPageIndex].content[blockIndex].content = content;
    setPages(newPages);
  };

  const deleteContentBlock = (blockIndex: number) => {
    const newPages = [...pages];
    newPages[selectedPageIndex].content = newPages[selectedPageIndex].content.filter((_, i) => i !== blockIndex);
    setPages(newPages);
  };

  const moveContentBlock = (blockIndex: number, direction: 'up' | 'down') => {
    const newPages = [...pages];
    const content = newPages[selectedPageIndex].content;
    const targetIndex = direction === 'up' ? blockIndex - 1 : blockIndex + 1;
    if (targetIndex < 0 || targetIndex >= content.length) return;

    [content[blockIndex], content[targetIndex]] = [content[targetIndex], content[blockIndex]];
    setPages(newPages);
  };

  if (loading) {
    return <div className="text-center py-8">Loading module builder...</div>;
  }

  const currentPage = pages[selectedPageIndex];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-7xl h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">E-Learning Module Builder</h2>
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save Module'}
            </button>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors p-2"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          <div className="w-64 border-r border-gray-200 overflow-y-auto bg-gray-50 p-4">
            <div className="mb-4">
              <button
                onClick={addPage}
                className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm"
              >
                <Plus className="w-4 h-4" />
                Add Page
              </button>
            </div>

            <div className="space-y-2">
              {pages.map((page, index) => (
                <div
                  key={index}
                  className={`p-3 rounded-lg cursor-pointer transition-colors ${
                    selectedPageIndex === index
                      ? 'bg-blue-100 border-2 border-blue-500'
                      : 'bg-white border border-gray-200 hover:bg-gray-100'
                  }`}
                  onClick={() => setSelectedPageIndex(index)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-sm text-gray-900">Page {index + 1}</span>
                    <div className="flex gap-1">
                      {index > 0 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            movePage(index, 'up');
                          }}
                          className="p-1 hover:bg-gray-200 rounded"
                        >
                          <MoveUp className="w-3 h-3" />
                        </button>
                      )}
                      {index < pages.length - 1 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            movePage(index, 'down');
                          }}
                          className="p-1 hover:bg-gray-200 rounded"
                        >
                          <MoveDown className="w-3 h-3" />
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deletePage(index);
                        }}
                        className="p-1 hover:bg-red-100 rounded text-red-600"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-gray-600 truncate">{page.title}</p>
                  <p className="text-xs text-gray-500 mt-1">{page.content.length} blocks</p>
                </div>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            {currentPage && (
              <div className="max-w-4xl mx-auto">
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Page Title
                  </label>
                  <input
                    type="text"
                    value={currentPage.title}
                    onChange={(e) => updatePageTitle(selectedPageIndex, e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Content Blocks
                  </label>
                  <div className="flex gap-2 mb-4">
                    <button
                      onClick={() => addContentBlock('text')}
                      className="flex items-center gap-2 bg-gray-100 text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-200 transition-colors text-sm"
                    >
                      <Type className="w-4 h-4" />
                      Text
                    </button>
                    <button
                      onClick={() => addContentBlock('image')}
                      className="flex items-center gap-2 bg-gray-100 text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-200 transition-colors text-sm"
                    >
                      <Image className="w-4 h-4" />
                      Image
                    </button>
                    <button
                      onClick={() => addContentBlock('video')}
                      className="flex items-center gap-2 bg-gray-100 text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-200 transition-colors text-sm"
                    >
                      <Video className="w-4 h-4" />
                      Video
                    </button>
                    <button
                      onClick={() => addContentBlock('quiz')}
                      className="flex items-center gap-2 bg-gray-100 text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-200 transition-colors text-sm"
                    >
                      <List className="w-4 h-4" />
                      Quiz
                    </button>
                  </div>

                  <div className="space-y-4">
                    {currentPage.content.map((block, blockIndex) => (
                      <div key={blockIndex} className="border border-gray-200 rounded-lg p-4 bg-white">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-sm font-medium text-gray-700 capitalize">
                            {block.type} Block
                          </span>
                          <div className="flex gap-1">
                            {blockIndex > 0 && (
                              <button
                                onClick={() => moveContentBlock(blockIndex, 'up')}
                                className="p-1 hover:bg-gray-100 rounded"
                              >
                                <MoveUp className="w-4 h-4" />
                              </button>
                            )}
                            {blockIndex < currentPage.content.length - 1 && (
                              <button
                                onClick={() => moveContentBlock(blockIndex, 'down')}
                                className="p-1 hover:bg-gray-100 rounded"
                              >
                                <MoveDown className="w-4 h-4" />
                              </button>
                            )}
                            <button
                              onClick={() => deleteContentBlock(blockIndex)}
                              className="p-1 hover:bg-red-100 rounded text-red-600"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {block.type === 'text' && (
                          <textarea
                            value={block.content.html}
                            onChange={(e) => updateContentBlock(blockIndex, { html: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-32"
                            placeholder="Enter your text content..."
                          />
                        )}

                        {block.type === 'image' && (
                          <div className="space-y-2">
                            <input
                              type="text"
                              value={block.content.url}
                              onChange={(e) => updateContentBlock(blockIndex, { ...block.content, url: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              placeholder="Image URL"
                            />
                            <input
                              type="text"
                              value={block.content.caption}
                              onChange={(e) => updateContentBlock(blockIndex, { ...block.content, caption: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              placeholder="Image caption (optional)"
                            />
                          </div>
                        )}

                        {block.type === 'video' && (
                          <div className="space-y-2">
                            <input
                              type="text"
                              value={block.content.url}
                              onChange={(e) => updateContentBlock(blockIndex, { ...block.content, url: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              placeholder="YouTube URL or video embed URL"
                            />
                            <input
                              type="text"
                              value={block.content.caption}
                              onChange={(e) => updateContentBlock(blockIndex, { ...block.content, caption: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              placeholder="Video caption (optional)"
                            />
                          </div>
                        )}

                        {block.type === 'quiz' && (
                          <div className="space-y-3">
                            <input
                              type="text"
                              value={block.content.question}
                              onChange={(e) => updateContentBlock(blockIndex, { ...block.content, question: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              placeholder="Question"
                            />
                            {block.content.options.map((option: string, optIndex: number) => (
                              <div key={optIndex} className="flex gap-2">
                                <input
                                  type="radio"
                                  checked={block.content.correctIndex === optIndex}
                                  onChange={() => {
                                    const newContent = { ...block.content, correctIndex: optIndex };
                                    updateContentBlock(blockIndex, newContent);
                                  }}
                                  className="mt-1"
                                />
                                <input
                                  type="text"
                                  value={option}
                                  onChange={(e) => {
                                    const newOptions = [...block.content.options];
                                    newOptions[optIndex] = e.target.value;
                                    updateContentBlock(blockIndex, { ...block.content, options: newOptions });
                                  }}
                                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                  placeholder={`Option ${optIndex + 1}`}
                                />
                                {block.content.options.length > 2 && (
                                  <button
                                    onClick={() => {
                                      const newOptions = block.content.options.filter((_: any, i: number) => i !== optIndex);
                                      updateContentBlock(blockIndex, { ...block.content, options: newOptions });
                                    }}
                                    className="p-2 text-red-600 hover:bg-red-50 rounded"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                            ))}
                            <button
                              onClick={() => {
                                const newOptions = [...block.content.options, ''];
                                updateContentBlock(blockIndex, { ...block.content, options: newOptions });
                              }}
                              className="text-sm text-blue-600 hover:text-blue-700"
                            >
                              + Add Option
                            </button>
                          </div>
                        )}
                      </div>
                    ))}

                    {currentPage.content.length === 0 && (
                      <div className="bg-gray-50 rounded-lg p-8 text-center border-2 border-dashed border-gray-300">
                        <p className="text-gray-600">No content blocks yet. Add some using the buttons above.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
