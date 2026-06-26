/*
  # Remove incorrect Admin access level from Kenny Sanon

  ## Issue
  Kenny Sanon (role: manager) was incorrectly assigned the "Admin" access level
  in addition to his "Manager" access level. The merged permissions included
  full_admin and dashboard_admin, giving him org-wide dashboard visibility in the UI.

  ## Change
  - Remove the Admin access level row (id: 803474b0-5a49-484d-b3f8-4e22a8a0301d)
    from user_access_levels for Kenny Sanon.
  - He retains his correct "Manager" access level only.

  ## Security note
  RLS policies check profiles.role, not access level permissions, so Kenny could
  not actually read other users' private data via direct DB queries. However, the
  frontend org-level dashboard queries ran under his auth token and returned
  org-wide aggregated data (9-box grid, talent ratings, pay review forecast) that
  a manager should not see. Removing this access level restores correct UI scoping.
*/

DELETE FROM user_access_levels
WHERE id = '803474b0-5a49-484d-b3f8-4e22a8a0301d'
  AND user_id = 'd6805a86-7bab-4cbd-abe5-cde7d1e895b7';
