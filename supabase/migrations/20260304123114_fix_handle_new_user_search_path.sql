/*
  # Fix handle_new_user Function Search Path

  1. Changes
    - Drop and recreate the handle_new_user function with proper search_path
    - Set search_path to 'public, auth' to avoid schema resolution issues
    - This prevents "Database error querying schema" errors during auth operations

  2. Security
    - Maintains SECURITY DEFINER for proper RLS bypass
    - Explicit search_path prevents SQL injection via search_path manipulation
*/

-- Drop existing function
DROP FUNCTION IF EXISTS handle_new_user() CASCADE;

-- Recreate with proper search_path
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  -- Insert into profiles with minimal data
  INSERT INTO public.profiles (id, email, full_name, role, department)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'New User'),
    'employee',
    'General'
  );
  RETURN NEW;
EXCEPTION
  WHEN unique_violation THEN
    -- Profile already exists, ignore
    RETURN NEW;
  WHEN OTHERS THEN
    -- Log error but don't fail auth
    RAISE WARNING 'Failed to create profile for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

-- Recreate the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();
