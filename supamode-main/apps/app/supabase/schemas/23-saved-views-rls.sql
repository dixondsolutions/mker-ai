
-- SECTION: INSERT SAVED VIEWS
-- In this section, we define the insert saved views policy. This policy is used to control the access to the saved views table.
-- INSERT(supamode.saved_views)
-- Can the current user insert a saved view?
create policy insert_saved_views on supamode.saved_views for INSERT to authenticated
with
  check (
    created_by = supamode.get_current_user_account_id ()
  );

-- UPDATE(supamode.saved_views)
-- Can the current user update a saved view?
create policy update_saved_views on supamode.saved_views
for update
  to authenticated using (
    created_by = supamode.get_current_user_account_id ()
  )
with
  check (
    created_by = supamode.get_current_user_account_id ()
  );

-- DELETE(supamode.saved_views)
-- Can the current user delete a saved view?
create policy delete_saved_views on supamode.saved_views for DELETE to authenticated using (
  created_by = supamode.get_current_user_account_id ()
);

-- SELECT(supamode.saved_views)
-- Can the current user view a saved view they have created?
create policy view_personal_saved_views on supamode.saved_views for
select
  to authenticated using (
    created_by = supamode.get_current_user_account_id ()
  );

-- SELECT(supamode.saved_views)
-- Can the current user view a saved view shared with them using the saved view roles table?
create policy view_shared_saved_views on supamode.saved_views for
select
  to authenticated using (
    exists (
      select
        1
      from
        supamode.saved_view_roles
      where
        view_id = supamode.saved_views.id
        and supamode.account_has_role (supamode.get_current_user_account_id (), role_id)
    )
  );

-- SELECT(supamode.saved_view_roles)
-- Can the current user view a saved view they have created?
create policy view_personal_saved_view_roles on supamode.saved_view_roles for
select
  to authenticated using (
    supamode.account_has_role (supamode.get_current_user_account_id (), role_id)
  );

-- INSERT(supamode.saved_view_roles)
-- Can the current user insert a shared view if their role rank is higher than the view's role rank
create policy insert_shared_saved_views on supamode.saved_view_roles for INSERT to authenticated
with
  check (
    supamode.get_user_max_role_rank (supamode.get_current_user_account_id ()) > (
      select
        rank
      from
        supamode.roles
      where
        id = role_id
    )
  );