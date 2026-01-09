
import React, { useState, useMemo, useRef } from 'react';
import { AttendanceRecord, AttendanceStatus, Teacher, AppSettings, SchoolEvent, ScheduleEntry } from './types';
import { CLASSES, CLASS_COLORS, NOTE_CHOICES, MAPEL_NAME_MAP, TEACHERS as INITIAL_TEACHERS, SCHEDULE as INITIAL_SCHEDULE } from '../constants';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  Legend, Cell
} from 'recharts';
import { 
  Users, LayoutGrid, Edit2, Trash2, Calendar, 
  Activity, Settings, ShieldCheck, BookOpen, Plus, Download, Upload, Trash, X, 
  AlertTriangle, Save, CheckCircle2, Clock, Check, RefreshCw, Sparkles, Loader2,
  Database, Globe, Smartphone, Cloud, CloudOff
} from 'lucide-react';
// Fix: Use correct import from @google/genai and follow initialization guidelines
import {GoogleGenAI} from "@google/genai";
import { supabase } from '../supabase';

interface AdminDashboardProps {
  data: AttendanceRecord[];
  teachers: Teacher[];
  setTeachers: (val: Teacher[] | ((prev: Teacher[]) => Teacher[])) => void;
  schedule: ScheduleEntry[];
  setSchedule: (val: ScheduleEntry[] | ((prev: ScheduleEntry[]) => ScheduleEntry[])) => void;
  settings: AppSettings;
  setSettings: (val: AppSettings | ((prev: AppSettings) => AppSettings)) => void;
  onSaveAttendance: (records: AttendanceRecord[]) => void;
}

type AdminTab = 'overview' | 'monitoring' | 'permits' | 'agenda' | 'teachers' | 'schedule' | 'settings';

