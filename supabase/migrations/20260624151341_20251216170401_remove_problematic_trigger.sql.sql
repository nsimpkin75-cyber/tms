/*
  # Remove Problematic Auth Trigger

  1. Changes
    - Drops the trigger on auth.users that may be causing authentication issues
    - Keeps the function for potential future use
    
  2. Notes
    - All existing test users already have profiles
    - This trigger was causing "Database error querying schema" during login
    - Can be re-enabled later if needed for new user signups
*/

-- Drop the trigger that's causing authentication issues
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Keep the function for potential future use
-- If needed later, can recreate trigger with:
-- CREATE TRIGGER on_auth_user_created
--   AFTER INSERT ON auth.users
--   FOR EACH ROW
--   EXECUTE FUNCTION public.handle_new_user();