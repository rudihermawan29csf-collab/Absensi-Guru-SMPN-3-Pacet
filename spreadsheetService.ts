/**
 * LAYANAN GOOGLE SPREADSHEET
 * 
 * Versi Sinkronisasi Handal (Anti-CORS False Alarms)
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
        // GET harus tetap CORS agar kita bisa membaca data JSON-nya
        mode: 'cors',
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

  /**
   * Mengirim data ke GAS.
   * MENGGUNAKAN no-cors:
   * Google Apps Script sering mengembalikan 302 Redirect setelah POST.
   * Fetch standar (CORS) akan menganggap redirect tanpa header CORS sebagai error.
   * 'no-cors' akan mengirim data secara "fire and forget".
   */
  async postData(payload: any) {
    if (!isSpreadsheetConfigured) return false;

    try {
      await fetch(SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors', // Menghindari pengecekan CORS pada redirect
        headers: {
          'Content-Type': 'text/plain',
        },
        body: JSON.stringify(payload)
      });

      // Dalam mode no-cors, kita tidak bisa membaca response.ok.
      // Jika fetch tidak melempar error (throw), kita asumsikan permintaan terkirim.
      return true;
    } catch (error) {
      console.error("Network Error (Real):", error);
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