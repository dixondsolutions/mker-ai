-- SECTION: ACCOUNT POLICIES
-- In this section, we define the account policies. The account policies are used to control the access to the accounts table.
-- SELECT(supamode.accounts)
-- Can the current user view an account?
create policy select_accounts on supamode.accounts for
select
  to AUTHENTICATED using (
    -- Any authenticated user with admin access can view the accounts table
    supamode.verify_admin_access ()
  );

-- UPDATE(supamode.accounts)
-- Can the current user update an account?
create policy update_accounts on supamode.accounts
for update
  to AUTHENTICATED using (
    id = supamode.get_current_user_account_id() OR
    -- Users can update their own account if they have the update account permission
    supamode.can_action_account (id, 'update')
  );

-- DELETE(supamode.accounts)
-- Can the current user delete an account?
create policy delete_accounts on supamode.accounts for DELETE to AUTHENTICATED using (
  -- Users can delete their own account
  supamode.can_action_account (id, 'delete')
);