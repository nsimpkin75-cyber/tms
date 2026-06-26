/*
  # Add per-competency moderation support

  ## Summary
  Extends moderation_cases to store per-competency decisions from Dept Lead and Exec
  moderators, and extends review_notifications to carry competency-level context.

  ## Changes

  ### moderation_cases
  - `dept_lead_decisions` (JSONB): array of per-competency decisions from Dept Lead
    Each entry: { competency_id, competency_name, original_rating, dl_rating, dl_comment, action: 'approved'|'adjusted', decided_at }
  - `exec_decisions` (JSONB): array of per-competency decisions from Exec
    Each entry: { competency_id, competency_name, original_rating, dl_rating, final_rating, exec_comment, action: 'approved'|'adjusted', decided_at }
  - `dl_overall_comment` (text): optional overall DL comment (existing `reviewer_comments` repurposed)
  - `exec_overall_comment` (text): optional overall exec comment

  ### review_notifications
  - `competency_name` (text): name of the specific competency the notification is about
  - `original_rating` (integer): the rating before moderation
  - `moderated_rating` (integer): the final moderated rating
  - `moderator_level` (text): 'dept_lead' or 'exec'
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'moderation_cases' AND column_name = 'dept_lead_decisions'
  ) THEN
    ALTER TABLE moderation_cases ADD COLUMN dept_lead_decisions JSONB DEFAULT '[]'::jsonb;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'moderation_cases' AND column_name = 'exec_decisions'
  ) THEN
    ALTER TABLE moderation_cases ADD COLUMN exec_decisions JSONB DEFAULT '[]'::jsonb;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'moderation_cases' AND column_name = 'dl_overall_comment'
  ) THEN
    ALTER TABLE moderation_cases ADD COLUMN dl_overall_comment text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'moderation_cases' AND column_name = 'exec_overall_comment'
  ) THEN
    ALTER TABLE moderation_cases ADD COLUMN exec_overall_comment text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'review_notifications' AND column_name = 'competency_name'
  ) THEN
    ALTER TABLE review_notifications ADD COLUMN competency_name text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'review_notifications' AND column_name = 'original_rating'
  ) THEN
    ALTER TABLE review_notifications ADD COLUMN original_rating integer;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'review_notifications' AND column_name = 'moderated_rating'
  ) THEN
    ALTER TABLE review_notifications ADD COLUMN moderated_rating integer;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'review_notifications' AND column_name = 'moderator_level'
  ) THEN
    ALTER TABLE review_notifications ADD COLUMN moderator_level text;
  END IF;
END $$;
