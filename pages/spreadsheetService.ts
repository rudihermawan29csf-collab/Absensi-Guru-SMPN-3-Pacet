
// URL Web App Google Apps Script
const SPREADSHEET_WEB_APP_URL = "https://script.google.com/macros/s/AKfycbxN_4KT66MoEN_42sJSTq2lhx_aRM4Xm5Z9C50ZH0tvkqEoM8_lshsxMnsdfCs82UN6/exec";

// Fix: Cast SPREADSHEET_WEB_APP_URL to string to avoid literal comparison error
export const isSpreadsheetConfigured = (SPREADSHEET_WEB_APP_URL as string) !== "" && !SPREADSHEET_WEB_APP_URL.includes("ISI_DENGAN");

export const spreadsheetService = {
  async getAllData() {
    if (!isSpreadsheetConfigured) return null;
    try {
      // Menambahkan timestamp untuk mencegah caching browser
      const response = await fetch(`${SPREADSHEET_WEB_APP_URL}?t=${Date.now()}`);
      if (!response.ok) throw new Error("Network response was not ok");
      return await response.json();
    } catch (error) {
      console.error("Gagal mengambil data Spreadsheet:", error);
      return null;
    }
  },

  async saveRecord(table: string, data: any) {
    if (!isSpreadsheetConfigured) return;
    try {
      const response = await fetch(SPREADSHEET_WEB_APP_URL, {
        method: 'POST',
        mode: 'no-cors', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'insertOrUpdate',
          table: table,
          data: data
        })
      });
      return true;
    } catch (error) {
      console.error("Gagal menyimpan ke Spreadsheet:", error);
      return false;
    }
  }
};
