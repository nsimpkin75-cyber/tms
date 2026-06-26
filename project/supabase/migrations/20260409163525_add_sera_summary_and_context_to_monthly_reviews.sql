/*
  # Add SERA summary and manager additional context to monthly reviews

  ## Changes
  - Adds `sera_draft_summary` text column to `one_to_one_monthly_reviews`
  - Adds `manager_additional_context` text column to `one_to_one_monthly_reviews`
  - Adds `overall_kpi_average` numeric column for aggregated KPI score
  - Adds `kpi_snapshots` jsonb column for storing KPI running averages snapshot

  These fields support the updated 1:1 flow with SERA draft summaries and manager prompts.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'one_to_one_monthly_reviews' AND column_name = 'sera_draft_summary'
  ) THEN
    ALTER TABLE one_to_one_monthly_reviews ADD COLUMN sera_draft_summary text DEFAULT '';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'one_to_one_monthly_reviews' AND column_name = 'manager_additional_context'
  ) THEN
    ALTER TABLE one_to_one_monthly_reviews ADD COLUMN manager_additional_context text DEFAULT '';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'one_to_one_monthly_reviews' AND column_name = 'overall_kpi_average'
  ) THEN
    ALTER TABLE one_to_one_monthly_reviews ADD COLUMN overall_kpi_average numeric(4,2);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'one_to_one_monthly_reviews' AND column_name = 'kpi_snapshots'
  ) THEN
    ALTER TABLE one_to_one_monthly_reviews ADD COLUMN kpi_snapshots jsonb DEFAULT '{}';
  END IF;
END $$;
