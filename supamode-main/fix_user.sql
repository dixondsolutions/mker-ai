
UPDATE auth.users
SET raw_app_meta_data = raw_app_meta_data || '{"supamode_access": "true"}'::jsonb
WHERE email = 'matthew@dixondigital.co';
