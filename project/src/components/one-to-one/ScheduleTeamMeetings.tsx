import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Calendar, Search, Users, CheckCircle, AlertCircle, Clock } from 'lucide-react';

interface ScheduleTeamMeetingsProps {
  cycleId: string;
  onComplete: () => void;
}

interface TeamMember {
  id: string;
  full_name: string;
  job_title: string;
  scheduled: boolean;
  scheduled_datetime?: string;
}

export default function ScheduleTeamMeetings({ cycleId, onComplete }: ScheduleTeamMeetingsProps) {
  const { profile } = useAuth();
  const [mode, setMode] = useState<'choice' | 'individual' | 'all'>('choice');
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [scheduledCount, setScheduledCount] = useState(0);
  const [showSummary, setShowSummary] = useState(false);

  useEffect(() => {
    loadTeamMembers();
  }, [cycleId]);

  async function loadTeamMembers() {
    try {
      setLoading(true);
      const { data: members, error } = await supabase
        .from('profiles')
        .select('id, full_name, job_title')
        .eq('manager_id', profile?.id)
        .eq('active', true)
        .order('full_name');

      if (error) throw error;

      const { data: scheduled, error: schedError } = await supabase
        .from('one_to_one_scheduled_meetings')
        .select('employee_id, scheduled_datetime')
        .eq('cycle_id', cycleId);

      if (schedError) throw schedError;

      const scheduledMap = new Map(
        scheduled?.map(s => [s.employee_id, s.scheduled_datetime]) || []
      );

      const enrichedMembers = members?.map(m => ({
        ...m,
        scheduled: scheduledMap.has(m.id),
        scheduled_datetime: scheduledMap.get(m.id)
      })) || [];

      setTeamMembers(enrichedMembers);
      setScheduledCount(enrichedMembers.filter(m => m.scheduled).length);
    } catch (error) {
      console.error('Error loading team members:', error);
    } finally {
      setLoading(false);
    }
  }

  async function scheduleIndividual(employeeId: string, datetime: string) {
    try {
      const { error } = await supabase
        .from('one_to_one_scheduled_meetings')
        .insert({
          cycle_id: cycleId,
          manager_id: profile?.id,
          employee_id: employeeId,
          scheduled_datetime: datetime,
          status: 'scheduled'
        });

      if (error) throw error;

      setTeamMembers(prev => prev.map(m =>
        m.id === employeeId
          ? { ...m, scheduled: true, scheduled_datetime: datetime }
          : m
      ));
      setScheduledCount(prev => prev + 1);
    } catch (error) {
      console.error('Error scheduling meeting:', error);
      alert('Failed to schedule meeting');
    }
  }

  async function scheduleAllMeetings() {
    try {
      setLoading(true);
      const unscheduled = teamMembers.filter(m => !m.scheduled && m.scheduled_datetime);

      const meetings = unscheduled.map(m => ({
        cycle_id: cycleId,
        manager_id: profile?.id,
        employee_id: m.id,
        scheduled_datetime: m.scheduled_datetime,
        status: 'scheduled'
      }));

      const { error } = await supabase
        .from('one_to_one_scheduled_meetings')
        .insert(meetings);

      if (error) throw error;

      setShowSummary(true);
    } catch (error) {
      console.error('Error scheduling meetings:', error);
      alert('Failed to schedule all meetings');
    } finally {
      setLoading(false);
    }
  }

  function updateMeetingTime(employeeId: string, datetime: string) {
    setTeamMembers(prev => prev.map(m =>
      m.id === employeeId
        ? { ...m, scheduled_datetime: datetime }
        : m
    ));
  }

  function handleConfirmAll() {
    const hasAllDates = teamMembers.every(m => m.scheduled || m.scheduled_datetime);
    if (!hasAllDates) {
      alert('Please set date and time for all team members');
      return;
    }
    setShowSummary(true);
  }

  const filteredMembers = teamMembers.filter(m =>
    m.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.job_title?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (showSummary) {
    const scheduledMembers = teamMembers.filter(m => m.scheduled || m.scheduled_datetime);

    return (
      <div className="space-y-6">
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
          </div>
          <h3 className="text-2xl font-semibold text-gray-900">Review Summary</h3>
          <p className="text-gray-600">
            Please confirm the following schedule before proceeding
          </p>
        </div>

        <div className="bg-white border rounded-lg divide-y max-h-96 overflow-y-auto">
          {scheduledMembers.map(member => (
            <div key={member.id} className="p-4 flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">{member.full_name}</p>
                <p className="text-sm text-gray-500">{member.job_title}</p>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Calendar className="w-4 h-4" />
                {new Date(member.scheduled_datetime!).toLocaleString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit'
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg">
          <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-900">Actions Taken:</p>
            <ul className="text-sm text-gray-600 mt-1 space-y-1">
              <li>{scheduledMembers.length} one-to-one meetings scheduled</li>
              {mode === 'all' && <li>Calendar invites will be sent to all team members</li>}
              <li>Team members will receive reminder notifications</li>
            </ul>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <button
            onClick={() => setShowSummary(false)}
            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
          >
            Back
          </button>
          <button
            onClick={async () => {
              if (mode === 'all') {
                await scheduleAllMeetings();
              }
              onComplete();
            }}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Confirming...' : 'Confirm Schedule'}
          </button>
        </div>
      </div>
    );
  }

  if (mode === 'choice') {
    return (
      <div className="space-y-6">
        <div className="text-center space-y-2">
          <h3 className="text-xl font-semibold text-gray-900">Schedule One-to-One Meetings</h3>
          <p className="text-gray-600">
            How would you like to schedule meetings with your team?
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <button
            onClick={() => setMode('all')}
            className="p-6 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-left group"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-200">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <h4 className="text-lg font-semibold text-gray-900">Schedule All</h4>
            </div>
            <p className="text-sm text-gray-600">
              View your full team list and assign dates and times to everyone at once
            </p>
          </button>

          <button
            onClick={() => setMode('individual')}
            className="p-6 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-left group"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center group-hover:bg-green-200">
                <Search className="w-6 h-6 text-green-600" />
              </div>
              <h4 className="text-lg font-semibold text-gray-900">Schedule Individually</h4>
            </div>
            <p className="text-sm text-gray-600">
              Search for specific team members and schedule meetings one at a time
            </p>
          </button>
        </div>

        {scheduledCount > 0 && (
          <div className="p-4 bg-green-50 rounded-lg flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <span className="text-sm text-gray-700">
              {scheduledCount} of {teamMembers.length} team members already scheduled
            </span>
          </div>
        )}
      </div>
    );
  }

  if (mode === 'individual') {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-semibold text-gray-900">Schedule Individual Meetings</h3>
          <button
            onClick={() => setMode('choice')}
            className="text-sm text-gray-600 hover:text-gray-900"
          >
            Back to Options
          </button>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search team members..."
            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="space-y-3">
          {filteredMembers.map(member => (
            <div key={member.id} className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="font-medium text-gray-900">{member.full_name}</p>
                  <p className="text-sm text-gray-500">{member.job_title}</p>
                </div>
                {member.scheduled && (
                  <span className="flex items-center gap-1 text-sm text-green-600">
                    <CheckCircle className="w-4 h-4" />
                    Scheduled
                  </span>
                )}
              </div>

              {!member.scheduled && (
                <div className="flex items-center gap-3">
                  <input
                    type="datetime-local"
                    onChange={(e) => scheduleIndividual(member.id, e.target.value)}
                    className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                  <button className="px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg">
                    Sync to Calendar
                  </button>
                </div>
              )}

              {member.scheduled && member.scheduled_datetime && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Calendar className="w-4 h-4" />
                  {new Date(member.scheduled_datetime).toLocaleString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit'
                  })}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="flex justify-end">
          <button
            onClick={onComplete}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Done
          </button>
        </div>
      </div>
    );
  }

  if (mode === 'all') {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-semibold text-gray-900">Schedule All Team Members</h3>
          <button
            onClick={() => setMode('choice')}
            className="text-sm text-gray-600 hover:text-gray-900"
          >
            Back to Options
          </button>
        </div>

        <div className="p-4 bg-blue-50 rounded-lg flex items-start gap-3">
          <Clock className="w-5 h-5 text-blue-600 mt-0.5" />
          <p className="text-sm text-gray-700">
            Set date and time for each team member. Calendar invites will be sent once confirmed.
          </p>
        </div>

        <div className="space-y-3 max-h-96 overflow-y-auto">
          {teamMembers.map(member => (
            <div key={member.id} className="border rounded-lg p-4">
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{member.full_name}</p>
                  <p className="text-sm text-gray-500">{member.job_title}</p>
                </div>

                {member.scheduled ? (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">
                      {new Date(member.scheduled_datetime!).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit'
                      })}
                    </span>
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <input
                      type="datetime-local"
                      value={member.scheduled_datetime || ''}
                      onChange={(e) => updateMeetingTime(member.id, e.target.value)}
                      className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                    <Calendar className="w-5 h-5 text-gray-400" />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <button
            onClick={() => setMode('choice')}
            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirmAll}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Review Schedule
          </button>
        </div>
      </div>
    );
  }

  return null;
}
