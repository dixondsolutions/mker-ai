-- =============================================
-- DEMO SCHEMA SEED
-- =============================================
CREATE OR REPLACE PROCEDURE supamode.install_demo_schema (
) LANGUAGE plpgsql 
set
  search_path = ''
AS $$ DECLARE
    _seed_version constant int := 1;          -- bump when seeds change
BEGIN
-- Simple Blog Management System Database Schema
-- Clean schema without seeds - following Supamode patterns

-- =============================================
-- ENUMS
-- =============================================

-- Return Early if the schema is already installed
IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'accounts') THEN
    RETURN;
END IF;

EXECUTE FORMAT($dlg$
CREATE TYPE public.content_status AS ENUM (
    'draft',
    'published',
    'archived'
);
$dlg$);

EXECUTE FORMAT($dlg$
CREATE TYPE public.comment_status AS ENUM (
    'pending',
    'approved',
    'spam'
);
$dlg$);

EXECUTE FORMAT($dlg$
CREATE TYPE public.blog_role AS ENUM (
    'admin',
    'editor',
    'author'
);
$dlg$);

-- =============================================
-- ACCOUNTS (connecting to Supabase Auth)
-- =============================================

EXECUTE FORMAT($dlg$
CREATE TABLE IF NOT EXISTS public.accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    bio TEXT,
    avatar_url TEXT,
    role public.blog_role NOT NULL DEFAULT 'author',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    preferences JSONB DEFAULT '{"theme": "light", "notifications": true}'::jsonb,
    social_links JSONB DEFAULT '{}'::jsonb
);
$dlg$);

-- =============================================
-- CATEGORIES
-- =============================================

EXECUTE FORMAT($dlg$
CREATE TABLE public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    color VARCHAR(7) DEFAULT '#3B82F6',
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT categories_color_check CHECK (color ~* '^#[0-9A-Fa-f]{6}$')
);
$dlg$);

-- =============================================
-- TAGS
-- =============================================

EXECUTE FORMAT($dlg$
CREATE TABLE public.tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    color VARCHAR(7) DEFAULT '#6B7280',
    usage_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
$dlg$);

-- =============================================
-- BLOG POSTS
-- =============================================

EXECUTE FORMAT($dlg$
CREATE TABLE public.posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    excerpt TEXT,
    content TEXT NOT NULL,
    content_markdown TEXT,
    status public.content_status NOT NULL DEFAULT 'draft',
    
    author_id UUID NOT NULL REFERENCES public.accounts(id),
    category_id UUID REFERENCES public.categories(id),
    featured_image text null, -- Storage reference
    
    published_at TIMESTAMPTZ,
    view_count INTEGER NOT NULL DEFAULT 0,
    comment_count INTEGER NOT NULL DEFAULT 0,
    allow_comments BOOLEAN NOT NULL DEFAULT true,
    is_featured BOOLEAN NOT NULL DEFAULT false,
    
    meta_title VARCHAR(255),
    meta_description TEXT,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT posts_published_check CHECK (
        (status = 'published' AND published_at IS NOT NULL) OR
        (status != 'published')
    )
);
$dlg$);

-- =============================================
-- POST TAGS (Many-to-Many)
-- =============================================

EXECUTE FORMAT($dlg$
CREATE TABLE public.post_tags (
    post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
    tag_id UUID NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    PRIMARY KEY (post_id, tag_id)
);
$dlg$);

-- =============================================
-- COMMENTS
-- =============================================

EXECUTE FORMAT($dlg$
CREATE TABLE public.comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content TEXT NOT NULL,
    status public.comment_status NOT NULL DEFAULT 'pending',
    
    post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
    author_id UUID REFERENCES public.accounts(id),
    parent_id UUID REFERENCES public.comments(id),
    
    guest_name VARCHAR(255),
    guest_email VARCHAR(255),
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT comments_author_or_guest CHECK (
        (author_id IS NOT NULL) OR 
        (guest_name IS NOT NULL AND guest_email IS NOT NULL)
    )
);
$dlg$);

-- =============================================
-- SETTINGS
-- =============================================

EXECUTE FORMAT($dlg$
CREATE TABLE public.site_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key VARCHAR(255) UNIQUE NOT NULL,
    value TEXT,
    description TEXT,
    category VARCHAR(100) DEFAULT 'general',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
$dlg$);

-- Create private schema
EXECUTE FORMAT($dlg$
CREATE SCHEMA licensing;
$dlg$);

-- Custom types in our schema
EXECUTE FORMAT($dlg$
CREATE TYPE licensing.license_status AS ENUM (
    'active', -- License is valid and can be used
    'revoked' -- Permanently disabled
    );
$dlg$);

-- Licenses table
EXECUTE FORMAT($dlg$
CREATE TABLE licensing.licenses
(
    id              UUID PRIMARY KEY             DEFAULT gen_random_uuid(),
    key             VARCHAR(255) UNIQUE NOT NULL,
    product_id      VARCHAR(255)        NOT NULL,
    plan_id         VARCHAR(255)        NOT NULL,
    customer_id     VARCHAR(255)        NOT NULL,
    customer_email  VARCHAR(255)        NOT NULL,
    order_id        VARCHAR(255)        NOT NULL,
    status          licensing.license_status     DEFAULT 'active',
    source          VARCHAR(255)        NOT NULL,
    max_activations INT                 NOT NULL DEFAULT 1,
    metadata        JSONB               NOT NULL DEFAULT '{}',
    created_at      TIMESTAMPTZ                  DEFAULT NOW(),
    updated_at      TIMESTAMPTZ                  DEFAULT NOW()
);
$dlg$);

-- License activations table
EXECUTE FORMAT($dlg$
CREATE TABLE licensing.activations
(
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    license_id UUID REFERENCES licensing.licenses (id) ON DELETE CASCADE NOT NULL,
    identifier VARCHAR(255)                            NOT NULL,
    metadata   JSONB                                   NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ      DEFAULT NOW(),
    UNIQUE (license_id, identifier)
);
$dlg$);

-- Indexes
EXECUTE FORMAT($dlg$
CREATE INDEX idx_licenses_key ON licensing.licenses (key);
CREATE INDEX idx_activations_license ON licensing.activations (license_id);
CREATE INDEX idx_activations_identifier ON licensing.activations (identifier);
$dlg$);

-- =============================================
-- INDEXES
-- =============================================

