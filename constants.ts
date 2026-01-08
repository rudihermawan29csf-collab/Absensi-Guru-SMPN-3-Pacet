
import { ClassData, Teacher, ScheduleEntry } from './types';

export const CLASSES: ClassData[] = [
  { id: '7A', nama: 'VII A' }, { id: '7B', nama: 'VII B' }, { id: '7C', nama: 'VII C' },
  { id: '8A', nama: 'VIII A' }, { id: '8B', nama: 'VIII B' }, { id: '8C', nama: 'VIII C' },
  { id: '9A', nama: 'IX A' }, { id: '9B', nama: 'IX B' }, { id: '9C', nama: 'IX C' }
];

export const CLASS_COLORS: Record<string, string> = {
  '7A': 'bg-blue-50 border-blue-200 text-blue-700',
  '7B': 'bg-sky-50 border-sky-200 text-sky-700',
  '7C': 'bg-cyan-50 border-cyan-200 text-cyan-700',
  '8A': 'bg-emerald-50 border-emerald-200 text-emerald-700',
  '8B': 'bg-teal-50 border-teal-200 text-teal-700',
  '8C': 'bg-green-50 border-green-200 text-green-700',
  '9A': 'bg-purple-50 border-purple-200 text-purple-700',
  '9B': 'bg-violet-50 border-violet-200 text-violet-700',
  '9C': 'bg-indigo-50 border-indigo-200 text-indigo-700',
};

export const TEACHERS: Teacher[] = [
  { id: 'SH', nama: 'Dra. Sri Hayati', mapel: ['Bahasa Indonesia'] },
  { id: 'BR', nama: 'Bakhtiar Rifai, SE', mapel: ['Ilmu Pengetahuan Sosial'] },
  { id: 'MH', nama: 'Moch. Husain Rifai Hamzah, S.Pd.', mapel: ['Penjas Orkes'] },
  { id: 'RH', nama: 'Rudi Hermawan, S.Pd.I', mapel: ['Pendidikan Agama Islam'] },
  { id: 'OD', nama: 'Okha Devi Anggraini, S.Pd.', mapel: ['Bimbingan Konseling'] },
  { id: 'EH', nama: 'Eka Hariyati, S. Pd.', mapel: ['PPKn'] },
  { id: 'MW', nama: 'Mikoe Wahyudi Putra, ST., S. Pd.', mapel: ['Bimbingan Konseling'] },
  { id: 'PU', nama: 'Purnadi, S. Pd.', mapel: ['Matematika'] },
  { id: 'MU', nama: 'Israfin Maria Ulfa, S.Pd', mapel: ['Ilmu Pengetahuan Sosial'] },
  { id: 'SB', nama: 'Syadam Budi Satrianto, S.Pd', mapel: ['Bahasa Jawa'] },
  { id: 'RB', nama: 'Rebby Dwi Prataopu, S.Si', mapel: ['Ilmu Pengetahuan Alam'] },
  { id: 'MY', nama: 'Mukhamad Yunus, S.Pd', mapel: ['Ilmu Pengetahuan Alam', 'Informatika'] },
  { id: 'FW', nama: 'Fahmi Wahyuni, S.Pd', mapel: ['Bahasa Indonesia'] },
  { id: 'FA', nama: 'Fakhita Madury, S.Sn', mapel: ['Seni (Seni Rupa)', 'Informatika'] },
  { id: 'RN', nama: 'Retno Nawangwulan, S. Pd.', mapel: ['Bahasa Inggris'] },
  { id: 'EM', nama: 'Emilia Kartika Sari, S.Pd', mapel: ['Matematika', 'Informatika'] },
  { id: 'AH', nama: 'Akhmad Hariadi, S.Pd', mapel: ['Bahasa Inggris', 'Informatika'] },
];

