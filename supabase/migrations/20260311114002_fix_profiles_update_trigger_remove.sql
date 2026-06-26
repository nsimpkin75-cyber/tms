/*
  # Fix Profiles Update Trigger Error

  This migration fixes the "record 'new' has no field 'updated_at'" error when updating profiles.

  ## Problem
  - A trigger was trying to set an `updated_at` column that doesn't exist on the profiles table
  - This was causing all profile updates to fail with error code 42703

  ## Solution
  - Drop the problematic trigger from the profiles table
  - The profiles table doesn't need an updated_at column for the current functionality
*/

-- Drop the problematic trigger
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
