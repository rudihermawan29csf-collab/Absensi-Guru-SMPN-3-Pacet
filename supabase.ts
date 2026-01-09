import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ohwhmcygyonwkfszcqgl.supabase.co';

// Mengambil kunci dari environment variable
// Pastikan variabel ini tersedia melalui sistem Secrets atau dialog pemilihan kunci
const getApiKey = () => process.env.API_KEY || '';

/**
 * Mock Client untuk mode fallback lokal (LocalStorage)
 */
const createLocalStorageClient = () => {
  return {
    from: (table: string) => ({
      select: () => ({
        eq: (col: string, val: any) => ({
          single: () => {
            const data = JSON.parse(localStorage.getItem(`spn3_mock_${table}`) || '[]');
            return { data: data.find((d: any) => (table === 'config' ? d.id === val : d[col] === val)) || null, error: null };
          }
        }),
        order: () => Promise.resolve({ data: JSON.parse(localStorage.getItem(`spn3_mock_${table}`) || '[]'), error: null }),
        then: (cb: any) => cb({ data: JSON.parse(localStorage.getItem(`spn3_mock_${table}`) || '[]'), error: null })
      }),
      upsert: (payload: any) => {
        const storageKey = `spn3_mock_${table}`;
        const existing = JSON.parse(localStorage.getItem(storageKey) || '[]');
        const items = Array.isArray(payload) ? payload : [payload];
        items.forEach(item => {
          const idx = existing.findIndex((e: any) => e.id === item.id);
          if (idx >= 0) existing[idx] = { ...existing[idx], ...item };
          else existing.push(item);
        });
        localStorage.setItem(storageKey, JSON.stringify(existing));
        return Promise.resolve({ data: items, error: null });
      },
      delete: () => Promise.resolve({ error: null })
    }),
    channel: () => ({ on: () => ({ subscribe: () => ({ unsubscribe: () => {} }) }) }),
    isLocal: true
  } as any;
};

// Client Utama: Dibuat secara dinamis
export const supabase = getApiKey() 
  ? createClient(supabaseUrl, getApiKey()) 
  : createLocalStorageClient();

export const subscribeToTable = (table: string, callback: (payload: any) => void) => {
  const key = getApiKey();
  if (!key || (supabase as any).isLocal) return { unsubscribe: () => {} };
  
  try {
    return supabase
      .channel(`public:${table}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: table }, callback)
      .subscribe();
  } catch (e) {
    return { unsubscribe: () => {} };
  }
};