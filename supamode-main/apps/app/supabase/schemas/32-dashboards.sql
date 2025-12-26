-- ============================================
-- SECTION: CORE TABLES 
-- ============================================

CREATE TYPE supamode.dashboard_permission_level AS ENUM ('owner', 'view', 'edit');

CREATE TYPE supamode.dashboard_widget_type AS ENUM ('chart', 'metric', 'table');

CREATE TABLE IF NOT EXISTS supamode.dashboards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  created_by UUID REFERENCES supamode.accounts(id) ON DELETE CASCADE NOT NULL DEFAULT supamode.get_current_user_account_id(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT dashboards_name_check CHECK (LENGTH(TRIM(name)) >= 3)
);

-- Dashboard widgets
CREATE TABLE IF NOT EXISTS supamode.dashboard_widgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dashboard_id UUID REFERENCES supamode.dashboards(id) ON DELETE CASCADE NOT NULL,
  widget_type supamode.dashboard_widget_type NOT NULL,
  title VARCHAR(255) NOT NULL,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  position JSONB NOT NULL,
  schema_name VARCHAR(64) NOT NULL,
  table_name VARCHAR(64) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  FOREIGN KEY (schema_name, table_name) 
    REFERENCES supamode.table_metadata(schema_name, table_name) ON DELETE CASCADE,
  
  CONSTRAINT position_valid CHECK (
    position ? 'x' AND position ? 'y' AND 
    position ? 'w' AND position ? 'h' AND
    (position->'x')::numeric >= 0 AND 
    (position->'y')::numeric >= 0 AND
    (position->'w')::numeric > 0 AND 
    (position->'h')::numeric > 0
  )
);

-- Dashboard role shares - SIMPLE
CREATE TABLE IF NOT EXISTS supamode.dashboard_role_shares (
  dashboard_id UUID REFERENCES supamode.dashboards(id) ON DELETE CASCADE NOT NULL,
  role_id UUID REFERENCES supamode.roles(id) ON DELETE CASCADE NOT NULL,
  permission_level supamode.dashboard_permission_level NOT NULL DEFAULT 'view',
  granted_by UUID REFERENCES supamode.accounts(id) NOT NULL,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  PRIMARY KEY (dashboard_id, role_id)
);

-- ============================================
-- SECTION: INDEXES
-- ============================================

CREATE INDEX idx_dashboards_created_by ON supamode.dashboards(created_by);
CREATE INDEX idx_dashboard_widgets_dashboard ON supamode.dashboard_widgets(dashboard_id);
CREATE INDEX idx_dashboard_role_shares_dashboard ON supamode.dashboard_role_shares(dashboard_id);
CREATE INDEX idx_dashboard_role_shares_role ON supamode.dashboard_role_shares(role_id);

-- ============================================
-- SECTION: RLS HELPER FUNCTIONS
-- ============================================

