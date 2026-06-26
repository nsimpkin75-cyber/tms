/*
  # Fix RLS Policy Always True - Security Fix

  1. Purpose
    - Fix RLS policy on assessment_notifications that allows unrestricted access
    - The current policy has WITH CHECK (true) which bypasses security

  2. Changes
    - Replace "System can create notifications" policy with proper security check
    - Only allow authenticated users to create notifications for valid workflows

  3. Security
    - Ensures notifications can only be created for existing workflow records
    - Maintains proper access control
*/

DROP POLICY IF EXISTS "System can create notifications" ON assessment_notifications;

CREATE POLICY "System can create notifications" ON assessment_notifications
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM skills_assessment_workflow
    WHERE id = assessment_notifications.workflow_id
  )
);