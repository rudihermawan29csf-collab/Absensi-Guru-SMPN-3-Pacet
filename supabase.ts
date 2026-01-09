import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * ================================
 * KONFIGURASI SUPABASE
 * ================================
 */
const SUPABASE_URL = 'https://ohwhmcygyonwkfszcqgl.supabase.co';

/**
 * Ambil API Key dari Google Studio Secrets
 * Google Studio inject secrets ke global scope
 */
const getSupabaseAnonKey = (): string => {
  try {
    // @ts-ignore
    const key = (globalThis as any)?.SUPABASE_ANON_KEY;
    return typeof key === 'string' ? key : '';
  } catch {
    return '';
  }
};

/**
 * ================================
 * VALIDASI MODE CLOUD
 * ================================
 * Mock DIMATIKAN agar tidak jatuh ke Local Mode
 */
const anonKey = getSupabaseAnonKey();

if (!anonKey) {
  throw new Error(
    'SUPABASE_ANON_KEY belum terhubung. ' +
    'Pastikan sudah di-set di Google Studio → Project Settings → Secrets ' +
    'dan aplikasi sudah di-Deploy.'
  );
}

/**
 * ================================
 * CLIENT SUPABASE (LIVE)
 * ================================
 */
export const supabase: SupabaseClient = createClient(
  SUPABASE_URL,
  anonKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true
    }
  }
);

/**
 * ================================
 * REALTIME SUBSCRIPTION
 * ================================
 */
export const subscribeToTable = (
  table: string,
  callback: (payload: any) => void
) => {
  try {
    return supabase
      .channel(`realtime:${table}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table },
        callback
      )
      .subscribe();
  } catch (error) {
    console.error('Realtime subscription error:', error);
    return { unsubscribe: () => {} };
  }
};
