import { createClient } from '@supabase/supabase-js';

// URL proyek Supabase Anda
const supabaseUrl = 'https://ohwhmcygyonwkfszcqgl.supabase.co';

/**
 * Kunci API Supabase.
 * Mencoba mengambil dari variabel lingkungan yang tersedia.
 */
const supabaseKey = process.env.SUPABASE_KEY || process.env.API_KEY || '';

const createSafeClient = () => {
  if (!supabaseKey) {
    const errorMsg = "SIAP GURU: Supabase Key (anon) tidak ditemukan. Pastikan variabel lingkungan SUPABASE_KEY sudah diisi di dashboard AI Studio.";
    console.error(errorMsg);
    
    // Proxy untuk mencegah crash saat startup, memberikan feedback saat dipanggil
    return new Proxy({} as any, {
      get: (target, prop) => {
        if (prop === 'from') {
          return () => ({
            select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: null, error: { message: 'Missing API Key' } }) }), order: () => Promise.resolve({ data: [], error: null }) }),
            upsert: () => Promise.resolve({ error: { message: 'Akses ditolak: API Key Supabase belum dikonfigurasi.' } }),
            delete: () => Promise.resolve({ error: { message: 'Akses ditolak: API Key Supabase belum dikonfigurasi.' } })
          });
        }
        if (prop === 'channel') return () => ({ on: () => ({ subscribe: () => ({}) }) });
        return () => {};
      }
    });
  }
  
  try {
    // Inisialisasi client standar
    return createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true
      }
    });
  } catch (err) {
    console.error("Gagal menginisialisasi Supabase Client:", err);
    return {} as any;
  }
};

export const supabase = createSafeClient();

/**
 * Helper untuk Real-time subscription
 */
export const subscribeToTable = (table: string, callback: (payload: any) => void) => {
  if (!supabaseKey || !supabase.channel) return { unsubscribe: () => {} };
  
  try {
    return supabase
      .channel(`public:${table}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: table }, callback)
      .subscribe();
  } catch (e) {
    return { unsubscribe: () => {} };
  }
};