/*
  # Add manual_kpi_entries to one_to_one_monthly_reviews

  Adds a JSONB column to store manually entered KPI data when no weekly
  check-ins exist or no review cycle is linked.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'one_to_one_monthly_reviews' AND column_name = 'manual_kpi_entries'
  ) THEN
    ALTER TABLE one_to_one_monthly_reviews ADD COLUMN manual_kpi_entries jsonb DEFAULT '[]'::jsonb;
  END IF;
END $$;
