/**
 * LAYANAN GOOGLE SPREADSHEET
 * 
 * Versi Ultra-Handal (Simple POST Method)
 */

const SCRIPT_URL: string = "https://script.google.com/macros/s/AKfycbzDANrhGzWTVLqEHzmqOKPCWZOUVHJqbK2Y3SbDq3WAbRbukHfTTnCkHwvvIIBX9CpU/exec";

export const isSpreadsheetConfigured = SCRIPT_URL !== "" && !SCRIPT_URL.includes("REPLACE_WITH_YOUR_ID");

export const spreadsheetService = {
  get url() { return SCRIPT_URL; },

  async getAllData() {
    if (!isSpreadsheetConfigured) return null;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const cacheBuster = `&_t=${Date.now()}`;
      const response = await fetch(`${SCRIPT_URL}?action=getAll${cacheBuster}`, {
        method: 'GET',
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
   * Mengirim data ke GAS dengan metode 'Simple Request'.
   * Menghapus header custom agar tidak memicu CORS preflight.
   */
  async postData(payload: any) {
    if (!isSpreadsheetConfigured) return false;

    try {
      // Kita kirim sebagai string murni tanpa header Content-Type
      // GAS tetap bisa membacanya lewat e.postData.contents
      await fetch(SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors', // Sangat penting untuk Google Apps Script
        body: JSON.stringify(payload)
      });

      // Dalam mode no-cors, kita tidak bisa tahu status aslinya.
      // Kita asumsikan terkirim jika tidak ada error jaringan fatal.
      return true;
    } catch (error) {
      console.error("POST Network Error:", error);
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