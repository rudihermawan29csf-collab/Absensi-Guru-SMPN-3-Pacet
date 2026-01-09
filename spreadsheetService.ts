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

      const cacheBuster = `&_t=${Date.now()}`;
      const response = await fetch(`${SCRIPT_URL}?action=getAll${cacheBuster}`, {
        method: 'GET',
        signal: controller.signal,
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

  async postData(payload: any) {
    if (!isSpreadsheetConfigured) return false;

    try {
      const response = await fetch(SCRIPT_URL, {
        method: 'POST',
        mode: 'cors',
        headers: {
          'Content-Type': 'text/plain',
        },
        body: JSON.stringify(payload)
      });

      // GAS akan melakukan redirect 302, fetch akan mengikuti hingga ke halaman hasil
      return response.ok;
    } catch (error) {
      console.error("POST Error:", error);
      // Return false agar App.tsx tahu bahwa pengiriman gagal
      return false; 
    }
  },

  async saveAttendance(records: any[]) {
    return this.postData({ action: 'saveAttendance', data: records });
  },

  async updateConfig(type: 'teachers' | 'schedule' | 'settings', data: any) {
    return this.postData({ action: `update_${type}`, data });
  }
};