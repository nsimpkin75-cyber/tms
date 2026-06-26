/*
  # Create SERA Career Coach Tables

  ## New Tables

  ### sera_career_coach_sessions
  Stores each career coaching conversation session, including the enriched context
  snapshot used (role, department, team, pathway match, performance avg, length of
  service) and the full message history. This allows admins to review what data
  SERA had access to when responding.

  Columns:
  - id (uuid, pk)
  - user_id (uuid, FK profiles)
  - started_at (timestamptz)
  - last_message_at (timestamptz)
  - messages (jsonb) — array of {role, content, timestamp}
  - context_snapshot (jsonb) — snapshot of career data used at session start
  - matched_pathway_id (uuid, nullable) — job_family that matched employee's role

  ### sera_career_coach_feedback
  Admin feedback on individual SERA career coaching responses, for quality improvement.
  Does NOT affect review ratings, competency scores or moderation workflow.

  Columns:
  - id (uuid, pk)
  - session_id (uuid, FK sera_career_coach_sessions)
  - message_index (int) — which assistant message in the session (0-based)
  - user_id (uuid) — the employee the session was for
  - feedback_rating (text) — 'good' | 'needs_detail' | 'incorrect' | 'missing_data'
  - correction_notes (text, nullable) — admin correction/improvement notes
  - reviewed_by (uuid, FK profiles) — admin who gave feedback
  - reviewed_at (timestamptz)
  - created_at (timestamptz)

  ## Security
  - RLS enabled on both tables
  - Employees can read/insert their own sessions
  - Admins can read all sessions and insert/update feedback
*/

-- ─── Sessions table ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sera_career_coach_sessions (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  started_at          timestamptz NOT NULL DEFAULT now(),
  last_message_at     timestamptz NOT NULL DEFAULT now(),
  messages            jsonb NOT NULL DEFAULT '[]'::jsonb,
  context_snapshot    jsonb NOT NULL DEFAULT '{}'::jsonb,
  matched_pathway_id  uuid REFERENCES job_families(id) ON DELETE SET NULL,
  created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sera_career_sessions_user_id ON sera_career_coach_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sera_career_sessions_started_at ON sera_career_coach_sessions(started_at DESC);

ALTER TABLE sera_career_coach_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own career coach sessions"
  ON sera_career_coach_sessions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own career coach sessions"
  ON sera_career_coach_sessions FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own career coach sessions"
  ON sera_career_coach_sessions FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Admin read-all
CREATE POLICY "Admins can view all career coach sessions"
  ON sera_career_coach_sessions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- ─── Feedback table ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sera_career_coach_feedback (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id       uuid NOT NULL REFERENCES sera_career_coach_sessions(id) ON DELETE CASCADE,
  message_index    integer NOT NULL,
  user_id          uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  feedback_rating  text NOT NULL CHECK (feedback_rating IN ('good', 'needs_detail', 'incorrect', 'missing_data')),
  correction_notes text,
  reviewed_by      uuid NOT NULL REFERENCES profiles(id),
  reviewed_at      timestamptz NOT NULL DEFAULT now(),
  created_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (session_id, message_index)
);

CREATE INDEX IF NOT EXISTS idx_sera_career_feedback_session_id ON sera_career_coach_feedback(session_id);
CREATE INDEX IF NOT EXISTS idx_sera_career_feedback_reviewed_by ON sera_career_coach_feedback(reviewed_by);
CREATE INDEX IF NOT EXISTS idx_sera_career_feedback_created_at ON sera_career_coach_feedback(created_at DESC);

ALTER TABLE sera_career_coach_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all career coach feedback"
  ON sera_career_coach_feedback FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can insert career coach feedback"
  ON sera_career_coach_feedback FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update career coach feedback"
  ON sera_career_coach_feedback FOR UPDATE
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
