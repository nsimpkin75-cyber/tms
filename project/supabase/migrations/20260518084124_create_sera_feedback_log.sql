/*
  # Create SERA Feedback Log

  ## Purpose
  Stores a record of every interaction where SERA validates a rating justification,
  allowing admins to review SERA outputs and manually improve the system prompt and
  knowledge base over time. No automatic model retraining occurs.

  ## New Tables
  - `sera_feedback_log`
    - `id` (uuid, pk)
    - `created_at` (timestamptz) — when SERA ran
    - `logged_by_user_id` (uuid, fk → auth.users) — manager who triggered the validation
    - `employee_name` (text) — employee being reviewed
    - `rating` (integer) — rating selected (1–5)
    - `rating_type` (text) — 'kpi' or 'competency'
    - `item_name` (text) — KPI or competency name
    - `manager_input` (text) — manager comments sent to SERA
    - `sera_response_valid` (boolean) — whether SERA judged justification valid
    - `sera_confidence` (text) — 'high', 'medium', or 'low'
    - `sera_message` (text) — SERA's message shown to manager
    - `sera_prompt` (text) — SERA's improvement suggestion (if any)
    - `sera_summary` (text) — SERA's moderation summary
    - `manager_overrode` (boolean) — whether manager overrode SERA
    - `override_reason` (text) — manager's override explanation
    - `admin_feedback` (text) — 'helpful', 'needs_improvement', or null (not yet reviewed)
    - `admin_notes` (text) — optional admin notes for prompt/KB improvement
    - `admin_reviewed_at` (timestamptz) — when admin gave feedback
    - `admin_reviewed_by` (uuid, fk → auth.users) — which admin reviewed it

  ## Security
  - RLS enabled; restrictive by default
  - Authenticated users can INSERT their own log entries (on validation)
  - Admins can SELECT all entries and UPDATE admin_feedback / admin_notes fields
*/

CREATE TABLE IF NOT EXISTS sera_feedback_log (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at            timestamptz NOT NULL DEFAULT now(),
  logged_by_user_id     uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  employee_name         text NOT NULL DEFAULT '',
  rating                integer NOT NULL DEFAULT 0,
  rating_type           text NOT NULL DEFAULT '',
  item_name             text NOT NULL DEFAULT '',
  manager_input         text NOT NULL DEFAULT '',
  sera_response_valid   boolean,
  sera_confidence       text,
  sera_message          text,
  sera_prompt           text,
  sera_summary          text,
  manager_overrode      boolean NOT NULL DEFAULT false,
  override_reason       text,
  admin_feedback        text CHECK (admin_feedback IN ('helpful', 'needs_improvement')),
  admin_notes           text,
  admin_reviewed_at     timestamptz,
  admin_reviewed_by     uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

ALTER TABLE sera_feedback_log ENABLE ROW LEVEL SECURITY;

-- Index for common query patterns
CREATE INDEX IF NOT EXISTS idx_sera_feedback_log_created_at
  ON sera_feedback_log (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_sera_feedback_log_logged_by
  ON sera_feedback_log (logged_by_user_id);

CREATE INDEX IF NOT EXISTS idx_sera_feedback_log_admin_feedback
  ON sera_feedback_log (admin_feedback);

-- Authenticated users can insert their own log entries
CREATE POLICY "Authenticated users can log their own SERA interactions"
  ON sera_feedback_log
  FOR INSERT
  TO authenticated
  WITH CHECK (logged_by_user_id = auth.uid());

-- Admins can read all log entries
CREATE POLICY "Admins can read all SERA feedback log entries"
  ON sera_feedback_log
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );

-- Admins can update admin_feedback, admin_notes, admin_reviewed_at, admin_reviewed_by
CREATE POLICY "Admins can update feedback on SERA log entries"
  ON sera_feedback_log
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );
