/// <reference types="vite/client" />

import "hono";

import { DrizzleSupabaseClient, SupabaseClient } from "../../packages/supabase/src/clients/drizzle-client";
import { AuthorizationService } from "../../packages/features/auth/src/api/services/authorization.service";

interface ImportMetaEnv {
  VITE_SUPABASE_URL: string;
  VITE_SUPABASE_ANON_KEY: string;
}

declare namespace NodeJS {
  interface ProcessEnv {
    VITE_SUPABASE_URL?: string;
    VITE_SUPABASE_ANON_KEY?: string;
    VITE_SUPABASE_PUBLIC_KEY?: string;
    LOGGER?: string;
    NODE_ENV?: string;
    DATABASE_URL?: string;
    VITE_OAUTH_PROVIDERS?: string;
    VITE_AUTH_PASSWORD?: string;
    VITE_AUTH_MAGIC_LINK?: string;
    VITE_SITE_URL?: string;
    VITE_ENABLE_VERSION_CHECK?: string;
    VITE_CAPTCHA_SITE_KEY?: string;
  }
}

declare module "hono" {
  interface ContextVariableMap {
    drizzle: DrizzleSupabaseClient;
    supabase: SupabaseClient;
    authorization: AuthorizationService;
  }
}
