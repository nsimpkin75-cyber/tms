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