/*
  # Fix Test User Identities

  1. Changes
    - Adds missing identity records for test users
    - Required for authentication to work properly

  2. Security
    - Only creates identities for existing authenticated users
    - Uses email provider for standard email/password login
*/

-- Create identities for users that don't have them
INSERT INTO auth.identities (
  id,
  user_id,
  provider_id,
  provider,
  identity_data,
  last_sign_in_at,
  created_at,
  updated_at
)
SELECT
  gen_random_uuid(),
  au.id,
  au.id::text,
  'email',
  jsonb_build_object(
    'sub', au.id::text,
    'email', au.email,
    'email_verified', true,
    'phone_verified', false
  ),
  NOW(),
  NOW(),
  NOW()
FROM auth.users au
LEFT JOIN auth.identities ai ON au.id = ai.user_id AND ai.provider = 'email'
WHERE ai.id IS NULL
ON CONFLICT (provider, provider_id) DO NOTHING;