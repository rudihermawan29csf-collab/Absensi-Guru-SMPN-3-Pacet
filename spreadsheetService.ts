/**
 * LAYANAN GOOGLE SPREADSHEET
 * 
 * PENTING: SCRIPT_URL telah diperbarui dengan URL deployment Anda.
 */

const SCRIPT_URL: string = "https://script.google.com/macros/s/AKfycbzDANrhGzWTVLqEHzmqOKPCWZOUVHJqbK2Y3SbDq3WAbRbukHfTTnCkHwvvIIBX9CpU/exec";

// Cek apakah URL masih menggunakan placeholder atau kosong
export const isSpreadsheetConfigured = SCRIPT_URL !== "" && !SCRIPT_URL.includes("REPLACE_WITH_YOUR_ID");

export const spreadsheetService = {
  get url() { return SCRIPT_URL; },

  async getAllData() {
    if (!isSpreadsheetConfigured) return null;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 detik timeout

      const response = await fetch(`${SCRIPT_URL}?action=getAll`, {
        method: 'GET',
        signal: controller.signal,
        headers: { 
          'Accept': 'application/json'
        }
      });
      
      clearTimeout(timeoutId);

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      
      const text = await response.text();
      try {
        return JSON.parse(text);
      } catch (e) {
        console.error("Format respons bukan JSON:", text);
        throw new Error("Respons dari server tidak valid");
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.warn("Sinkronisasi dibatalkan karena timeout (jaringan lambat).");
      } else {
        console.error("Spreadsheet Sync Error:", error.message);
      }
      return null;
    }
  },

  async saveAttendance(records: any[]) {
    if (!isSpreadsheetConfigured) return false;

    try {
      // Menggunakan mode: 'no-cors' karena Google Apps Script melakukan redirect 302 
      // yang seringkali gagal pada preflight CORS browser saat mengirim JSON.
      // Catatan: Dengan no-cors, kita tidak bisa membaca respons body, 
      // tapi data tetap sampai ke server jika URL benar.
      await fetch(SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors', 
        headers: { 
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify({ action: 'saveAttendance', data: records })
      });
      return true;
    } catch (error) {
      console.error("Gagal mengirim data absen:", error);
      return false;
    }
  },

  async updateConfig(type: 'teachers' | 'schedule' | 'settings', data: any) {
    if (!isSpreadsheetConfigured) return false;

    try {
      await fetch(SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify({ action: `update_${type}`, data })
      });
      return true;
    } catch (error) {
      console.error(`Gagal update ${type}:`, error);
      return false;
    }
  }
};