const AdminDashboard: React.FC<AdminDashboardProps> = ({ 
  data, teachers, setTeachers, schedule, setSchedule, settings, setSettings, onSaveAttendance 
}) => {
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [timeFilter, setTimeFilter] = useState<'harian' | 'mingguan' | 'bulanan'>('harian');
  const [isRestoring, setIsRestoring] = useState(false);
  const [aiInsight, setAiInsight] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const isLocalMode = (supabase as any).isLocal;

  const [permitForm, setPermitForm] = useState({ 
    id_guru: '', 
    status: AttendanceStatus.IZIN, 
    tanggal: new Date().toISOString().split('T')[0], 
    jam: [] as string[], 
    catatan: '' 
  });
  
  const [eventForm, setEventForm] = useState<Partial<SchoolEvent>>({ 
    nama: '', 
    tipe: 'KEGIATAN', 
    tanggal: new Date().toISOString().split('T')[0],
    affected_jams: []
  });

  const [teacherForm, setTeacherForm] = useState<Partial<Teacher>>({ id: '', nama: '', mapel: [] });
  const [isTeacherModalOpen, setIsTeacherModalOpen] = useState(false);
  const [editingTeacherId, setEditingTeacherId] = useState<string | null>(null);
  
  const todayStr = new Date().toISOString().split('T')[0];
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getDayFromDate = (dateStr: string) => {
    const dayNames = ['MINGGU', 'SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUM\'AT', 'SABTU'];
    return dayNames[new Date(dateStr).getDay()];
  };

  const availableJamsForTeacher = useMemo(() => {
    if (!permitForm.id_guru || !permitForm.tanggal || !Array.isArray(schedule)) return [];
    const day = getDayFromDate(permitForm.tanggal);
    return schedule
      .filter(s => s.hari === day && s.kegiatan === 'KBM')
      .filter(s => s.mapping && Object.values(s.mapping).some(val => typeof val === 'string' && val.includes(permitForm.id_guru)))
      .map(s => s.jam);
  }, [permitForm.id_guru, permitForm.tanggal, schedule]);

  const allJamsOnDay = useMemo(() => {
    if (!eventForm.tanggal || !Array.isArray(schedule)) return [];
    const day = getDayFromDate(eventForm.tanggal);
    return schedule.filter(s => s.hari === day && s.kegiatan === 'KBM').map(s => s.jam);
  }, [eventForm.tanggal, schedule]);

  // Fix: Correct usage of GoogleGenAI SDK including initialization and property access
  const handleGenerateAiInsight = async () => {
    setIsAnalyzing(true);
    try {
      const ai = new GoogleGenAI({apiKey: process.env.API_KEY});
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Berikan ringkasan eksekutif profesional dalam Bahasa Indonesia mengenai data absensi SMPN 3 Pacet hari ini (${todayStr}). Statistik: Hadir ${stats.hadir} jam, Izin/Sakit ${stats.izin} jam, Tanpa Keterangan ${stats.alpha} jam.`,
      });
      // Fix: response.text is a property, not a method
      setAiInsight(response.text || 'Gagal memperoleh analisa cerdas.');
    } catch (err) {
      setAiInsight('Layanan analisa AI sedang tidak tersedia.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSavePermit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!permitForm.id_guru || !permitForm.jam.length) return;

    const teacher = (teachers || []).find(t => t.id === permitForm.id_guru);
    const dayName = getDayFromDate(permitForm.tanggal);

    const newRecords: AttendanceRecord[] = permitForm.jam.map(j => {
      const sch = (schedule || []).find(s => s.hari === dayName && s.jam === j);
      let mapel = 'Tugas Luar';
      let id_kelas = 'SEMUA';
      if (sch && sch.mapping) {
        const classEntry = Object.entries(sch.mapping).find(([_, val]) => typeof val === 'string' && val.includes(permitForm.id_guru));
        if (classEntry) {
          id_kelas = classEntry[0];
          const valStr = classEntry[1] as string;
          mapel = MAPEL_NAME_MAP[valStr.split('-')[0]] || valStr.split('-')[0];
        }
      }
      return {
        id: `admin-${permitForm.tanggal}-${permitForm.id_guru}-${j}`,
        id_guru: permitForm.id_guru,
        nama_guru: teacher?.nama || permitForm.id_guru,
        mapel,
        id_kelas,
        tanggal: permitForm.tanggal,
        jam: j,
        status: permitForm.status,
        catatan: permitForm.catatan,
        is_admin_input: true
      };
    });

    onSaveAttendance(newRecords);
    alert('Status izin guru berhasil diterapkan.');
    setPermitForm({ ...permitForm, jam: [], catatan: '' });
  };

  const handleAddEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventForm.nama || !eventForm.tanggal) return;
    const newEvent: SchoolEvent = {
      id: Date.now().toString(),
      nama: eventForm.nama,
      tipe: eventForm.tipe as any,
      tanggal: eventForm.tanggal as string,
      affected_jams: eventForm.tipe === 'JAM_KHUSUS' ? eventForm.affected_jams : []
    };
    setSettings(prev => ({ ...prev, events: [...(prev.events || []), newEvent] }));
    setEventForm({ nama: '', tipe: 'KEGIATAN', tanggal: todayStr, affected_jams: [] });
    alert('Agenda berhasil disimpan.');
  };

  const handleSaveTeacher = (e: React.FormEvent) => {
    e.preventDefault();
    if (!teacherForm.id || !teacherForm.nama) return;
    const teacherData = teacherForm as Teacher;
    setTeachers(prev => {
      if (editingTeacherId) return prev.map(t => t.id === editingTeacherId ? teacherData : t);
      return [...prev, teacherData];
    });
    setIsTeacherModalOpen(false);
    setTeacherForm({ id: '', nama: '', mapel: [] });
    setEditingTeacherId(null);
  };

  const handleRestoreDefaults = async () => {
    if (!confirm('Pindahkan data bawaan sekolah ke Cloud?')) return;
    setIsRestoring(true);
    try {
      setTeachers(INITIAL_TEACHERS);
      setSchedule(INITIAL_SCHEDULE);
      alert('Data bawaan berhasil dimuat ulang.');
    } catch (err) {
      alert('Gagal memulihkan data.');
    } finally {
      setIsRestoring(false);
    }
  };

  const filteredData = useMemo(() => {
    if (!Array.isArray(data)) return [];
    return data.filter(r => timeFilter === 'harian' ? r.tanggal === todayStr : true);
  }, [data, timeFilter, todayStr]);

  const stats = {
    hadir: filteredData.filter(r => r.status === AttendanceStatus.HADIR).length,
    izin: filteredData.filter(r => r.status === AttendanceStatus.IZIN || r.status === AttendanceStatus.SAKIT).length,
    alpha: filteredData.filter(r => r.status === AttendanceStatus.TIDAK_HADIR).length,
  };

  return (
    <div className="space-y-6 pb-20">
      <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
           <h1 className="text-2xl font-black text-slate-800 tracking-tight italic">ADMIN <span className="text-indigo-600">DASHBOARD</span></h1>
           <p className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.2em]">Sistem Integrasi Absensi Presensi Guru</p>
        </div>
        
        <div className="bg-white p-1 rounded-2xl border border-slate-200 shadow-sm flex overflow-x-auto no-scrollbar gap-1">
           {[
             {id: 'overview', icon: <LayoutGrid size={16}/>, label: 'Ikhtisar'},
             {id: 'monitoring', icon: <Activity size={16}/>, label: 'Live Monitor'},
             {id: 'permits', icon: <ShieldCheck size={16}/>, label: 'Izin Guru'},
             {id: 'agenda', icon: <Calendar size={16}/>, label: 'Agenda'},
             {id: 'teachers', icon: <Users size={16}/>, label: 'Database Guru'},
             {id: 'schedule', icon: <BookOpen size={16}/>, label: 'Jadwal'},
             {id: 'settings', icon: <Settings size={16}/>, label: 'Sistem'}
           ].map(tab => (
             <button 
               key={tab.id} 
               onClick={() => setActiveTab(tab.id as any)} 
               className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all shrink-0 ${activeTab === tab.id ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50'}`}
             >
               {tab.icon} {tab.label}
             </button>
           ))}
        </div>
      </header>

      {/* OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-6 animate-in fade-in">
           <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { label: 'Hadir Hari Ini', val: stats.hadir, color: 'emerald', icon: <CheckCircle2 size={24}/> },
                { label: 'Izin & Sakit', val: stats.izin, color: 'indigo', icon: <ShieldCheck size={24}/> },
                { label: 'Alpha (Tanpa Ket)', val: stats.alpha, color: 'rose', icon: <AlertTriangle size={24}/> }
              ].map((s, i) => (
                <div key={i} className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-xl flex items-center gap-5">
                   <div className={`p-4 rounded-2xl bg-${s.color}-50 text-${s.color}-600`}>{s.icon}</div>
                   <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{s.label}</p>
                      <h3 className="text-3xl font-black text-slate-800">{s.val} <span className="text-xs font-normal text-slate-400">Jam</span></h3>
                   </div>
                </div>
              ))}
           </div>
           
           <div className="bg-indigo-900 rounded-[40px] p-8 lg:p-10 text-white shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 p-12 opacity-10"><Sparkles size={160} /></div>
              <div className="relative z-10">
                 <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                       <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-md"><Sparkles size={20} className="text-indigo-200" /></div>
                       <h3 className="text-sm font-black uppercase italic tracking-widest leading-none">SIAP AI Insights</h3>
                    </div>
                    <button onClick={handleGenerateAiInsight} disabled={isAnalyzing} className="bg-white text-indigo-900 px-6 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-50 transition-all flex items-center gap-2">
                       {isAnalyzing ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                       {aiInsight ? 'Update Ringkasan' : 'Hasilkan Analisa'}
                    </button>
                 </div>
                 {aiInsight ? (
                    <div className="bg-white/10 backdrop-blur-md rounded-3xl p-6 border border-white/10">
                       <p className="text-sm font-medium leading-relaxed italic">"{aiInsight}"</p>
                    </div>
                 ) : (
                    <div className="py-10 text-center border-2 border-dashed border-white/20 rounded-3xl">
                       <p className="text-indigo-200 font-bold text-xs uppercase tracking-widest italic">{isAnalyzing ? 'Menghubungkan ke Gemini AI...' : 'Belum ada analisa untuk hari ini.'}</p>
                    </div>
                 )}
              </div>
           </div>
        </div>
      )}

      {/* MONITORING KELAS */}
      {activeTab === 'monitoring' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 animate-in fade-in">
           {CLASSES.map(c => {
              const classRecs = data.filter(r => r.tanggal === todayStr && r.id_kelas === c.id).sort((a, b) => parseInt(a.jam) - parseInt(b.jam));
              const lastRec = classRecs[classRecs.length - 1];
              return (
                <div key={c.id} className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-xl flex flex-col justify-between hover:border-indigo-200 transition-all group">
                   <div className="flex justify-between items-start mb-6">
                      <div className={`px-4 py-1.5 rounded-xl font-black text-[10px] uppercase ${CLASS_COLORS[c.id]}`}>KELAS {c.nama}</div>
                      <div className={`w-3 h-3 rounded-full ${lastRec ? (lastRec.status === AttendanceStatus.HADIR ? 'bg-emerald-500' : 'bg-rose-500') : 'bg-slate-200 animate-pulse'}`}></div>
                   </div>
                   <h4 className="text-sm font-black text-slate-800 uppercase tracking-tight truncate">{lastRec?.nama_guru || 'Jadwal Kosong'}</h4>
                   <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{lastRec?.mapel || '-'}</p>
                </div>
              );
           })}
        </div>
      )}

      {/* SISTEM & SETTINGS */}
      {activeTab === 'settings' && (
        <div className="max-w-2xl mx-auto space-y-8 animate-in slide-in-from-bottom-6">
           <div className={`p-8 rounded-[40px] border flex items-start gap-6 shadow-xl ${isLocalMode ? 'bg-amber-50 border-amber-200' : 'bg-emerald-50 border-emerald-200'}`}>
              <div className={`p-4 rounded-2xl shadow-sm ${isLocalMode ? 'bg-white text-amber-600' : 'bg-white text-emerald-600'}`}>
                 {isLocalMode ? <CloudOff size={32}/> : <Cloud size={32}/>}
              </div>
              <div>
                 <h4 className={`font-black text-xs uppercase italic mb-2 tracking-widest ${isLocalMode ? 'text-amber-800' : 'text-emerald-800'}`}>
                   Status Koneksi: {isLocalMode ? 'Mode Lokal (Penyimpanan HP)' : 'Cloud Aktif (Multi-Perangkat)'}
                 </h4>
                 <p className={`text-[11px] font-bold uppercase tracking-tight leading-relaxed mb-4 ${isLocalMode ? 'text-amber-600' : 'text-emerald-600'}`}>
                   {isLocalMode 
                     ? "Peringatan: Data hanya tersimpan di perangkat ini. Jika Anda membuka web ini di HP lain, data akan kosong. Hubungkan API Key di Environment Variables untuk sinkronisasi antar-perangkat." 
                     : "Selamat! Aplikasi sudah terhubung ke Cloud. Data Anda tersimpan di server dan dapat diakses dari perangkat mana saja selama menggunakan akun yang sama."}
                 </p>
                 <div className="flex gap-3">
                    <div className="flex items-center gap-2 bg-white/50 px-3 py-1.5 rounded-xl border border-current/10">
                       <Smartphone size={14}/>
                       <span className="text-[9px] font-black uppercase">Device ID: Browser Storage</span>
                    </div>
                    <div className="flex items-center gap-2 bg-white/50 px-3 py-1.5 rounded-xl border border-current/10">
                       <Globe size={14}/>
                       <span className="text-[9px] font-black uppercase">Server: ohwhmcygyonwkfszcqgl</span>
                    </div>
                 </div>
              </div>
           </div>

           <div className="bg-white p-10 rounded-[40px] border border-slate-100 shadow-2xl">
              <h3 className="text-base font-black text-slate-800 uppercase italic mb-8 flex items-center gap-4"><Settings size={24} className="text-indigo-600"/> Konfigurasi Sekolah</h3>
              <div className="space-y-6">
                 <div>
                    <label className="text-[10px] font-black text-slate-500 mb-2 block uppercase tracking-widest">Tahun Pelajaran</label>
                    <input className="w-full bg-slate-50 border border-slate-100 px-5 py-4 rounded-2xl text-sm font-black outline-none focus:ring-2 focus:ring-indigo-500/20" value={settings.tahunPelajaran} onChange={e => setSettings(prev => ({...prev, tahunPelajaran: e.target.value}))}/>
                 </div>
                 <div>
                    <label className="text-[10px] font-black text-slate-500 mb-2 block uppercase tracking-widest">Semester</label>
                    <div className="grid grid-cols-2 gap-3">
                       {['Ganjil', 'Genap'].map(s => (
                          <button key={s} onClick={() => setSettings(prev => ({...prev, semester: s as any}))} className={`py-4 rounded-2xl text-xs font-black uppercase border transition-all ${settings.semester === s ? 'bg-indigo-600 text-white border-indigo-700 shadow-lg' : 'bg-slate-50 text-slate-400 border-slate-100 hover:text-indigo-500'}`}>{s}</button>
                       ))}
                    </div>
                 </div>
              </div>
           </div>

           <div className="bg-white p-10 rounded-[40px] border border-slate-100 shadow-2xl flex items-start gap-5">
              <div className="p-4 bg-indigo-50 text-indigo-600 rounded-2xl"><RefreshCw size={24} className={isRestoring ? 'animate-spin' : ''}/></div>
              <div>
                 <h4 className="text-slate-800 font-black text-xs uppercase italic mb-2 tracking-widest">Unggah Jadwal Master</h4>
                 <p className="text-[11px] text-slate-500 mb-5 font-bold uppercase leading-relaxed">Gunakan fitur ini untuk mengisi data guru dan jadwal default sekolah ke dalam penyimpanan Cloud atau Lokal.</p>
                 <button onClick={handleRestoreDefaults} disabled={isRestoring} className="bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest px-8 py-4 rounded-2xl hover:bg-indigo-700 shadow-xl transition-all">PULIHKAN JADWAL BAWAAN</button>
              </div>
           </div>
        </div>
      )}

      {/* MODAL GURU */}
      {isTeacherModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm">
           <div className="w-full max-w-md bg-white rounded-[40px] shadow-2xl p-10 animate-in zoom-in-95">
              <div className="flex items-center justify-between mb-8 border-b border-slate-50 pb-6">
                <h3 className="text-xl font-black text-slate-800 uppercase italic">Profil Guru</h3>
                <button onClick={() => setIsTeacherModalOpen(false)} className="text-slate-300 hover:text-slate-500 transition-colors"><X size={28}/></button>
              </div>
              <form onSubmit={handleSaveTeacher} className="space-y-6">
                 <div>
                    <label className="text-[10px] font-black text-slate-500 block mb-2 uppercase tracking-widest">ID Guru</label>
                    <input required className="w-full bg-slate-50 border border-slate-100 px-5 py-4 rounded-2xl text-sm font-black uppercase outline-none" value={teacherForm.id} onChange={e => setTeacherForm({...teacherForm, id: e.target.value.toUpperCase()})} disabled={!!editingTeacherId}/>
                 </div>
                 <div>
                    <label className="text-[10px] font-black text-slate-500 block mb-2 uppercase tracking-widest">Nama Lengkap</label>
                    <input required className="w-full bg-slate-50 border border-slate-100 px-5 py-4 rounded-2xl text-sm font-black italic outline-none" value={teacherForm.nama} onChange={e => setTeacherForm({...teacherForm, nama: e.target.value})}/>
                 </div>
                 <button type="submit" className="w-full py-4 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase shadow-xl tracking-widest hover:bg-indigo-700 transition-all">Simpan Perubahan</button>
              </form>
           </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
