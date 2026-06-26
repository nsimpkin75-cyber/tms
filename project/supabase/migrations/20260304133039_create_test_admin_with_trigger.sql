/*
  # Create Test Admin - Work With Trigger

  ## Overview
  Creates test admin and updates the auto-created profile.

  ## Test Account
  - Email: test@admin.com
  - Password: Admin123!
*/

DO $$
DECLARE
  v_admin_id uuid := gen_random_uuid();
  v_password text := 'Admin123!';
BEGIN
  -- Clean up existing
  DELETE FROM public.profiles WHERE email IN ('admin@test.com', 'test@admin.com');
  DELETE FROM auth.identities WHERE provider_id IN (
    SELECT id::text FROM auth.users WHERE email IN ('admin@test.com', 'test@admin.com')
  );
  DELETE FROM auth.users WHERE email IN ('admin@test.com', 'test@admin.com');

  -- Create auth user (trigger will create profile)
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    v_admin_id,
    'authenticated',
    'authenticated',
    'test@admin.com',
    crypt(v_password, gen_salt('bf')),
    NOW(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Test Admin"}'::jsonb,
    NOW(),
    NOW(),
    '',
    '',
    '',
    ''
  );

  -- Create identity
  INSERT INTO auth.identities (
    id,
    provider_id,
    user_id,
    identity_data,
    provider,
    last_sign_in_at,
    created_at,
    updated_at
  ) VALUES (
    gen_random_uuid(),
    v_admin_id::text,
    v_admin_id,
    format('{"sub":"%s","email":"test@admin.com","email_verified":true,"phone_verified":false}', v_admin_id)::jsonb,
    'email',
    NOW(),
    NOW(),
    NOW()
  );

  -- Wait a moment for trigger
  PERFORM pg_sleep(0.1);

  -- Update the profile created by trigger
  UPDATE public.profiles
  SET 
    role = 'admin',
    admin_type = 'full_admin',
    department = 'IT',
    tenure = 1
  WHERE id = v_admin_id;

  RAISE NOTICE 'Test admin created: test@admin.com / Admin123!';
END $$;
