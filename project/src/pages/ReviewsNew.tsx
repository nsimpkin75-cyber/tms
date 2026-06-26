import { useAuth } from '../contexts/AuthContext';
import OneToOneReviews from './OneToOneReviews';
import ReviewStatusReport from '../components/admin/ReviewStatusReport';
import MyReviews from '../components/employee/MyReviews';

export default function ReviewsNew() {
  const { effectiveProfile } = useAuth();

  const isManager = effectiveProfile?.role === 'manager' || effectiveProfile?.role === 'leadership' || effectiveProfile?.role === 'admin';
  const isDeptLead = effectiveProfile?.role === 'dept_lead';

  if (isDeptLead) {
    return <ReviewStatusReport />;
  }

  if (!isManager) {
    return <MyReviews />;
  }

  return <OneToOneReviews />;
}
