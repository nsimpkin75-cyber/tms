
-- Fix always-true WITH CHECK on notification INSERT policies.
-- Replace WITH CHECK (true) with a meaningful recipient-existence check.

-- career_plan_notifications: recipient is user_id
DROP POLICY IF EXISTS "System can insert career_plan_notifications" ON public.career_plan_notifications;
CREATE POLICY "System can insert career_plan_notifications"
  ON public.career_plan_notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = user_id)
  );

-- review_notifications: recipient is recipient_id
DROP POLICY IF EXISTS "System can insert review notifications" ON public.review_notifications;
CREATE POLICY "System can insert review notifications"
  ON public.review_notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = recipient_id)
  );

-- strategy_notifications: recipient is user_id
DROP POLICY IF EXISTS "System can create strategy notifications" ON public.strategy_notifications;
CREATE POLICY "System can create strategy notifications"
  ON public.strategy_notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = user_id)
  );
