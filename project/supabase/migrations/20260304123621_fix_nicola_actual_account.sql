/*
  # Fix Nicola's Actual Account Password

  1. Changes
    - Reset password for nicola.hurcombe@eposnow.com to Admin123!
*/

UPDATE auth.users 
SET encrypted_password = crypt('Admin123!', gen_salt('bf'))
WHERE email = 'nicola.hurcombe@eposnow.com';
