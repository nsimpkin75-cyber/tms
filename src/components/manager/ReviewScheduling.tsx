import React, { useState, useEffect } from 'react';
import { Calendar, Plus, Clock, CheckCircle, AlertCircle, FileText } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { format } from 'date-fns';

interface ReviewMeeting {
  id: string;
  employee_id: string;
  meeting_type: 'weekly_checkin' | 'monthly_review';
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  scheduled_date: string;
  completed_date: string | null;
  agenda: string | null;
  employee: {
    full_name: string;
    email: string;
    job_title: string | null;
  };
}

interface TeamMember {
  id: string;
  full_name: string;
  email: string;
  job_title: string | null;
}

interface ReviewSchedulingProps {
  onStartReview: (meetingId: string, meetingType: 'weekly_checkin' | 'monthly_review') => void;
}

export default function ReviewScheduling({ onStartReview }: ReviewSchedulingProps) {
  const [meetings, setMeetings] = useState<ReviewMeeting[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'all' | 'scheduled' | 'completed'>('all');
  const [formData, setFormData] = useState({
    employee_id: '',
    meeting_type: 'weekly_checkin' as 'weekly_checkin' | 'monthly_review',
    scheduled_date: '',
    agenda: '',
  });

  useEffect(() => {
    fetchMeetings();
    fetchTeamMembers();
  }, []);

  const fetchMeetings = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('review_meetings')
        .select(`
          id,
          employee_id,
          meeting_type,
          status,
          scheduled_date,
          completed_date,
          agenda,
          employee:profiles!review_meetings_employee_id_fkey(
            full_name,
            email,
            job_title
          )
        `)
        .eq('manager_id', user.id)
        .order('scheduled_date', { ascending: false });

      if (error) throw error;
      setMeetings(data || []);
    } catch (error) {
      console.error('Error fetching meetings:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTeamMembers = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, job_title')
        .eq('manager_id', user.id)
        .eq('active', true)
        .order('full_name', { ascending: true });

      if (error) throw error;
      setTeamMembers(data || []);
    } catch (error) {
      console.error('Error fetching team members:', error);
    }
  };

  const handleSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase.from('review_meetings').insert({
        manager_id: user.id,
        employee_id: formData.employee_id,
        meeting_type: formData.meeting_type,
        scheduled_date: formData.scheduled_date,
        agenda: formData.agenda || null,
        status: 'scheduled',
      });

      if (error) throw error;

      setShowScheduleModal(false);
      resetForm();
      fetchMeetings();
    } catch (error) {
      console.error('Error scheduling meeting:', error);
      alert('Failed to schedule meeting');
    }
  };

  const handleCancelMeeting = async (meetingId: string) => {
    if (!confirm('Are you sure you want to cancel this meeting?')) return;

    try {
      const { error } = await supabase
        .from('review_meetings')
        .update({ status: 'cancelled' })
        .eq('id', meetingId);

      if (error) throw error;
      fetchMeetings();
    } catch (error) {
      console.error('Error cancelling meeting:', error);
      alert('Failed to cancel meeting');
    }
  };

  const resetForm = () => {
    setFormData({
      employee_id: '',
      meeting_type: 'weekly_checkin',
      scheduled_date: '',
      agenda: '',
    });
  };

  const filteredMeetings = meetings.filter((meeting) => {
    if (filterStatus === 'all') return meeting.status !== 'cancelled';
    if (filterStatus === 'scheduled') return meeting.status === 'scheduled' || meeting.status === 'in_progress';
    if (filterStatus === 'completed') return meeting.status === 'completed';
    return true;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled':
        return 'bg-blue-100 text-blue-800';
      case 'in_progress':
        return 'bg-yellow-100 text-yellow-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getMeetingTypeLabel = (type: string) => {
    return type === 'weekly_checkin' ? 'Weekly Check-in' : 'Monthly Review';
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">One-to-One Reviews</h2>
          <p className="text-gray-600 mt-1">Schedule and manage reviews with your team</p>
        </div>
        <button
          onClick={() => setShowScheduleModal(true)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Schedule Review
        </button>
      </div>

      <div className="flex gap-2 border-b border-gray-200">
        <button
          onClick={() => setFilterStatus('all')}
          className={`px-4 py-2 font-medium transition-colors ${
            filterStatus === 'all'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          All
        </button>
        <button
          onClick={() => setFilterStatus('scheduled')}
          className={`px-4 py-2 font-medium transition-colors ${
            filterStatus === 'scheduled'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Upcoming
        </button>
        <button
          onClick={() => setFilterStatus('completed')}
          className={`px-4 py-2 font-medium transition-colors ${
            filterStatus === 'completed'
              ? 'text-green-600 border-b-2 border-green-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Completed
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12">Loading...</div>
      ) : filteredMeetings.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-500 text-lg">No meetings found</p>
          <p className="text-gray-400 text-sm mt-2">Schedule your first one-to-one review</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredMeetings.map((meeting) => (
            <div
              key={meeting.id}
              className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {meeting.employee.full_name}
                    </h3>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(meeting.status)}`}>
                      {meeting.status.replace('_', ' ')}
                    </span>
                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">
                      {getMeetingTypeLabel(meeting.meeting_type)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-1">{meeting.employee.job_title || 'No title'}</p>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Clock className="w-4 h-4" />
                    <span>
                      {format(new Date(meeting.scheduled_date), 'PPp')}
                    </span>
                  </div>
                  {meeting.agenda && (
                    <p className="text-sm text-gray-600 mt-3 p-3 bg-gray-50 rounded">
                      <strong>Agenda:</strong> {meeting.agenda}
                    </p>
                  )}
                </div>
                <div className="flex gap-2 ml-4">
                  {meeting.status === 'scheduled' && (
                    <>
                      <button
                        onClick={() => onStartReview(meeting.id, meeting.meeting_type)}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                      >
                        Start Review
                      </button>
                      <button
                        onClick={() => handleCancelMeeting(meeting.id)}
                        className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-sm"
                      >
                        Cancel
                      </button>
                    </>
                  )}
                  {meeting.status === 'in_progress' && (
                    <button
                      onClick={() => onStartReview(meeting.id, meeting.meeting_type)}
                      className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors text-sm"
                    >
                      Continue
                    </button>
                  )}
                  {meeting.status === 'completed' && (
                    <button
                      onClick={() => onStartReview(meeting.id, meeting.meeting_type)}
                      className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-sm flex items-center gap-2"
                    >
                      <FileText className="w-4 h-4" />
                      View Report
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showScheduleModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Schedule One-to-One Review</h3>
            <form onSubmit={handleSchedule}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Team Member
                  </label>
                  <select
                    value={formData.employee_id}
                    onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">Select team member</option>
                    {teamMembers.map((member) => (
                      <option key={member.id} value={member.id}>
                        {member.full_name} - {member.job_title || 'No title'}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Meeting Type
                  </label>
                  <select
                    value={formData.meeting_type}
                    onChange={(e) =>
                      setFormData({ ...formData, meeting_type: e.target.value as 'weekly_checkin' | 'monthly_review' })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="weekly_checkin">Weekly Check-in</option>
                    <option value="monthly_review">Monthly Review</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    {formData.meeting_type === 'weekly_checkin'
                      ? 'Focus on KPIs and project actions'
                      : 'Comprehensive review with AI summary of weekly data'}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date & Time
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.scheduled_date}
                    onChange={(e) => setFormData({ ...formData, scheduled_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Agenda (Optional)
                  </label>
                  <textarea
                    value={formData.agenda}
                    onChange={(e) => setFormData({ ...formData, agenda: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    rows={3}
                    placeholder="What topics would you like to discuss?"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Schedule
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowScheduleModal(false);
                    resetForm();
                  }}
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
