/*
  # Add Success Measures and KPIs to Strategic Goals

  1. Updates to strategic_goals table
    - Add `success_criteria` (text) - Description of what success looks like
    - Add `kpi_metrics` (jsonb) - Array of KPI objects with structure:
      [
        {
          "name": "Revenue Growth",
          "target": "£1M",
          "current": "£750K",
          "unit": "currency",
          "description": "Optional description"
        }
      ]
    - Add `target_value` (text) - Simple target value field
    - Add `current_value` (text) - Current progress value
    - Add `measurement_unit` (text) - Unit of measurement (e.g., "%", "£", "count")
  
  2. Important Notes
    - These fields help track and measure goal success
    - KPI metrics can be updated as progress is made
    - Success criteria provides qualitative context
    - All fields are optional to maintain backward compatibility
*/

-- Add success measurement fields to strategic_goals table
DO $$
BEGIN
  -- Add success_criteria field
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'strategic_goals' AND column_name = 'success_criteria'
  ) THEN
    ALTER TABLE strategic_goals ADD COLUMN success_criteria text;
  END IF;
  
  -- Add kpi_metrics field
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'strategic_goals' AND column_name = 'kpi_metrics'
  ) THEN
    ALTER TABLE strategic_goals ADD COLUMN kpi_metrics jsonb DEFAULT '[]'::jsonb;
  END IF;
  
  -- Add target_value field
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'strategic_goals' AND column_name = 'target_value'
  ) THEN
    ALTER TABLE strategic_goals ADD COLUMN target_value text;
  END IF;
  
  -- Add current_value field
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'strategic_goals' AND column_name = 'current_value'
  ) THEN
    ALTER TABLE strategic_goals ADD COLUMN current_value text;
  END IF;
  
  -- Add measurement_unit field
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'strategic_goals' AND column_name = 'measurement_unit'
  ) THEN
    ALTER TABLE strategic_goals ADD COLUMN measurement_unit text;
  END IF;
END $$;

-- Create index for better query performance on kpi_metrics
CREATE INDEX IF NOT EXISTS idx_strategic_goals_kpi_metrics ON strategic_goals USING gin(kpi_metrics);
