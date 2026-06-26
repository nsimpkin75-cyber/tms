/*
  # Temporarily Disable Auth Trigger
  
  1. Purpose
    - Disable the auth trigger to test if it's causing the "Database error querying schema" issue
    - This is a diagnostic step
  
  2. Changes
    - Drop the trigger on auth.users
    - Keep the function for later re-enablement
  
  3. Note
    - This means new signups won't automatically create profiles
    - We'll re-enable once we confirm this is the issue
*/

-- Drop the trigger temporarily
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
