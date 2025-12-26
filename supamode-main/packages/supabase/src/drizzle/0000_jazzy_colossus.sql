-- Current sql file was generated after introspecting the database
-- If you want to run this migration please uncomment this code before executing migrations
/*
CREATE SCHEMA "supamode";
--> statement-breakpoint
CREATE TYPE "supamode"."permission_scope" AS ENUM('database', 'schema', 'table', 'column');--> statement-breakpoint
CREATE TYPE "supamode"."relation_type" AS ENUM('one_to_one', 'one_to_many', 'many_to_many');--> statement-breakpoint
CREATE TYPE "supamode"."system_resource" AS ENUM('membership', 'role', 'permission', 'system_setting', 'log', 'tool');--> statement-breakpoint
CREATE TABLE "supamode"."permission_groups" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"is_system_group" boolean DEFAULT false NOT NULL,
	"category" varchar(100),
	"rank" integer DEFAULT 0,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"valid_from" timestamp with time zone DEFAULT now(),
	"valid_until" timestamp with time zone,
	CONSTRAINT "permission_groups_name_key" UNIQUE("name"),
	CONSTRAINT "permission_groups_metadata_check" CHECK (jsonb_typeof(metadata) = 'object'::text)
);
--> statement-breakpoint
ALTER TABLE "supamode"."permission_groups" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "supamode"."accounts" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
	"auth_user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "accounts_auth_user_id_key" UNIQUE("auth_user_id"),
	CONSTRAINT "accounts_metadata_check" CHECK (jsonb_typeof(metadata) = 'object'::text)
);
--> statement-breakpoint
ALTER TABLE "supamode"."accounts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "supamode"."roles" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
	"name" varchar(50) NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"is_system_role" boolean DEFAULT false NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"rank" integer DEFAULT 0,
	"category" varchar(100),
	"max_members" integer,
	"valid_from" timestamp with time zone DEFAULT now(),
	"valid_until" timestamp with time zone,
	CONSTRAINT "roles_name_key" UNIQUE("name"),
	CONSTRAINT "roles_metadata_check" CHECK (jsonb_typeof(metadata) = 'object'::text)
);
--> statement-breakpoint
ALTER TABLE "supamode"."roles" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "supamode"."system_permissions" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
	"resource" "supamode"."system_resource" NOT NULL,
	"action" varchar(50) NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"required_roles" uuid[],
	"exclude_roles" uuid[],
	CONSTRAINT "system_permissions_resource_action_key" UNIQUE("resource","action"),
	CONSTRAINT "system_permissions_name_key" UNIQUE("name")
);
--> statement-breakpoint
ALTER TABLE "supamode"."system_permissions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "supamode"."permissions" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"scope" "supamode"."permission_scope" DEFAULT 'table' NOT NULL,
	"action" varchar(50) NOT NULL,
	"schema_name" varchar(64) DEFAULT 'public',
	"table_name" varchar(64),
	"column_name" varchar(64),
	"constraints" jsonb,
	"conditions" jsonb,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "permissions_name_key" UNIQUE("name"),
	CONSTRAINT "valid_scope_data" CHECK (((scope = 'table'::supamode.permission_scope) AND (schema_name IS NOT NULL)) OR ((scope = 'schema'::supamode.permission_scope) AND (schema_name IS NOT NULL)) OR (scope = 'database'::supamode.permission_scope) OR ((scope = 'column'::supamode.permission_scope) AND (schema_name IS NOT NULL) AND (table_name IS NOT NULL) AND (column_name IS NOT NULL)))
);
--> statement-breakpoint
ALTER TABLE "supamode"."permissions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "supamode"."managed_tables" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
	"schema_name" varchar(64) NOT NULL,
	"table_name" varchar(64) NOT NULL,
	"display_name" varchar(255),
	"description" text,
	"is_visible" boolean DEFAULT true,
	"ordering" integer,
	"category" varchar(100),
	"tags" text[],
	"icon" varchar(50),
	"ui_config" jsonb DEFAULT '{}'::jsonb,
	"validation_rules" jsonb DEFAULT '{}'::jsonb,
	"row_level_security" jsonb,
	"triggers" jsonb,
	"hidden_columns" text[] DEFAULT '{"RAY"}',
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "managed_tables_schema_name_table_name_key" UNIQUE("schema_name","table_name")
);
--> statement-breakpoint
ALTER TABLE "supamode"."managed_tables" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "supamode"."managed_columns" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
	"table_id" uuid NOT NULL,
	"column_name" varchar(64) NOT NULL,
	"display_name" varchar(255),
	"description" text,
	"is_visible" boolean DEFAULT true,
	"is_required" boolean DEFAULT false,
	"is_unique" boolean DEFAULT false,
	"is_searchable" boolean DEFAULT true,
	"is_sortable" boolean DEFAULT true,
	"is_filterable" boolean DEFAULT true,
	"ordinal_position" integer DEFAULT 0 NOT NULL,
	"search_weight" integer DEFAULT 1,
	"default_value" text,
	"validation_rules" jsonb DEFAULT '{}'::jsonb,
	"ui_config" jsonb DEFAULT '{}'::jsonb,
	"foreign_key_config" jsonb,
	"computed_expression" text,
	"permissions" jsonb,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "managed_columns_table_id_column_name_key" UNIQUE("table_id","column_name")
);
--> statement-breakpoint
ALTER TABLE "supamode"."managed_columns" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "supamode"."custom_views" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"table_id" uuid NOT NULL,
	"view_type" varchar(50) NOT NULL,
	"config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"is_default" boolean DEFAULT false,
	"is_public" boolean DEFAULT false,
	"created_by" uuid,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "supamode"."custom_views" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "supamode"."table_relations" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
	"source_table_id" uuid NOT NULL,
	"target_table_id" uuid NOT NULL,
	"relation_type" "supamode"."relation_type" NOT NULL,
	"source_column" varchar(64) NOT NULL,
	"target_column" varchar(64) NOT NULL,
	"junction_table" varchar(64),
	"junction_source_column" varchar(64),
	"junction_target_column" varchar(64),
	"is_required" boolean DEFAULT false,
	"on_delete" varchar(20) DEFAULT 'NO ACTION',
	"on_update" varchar(20) DEFAULT 'NO ACTION',
	"display_fields" jsonb NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "valid_junction_table" CHECK (((relation_type = 'many_to_many'::supamode.relation_type) AND (junction_table IS NOT NULL)) OR ((relation_type <> 'many_to_many'::supamode.relation_type) AND (junction_table IS NULL)))
);
--> statement-breakpoint
ALTER TABLE "supamode"."table_relations" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "supamode"."saved_filters" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"table_id" uuid NOT NULL,
	"created_by" uuid NOT NULL,
	"is_public" boolean DEFAULT false,
	"filter_config" jsonb NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "supamode"."saved_filters" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "supamode"."sidebar_tools" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
	"name" varchar(100) NOT NULL,
	"display_name" varchar(255),
	"component_path" varchar(255) NOT NULL,
	"icon" varchar(50),
	"category" varchar(100),
	"ordering" integer DEFAULT 0,
	"is_visible" boolean DEFAULT true,
	"required_permissions" jsonb DEFAULT '[]'::jsonb,
	"ui_config" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sidebar_tools_name_key" UNIQUE("name")
);
--> statement-breakpoint
ALTER TABLE "supamode"."sidebar_tools" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "supamode"."role_hierarchy" (
	"parent_role_id" uuid NOT NULL,
	"child_role_id" uuid NOT NULL,
	"inherit_permissions" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	CONSTRAINT "role_hierarchy_pkey" PRIMARY KEY("parent_role_id","child_role_id"),
	CONSTRAINT "role_hierarchy_check" CHECK (parent_role_id <> child_role_id)
);
--> statement-breakpoint
ALTER TABLE "supamode"."role_hierarchy" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "supamode"."permission_group_system_permissions" (
	"group_id" uuid NOT NULL,
	"system_permission_id" uuid NOT NULL,
	"added_at" timestamp with time zone DEFAULT now() NOT NULL,
	"added_by" uuid,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	CONSTRAINT "permission_group_system_permissions_pkey" PRIMARY KEY("group_id","system_permission_id")
);
--> statement-breakpoint
ALTER TABLE "supamode"."permission_group_system_permissions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "supamode"."user_preferences" (
	"account_id" uuid NOT NULL,
	"table_id" uuid NOT NULL,
	"preferences" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_preferences_pkey" PRIMARY KEY("account_id","table_id")
);
--> statement-breakpoint
ALTER TABLE "supamode"."user_preferences" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "supamode"."permission_group_permissions" (
	"group_id" uuid NOT NULL,
	"permission_id" uuid NOT NULL,
	"added_at" timestamp with time zone DEFAULT now() NOT NULL,
	"added_by" uuid,
	"conditions" jsonb,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	CONSTRAINT "permission_group_permissions_pkey" PRIMARY KEY("group_id","permission_id")
);
--> statement-breakpoint
ALTER TABLE "supamode"."permission_group_permissions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "supamode"."account_roles" (
	"account_id" uuid NOT NULL,
	"role_id" uuid NOT NULL,
	"assigned_at" timestamp with time zone DEFAULT now() NOT NULL,
	"assigned_by" uuid,
	"valid_from" timestamp with time zone DEFAULT now(),
	"valid_until" timestamp with time zone,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	CONSTRAINT "account_roles_pkey" PRIMARY KEY("account_id","role_id")
);
--> statement-breakpoint
ALTER TABLE "supamode"."account_roles" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "supamode"."role_system_permissions" (
	"role_id" uuid NOT NULL,
	"system_permission_id" uuid NOT NULL,
	"granted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"granted_by" uuid,
	"valid_from" timestamp with time zone DEFAULT now(),
	"valid_until" timestamp with time zone,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	CONSTRAINT "role_system_permissions_pkey" PRIMARY KEY("role_id","system_permission_id")
);
--> statement-breakpoint
ALTER TABLE "supamode"."role_system_permissions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "supamode"."role_permission_groups" (
	"role_id" uuid NOT NULL,
	"group_id" uuid NOT NULL,
	"assigned_at" timestamp with time zone DEFAULT now() NOT NULL,
	"assigned_by" uuid,
	"valid_from" timestamp with time zone DEFAULT now(),
	"valid_until" timestamp with time zone,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	CONSTRAINT "role_permission_groups_pkey" PRIMARY KEY("role_id","group_id")
);
--> statement-breakpoint
ALTER TABLE "supamode"."role_permission_groups" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "supamode"."role_permissions" (
	"role_id" uuid NOT NULL,
	"permission_id" uuid NOT NULL,
	"granted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"granted_by" uuid,
	"valid_from" timestamp with time zone DEFAULT now(),
	"valid_until" timestamp with time zone,
	"conditions" jsonb,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	CONSTRAINT "role_permissions_pkey" PRIMARY KEY("role_id","permission_id")
);
--> statement-breakpoint
ALTER TABLE "supamode"."role_permissions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "supamode"."permission_groups" ADD CONSTRAINT "permission_groups_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "supamode"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supamode"."accounts" ADD CONSTRAINT "accounts_auth_user_id_fkey" FOREIGN KEY ("auth_user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supamode"."managed_columns" ADD CONSTRAINT "managed_columns_table_id_fkey" FOREIGN KEY ("table_id") REFERENCES "supamode"."managed_tables"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supamode"."custom_views" ADD CONSTRAINT "custom_views_table_id_fkey" FOREIGN KEY ("table_id") REFERENCES "supamode"."managed_tables"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supamode"."custom_views" ADD CONSTRAINT "custom_views_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "supamode"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supamode"."table_relations" ADD CONSTRAINT "table_relations_source_table_id_fkey" FOREIGN KEY ("source_table_id") REFERENCES "supamode"."managed_tables"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supamode"."table_relations" ADD CONSTRAINT "table_relations_target_table_id_fkey" FOREIGN KEY ("target_table_id") REFERENCES "supamode"."managed_tables"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supamode"."saved_filters" ADD CONSTRAINT "saved_filters_table_id_fkey" FOREIGN KEY ("table_id") REFERENCES "supamode"."managed_tables"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supamode"."saved_filters" ADD CONSTRAINT "saved_filters_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "supamode"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supamode"."role_hierarchy" ADD CONSTRAINT "role_hierarchy_parent_role_id_fkey" FOREIGN KEY ("parent_role_id") REFERENCES "supamode"."roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supamode"."role_hierarchy" ADD CONSTRAINT "role_hierarchy_child_role_id_fkey" FOREIGN KEY ("child_role_id") REFERENCES "supamode"."roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supamode"."permission_group_system_permissions" ADD CONSTRAINT "permission_group_system_permissions_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "supamode"."permission_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supamode"."permission_group_system_permissions" ADD CONSTRAINT "permission_group_system_permissions_system_permission_id_fkey" FOREIGN KEY ("system_permission_id") REFERENCES "supamode"."system_permissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supamode"."permission_group_system_permissions" ADD CONSTRAINT "permission_group_system_permissions_added_by_fkey" FOREIGN KEY ("added_by") REFERENCES "supamode"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supamode"."user_preferences" ADD CONSTRAINT "user_preferences_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "supamode"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supamode"."user_preferences" ADD CONSTRAINT "user_preferences_table_id_fkey" FOREIGN KEY ("table_id") REFERENCES "supamode"."managed_tables"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supamode"."permission_group_permissions" ADD CONSTRAINT "permission_group_permissions_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "supamode"."permission_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supamode"."permission_group_permissions" ADD CONSTRAINT "permission_group_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "supamode"."permissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supamode"."permission_group_permissions" ADD CONSTRAINT "permission_group_permissions_added_by_fkey" FOREIGN KEY ("added_by") REFERENCES "supamode"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supamode"."account_roles" ADD CONSTRAINT "account_roles_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "supamode"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supamode"."account_roles" ADD CONSTRAINT "account_roles_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "supamode"."roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supamode"."account_roles" ADD CONSTRAINT "account_roles_assigned_by_fkey" FOREIGN KEY ("assigned_by") REFERENCES "supamode"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supamode"."role_system_permissions" ADD CONSTRAINT "role_system_permissions_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "supamode"."roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supamode"."role_system_permissions" ADD CONSTRAINT "role_system_permissions_system_permission_id_fkey" FOREIGN KEY ("system_permission_id") REFERENCES "supamode"."system_permissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supamode"."role_system_permissions" ADD CONSTRAINT "role_system_permissions_granted_by_fkey" FOREIGN KEY ("granted_by") REFERENCES "supamode"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supamode"."role_permission_groups" ADD CONSTRAINT "role_permission_groups_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "supamode"."permission_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supamode"."role_permission_groups" ADD CONSTRAINT "role_permission_groups_assigned_by_fkey" FOREIGN KEY ("assigned_by") REFERENCES "supamode"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supamode"."role_permission_groups" ADD CONSTRAINT "role_permission_groups_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "supamode"."roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supamode"."role_permissions" ADD CONSTRAINT "role_permissions_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "supamode"."roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supamode"."role_permissions" ADD CONSTRAINT "role_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "supamode"."permissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supamode"."role_permissions" ADD CONSTRAINT "role_permissions_granted_by_fkey" FOREIGN KEY ("granted_by") REFERENCES "supamode"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_permission_groups_category" ON "supamode"."permission_groups" USING btree ("category" text_ops);--> statement-breakpoint
CREATE INDEX "idx_managed_tables_visibility" ON "supamode"."managed_tables" USING btree ("is_visible" bool_ops) WHERE (is_visible = true);--> statement-breakpoint
CREATE INDEX "idx_managed_columns_table_visibility" ON "supamode"."managed_columns" USING btree ("table_id" bool_ops,"is_visible" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_custom_views_table" ON "supamode"."custom_views" USING btree ("table_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_table_relations_source" ON "supamode"."table_relations" USING btree ("source_table_id" uuid_ops,"relation_type" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_table_relations_target" ON "supamode"."table_relations" USING btree ("target_table_id" enum_ops,"relation_type" enum_ops);--> statement-breakpoint
CREATE INDEX "idx_saved_filters_table" ON "supamode"."saved_filters" USING btree ("table_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_role_hierarchy_child" ON "supamode"."role_hierarchy" USING btree ("child_role_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_role_hierarchy_parent" ON "supamode"."role_hierarchy" USING btree ("parent_role_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_permission_group_system_permissions_group" ON "supamode"."permission_group_system_permissions" USING btree ("group_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_user_preferences_account" ON "supamode"."user_preferences" USING btree ("account_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_permission_group_permissions_group" ON "supamode"."permission_group_permissions" USING btree ("group_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_account_roles_account_id" ON "supamode"."account_roles" USING btree ("account_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_account_roles_role_id" ON "supamode"."account_roles" USING btree ("role_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_role_system_permissions_permission_id" ON "supamode"."role_system_permissions" USING btree ("system_permission_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_role_system_permissions_role_id" ON "supamode"."role_system_permissions" USING btree ("role_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_role_permission_groups_role" ON "supamode"."role_permission_groups" USING btree ("role_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_role_permission_groups_valid" ON "supamode"."role_permission_groups" USING btree ("valid_until" timestamptz_ops) WHERE (valid_until IS NOT NULL);--> statement-breakpoint
CREATE INDEX "idx_role_permissions_permission_id" ON "supamode"."role_permissions" USING btree ("permission_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_role_permissions_role_id" ON "supamode"."role_permissions" USING btree ("role_id" uuid_ops);--> statement-breakpoint
CREATE POLICY "view_permissions_groups" ON "supamode"."permission_groups" AS PERMISSIVE FOR SELECT TO public USING (((EXISTS ( SELECT 1
   FROM (supamode.account_roles ar
     JOIN supamode.role_permission_groups rpg ON ((ar.role_id = rpg.role_id)))
  WHERE ((ar.account_id = supamode.get_current_user_account_id()) AND (rpg.group_id = permission_groups.id)))) OR (EXISTS ( SELECT 1
   FROM supamode.accounts a
  WHERE ((a.auth_user_id = ( SELECT auth.uid() AS uid)) AND (a.id = permission_groups.created_by))))));--> statement-breakpoint
CREATE POLICY "select_accounts" ON "supamode"."accounts" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((( SELECT auth.uid() AS uid) = auth_user_id));--> statement-breakpoint
CREATE POLICY "view_assigned_roles" ON "supamode"."roles" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM supamode.account_roles ar
  WHERE ((ar.role_id = roles.id) AND (ar.account_id = supamode.get_current_user_account_id())))));--> statement-breakpoint
CREATE POLICY "view_system_permissions" ON "supamode"."system_permissions" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM supamode.role_system_permissions rsp
  WHERE ((rsp.role_id = ( SELECT get_current_user_role.id
           FROM supamode.get_current_user_role() get_current_user_role(id, name, description, created_at, updated_at, is_system_role, metadata, rank, category, max_members, valid_from, valid_until))) AND (rsp.system_permission_id = system_permissions.id)))));--> statement-breakpoint
CREATE POLICY "view_permissions" ON "supamode"."permissions" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM supamode.role_permissions rp
  WHERE ((rp.role_id = ( SELECT get_current_user_role.id
           FROM supamode.get_current_user_role() get_current_user_role(id, name, description, created_at, updated_at, is_system_role, metadata, rank, category, max_members, valid_from, valid_until))) AND (rp.permission_id = permissions.id)))));--> statement-breakpoint
CREATE POLICY "view_managed_tables" ON "supamode"."managed_tables" AS PERMISSIVE FOR SELECT TO "authenticated" USING (supamode.has_data_permission(( SELECT auth.uid() AS uid), 'read'::character varying, schema_name, table_name));--> statement-breakpoint
CREATE POLICY "view_managed_columns" ON "supamode"."managed_columns" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM supamode.managed_tables mt
  WHERE ((mt.id = managed_columns.table_id) AND supamode.has_data_permission(( SELECT auth.uid() AS uid), 'read'::character varying, mt.schema_name, mt.table_name, managed_columns.column_name)))));--> statement-breakpoint
CREATE POLICY "view_custom_views" ON "supamode"."custom_views" AS PERMISSIVE FOR SELECT TO "authenticated" USING (((created_by = supamode.get_current_user_account_id()) OR ((is_public = true) AND (supamode.get_current_user_account_id() IS NOT NULL)) OR (EXISTS ( SELECT 1
   FROM supamode.managed_tables mt
  WHERE ((mt.id = custom_views.table_id) AND supamode.has_data_permission(( SELECT auth.uid() AS uid), 'table'::character varying, 'read'::character varying, mt.schema_name, mt.table_name))))));--> statement-breakpoint
CREATE POLICY "view_sidebar_tool" ON "supamode"."sidebar_tools" AS PERMISSIVE FOR SELECT TO "authenticated" USING (((required_permissions = '[]'::jsonb) OR (EXISTS ( SELECT 1
   FROM jsonb_array_elements(sidebar_tools.required_permissions) rp(value)
  WHERE supamode.has_admin_permission(auth.uid(), ((rp.value ->> 'resource'::text))::supamode.system_resource, ((rp.value ->> 'action'::text))::character varying)))));--> statement-breakpoint
CREATE POLICY "view_role_hierarchy" ON "supamode"."role_hierarchy" AS PERMISSIVE FOR SELECT TO "authenticated" USING (supamode.current_user_has_account());--> statement-breakpoint
CREATE POLICY "view_account_roles" ON "supamode"."account_roles" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((account_id = supamode.get_current_user_account_id()));--> statement-breakpoint
CREATE POLICY "view_role_system_permissions" ON "supamode"."role_system_permissions" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((role_id = ( SELECT get_current_user_role.id
   FROM supamode.get_current_user_role() get_current_user_role(id, name, description, created_at, updated_at, is_system_role, metadata, rank, category, max_members, valid_from, valid_until))));--> statement-breakpoint
CREATE POLICY "view_role_permissions" ON "supamode"."role_permissions" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((role_id = ( SELECT get_current_user_role.id
   FROM supamode.get_current_user_role() get_current_user_role(id, name, description, created_at, updated_at, is_system_role, metadata, rank, category, max_members, valid_from, valid_until))));
*/