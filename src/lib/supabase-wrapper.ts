/**
 * Type-safe Supabase query wrapper
 * Eliminates the need for 'as any' type assertions
 */

import { supabase } from "@/integrations/supabase/client";
import { Database } from "@/integrations/supabase/types";

type Tables = Database['public']['Tables'];
type TableName = keyof Tables;

/**
 * Type-safe query builder for Supabase tables
 */
export const db = {
  from: <T extends TableName>(table: T) => supabase.from(table),
  
  // Helper for RPC calls
  rpc: <T extends keyof Database['public']['Functions']>(
    fn: T,
    params?: Database['public']['Functions'][T]['Args']
  ) => supabase.rpc(fn, params as any),
};

/**
 * Type-safe storage operations
 */
export const storage = {
  from: (bucket: string) => supabase.storage.from(bucket),
};

/**
 * Type-safe auth operations
 */
export const auth = {
  getUser: () => supabase.auth.getUser(),
  getSession: () => supabase.auth.getSession(),
  signIn: (credentials: { email: string; password: string }) => 
    supabase.auth.signInWithPassword(credentials),
  signUp: (credentials: { email: string; password: string }) => 
    supabase.auth.signUp(credentials),
  signOut: () => supabase.auth.signOut(),
  admin: supabase.auth.admin,
};

/**
 * Realtime channel creation
 */
export const channel = (name: string) => supabase.channel(name);