export const TEACHER_COLORS: Record<string, string> = {
  'SH': 'bg-rose-50 border-rose-200 text-rose-700',
  'BR': 'bg-blue-50 border-blue-200 text-blue-700',
  'MH': 'bg-emerald-50 border-emerald-200 text-emerald-700',
  'RH': 'bg-amber-50 border-amber-200 text-amber-700',
  'OD': 'bg-purple-50 border-purple-200 text-purple-700',
  'EH': 'bg-indigo-50 border-indigo-200 text-indigo-700',
  'MW': 'bg-cyan-50 border-cyan-200 text-cyan-700',
  'PU': 'bg-orange-50 border-orange-200 text-orange-700',
  'MU': 'bg-teal-50 border-teal-200 text-teal-700',
  'SB': 'bg-lime-50 border-lime-200 text-lime-700',
  'RB': 'bg-sky-50 border-sky-200 text-sky-700',
  'MY': 'bg-violet-50 border-violet-200 text-violet-700',
  'FW': 'bg-pink-50 border-pink-200 text-pink-700',
  'FA': 'bg-fuchsia-50 border-fuchsia-200 text-fuchsia-700',
  'RN': 'bg-slate-50 border-slate-200 text-slate-700',
  'EM': 'bg-yellow-50 border-yellow-200 text-yellow-700',
  'AH': 'bg-gray-50 border-gray-200 text-gray-700',
};

export const MAPEL_NAME_MAP: Record<string, string> = {
  'BIN': 'Bahasa Indonesia',
  'IPS': 'Ilmu Pengetahuan Sosial',
  'PJOK': 'Penjas Orkes',
  'PAI': 'Pendidikan Agama Islam',
  'BK': 'Bimbingan Konseling',
  'PKN': 'PPKn',
  'MAT': 'Matematika',
  'BAJA': 'Bahasa Jawa',
  'IPA': 'Ilmu Pengetahuan Alam',
  'INF': 'Informatika',
  'SENI': 'Seni (Seni Rupa)',
  'BIG': 'Bahasa Inggris'
};

export const NOTE_CHOICES = [
  "Hadir tepat waktu",
  "Memberi tugas via WA",
  "Tugas mandiri (LKS/Buku)",
  "Siswa di Perpustakaan",
  "Rapat Dinas/MGMP",
  "Terlambat masuk kelas",
  "Izin tanpa keterangan",
  "Sakit dengan surat"
];

export const PERIODS = ['0', '1', '2', '3', '4', '5', '6', '7', '8'];

