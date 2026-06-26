DO $$
DECLARE
  admin_id uuid;
  john_id uuid;
  jane_id uuid;
  mike_id uuid;
  existing_user_id uuid;
BEGIN
  SELECT id INTO existing_user_id FROM auth.users WHERE email = 'admin@eposnow.com';
  
  IF existing_user_id IS NULL THEN
    INSERT INTO auth.users (
      id,
      email,
      encrypted_password,
      email_confirmed_at,
      created_at,
      updated_at,
      raw_app_meta_data,
      raw_user_meta_data,
      is_super_admin,
      role,
      aud,
      instance_id
    ) VALUES (
      gen_random_uuid(),
      'admin@eposnow.com',
      crypt('Admin123!', gen_salt('bf')),
      now(),
      now(),
      now(),
      '{"provider":"email","providers":["email"]}',
      '{"full_name":"System Administrator"}',
      false,
      'authenticated',
      'authenticated',
      '00000000-0000-0000-0000-000000000000'
    )
    RETURNING id INTO admin_id;
  ELSE
    UPDATE auth.users 
    SET encrypted_password = crypt('Admin123!', gen_salt('bf'))
    WHERE id = existing_user_id;
    admin_id := existing_user_id;
  END IF;

  INSERT INTO profiles (id, email, full_name, role, department, job_title, admin_type)
  VALUES (
    admin_id,
    'admin@eposnow.com',
    'System Administrator',
    'admin',
    'IT',
    'System Administrator',
    'full_admin'
  )
  ON CONFLICT (id) DO UPDATE
  SET 
    role = 'admin',
    admin_type = 'full_admin',
    department = 'IT',
    job_title = 'System Administrator';

  INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  VALUES (
    gen_random_uuid(), 
    admin_id, 
    'admin@eposnow.com', 
    format('{"sub":"%s","email":"admin@eposnow.com"}', admin_id)::jsonb, 
    'email', 
    now(), 
    now(), 
    now()
  )
  ON CONFLICT (provider, provider_id) DO NOTHING;

  SELECT id INTO existing_user_id FROM auth.users WHERE email = 'john.doe@eposnow.com';
  
  IF existing_user_id IS NULL THEN
    INSERT INTO auth.users (
      id,
      email,
      encrypted_password,
      email_confirmed_at,
      created_at,
      updated_at,
      raw_app_meta_data,
      raw_user_meta_data,
      is_super_admin,
      role,
      aud,
      instance_id
    ) VALUES (
      gen_random_uuid(),
      'john.doe@eposnow.com',
      crypt('Password123!', gen_salt('bf')),
      now(),
      now(),
      now(),
      '{"provider":"email","providers":["email"]}',
      '{"full_name":"John Doe"}',
      false,
      'authenticated',
      'authenticated',
      '00000000-0000-0000-0000-000000000000'
    )
    RETURNING id INTO john_id;
  ELSE
    UPDATE auth.users 
    SET encrypted_password = crypt('Password123!', gen_salt('bf'))
    WHERE id = existing_user_id;
    john_id := existing_user_id;
  END IF;

  INSERT INTO profiles (id, email, full_name, role, department, job_title)
  VALUES (
    john_id,
    'john.doe@eposnow.com',
    'John Doe',
    'employee',
    'Sales',
    'Sales Representative'
  )
  ON CONFLICT (id) DO UPDATE
  SET 
    role = 'employee',
    department = 'Sales',
    job_title = 'Sales Representative';

  INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  VALUES (
    gen_random_uuid(), 
    john_id, 
    'john.doe@eposnow.com', 
    format('{"sub":"%s","email":"john.doe@eposnow.com"}', john_id)::jsonb, 
    'email', 
    now(), 
    now(), 
    now()
  )
  ON CONFLICT (provider, provider_id) DO NOTHING;

  SELECT id INTO existing_user_id FROM auth.users WHERE email = 'jane.smith@eposnow.com';
  
  IF existing_user_id IS NULL THEN
    INSERT INTO auth.users (
      id,
      email,
      encrypted_password,
      email_confirmed_at,
      created_at,
      updated_at,
      raw_app_meta_data,
      raw_user_meta_data,
      is_super_admin,
      role,
      aud,
      instance_id
    ) VALUES (
      gen_random_uuid(),
      'jane.smith@eposnow.com',
      crypt('Password123!', gen_salt('bf')),
      now(),
      now(),
      now(),
      '{"provider":"email","providers":["email"]}',
      '{"full_name":"Jane Smith"}',
      false,
      'authenticated',
      'authenticated',
      '00000000-0000-0000-0000-000000000000'
    )
    RETURNING id INTO jane_id;
  ELSE
    UPDATE auth.users 
    SET encrypted_password = crypt('Password123!', gen_salt('bf'))
    WHERE id = existing_user_id;
    jane_id := existing_user_id;
  END IF;

  INSERT INTO profiles (id, email, full_name, role, department, job_title)
  VALUES (
    jane_id,
    'jane.smith@eposnow.com',
    'Jane Smith',
    'manager',
    'Sales',
    'Sales Manager'
  )
  ON CONFLICT (id) DO UPDATE
  SET 
    role = 'manager',
    department = 'Sales',
    job_title = 'Sales Manager';

  INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  VALUES (
    gen_random_uuid(), 
    jane_id, 
    'jane.smith@eposnow.com', 
    format('{"sub":"%s","email":"jane.smith@eposnow.com"}', jane_id)::jsonb, 
    'email', 
    now(), 
    now(), 
    now()
  )
  ON CONFLICT (provider, provider_id) DO NOTHING;

  UPDATE profiles
  SET manager_id = jane_id
  WHERE id = john_id;

  SELECT id INTO existing_user_id FROM auth.users WHERE email = 'mike.wilson@eposnow.com';
  
  IF existing_user_id IS NULL THEN
    INSERT INTO auth.users (
      id,
      email,
      encrypted_password,
      email_confirmed_at,
      created_at,
      updated_at,
      raw_app_meta_data,
      raw_user_meta_data,
      is_super_admin,
      role,
      aud,
      instance_id
    ) VALUES (
      gen_random_uuid(),
      'mike.wilson@eposnow.com',
      crypt('Password123!', gen_salt('bf')),
      now(),
      now(),
      now(),
      '{"provider":"email","providers":["email"]}',
      '{"full_name":"Mike Wilson"}',
      false,
      'authenticated',
      'authenticated',
      '00000000-0000-0000-0000-000000000000'
    )
    RETURNING id INTO mike_id;
  ELSE
    UPDATE auth.users 
    SET encrypted_password = crypt('Password123!', gen_salt('bf'))
    WHERE id = existing_user_id;
    mike_id := existing_user_id;
  END IF;

  INSERT INTO profiles (id, email, full_name, role, department, job_title, manager_id)
  VALUES (
    mike_id,
    'mike.wilson@eposnow.com',
    'Mike Wilson',
    'employee',
    'Sales',
    'Sales Representative',
    jane_id
  )
  ON CONFLICT (id) DO UPDATE
  SET 
    role = 'employee',
    department = 'Sales',
    job_title = 'Sales Representative',
    manager_id = jane_id;

  INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  VALUES (
    gen_random_uuid(), 
    mike_id, 
    'mike.wilson@eposnow.com', 
    format('{"sub":"%s","email":"mike.wilson@eposnow.com"}', mike_id)::jsonb, 
    'email', 
    now(), 
    now(), 
    now()
  )
  ON CONFLICT (provider, provider_id) DO NOTHING;

END $$;