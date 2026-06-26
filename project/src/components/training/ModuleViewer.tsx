import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, X, CheckCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface ContentBlock {
  type: 'text' | 'image' | 'video' | 'quiz';
  content: any;
}

interface ModulePage {
  id: string;
  title: string;
  sort_order: number;
  content: ContentBlock[];
}

interface ModuleViewerProps {
  courseId: string;
  courseTitle: string;
  onClose: () => void;
  onComplete?: () => void;
}

export function ModuleViewer({ courseId, courseTitle, onClose, onComplete }: ModuleViewerProps) {
  const [pages, setPages] = useState<ModulePage[]>([]);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [quizAnswers, setQuizAnswers] = useState<Record<string, number>>({});

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

      setPages(data || []);
    } catch (error) {
      console.error('Error fetching pages:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    if (currentPageIndex < pages.length - 1) {
      setCurrentPageIndex(currentPageIndex + 1);
      window.scrollTo(0, 0);
    }
  };

  const handlePrevious = () => {
    if (currentPageIndex > 0) {
      setCurrentPageIndex(currentPageIndex - 1);
      window.scrollTo(0, 0);
    }
  };

  const handleComplete = () => {
    if (onComplete) {
      onComplete();
    }
    onClose();
  };

  const getYoutubeEmbedUrl = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    if (match && match[2].length === 11) {
      return `https://www.youtube.com/embed/${match[2]}`;
    }
    return url;
  };

  const renderContentBlock = (block: ContentBlock, index: number) => {
    const blockKey = `${currentPageIndex}-${index}`;

    switch (block.type) {
      case 'text':
        return (
          <div
            key={index}
            className="prose max-w-none"
            dangerouslySetInnerHTML={{ __html: block.content.html || '' }}
          />
        );

      case 'image':
        return (
          <div key={index} className="my-6">
            {block.content.url && (
              <img
                src={block.content.url}
                alt={block.content.caption || 'Module image'}
                className="max-w-full h-auto rounded-lg shadow-md"
              />
            )}
            {block.content.caption && (
              <p className="text-sm text-gray-600 text-center mt-2">{block.content.caption}</p>
            )}
          </div>
        );

      case 'video':
        const embedUrl = block.content.url ? getYoutubeEmbedUrl(block.content.url) : '';
        return (
          <div key={index} className="my-6">
            {embedUrl && (
              <div className="aspect-video">
                <iframe
                  src={embedUrl}
                  className="w-full h-full rounded-lg shadow-md"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            )}
            {block.content.caption && (
              <p className="text-sm text-gray-600 text-center mt-2">{block.content.caption}</p>
            )}
          </div>
        );

      case 'quiz':
        const selectedAnswer = quizAnswers[blockKey];
        const isAnswered = selectedAnswer !== undefined;
        const isCorrect = isAnswered && selectedAnswer === block.content.correctIndex;

        return (
          <div key={index} className="my-6 bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h4 className="font-semibold text-gray-900 mb-4">{block.content.question}</h4>
            <div className="space-y-3">
              {block.content.options.map((option: string, optIndex: number) => {
                const isSelected = selectedAnswer === optIndex;
                const isCorrectOption = optIndex === block.content.correctIndex;

                return (
                  <label
                    key={optIndex}
                    className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                      isAnswered
                        ? isCorrectOption
                          ? 'bg-green-100 border-2 border-green-500'
                          : isSelected
                          ? 'bg-red-100 border-2 border-red-500'
                          : 'bg-white border border-gray-200'
                        : 'bg-white border border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name={blockKey}
                      checked={isSelected}
                      onChange={() => setQuizAnswers({ ...quizAnswers, [blockKey]: optIndex })}
                      disabled={isAnswered}
                      className="mt-1"
                    />
                    <span className="flex-1 text-gray-900">{option}</span>
                    {isAnswered && isCorrectOption && (
                      <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                    )}
                  </label>
                );
              })}
            </div>
            {isAnswered && (
              <div className={`mt-4 p-3 rounded-lg ${isCorrect ? 'bg-green-100' : 'bg-red-100'}`}>
                <p className={`text-sm font-medium ${isCorrect ? 'text-green-800' : 'text-red-800'}`}>
                  {isCorrect ? 'Correct!' : 'Incorrect. The correct answer is highlighted above.'}
                </p>
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8">
          <p className="text-gray-900">Loading module...</p>
        </div>
      </div>
    );
  }

  if (pages.length === 0) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg p-8 max-w-md">
          <p className="text-gray-900 mb-4">This module has no content yet.</p>
          <button
            onClick={onClose}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  const currentPage = pages[currentPageIndex];
  const progress = ((currentPageIndex + 1) / pages.length) * 100;
  const isLastPage = currentPageIndex === pages.length - 1;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
      <div className="bg-white w-full max-w-4xl my-8 mx-4 rounded-lg shadow-xl flex flex-col max-h-[90vh]">
        <div className="flex-shrink-0 border-b border-gray-200">
          <div className="flex items-center justify-between p-6">
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-gray-900">{courseTitle}</h2>
              <p className="text-sm text-gray-600 mt-1">
                Page {currentPageIndex + 1} of {pages.length}: {currentPage.title}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors ml-4"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          <div className="h-2 bg-gray-200">
            <div
              className="h-full bg-blue-600 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-8">
          <h3 className="text-xl font-bold text-gray-900 mb-6">{currentPage.title}</h3>
          <div className="space-y-6">
            {currentPage.content.map((block, index) => renderContentBlock(block, index))}
          </div>
        </div>

        <div className="flex-shrink-0 border-t border-gray-200 p-6 bg-gray-50">
          <div className="flex items-center justify-between">
            <button
              onClick={handlePrevious}
              disabled={currentPageIndex === 0}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-5 h-5" />
              Previous
            </button>

            <div className="flex items-center gap-2">
              {pages.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentPageIndex(index)}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    index === currentPageIndex ? 'bg-blue-600' : 'bg-gray-300 hover:bg-gray-400'
                  }`}
                  aria-label={`Go to page ${index + 1}`}
                />
              ))}
            </div>

            {isLastPage ? (
              <button
                onClick={handleComplete}
                className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
              >
                <CheckCircle className="w-5 h-5" />
                Complete
              </button>
            ) : (
              <button
                onClick={handleNext}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Next
                <ChevronRight className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
