
-- SECTION: UPDATE UPDATED AT COLUMN
-- In this section, we define the update updated at column function. This function is used to update the updated at column for all relevant tables.
do $$
    DECLARE
        t text;
    BEGIN
        FOR t IN
            SELECT table_name
            FROM information_schema.columns
            WHERE table_schema = 'supamode'
              AND column_name = 'updated_at'
            LOOP
                EXECUTE format('
            CREATE TRIGGER update_%I_timestamp
            BEFORE UPDATE ON supamode.%I
            FOR EACH ROW
            EXECUTE FUNCTION supamode.update_updated_at_column();
        ', t, t);
            END LOOP;
    END;
$$;

-- SECTION: AUDIT TRIGGERS FOR PERMISSIONS, ROLES, AND PERMISSION GROUPS
-- This section adds database triggers to automatically log changes to permission-related tables
-- SECTION: AUDIT TRIGGER FUNCTION
-- Generic trigger function that can be used for any table to create audit logs
create or replace function supamode.audit_trigger_function () returns trigger
set
  row_security = off
set
  search_path = '' as $$
declare
    v_operation   text;
    v_old_data    jsonb;
    v_new_data    jsonb;
    v_record_id   text;
    v_record_json jsonb;
begin
    -- Determine operation type and get record data
    if TG_OP = 'DELETE' then
        v_operation := 'DELETE';
        v_old_data := to_jsonb(OLD);
        v_new_data := null;
        v_record_json := v_old_data;
    elsif TG_OP = 'UPDATE' then
        v_operation := 'UPDATE';
        v_old_data := to_jsonb(OLD);
        v_new_data := to_jsonb(NEW);
        v_record_json := v_new_data;
    elsif TG_OP = 'INSERT' then
        v_operation := 'INSERT';
        v_old_data := null;
        v_new_data := to_jsonb(NEW);
        v_record_json := v_new_data;
    end if;

    -- Generate record ID based on table structure
    -- For tables with single 'id' primary key
    if v_record_json ? 'id' then
        v_record_id := (v_record_json ->> 'id')::text;
    else
        -- For tables with composite primary keys, create a combined ID
        case TG_TABLE_NAME
            when 'account_roles'
                then v_record_id := (v_record_json ->> 'account_id') || '|' || (v_record_json ->> 'role_id');
            when 'role_permissions'
                then v_record_id := (v_record_json ->> 'role_id') || '|' || (v_record_json ->> 'permission_id');
            when 'account_permissions'
                then v_record_id := (v_record_json ->> 'account_id') || '|' || (v_record_json ->> 'permission_id');
            when 'permission_group_permissions'
                then v_record_id := (v_record_json ->> 'group_id') || '|' || (v_record_json ->> 'permission_id');
            when 'role_permission_groups'
                then v_record_id := (v_record_json ->> 'role_id') || '|' || (v_record_json ->> 'group_id');
            else -- Fallback: use all non-null fields as record ID
            v_record_id := v_record_json::text;
            end case;
    end if;

    -- Create audit log entry
    perform supamode.create_audit_log(
            p_operation := v_operation,
            p_schema := TG_TABLE_SCHEMA,
            p_table := TG_TABLE_NAME,
            p_record_id := v_record_id,
            p_old_data := v_old_data,
            p_new_data := v_new_data,
            p_severity := 'info',
            p_metadata := jsonb_build_object(
                    'trigger_name', TG_NAME,
                    'trigger_when', TG_WHEN,
                    'trigger_level', TG_LEVEL
                          )
            );

    -- Return appropriate record
    if TG_OP = 'DELETE' then
        return OLD;
    else
        return NEW;
    end if;
end;
$$ language plpgsql security definer;

-- SECTION: ROLES TABLE AUDIT TRIGGERS
-- Create triggers for the roles table
create trigger roles_audit_insert_trigger
after insert on supamode.roles for each row
execute function supamode.audit_trigger_function ();

create trigger roles_audit_update_trigger
after
update on supamode.roles for each row
execute function supamode.audit_trigger_function ();

create trigger roles_audit_delete_trigger
after delete on supamode.roles for each row
execute function supamode.audit_trigger_function ();

-- SECTION: PERMISSIONS TABLE AUDIT TRIGGERS
-- Create triggers for the permissions table
create trigger permissions_audit_insert_trigger
after insert on supamode.permissions for each row
execute function supamode.audit_trigger_function ();

create trigger permissions_audit_update_trigger
after
update on supamode.permissions for each row
execute function supamode.audit_trigger_function ();

create trigger permissions_audit_delete_trigger
after delete on supamode.permissions for each row
execute function supamode.audit_trigger_function ();

-- SECTION: PERMISSION GROUPS TABLE AUDIT TRIGGERS
-- Create triggers for the permission_groups table
create trigger permission_groups_audit_insert_trigger
after insert on supamode.permission_groups for each row
execute function supamode.audit_trigger_function ();

create trigger permission_groups_audit_update_trigger
after
update on supamode.permission_groups for each row
execute function supamode.audit_trigger_function ();

create trigger permission_groups_audit_delete_trigger
after delete on supamode.permission_groups for each row
execute function supamode.audit_trigger_function ();

-- SECTION: ACCOUNT ROLES TABLE AUDIT TRIGGERS
-- Create triggers for the account_roles junction table
create trigger account_roles_audit_insert_trigger
after insert on supamode.account_roles for each row
execute function supamode.audit_trigger_function ();

create trigger account_roles_audit_delete_trigger
after delete on supamode.account_roles for each row
execute function supamode.audit_trigger_function ();

-- SECTION: ROLE PERMISSIONS TABLE AUDIT TRIGGERS
-- Create triggers for the role_permissions junction table
create trigger role_permissions_audit_insert_trigger
after insert on supamode.role_permissions for each row
execute function supamode.audit_trigger_function ();

create trigger role_permissions_audit_delete_trigger
after delete on supamode.role_permissions for each row
execute function supamode.audit_trigger_function ();

-- SECTION: ACCOUNT PERMISSIONS TABLE AUDIT TRIGGERS
-- Create triggers for the account_permissions table
create trigger account_permissions_audit_insert_trigger
after insert on supamode.account_permissions for each row
execute function supamode.audit_trigger_function ();

create trigger account_permissions_audit_update_trigger
after
update on supamode.account_permissions for each row
execute function supamode.audit_trigger_function ();

create trigger account_permissions_audit_delete_trigger
after delete on supamode.account_permissions for each row
execute function supamode.audit_trigger_function ();

-- SECTION: PERMISSION GROUP PERMISSIONS TABLE AUDIT TRIGGERS
-- Create triggers for the permission_group_permissions junction table
create trigger permission_group_permissions_audit_insert_trigger
after insert on supamode.permission_group_permissions for each row
execute function supamode.audit_trigger_function ();

create trigger permission_group_permissions_audit_delete_trigger
after delete on supamode.permission_group_permissions for each row
execute function supamode.audit_trigger_function ();

-- SECTION: ROLE PERMISSION GROUPS TABLE AUDIT TRIGGERS
-- Create triggers for the role_permission_groups junction table
create trigger role_permission_groups_audit_insert_trigger
after insert on supamode.role_permission_groups for each row
execute function supamode.audit_trigger_function ();

create trigger role_permission_groups_audit_delete_trigger
after delete on supamode.role_permission_groups for each row
execute function supamode.audit_trigger_function ();