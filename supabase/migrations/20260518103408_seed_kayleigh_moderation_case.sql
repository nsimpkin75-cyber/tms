/*
  # Seed moderation case for Kayleigh Lacasse

  Creates a moderation_cases row for Kayleigh Lacasse's May 2026 monthly review
  which has an overall_average of 4.58 (all 6 competencies rated 5/5).

  - employee_id: Kayleigh Lacasse
  - manager_id: Zachariah Taylor (her manager from the monthly review)
  - source_type: competency_assessment
  - source_id: the monthly review id
  - original_rating / current_rating: 5 (highest competency average)
  - manager_justification: pulled from the review's first competency comment
  - ai_summary: summarised SERA recommendation for context
  - status: pending, current_step: 1
*/

INSERT INTO moderation_cases (
  workflow_id,
  source_type,
  source_id,
  meeting_id,
  employee_id,
  manager_id,
  original_rating,
  current_rating,
  manager_justification,
  ai_validation_status,
  ai_summary,
  current_step,
  status
)
SELECT
  '1d07ee47-3b01-4bd7-91e2-54c065270141',
  'competency_assessment',
  'b311cfb4-fa7f-4a83-b554-88d1f535b0a9',
  NULL,
  '21a6f71c-63cd-4c84-9680-4bcf5a9262ed',
  'f96cfe0b-ba59-4553-9567-dca555b3ac2d',
  5,
  5,
  'All 6 competencies rated 5/5 (Exceptional). Key evidence: KPIs met and exceeded; resolved PJS Restaurant same-day; owns corporate account reporting independently; uses AI daily in customer communication.',
  'flagged',
  'All competencies rated 5 (Exceptional). SERA flagged several justifications as lacking measurable impact evidence. While behaviour descriptions are present, stronger outcome metrics (e.g. CSAT scores, resolution times, revenue impact) would strengthen this rating. Recommend dept lead reviews evidence quality before passing to exec.',
  1,
  'pending'
WHERE NOT EXISTS (
  SELECT 1 FROM moderation_cases
  WHERE source_id = 'b311cfb4-fa7f-4a83-b554-88d1f535b0a9'
);
