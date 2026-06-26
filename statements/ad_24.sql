WITH new_user AS (
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    invited_at,
    confirmation_sent_at,
    raw_app_meta_data,
    raw_user_meta_data,
    is_super_admin,
    created_at,
    updated_at,
    is_sso_user,
    confirmation_token
  )
  VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    'nicola.hurcombe@eposnow.com',
    crypt('temporary_secure_' || encode(gen_random_bytes(32), 'hex'), gen_salt('bf')),
    now(),
    now(),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Nicola Hurcombe"}',
    false,
    now(),
    now(),
    false,
    encode(gen_random_bytes(32), 'hex')
  )
  RETURNING id, email
)
, new_identity AS (
  INSERT INTO auth.identities (
    id,
    user_id,
    provider_id,
    identity_data,
    provider,
    last_sign_in_at,
    created_at,
    updated_at
  )
  SELECT
    id,
    id,
    id::text,
    jsonb_build_object(
      'sub', id::text,
      'email', email,
      'email_verified', true
    ),
    'email',
    now(),
    now(),
    now()
  FROM new_user
  RETURNING user_id
)
INSERT INTO profiles (
  id,
  email,
  full_name,
  role,
  department,
  tenure,
  created_at
)
SELECT
  id,
  email,
  'Nicola Hurcombe',
  'admin',
  'Administration',
  0,
  now()
FROM new_user;