-- Check if user can access dashboard
CREATE OR REPLACE FUNCTION supamode.can_access_dashboard(p_dashboard_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_current_user_id UUID;
BEGIN
  v_current_user_id := supamode.get_current_user_account_id();
  
  RETURN EXISTS (
    SELECT 1 FROM supamode.dashboards d
    WHERE d.id = p_dashboard_id
    AND (
      d.created_by = v_current_user_id
      OR EXISTS (
        SELECT 1 FROM supamode.dashboard_role_shares drs
        JOIN supamode.account_roles ar ON ar.role_id = drs.role_id
        WHERE drs.dashboard_id = d.id
        AND ar.account_id = v_current_user_id
      )
    )
  );
END;
$$;

-- Check if user can edit dashboard
CREATE OR REPLACE FUNCTION supamode.can_edit_dashboard(p_dashboard_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_current_user_id UUID;
BEGIN
  v_current_user_id := supamode.get_current_user_account_id();
  
  RETURN EXISTS (
    SELECT 1 FROM supamode.dashboards d
    WHERE d.id = p_dashboard_id
    AND (
      d.created_by = v_current_user_id
      OR EXISTS (
        SELECT 1 FROM supamode.dashboard_role_shares drs
        JOIN supamode.account_roles ar ON ar.role_id = drs.role_id
        WHERE drs.dashboard_id = d.id
        AND ar.account_id = v_current_user_id
        AND drs.permission_level = ANY(ARRAY['edit', 'owner']::supamode.dashboard_permission_level[])
      )
    )
  );
END;
$$;

-- ============================================
-- SECTION: RLS POLICIES (USING FUNCTIONS)
-- ============================================

ALTER TABLE supamode.dashboards ENABLE ROW LEVEL SECURITY;
ALTER TABLE supamode.dashboard_widgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE supamode.dashboard_role_shares ENABLE ROW LEVEL SECURITY;

-- Dashboards
CREATE POLICY select_dashboards ON supamode.dashboards FOR SELECT
USING (supamode.can_access_dashboard(id));

CREATE POLICY insert_dashboards ON supamode.dashboards FOR INSERT
WITH CHECK (
  supamode.verify_admin_access() AND
  created_by = supamode.get_current_user_account_id()
);

CREATE POLICY update_dashboards ON supamode.dashboards FOR UPDATE
USING (supamode.can_edit_dashboard(id));

CREATE POLICY delete_dashboards ON supamode.dashboards FOR DELETE
USING (created_by = supamode.get_current_user_account_id());

-- Widgets
CREATE POLICY select_widgets ON supamode.dashboard_widgets FOR SELECT
USING (supamode.can_access_dashboard(dashboard_id));

CREATE POLICY insert_widgets ON supamode.dashboard_widgets FOR INSERT
WITH CHECK (
  supamode.can_edit_dashboard(dashboard_id)
  AND supamode.has_data_permission(
    'select',
    schema_name,
    table_name
  )
);

CREATE POLICY update_widgets ON supamode.dashboard_widgets FOR UPDATE
USING (supamode.can_edit_dashboard(dashboard_id));

CREATE POLICY delete_widgets ON supamode.dashboard_widgets FOR DELETE
USING (supamode.can_edit_dashboard(dashboard_id));

-- Shares (only owner can manage, and only with roles of lower rank)
CREATE POLICY manage_shares ON supamode.dashboard_role_shares FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM supamode.dashboards d
    WHERE d.id = dashboard_role_shares.dashboard_id
    AND d.created_by = supamode.get_current_user_account_id()
  )
)
WITH CHECK (
  -- Additional check for INSERT/UPDATE: ensure role hierarchy is respected
  EXISTS (
    SELECT 1 FROM supamode.dashboards d
    WHERE d.id = dashboard_role_shares.dashboard_id
    AND d.created_by = supamode.get_current_user_account_id()
  )
  AND (
    SELECT r.rank 
    FROM supamode.roles r 
    WHERE r.id = dashboard_role_shares.role_id
  ) < supamode.get_user_max_role_rank(supamode.get_current_user_account_id())
);

-- ============================================
-- SECTION: TRIGGERS
-- ============================================

CREATE TRIGGER widget_changes_update_dashboard
AFTER INSERT OR UPDATE OR DELETE ON supamode.dashboard_widgets
FOR EACH ROW EXECUTE FUNCTION supamode.update_updated_at_column();

-- ============================================
-- SECTION: CORE FUNCTIONS
-- ============================================

-- Get dashboard details
CREATE OR REPLACE FUNCTION supamode.get_dashboard(p_dashboard_id UUID)
RETURNS JSONB
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_result JSONB;
BEGIN
  -- Check access
  IF NOT supamode.can_access_dashboard(p_dashboard_id) THEN
    RAISE EXCEPTION 'Dashboard not found or access denied';
  END IF;
  
  SELECT jsonb_build_object(
    'dashboard', row_to_json(d),
    'widgets', (
      SELECT jsonb_agg(row_to_json(w) ORDER BY (w.position->>'y')::int, (w.position->>'x')::int)
      FROM supamode.dashboard_widgets w
      WHERE w.dashboard_id = d.id
    ),
    'can_edit', supamode.can_edit_dashboard(d.id)
  ) INTO v_result
  FROM supamode.dashboards d
  WHERE d.id = p_dashboard_id;
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- List dashboards
CREATE OR REPLACE FUNCTION supamode.list_dashboards(
  p_page INTEGER DEFAULT 1,
  p_page_size INTEGER DEFAULT 20,
  p_search TEXT DEFAULT NULL,
  p_filter VARCHAR(20) DEFAULT 'all'
)
RETURNS JSONB
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_current_user_id UUID;
  v_offset INTEGER;
  v_dashboards JSONB;
  v_total INTEGER;
