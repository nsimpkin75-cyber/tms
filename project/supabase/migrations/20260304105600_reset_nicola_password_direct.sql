/*
  # Reset Nicola's Password to 'admin123'

  1. Purpose
    - Reset password for nicola.hurcombe@eposnow.com to 'admin123'
    - Allow immediate login access to admin account

  2. Security Note
    - This is a temporary password that should be changed after first login
*/

-- Update password for nicola.hurcombe@eposnow.com
UPDATE auth.users
SET 
  encrypted_password = crypt('admin123', gen_salt('bf')),
  updated_at = now()
WHERE email = 'nicola.hurcombe@eposnow.com';
