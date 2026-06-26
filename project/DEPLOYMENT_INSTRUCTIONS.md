# User Management Fixes - Deployment Instructions

## Issues Fixed

1. **Self-signup users not visible in admin panel**
   - Root cause: INSERT policy on profiles table was too restrictive
   - Users signing up via login screen couldn't create profiles

2. **Delete user failing with "Database error loading user"**
   - Root cause: Using `.single()` instead of `.maybeSingle()` in edge function
   - Changed to properly handle null cases

## Required Deployment Steps

### 1. Apply Database Migration

The migration file has been created at:
```
supabase/migrations/20260304095000_fix_user_management_issues.sql
```

This migration:
- Fixes the profiles INSERT policy to allow self-signup
- Adds proper DELETE policy for admins
- Recreates user_status_view with proper permissions

**To apply:**
```bash
# Using Supabase CLI
supabase db push

# Or apply via Supabase Dashboard SQL Editor
```

### 2. Deploy Updated Edge Function

The `delete-user` edge function has been updated to use `.maybeSingle()` instead of `.single()`.

**To deploy:**
```bash
# Using Supabase CLI
supabase functions deploy delete-user

# Or redeploy via Supabase Dashboard
```

## Testing

After deployment:

1. **Test self-signup:**
   - Log out of the admin account
   - Click "Sign Up" on login screen
   - Create a new user account
   - Verify the user appears in Admin > User Management

2. **Test user deletion:**
   - Log in as admin
   - Go to Admin > User Management
   - Try deleting a test user
   - Verify no "Database error loading user" error

## Changes Summary

### Database Changes
- **profiles table**: Updated INSERT policy to allow `auth.uid() = id OR admin`
- **profiles table**: Added DELETE policy for admins
- **user_status_view**: Recreated with proper grants

### Code Changes
- **delete-user edge function**: Changed `.single()` to `.maybeSingle()` for safer queries

## Security Notes

- Users can only create profiles for themselves (checked via `auth.uid() = id`)
- Only admins can delete user profiles
- All existing security policies remain in place
