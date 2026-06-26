/*
  # Backfill oto_cycle_id on scheduled meetings for existing assigned employees

  ## Problem
  Employees assigned to review templates before the placeholder-meeting fix was deployed
  have no scheduled meeting with oto_cycle_id set. The KPI loader in ReviewFlow and
  MonthlyOneToOneTab requires meeting.oto_cycle_id to find cycle KPIs, so these employees
  see zero KPIs in their reviews.

  ## Fix
  1. Tony Chen (ba4d88bf) — has an existing non-submitted meeting (fe3faeab) with
     oto_cycle_id = NULL. Update it to point at Kenny Sanon's cycle (56143738).
  2. Mathes Balasingam (1fead12a) — no meeting at all. Insert placeholder linked to
     Hollie Toole's cycle (9df2a455).
  3. Saxon Figg (c22b0118) — no meeting at all. Insert placeholder linked to
     Hollie Toole's cycle (9df2a455).
  4. Caleb Innes (b65d5851) — has a completed meeting with no cycle link. Insert a new
     placeholder meeting linked to Jade Henderson's cycle (67802da3).

  ## Safety
  - Does NOT touch any review data, KPI ratings, competency scores, or saved content.
  - Does NOT create duplicate cycle-linked meetings (checks first).
  - Does NOT affect any submitted or completed meeting records.
*/

-- 1. Tony Chen: update his existing non-submitted meeting to link to Kenny's cycle
UPDATE one_to_one_scheduled_meetings
SET 
  oto_cycle_id = '56143738-2de8-42f8-afcb-554c600ed63d',
  updated_at   = now()
WHERE id = 'fe3faeab-81c1-4211-879c-e47ee2c186a5'
  AND oto_cycle_id IS NULL
  AND completion_status != 'submitted';

-- 2. Mathes Balasingam: insert placeholder meeting linked to Hollie's cycle
INSERT INTO one_to_one_scheduled_meetings
  (oto_cycle_id, employee_id, manager_id, scheduled_datetime, completion_status, status)
SELECT
  '9df2a455-e253-4ba8-9c76-02fe82120009',
  '1fead12a-997b-462e-8cc5-97acbe81c636',
  '5b361860-a4cb-4684-be68-2fc0de8f2a96',
  now(),
  'scheduled',
  'scheduled'
WHERE NOT EXISTS (
  SELECT 1 FROM one_to_one_scheduled_meetings
  WHERE oto_cycle_id = '9df2a455-e253-4ba8-9c76-02fe82120009'
    AND employee_id  = '1fead12a-997b-462e-8cc5-97acbe81c636'
    AND completion_status != 'submitted'
);

-- 3. Saxon Figg: insert placeholder meeting linked to Hollie's cycle
INSERT INTO one_to_one_scheduled_meetings
  (oto_cycle_id, employee_id, manager_id, scheduled_datetime, completion_status, status)
SELECT
  '9df2a455-e253-4ba8-9c76-02fe82120009',
  'c22b0118-2cc2-4cad-bd6f-e0980cdad361',
  '5b361860-a4cb-4684-be68-2fc0de8f2a96',
  now(),
  'scheduled',
  'scheduled'
WHERE NOT EXISTS (
  SELECT 1 FROM one_to_one_scheduled_meetings
  WHERE oto_cycle_id = '9df2a455-e253-4ba8-9c76-02fe82120009'
    AND employee_id  = 'c22b0118-2cc2-4cad-bd6f-e0980cdad361'
    AND completion_status != 'submitted'
);

-- 4. Caleb Innes: insert placeholder meeting linked to Jade's cycle
INSERT INTO one_to_one_scheduled_meetings
  (oto_cycle_id, employee_id, manager_id, scheduled_datetime, completion_status, status)
SELECT
  '67802da3-9f80-44fc-a8ca-9bb720287883',
  'b65d5851-5d70-4947-bc4b-cb461ae88773',
  '16ce436a-5f4b-4a54-a8ae-7480361f9168',
  now(),
  'scheduled',
  'scheduled'
WHERE NOT EXISTS (
  SELECT 1 FROM one_to_one_scheduled_meetings
  WHERE oto_cycle_id = '67802da3-9f80-44fc-a8ca-9bb720287883'
    AND employee_id  = 'b65d5851-5d70-4947-bc4b-cb461ae88773'
    AND completion_status != 'submitted'
);
