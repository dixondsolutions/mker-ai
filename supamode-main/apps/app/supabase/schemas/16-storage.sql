-- SECTION: GET COLUMN STORAGE CONFIG
-- In this section, we define the get column storage config function. This function is used to get the storage configuration for a column.
create or replace function supamode.get_column_storage_config (p_schema text, p_table text, p_column text) RETURNS jsonb
set
  search_path = '' as $$
DECLARE
    v_config jsonb;
BEGIN
    -- Validate inputs
    p_schema := supamode.sanitize_identifier(p_schema);
    p_table := supamode.sanitize_identifier(p_table);
    p_column := supamode.sanitize_identifier(p_column);

    -- Check permissions
    IF NOT supamode.has_data_permission('select'::supamode.system_action, p_schema, p_table) THEN
        RAISE EXCEPTION 'Permission denied for accessing table metadata';
    END IF;

    SELECT tm.columns_config -> p_column -> 'ui_config' -> 'ui_data_type_config'
    INTO v_config
    FROM supamode.table_metadata tm
    WHERE tm.schema_name = p_schema
      AND tm.table_name = p_table
      AND tm.columns_config -> p_column -> 'ui_config' ->> 'ui_data_type' IN ('file', 'image');

    RETURN COALESCE(v_config, '{}'::jsonb);
END;
$$ LANGUAGE plpgsql;

grant
execute on function supamode.get_column_storage_config to authenticated;

-- SECTION: SUPABASE STORAGE RLS POLICIES
-- Simple policies using the single permission function
create policy "supamode_storage_upload" on storage.objects for INSERT to authenticated
with
  check (
    supamode.has_storage_permission (bucket_id, 'insert'::supamode.system_action, name)
  );

-- Add policy to check if the user has the permission to select the object
create policy "supamode_storage_select" on storage.objects for
select
  to authenticated using (
    supamode.has_storage_permission (bucket_id, 'select'::supamode.system_action, name)
  );

-- Add policy to check if the user has the permission to update the object
create policy "supamode_storage_update" on storage.objects
for update
  to authenticated using (
    supamode.has_storage_permission (bucket_id, 'update'::supamode.system_action, name)
  );

-- TODO: Add a policy to check if the user has the permission to delete the object
create policy "supamode_storage_delete" on storage.objects for DELETE to authenticated using (
  supamode.has_storage_permission (bucket_id, 'delete'::supamode.system_action, name)
);