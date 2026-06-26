import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Clock, AlertCircle, Eye } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { format } from 'date-fns';

interface PendingApproval {
  id: string;
  status: string;
  justification: string;
  evidence_provided: string;
  created_at: string;
  competency_assessment: {
    id: string;
    competency_name: string;
    feedback: string;
    manager_rating: number;
    ai_suggested_rating: number | null;
    ai_coaching_feedback: string | null;
    meeting: {
      id: string;
      employee: {
        full_name: string;
        job_title: string | null;
      };
      manager: {
        full_name: string;
      };
    };
  };
}

export default function CompetencyApprovals() {
  const [pendingApprovals, setPendingApprovals] = useState<PendingApproval[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedApproval, setSelectedApproval] = useState<PendingApproval | null>(null);
  const [processingApproval, setProcessingApproval] = useState(false);
  const [comments, setComments] = useState('');

  useEffect(() => {
    fetchPendingApprovals();
  }, []);

  const fetchPendingApprovals = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('review_approvals')
        .select(`
          id,
          status,
          justification,
          evidence_provided,
          created_at,
          competency_assessment:review_competency_assessments!inner(
            id,
            competency_name,
            feedback,
            manager_rating,
            ai_suggested_rating,
            ai_coaching_feedback,
            meeting:review_meetings!inner(
              id,
              employee:profiles!review_meetings_employee_id_fkey(
                full_name,
                job_title
              ),
              manager:profiles!review_meetings_manager_id_fkey(
                full_name
              )
            )
          )
        `)
        .eq('approver_id', user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPendingApprovals(data || []);
    } catch (error) {
      console.error('Error fetching approvals:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApproval = async (approvalId: string, newStatus: 'approved' | 'rejected') => {
    if (!comments && newStatus === 'rejected') {
      alert('Please provide comments when rejecting an assessment');
      return;
    }

    setProcessingApproval(true);
    try {
      const { error: approvalError } = await supabase
        .from('review_approvals')
        .update({
          status: newStatus,
          comments,
          reviewed_date: new Date().toISOString(),
        })
        .eq('id', approvalId);

      if (approvalError) throw approvalError;

      if (selectedApproval) {
        const { error: assessmentError } = await supabase
          .from('review_competency_assessments')
          .update({
            approval_status: newStatus,
          })
          .eq('id', selectedApproval.competency_assessment.id);

        if (assessmentError) throw assessmentError;
      }

      alert(`Assessment ${newStatus} successfully`);
      setSelectedApproval(null);
      setComments('');
      fetchPendingApprovals();
    } catch (error) {
      console.error('Error processing approval:', error);
      alert('Failed to process approval');
    } finally {
      setProcessingApproval(false);
    }
  };

  const getCategoryColor = (rating: number) => {
    if (rating === 4) return 'bg-purple-100 text-purple-800';
    if (rating === 3) return 'bg-green-100 text-green-800';
    if (rating === 2) return 'bg-blue-100 text-blue-800';
    return 'bg-yellow-100 text-yellow-800';
  };

  if (loading) {
    return <div className="text-center py-12">Loading approvals...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Competency Rating Approvals</h2>
        <p className="text-gray-600 mt-1">
          Review and approve expert-level (rating 4) competency assessments
        </p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
          <div>
            <h3 className="font-semibold text-blue-900">About Expert Rating Approvals</h3>
            <p className="text-sm text-blue-800 mt-1">
              A rating of 4 (Expert) represents exceptional mastery and requires senior manager approval.
              Review the evidence provided, AI coaching feedback, and the manager's justification before
              making your decision.
            </p>
          </div>
        </div>
      </div>

      {pendingApprovals.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <CheckCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-500 text-lg">No pending approvals</p>
          <p className="text-gray-400 text-sm mt-2">All expert ratings have been reviewed</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {pendingApprovals.map((approval) => (
            <div
              key={approval.id}
              className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {approval.competency_assessment.meeting.employee.full_name}
                    </h3>
                    <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-medium rounded-full flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Pending Review
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">
                    {approval.competency_assessment.meeting.employee.job_title || 'No title'} •
                    Managed by {approval.competency_assessment.meeting.manager.full_name}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    Submitted {format(new Date(approval.created_at), 'PPp')}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedApproval(approval)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                >
                  <Eye className="w-4 h-4" />
                  Review
                </button>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <div className="mb-3">
                  <h4 className="font-semibold text-gray-900 mb-1">
                    Competency: {approval.competency_assessment.competency_name}
                  </h4>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">Manager Rating:</span>
                    <span className={`px-2 py-1 text-sm font-medium rounded ${getCategoryColor(approval.competency_assessment.manager_rating)}`}>
                      {approval.competency_assessment.manager_rating} - Expert
                    </span>
                    {approval.competency_assessment.ai_suggested_rating && (
                      <>
                        <span className="text-sm text-gray-600">| AI Suggested:</span>
                        <span className={`px-2 py-1 text-sm font-medium rounded ${
                          approval.competency_assessment.ai_suggested_rating === approval.competency_assessment.manager_rating
                            ? 'bg-green-100 text-green-800'
                            : 'bg-orange-100 text-orange-800'
                        }`}>
                          {approval.competency_assessment.ai_suggested_rating}
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <p className="text-sm text-gray-700 line-clamp-3">
                  {approval.justification || approval.evidence_provided}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedApproval && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full my-8 max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 z-10">
              <h3 className="text-2xl font-bold text-gray-900">
                Review Expert Rating Assessment
              </h3>
              <p className="text-gray-600 mt-1">
                {selectedApproval.competency_assessment.meeting.employee.full_name} •
                {selectedApproval.competency_assessment.competency_name}
              </p>
            </div>

            <div className="p-6 space-y-6">
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">Rating Information</h4>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Manager's Rating</p>
                      <p className="text-lg font-bold text-purple-600">
                        {selectedApproval.competency_assessment.manager_rating} - Expert
                      </p>
                    </div>
                    {selectedApproval.competency_assessment.ai_suggested_rating && (
                      <div>
                        <p className="text-sm text-gray-600">AI Suggested Rating</p>
                        <p className={`text-lg font-bold ${
                          selectedApproval.competency_assessment.ai_suggested_rating === selectedApproval.competency_assessment.manager_rating
                            ? 'text-green-600'
                            : 'text-orange-600'
                        }`}>
                          {selectedApproval.competency_assessment.ai_suggested_rating}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-gray-900 mb-2">Manager's Feedback</h4>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-700 whitespace-pre-line">
                    {selectedApproval.competency_assessment.feedback}
                  </p>
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-gray-900 mb-2">Evidence for Expert Rating</h4>
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                  <p className="text-sm text-gray-700 whitespace-pre-line">
                    {selectedApproval.justification || 'No additional evidence provided'}
                  </p>
                </div>
              </div>

              {selectedApproval.competency_assessment.ai_coaching_feedback && (
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">AI Coaching Feedback</h4>
                  <div className={`rounded-lg p-4 border-2 ${
                    selectedApproval.competency_assessment.ai_suggested_rating === selectedApproval.competency_assessment.manager_rating
                      ? 'bg-green-50 border-green-300'
                      : 'bg-orange-50 border-orange-300'
                  }`}>
                    <p className="text-sm text-gray-700 whitespace-pre-line">
                      {selectedApproval.competency_assessment.ai_coaching_feedback}
                    </p>
                  </div>
                </div>
              )}

              <div>
                <h4 className="font-semibold text-gray-900 mb-2">
                  Your Comments {comments.length === 0 && <span className="text-red-600 text-sm font-normal">(Required for rejection)</span>}
                </h4>
                <textarea
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  placeholder="Add your comments about this assessment..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows={4}
                />
              </div>

              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <button
                  onClick={() => handleApproval(selectedApproval.id, 'approved')}
                  disabled={processingApproval}
                  className="flex-1 bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-400 flex items-center justify-center gap-2"
                >
                  <CheckCircle className="w-5 h-5" />
                  {processingApproval ? 'Processing...' : 'Approve Expert Rating'}
                </button>
                <button
                  onClick={() => handleApproval(selectedApproval.id, 'rejected')}
                  disabled={processingApproval}
                  className="flex-1 bg-red-600 text-white py-3 rounded-lg hover:bg-red-700 transition-colors disabled:bg-gray-400 flex items-center justify-center gap-2"
                >
                  <XCircle className="w-5 h-5" />
                  {processingApproval ? 'Processing...' : 'Reject Rating'}
                </button>
                <button
                  onClick={() => {
                    setSelectedApproval(null);
                    setComments('');
                  }}
                  disabled={processingApproval}
                  className="px-6 bg-gray-200 text-gray-800 py-3 rounded-lg hover:bg-gray-300 transition-colors disabled:bg-gray-100"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
