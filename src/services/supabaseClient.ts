/**
 * @file /src/services/supabaseClient.ts
 * @description Optional Supabase Auth client factory for Email/Password + Google OAuth.
 * Seamlessly falls back to server-verified Express license auth when Supabase env vars are absent.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

let cachedClient: SupabaseClient | null = null;

export function hasSupabaseConfig(): boolean {
  const url = String(import.meta.env.VITE_SUPABASE_URL || '').trim();
  const anonKey = String(import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();
  return url.startsWith('https://') && anonKey.length > 20;
}

export function getSupabaseClient(): SupabaseClient | null {
  if (!hasSupabaseConfig()) return null;
  if (!cachedClient) {
    const url = String(import.meta.env.VITE_SUPABASE_URL || '').trim();
    const anonKey = String(import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();
    cachedClient = createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    });
  }
  return cachedClient;
}
