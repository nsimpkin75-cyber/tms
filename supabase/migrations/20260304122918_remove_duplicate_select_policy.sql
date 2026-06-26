/*
  # Remove Duplicate SELECT Policy

  1. Changes
    - Remove the redundant "Admins can view all profiles" policy
    - Keep only "Authenticated users can view profiles" which covers all authenticated users including admins

  2. Security
    - Maintains secure access control
    - Simplifies policy structure
    - Admins are authenticated users so they're still covered
*/

-- Remove redundant admin-specific SELECT policy since authenticated users policy covers everyone
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
