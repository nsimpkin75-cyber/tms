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