
-- Add RLS policies for tables with RLS enabled but no policies.
-- These tables are part of the old strategic roadmap system (pre-strategies revamp).
-- Scoping: admin/leadership can manage all; assigned users can read their own.

-- ── strategic_roadmaps ────────────────────────────────────────────────────────
CREATE POLICY "strategic_roadmaps_select" ON public.strategic_roadmaps FOR SELECT TO authenticated
  USING (
    owner_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','leadership'))
  );

CREATE POLICY "strategic_roadmaps_insert" ON public.strategic_roadmaps FOR INSERT TO authenticated
  WITH CHECK (
    owner_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','leadership'))
  );

CREATE POLICY "strategic_roadmaps_update" ON public.strategic_roadmaps FOR UPDATE TO authenticated
  USING (
    owner_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','leadership'))
  )
  WITH CHECK (
    owner_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','leadership'))
  );

CREATE POLICY "strategic_roadmaps_delete" ON public.strategic_roadmaps FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ── strategic_goals ───────────────────────────────────────────────────────────
CREATE POLICY "strategic_goals_select" ON public.strategic_goals FOR SELECT TO authenticated
  USING (
    assigned_to_id = auth.uid()
    OR assigned_by_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','leadership'))
    OR EXISTS (
      SELECT 1 FROM public.strategic_roadmaps sr
      WHERE sr.id = roadmap_id AND sr.owner_id = auth.uid()
    )
  );

CREATE POLICY "strategic_goals_insert" ON public.strategic_goals FOR INSERT TO authenticated
  WITH CHECK (
    assigned_by_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','leadership'))
  );

CREATE POLICY "strategic_goals_update" ON public.strategic_goals FOR UPDATE TO authenticated
  USING (
    assigned_to_id = auth.uid()
    OR assigned_by_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','leadership'))
  )
  WITH CHECK (
    assigned_to_id = auth.uid()
    OR assigned_by_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','leadership'))
  );

CREATE POLICY "strategic_goals_delete" ON public.strategic_goals FOR DELETE TO authenticated
  USING (
    assigned_by_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','leadership'))
  );

-- ── weekly_catchups ───────────────────────────────────────────────────────────
CREATE POLICY "weekly_catchups_select" ON public.weekly_catchups FOR SELECT TO authenticated
  USING (
    manager_id = auth.uid()
    OR employee_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','leadership'))
  );

CREATE POLICY "weekly_catchups_insert" ON public.weekly_catchups FOR INSERT TO authenticated
  WITH CHECK (
    manager_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','leadership'))
  );

CREATE POLICY "weekly_catchups_update" ON public.weekly_catchups FOR UPDATE TO authenticated
  USING (
    manager_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','leadership'))
  )
  WITH CHECK (
    manager_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','leadership'))
  );

CREATE POLICY "weekly_catchups_delete" ON public.weekly_catchups FOR DELETE TO authenticated
  USING (
    manager_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ── catchup_summaries ─────────────────────────────────────────────────────────
CREATE POLICY "catchup_summaries_select" ON public.catchup_summaries FOR SELECT TO authenticated
  USING (
    manager_id = auth.uid()
    OR employee_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','leadership'))
  );

CREATE POLICY "catchup_summaries_insert" ON public.catchup_summaries FOR INSERT TO authenticated
  WITH CHECK (
    manager_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','leadership'))
  );

CREATE POLICY "catchup_summaries_update" ON public.catchup_summaries FOR UPDATE TO authenticated
  USING (
    manager_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','leadership'))
  )
  WITH CHECK (
    manager_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','leadership'))
  );

CREATE POLICY "catchup_summaries_delete" ON public.catchup_summaries FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );
