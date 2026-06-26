import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Users, MapPin, Search, BookOpen, CheckCircle, AlertCircle, ChevronLeft, ChevronRight, PlayCircle, Award, Target } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { format, parseISO, addMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isBefore, startOfDay, isSameMonth } from 'date-fns';
import { ModuleViewer } from '../components/training/ModuleViewer';

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
  attendee_count?: number;
  is_booked?: boolean;
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
  is_completed?: boolean;
  is_assigned?: boolean;
  linked_roles?: Array<{ title: string; department: string; is_mandatory: boolean }>;
}

export function Training() {
  const { effectiveProfile, isViewingAs, guardViewAs } = useAuth();
  const [sessions, setSessions] = useState<TrainingSession[]>([]);
  const [courses, setCourses] = useState<TrainingCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSession, setSelectedSession] = useState<TrainingSession | null>(null);
  const [selectedCourse, setSelectedCourse] = useState<TrainingCourse | null>(null);
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [showCourseModal, setShowCourseModal] = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [currentMonthOffset, setCurrentMonthOffset] = useState(0);
  const [showModuleViewer, setShowModuleViewer] = useState(false);
  const [viewingCourse, setViewingCourse] = useState<TrainingCourse | null>(null);

  useEffect(() => {
    fetchSessions();
    fetchCourses();
  }, [effectiveProfile]);

  const fetchSessions = async () => {
    try {
      const { data: sessionsData, error: sessionsError } = await supabase
        .from('training_sessions')
        .select('*')
        .order('date', { ascending: true });

      if (sessionsError) throw sessionsError;

      if (effectiveProfile?.id) {
        const { data: attendeesData } = await supabase
          .from('training_attendees')
          .select('training_session_id')
          .eq('profile_id', effectiveProfile.id);

        const bookedSessionIds = new Set(attendeesData?.map(a => a.training_session_id) || []);

        const sessionsWithCounts = await Promise.all(
          (sessionsData || []).map(async (session) => {
            const { count } = await supabase
              .from('training_attendees')
              .select('*', { count: 'exact', head: true })
              .eq('training_session_id', session.id);

            return {
              ...session,
              attendee_count: count || 0,
              is_booked: bookedSessionIds.has(session.id),
            };
          })
        );

        setSessions(sessionsWithCounts);
      } else {
        setSessions(sessionsData || []);
      }
    } catch (error) {
      console.error('Error fetching training sessions:', error);
    }
  };

  const fetchCourses = async () => {
    try {
      setLoading(true);

      const { data: coursesData, error: coursesError } = await supabase
        .from('training_courses')
        .select('*')
        .order('title', { ascending: true });

      if (coursesError) throw coursesError;

      if (effectiveProfile?.id) {
        const { data: completionsData } = await supabase
          .from('training_completions')
          .select('course_id')
          .eq('user_id', effectiveProfile.id);

        const completedCourseIds = new Set(completionsData?.map(c => c.course_id) || []);

        const { data: developmentPlansData } = await supabase
          .from('career_development_plans')
          .select('required_skills')
          .eq('user_id', effectiveProfile.id)
          .eq('status', 'approved');

        const assignedCourseIds = new Set<string>();
        developmentPlansData?.forEach(plan => {
          if (plan.required_skills && Array.isArray(plan.required_skills)) {
            plan.required_skills.forEach((skill: any) => {
              if (skill.training_course_id) {
                assignedCourseIds.add(skill.training_course_id);
              }
            });
          }
        });

        const { data: moduleLinksData } = await supabase
          .from('training_module_links')
          .select(`
            training_course_id,
            is_mandatory,
            job_families:job_family_id (
              title,
              department
            )
          `);

        const linksByCourse: Record<string, Array<{ title: string; department: string; is_mandatory: boolean }>> = {};
        moduleLinksData?.forEach((link: any) => {
          if (!linksByCourse[link.training_course_id]) {
            linksByCourse[link.training_course_id] = [];
          }
          if (link.job_families) {
            linksByCourse[link.training_course_id].push({
              title: link.job_families.title,
              department: link.job_families.department,
              is_mandatory: link.is_mandatory,
            });
          }
        });

        const enrichedCourses = (coursesData || []).map(course => ({
          ...course,
          is_completed: completedCourseIds.has(course.id),
          is_assigned: assignedCourseIds.has(course.id),
          linked_roles: linksByCourse[course.id] || [],
        }));

        setCourses(enrichedCourses);
      } else {
        setCourses(coursesData || []);
      }
    } catch (error) {
      console.error('Error fetching courses:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBookSession = async (sessionId: string) => {
    if (!effectiveProfile?.id || guardViewAs()) return;

    try {
      setBookingLoading(true);

      const session = sessions.find(s => s.id === sessionId);
      if (!session) return;

      if (session.is_booked) {
        const { error } = await supabase
          .from('training_attendees')
          .delete()
          .eq('training_session_id', sessionId)
          .eq('profile_id', effectiveProfile.id);

        if (error) throw error;
      } else {
        if (session.attendee_count && session.attendee_count >= session.max_attendees) {
          alert('This session is fully booked');
          return;
        }

        const { error } = await supabase
          .from('training_attendees')
          .insert([{
            training_session_id: sessionId,
            profile_id: effectiveProfile.id,
          }]);

        if (error) throw error;
      }

      await fetchSessions();
      if (selectedSession?.id === sessionId) {
        const updatedSession = sessions.find(s => s.id === sessionId);
        if (updatedSession) setSelectedSession(updatedSession);
      }
    } catch (error) {
      console.error('Error booking session:', error);
      alert('Failed to update booking');
    } finally {
      setBookingLoading(false);
    }
  };

  const handleStartCourse = async (courseId: string) => {
    const course = courses.find(c => c.id === courseId);
    if (!course) return;

    if (course.module_type === 'external' && course.module_url) {
      window.open(course.module_url, '_blank');
    } else if (course.module_type === 'custom') {
      setViewingCourse(course);
      setShowModuleViewer(true);
    }
  };

  const handleModuleComplete = async () => {
    if (viewingCourse && effectiveProfile?.id && !guardViewAs()) {
      try {
        await supabase
          .from('training_completions')
          .insert([{
            course_id: viewingCourse.id,
            user_id: effectiveProfile.id,
            completed_at: new Date().toISOString(),
          }]);

        await fetchCourses();
      } catch (error) {
        console.error('Error marking complete:', error);
      }
    }
  };

  const handleMarkComplete = async (courseId: string) => {
    if (!effectiveProfile?.id || guardViewAs()) return;

    try {
      const course = courses.find(c => c.id === courseId);
      if (!course) return;

      if (course.is_completed) {
        const { error } = await supabase
          .from('training_completions')
          .delete()
          .eq('course_id', courseId)
          .eq('user_id', effectiveProfile.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('training_completions')
          .insert([{
            course_id: courseId,
            user_id: effectiveProfile.id,
            completed_at: new Date().toISOString(),
          }]);

        if (error) throw error;
      }

      await fetchCourses();
    } catch (error) {
      console.error('Error updating completion:', error);
      alert('Failed to update completion status');
    }
  };

  const getMonthSessions = (monthOffset: number) => {
    const targetMonth = addMonths(new Date(), monthOffset);
    return sessions.filter(session => {
      const sessionDate = parseISO(session.date);
      return isSameMonth(sessionDate, targetMonth) && !isBefore(sessionDate, startOfDay(new Date()));
    });
  };

  const upcomingSessions = sessions.filter(session => {
    const sessionDate = parseISO(session.date);
    return !isBefore(sessionDate, startOfDay(new Date()));
  }).slice(0, 6);

  const assignedCourses = courses.filter(c => c.is_assigned);
  const availableCourses = courses.filter(c => !c.is_assigned);

  const filteredAvailableCourses = availableCourses.filter(c =>
    searchTerm === '' ||
    c.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'Upskill':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Soft Skill':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'Pathway':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const renderMonthCalendar = (monthOffset: number) => {
    const targetMonth = addMonths(new Date(), monthOffset);
    const monthSessions = getMonthSessions(monthOffset);
    const monthStart = startOfMonth(targetMonth);
    const monthEnd = endOfMonth(targetMonth);
    const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

    return (
      <div className="flex-shrink-0 w-80 bg-white rounded-lg border border-gray-200 p-4">
        <h3 className="text-lg font-bold text-gray-900 mb-3 text-center">
          {format(targetMonth, 'MMMM yyyy')}
        </h3>
        <div className="grid grid-cols-7 gap-1">
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
            <div key={i} className="text-center text-xs font-semibold text-gray-600 py-1">
              {day}
            </div>
          ))}

          {Array(monthStart.getDay()).fill(null).map((_, i) => (
            <div key={`empty-${i}`} className="aspect-square" />
          ))}

          {daysInMonth.map(day => {
            const daySessions = monthSessions.filter(session =>
              isSameDay(parseISO(session.date), day)
            );
            const isToday = isSameDay(day, new Date());
            const isPast = isBefore(day, startOfDay(new Date()));

            return (
              <div
                key={day.toString()}
                className={`aspect-square text-xs flex flex-col items-center justify-center rounded cursor-pointer transition-colors ${
                  isToday ? 'bg-blue-100 font-bold text-blue-900' : ''
                } ${isPast ? 'text-gray-300' : 'text-gray-700'} ${
                  daySessions.length > 0 && !isPast ? 'bg-green-50 hover:bg-green-100' : 'hover:bg-gray-50'
                }`}
                onClick={() => {
                  if (daySessions.length > 0) {
                    setSelectedSession(daySessions[0]);
                    setShowSessionModal(true);
                  }
                }}
              >
                <span>{format(day, 'd')}</span>
                {daySessions.length > 0 && !isPast && (
                  <div className="w-1 h-1 bg-green-600 rounded-full mt-0.5" />
                )}
              </div>
            );
          })}
        </div>
        {monthSessions.length > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-200">
            <p className="text-xs text-gray-600 font-medium">
              {monthSessions.length} session{monthSessions.length !== 1 ? 's' : ''} available
            </p>
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return <div className="text-center py-8">Loading training resources...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Training & Development</h1>
        <p className="text-gray-600 mt-2">Book live training sessions and complete self-learning modules</p>
      </div>

      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">Training Calendar</h2>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentMonthOffset(Math.max(0, currentMonthOffset - 1))}
              disabled={currentMonthOffset === 0}
              className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={() => setCurrentMonthOffset(currentMonthOffset + 1)}
              className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex gap-4 overflow-x-auto pb-4">
          {[0, 1, 2, 3].map(offset => renderMonthCalendar(currentMonthOffset + offset))}
        </div>
      </div>

      <div className="mb-8">
        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Calendar className="w-6 h-6" />
          Upcoming Sessions
        </h2>
        {upcomingSessions.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {upcomingSessions.map(session => {
              const sessionDate = parseISO(session.date);
              const isFull = session.attendee_count && session.attendee_count >= session.max_attendees;

              return (
                <div
                  key={session.id}
                  className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => {
                    setSelectedSession(session);
                    setShowSessionModal(true);
                  }}
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-gray-900 flex-1">{session.title}</h3>
                    {session.is_booked && (
                      <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 ml-2" />
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mb-3">{session.trainer_name}</p>

                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-gray-600">
                      <Calendar className="w-4 h-4" />
                      <span>{format(sessionDate, 'MMM dd, yyyy')}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600">
                      <Clock className="w-4 h-4" />
                      <span>{session.time}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getTypeColor(session.type)}`}>
                        {session.type}
                      </span>
                      <span className="text-gray-600 text-xs">
                        {session.attendee_count || 0}/{session.max_attendees}
                        {isFull && <span className="text-red-600 ml-1 font-medium">(Full)</span>}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-gray-50 rounded-lg border border-gray-200 p-8 text-center">
            <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600">No upcoming training sessions scheduled</p>
          </div>
        )}
      </div>

      <div className="border-t border-gray-200 pt-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <BookOpen className="w-7 h-7" />
              Self-Learning Modules
            </h2>
            <p className="text-gray-600 mt-1">Complete courses at your own pace</p>
          </div>
        </div>

        {assignedCourses.length > 0 && (
          <div className="mb-8">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Target className="w-5 h-5 text-orange-600" />
              Assigned to You ({assignedCourses.length})
            </h3>
            <div className="grid gap-4 md:grid-cols-2">
              {assignedCourses.map(course => (
                <div
                  key={course.id}
                  className="bg-orange-50 border-2 border-orange-200 rounded-lg p-5 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-semibold text-gray-900 flex-1">{course.title}</h4>
                    {course.is_completed && (
                      <Award className="w-5 h-5 text-green-600 flex-shrink-0 ml-2" />
                    )}
                  </div>

                  {course.description && (
                    <p className="text-sm text-gray-700 mb-3 line-clamp-2">{course.description}</p>
                  )}

                  <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
                    <Clock className="w-4 h-4" />
                    <span>{course.duration_minutes} minutes</span>
                    <span className="px-2 py-0.5 bg-orange-100 text-orange-800 rounded text-xs font-medium ml-2">
                      {course.category}
                    </span>
                  </div>

                  {course.linked_roles && course.linked_roles.length > 0 && (
                    <div className="mb-3">
                      <p className="text-xs font-medium text-gray-600 mb-1">Supports roles:</p>
                      <div className="flex flex-wrap gap-1">
                        {course.linked_roles.map((role, idx) => (
                          <span
                            key={idx}
                            className={`px-2 py-0.5 rounded text-xs ${
                              role.is_mandatory
                                ? 'bg-red-100 text-red-800 border border-red-200'
                                : 'bg-blue-100 text-blue-800 border border-blue-200'
                            }`}
                            title={`${role.department} - ${role.is_mandatory ? 'Mandatory' : 'Optional'}`}
                          >
                            {role.title}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2">
                    {(course.module_url || course.module_type === 'custom') && (
                      <button
                        onClick={() => handleStartCourse(course.id)}
                        className="flex-1 flex items-center justify-center gap-2 bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors text-sm font-medium"
                      >
                        <PlayCircle className="w-4 h-4" />
                        {course.is_completed ? 'Review' : 'Start'}
                      </button>
                    )}
                    <button
                      onClick={() => handleMarkComplete(course.id)}
                      className={`px-4 py-2 rounded-lg transition-colors text-sm font-medium ${
                        course.is_completed
                          ? 'bg-green-100 text-green-700 hover:bg-green-200'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {course.is_completed ? 'Completed' : 'Mark Complete'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-900">
              All Available Modules ({availableCourses.length})
            </h3>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search modules..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {filteredAvailableCourses.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredAvailableCourses.map(course => (
                <div
                  key={course.id}
                  className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-semibold text-gray-900 flex-1">{course.title}</h4>
                    {course.is_completed && (
                      <Award className="w-5 h-5 text-green-600 flex-shrink-0 ml-2" />
                    )}
                  </div>

                  {course.description && (
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">{course.description}</p>
                  )}

                  <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
                    <Clock className="w-4 h-4" />
                    <span>{course.duration_minutes} min</span>
                    <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs font-medium ml-2">
                      {course.category}
                    </span>
                  </div>

                  {course.linked_roles && course.linked_roles.length > 0 && (
                    <div className="mb-3">
                      <p className="text-xs font-medium text-gray-600 mb-1">Supports roles:</p>
                      <div className="flex flex-wrap gap-1">
                        {course.linked_roles.slice(0, 3).map((role, idx) => (
                          <span
                            key={idx}
                            className={`px-2 py-0.5 rounded text-xs ${
                              role.is_mandatory
                                ? 'bg-red-100 text-red-800 border border-red-200'
                                : 'bg-blue-100 text-blue-800 border border-blue-200'
                            }`}
                            title={`${role.department} - ${role.is_mandatory ? 'Mandatory' : 'Optional'}`}
                          >
                            {role.title}
                          </span>
                        ))}
                        {course.linked_roles.length > 3 && (
                          <span className="text-xs text-gray-500">+{course.linked_roles.length - 3}</span>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2">
                    {(course.module_url || course.module_type === 'custom') && (
                      <button
                        onClick={() => handleStartCourse(course.id)}
                        className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                      >
                        <PlayCircle className="w-4 h-4" />
                        {course.is_completed ? 'Review' : 'Start'}
                      </button>
                    )}
                    <button
                      onClick={() => handleMarkComplete(course.id)}
                      className={`px-3 py-2 rounded-lg transition-colors text-sm font-medium ${
                        course.is_completed
                          ? 'bg-green-100 text-green-700 hover:bg-green-200'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {course.is_completed ? 'Completed' : 'Mark Complete'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-gray-50 rounded-lg border border-gray-200 p-8 text-center">
              <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600">No modules found</p>
            </div>
          )}
        </div>
      </div>

      {showSessionModal && selectedSession && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h2 className="text-2xl font-bold text-gray-900">{selectedSession.title}</h2>
                    {selectedSession.is_booked && (
                      <CheckCircle className="w-6 h-6 text-green-600" />
                    )}
                  </div>
                  <p className="text-gray-600">{selectedSession.trainer_name}</p>
                </div>
                <button
                  onClick={() => setShowSessionModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors ml-4"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              <div className="flex items-center gap-2">
                <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getTypeColor(selectedSession.type)}`}>
                  {selectedSession.type}
                </span>
                <span className={`px-3 py-1 rounded-full text-sm font-medium border ${
                  selectedSession.method === 'Remote'
                    ? 'bg-blue-100 text-blue-800 border-blue-200'
                    : 'bg-orange-100 text-orange-800 border-orange-200'
                }`}>
                  {selectedSession.method}
                </span>
              </div>

              {selectedSession.description && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Description</h3>
                  <p className="text-gray-700 leading-relaxed">{selectedSession.description}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-gray-600 mb-1">
                    <Calendar className="w-5 h-5" />
                    <span className="font-medium">Date</span>
                  </div>
                  <p className="text-gray-900">{format(parseISO(selectedSession.date), 'MMMM dd, yyyy')}</p>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-gray-600 mb-1">
                    <Clock className="w-5 h-5" />
                    <span className="font-medium">Time</span>
                  </div>
                  <p className="text-gray-900">{selectedSession.time}</p>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-gray-600 mb-1">
                    <MapPin className="w-5 h-5" />
                    <span className="font-medium">Method</span>
                  </div>
                  <p className="text-gray-900">{selectedSession.method}</p>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-gray-600 mb-1">
                    <Users className="w-5 h-5" />
                    <span className="font-medium">Availability</span>
                  </div>
                  <p className="text-gray-900">
                    {selectedSession.attendee_count || 0} / {selectedSession.max_attendees}
                  </p>
                </div>
              </div>
            </div>

            <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4">
              {!isBefore(parseISO(selectedSession.date), startOfDay(new Date())) ? (
                selectedSession.is_booked ? (
                  <button
                    onClick={() => handleBookSession(selectedSession.id)}
                    disabled={bookingLoading}
                    className="w-full bg-red-600 text-white py-3 px-4 rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-50"
                  >
                    {bookingLoading ? 'Cancelling...' : 'Cancel Booking'}
                  </button>
                ) : (
                  <button
                    onClick={() => handleBookSession(selectedSession.id)}
                    disabled={bookingLoading || (selectedSession.attendee_count && selectedSession.attendee_count >= selectedSession.max_attendees)}
                    className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {bookingLoading ? 'Booking...' : selectedSession.attendee_count && selectedSession.attendee_count >= selectedSession.max_attendees ? 'Session Full' : 'Book This Session'}
                  </button>
                )
              ) : (
                <div className="bg-gray-100 text-gray-600 py-3 px-4 rounded-lg text-center font-medium">
                  This session has already passed
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showModuleViewer && viewingCourse && (
        <ModuleViewer
          courseId={viewingCourse.id}
          courseTitle={viewingCourse.title}
          onClose={() => {
            setShowModuleViewer(false);
            setViewingCourse(null);
          }}
          onComplete={handleModuleComplete}
        />
      )}
    </div>
  );
}
