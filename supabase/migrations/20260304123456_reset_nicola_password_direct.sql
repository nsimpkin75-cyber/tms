/*
  # Reset Nicola Password Directly

  1. Changes
    - Update Nicola's password to: Admin123!
    - Ensure profile exists with admin privileges
*/

-- Update password for nicola@example.com
UPDATE auth.users 
SET encrypted_password = crypt('Admin123!', gen_salt('bf'))
WHERE email = 'nicola@example.com';

-- Ensure profile exists and has admin role
INSERT INTO public.profiles (id, email, full_name, role, department, admin_type, created_at)
SELECT 
  id,
  'nicola@example.com',
  'Nicola Admin',
  'admin',
  'Administration',
  'super_admin',
  NOW()
FROM auth.users 
WHERE email = 'nicola@example.com'
ON CONFLICT (id) DO UPDATE 
SET 
  role = 'admin',
  admin_type = 'super_admin';
