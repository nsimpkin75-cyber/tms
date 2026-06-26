import { useState, useEffect } from 'react';
import { Calendar, Plus, User, Clock, CheckCircle2, Circle, FileText } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { format } from 'date-fns';
import { OneToOneReviewForm } from '../components/manager/OneToOneReviewForm';

interface TeamMember {
  id: string;
  full_name: string;
  email: string;
  department: string;
  tenure: number;
}

interface Review {
  id: string;
  user_id: string;
  reviewer_id: string;
  rating: number;
  feedback: string;
  review_date: string;
  profiles: {
    full_name: string;
    email: string;
  };
}

interface ReviewCycle {
  id: string;
  cycle_name: string;
  status: string;
  start_date: string;
  end_date: string;
}

interface ReviewInstance {
  id: string;
  employee_id: string;
  status: string;
  template_type: string;
  total_weekly_checkins: number;
  total_monthly_reviews: number;
  half_year_unlocked: boolean;
  last_weekly_checkin_date: string | null;
  last_monthly_review_date: string | null;
}

interface ActionItem {
  id: string;
  text: string;
  due_date: string;
  completed: boolean;
  is_carry_over: boolean;
}

export function Reviews() {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<'team' | 'schedule' | 'history'>('team');
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [reviewCycles, setReviewCycles] = useState<ReviewCycle[]>([]);
  const [reviewInstances, setReviewInstances] = useState<ReviewInstance[]>([]);
  const [selectedReviewInstanceId, setSelectedReviewInstanceId] = useState<string | null>(null);

  useEffect(() => {
    if (!profile) return;

    if (profile.role === 'manager' || profile.role === 'leadership') {
      loadTeamMembers();
      loadReviews();
      loadReviewCycles();
      loadReviewInstances();
    } else {
      loadMyReviews();
    }
  }, [profile]);

  async function loadReviewCycles() {
    if (!profile?.id) return;

    try {
      const { data, error } = await supabase
        .from('review_cycles')
        .select('*')
        .eq('manager_id', profile.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setReviewCycles(data || []);
    } catch (error) {
      console.error('Error loading review cycles:', error);
    }
  }

  async function loadReviewInstances() {
    if (!profile?.id) return;

    try {
      const { data, error } = await supabase
        .from('review_instances')
        .select('*')
        .eq('manager_id', profile.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setReviewInstances(data || []);
    } catch (error) {
      console.error('Error loading review instances:', error);
    }
  }

  async function loadTeamMembers() {
    if (!profile?.id) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, department, tenure')
        .eq('manager_id', profile.id)
        .order('full_name');

      if (error) throw error;
      setTeamMembers(data || []);
    } catch (error) {
      console.error('Error loading team members:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadReviews() {
    if (!profile?.id) return;

    try {
      const { data, error } = await supabase
        .from('reviews')
        .select(`
          *,
          profiles:user_id (full_name, email)
        `)
        .eq('reviewer_id', profile.id)
        .order('review_date', { ascending: false });

      if (error) throw error;
      setReviews(data || []);
    } catch (error) {
      console.error('Error loading reviews:', error);
    }
  }

  async function loadMyReviews() {
    if (!profile?.id) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('reviews')
        .select(`
          *,
          profiles:reviewer_id (full_name, email)
        `)
        .eq('user_id', profile.id)
        .order('review_date', { ascending: false });

      if (error) throw error;
      setReviews(data || []);
      setLoading(false);
    } catch (error) {
      console.error('Error loading reviews:', error);
      setLoading(false);
    }
  }

  const isManager = profile?.role === 'manager' || profile?.role === 'leadership';

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">One-to-One Reviews</h1>
          <p className="text-slate-600 mt-2">
            {isManager ? 'Manage team reviews and development conversations' : 'View your performance reviews'}
          </p>
        </div>
        {isManager && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn-primary flex items-center gap-2 self-start sm:self-center"
          >
            <Plus className="w-5 h-5" />
            Create Review
          </button>
        )}
      </div>

      {isManager ? (
        <>
          <div className="flex gap-2 border-b border-slate-200">
            <button
              onClick={() => setActiveTab('team')}
              className={`px-6 py-3 font-medium transition-colors ${
                activeTab === 'team'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              My Team
            </button>
            <button
              onClick={() => setActiveTab('schedule')}
              className={`px-6 py-3 font-medium transition-colors ${
                activeTab === 'schedule'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Schedule
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-6 py-3 font-medium transition-colors ${
                activeTab === 'history'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              History
            </button>
          </div>

          <div className="mt-6">
            {activeTab === 'team' && (
              <TeamView
                members={teamMembers}
                reviewInstances={reviewInstances}
                onSelectMember={setSelectedMember}
                onOpenReview={setSelectedReviewInstanceId}
              />
            )}
            {activeTab === 'schedule' && <ScheduleView />}
            {activeTab === 'history' && <HistoryView reviews={reviews} />}
          </div>
        </>
      ) : (
        <HistoryView reviews={reviews} isEmployee={true} />
      )}

      {showCreateModal && (
        <CreateReviewModal
          teamMembers={teamMembers}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            loadReviews();
          }}
        />
      )}

      {selectedReviewInstanceId && (
        <OneToOneReviewForm
          reviewInstanceId={selectedReviewInstanceId}
          onClose={() => setSelectedReviewInstanceId(null)}
          onSave={() => {
            loadReviewInstances();
            setSelectedReviewInstanceId(null);
          }}
        />
      )}
    </div>
  );
}

function TeamView({
  members,
  reviewInstances,
  onSelectMember,
  onOpenReview
}: {
  members: TeamMember[];
  reviewInstances: ReviewInstance[];
  onSelectMember: (member: TeamMember) => void;
  onOpenReview: (instanceId: string) => void;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {members.map((member) => {
        const memberInstance = reviewInstances.find(ri => ri.employee_id === member.id);

        return (
          <div key={member.id} className="card hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <User className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">{member.full_name}</h3>
                  <p className="text-sm text-slate-600">{member.email}</p>
                  <p className="text-xs text-slate-500 mt-1">{member.tenure} years tenure</p>
                </div>
              </div>
            </div>

            {memberInstance && (
              <div className="mb-3 p-3 bg-slate-50 rounded-lg">
                <div className="flex items-center justify-between text-xs mb-2">
                  <span className="text-slate-600">Review Status</span>
                  <span className={`px-2 py-1 rounded-full font-medium ${
                    memberInstance.status === 'completed' ? 'bg-green-100 text-green-700' :
                    memberInstance.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                    memberInstance.status === 'overdue' ? 'bg-red-100 text-red-700' :
                    'bg-slate-100 text-slate-700'
                  }`}>
                    {memberInstance.status}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-slate-500">Weekly:</span>
                    <span className="ml-1 font-medium text-slate-700">{memberInstance.total_weekly_checkins}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Monthly:</span>
                    <span className="ml-1 font-medium text-slate-700">{memberInstance.total_monthly_reviews}</span>
                  </div>
                </div>
                {memberInstance.half_year_unlocked && (
                  <div className="mt-2 flex items-center gap-1 text-xs text-purple-600">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Half-year unlocked</span>
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-2">
              {memberInstance ? (
                <button
                  onClick={() => onOpenReview(memberInstance.id)}
                  className="flex-1 btn-primary text-sm flex items-center justify-center gap-2"
                >
                  <FileText className="w-4 h-4" />
                  View Reviews
                </button>
              ) : (
                <div className="flex-1 text-center text-xs text-slate-500 py-2">
                  No active review cycle
                </div>
              )}
              <button
                onClick={() => onSelectMember(member)}
                className="flex-1 btn-secondary text-sm"
              >
                View Details
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ScheduleView() {
  const quarters = [
    { name: 'Q1 2026', months: ['January', 'February', 'March'], scheduled: 12 },
    { name: 'Q2 2026', months: ['April', 'May', 'June'], scheduled: 11 },
    { name: 'Q3 2026', months: ['July', 'August', 'September'], scheduled: 8 },
    { name: 'Q4 2026', months: ['October', 'November', 'December'], scheduled: 10 },
  ];

  return (
    <div className="space-y-6">
      <div className="card bg-blue-50 border-blue-200">
        <div className="flex items-start gap-3">
          <Calendar className="w-5 h-5 text-blue-600 mt-1" />
          <div>
            <h3 className="font-semibold text-blue-900">Annual Review Schedule</h3>
            <p className="text-sm text-blue-700 mt-1">
              Plan and schedule one-to-one reviews with your team throughout the year
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {quarters.map((quarter) => (
          <div key={quarter.name} className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900">{quarter.name}</h3>
              <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                {quarter.scheduled} scheduled
              </span>
            </div>
            <div className="space-y-2">
              {quarter.months.map((month) => (
                <div key={month} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                  <span className="text-sm text-slate-700">{month}</span>
                  <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                    Schedule
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function HistoryView({ reviews, isEmployee = false }: { reviews: Review[]; isEmployee?: boolean }) {
  if (reviews.length === 0) {
    return (
      <div className="card text-center py-12">
        <Clock className="w-12 h-12 text-slate-400 mx-auto mb-3" />
        <p className="text-slate-600">No reviews yet</p>
        <p className="text-sm text-slate-500 mt-1">
          {isEmployee ? 'Your manager will schedule your first review soon' : 'Create your first review to get started'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {reviews.map((review) => (
        <div key={review.id} className="card hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center">
                  <User className="w-5 h-5 text-slate-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">{review.profiles.full_name}</h3>
                  <p className="text-sm text-slate-600">{review.profiles.email}</p>
                </div>
              </div>
              <div className="ml-13">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm text-slate-500">
                    {format(new Date(review.review_date), 'dd MMMM yyyy')}
                  </span>
                  <span className="text-slate-300">•</span>
                  <div className="flex items-center gap-1">
                    {[...Array(5)].map((_, i) => (
                      <div
                        key={i}
                        className={`w-4 h-4 rounded-full ${
                          i < review.rating ? 'bg-yellow-400' : 'bg-slate-200'
                        }`}
                      />
                    ))}
                  </div>
                </div>
                <p className="text-slate-700">{review.feedback}</p>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function CreateReviewModal({
  teamMembers,
  onClose,
  onSuccess,
}: {
  teamMembers: TeamMember[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { profile } = useAuth();
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [rating, setRating] = useState(3);
  const [feedback, setFeedback] = useState('');
  const [wins, setWins] = useState('');
  const [blockers, setBlockers] = useState('');
  const [kpis, setKpis] = useState('');
  const [values, setValues] = useState('');
  const [actionItems, setActionItems] = useState<string[]>(['']);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: reviewData, error: reviewError } = await supabase
        .from('reviews')
        .insert({
          user_id: selectedMemberId,
          reviewer_id: profile?.id,
          rating,
          feedback,
        })
        .select()
        .single();

      if (reviewError) throw reviewError;

      const reviewItems = [];
      if (wins) reviewItems.push({ review_id: reviewData.id, category: 'Wins', content: wins, rating });
      if (blockers) reviewItems.push({ review_id: reviewData.id, category: 'Blockers', content: blockers, rating });
      if (kpis) reviewItems.push({ review_id: reviewData.id, category: 'KPI', content: kpis, rating });
      if (values) reviewItems.push({ review_id: reviewData.id, category: 'Values', content: values, rating });

      if (reviewItems.length > 0) {
        const { error: itemsError } = await supabase
          .from('review_items')
          .insert(reviewItems);

        if (itemsError) throw itemsError;
      }

      const actions = actionItems
        .filter(item => item.trim())
        .map(text => ({
          owner_id: selectedMemberId,
          text: text.trim(),
          completed: false,
        }));

      if (actions.length > 0) {
        const { error: actionsError } = await supabase
          .from('action_items')
          .insert(actions);

        if (actionsError) throw actionsError;
      }

      onSuccess();
    } catch (error) {
      console.error('Error creating review:', error);
      alert('Failed to create review');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4">
          <h2 className="text-2xl font-bold text-slate-900">Create One-to-One Review</h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Team Member
            </label>
            <select
              value={selectedMemberId}
              onChange={(e) => setSelectedMemberId(e.target.value)}
              className="input-field"
              required
            >
              <option value="">Select a team member</option>
              {teamMembers.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.full_name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Overall Rating
            </label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setRating(value)}
                  className={`w-12 h-12 rounded-full transition-colors ${
                    value <= rating
                      ? 'bg-yellow-400 hover:bg-yellow-500'
                      : 'bg-slate-200 hover:bg-slate-300'
                  }`}
                >
                  {value}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Summary Feedback
            </label>
            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              className="input-field min-h-[100px]"
              placeholder="Provide overall feedback and key highlights from this review..."
              required
            />
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Wins
              </label>
              <textarea
                value={wins}
                onChange={(e) => setWins(e.target.value)}
                className="input-field min-h-[80px]"
                placeholder="Key achievements and successes..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Blockers
              </label>
              <textarea
                value={blockers}
                onChange={(e) => setBlockers(e.target.value)}
                className="input-field min-h-[80px]"
                placeholder="Challenges and obstacles..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                KPIs
              </label>
              <textarea
                value={kpis}
                onChange={(e) => setKpis(e.target.value)}
                className="input-field min-h-[80px]"
                placeholder="Key performance indicators..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Values
              </label>
              <textarea
                value={values}
                onChange={(e) => setValues(e.target.value)}
                className="input-field min-h-[80px]"
                placeholder="Demonstration of company values..."
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Action Items
            </label>
            <div className="space-y-2">
              {actionItems.map((item, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    type="text"
                    value={item}
                    onChange={(e) => {
                      const newItems = [...actionItems];
                      newItems[index] = e.target.value;
                      setActionItems(newItems);
                    }}
                    className="input-field flex-1"
                    placeholder="Action item..."
                  />
                  {actionItems.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setActionItems(actionItems.filter((_, i) => i !== index))}
                      className="px-3 text-red-600 hover:text-red-700"
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={() => setActionItems([...actionItems, ''])}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                + Add Action Item
              </button>
            </div>
          </div>

          <div className="flex gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 btn-secondary"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 btn-primary"
              disabled={loading}
            >
              {loading ? 'Creating...' : 'Create Review'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
