
-- ============================================================
-- Security Fix: Replace all permissive USING(true) public-role
-- RLS policies with authenticated-only policies.
-- Meta tables get admin-only access.
-- ============================================================

-- PART 1: Drop ALL overly permissive "Allow all" policies
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND qual = 'true'
      AND cmd = 'ALL'
      AND with_check = 'true'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, r.tablename);
    RAISE NOTICE 'Dropped policy % on %', r.policyname, r.tablename;
  END LOOP;
END $$;

-- PART 2: Meta tables - Admin-only ALL access
CREATE POLICY "Admin only access" ON public.meta_bm_connection
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admin only write" ON public.meta_ad_account_snapshots
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admin only write" ON public.meta_bm_ad_accounts
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- PART 3: All other tables - authenticated read + write
-- Using a DO block to create policies for all remaining tables
DO $$
DECLARE
  tbl TEXT;
  tbls TEXT[] := ARRAY[
    'accounts', 'ad_account_metrics_daily', 'batch_attachments',
    'client_meta_ad_accounts', 'clint_webhook_events',
    'content_change_requests', 'content_extra_request_files',
    'content_extra_requests', 'content_items', 'content_post_files',
    'content_posts', 'content_revisions', 'content_stage_responsibilities',
    'contract_events', 'contract_files', 'contract_signers',
    'contract_template_fields', 'contract_template_versions',
    'contract_templates', 'contracts', 'contracts_generated',
    'cs_alert_config', 'cs_audit_log', 'cs_cancellation_reason_links',
    'cs_cancellation_reasons', 'cs_cancellations', 'cs_churn_events',
    'cs_client_health_scores', 'cs_client_onboarding',
    'cs_client_onboarding_tasks', 'cs_health_weights',
    'cs_meeting_actions', 'cs_meetings', 'cs_nps_response_tags',
    'cs_nps_responses', 'cs_nps_surveys', 'cs_nps_tags',
    'cs_onboarding_answers', 'cs_onboarding_briefings',
    'cs_onboarding_flow_rules', 'cs_onboarding_flow_tasks',
    'cs_onboarding_flows', 'cs_onboarding_meeting_files',
    'cs_onboarding_meetings', 'cs_onboarding_questions',
    'cs_onboarding_task_files', 'cs_onboarding_task_history',
    'cs_onboardings', 'cs_playbook_tasks', 'cs_playbooks',
    'cs_risk_action_items', 'cs_risk_cases', 'cs_sales_transcripts',
    'cs_settings', 'cs_transcripts', 'deliverables',
    'niches', 'post_attachments', 'service_deliverables', 'services',
    'tasks', 'traffic_alert_rules', 'traffic_client_status',
    'traffic_creative_request_files', 'traffic_creative_requests',
    'traffic_cycle_routines', 'traffic_cycle_tasks', 'traffic_cycles',
    'traffic_dashboard_layout', 'traffic_metric_catalog',
    'traffic_metric_targets', 'traffic_periods', 'traffic_playbook_tasks',
    'traffic_routine_cycles', 'traffic_routine_tasks', 'traffic_routines',
    'traffic_saved_views', 'traffic_scores', 'traffic_tasks'
  ];
BEGIN
  FOREACH tbl IN ARRAY tbls
  LOOP
    -- Authenticated SELECT
    EXECUTE format(
      'CREATE POLICY "Authenticated read" ON public.%I FOR SELECT TO authenticated USING (true)',
      tbl
    );
    -- Authenticated INSERT
    EXECUTE format(
      'CREATE POLICY "Authenticated insert" ON public.%I FOR INSERT TO authenticated WITH CHECK (true)',
      tbl
    );
    -- Authenticated UPDATE
    EXECUTE format(
      'CREATE POLICY "Authenticated update" ON public.%I FOR UPDATE TO authenticated USING (true) WITH CHECK (true)',
      tbl
    );
    -- Authenticated DELETE
    EXECUTE format(
      'CREATE POLICY "Authenticated delete" ON public.%I FOR DELETE TO authenticated USING (true)',
      tbl
    );
  END LOOP;
END $$;
