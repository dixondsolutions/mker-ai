
-- SECTION: ACCOUNTS
-- In this section, we define the accounts table. The accounts table links a Supabase Auth user to an account in Supamode.
create table if not exists supamode.accounts (
  id UUID primary key default gen_random_uuid (),
  auth_user_id UUID not null unique references auth.users (id) on delete CASCADE,
  created_at TIMESTAMPTZ not null default NOW(),
  updated_at TIMESTAMPTZ not null default NOW(),
  is_active BOOLEAN not null default true,
  -- metadata is used to store the metadata of the account
  metadata JSONB not null default '{
      "username": "",
      "picture_url": ""
    }'::jsonb check (jsonb_typeof(metadata) = 'object'),
  -- preferences is used to store the preferences of the account
  preferences JSONB not null default '{
      "timezone": "",
      "language": "en-US"
    }'::jsonb check (jsonb_typeof(preferences) = 'object')
);

comment on table supamode.accounts is 'Table to store the accounts';

comment on column supamode.accounts.id is 'The ID of the account';

comment on column supamode.accounts.auth_user_id is 'The ID of the auth user';

comment on column supamode.accounts.created_at is 'The creation time of the account';

comment on column supamode.accounts.updated_at is 'The last update time of the account';

comment on column supamode.accounts.is_active is 'Whether the account is active. Protected field - cannot be updated directly by users.';

comment on column supamode.accounts.auth_user_id is 'The ID of the auth user. Protected field - cannot be updated directly by users.';

comment on column supamode.accounts.metadata is 'The metadata of the account. Can be updated by account owners and authorized admins.';

comment on column supamode.accounts.preferences is 'The preferences of the account. Can be updated by account owners and authorized admins.';

-- Permissions --
-- Grant SELECT, INSERT, DELETE to authenticated users
grant
select
,
  insert,
delete on table supamode.accounts to authenticated,
service_role;

-- Column-level UPDATE permissions for security
-- Only allow updates to safe columns, protecting sensitive fields like is_active and auth_user_id
grant UPDATE (
  metadata,        -- User profile information - safe to update
  preferences,     -- User settings - safe to update  
  updated_at       -- Timestamp - safe to update
) on table supamode.accounts to authenticated;

-- Allow service_role to update is_active
grant UPDATE (
  is_active
) on table supamode.accounts to service_role;

-- RLS
alter table supamode.accounts ENABLE row LEVEL SECURITY;

-- Triggers
-- Function to prevent active status update by user
create or replace function supamode.prevent_active_status_update_by_user () RETURNS TRIGGER
set
  search_path = '' as $$
BEGIN
    if (select auth.uid()) = NEW.auth_user_id then
        RAISE EXCEPTION 'User cannot update their own active status';
    end if;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger to prevent active status update by user when updating the account
create trigger prevent_active_status_update_by_user before
update of is_active on supamode.accounts for each row
execute function supamode.prevent_active_status_update_by_user ();

-- Functions
-- Update user preferences
create or replace function supamode.update_user_preferences (p_preferences JSONB) RETURNS jsonb
set
  search_path = '' as $$
DECLARE
    v_old_preferences jsonb;
BEGIN
    -- Get old preferences
    SELECT preferences
    INTO v_old_preferences
    FROM supamode.accounts
    WHERE auth_user_id = (select auth.uid());

    -- Update
    UPDATE supamode.accounts
    SET preferences = p_preferences
    WHERE auth_user_id = (select auth.uid());

    RETURN jsonb_build_object(
            'success', true,
            'action', 'update',
            'data', jsonb_build_object(
                    'old_preferences', v_old_preferences,
                    'new_preferences', p_preferences
                    )
           );
END;
$$ LANGUAGE plpgsql;

grant
execute on function supamode.update_user_preferences (JSONB) to authenticated;

-- Function to get the current user's account ID
create or replace function supamode.get_current_user_account_id () RETURNS uuid LANGUAGE plpgsql
set
  search_path = '' as $$
BEGIN
    RETURN (SELECT id from supamode.accounts where (select auth.uid()) = auth_user_id and is_active = true);
END;
$$;

grant
execute on function supamode.get_current_user_account_id () to authenticated;