# Security Configuration Guide

This document outlines security configurations that must be set in the Supabase Dashboard and cannot be configured via SQL migrations.

## Required Dashboard Configurations

### 1. Enable Leaked Password Protection

**Status:** ⚠️ Not Enabled

**Impact:** Users can set passwords that have been compromised in data breaches.

**How to Fix:**
1. Go to your Supabase Dashboard
2. Navigate to **Authentication** → **Providers**
3. Find the **Email** provider settings
4. Enable **"Leaked Password Protection"**
5. This will check passwords against the HaveIBeenPwned.org database

**Why This Matters:**
Prevents users from setting commonly compromised passwords, significantly reducing account takeover risk.

---

### 2. Configure Auth Database Connection Strategy

**Status:** ⚠️ Fixed to 10 connections (should be percentage-based)

**Impact:** Auth server performance won't scale with instance size increases.

**Current Configuration:** 10 fixed connections
**Recommended:** Percentage-based allocation

**How to Fix:**
1. Go to your Supabase Dashboard
2. Navigate to **Database** → **Connection Pooling**
3. Find **Auth Pooler** settings
4. Change connection strategy from **Fixed** to **Percentage**
5. Set to 15-20% of available connections

**Why This Matters:**
Allows Auth server to automatically scale its connection usage when you upgrade your database instance, ensuring optimal performance.

---

## Multiple Permissive Policies (Informational)

**Status:** ℹ️ This is intentional and not a security issue

Supabase has flagged multiple permissive RLS policies on various tables. This is **not a security vulnerability** - it's how PostgreSQL RLS is designed to work.

### How RLS Policies Work:
- Multiple permissive policies act as **OR** conditions
- A user can access a row if **ANY** permissive policy allows it
- This is the correct pattern for role-based access control

### Example:
On the `reviews` table:
- "Users can view own reviews" - allows employees to see their reviews
- "Admins can view all reviews" - allows admins to see all reviews

Both policies exist simultaneously and work together correctly.

### When This Would Be a Problem:
Only if there's an **unintended overlap** that grants excessive permissions. Our policies have been reviewed and are correctly scoped.

---

## Fixed via Migrations

The following issues were fixed in recent migrations:

### ✅ Unused Indexes Removed
- Dropped 52 unused indexes
- Improves write performance
- Reduces storage costs

### ✅ Function Search Path Fixed
- Fixed `determine_job_change_type` function
- Now uses immutable search_path
- Prevents search_path manipulation attacks

### ✅ Security Definer Views Fixed
- `pending_career_approvals` now uses `security_invoker`
- `job_movement_stats` now uses `security_invoker`
- Views now respect RLS policies on underlying tables

---

## Security Best Practices

### Regular Reviews
- Review RLS policies quarterly
- Audit user roles and permissions
- Monitor failed authentication attempts

### Password Policies
- Minimum 12 characters (configure in Auth settings)
- Require complexity (uppercase, lowercase, numbers, symbols)
- Enable leaked password protection (see above)

### Database Security
- Never expose database credentials
- Use environment variables for all secrets
- Rotate API keys regularly
- Monitor database logs for suspicious activity

---

## Contact

For questions about security configuration, consult the Supabase documentation:
- [Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Auth Configuration](https://supabase.com/docs/guides/auth)
- [Database Connection Pooling](https://supabase.com/docs/guides/database/connecting-to-postgres#connection-pool)