export const SCHEDULE: ScheduleEntry[] = [
  { hari: 'SENIN', jam: '0', waktu: '06.30 - 06.45', kegiatan: 'Persiapan Upacara Bendera', mapping: {} },
  { hari: 'SENIN', jam: '1', waktu: '06.45 - 07.40', kegiatan: 'Upacara Bendera', mapping: {} },
  { hari: 'SENIN', jam: '2', waktu: '07.40 - 08.20', kegiatan: 'KBM', mapping: { '7A': 'SENI-FA', '7B': 'IPA-RB', '7C': 'BIN-FW', '8A': 'BIG-RN', '8B': 'IPA-MY', '8C': 'IPS-BR', '9A': 'INF-EM', '9B': 'IPS-MU', '9C': 'BIN-SH' } },
  { hari: 'SENIN', jam: '3', waktu: '08.20 - 09.00', kegiatan: 'KBM', mapping: { '7A': 'SENI-FA', '7B': 'IPA-RB', '7C': 'BIN-FW', '8A': 'BIG-RN', '8B': 'IPA-MY', '8C': 'IPS-BR', '9A': 'INF-EM', '9B': 'IPS-MU', '9C': 'BIN-SH' } },
  { hari: 'SENIN', jam: '4', waktu: '09.20 - 10.00', kegiatan: 'KBM', mapping: { '7A': 'PAI-RH', '7B': 'IPA-RB', '7C': 'BIN-FW', '8A': 'BAJA-SB', '8B': 'MAT-PU', '8C': 'BIG-RN', '9A': 'INF-EM', '9B': 'PJOK-MH', '9C': 'BIN-SH' } },
  { hari: 'SENIN', jam: '5', waktu: '10.00 - 10.40', kegiatan: 'KBM', mapping: { '7A': 'PAI-RH', '7B': 'IPS-MU', '7C': 'BIG-AH', '8A': 'BAJA-SB', '8B': 'MAT-PU', '8C': 'BIG-RN', '9A': 'SENI-FA', '9B': 'PJOK-MH', '9C': 'BK-OD' } },
  { hari: 'SENIN', jam: '6', waktu: '10.40 - 11.20', kegiatan: 'KBM', mapping: { '7A': 'PAI-RH', '7B': 'IPS-MU', '7C': 'BIG-AH', '8A': 'INF-MY', '8B': 'BIN-FW', '8C': 'MAT-PU', '9A': 'SENI-FA', '9B': 'PJOK-MH', '9C': 'PKN-EH' } },
  { hari: 'SENIN', jam: '7', waktu: '11.50 - 12.25', kegiatan: 'KBM', mapping: { '7A': 'IPS-MU', '7B': 'BAJA-SB', '7C': 'MAT-EM', '8A': 'INF-MY', '8B': 'BIN-FW', '8C': 'MAT-PU', '9A': 'BIG-RN', '9B': 'BIN-SH', '9C': 'PKN-EH' } },
  { hari: 'SENIN', jam: '8', waktu: '12.25 - 13.00', kegiatan: 'KBM', mapping: { '7A': 'IPS-MU', '7B': 'BAJA-SB', '7C': 'MAT-EM', '8A': 'INF-MY', '8B': 'BIN-FW', '8C': 'MAT-PU', '9A': 'BIG-RN', '9B': 'BIN-SH', '9C': 'PKN-EH' } },
  
  { hari: 'SELASA', jam: '0', waktu: '06.30 - 07.00', kegiatan: 'Apel Pagi / Ar-Rahman', mapping: {} },
  { hari: 'SELASA', jam: '1', waktu: '07.00 - 07.40', kegiatan: 'KBM', mapping: { '7A': 'PJOK-MH', '7B': 'PAI-RH', '7C': 'INF-FA', '8A': 'BIN-FW', '8B': 'BIG-RN', '8C': 'BAJA-SB', '9A': 'PKN-EH', '9B': 'MAT-PU', '9C': 'BIN-SH' } },
  { hari: 'SELASA', jam: '2', waktu: '07.40 - 08.20', kegiatan: 'KBM', mapping: { '7A': 'PJOK-MH', '7B': 'PAI-RH', '7C': 'INF-FA', '8A': 'BIN-FW', '8B': 'BIG-RN', '8C': 'BAJA-SB', '9A': 'PKN-EH', '9B': 'MAT-PU', '9C': 'BIN-SH' } },
  { hari: 'SELASA', jam: '3', waktu: '08.20 - 09.00', kegiatan: 'KBM', mapping: { '7A': 'PJOK-MH', '7B': 'PAI-RH', '7C': 'INF-FA', '8A': 'BIN-FW', '8B': 'BK-MW', '8C': 'INF-EM', '9A': 'PKN-EH', '9B': 'MAT-PU', '9C': 'BIN-SH' } },
  { hari: 'SELASA', jam: '4', waktu: '09.20 - 10.00', kegiatan: 'KBM', mapping: { '7A': 'INF-FA', '7B': 'PJOK-MH', '7C': 'IPS-MU', '8A': 'IPA-MY', '8B': 'BIN-FW', '8C': 'INF-EM', '9A': 'IPA-RB', '9B': 'BK-OD', '9C': 'BAJA-SB' } },
  { hari: 'SELASA', jam: '5', waktu: '10.00 - 10.40', kegiatan: 'KBM', mapping: { '7A': 'INF-FA', '7B': 'PJOK-MH', '7C': 'IPS-MU', '8A': 'IPA-MY', '8B': 'BIN-FW', '8C': 'INF-EM', '9A': 'IPA-RB', '9B': 'BIN-SH', '9C': 'BAJA-SB' } },
  { hari: 'SELASA', jam: '6', waktu: '10.40 - 11.20', kegiatan: 'KBM', mapping: { '7A': 'INF-FA', '7B': 'PJOK-MH', '7C': 'PAI-RH', '8A': 'IPA-MY', '8B': 'BIN-FW', '8C': 'PKN-EH', '9A': 'IPA-RB', '9B': 'BIN-SH', '9C': 'INF-AH' } },
  { hari: 'SELASA', jam: '7', waktu: '11.50 - 12.25', kegiatan: 'KBM', mapping: { '7A': 'IPA-RB', '7B': 'SENI-FA', '7C': 'PAI-RH', '8A': 'BIG-RN', '8B': 'IPS-BR', '8C': 'PKN-EH', '9A': 'IPS-MU', '9B': 'BAJA-SB', '9C': 'INF-AH' } },
  { hari: 'SELASA', jam: '8', waktu: '12.25 - 13.00', kegiatan: 'KBM', mapping: { '7A': 'IPA-RB', '7B': 'SENI-FA', '7C': 'PAI-RH', '8A': 'BIG-RN', '8B': 'IPS-BR', '8C': 'PKN-EH', '9A': 'IPS-MU', '9B': 'BAJA-SB', '9C': 'INF-AH' } },

  { hari: 'RABU', jam: '0', waktu: '06.30 - 07.00', kegiatan: 'Apel Pagi / Al-Waqi\'ah', mapping: {} },
  { hari: 'RABU', jam: '1', waktu: '07.00 - 07.40', kegiatan: 'KBM', mapping: { '7A': 'BIN-FW', '7B': 'INF-FA', '7C': 'PJOK-MH', '8A': 'PAI-RH', '8B': 'INF-MY', '8C': 'BIN-SH', '9A': 'MAT-PU', '9B': 'PKN-EH', '9C': 'IPA-RB' } },
  { hari: 'RABU', jam: '2', waktu: '07.40 - 08.20', kegiatan: 'KBM', mapping: { '7A': 'BIN-FW', '7B': 'INF-FA', '7C': 'PJOK-MH', '8A': 'PAI-RH', '8B': 'INF-MY', '8C': 'BIN-SH', '9A': 'MAT-PU', '9B': 'PKN-EH', '9C': 'IPA-RB' } },
  { hari: 'RABU', jam: '3', waktu: '08.20 - 09.00', kegiatan: 'KBM', mapping: { '7A': 'BIN-FW', '7B': 'INF-FA', '7C': 'PJOK-MH', '8A': 'PAI-RH', '8B': 'INF-MY', '8C': 'BIN-SH', '9A': 'MAT-PU', '9B': 'PKN-EH', '9C': 'IPA-RB' } },
  { hari: 'RABU', jam: '4', waktu: '09.20 - 10.00', kegiatan: 'KBM', mapping: { '7A': 'IPA-RB', '7B': 'PKN-EH', '7C': 'BIN-FW', '8A': 'PJOK-MH', '8B': 'SENI-FA', '8C': 'BIG-RN', '9A': 'IPS-MU', '9B': 'INF-AH', '9C': 'MAT-PU' } },
  { hari: 'RABU', jam: '5', waktu: '10.00 - 10.40', kegiatan: 'KBM', mapping: { '7A': 'IPA-RB', '7B': 'PKN-EH', '7C': 'BIN-FW', '8A': 'PJOK-MH', '8B': 'SENI-FA', '8C': 'BIG-RN', '9A': 'IPS-MU', '9B': 'INF-AH', '9C': 'MAT-PU' } },
  { hari: 'RABU', jam: '6', waktu: '10.40 - 11.20', kegiatan: 'KBM', mapping: { '7A': 'IPA-RB', '7B': 'PKN-EH', '7C': 'BIN-FW', '8A': 'PJOK-MH', '8B': 'PAI-RH', '8C': 'IPA-MY', '9A': 'BIN-SH', '9B': 'INF-AH', '9C': 'MAT-PU' } },
  { hari: 'RABU', jam: '7', waktu: '11.50 - 12.25', kegiatan: 'KBM', mapping: { '7A': 'BIG-AH', '7B': 'IPA-RB', '7C': 'SENI-FA', '8A': 'IPS-BR', '8B': 'PAI-RH', '8C': 'IPA-MY', '9A': 'BIN-SH', '9B': 'IPS-MU', '9C': 'MAT-PU' } },
  { hari: 'RABU', jam: '8', waktu: '12.25 - 13.00', kegiatan: 'KBM', mapping: { '7A': 'BIG-AH', '7B': 'IPA-RB', '7C': 'SENI-FA', '8A': 'IPS-BR', '8B': 'PAI-RH', '8C': 'IPA-MY', '9A': 'BIN-SH', '9B': 'IPS-MU', '9C': 'MAT-PU' } },

  { hari: 'KAMIS', jam: '0', waktu: '06.30 - 07.00', kegiatan: 'Apel Pagi / Istighotsah', mapping: {} },
  { hari: 'KAMIS', jam: '1', waktu: '07.00 - 07.40', kegiatan: 'KBM', mapping: { '7A': 'BIN-FW', '7B': 'BK-OD', '7C': 'MAT-EM', '8A': 'IPA-MY', '8B': 'IPS-BR', '8C': 'PAI-RH', '9A': 'PJOK-MH', '9B': 'IPA-RB', '9C': 'BIG-RN' } },
  { hari: 'KAMIS', jam: '2', waktu: '07.40 - 08.20', kegiatan: 'KBM', mapping: { '7A': 'BIN-FW', '7B': 'BIG-AH', '7C': 'MAT-EM', '8A': 'IPA-MY', '8B': 'IPS-BR', '8C': 'PAI-RH', '9A': 'PJOK-MH', '9B': 'IPA-RB', '9C': 'BIG-RN' } },
  { hari: 'KAMIS', jam: '3', waktu: '08.20 - 09.00', kegiatan: 'KBM', mapping: { '7A': 'BIN-FW', '7B': 'BIG-AH', '7C': 'MAT-EM', '8A': 'PKN-EH', '8B': 'IPA-MY', '8C': 'PAI-RH', '9A': 'PJOK-MH', '9B': 'MAT-PU', '9C': 'IPA-RB' } },
  { hari: 'KAMIS', jam: '4', waktu: '09.20 - 10.00', kegiatan: 'KBM', mapping: { '7A': 'MAT-EM', '7B': 'BIN-FW', '7C': 'IPS-MU', '8A': 'PKN-EH', '8B': 'IPA-MY', '8C': 'PJOK-MH', '9A': 'PAI-RH', '9B': 'MAT-PU', '9C': 'IPA-RB' } },
  { hari: 'KAMIS', jam: '5', waktu: '10.00 - 10.40', kegiatan: 'KBM', mapping: { '7A': 'MAT-EM', '7B': 'BIN-FW', '7C': 'IPS-MU', '8A': 'PKN-EH', '8B': 'IPA-MY', '8C': 'PJOK-MH', '9A': 'PAI-RH', '9B': 'BIG-RN', '9C': 'SENI-FA' } },
  { hari: 'KAMIS', jam: '6', waktu: '10.40 - 11.20', kegiatan: 'KBM', mapping: { '7A': 'MAT-EM', '7B': 'BIN-FW', '7C': 'PKN-EH', '8A': 'BK-MW', '8B': 'MAT-PU', '8C': 'PJOK-MH', '9A': 'PAI-RH', '9B': 'BIG-RN', '9C': 'SENI-FA' } },
  { hari: 'KAMIS', jam: '7', waktu: '11.50 - 12.25', kegiatan: 'KBM', mapping: { '7A': 'BIG-AH', '7B': 'MAT-EM', '7C': 'PKN-EH', '8A': 'SENI-FA', '8B': 'MAT-PU', '8C': 'IPS-BR', '9A': 'IPA-RB', '9B': 'BIN-SH', '9C': 'BIG-RN' } },
  { hari: 'KAMIS', jam: '8', waktu: '12.25 - 13.00', kegiatan: 'KBM', mapping: { '7A': 'BIG-AH', '7B': 'MAT-EM', '7C': 'PKN-EH', '8A': 'SENI-FA', '8B': 'MAT-PU', '8C': 'IPS-BR', '9A': 'IPA-RB', '9B': 'BIN-SH', '9C': 'BIG-RN' } },

  { hari: 'JUM\'AT', jam: '0', waktu: '06.30 - 07.00', kegiatan: 'Apel Pagi / Yasin', mapping: {} },
  { hari: 'JUM\'AT', jam: '1', waktu: '07.00 - 07.40', kegiatan: 'KBM', mapping: { '7A': 'MAT-EM', '7B': 'IPS-MU', '7C': 'BIG-AH', '8A': 'IPS-BR', '8B': 'PKN-EH', '8C': 'IPA-MY', '9A': 'BAJA-SB', '9B': 'BIG-RN', '9C': 'PJOK-MH' } },
  { hari: 'JUM\'AT', jam: '2', waktu: '07.40 - 08.20', kegiatan: 'KBM', mapping: { '7A': 'MAT-EM', '7B': 'IPS-MU', '7C': 'BIG-AH', '8A': 'IPS-BR', '8B': 'PKN-EH', '8C': 'IPA-MY', '9A': 'BAJA-SB', '9B': 'BIG-RN', '9C': 'PJOK-MH' } },
  { hari: 'JUM\'AT', jam: '3', waktu: '08.20 - 09.00', kegiatan: 'KBM', mapping: { '7A': 'BAJA-SB', '7B': 'BIN-FW', '7C': 'BK-OD', '8A': 'MAT-EM', '8B': 'PKN-EH', '8C': 'BK-MW', '9A': 'BIN-SH', '9B': 'PAI-RH', '9C': 'PJOK-MH' } },
  { hari: 'JUM\'AT', jam: '4', waktu: '09.20 - 10.00', kegiatan: 'KBM', mapping: { '7A': 'BAJA-SB', '7B': 'BIN-FW', '7C': 'IPA-MY', '8A': 'MAT-EM', '8B': 'BIG-RN', '8C': 'MAT-PU', '9A': 'BIN-SH', '9B': 'PAI-RH', '9C': 'IPS-MU' } },
  { hari: 'JUM\'AT', jam: '5', waktu: '10.00 - 10.40', kegiatan: 'KBM', mapping: { '7A': 'BK-OD', '7B': 'BIN-FW', '7C': 'IPA-MY', '8A': 'MAT-EM', '8B': 'BIG-RN', '8C': 'MAT-PU', '9A': 'BIN-SH', '9B': 'PAI-RH', '9C': 'IPS-MU' } },

  { hari: 'SABTU', jam: '0', waktu: '06.30 - 07.00', kegiatan: 'Apel Pagi / Asmaul Husna', mapping: {} },
  { hari: 'SABTU', jam: '1', waktu: '07.00 - 07.40', kegiatan: 'Sabtu Sehat Jiwa Raga', mapping: {} },
  { hari: 'SABTU', jam: '2', waktu: '07.40 - 08.20', kegiatan: 'KBM', mapping: { '7A': 'PKN-EH', '7B': 'BIG-AH', '7C': 'BAJA-SB', '8A': 'MAT-EM', '8B': 'PJOK-MH', '8C': 'SENI-FA', '9A': 'MAT-PU', '9B': 'IPA-RB', '9C': 'IPS-MU' } },
  { hari: 'SABTU', jam: '3', waktu: '08.20 - 09.00', kegiatan: 'KBM', mapping: { '7A': 'PKN-EH', '7B': 'BIG-AH', '7C': 'BAJA-SB', '8A': 'MAT-EM', '8B': 'PJOK-MH', '8C': 'SENI-FA', '9A': 'MAT-PU', '9B': 'IPA-RB', '9C': 'IPS-MU' } },
  { hari: 'SABTU', jam: '4', waktu: '09.20 - 10.00', kegiatan: 'KBM', mapping: { '7A': 'PKN-EH', '7B': 'MAT-EM', '7C': 'IPA-MY', '8A': 'BIN-FW', '8B': 'PJOK-MH', '8C': 'BIN-SH', '9A': 'BK-OD', '9B': 'IPA-RB', '9C': 'PAI-RH' } },
  { hari: 'SABTU', jam: '5', waktu: '10.00 - 10.40', kegiatan: 'KBM', mapping: { '7A': 'IPS-MU', '7B': 'MAT-EM', '7C': 'IPA-MY', '8A': 'BIN-FW', '8B': 'BAJA-SB', '8C': 'BIN-SH', '9A': 'BIG-RN', '9B': 'SENI-FA', '9C': 'PAI-RH' } },
  { hari: 'SABTU', jam: '6', waktu: '10.40 - 11.20', kegiatan: 'KBM', mapping: { '7A': 'IPS-MU', '7B': 'MAT-EM', '7C': 'IPA-MY', '8A': 'BIN-FW', '8B': 'BAJA-SB', '8C': 'BIN-SH', '9A': 'BIG-RN', '9B': 'SENI-FA', '9C': 'PAI-RH' } },
];
