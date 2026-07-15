/*
# Password Management & Security Audit Log

## Summary
Adds first-login password change enforcement and a full security audit log.

## Changes

### Modified Tables
- `profiles`
  - `must_change_password` (boolean, default false): flagged true when admin creates an account
    or triggers an admin password reset. Cleared to false once the user sets their own password.
  - `password_changed_at` (timestamptz): records the last time the user changed their password.

### New Tables
- `security_audit_log`
  - Immutable append-only log of all password-related and security events.
  - Columns: id (uuid PK), event_type (text), actor_id (uuid → profiles), target_user_id (uuid → profiles),
    target_email (text), ip_address (text), user_agent (text), metadata (jsonb), created_at (timestamptz).
  - event_type values: 'password_changed', 'password_reset_requested', 'password_reset_completed',
    'admin_password_reset', 'account_created', 'account_deactivated', 'account_activated', 'login_success', 'login_failed'.

## Security
- RLS enabled on security_audit_log.
- Admins can SELECT all rows.
- Authenticated users can SELECT only their own rows (where target_user_id = auth.uid()).
- INSERT is allowed only from service role (edge functions) via a single service-role-only policy.
- No UPDATE or DELETE policies — the log is append-only.
- profiles must_change_password update allowed by existing profile update policies (user updates own, admin updates any).
*/

-- Add must_change_password and password_changed_at to profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'must_change_password'
  ) THEN
    ALTER TABLE profiles ADD COLUMN must_change_password boolean NOT NULL DEFAULT false;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'password_changed_at'
  ) THEN
    ALTER TABLE profiles ADD COLUMN password_changed_at timestamptz;
  END IF;
END $$;

-- Create security_audit_log table
CREATE TABLE IF NOT EXISTS security_audit_log (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type      text NOT NULL,
  actor_id        uuid REFERENCES profiles(id) ON DELETE SET NULL,
  target_user_id  uuid REFERENCES profiles(id) ON DELETE SET NULL,
  target_email    text,
  ip_address      text,
  user_agent      text,
  metadata        jsonb,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- Index for fast per-user lookups
CREATE INDEX IF NOT EXISTS idx_security_audit_log_target_user ON security_audit_log(target_user_id);
CREATE INDEX IF NOT EXISTS idx_security_audit_log_actor ON security_audit_log(actor_id);
CREATE INDEX IF NOT EXISTS idx_security_audit_log_created ON security_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_audit_log_event_type ON security_audit_log(event_type);

ALTER TABLE security_audit_log ENABLE ROW LEVEL SECURITY;

-- Admins can read all audit log entries
DROP POLICY IF EXISTS "admins_select_audit_log" ON security_audit_log;
CREATE POLICY "admins_select_audit_log" ON security_audit_log
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Users can read their own audit log entries
DROP POLICY IF EXISTS "users_select_own_audit_log" ON security_audit_log;
CREATE POLICY "users_select_own_audit_log" ON security_audit_log
  FOR SELECT TO authenticated
  USING (target_user_id = auth.uid());

-- INSERT is restricted to service role only (edge functions use service role key)
-- No INSERT policy for anon/authenticated — service role bypasses RLS
-- This means only edge functions with the service key can write audit entries.
