import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ohwhmcygyonwkfszcqgl.supabase.co';
const supabaseKey = process.env.SUPABASE_KEY || process.env.API_KEY || '';

/**
 * Mock Client yang mensimulasikan API Supabase menggunakan LocalStorage.
 * Digunakan saat API Key belum dikonfigurasi agar aplikasi tetap fungsional.
 */
const createLocalStorageClient = () => {
  console.warn("SIAP GURU: Menggunakan Mode Lokal (Penyimpanan Browser) karena API Key Cloud belum dikonfigurasi.");
  
  const mockFrom = (table: string) => ({
    select: (query?: string) => {
      const storageKey = `spn3_mock_${table}`;
      const data = JSON.parse(localStorage.getItem(storageKey) || '[]');
      
      const response = {
        data,
        error: null,
        eq: (col: string, val: any) => ({
          single: () => {
            if (table === 'config') return { data: data.find((d: any) => d.id === val) || null, error: null };
            return { data: data.find((d: any) => d[col] === val) || null, error: null };
          }
        }),
        order: () => Promise.resolve({ data, error: null }),
        // Memungkinkan pemanggilan langsung .then() atau await
        then: (cb: any) => cb({ data, error: null })
      };
      return response;
    },
    upsert: (payload: any | any[]) => {
      const storageKey = `spn3_mock_${table}`;
      const existing = JSON.parse(localStorage.getItem(storageKey) || '[]');
      const items = Array.isArray(payload) ? payload : [payload];
      
      items.forEach(item => {
        const idField = table === 'config' ? 'id' : 'id';
        const idx = existing.findIndex((e: any) => e[idField] === item[idField]);
        if (idx >= 0) existing[idx] = { ...existing[idx], ...item };
        else existing.push(item);
      });
      
      localStorage.setItem(storageKey, JSON.stringify(existing));
      return Promise.resolve({ data: items, error: null });
    },
    delete: (query: any) => Promise.resolve({ error: null })
  });

  return {
    from: mockFrom,
    channel: () => ({ on: () => ({ subscribe: () => ({ unsubscribe: () => {} }) }) }),
    isLocal: true // Penanda bahwa ini adalah mock
  } as any;
};

export const supabase = supabaseKey ? createClient(supabaseUrl, supabaseKey) : createLocalStorageClient();

export const subscribeToTable = (table: string, callback: (payload: any) => void) => {
  if (!supabaseKey || (supabase as any).isLocal) return { unsubscribe: () => {} };
  
  try {
    return supabase
      .channel(`public:${table}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: table }, callback)
      .subscribe();
  } catch (e) {
    return { unsubscribe: () => {} };
  }
};