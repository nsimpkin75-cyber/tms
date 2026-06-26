/*
  # Temporarily Disable Auth Trigger for Debugging

  1. Changes
    - Disable the on_auth_user_created trigger to diagnose login issues
    - This is temporary to isolate the problem
    
  2. Notes
    - If login works after this, we know the trigger is the issue
    - Will need to implement a different approach for profile creation
*/

-- Disable the trigger temporarily
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
