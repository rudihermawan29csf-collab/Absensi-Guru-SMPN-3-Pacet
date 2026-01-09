import { createClient } from '@supabase/supabase-js';

// Menggunakan URL proyek spesifik dari user
const supabaseUrl = 'https://ohwhmcygyonwkfszcqgl.supabase.co';

/**
 * Kunci API Supabase.
 * Mengambil dari SUPABASE_KEY atau mencoba API_KEY sebagai fallback (beberapa platform menggunakan variabel ini).
 */
const supabaseKey = process.env.SUPABASE_KEY || process.env.API_KEY || '';

/**
 * Inisialisasi client dengan penanganan error.
 * Jika key kosong, kita mengembalikan Proxy agar aplikasi tidak langsung crash (white screen)
 * melainkan memberikan pesan error yang jelas di console saat mencoba mengakses data.
 */
const createSafeClient = () => {
  if (!supabaseKey) {
    console.error("SIAP GURU ERROR: Supabase Key tidak ditemukan. Pastikan variabel lingkungan SUPABASE_KEY telah diatur di pengaturan proyek.");
    
    // Kembalikan objek proxy agar pemanggilan method seperti .from() tidak langsung menyebabkan "Uncaught Error"
    return new Proxy({} as any, {
      get: (target, prop) => {
        return () => {
          console.error(`Akses ke Supabase (${String(prop)}) gagal karena API Key belum dikonfigurasi.`);
          return {
            select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: null, error: { message: 'Config Missing' } }) }), order: () => Promise.resolve({ data: [], error: null }) }),
            from: () => ({ select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: null, error: null }) }) }) }),
            upsert: () => Promise.resolve({ error: { message: 'Config Missing' } }),
            on: () => ({ subscribe: () => ({}) })
          };
        };
      }
    });
  }
  
  try {
    return createClient(supabaseUrl, supabaseKey);
  } catch (err) {
    console.error("Gagal menginisialisasi Supabase Client:", err);
    return {} as any;
  }
};

export const supabase = createSafeClient();

/**
 * Helper untuk berlangganan perubahan data secara real-time pada tabel tertentu.
 * @param table Nama tabel di database Supabase
 * @param callback Fungsi yang dijalankan saat ada perubahan data (INSERT, UPDATE, DELETE)
 */
export const subscribeToTable = (table: string, callback: (payload: any) => void) => {
  if (!supabaseKey || !supabase.channel) {
    return { unsubscribe: () => {} };
  }
  
  try {
    return supabase
      .channel(`public:${table}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: table }, callback)
      .subscribe();
  } catch (e) {
    console.warn("Real-time subscription gagal:", e);
    return { unsubscribe: () => {} };
  }
};