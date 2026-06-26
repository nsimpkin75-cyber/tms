/*
  # Create Missing Review Instances

  1. Purpose
    - Create review instances for all cycle members who don't have one yet
    - This ensures all team members have reviewable instances
  
  2. Changes
    - Insert review instances for existing cycle members without instances
*/

-- Create review instances for all cycle members who don't have one yet
INSERT INTO review_instances (cycle_id, employee_id, manager_id, template_type, status)
SELECT DISTINCT
  rcm.cycle_id,
  rcm.employee_id,
  rc.manager_id,
  'generic' as template_type,
  'upcoming' as status
FROM review_cycle_members rcm
JOIN review_cycles rc ON rc.id = rcm.cycle_id
LEFT JOIN review_instances ri ON ri.cycle_id = rcm.cycle_id AND ri.employee_id = rcm.employee_id
WHERE rcm.status = 'active'
  AND ri.id IS NULL;
