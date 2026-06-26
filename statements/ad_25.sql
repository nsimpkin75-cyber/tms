UPDATE auth.users
SET 
  encrypted_password = crypt('admin123', gen_salt('bf')),
  updated_at = now()
WHERE email = 'nicola.hurcombe@eposnow.com';