BEGIN
  v_current_user_id := supamode.get_current_user_account_id();
  
  -- Validate inputs
  p_page := GREATEST(1, p_page);
  p_page_size := LEAST(GREATEST(1, p_page_size), 100);
  v_offset := (p_page - 1) * p_page_size;
  
  WITH accessible AS (
    SELECT DISTINCT
      d.*,
      d.created_by = v_current_user_id AS is_owner,
      CASE 
        WHEN d.created_by = v_current_user_id THEN 'owner'
        ELSE drs.permission_level
      END AS permission_level,
      COUNT(DISTINCT dw.id) AS widget_count
    FROM supamode.dashboards d
    LEFT JOIN supamode.dashboard_role_shares drs ON 
      drs.dashboard_id = d.id 
      AND EXISTS (
        SELECT 1 FROM supamode.account_roles ar 
        WHERE ar.role_id = drs.role_id 
        AND ar.account_id = v_current_user_id
      )
    LEFT JOIN supamode.dashboard_widgets dw ON dw.dashboard_id = d.id
    WHERE 
      d.created_by = v_current_user_id OR drs.dashboard_id IS NOT NULL
    GROUP BY d.id, drs.permission_level
  ),
  filtered AS (
    SELECT * FROM accessible
    WHERE 
      (p_search IS NULL OR name ILIKE '%' || supamode.sanitize_identifier(p_search) || '%')
      AND (
        p_filter = 'all' OR
        (p_filter = 'owned' AND is_owner) OR
        (p_filter = 'shared' AND NOT is_owner)
      )
  )
  SELECT 
    jsonb_build_object(
      'dashboards', jsonb_agg(row_to_json(f) ORDER BY f.updated_at DESC),
      'pagination', jsonb_build_object(
        'page', p_page,
        'page_size', p_page_size,
        'total', COUNT(*) OVER()
      )
    ) INTO v_dashboards
  FROM (
    SELECT * FROM filtered
    LIMIT p_page_size OFFSET v_offset
  ) f;
  
  RETURN COALESCE(v_dashboards, jsonb_build_object(
    'dashboards', '[]'::jsonb,
    'pagination', jsonb_build_object('page', 1, 'page_size', p_page_size, 'total', 0)
  ));
END;
$$ LANGUAGE plpgsql;

-- Share dashboard
CREATE OR REPLACE FUNCTION supamode.share_dashboard_with_role(
  p_dashboard_id UUID,
  p_role_id UUID,
  p_permission_level supamode.dashboard_permission_level DEFAULT 'view'
)
RETURNS JSONB
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_current_user_id UUID;
  v_current_priority INTEGER;
  v_target_priority INTEGER;
BEGIN
  v_current_user_id := supamode.get_current_user_account_id();
  
  -- Verify ownership
  IF NOT EXISTS (
    SELECT 1 FROM supamode.dashboards
    WHERE id = p_dashboard_id AND created_by = v_current_user_id
  ) THEN
    RAISE EXCEPTION 'Dashboard not found or you do not own it';
  END IF;
  
  -- Check role rank
  v_current_priority := supamode.get_user_max_role_rank(v_current_user_id);
  SELECT rank INTO v_target_priority FROM supamode.roles WHERE id = p_role_id;
  
  IF v_current_priority <= v_target_priority THEN
    RAISE EXCEPTION 'Cannot share with equal or higher priority roles';
  END IF;
  
  -- Upsert share
  INSERT INTO supamode.dashboard_role_shares (
    dashboard_id, role_id, permission_level, granted_by
  ) VALUES (
    p_dashboard_id, p_role_id, p_permission_level, v_current_user_id
  )
  ON CONFLICT (dashboard_id, role_id) 
  DO UPDATE SET 
    permission_level = EXCLUDED.permission_level,
    granted_at = NOW();
  
  RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql;

