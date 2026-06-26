import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { CheckCircle, XCircle, Edit3, AlertCircle, FileText } from 'lucide-react';

interface ApprovalRequest {
  id: string;
  review_id: string;
  competency_rating_id: string;
  employee_id: string;
  manager_id: string;
  rating_type: string;
  rating_value: number;
  justification: string;
  evidence: string;
  status: string;
  submitted_at: string;
  employee: {
    full_name: string;
    job_title: string;
    department: string;
  };
  manager: {
    full_name: string;
  };
}

export default function RatingApprovalWorkflow() {
  const { profile } = useAuth();
  const [approvals, setApprovals] = useState<ApprovalRequest[]>([]);
  const [selectedApproval, setSelectedApproval] = useState<ApprovalRequest | null>(null);
  const [approverComments, setApproverComments] = useState('');
  const [moderatedRating, setModeratedRating] = useState<number | null>(null);
  const [moderationReason, setModerationReason] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (profile?.id) {
      loadApprovals();
    }
  }, [profile]);

  async function loadApprovals() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('review_rating_approvals')
        .select(`
          *,
          employee:profiles!employee_id (
            full_name,
            job_title,
            department
          ),
          manager:profiles!manager_id (
            full_name
          )
        `)
        .eq('approver_id', profile?.id)
        .eq('status', 'pending')
        .order('submitted_at', { ascending: false });

      if (error) throw error;
      setApprovals(data || []);
    } catch (error) {
      console.error('Error loading approvals:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleApprove() {
    if (!selectedApproval) return;

    try {
      setLoading(true);

      const { error } = await supabase
        .from('review_rating_approvals')
        .update({
          status: 'approved',
          approver_comments: approverComments,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', selectedApproval.id);

      if (error) throw error;

      // Notify manager
      await supabase.from('review_notifications').insert({
        recipient_id: selectedApproval.manager_id,
        sender_id: profile?.id,
        notification_type: 'rating_approved',
        title: 'Rating 4 Approved',
        message: `Your rating of 4 for ${selectedApproval.employee.full_name} has been approved`,
        related_review_id: selectedApproval.review_id
      });

      // Notify employee
      await supabase.from('review_notifications').insert({
        recipient_id: selectedApproval.employee_id,
        sender_id: profile?.id,
        notification_type: 'rating_approved',
        title: 'Exceptional Performance Recognized',
        message: 'Your exceptional performance rating has been approved by leadership',
        related_review_id: selectedApproval.review_id
      });

      alert('Rating approved successfully!');
      setSelectedApproval(null);
      setApproverComments('');
      loadApprovals();

    } catch (error) {
      console.error('Error approving rating:', error);
      alert('Failed to approve rating');
    } finally {
      setLoading(false);
    }
  }

  async function handleModerate() {
    if (!selectedApproval || !moderatedRating || !moderationReason) {
      alert('Please provide a moderated rating and reason');
      return;
    }

    try {
      setLoading(true);

      // Update approval record
      const { error: approvalError } = await supabase
        .from('review_rating_approvals')
        .update({
          status: 'moderated',
          approver_comments: approverComments,
          moderated_rating: moderatedRating,
          moderation_reason: moderationReason,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', selectedApproval.id);

      if (approvalError) throw approvalError;

      // Update the actual competency rating
      if (selectedApproval.competency_rating_id) {
        const { error: ratingError } = await supabase
          .from('review_competency_ratings')
          .update({
            actual_rating: moderatedRating,
            requires_approval: false
          })
          .eq('id', selectedApproval.competency_rating_id);

        if (ratingError) throw ratingError;
      }

      // Notify manager with feedback
      await supabase.from('review_notifications').insert({
        recipient_id: selectedApproval.manager_id,
        sender_id: profile?.id,
        notification_type: 'rating_moderated',
        title: 'Rating Moderated',
        message: `The rating for ${selectedApproval.employee.full_name} has been adjusted to ${moderatedRating}. Reason: ${moderationReason}`,
        related_review_id: selectedApproval.review_id
      });

      alert('Rating moderated successfully!');
      setSelectedApproval(null);
      setApproverComments('');
      setModeratedRating(null);
      setModerationReason('');
      loadApprovals();

    } catch (error) {
      console.error('Error moderating rating:', error);
      alert('Failed to moderate rating');
    } finally {
      setLoading(false);
    }
  }

  async function handleReject() {
    if (!selectedApproval || !approverComments) {
      alert('Please provide comments explaining the rejection');
      return;
    }

    try {
      setLoading(true);

      const { error } = await supabase
        .from('review_rating_approvals')
        .update({
          status: 'rejected',
          approver_comments: approverComments,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', selectedApproval.id);

      if (error) throw error;

      // Notify manager
      await supabase.from('review_notifications').insert({
        recipient_id: selectedApproval.manager_id,
        sender_id: profile?.id,
        notification_type: 'rating_rejected',
        title: 'Rating Not Approved',
        message: `The rating of 4 for ${selectedApproval.employee.full_name} requires additional justification`,
        related_review_id: selectedApproval.review_id
      });

      alert('Rating rejected. Manager will be asked to provide more justification.');
      setSelectedApproval(null);
      setApproverComments('');
      loadApprovals();

    } catch (error) {
      console.error('Error rejecting rating:', error);
      alert('Failed to reject rating');
    } finally {
      setLoading(false);
    }
  }

  if (selectedApproval) {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <button
            onClick={() => setSelectedApproval(null)}
            className="mb-4 text-gray-600 hover:text-gray-900"
          >
            ← Back to Approvals
          </button>

          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Rating Approval Review</h2>
                <p className="text-gray-600">
                  {selectedApproval.employee.full_name} - {selectedApproval.employee.job_title}
                </p>
                <p className="text-sm text-gray-500">{selectedApproval.employee.department}</p>
              </div>
              <span className="px-4 py-2 bg-orange-100 text-orange-800 text-lg font-bold rounded-full">
                Rating: {selectedApproval.rating_value}
              </span>
            </div>

            <div className="border-t border-gray-200 pt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Manager: {selectedApproval.manager.full_name}
                </label>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Submitted: {new Date(selectedApproval.submitted_at).toLocaleDateString()}
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Manager's Justification
                </label>
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-gray-800">{selectedApproval.justification}</p>
                </div>
              </div>

              {selectedApproval.evidence && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Evidence Provided
                  </label>
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-gray-800">{selectedApproval.evidence}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="border-t border-gray-200 pt-6 space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Your Comments
              </label>
              <textarea
                value={approverComments}
                onChange={(e) => setApproverComments(e.target.value)}
                rows={4}
                placeholder="Provide your assessment and any feedback..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              />
            </div>

            <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
                <Edit3 className="w-5 h-5 mr-2" />
                Moderate Rating (Optional)
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                If you believe the rating should be adjusted, select the appropriate rating and provide a reason.
              </p>

              <div className="grid grid-cols-4 gap-2 mb-4">
                {[1, 2, 3, 4].map((rating) => (
                  <button
                    key={rating}
                    onClick={() => setModeratedRating(rating)}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      moderatedRating === rating
                        ? 'bg-blue-600 text-white'
                        : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {rating}
                  </button>
                ))}
              </div>

              {moderatedRating && moderatedRating !== selectedApproval.rating_value && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Reason for Moderation *
                  </label>
                  <textarea
                    value={moderationReason}
                    onChange={(e) => setModerationReason(e.target.value)}
                    rows={3}
                    placeholder="Explain why you're adjusting this rating..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              )}
            </div>

            <div className="flex gap-4">
              <button
                onClick={handleReject}
                disabled={loading || !approverComments}
                className="flex-1 flex items-center justify-center px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                <XCircle className="w-5 h-5 mr-2" />
                Reject - Needs More Evidence
              </button>

              {moderatedRating && moderatedRating !== selectedApproval.rating_value ? (
                <button
                  onClick={handleModerate}
                  disabled={loading || !moderationReason}
                  className="flex-1 flex items-center justify-center px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50"
                >
                  <Edit3 className="w-5 h-5 mr-2" />
                  Moderate to Rating {moderatedRating}
                </button>
              ) : (
                <button
                  onClick={handleApprove}
                  disabled={loading}
                  className="flex-1 flex items-center justify-center px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  <CheckCircle className="w-5 h-5 mr-2" />
                  Approve Rating 4
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Rating Approvals</h2>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading approval requests...</p>
          </div>
        ) : approvals.length === 0 ? (
          <div className="text-center py-12">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <p className="text-gray-600">No pending approval requests</p>
          </div>
        ) : (
          <div className="space-y-4">
            {approvals.map((approval) => (
              <div
                key={approval.id}
                onClick={() => setSelectedApproval(approval)}
                className="border border-orange-200 bg-orange-50 rounded-lg p-4 hover:border-orange-400 transition-colors cursor-pointer"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <AlertCircle className="w-5 h-5 text-orange-600" />
                      <h3 className="font-semibold text-gray-900">
                        {approval.employee.full_name}
                      </h3>
                      <span className="px-3 py-1 bg-orange-600 text-white text-sm font-bold rounded-full">
                        Rating: {approval.rating_value}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">
                      {approval.employee.job_title} • {approval.employee.department}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      Manager: {approval.manager.full_name}
                    </p>
                    <p className="text-sm text-gray-500">
                      Submitted: {new Date(approval.submitted_at).toLocaleDateString()}
                    </p>
                  </div>
                  <FileText className="w-5 h-5 text-gray-400" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
