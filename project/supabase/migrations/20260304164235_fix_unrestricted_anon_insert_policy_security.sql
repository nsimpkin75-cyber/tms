/*
  # Fix Unrestricted RLS Policy (Security Fix)

  1. Security Issue Fixed
    - Remove "Anon can insert profiles" policy that allows unrestricted access
    - This policy had WITH CHECK (true) which bypasses RLS completely
    - Anonymous users should NOT be able to insert profiles directly

  2. Proper Access Control
    - Keep "Authenticated can insert own profile" for self-signup
    - Keep "Service role can insert profiles" for admin operations via edge functions
    - Anonymous inserts are now properly blocked

  3. Impact
    - Self-signup still works via authenticated route
    - Admin user creation via edge functions still works
    - Blocks potential security vulnerability from anonymous inserts
*/

DROP POLICY IF EXISTS "Anon can insert profiles" ON profiles;