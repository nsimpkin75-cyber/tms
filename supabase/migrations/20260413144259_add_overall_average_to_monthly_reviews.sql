/*
  # Add overall_average to one_to_one_monthly_reviews

  1. Changes
    - Adds `overall_average` numeric column to `one_to_one_monthly_reviews`
    - This stores the final overall score (average of KPI avg + competency avg) for the monthly review
    - Used by the ReviewFlow component (Step 5 Submit) and surfaced on employee dashboard

  2. Notes
    - Column is nullable — not all reviews will have a calculated average (e.g. in-progress reviews)
    - No default value so that NULL clearly distinguishes "not yet calculated" from "0"
*/

ALTER TABLE one_to_one_monthly_reviews
  ADD COLUMN IF NOT EXISTS overall_average numeric;
