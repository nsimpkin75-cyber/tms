/*
  # Add automatic profile creation trigger

  ## Overview
  Adds a trigger to automatically create a profile record when a new user signs up.
  This solves the circular dependency issue where RLS policies require a profile to exist,
  but the INSERT policy for profiles requires the user to already have an admin profile.

  ## Changes
  1. Creates a trigger function to insert profile on auth.users insert
  2. Extracts email and full_name from auth.users metadata
  3. Bypasses RLS by using SECURITY DEFINER
  4. Updates the profiles INSERT policy to allow users to create their own profile on first login

  ## Security
  - Trigger function runs with SECURITY DEFINER to bypass RLS
  - Only creates profiles for new authenticated users
  - Uses data from auth.users which is already validated by Supabase Auth
*/

-- Drop existing restrictive INSERT policy
DROP POLICY IF EXISTS "Admins can insert profiles" ON profiles;

-- Create new policy allowing users to insert their own profile
CREATE POLICY "Users can create own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Create trigger function to auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
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
END;
$$;

-- Drop trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger on auth.users insert
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();