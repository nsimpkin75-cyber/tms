/*
  # Fix Function Search Paths for Security

  ## Overview
  This migration sets explicit search paths for database functions to prevent
  security vulnerabilities related to mutable search paths. Functions with
  mutable search paths can be exploited through search_path manipulation.

  ## Security Impact
  Setting an explicit search path ensures:
  - Functions cannot be exploited via search_path hijacking
  - Functions always reference the correct schema
  - Protects against privilege escalation attacks

  ## Functions Updated
  - calculate_department_strategy_progress
  - calculate_business_strategy_progress
  - calculate_standalone_strategy_progress
  - update_department_strategy_progress
  - update_business_strategy_progress
  - update_standalone_strategy_progress
  - update_job_titles_updated_at

  ## Changes Made
  Each function is altered to set:
  - SET search_path = public, pg_temp
*/

-- Fix calculate_department_strategy_progress
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'calculate_department_strategy_progress') THEN
    ALTER FUNCTION calculate_department_strategy_progress(uuid)
      SET search_path = public, pg_temp;
  END IF;
END $$;

-- Fix calculate_business_strategy_progress
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'calculate_business_strategy_progress') THEN
    ALTER FUNCTION calculate_business_strategy_progress(uuid)
      SET search_path = public, pg_temp;
  END IF;
END $$;

-- Fix calculate_standalone_strategy_progress
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'calculate_standalone_strategy_progress') THEN
    ALTER FUNCTION calculate_standalone_strategy_progress(uuid)
      SET search_path = public, pg_temp;
  END IF;
END $$;

-- Fix update_department_strategy_progress
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_department_strategy_progress') THEN
    ALTER FUNCTION update_department_strategy_progress()
      SET search_path = public, pg_temp;
  END IF;
END $$;

-- Fix update_business_strategy_progress
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_business_strategy_progress') THEN
    ALTER FUNCTION update_business_strategy_progress()
      SET search_path = public, pg_temp;
  END IF;
END $$;

-- Fix update_standalone_strategy_progress
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_standalone_strategy_progress') THEN
    ALTER FUNCTION update_standalone_strategy_progress()
      SET search_path = public, pg_temp;
  END IF;
END $$;

-- Fix update_job_titles_updated_at
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_job_titles_updated_at') THEN
    ALTER FUNCTION update_job_titles_updated_at()
      SET search_path = public, pg_temp;
  END IF;
END $$;