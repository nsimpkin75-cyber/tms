/*
  # Fix RLS Policies That Are Always True
  
  1. Security Fix
    - Remove policies with WITH CHECK (true) that bypass RLS
    - Add proper restrictions based on roles and relationships
  
  2. Tables Updated
    - half_year_review_summaries
    - performance_ratings
    - review_notifications
  
  3. Security
    - Ensures authenticated users cannot bypass RLS
    - Adds role-based restrictions
    - Maintains audit trail while enforcing security
*/

-- Half Year Review Summaries
-- Remove the always-true policy and replace with role-based access
DROP POLICY IF EXISTS "System can insert half year summaries" ON half_year_review_summaries;
CREATE POLICY "Managers can insert half year summaries"
  ON half_year_review_summaries FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM review_meetings rm
      WHERE rm.id = meeting_id
      AND rm.manager_id = (select auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (select auth.uid())
      AND role = 'admin'
    )
  );

-- Performance Ratings
-- Remove always-true policies and add proper restrictions
DROP POLICY IF EXISTS "System can insert ratings" ON performance_ratings;
CREATE POLICY "Managers can insert ratings"
  ON performance_ratings FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM review_meetings rm
      WHERE rm.id = review_meeting_id
      AND rm.manager_id = (select auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (select auth.uid())
      AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "System can update ratings" ON performance_ratings;
CREATE POLICY "Managers can update ratings"
  ON performance_ratings FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM review_meetings rm
      WHERE rm.id = review_meeting_id
      AND rm.manager_id = (select auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (select auth.uid())
      AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM review_meetings rm
      WHERE rm.id = review_meeting_id
      AND rm.manager_id = (select auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (select auth.uid())
      AND role = 'admin'
    )
  );

-- Review Notifications
-- Keep the policy but rename to be more explicit about its purpose
-- This is intentionally permissive for the notification system but requires authentication
DROP POLICY IF EXISTS "System can create notifications" ON review_notifications;
CREATE POLICY "Authenticated users can create notifications"
  ON review_notifications FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Allow managers to create notifications for their team
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = (select auth.uid())
      AND (
        p.role IN ('manager', 'leadership', 'admin')
        OR p.id = sender_id
      )
    )
  );
