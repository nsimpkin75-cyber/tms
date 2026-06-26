/*
  # Review Status: Rescheduled Tracking and Reporting Access

  ## Summary
  Supports the new review status logic by:
  1. Adding `original_scheduled_datetime` to track when a meeting date is changed
     so "Rescheduled" status can be detected (original date set, current date differs).
  2. Adding SELECT policies on scheduled meetings, weekly check-ins, and monthly reviews
     so admin (any role='admin') and dept_lead users can read reviews for reporting.
     Dept_lead access is scoped to their own department via profiles.

  ## Changes
  - `one_to_one_scheduled_meetings`: new nullable column `original_scheduled_datetime`
  - New RLS SELECT policies on meetings, weekly check-ins, monthly reviews for admin + dept_lead

  ## Notes
  - No data is deleted or altered
  - Submission logic is untouched
  - Existing manager/employee policies are unchanged
*/

-- 1. Add original_scheduled_datetime to track rescheduling
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'one_to_one_scheduled_meetings'
      AND column_name = 'original_scheduled_datetime'
  ) THEN
    ALTER TABLE one_to_one_scheduled_meetings
      ADD COLUMN original_scheduled_datetime timestamptz;
  END IF;
END $$;

-- 2. Admin can read all scheduled meetings
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'one_to_one_scheduled_meetings'
      AND policyname = 'Admin can view all scheduled meetings'
  ) THEN
    CREATE POLICY "Admin can view all scheduled meetings"
      ON one_to_one_scheduled_meetings FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM profiles
          WHERE id = (SELECT auth.uid())
            AND role = 'admin'
        )
      );
  END IF;
END $$;

-- 3. Dept lead can read scheduled meetings in their department
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'one_to_one_scheduled_meetings'
      AND policyname = 'Dept lead can view meetings in own department'
  ) THEN
    CREATE POLICY "Dept lead can view meetings in own department"
      ON one_to_one_scheduled_meetings FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM profiles lead
          WHERE lead.id = (SELECT auth.uid())
            AND lead.role = 'dept_lead'
            AND EXISTS (
              SELECT 1 FROM profiles emp
              WHERE emp.id = one_to_one_scheduled_meetings.employee_id
                AND emp.department = lead.department
            )
        )
      );
  END IF;
END $$;

-- 4. Admin can read all weekly check-ins
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'one_to_one_weekly_checkins'
      AND policyname = 'Admin can view all weekly checkins'
  ) THEN
    CREATE POLICY "Admin can view all weekly checkins"
      ON one_to_one_weekly_checkins FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM profiles
          WHERE id = (SELECT auth.uid())
            AND role = 'admin'
        )
      );
  END IF;
END $$;

-- 5. Dept lead can read weekly check-ins in their department
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'one_to_one_weekly_checkins'
      AND policyname = 'Dept lead can view weekly checkins in own department'
  ) THEN
    CREATE POLICY "Dept lead can view weekly checkins in own department"
      ON one_to_one_weekly_checkins FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM profiles lead
          WHERE lead.id = (SELECT auth.uid())
            AND lead.role = 'dept_lead'
            AND EXISTS (
              SELECT 1 FROM profiles emp
              WHERE emp.id = one_to_one_weekly_checkins.employee_id
                AND emp.department = lead.department
            )
        )
      );
  END IF;
END $$;

-- 6. Admin can read all monthly reviews
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'one_to_one_monthly_reviews'
      AND policyname = 'Admin can view all monthly reviews'
  ) THEN
    CREATE POLICY "Admin can view all monthly reviews"
      ON one_to_one_monthly_reviews FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM profiles
          WHERE id = (SELECT auth.uid())
            AND role = 'admin'
        )
      );
  END IF;
END $$;

-- 7. Dept lead can read monthly reviews in their department
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'one_to_one_monthly_reviews'
      AND policyname = 'Dept lead can view monthly reviews in own department'
  ) THEN
    CREATE POLICY "Dept lead can view monthly reviews in own department"
      ON one_to_one_monthly_reviews FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM profiles lead
          WHERE lead.id = (SELECT auth.uid())
            AND lead.role = 'dept_lead'
            AND EXISTS (
              SELECT 1 FROM profiles emp
              WHERE emp.id = one_to_one_monthly_reviews.employee_id
                AND emp.department = lead.department
            )
        )
      );
  END IF;
END $$;
