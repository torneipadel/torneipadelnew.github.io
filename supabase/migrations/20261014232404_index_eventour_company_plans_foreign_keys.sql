-- Add covering indexes for foreign keys to keep tenant plan joins and audit lookups efficient.
CREATE INDEX IF NOT EXISTS idx_eventour_company_plans_plan_code
  ON public.eventour_company_plans (plan_code);

CREATE INDEX IF NOT EXISTS idx_eventour_company_plans_updated_by
  ON public.eventour_company_plans (updated_by);
