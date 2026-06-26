/*
  # Fix handle_new_user Function Enum Casting

  ## Overview
  Fixes the handle_new_user function to properly cast text to user_role enum.

  ## Changes
  1. Updates handle_new_user to cast role values properly
  2. Ensures proper type handling for enum fields
*/

-- Update the handle_new_user function to properly handle enum types
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public, auth
LANGUAGE plpgsql
AS $$
BEGIN
  -- Insert profile for new user with proper enum casting
  INSERT INTO public.profiles (id, email, full_name, role, department)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'employee'::user_role),
    COALESCE(NEW.raw_user_meta_data->>'department', 'General')
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;