EXECUTE FORMAT($dlg$
CREATE INDEX IF NOT EXISTS idx_accounts_auth_user_id ON public.accounts(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_accounts_role ON public.accounts(role);
CREATE INDEX IF NOT EXISTS idx_posts_author_id ON public.posts(author_id);
CREATE INDEX IF NOT EXISTS idx_posts_category_id ON public.posts(category_id);
CREATE INDEX IF NOT EXISTS idx_posts_status ON public.posts(status);
CREATE INDEX IF NOT EXISTS idx_posts_published_at ON public.posts(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_slug ON public.posts(slug);
CREATE INDEX IF NOT EXISTS idx_comments_post_id ON public.comments(post_id);
CREATE INDEX IF NOT EXISTS idx_comments_author_id ON public.comments(author_id);
CREATE INDEX IF NOT EXISTS idx_comments_status ON public.comments(status);
$dlg$);

-- =============================================
-- TRIGGERS FOR UPDATED_AT
-- =============================================

EXECUTE format($dlg$
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
SET search_path = ''
LANGUAGE plpgsql
AS $body$
BEGIN
    NEW.updated_at := now();   -- assignment operator :=
    RETURN NEW;
END;
$body$;
$dlg$);

EXECUTE FORMAT($dlg$
CREATE TRIGGER update_accounts_updated_at BEFORE UPDATE ON public.accounts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON public.categories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_tags_updated_at BEFORE UPDATE ON public.tags FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_posts_updated_at BEFORE UPDATE ON public.posts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_comments_updated_at BEFORE UPDATE ON public.comments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_site_settings_updated_at BEFORE UPDATE ON public.site_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
$dlg$);

-- =============================================
-- ACCOUNT SETUP TRIGGER
-- =============================================

EXECUTE format($f$
        CREATE OR REPLACE FUNCTION %I.handle_new_user()
        RETURNS trigger
        SET search_path = ''                 -- isolation
        LANGUAGE plpgsql
        SECURITY DEFINER
        AS $body$
        DECLARE
            user_name text;
        BEGIN
            user_name := COALESCE(
                NEW.raw_user_meta_data ->> 'full_name',
                NEW.raw_user_meta_data ->> 'name',
                split_part(NEW.email, '@', 1)
            );

            INSERT INTO public.accounts
                    (auth_user_id, email, full_name, avatar_url)
            VALUES  (NEW.id,
                     NEW.email,
                     user_name,
                     NEW.raw_user_meta_data ->> 'avatar_url');

            RETURN NEW;
        END;
        $body$;
    $f$, 'public');

EXECUTE FORMAT($dlg$
CREATE TRIGGER handle_new_user_trigger
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();
$dlg$);

-- =============================================
-- UTILITY FUNCTIONS
-- =============================================

EXECUTE FORMAT($f$
CREATE OR REPLACE FUNCTION public.get_current_account()
RETURNS public.accounts AS $body$
declare account_record public.accounts;

begin
select
  * into account_record
from
  public.accounts
where
  auth_user_id = auth.uid ();

RETURN account_record;

end;

$body$ LANGUAGE plpgsql SECURITY DEFINER;
$f$);

EXECUTE FORMAT($f$
CREATE OR REPLACE FUNCTION public.can_edit_post(post_id UUID)
RETURNS BOOLEAN AS $body$
declare user_account public.accounts;

post_author UUID;

begin
select
  * into user_account
from
  public.get_current_account ();

IF user_account is null then RETURN false;

end IF;

IF user_account.role = 'admin' then RETURN true;

end IF;

select
  author_id into post_author
from
  public.posts
where
  id = post_id;

RETURN user_account.id = post_author;

end;

$body$ LANGUAGE plpgsql SECURITY DEFINER;
$f$);

-- =============================================
-- RLS POLICIES
-- =============================================

EXECUTE FORMAT($dlg$
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
$dlg$);

EXECUTE FORMAT($dlg$
-- Accounts policies
CREATE POLICY "Users can view all accounts" ON public.accounts FOR SELECT USING (true);

CREATE POLICY "Users can update their own account" ON public.accounts FOR UPDATE USING (auth_user_id = auth.uid());
$dlg$);

EXECUTE FORMAT($dlg$
-- Posts policies
CREATE POLICY "Published posts are viewable by everyone" ON public.posts FOR SELECT USING (status = 'published');

CREATE POLICY "Users can view their own posts" ON public.posts FOR SELECT USING (author_id = (SELECT id FROM public.accounts WHERE auth_user_id = auth.uid()));

CREATE POLICY "Admins can view all posts" ON public.posts FOR SELECT USING ((SELECT role FROM public.accounts WHERE auth_user_id = auth.uid()) = 'admin');

CREATE POLICY "Users can create posts" ON public.posts FOR INSERT WITH CHECK (author_id = (SELECT id FROM public.accounts WHERE auth_user_id = auth.uid()));

CREATE POLICY "Users can edit their own posts or admins can edit all" ON public.posts FOR UPDATE USING (public.can_edit_post(id));

CREATE POLICY "Users can delete their own posts or admins can delete all" ON public.posts FOR DELETE USING (public.can_edit_post(id));
$dlg$);

EXECUTE FORMAT($dlg$
-- Categories policies
CREATE POLICY "Categories are viewable by everyone" ON public.categories FOR SELECT USING (true);

CREATE POLICY "Admins can manage categories" ON public.categories FOR ALL USING ((SELECT role FROM public.accounts WHERE auth_user_id = auth.uid()) = 'admin');
$dlg$);

EXECUTE FORMAT($dlg$
-- Tags policies
CREATE POLICY "Tags are viewable by everyone" ON public.tags FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create tags" ON public.tags FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Admins can manage tags" ON public.tags FOR ALL USING ((SELECT role FROM public.accounts WHERE auth_user_id = auth.uid()) = 'admin');
$dlg$);

EXECUTE FORMAT($dlg$
-- Post tags policies
CREATE POLICY "Post tags are viewable by everyone" ON public.post_tags FOR SELECT USING (true);

CREATE POLICY "Users can manage tags for their own posts" ON public.post_tags FOR ALL USING (
    EXISTS (SELECT 1 FROM public.posts WHERE id = post_id AND author_id = (SELECT id FROM public.accounts WHERE auth_user_id = auth.uid()))
);

CREATE POLICY "Admins can manage all post tags" ON public.post_tags FOR ALL USING ((SELECT role FROM public.accounts WHERE auth_user_id = auth.uid()) = 'admin');
$dlg$);

EXECUTE FORMAT($dlg$
-- Comments policies
CREATE POLICY "Approved comments are viewable by everyone" ON public.comments FOR SELECT USING (status = 'approved');

CREATE POLICY "Users can view their own comments" ON public.comments FOR SELECT USING (author_id = (SELECT id FROM public.accounts WHERE auth_user_id = auth.uid()));

CREATE POLICY "Admins can view all comments" ON public.comments FOR SELECT USING ((SELECT role FROM public.accounts WHERE auth_user_id = auth.uid()) = 'admin');

CREATE POLICY "Users can create comments" ON public.comments FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update their own comments" ON public.comments FOR UPDATE USING (author_id = (SELECT id FROM public.accounts WHERE auth_user_id = auth.uid()));

CREATE POLICY "Admins can manage all comments" ON public.comments FOR ALL USING ((SELECT role FROM public.accounts WHERE auth_user_id = auth.uid()) = 'admin');
$dlg$);

EXECUTE FORMAT($dlg$
CREATE POLICY "Site settings are viewable by everyone" ON public.site_settings FOR SELECT USING (true);

CREATE POLICY "Admins can manage site settings" ON public.site_settings FOR ALL USING ((SELECT role FROM public.accounts WHERE auth_user_id = auth.uid()) = 'admin');
$dlg$);

-- =============================================
-- STORAGE SETUP
-- =============================================
EXECUTE FORMAT($dlg$
-- Public avatars
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Public post featured images
INSERT INTO storage.buckets (id, name, public) VALUES ('post-images', 'post-images', true)
ON CONFLICT (id) DO NOTHING;

-- Private uploads (e.g., in-progress or internal assets)
INSERT INTO storage.buckets (id, name, public) VALUES ('uploads', 'uploads', false)
ON CONFLICT (id) DO NOTHING;
$dlg$);

EXECUTE FORMAT($dlg$
-- Create users
INSERT INTO "auth"."users" ("instance_id", "id", "aud", "role", "email", "encrypted_password", "email_confirmed_at",
                            "invited_at", "confirmation_token", "confirmation_sent_at", "recovery_token",
                            "recovery_sent_at", "email_change_token_new", "email_change", "email_change_sent_at",
                            "last_sign_in_at", "raw_app_meta_data", "raw_user_meta_data", "is_super_admin",
                            "created_at", "updated_at", "phone", "phone_confirmed_at", "phone_change",
                            "phone_change_token", "phone_change_sent_at", "email_change_token_current",
                            "email_change_confirm_status", "banned_until", "reauthentication_token",
                            "reauthentication_sent_at", "is_sso_user", "deleted_at", "is_anonymous")
VALUES ('00000000-0000-0000-0000-000000000000', '91659851-467b-4eb0-8120-21b55f24c241', 'authenticated',
        'authenticated', 'admin@supamode.com', '$2a$10$mIYOVRBucmZBupzH/wP47.fU474NFaD/uZIQYYFTGmawtwD9B4pbK',
        '2025-04-25 00:53:01.458182+00', NULL, '', NULL, '', NULL, '', '', NULL, NULL,
        '{"provider": "email", "providers": ["email"], "supamode_access": "true"}', '{"email_verified": true}', NULL,
        '2025-04-25 00:53:01.453967+00', '2025-04-25 00:53:01.458389+00', NULL, NULL, '', '', NULL, '', 0, NULL, '',
        NULL, false, NULL, false),
       ('00000000-0000-0000-0000-000000000000', '4f898e68-bff2-4c31-b279-ed1e79479ea7', 'authenticated',
        'authenticated', 'member@supamode.com', '$2a$10$As7oz2u7zxVVSVw7qcxnkujh7OkzXNjGCerGbmnNl0xM767UR2wdu',
        '2025-04-25 00:53:24.009214+00', NULL, '', NULL, '', NULL, '', '', NULL, NULL,
        '{"provider": "email", "providers": ["email"], "supamode_access": "true"}', '{"email_verified": true}', NULL,
        '2025-04-25 00:53:24.007995+00', '2025-04-25 00:53:24.009383+00', NULL, NULL, '', '', NULL, '', 0, NULL, '',
        NULL, false, NULL, false),
       ('00000000-0000-0000-0000-000000000000', 'e536826e-54ed-4b12-bb79-2803f5de082f', 'authenticated',
        'authenticated', 'readonly@supamode.com', '$2a$10$Qr4Zn8MfwA3NWuheEPuWUeU2NjAnI0CAQ22WvJZj4DvwzY4DDg1mW',
        '2025-04-25 00:54:02.687823+00', NULL, '', NULL, '', NULL, '', '', NULL, NULL,
        '{"provider": "email", "providers": ["email"], "supamode_access": "true"}', '{"email_verified": true}', NULL,
        '2025-04-25 00:54:02.686136+00', '2025-04-25 00:54:02.688036+00', NULL, NULL, '', '', NULL, '', 0, NULL, '',
        NULL, false, NULL, false),
       ('00000000-0000-0000-0000-000000000000', '202141c3-2dcd-4417-a01b-f8d7935f1c0c', 'authenticated',
        'authenticated', 'root@supamode.com', '$2a$10$Qr4Zn8MfwA3NWuheEPuWUeU2NjAnI0CAQ22WvJZj4DvwzY4DDg1mW',
        '2025-04-25 00:54:02.687823+00', NULL, '', NULL, '', NULL, '', '', NULL, NULL,
        '{"provider": "email", "providers": ["email"], "supamode_access": "true"}', '{"email_verified": true}', NULL,
        '2025-04-25 00:54:02.686136+00', '2025-04-25 00:54:02.688036+00', NULL, NULL, '', '', NULL, '', 0, NULL, '',
        NULL, false, NULL, false);


--
-- Data for Name: identities; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

INSERT INTO "auth"."identities" ("provider_id", "user_id", "identity_data", "provider", "last_sign_in_at", "created_at",
                                 "updated_at", "id")
VALUES ('91659851-467b-4eb0-8120-21b55f24c241', '91659851-467b-4eb0-8120-21b55f24c241',
        '{"sub": "91659851-467b-4eb0-8120-21b55f24c241", "email": "admin@supamode.com", "email_verified": false, "phone_verified": false}',
        'email', '2025-04-25 00:53:01.457087+00', '2025-04-25 00:53:01.45713+00', '2025-04-25 00:53:01.45713+00',
        '57f05f0e-2e71-4215-885c-6967d650f849'),
       ('4f898e68-bff2-4c31-b279-ed1e79479ea7', '4f898e68-bff2-4c31-b279-ed1e79479ea7',
        '{"sub": "4f898e68-bff2-4c31-b279-ed1e79479ea7", "email": "member@supamode.com", "email_verified": false, "phone_verified": false}',
        'email', '2025-04-25 00:53:24.008794+00', '2025-04-25 00:53:24.008814+00', '2025-04-25 00:53:24.008814+00',
        '14993b0a-d680-4a4e-b8ff-218459875bae'),
       ('e536826e-54ed-4b12-bb79-2803f5de082f', 'e536826e-54ed-4b12-bb79-2803f5de082f',
        '{"sub": "e536826e-54ed-4b12-bb79-2803f5de082f", "email": "readonly@supamode.com", "email_verified": false, "phone_verified": false}',
        'email', '2025-04-25 00:54:02.687077+00', '2025-04-25 00:54:02.687099+00', '2025-04-25 00:54:02.687099+00',
        'a4443f8c-4289-4d60-ad69-f631eee274a3'),
       ('202141c3-2dcd-4417-a01b-f8d7935f1c0c', '202141c3-2dcd-4417-a01b-f8d7935f1c0c',
        '{"sub": "e536826e-54ed-4b12-bb79-2803f5de082f", "email": "root@supamode.com", "email_verified": false, "phone_verified": false}',
        'email', '2025-04-25 00:54:02.687077+00', '2025-04-25 00:54:02.687099+00', '2025-04-25 00:54:02.687099+00',
        '929d239f-f476-4b51-a245-b000e165ea96');
$dlg$);

EXECUTE FORMAT($dlg$
-- 3. Insert categories
INSERT INTO public.categories (id, name, slug, description)
VALUES 
  ('20000000-0000-0000-0000-000000000001', 'Technology', 'technology', 'All about tech'),
  ('20000000-0000-0000-0000-000000000002', 'Lifestyle', 'lifestyle', 'Health and habits');

-- 4. Insert tags
INSERT INTO public.tags (id, name, slug)
VALUES 
  ('30000000-0000-0000-0000-000000000001', 'Postgres', 'postgres'),
  ('30000000-0000-0000-0000-000000000002', 'Supabase', 'supabase');

-- 5. Insert posts
INSERT INTO public.posts (
  id, title, slug, excerpt, content, content_markdown, status, author_id, category_id, featured_image,
  published_at, meta_title, meta_description
)
VALUES 
  (
    '40000000-0000-0000-0000-000000000001',
    'Hello Supabase',
    'hello-supabase',
    'Intro to Supabase',
    'Full content about Supabase',
    '# Hello Supabase\nThis is a post.',
    'published',
    (select id from public.accounts where email = 'root@supamode.com'),
    '20000000-0000-0000-0000-000000000001',
    null,
    NOW(),
    'Welcome to Supabase',
    'A beginner guide to Supabase'
  ),
  (
    '40000000-0000-0000-0000-000000000002',
    'PostgreSQL Tips',
    'postgresql-tips',
    'Learn Postgres',
    'Tips and tricks about PostgreSQL',
    '## Tips\n- Use indexes\n- Use CTEs',
    'draft',
    (select id from public.accounts where email = 'root@supamode.com'),
    '20000000-0000-0000-0000-000000000001',
    null,
    null,
    'PostgreSQL Performance',
    'Improve your queries with these tips'
  );

-- 6. Insert post_tags
INSERT INTO public.post_tags (post_id, tag_id)
VALUES 
  ('40000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000002'),
  ('40000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000001');

-- 8. Insert site settings
INSERT INTO public.site_settings (id, key, value, description)
VALUES 
  ('60000000-0000-0000-0000-000000000001', 'site_title', 'My Dev Blog', 'Displayed in the browser tab'),
  ('60000000-0000-0000-0000-000000000002', 'homepage_layout', 'grid', 'Layout style for homepage');

$dlg$);

EXECUTE FORMAT($dlg$
-- Creating system settings

INSERT INTO supamode.configuration (key, value)
VALUES ('requires_mfa', 'false');

$dlg$);

EXECUTE FORMAT($dlg$
-- Creating permissions


INSERT INTO supamode.permissions (name, description, permission_type, system_resource, action, metadata)
VALUES (
  'Manage System Settings',
  'Full CRUD access to manage system settings',
  'system',
  'system_setting',
  '*',
  '{}'::jsonb
);

$dlg$);

EXECUTE FORMAT($dlg$
INSERT INTO supamode.permissions (name, description, permission_type, system_resource, action, metadata)
VALUES (
  'Manage Accounts',
  'Full CRUD access to manage user accounts',
  'system',
  'account',
  '*',
  '{}'::jsonb
);

$dlg$);

EXECUTE FORMAT($dlg$
INSERT INTO supamode.permissions (name, description, permission_type, system_resource, action, metadata)
VALUES (
  'Read Accounts',
  'Read access to user accounts',
  'system',
  'account',
  'select',
  '{}'::jsonb
);

$dlg$);

EXECUTE FORMAT($dlg$
INSERT INTO supamode.permissions (name, description, permission_type, system_resource, action, metadata)
VALUES (
  'Update Accounts',
  'Update user accounts',
  'system',
  'account',
  'update',
  '{}'::jsonb
);

$dlg$);

EXECUTE FORMAT($dlg$
INSERT INTO supamode.permissions (name, description, permission_type, system_resource, action, metadata)
VALUES (
  'Delete Accounts',
  'Delete user accounts',
  'system',
  'account',
  'delete',
  '{}'::jsonb
);

$dlg$);

EXECUTE FORMAT($dlg$
INSERT INTO supamode.permissions (name, description, permission_type, system_resource, action, metadata)
VALUES (
  'Manage Roles',
  'Full CRUD access to manage roles',
  'system',
  'role',
  '*',
  '{}'::jsonb
);


INSERT INTO supamode.permissions (name, description, permission_type, system_resource, action, metadata)
VALUES (
  'Read Roles',
  'Read access to roles',
  'system',
  'role',
  'select',
  '{}'::jsonb
);


INSERT INTO supamode.permissions (name, description, permission_type, system_resource, action, metadata)
VALUES (
  'Update Roles',
  'Update roles',
  'system',
  'role',
  'update',
  '{}'::jsonb
);

$dlg$);

EXECUTE FORMAT($dlg$
INSERT INTO supamode.permissions (name, description, permission_type, system_resource, action, metadata)
VALUES (
  'Manage Permissions',
  'Full CRUD access to manage permissions',
  'system',
  'permission',
  '*',
  '{}'::jsonb
);

$dlg$);

EXECUTE FORMAT($dlg$
INSERT INTO supamode.permissions (name, description, permission_type, system_resource, action, metadata)
VALUES (
  'Read Permissions',
  'Read access to permissions',
  'system',
  'permission',
  'select',
  '{}'::jsonb
);
$dlg$);

EXECUTE FORMAT($dlg$
INSERT INTO supamode.permissions (name, description, permission_type, system_resource, action, metadata)
VALUES (
  'Update Permissions',
  'Update permissions',
  'system',
  'permission',
  'update',
  '{}'::jsonb
);
$dlg$);

EXECUTE FORMAT($dlg$
INSERT INTO supamode.permissions (name, description, permission_type, system_resource, action, metadata)
VALUES (
  'Manage Tables',
  'Full access to manage table metadata and configurations',
  'system',
  'table',
  '*',
  '{}'::jsonb
);
$dlg$);

EXECUTE FORMAT($dlg$
INSERT INTO supamode.permissions (name, description, permission_type, system_resource, action, metadata)
VALUES (
  'Read Tables',
  'Read access to table metadata',
  'system',
  'table',
  'select',
  '{}'::jsonb
);
$dlg$);

EXECUTE FORMAT($dlg$
INSERT INTO supamode.permissions (name, description, permission_type, system_resource, action, metadata)
VALUES (
  'Update Tables',
  'Update table metadata and configurations',
  'system',
  'table',
  'update',
  '{}'::jsonb
);
$dlg$);

EXECUTE FORMAT($dlg$
INSERT INTO supamode.permissions (name, description, permission_type, system_resource, action, metadata)
VALUES (
  'Read Logs',
  'Read access to system logs',
  'system',
  'log',
  'select',
  '{}'::jsonb
);
$dlg$);

EXECUTE FORMAT($dlg$
INSERT INTO supamode.permissions (name, description, permission_type, system_resource, action, metadata)
VALUES (
  'Manage Auth Users',
  'Full access to manage Supabase auth users',
  'system',
  'auth_user',
  '*',
  '{}'::jsonb
);
$dlg$);

EXECUTE FORMAT($dlg$
INSERT INTO supamode.permissions (name, description, permission_type, system_resource, action, metadata)
VALUES (
  'Read System Auth Users',
  'Read access to Supabase auth users',
  'system',
  'auth_user',
  'select',
  '{}'::jsonb
);
$dlg$);

EXECUTE FORMAT($dlg$
INSERT INTO supamode.permissions (name, description, permission_type, system_resource, action, metadata)
VALUES (
  'Update Auth Users',
  'Update Supabase auth users',
  'system',
  'auth_user',
  'update',
  '{}'::jsonb
);
$dlg$);

EXECUTE FORMAT($dlg$
INSERT INTO supamode.permissions (name, description, permission_type, scope, schema_name, table_name, column_name, action, constraints, conditions, metadata)
VALUES (
  'Manage All Storage',
  'Full access to manage all storage',
  'data',
  'storage',
  NULL,
  NULL,
  NULL,
  '*',
  NULL,
  NULL,
  '{"bucket_name":"*","path_pattern":"*"}'::jsonb
);
$dlg$);

EXECUTE FORMAT($dlg$
INSERT INTO supamode.permissions (name, description, permission_type, scope, schema_name, table_name, column_name, action, constraints, conditions, metadata)
VALUES (
  'Read All Storage',
  'Read access to all storage',
  'data',
  'storage',
  NULL,
  NULL,
  NULL,
  'select',
  NULL,
  NULL,
  '{"bucket_name":"*","path_pattern":"*"}'::jsonb
);
$dlg$);

EXECUTE FORMAT($dlg$
INSERT INTO supamode.permissions (name, description, permission_type, scope, schema_name, table_name, column_name, action, constraints, conditions, metadata)
VALUES (
  'Manage All Tables',
  'Full CRUD access to all tables in public schema',
  'data',
  'table',
  'public',
  '*',
  NULL,
  '*',
  NULL,
  NULL,
  '{}'::jsonb
);
$dlg$);

EXECUTE FORMAT($dlg$
INSERT INTO supamode.permissions (name, description, permission_type, scope, schema_name, table_name, column_name, action, constraints, conditions, metadata)
VALUES (
  'Read All Tables',
  'Read access to all tables in public schema',
  'data',
  'table',
  'public',
  '*',
  NULL,
  'select',
  NULL,
  NULL,
  '{}'::jsonb
);
$dlg$);

EXECUTE FORMAT($dlg$
INSERT INTO supamode.permissions (name, description, permission_type, scope, schema_name, table_name, column_name, action, constraints, conditions, metadata)
VALUES (
  'Read Data Auth Users',
  'Read access to users in the auth schema',
  'data',
  'table',
  'auth',
  'users',
  NULL,
  'select',
  NULL,
  NULL,
  '{}'::jsonb
);
$dlg$);

EXECUTE FORMAT($dlg$
INSERT INTO supamode.permissions (name, description, permission_type, scope, schema_name, table_name, column_name, action, constraints, conditions, metadata)
VALUES (
  'Update All Tables',
  'Update access to all tables in public schema',
  'data',
  'table',
  'public',
  '*',
  NULL,
  'update',
  NULL,
  NULL,
  '{}'::jsonb
);
$dlg$);

EXECUTE FORMAT($dlg$
INSERT INTO supamode.permissions (name, description, permission_type, scope, schema_name, table_name, column_name, action, constraints, conditions, metadata)
VALUES (
  'Insert All Tables',
  'Insert access to all tables in public schema',
  'data',
  'table',
  'public',
  '*',
  NULL,
  'insert',
  NULL,
  NULL,
  '{}'::jsonb
);
$dlg$);

-- Creating permission groups
EXECUTE FORMAT($dlg$
INSERT INTO supamode.permission_groups (name, description, metadata)
VALUES (
  'Super Admin',
  'Full system access - all permissions',
  '{}'::jsonb
);


INSERT INTO supamode.permission_groups (name, description, metadata)
VALUES (
  'Administrator',
  'Administrative access to most system functions',
  '{}'::jsonb
);


INSERT INTO supamode.permission_groups (name, description, metadata)
VALUES (
  'Manager',
  'Content management and basic admin functions',
  '{}'::jsonb
);
$dlg$);

EXECUTE FORMAT($dlg$
INSERT INTO supamode.permission_groups (name, description, metadata)
VALUES (
  'Customer Support',
  'Customer support access - read mostly, limited updates',
  '{}'::jsonb
);
$dlg$);

EXECUTE FORMAT($dlg$
INSERT INTO supamode.permission_groups (name, description, metadata)
VALUES (
  'Read Only',
  'Read-only access to data and basic system info',
  '{}'::jsonb
);
$dlg$);

EXECUTE FORMAT($dlg$
INSERT INTO supamode.permission_groups (name, description, metadata)
VALUES (
  'Developer',
  'Technical access for developers and DevOps',
  '{}'::jsonb
);
$dlg$);

-- Creating roles
EXECUTE FORMAT($dlg$
INSERT INTO supamode.roles (name, description, rank, metadata, valid_from, valid_until)
VALUES (
  'Root',
  'Ultimate system access - use with extreme caution',
  100,
  '{}'::jsonb,
  NULL,
  NULL
);
$dlg$);

EXECUTE FORMAT($dlg$
INSERT INTO supamode.roles (name, description, rank, metadata, valid_from, valid_until)
VALUES (
  'Admin',
  'Administrative access to system functions',
  90,
  '{}'::jsonb,
  NULL,
  NULL
);
$dlg$);

EXECUTE FORMAT($dlg$
INSERT INTO supamode.roles (name, description, rank, metadata, valid_from, valid_until)
VALUES (
  'Manager',
  'Content management and basic admin functions',
  70,
  '{}'::jsonb,
  NULL,
  NULL
);
$dlg$);

EXECUTE FORMAT($dlg$
INSERT INTO supamode.roles (name, description, rank, metadata, valid_from, valid_until)
VALUES (
  'Developer',
  'Technical access for development and maintenance',
  80,
  '{}'::jsonb,
  NULL,
  NULL
);
$dlg$);

EXECUTE FORMAT($dlg$
INSERT INTO supamode.roles (name, description, rank, metadata, valid_from, valid_until)
VALUES (
  'Customer Support',
  'Customer support and assistance functions',
  60,
  '{}'::jsonb,
  NULL,
  NULL
);


INSERT INTO supamode.roles (name, description, rank, metadata, valid_from, valid_until)
VALUES (
  'Read Only',
  'Read-only access to system data',
  50,
  '{}'::jsonb,
  NULL,
  NULL
);
$dlg$);

-- Creating accounts
EXECUTE FORMAT($dlg$
INSERT INTO supamode.accounts (auth_user_id, metadata)
VALUES ('202141c3-2dcd-4417-a01b-f8d7935f1c0c', '{"display_name":"Root Administrator","email":"root@supamode.com","department":"IT"}'::jsonb);
$dlg$);

EXECUTE FORMAT($dlg$
INSERT INTO supamode.accounts (auth_user_id, metadata)
VALUES ('91659851-467b-4eb0-8120-21b55f24c241', '{"display_name":"System Administrator","email":"admin@supamode.com","department":"IT"}'::jsonb);
$dlg$);

EXECUTE FORMAT($dlg$
INSERT INTO supamode.accounts (auth_user_id, metadata)
VALUES ('4f898e68-bff2-4c31-b279-ed1e79479ea7', '{"display_name":"Content Manager","email":"manager@supamode.com","department":"Content"}'::jsonb);
$dlg$);

EXECUTE FORMAT($dlg$
INSERT INTO supamode.accounts (auth_user_id, metadata)
VALUES ('e536826e-54ed-4b12-bb79-2803f5de082f', '{"display_name":"Read Only User","email":"readonly@supamode.com","department":"Analytics"}'::jsonb);
$dlg$);

-- Assigning permissions to permission groups
EXECUTE FORMAT($dlg$
INSERT INTO supamode.permission_group_permissions (group_id, permission_id, added_at)
VALUES ((SELECT id FROM supamode.permission_groups WHERE name = 'Super Admin'), (SELECT id FROM supamode.permissions WHERE name = 'Manage Accounts'), NOW());
$dlg$);

EXECUTE FORMAT($dlg$
INSERT INTO supamode.permission_group_permissions (group_id, permission_id, added_at)
VALUES ((SELECT id FROM supamode.permission_groups WHERE name = 'Super Admin'), (SELECT id FROM supamode.permissions WHERE name = 'Manage All Tables'), NOW());
$dlg$);

EXECUTE FORMAT($dlg$
INSERT INTO supamode.permission_group_permissions (group_id, permission_id, added_at)
VALUES ((SELECT id FROM supamode.permission_groups WHERE name = 'Super Admin'), (SELECT id FROM supamode.permissions WHERE name = 'Read Data Auth Users'), NOW());
$dlg$);

EXECUTE FORMAT($dlg$
INSERT INTO supamode.permission_group_permissions (group_id, permission_id, added_at)
VALUES ((SELECT id FROM supamode.permission_groups WHERE name = 'Super Admin'), (SELECT id FROM supamode.permissions WHERE name = 'Delete Accounts'), NOW());
$dlg$);

EXECUTE FORMAT($dlg$
INSERT INTO supamode.permission_group_permissions (group_id, permission_id, added_at)
VALUES ((SELECT id FROM supamode.permission_groups WHERE name = 'Super Admin'), (SELECT id FROM supamode.permissions WHERE name = 'Manage Roles'), NOW());
$dlg$);

EXECUTE FORMAT($dlg$
INSERT INTO supamode.permission_group_permissions (group_id, permission_id, added_at)
VALUES ((SELECT id FROM supamode.permission_groups WHERE name = 'Super Admin'), (SELECT id FROM supamode.permissions WHERE name = 'Manage Permissions'), NOW());
$dlg$);

EXECUTE FORMAT($dlg$
INSERT INTO supamode.permission_group_permissions (group_id, permission_id, added_at)
VALUES ((SELECT id FROM supamode.permission_groups WHERE name = 'Super Admin'), (SELECT id FROM supamode.permissions WHERE name = 'Manage Tables'), NOW());
$dlg$);

EXECUTE FORMAT($dlg$
INSERT INTO supamode.permission_group_permissions (group_id, permission_id, added_at)
VALUES ((SELECT id FROM supamode.permission_groups WHERE name = 'Super Admin'), (SELECT id FROM supamode.permissions WHERE name = 'Read Logs'), NOW());
$dlg$);

EXECUTE FORMAT($dlg$
INSERT INTO supamode.permission_group_permissions (group_id, permission_id, added_at)
VALUES ((SELECT id FROM supamode.permission_groups WHERE name = 'Super Admin'), (SELECT id FROM supamode.permissions WHERE name = 'Manage Auth Users'), NOW());
$dlg$);

EXECUTE FORMAT($dlg$
INSERT INTO supamode.permission_group_permissions (group_id, permission_id, added_at)
VALUES ((SELECT id FROM supamode.permission_groups WHERE name = 'Super Admin'), (SELECT id FROM supamode.permissions WHERE name = 'Manage System Settings'), NOW());
$dlg$);

EXECUTE FORMAT($dlg$
INSERT INTO supamode.permission_group_permissions (group_id, permission_id, added_at)
VALUES ((SELECT id FROM supamode.permission_groups WHERE name = 'Super Admin'), (SELECT id FROM supamode.permissions WHERE name = 'Manage All Storage'), NOW());
$dlg$);

EXECUTE FORMAT($dlg$
INSERT INTO supamode.permission_group_permissions (group_id, permission_id, added_at)
VALUES ((SELECT id FROM supamode.permission_groups WHERE name = 'Administrator'), (SELECT id FROM supamode.permissions WHERE name = 'Read Accounts'), NOW());
$dlg$);

EXECUTE FORMAT($dlg$
INSERT INTO supamode.permission_group_permissions (group_id, permission_id, added_at)
VALUES ((SELECT id FROM supamode.permission_groups WHERE name = 'Administrator'), (SELECT id FROM supamode.permissions WHERE name = 'Read Data Auth Users'), NOW());
$dlg$);

EXECUTE FORMAT($dlg$
INSERT INTO supamode.permission_group_permissions (group_id, permission_id, added_at)
VALUES ((SELECT id FROM supamode.permission_groups WHERE name = 'Administrator'), (SELECT id FROM supamode.permissions WHERE name = 'Update Accounts'), NOW());
$dlg$);

EXECUTE FORMAT($dlg$
INSERT INTO supamode.permission_group_permissions (group_id, permission_id, added_at)
VALUES ((SELECT id FROM supamode.permission_groups WHERE name = 'Administrator'), (SELECT id FROM supamode.permissions WHERE name = 'Read Roles'), NOW());
$dlg$);

EXECUTE FORMAT($dlg$
INSERT INTO supamode.permission_group_permissions (group_id, permission_id, added_at)
VALUES ((SELECT id FROM supamode.permission_groups WHERE name = 'Administrator'), (SELECT id FROM supamode.permissions WHERE name = 'Read Permissions'), NOW());
$dlg$);

EXECUTE FORMAT($dlg$
INSERT INTO supamode.permission_group_permissions (group_id, permission_id, added_at)
VALUES ((SELECT id FROM supamode.permission_groups WHERE name = 'Administrator'), (SELECT id FROM supamode.permissions WHERE name = 'Update Permissions'), NOW());
$dlg$);

EXECUTE FORMAT($dlg$
INSERT INTO supamode.permission_group_permissions (group_id, permission_id, added_at)
VALUES ((SELECT id FROM supamode.permission_groups WHERE name = 'Administrator'), (SELECT id FROM supamode.permissions WHERE name = 'Update Roles'), NOW());
$dlg$);

EXECUTE FORMAT($dlg$
INSERT INTO supamode.permission_group_permissions (group_id, permission_id, added_at)
VALUES ((SELECT id FROM supamode.permission_groups WHERE name = 'Administrator'), (SELECT id FROM supamode.permissions WHERE name = 'Update Tables'), NOW());
$dlg$);

EXECUTE FORMAT($dlg$
INSERT INTO supamode.permission_group_permissions (group_id, permission_id, added_at)
VALUES ((SELECT id FROM supamode.permission_groups WHERE name = 'Administrator'), (SELECT id FROM supamode.permissions WHERE name = 'Read Tables'), NOW());
$dlg$);

EXECUTE FORMAT($dlg$
INSERT INTO supamode.permission_group_permissions (group_id, permission_id, added_at)
VALUES ((SELECT id FROM supamode.permission_groups WHERE name = 'Administrator'), (SELECT id FROM supamode.permissions WHERE name = 'Read Logs'), NOW());
$dlg$);

EXECUTE FORMAT($dlg$
INSERT INTO supamode.permission_group_permissions (group_id, permission_id, added_at)
VALUES ((SELECT id FROM supamode.permission_groups WHERE name = 'Administrator'), (SELECT id FROM supamode.permissions WHERE name = 'Read System Auth Users'), NOW());
$dlg$);

EXECUTE FORMAT($dlg$
INSERT INTO supamode.permission_group_permissions (group_id, permission_id, added_at)
VALUES ((SELECT id FROM supamode.permission_groups WHERE name = 'Administrator'), (SELECT id FROM supamode.permissions WHERE name = 'Update Auth Users'), NOW());
$dlg$);

EXECUTE FORMAT($dlg$
INSERT INTO supamode.permission_group_permissions (group_id, permission_id, added_at)
VALUES ((SELECT id FROM supamode.permission_groups WHERE name = 'Administrator'), (SELECT id FROM supamode.permissions WHERE name = 'Manage All Tables'), NOW());
$dlg$);

EXECUTE FORMAT($dlg$
INSERT INTO supamode.permission_group_permissions (group_id, permission_id, added_at)
VALUES ((SELECT id FROM supamode.permission_groups WHERE name = 'Administrator'), (SELECT id FROM supamode.permissions WHERE name = 'Manage All Storage'), NOW());
$dlg$);

EXECUTE FORMAT($dlg$
INSERT INTO supamode.permission_group_permissions (group_id, permission_id, added_at)
VALUES ((SELECT id FROM supamode.permission_groups WHERE name = 'Manager'), (SELECT id FROM supamode.permissions WHERE name = 'Read Accounts'), NOW());
$dlg$);

EXECUTE FORMAT($dlg$
INSERT INTO supamode.permission_group_permissions (group_id, permission_id, added_at)
VALUES ((SELECT id FROM supamode.permission_groups WHERE name = 'Manager'), (SELECT id FROM supamode.permissions WHERE name = 'Read Data Auth Users'), NOW());
$dlg$);

EXECUTE FORMAT($dlg$
INSERT INTO supamode.permission_group_permissions (group_id, permission_id, added_at)
VALUES ((SELECT id FROM supamode.permission_groups WHERE name = 'Manager'), (SELECT id FROM supamode.permissions WHERE name = 'Read Roles'), NOW());
$dlg$);

EXECUTE FORMAT($dlg$
INSERT INTO supamode.permission_group_permissions (group_id, permission_id, added_at)
VALUES ((SELECT id FROM supamode.permission_groups WHERE name = 'Manager'), (SELECT id FROM supamode.permissions WHERE name = 'Read Tables'), NOW());
$dlg$);

EXECUTE FORMAT($dlg$
INSERT INTO supamode.permission_group_permissions (group_id, permission_id, added_at)
VALUES ((SELECT id FROM supamode.permission_groups WHERE name = 'Manager'), (SELECT id FROM supamode.permissions WHERE name = 'Read Logs'), NOW());
$dlg$);

EXECUTE FORMAT($dlg$
INSERT INTO supamode.permission_group_permissions (group_id, permission_id, added_at)
VALUES ((SELECT id FROM supamode.permission_groups WHERE name = 'Manager'), (SELECT id FROM supamode.permissions WHERE name = 'Read System Auth Users'), NOW());
$dlg$);

EXECUTE FORMAT($dlg$
INSERT INTO supamode.permission_group_permissions (group_id, permission_id, added_at)
VALUES ((SELECT id FROM supamode.permission_groups WHERE name = 'Manager'), (SELECT id FROM supamode.permissions WHERE name = 'Read All Tables'), NOW());
$dlg$);

EXECUTE FORMAT($dlg$
INSERT INTO supamode.permission_group_permissions (group_id, permission_id, added_at)
VALUES ((SELECT id FROM supamode.permission_groups WHERE name = 'Manager'), (SELECT id FROM supamode.permissions WHERE name = 'Update All Tables'), NOW());
$dlg$);

EXECUTE FORMAT($dlg$
INSERT INTO supamode.permission_group_permissions (group_id, permission_id, added_at)
VALUES ((SELECT id FROM supamode.permission_groups WHERE name = 'Manager'), (SELECT id FROM supamode.permissions WHERE name = 'Insert All Tables'), NOW());
$dlg$);

EXECUTE FORMAT($dlg$
INSERT INTO supamode.permission_group_permissions (group_id, permission_id, added_at)
VALUES ((SELECT id FROM supamode.permission_groups WHERE name = 'Manager'), (SELECT id FROM supamode.permissions WHERE name = 'Read All Storage'), NOW());
$dlg$);

EXECUTE FORMAT($dlg$
INSERT INTO supamode.permission_group_permissions (group_id, permission_id, added_at)
VALUES ((SELECT id FROM supamode.permission_groups WHERE name = 'Customer Support'), (SELECT id FROM supamode.permissions WHERE name = 'Read Accounts'), NOW());
$dlg$);

EXECUTE FORMAT($dlg$
INSERT INTO supamode.permission_group_permissions (group_id, permission_id, added_at)
VALUES ((SELECT id FROM supamode.permission_groups WHERE name = 'Customer Support'), (SELECT id FROM supamode.permissions WHERE name = 'Update Accounts'), NOW());
$dlg$);

EXECUTE FORMAT($dlg$
INSERT INTO supamode.permission_group_permissions (group_id, permission_id, added_at)
VALUES ((SELECT id FROM supamode.permission_groups WHERE name = 'Customer Support'), (SELECT id FROM supamode.permissions WHERE name = 'Read Data Auth Users'), NOW());
$dlg$);

EXECUTE FORMAT($dlg$
INSERT INTO supamode.permission_group_permissions (group_id, permission_id, added_at)
VALUES ((SELECT id FROM supamode.permission_groups WHERE name = 'Customer Support'), (SELECT id FROM supamode.permissions WHERE name = 'Read Tables'), NOW());
$dlg$);

EXECUTE FORMAT($dlg$
INSERT INTO supamode.permission_group_permissions (group_id, permission_id, added_at)
VALUES ((SELECT id FROM supamode.permission_groups WHERE name = 'Customer Support'), (SELECT id FROM supamode.permissions WHERE name = 'Read Logs'), NOW());
$dlg$);

EXECUTE FORMAT($dlg$
INSERT INTO supamode.permission_group_permissions (group_id, permission_id, added_at)
VALUES ((SELECT id FROM supamode.permission_groups WHERE name = 'Customer Support'), (SELECT id FROM supamode.permissions WHERE name = 'Read System Auth Users'), NOW());
$dlg$);

EXECUTE FORMAT($dlg$
INSERT INTO supamode.permission_group_permissions (group_id, permission_id, added_at)
VALUES ((SELECT id FROM supamode.permission_groups WHERE name = 'Customer Support'), (SELECT id FROM supamode.permissions WHERE name = 'Read All Tables'), NOW());
$dlg$);

EXECUTE FORMAT($dlg$
INSERT INTO supamode.permission_group_permissions (group_id, permission_id, added_at)
VALUES ((SELECT id FROM supamode.permission_groups WHERE name = 'Read Only'), (SELECT id FROM supamode.permissions WHERE name = 'Read Accounts'), NOW());
$dlg$);

EXECUTE FORMAT($dlg$
INSERT INTO supamode.permission_group_permissions (group_id, permission_id, added_at)
VALUES ((SELECT id FROM supamode.permission_groups WHERE name = 'Read Only'), (SELECT id FROM supamode.permissions WHERE name = 'Read Roles'), NOW());
$dlg$);

EXECUTE FORMAT($dlg$
INSERT INTO supamode.permission_group_permissions (group_id, permission_id, added_at)
VALUES ((SELECT id FROM supamode.permission_groups WHERE name = 'Read Only'), (SELECT id FROM supamode.permissions WHERE name = 'Read Tables'), NOW());
$dlg$);

EXECUTE FORMAT($dlg$
INSERT INTO supamode.permission_group_permissions (group_id, permission_id, added_at)
VALUES ((SELECT id FROM supamode.permission_groups WHERE name = 'Read Only'), (SELECT id FROM supamode.permissions WHERE name = 'Read System Auth Users'), NOW());
$dlg$);

EXECUTE FORMAT($dlg$
INSERT INTO supamode.permission_group_permissions (group_id, permission_id, added_at)
VALUES ((SELECT id FROM supamode.permission_groups WHERE name = 'Read Only'), (SELECT id FROM supamode.permissions WHERE name = 'Read Logs'), NOW());
$dlg$);

EXECUTE FORMAT($dlg$
INSERT INTO supamode.permission_group_permissions (group_id, permission_id, added_at)
VALUES ((SELECT id FROM supamode.permission_groups WHERE name = 'Read Only'), (SELECT id FROM supamode.permissions WHERE name = 'Read Data Auth Users'), NOW());
$dlg$);

EXECUTE FORMAT($dlg$
INSERT INTO supamode.permission_group_permissions (group_id, permission_id, added_at)
VALUES ((SELECT id FROM supamode.permission_groups WHERE name = 'Read Only'), (SELECT id FROM supamode.permissions WHERE name = 'Read All Tables'), NOW());
$dlg$);

EXECUTE FORMAT($dlg$
INSERT INTO supamode.permission_group_permissions (group_id, permission_id, added_at)
VALUES ((SELECT id FROM supamode.permission_groups WHERE name = 'Developer'), (SELECT id FROM supamode.permissions WHERE name = 'Read Accounts'), NOW());
$dlg$);

EXECUTE FORMAT($dlg$
INSERT INTO supamode.permission_group_permissions (group_id, permission_id, added_at)
VALUES ((SELECT id FROM supamode.permission_groups WHERE name = 'Developer'), (SELECT id FROM supamode.permissions WHERE name = 'Read Roles'), NOW());
$dlg$);

EXECUTE FORMAT($dlg$
INSERT INTO supamode.permission_group_permissions (group_id, permission_id, added_at)
VALUES ((SELECT id FROM supamode.permission_groups WHERE name = 'Developer'), (SELECT id FROM supamode.permissions WHERE name = 'Read Permissions'), NOW());
$dlg$);

EXECUTE FORMAT($dlg$
INSERT INTO supamode.permission_group_permissions (group_id, permission_id, added_at)
VALUES ((SELECT id FROM supamode.permission_groups WHERE name = 'Developer'), (SELECT id FROM supamode.permissions WHERE name = 'Manage Tables'), NOW());
$dlg$);

EXECUTE FORMAT($dlg$
INSERT INTO supamode.permission_group_permissions (group_id, permission_id, added_at)
VALUES ((SELECT id FROM supamode.permission_groups WHERE name = 'Developer'), (SELECT id FROM supamode.permissions WHERE name = 'Read Logs'), NOW());
$dlg$);

EXECUTE FORMAT($dlg$
INSERT INTO supamode.permission_group_permissions (group_id, permission_id, added_at)
VALUES ((SELECT id FROM supamode.permission_groups WHERE name = 'Developer'), (SELECT id FROM supamode.permissions WHERE name = 'Read Data Auth Users'), NOW());
$dlg$);

EXECUTE FORMAT($dlg$
INSERT INTO supamode.permission_group_permissions (group_id, permission_id, added_at)
VALUES ((SELECT id FROM supamode.permission_groups WHERE name = 'Developer'), (SELECT id FROM supamode.permissions WHERE name = 'Read System Auth Users'), NOW());
$dlg$);

EXECUTE FORMAT($dlg$
INSERT INTO supamode.permission_group_permissions (group_id, permission_id, added_at)
VALUES ((SELECT id FROM supamode.permission_groups WHERE name = 'Developer'), (SELECT id FROM supamode.permissions WHERE name = 'Manage All Tables'), NOW());
$dlg$);

EXECUTE FORMAT($dlg$
INSERT INTO supamode.permission_group_permissions (group_id, permission_id, added_at)
VALUES ((SELECT id FROM supamode.permission_groups WHERE name = 'Developer'), (SELECT id FROM supamode.permissions WHERE name = 'Read All Storage'), NOW());
$dlg$);

-- Assigning permissions to roles
-- Assigning permission groups to roles
EXECUTE FORMAT($dlg$
INSERT INTO supamode.role_permission_groups (role_id, group_id, assigned_at)
VALUES ((SELECT id FROM supamode.roles WHERE name = 'Root'), (SELECT id FROM supamode.permission_groups WHERE name = 'Super Admin'), NOW());
$dlg$);

EXECUTE FORMAT($dlg$
INSERT INTO supamode.role_permission_groups (role_id, group_id, assigned_at)
VALUES ((SELECT id FROM supamode.roles WHERE name = 'Admin'), (SELECT id FROM supamode.permission_groups WHERE name = 'Administrator'), NOW());
$dlg$);

EXECUTE FORMAT($dlg$
INSERT INTO supamode.role_permission_groups (role_id, group_id, assigned_at)
VALUES ((SELECT id FROM supamode.roles WHERE name = 'Manager'), (SELECT id FROM supamode.permission_groups WHERE name = 'Manager'), NOW());
$dlg$);

EXECUTE FORMAT($dlg$
INSERT INTO supamode.role_permission_groups (role_id, group_id, assigned_at)
VALUES ((SELECT id FROM supamode.roles WHERE name = 'Developer'), (SELECT id FROM supamode.permission_groups WHERE name = 'Developer'), NOW());
$dlg$);

EXECUTE FORMAT($dlg$
INSERT INTO supamode.role_permission_groups (role_id, group_id, assigned_at)
VALUES ((SELECT id FROM supamode.roles WHERE name = 'Customer Support'), (SELECT id FROM supamode.permission_groups WHERE name = 'Customer Support'), NOW());
$dlg$);

EXECUTE FORMAT($dlg$
INSERT INTO supamode.role_permission_groups (role_id, group_id, assigned_at)
VALUES ((SELECT id FROM supamode.roles WHERE name = 'Read Only'), (SELECT id FROM supamode.permission_groups WHERE name = 'Read Only'), NOW());
$dlg$);

-- Assigning roles to accounts
EXECUTE FORMAT($dlg$
INSERT INTO supamode.account_roles (account_id, role_id, assigned_at)
VALUES ((SELECT id FROM supamode.accounts WHERE auth_user_id = '202141c3-2dcd-4417-a01b-f8d7935f1c0c'), (SELECT id FROM supamode.roles WHERE name = 'Root'), NOW());
$dlg$);

EXECUTE FORMAT($dlg$
INSERT INTO supamode.account_roles (account_id, role_id, assigned_at)
VALUES ((SELECT id FROM supamode.accounts WHERE auth_user_id = '91659851-467b-4eb0-8120-21b55f24c241'), (SELECT id FROM supamode.roles WHERE name = 'Admin'), NOW());
$dlg$);

EXECUTE FORMAT($dlg$
INSERT INTO supamode.account_roles (account_id, role_id, assigned_at)
VALUES ((SELECT id FROM supamode.accounts WHERE auth_user_id = '4f898e68-bff2-4c31-b279-ed1e79479ea7'), (SELECT id FROM supamode.roles WHERE name = 'Manager'), NOW());
$dlg$);

EXECUTE FORMAT($dlg$
INSERT INTO supamode.account_roles (account_id, role_id, assigned_at)
VALUES ((SELECT id FROM supamode.accounts WHERE auth_user_id = 'e536826e-54ed-4b12-bb79-2803f5de082f'), (SELECT id FROM supamode.roles WHERE name = 'Read Only'), NOW());
$dlg$);

-- Sync managed tables for the public schema
perform supamode.sync_managed_tables('public');

-- Sync managed tables for the auth schema
perform supamode.sync_managed_tables('auth', 'users');

-- Sync managed tables for the licensing schema
perform supamode.sync_managed_tables('licensing');

-- Please add any additional managed tables that you want to sync here.
--

    RAISE NOTICE 'Demo seed successfully installed';
END$$;

grant execute on procedure supamode.install_demo_schema() to service_role;