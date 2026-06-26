/*
  # Add template_title to one_to_one_review_cycles

  Adds a new `template_title` column to `one_to_one_review_cycles`.

  ## Changes
  - `one_to_one_review_cycles`: new nullable text column `template_title`
    - Stores a human-readable identifier such as "Specialist", "IC4", "Monthly 1:1"
    - Nullable so existing rows are unaffected
*/

ALTER TABLE one_to_one_review_cycles
  ADD COLUMN IF NOT EXISTS template_title text;
