
-- Account-role assignments
create table if not exists supamode.account_roles (
  account_id UUID not null references supamode.accounts (id) on delete CASCADE,
  role_id UUID not null references supamode.roles (id) on delete CASCADE,
  assigned_at TIMESTAMPTZ not null default NOW(),
  assigned_by UUID references supamode.accounts (id),
  valid_from TIMESTAMPTZ default NOW(),
  valid_until TIMESTAMPTZ,
  metadata JSONB default '{}'::jsonb,
  -- Primary key is account_id and role_id
  primary key (account_id, role_id),
  -- Ensure account_id is unique. We allow only one role per account.
  unique (account_id),
  -- Ensure valid_from is before valid_until
  constraint valid_time_range check (
    valid_from is null
    or valid_until is null
    or valid_from < valid_until
  )
);

comment on table supamode.account_roles is 'Table to store the account roles';

comment on column supamode.account_roles.account_id is 'The ID of the account';

comment on column supamode.account_roles.role_id is 'The ID of the role';

comment on column supamode.account_roles.assigned_at is 'The time the role was assigned';

comment on column supamode.account_roles.assigned_by is 'The user who assigned the role';

comment on column supamode.account_roles.valid_from is 'The time the role is valid from';

comment on column supamode.account_roles.valid_until is 'The time the role is valid until';

comment on column supamode.account_roles.metadata is 'The metadata of the role';

-- Grants
grant
select
,
  insert,
update,
delete on table supamode.account_roles to authenticated,
service_role;

-- RLS
alter table supamode.account_roles ENABLE row LEVEL SECURITY;

-- SECTION: VALIDATE ACCOUNT ROLE BUSINESS RULES
-- In this section, we define the validate account role business rules function. This function is used to validate the account role business rules.
create or replace function supamode.validate_account_role_business_rules () RETURNS TRIGGER
set
  search_path = '' as $$
DECLARE
    v_account_active BOOLEAN;
    v_role_active    BOOLEAN;
    v_existing_count INTEGER;
BEGIN
    -- Check account is active (complex query, can't be in CHECK constraint)
    SELECT is_active
    INTO v_account_active
    FROM supamode.accounts
    WHERE id = NEW.account_id;

    -- Check if account is active otherwise raise an exception
    IF NOT v_account_active THEN
        RAISE EXCEPTION 'Cannot assign role to inactive account'
            USING ERRCODE = 'check_violation';
    END IF;

    -- Check role is currently valid (involves NOW())
    SELECT (valid_until IS NULL OR valid_until > NOW())
    INTO v_role_active
    FROM supamode.roles
    WHERE id = NEW.role_id;

    -- Check if role is currently valid otherwise raise an exception
    IF NOT v_role_active THEN
        RAISE EXCEPTION 'Cannot assign expired role'
            USING ERRCODE = 'check_violation';
    END IF;

    -- Check for duplicate active assignments (complex query)
    IF TG_OP = 'INSERT' THEN
        SELECT COUNT(*)
        INTO v_existing_count
        FROM supamode.account_roles
        WHERE account_id = NEW.account_id
          AND role_id = NEW.role_id
          AND (valid_until IS NULL OR valid_until > NOW());

        IF v_existing_count > 0 THEN
            RAISE EXCEPTION 'Account already has this role assigned'
                USING ERRCODE = 'unique_violation';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

create trigger account_role_business_rules_check BEFORE INSERT
or
update on supamode.account_roles for EACH row
execute FUNCTION supamode.validate_account_role_business_rules ();
