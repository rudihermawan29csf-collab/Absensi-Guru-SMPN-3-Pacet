
export enum UserRole {
  ADMIN = 'ADMIN',
  GURU = 'GURU',
  KETUA_KELAS = 'KETUA_KELAS'
}

export enum AttendanceStatus {
  HADIR = 'Hadir',
  IZIN = 'Izin',
  SAKIT = 'Sakit',
  TIDAK_HADIR = 'Tidak Hadir'
}

export interface User {
  id: string;
  nama: string;
  role: UserRole;
  kelas?: string;
  email: string;
}

export interface Teacher {
  id: string; 
  nama: string;
  mapel: string[];
}

export interface AttendanceRecord {
  id: string;
  id_guru: string;
  nama_guru: string;
  mapel: string;
  id_kelas: string;
  tanggal: string;
  jam: string;
  status: AttendanceStatus;
  catatan?: string;
  is_admin_input?: boolean;
}

export interface ClassData {
  id: string;
  nama: string;
}

export interface ScheduleEntry {
  hari: string;
  jam: string;
  waktu: string;
  kegiatan: string;
  mapping: { [kelasId: string]: string };
}

export interface SchoolEvent {
  id: string;
  tanggal: string;
  nama: string;
  tipe: 'LIBUR' | 'KEGIATAN' | 'JAM_KHUSUS';
  affected_jams?: string[];
}

export interface AppSettings {
  tahunPelajaran: string;
  semester: 'Ganjil' | 'Genap';
  events: SchoolEvent[];
}
