/*
  # Test Data Cleanup

  Deletes:
  1. All review cycle data (scheduled meetings, weekly checkins, monthly reviews, then cycles)
  2. All dummy/test user data and profiles (Test Admin, Test Employee, Test Manager)
  3. The inactive archived user (nicola.hurcombe@eposnow.com, active=false)

  Does NOT touch:
  - Active real users
  - Job families, role profiles, career pathways, learning content
  - Access levels, admin settings, competency framework
*/

-- 1. Delete all review cycle child data first
DELETE FROM one_to_one_weekly_checkins;
DELETE FROM one_to_one_monthly_reviews;
DELETE FROM one_to_one_scheduled_meetings;
DELETE FROM one_to_one_review_cycles;

-- 2. Clean up dummy/test users
DO $$
DECLARE
  dummy_ids uuid[] := ARRAY[
    'faedad54-022b-4d49-9268-2a3449fb9ef7'::uuid,
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,
    'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12'::uuid,
    'e27e9adb-b2fb-446d-9ada-fca85a87934e'::uuid
  ];
BEGIN
  UPDATE profiles SET manager_id = NULL WHERE manager_id = ANY(dummy_ids);
  UPDATE goal_actions SET assigned_to = NULL WHERE assigned_to = ANY(dummy_ids);
  UPDATE strategic_goals SET owner_id = NULL WHERE owner_id = ANY(dummy_ids);

  DELETE FROM user_admin_permissions WHERE user_id = ANY(dummy_ids) OR granted_by = ANY(dummy_ids);
  DELETE FROM skill_assessments WHERE assessed_by = ANY(dummy_ids);
  DELETE FROM performance_ratings WHERE rater_id = ANY(dummy_ids);
  DELETE FROM career_plans WHERE profile_id = ANY(dummy_ids);
  DELETE FROM profiles WHERE id = ANY(dummy_ids);
  DELETE FROM auth.users WHERE id = ANY(dummy_ids);
END $$;
