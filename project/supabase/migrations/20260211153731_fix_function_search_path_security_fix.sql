/*
  # Fix Function Search Path - Security Fix
  
  1. Purpose
    - Add explicit search_path to calculate_nine_box_position function
    - Prevents potential security issues from mutable search paths
  
  2. Changes
    - Replace function with explicit search_path setting
*/

-- Fix calculate_nine_box_position function to have immutable search_path
CREATE OR REPLACE FUNCTION calculate_nine_box_position(
  p_kpi_average numeric,
  p_competency_average numeric
)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  v_performance text;
  v_potential text;
BEGIN
  -- Classify performance (KPI)
  IF p_kpi_average >= 3.5 THEN
    v_performance := 'High';
  ELSIF p_kpi_average >= 2.5 THEN
    v_performance := 'Medium';
  ELSE
    v_performance := 'Low';
  END IF;
  
  -- Classify potential (Competency)
  IF p_competency_average >= 3.5 THEN
    v_potential := 'High';
  ELSIF p_competency_average >= 2.5 THEN
    v_potential := 'Medium';
  ELSE
    v_potential := 'Low';
  END IF;
  
  RETURN v_potential || ' Potential / ' || v_performance || ' Performance';
END;
$$;

GRANT EXECUTE ON FUNCTION calculate_nine_box_position(numeric, numeric) TO authenticated;
