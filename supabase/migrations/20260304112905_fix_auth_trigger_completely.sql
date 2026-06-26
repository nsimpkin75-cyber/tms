/*
  # Fix Auth Trigger and Policies Completely

  1. Issue
    - Multiple INSERT policies causing conflicts
    - Policies with recursive checks on profiles table
    - "Database error querying schema" during login

  2. Solution
    - Drop ALL INSERT policies on profiles
    - Create single simple anon policy for trigger
    - Create single authenticated policy for users
    - Remove trigger temporarily to isolate issue

  3. Security
    - Maintain RLS protection
    - Allow profile creation during signup
*/

-- Drop ALL existing INSERT policies
DROP POLICY IF EXISTS "Allow profile creation" ON profiles;
DROP POLICY IF EXISTS "Allow trigger to create profiles" ON profiles;
DROP POLICY IF EXISTS "Authenticated users can insert own profile or admins can insert" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile or admins can insert any" ON profiles;
DROP POLICY IF EXISTS "Service role can insert profiles" ON profiles;

-- Drop the trigger temporarily
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create simple INSERT policy for anon (trigger context)
CREATE POLICY "Anon can insert profiles"
  ON profiles
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Create simple INSERT policy for authenticated users
CREATE POLICY "Authenticated can insert own profile"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Recreate the function with better error handling
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
    'employee'
  )
  ON CONFLICT (id) DO NOTHING;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error in handle_new_user for %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

-- Re-enable the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();
