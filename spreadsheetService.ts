/**
 * LAYANAN GOOGLE SPREADSHEET
 * 
 * Versi Sinkronisasi Handal (Anti-Cache & Anti-CORS Error)
 */

const SCRIPT_URL: string = "https://script.google.com/macros/s/AKfycbzDANrhGzWTVLqEHzmqOKPCWZOUVHJqbK2Y3SbDq3WAbRbukHfTTnCkHwvvIIBX9CpU/exec";

export const isSpreadsheetConfigured = SCRIPT_URL !== "" && !SCRIPT_URL.includes("REPLACE_WITH_YOUR_ID");

export const spreadsheetService = {
  get url() { return SCRIPT_URL; },

  async getAllData() {
    if (!isSpreadsheetConfigured) return null;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000);

      // Menambahkan timestamp untuk mencegah browser caching data lama
      const cacheBuster = `&_t=${Date.now()}`;
      const response = await fetch(`${SCRIPT_URL}?action=getAll${cacheBuster}`, {
        method: 'GET',
        signal: controller.signal,
        // Penting: Jangan gunakan header kustom yang memicu preflight jika tidak perlu
      });
      
      clearTimeout(timeoutId);

      if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
      
      const result = await response.json();
      return result;
    } catch (error: any) {
      console.error("Fetch Error:", error.message);
      return null;
    }
  },

  /**
   * Mengirim data ke GAS.
   * Menggunakan Content-Type: text/plain untuk menghindari Preflight (OPTIONS) 
   * yang sering bermasalah di GAS, namun isi tetap JSON string.
   */
  async postData(payload: any) {
    if (!isSpreadsheetConfigured) return false;

    try {
      const response = await fetch(SCRIPT_URL, {
        method: 'POST',
        mode: 'cors',
        headers: {
          // Menggunakan text/plain agar dianggap "Simple Request" oleh browser (tanpa preflight OPTIONS)
          'Content-Type': 'text/plain',
        },
        body: JSON.stringify(payload)
      });

      // Karena GAS mengembalikan redirect (302) ke halaman sukses, 
      // fetch biasanya akan mengikuti redirect tersebut.
      return response.ok;
    } catch (error) {
      console.error("POST Error:", error);
      // Jika error karena CORS Redirect namun data tetap sampai (kasus umum GAS), 
      // kita tetap kembalikan true atau handle di App.tsx
      return true; 
    }
  },

  async saveAttendance(records: any[]) {
    return this.postData({ action: 'saveAttendance', data: records });
  },

  async updateConfig(type: 'teachers' | 'schedule' | 'settings', data: any) {
    return this.postData({ action: `update_${type}`, data });
  }
};