
-- =============================================
-- PETRON SALES FUNNEL MODULE - TABLES & VIEWS
-- =============================================

-- Create enum for commercial roles
CREATE TYPE public.commercial_role AS ENUM ('admin', 'commercial_manager', 'viewer');

-- Create commercial_user_roles table for role-based access
CREATE TABLE public.commercial_user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role commercial_role NOT NULL DEFAULT 'viewer',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Enable RLS on commercial_user_roles
ALTER TABLE public.commercial_user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check commercial role
CREATE OR REPLACE FUNCTION public.has_commercial_role(_user_id UUID, _role commercial_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.commercial_user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Function to check if user can edit commercial data (admin or commercial_manager)
CREATE OR REPLACE FUNCTION public.can_edit_commercial(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.commercial_user_roles
    WHERE user_id = _user_id
      AND role IN ('admin', 'commercial_manager')
  ) OR is_admin(_user_id)
$$;

-- Function to check if user can view commercial data (any role)
CREATE OR REPLACE FUNCTION public.can_view_commercial(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.commercial_user_roles
    WHERE user_id = _user_id
  ) OR is_admin(auth.uid())
$$;

-- =============================================
-- TARGETS TABLE
-- =============================================
CREATE TABLE public.petron_sales_funnel_targets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    month DATE NOT NULL UNIQUE, -- Always 1st day of month
    
    -- Investment
    investment_target NUMERIC(15,2) CHECK (investment_target >= 0),
    
    -- Leads
    leads_target INTEGER CHECK (leads_target >= 0),
    cpl_target NUMERIC(10,2) CHECK (cpl_target >= 0),
    
    -- Scheduling
    rate_scheduling_target NUMERIC(5,4) CHECK (rate_scheduling_target >= 0 AND rate_scheduling_target <= 1),
    appointments_target INTEGER CHECK (appointments_target >= 0),
    
    -- Attendance
    rate_attendance_target NUMERIC(5,4) CHECK (rate_attendance_target >= 0 AND rate_attendance_target <= 1),
    meetings_held_target INTEGER CHECK (meetings_held_target >= 0),
    
    -- Conversion
    rate_close_target NUMERIC(5,4) CHECK (rate_close_target >= 0 AND rate_close_target <= 1),
    sales_target INTEGER CHECK (sales_target >= 0),
    
    -- Revenue
    avg_ticket_target NUMERIC(15,2) CHECK (avg_ticket_target >= 0),
    revenue_target NUMERIC(15,2) CHECK (revenue_target >= 0),
    roas_target NUMERIC(10,2) CHECK (roas_target >= 0),
    
    -- Metadata
    notes TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Ensure month is always 1st day
CREATE OR REPLACE FUNCTION public.normalize_funnel_month()
RETURNS TRIGGER AS $$
BEGIN
    NEW.month := date_trunc('month', NEW.month)::date;
    NEW.updated_at := now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_normalize_targets_month
BEFORE INSERT OR UPDATE ON public.petron_sales_funnel_targets
FOR EACH ROW EXECUTE FUNCTION public.normalize_funnel_month();

-- =============================================
-- ACTUALS TABLE
-- =============================================
CREATE TABLE public.petron_sales_funnel_actuals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    month DATE NOT NULL UNIQUE, -- Always 1st day of month
    
    -- Investment
    investment_actual NUMERIC(15,2) CHECK (investment_actual >= 0),
    
    -- Leads
    leads_actual INTEGER CHECK (leads_actual >= 0),
    cpl_actual NUMERIC(10,2) CHECK (cpl_actual >= 0), -- Can be overridden
    
    -- Scheduling
    rate_scheduling_actual NUMERIC(5,4) CHECK (rate_scheduling_actual >= 0 AND rate_scheduling_actual <= 1),
    appointments_actual INTEGER CHECK (appointments_actual >= 0),
    
    -- Attendance
    rate_attendance_actual NUMERIC(5,4) CHECK (rate_attendance_actual >= 0 AND rate_attendance_actual <= 1),
    meetings_held_actual INTEGER CHECK (meetings_held_actual >= 0),
    
    -- Conversion
    rate_close_actual NUMERIC(5,4) CHECK (rate_close_actual >= 0 AND rate_close_actual <= 1),
    sales_actual INTEGER CHECK (sales_actual >= 0),
    
    -- Revenue
    avg_ticket_actual NUMERIC(15,2) CHECK (avg_ticket_actual >= 0),
    revenue_actual NUMERIC(15,2) CHECK (revenue_actual >= 0), -- Can be overridden
    roas_actual NUMERIC(10,2) CHECK (roas_actual >= 0), -- Can be overridden
    
    -- Metadata
    notes TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_normalize_actuals_month
BEFORE INSERT OR UPDATE ON public.petron_sales_funnel_actuals
FOR EACH ROW EXECUTE FUNCTION public.normalize_funnel_month();

-- =============================================
-- KPIs VIEW WITH CALCULATIONS
-- =============================================
CREATE OR REPLACE VIEW public.petron_sales_funnel_kpis_monthly AS
WITH monthly_data AS (
    SELECT
        COALESCE(t.month, a.month) AS month,
        
        -- Targets
        t.investment_target,
        t.leads_target,
        t.cpl_target,
        t.rate_scheduling_target,
        t.appointments_target,
        t.rate_attendance_target,
        t.meetings_held_target,
        t.rate_close_target,
        t.sales_target,
        t.avg_ticket_target,
        t.revenue_target,
        t.roas_target,
        
        -- Actuals
        a.investment_actual,
        a.leads_actual,
        a.appointments_actual,
        a.meetings_held_actual,
        a.sales_actual,
        a.avg_ticket_actual,
        
        -- Use override if provided, otherwise calculate
        COALESCE(a.cpl_actual, 
            CASE WHEN a.leads_actual > 0 THEN a.investment_actual / a.leads_actual ELSE NULL END
        ) AS cpl_actual,
        
        COALESCE(a.revenue_actual, 
            a.sales_actual * a.avg_ticket_actual
        ) AS revenue_actual,
        
        COALESCE(a.roas_actual,
            CASE WHEN a.investment_actual > 0 THEN 
                COALESCE(a.revenue_actual, a.sales_actual * a.avg_ticket_actual) / a.investment_actual 
            ELSE NULL END
        ) AS roas_actual,
        
        -- Calculated rates from actuals
        CASE WHEN a.leads_actual > 0 THEN 
            a.appointments_actual::NUMERIC / a.leads_actual 
        ELSE NULL END AS rate_scheduling_actual,
        
        CASE WHEN a.appointments_actual > 0 THEN 
            a.meetings_held_actual::NUMERIC / a.appointments_actual 
        ELSE NULL END AS rate_attendance_actual,
        
        CASE WHEN a.meetings_held_actual > 0 THEN 
            a.sales_actual::NUMERIC / a.meetings_held_actual 
        ELSE NULL END AS rate_close_actual,
        
        -- Conversion rates between stages (actuals)
        CASE WHEN a.leads_actual > 0 THEN 
            a.appointments_actual::NUMERIC / a.leads_actual 
        ELSE NULL END AS conv_leads_to_appointments,
        
        CASE WHEN a.appointments_actual > 0 THEN 
            a.meetings_held_actual::NUMERIC / a.appointments_actual 
        ELSE NULL END AS conv_appointments_to_meetings,
        
        CASE WHEN a.meetings_held_actual > 0 THEN 
            a.sales_actual::NUMERIC / a.meetings_held_actual 
        ELSE NULL END AS conv_meetings_to_sales,
        
        -- Full funnel conversion
        CASE WHEN a.leads_actual > 0 THEN 
            a.sales_actual::NUMERIC / a.leads_actual 
        ELSE NULL END AS conv_leads_to_sales,
        
        a.notes AS actual_notes,
        t.notes AS target_notes
        
    FROM public.petron_sales_funnel_targets t
    FULL OUTER JOIN public.petron_sales_funnel_actuals a ON t.month = a.month
),
with_lag AS (
    SELECT
        m.*,
        -- Month-over-Month changes
        LAG(m.leads_actual) OVER (ORDER BY m.month) AS prev_leads,
        LAG(m.meetings_held_actual) OVER (ORDER BY m.month) AS prev_meetings,
        LAG(m.sales_actual) OVER (ORDER BY m.month) AS prev_sales,
        LAG(m.roas_actual) OVER (ORDER BY m.month) AS prev_roas
    FROM monthly_data m
)
SELECT
    w.*,
    -- MoM Changes (percentage)
    CASE WHEN w.prev_leads > 0 THEN 
        ((w.leads_actual - w.prev_leads)::NUMERIC / w.prev_leads) * 100 
    ELSE NULL END AS leads_mom_change,
    
    CASE WHEN w.prev_meetings > 0 THEN 
        ((w.meetings_held_actual - w.prev_meetings)::NUMERIC / w.prev_meetings) * 100 
    ELSE NULL END AS meetings_mom_change,
    
    CASE WHEN w.prev_sales > 0 THEN 
        ((w.sales_actual - w.prev_sales)::NUMERIC / w.prev_sales) * 100 
    ELSE NULL END AS sales_mom_change,
    
    CASE WHEN w.prev_roas > 0 THEN 
        ((w.roas_actual - w.prev_roas)::NUMERIC / w.prev_roas) * 100 
    ELSE NULL END AS roas_mom_change,
    
    -- Target Achievement (percentage)
    CASE WHEN w.leads_target > 0 THEN 
        (w.leads_actual::NUMERIC / w.leads_target) * 100 
    ELSE NULL END AS leads_achievement,
    
    CASE WHEN w.sales_target > 0 THEN 
        (w.sales_actual::NUMERIC / w.sales_target) * 100 
    ELSE NULL END AS sales_achievement,
    
    CASE WHEN w.revenue_target > 0 THEN 
        (w.revenue_actual::NUMERIC / w.revenue_target) * 100 
    ELSE NULL END AS revenue_achievement,
    
    CASE WHEN w.roas_target > 0 THEN 
        (w.roas_actual::NUMERIC / w.roas_target) * 100 
    ELSE NULL END AS roas_achievement
    
FROM with_lag w
ORDER BY w.month DESC;

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================

-- Enable RLS
ALTER TABLE public.petron_sales_funnel_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.petron_sales_funnel_actuals ENABLE ROW LEVEL SECURITY;

-- Policies for commercial_user_roles
CREATE POLICY "Admins can manage commercial_user_roles"
ON public.commercial_user_roles
FOR ALL
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Users can view their own commercial roles"
ON public.commercial_user_roles
FOR SELECT
USING (auth.uid() = user_id);

-- Policies for targets table
CREATE POLICY "Users with commercial access can view targets"
ON public.petron_sales_funnel_targets
FOR SELECT
USING (can_view_commercial(auth.uid()) OR is_admin(auth.uid()));

CREATE POLICY "Users with edit access can insert targets"
ON public.petron_sales_funnel_targets
FOR INSERT
WITH CHECK (can_edit_commercial(auth.uid()));

CREATE POLICY "Users with edit access can update targets"
ON public.petron_sales_funnel_targets
FOR UPDATE
USING (can_edit_commercial(auth.uid()));

CREATE POLICY "Users with edit access can delete targets"
ON public.petron_sales_funnel_targets
FOR DELETE
USING (can_edit_commercial(auth.uid()));

-- Policies for actuals table
CREATE POLICY "Users with commercial access can view actuals"
ON public.petron_sales_funnel_actuals
FOR SELECT
USING (can_view_commercial(auth.uid()) OR is_admin(auth.uid()));

CREATE POLICY "Users with edit access can insert actuals"
ON public.petron_sales_funnel_actuals
FOR INSERT
WITH CHECK (can_edit_commercial(auth.uid()));

CREATE POLICY "Users with edit access can update actuals"
ON public.petron_sales_funnel_actuals
FOR UPDATE
USING (can_edit_commercial(auth.uid()));

CREATE POLICY "Users with edit access can delete actuals"
ON public.petron_sales_funnel_actuals
FOR DELETE
USING (can_edit_commercial(auth.uid()));

-- Create indexes for performance
CREATE INDEX idx_funnel_targets_month ON public.petron_sales_funnel_targets(month);
CREATE INDEX idx_funnel_actuals_month ON public.petron_sales_funnel_actuals(month);
CREATE INDEX idx_commercial_user_roles_user ON public.commercial_user_roles(user_id);
