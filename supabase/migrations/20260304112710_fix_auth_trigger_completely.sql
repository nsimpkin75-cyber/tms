/*
  # Fix Authentication Trigger Completely

  1. Issue
    - "Database error querying schema" during login
    - Trigger function may have policy issues or errors

  2. Solution
    - Clean up duplicate INSERT policies on profiles table
    - Recreate handle_new_user function with proper error handling
    - Ensure trigger works correctly during auth

  3. Security
    - Maintain proper RLS
    - Allow profile creation during user registration
*/

-- Drop all INSERT policies on profiles to start fresh
DROP POLICY IF EXISTS "Service role can insert profiles" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile or admins can insert any" ON profiles;

-- Create single INSERT policy that handles all cases
CREATE POLICY "Allow profile creation"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Allow if inserting own profile (auth.uid() = id)
    -- OR if user is admin
    -- OR if auth.uid() is NULL (during trigger execution)
    (auth.uid() = id) OR
    (auth.uid() IS NULL) OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

-- Recreate the handle_new_user function with better error handling
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Insert profile for new user
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
    -- Log error but don't fail the user creation
    RAISE WARNING 'Error creating profile for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

-- Ensure trigger exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();
