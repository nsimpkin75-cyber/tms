/*
  # Fix Duplicate Indexes (Security Fix)

  1. Duplicate Index Removed
    - Remove idx_profiles_manager (duplicate of idx_profiles_manager_id)
    - Both indexes cover the same column on profiles table
    - Improves write performance and reduces storage

  2. Security Impact
    - No change to query performance (identical indexes)
    - Reduces index maintenance overhead
*/

DROP INDEX IF EXISTS idx_profiles_manager;