-- Remove share
CREATE OR REPLACE FUNCTION supamode.unshare_dashboard_from_role(
  p_dashboard_id UUID,
  p_role_id UUID
)
RETURNS JSONB
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Verify ownership
  IF NOT EXISTS (
    SELECT 1 FROM supamode.dashboards
    WHERE id = p_dashboard_id 
    AND created_by = supamode.get_current_user_account_id()
  ) THEN
    RAISE EXCEPTION 'Dashboard not found or you do not own it';
  END IF;
  
  DELETE FROM supamode.dashboard_role_shares
  WHERE dashboard_id = p_dashboard_id AND role_id = p_role_id;
  
  RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql;

-- Create dashboard
CREATE OR REPLACE FUNCTION supamode.create_dashboard(
  p_name TEXT,
  p_role_shares JSONB DEFAULT NULL
)
RETURNS JSONB
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_result supamode.dashboards;
  v_current_user_id UUID;
  v_role_share JSONB;
  v_role_id UUID;
  v_permission_level supamode.dashboard_permission_level;
BEGIN
  -- Get current user ID
  v_current_user_id := supamode.get_current_user_account_id();
  
  -- Verify admin access
  IF NOT supamode.verify_admin_access() THEN
    RAISE EXCEPTION 'Access denied' USING ERRCODE = 'insufficient_privilege';
  END IF;
  
  -- Validate input
  IF p_name IS NULL OR LENGTH(TRIM(p_name)) < 3 THEN
    RAISE EXCEPTION 'Dashboard name must be at least 3 characters' USING ERRCODE = 'invalid_parameter_value';
  END IF;
  
  -- Insert and return the dashboard
  INSERT INTO supamode.dashboards (name, created_by)
  VALUES (TRIM(p_name), v_current_user_id)
  RETURNING * INTO v_result;
  
  -- Add role shares if provided
  IF p_role_shares IS NOT NULL AND jsonb_typeof(p_role_shares) = 'array' THEN
    FOR v_role_share IN SELECT * FROM jsonb_array_elements(p_role_shares)
    LOOP
      -- Extract role_id and permission_level from each object
      v_role_id := (v_role_share->>'roleId')::UUID;
      v_permission_level := (v_role_share->>'permissionLevel')::supamode.dashboard_permission_level;
      
      -- Validate the extracted values
      IF v_role_id IS NOT NULL AND v_permission_level IS NOT NULL THEN
        INSERT INTO supamode.dashboard_role_shares (dashboard_id, role_id, permission_level, granted_by)
        VALUES (v_result.id, v_role_id, v_permission_level, v_current_user_id)
        ON CONFLICT (dashboard_id, role_id) DO UPDATE SET
          permission_level = EXCLUDED.permission_level,
          granted_at = NOW();
      END IF;
    END LOOP;
  END IF;
  
  -- Return dashboard as JSON object
  RETURN jsonb_build_object(
    'id', v_result.id,
    'name', v_result.name,
    'created_by', v_result.created_by,
    'created_at', v_result.created_at,
    'updated_at', v_result.updated_at
  );
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- SECTION: GRANTS
-- ============================================

GRANT SELECT, INSERT, UPDATE, DELETE ON supamode.dashboards TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON supamode.dashboard_widgets TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON supamode.dashboard_role_shares TO authenticated;
GRANT EXECUTE ON FUNCTION supamode.can_access_dashboard TO authenticated;
GRANT EXECUTE ON FUNCTION supamode.can_edit_dashboard TO authenticated;
GRANT EXECUTE ON FUNCTION supamode.get_dashboard TO authenticated;
GRANT EXECUTE ON FUNCTION supamode.list_dashboards TO authenticated;
GRANT EXECUTE ON FUNCTION supamode.share_dashboard_with_role TO authenticated;
GRANT EXECUTE ON FUNCTION supamode.unshare_dashboard_from_role TO authenticated;
GRANT EXECUTE ON FUNCTION supamode.create_dashboard TO authenticated;