
import React, { useState, useMemo } from 'react';
import { AttendanceRecord, AttendanceStatus, Teacher, AppSettings, SchoolEvent, ScheduleEntry } from './types';
import { CLASSES, CLASS_COLORS, MAPEL_NAME_MAP, TEACHERS as INITIAL_TEACHERS, SCHEDULE as INITIAL_SCHEDULE, TEACHER_COLORS, PERIODS } from '../constants';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell
} from 'recharts';
import { 
  Users, LayoutGrid, Edit2, Trash2, Calendar, 
  Activity, Settings, ShieldCheck, BookOpen, Plus, Trash, X, 
  AlertTriangle, Save, CheckCircle2, RefreshCw, Sparkles, Loader2,
  Wifi, WifiOff, Coffee, Clock, Filter, BarChart3, ChevronRight,
  TrendingUp, ArrowUpRight, ArrowDownRight, Key
} from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
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
type TimeFilter = 'harian' | 'mingguan' | 'bulanan' | 'semester';

// Fix: Removed redundant interface AIStudio and declare global { Window } 
// as it conflicts with pre-existing global declarations in the environment.

const AdminDashboard: React.FC<AdminDashboardProps> = ({ 
  data, teachers, setTeachers, schedule, setSchedule, settings, setSettings, onSaveAttendance 
}) => {
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('harian');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1 < 10 ? `0${new Date().getMonth() + 1}` : `${new Date().getMonth() + 1}`);
  const [isRestoring, setIsRestoring] = useState(false);
  const [aiInsight, setAiInsight] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  // Forms States
  const [teacherForm, setTeacherForm] = useState<Partial<Teacher>>({ id: '', nama: '', mapel: [] });
  const [isTeacherModalOpen, setIsTeacherModalOpen] = useState(false);
  const [editingTeacherId, setEditingTeacherId] = useState<string | null>(null);

  // Agenda Form State
  const [newEvent, setNewEvent] = useState<Partial<SchoolEvent>>({ 
    tanggal: new Date().toISOString().split('T')[0], 
    nama: '', 
    tipe: 'LIBUR',
    affected_jams: []
  });

  // Permit Form State
  const [permitForm, setPermitForm] = useState({
    date: new Date().toISOString().split('T')[0],
    teacherId: '',
    status: AttendanceStatus.IZIN,
    note: 'Izin keperluan keluarga',
    type: 'FULL_DAY', // FULL_DAY atau SPECIFIC_HOURS
    affected_jams: [] as string[]
  });

  const isLocalMode = (supabase as any).isLocal;
  const todayStr = new Date().toISOString().split('T')[0];
  const hasKey = !!process.env.API_KEY;

  const handleOpenKeySelector = async () => {
    try {
      // Use type assertion to access aistudio safely without global declaration conflict
      const aiStudio = (window as any).aistudio;
      if (aiStudio && typeof aiStudio.openSelectKey === 'function') {
        await aiStudio.openSelectKey();
        window.location.reload();
      } else {
        alert('Fitur pemilihan kunci tidak tersedia di lingkungan ini.');
      }
    } catch (err) {
      console.error('Key selector error:', err);
    }
  };

  // Helper: Get periods for specific date
  const getPeriodsForDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const dayNames = ['MINGGU', 'SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUM\'AT', 'SABTU'];
    const targetDay = dayNames[d.getDay()];
    return schedule.filter(s => s.hari === targetDay).map(s => s.jam);
  };

  // Logic Filtering Data untuk Ikhtisar
  const filteredRecords = useMemo(() => {
    const now = new Date();
    return data.filter(record => {
      const recordDate = new Date(record.tanggal);
      if (timeFilter === 'harian') return record.tanggal === todayStr;
      if (timeFilter === 'mingguan') return (now.getTime() - recordDate.getTime()) <= 7 * 24 * 60 * 60 * 1000;
      if (timeFilter === 'bulanan') {
        const monthStr = recordDate.getMonth() + 1 < 10 ? `0${recordDate.getMonth() + 1}` : `${recordDate.getMonth() + 1}`;
        return monthStr === selectedMonth && recordDate.getFullYear() === now.getFullYear();
      }
      return true; // Semester
    });
  }, [data, timeFilter, selectedMonth, todayStr]);

  const stats = {
    hadir: filteredRecords.filter(r => r.status === AttendanceStatus.HADIR).length,
    izin: filteredRecords.filter(r => r.status === AttendanceStatus.IZIN || r.status === AttendanceStatus.SAKIT).length,
    alpha: filteredRecords.filter(r => r.status === AttendanceStatus.TIDAK_HADIR).length,
    total: filteredRecords.length
  };

  // Data Analisis Per Kelas
  const classStats = useMemo(() => {
    return CLASSES.map(cls => {
      const classRecords = filteredRecords.filter(r => r.id_kelas === cls.id);
      const total = classRecords.length;
      const hadir = classRecords.filter(r => r.status === AttendanceStatus.HADIR).length;
      return {
        id: cls.id,
        hadir,
        persentase: total > 0 ? Math.round((hadir / total) * 100) : 0,
        total
      };
    });
  }, [filteredRecords]);

  // Data Analisis Per Guru
  const teacherStats = useMemo(() => {
    return teachers.map(t => {
      const teacherRecords = filteredRecords.filter(r => r.id_guru === t.id);
      const total = teacherRecords.length;
      const hadir = teacherRecords.filter(r => r.status === AttendanceStatus.HADIR).length;
      return {
        id: t.id,
        nama: t.nama,
        hadir,
        total,
        persentase: total > 0 ? Math.round((hadir / total) * 100) : 0
      };
    }).sort((a, b) => b.persentase - a.persentase);
  }, [filteredRecords, teachers]);

  const handleGenerateAiInsight = async () => {
    setIsAnalyzing(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Berikan ringkasan eksekutif profesional mengenai data absensi SMPN 3 Pacet periode ${timeFilter}. Statistik: Hadir ${stats.hadir}, Izin ${stats.izin}, Alpha ${stats.alpha}. Berikan rekomendasi untuk peningkatan disiplin.`,
      });
      setAiInsight(response.text || 'Gagal memperoleh analisa cerdas.');
    } catch (err) {
      setAiInsight('Layanan analisa AI sedang tidak tersedia.');
    } finally {
      setIsAnalyzing(false);
    }
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

  const handleAddEvent = () => {
    if (!newEvent.nama || !newEvent.tanggal) return;
    const event = { ...newEvent, id: Date.now().toString() } as SchoolEvent;
    setSettings(prev => ({ ...prev, events: [...(prev.events || []), event] }));
    setNewEvent({ tanggal: todayStr, nama: '', tipe: 'LIBUR', affected_jams: [] });
  };

  const handleRemoveEvent = (id: string) => {
    setSettings(prev => ({ ...prev, events: (prev.events || []).filter(e => e.id !== id) }));
  };

  const handleApplyPermit = async () => {
    if (!permitForm.teacherId || !permitForm.date) return;
    
    // Validasi jam jika memilih jam tertentu
    if (permitForm.type === 'SPECIFIC_HOURS' && permitForm.affected_jams.length === 0) {
      alert('Silakan pilih jam mengajar yang akan diizinkan.');
      return;
    }

    const d = new Date(permitForm.date);
    const dayNames = ['MINGGU', 'SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUM\'AT', 'SABTU'];
    const selectedDay = dayNames[d.getDay()];
    
    // Ambil jadwal guru hari itu
    let teacherSchedule = schedule.filter(s => s.hari === selectedDay && s.kegiatan === 'KBM');
    
    // Jika jam tertentu, filter jadwal hanya yang dipilih
    if (permitForm.type === 'SPECIFIC_HOURS') {
      teacherSchedule = teacherSchedule.filter(s => permitForm.affected_jams.includes(s.jam));
    }

    const records: AttendanceRecord[] = [];
    const teacher = teachers.find(t => t.id === permitForm.teacherId);

    teacherSchedule.forEach(slot => {
      CLASSES.forEach(cls => {
        const mapping = slot.mapping[cls.id];
        if (mapping && mapping.split('-')[1] === permitForm.teacherId) {
          records.push({
            id: `${permitForm.date}-${cls.id}-${slot.jam}`,
            id_guru: permitForm.teacherId,
            nama_guru: teacher?.nama || permitForm.teacherId,
            mapel: mapping.split('-')[0],
            id_kelas: cls.id,
            tanggal: permitForm.date,
            jam: slot.jam,
            status: permitForm.status,
            catatan: permitForm.note,
            is_admin_input: true
          });
        }
      });
    });

    if (records.length === 0) {
      alert('Guru tidak memiliki jadwal mengajar di jam/tanggal tersebut.');
      return;
    }

    try {
      await onSaveAttendance(records);
      alert(`Berhasil menginput ${records.length} jam izin untuk ${teacher?.nama}`);
      // Reset form jams setelah sukses
      setPermitForm(prev => ({ ...prev, affected_jams: [] }));
    } catch (err) {
      alert('Gagal menyimpan izin.');
    }
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

  const semesterMonths = [
    { v: '01', n: 'Januari' }, { v: '02', n: 'Februari' }, { v: '03', n: 'Maret' }, 
    { v: '04', n: 'April' }, { v: '05', n: 'Mei' }, { v: '06', n: 'Juni' },
    { v: '07', n: 'Juli' }, { v: '08', n: 'Agustus' }, { v: '09', n: 'September' }, 
    { v: '10', n: 'Oktober' }, { v: '11', n: 'November' }, { v: '12', n: 'Desember' }
  ];

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
             {id: 'monitoring', icon: <Activity size={16}/>, label: 'Live'},
             {id: 'permits', icon: <ShieldCheck size={16}/>, label: 'Izin'},
             {id: 'agenda', icon: <Calendar size={16}/>, label: 'Agenda'},
             {id: 'teachers', icon: <Users size={16}/>, label: 'Guru'},
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

      {/* OVERVIEW TAB */}
      {activeTab === 'overview' && (
        <div className="space-y-6 animate-in fade-in duration-500">
           <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-[28px] border border-slate-100 shadow-sm">
              <div className="flex bg-slate-100 p-1 rounded-xl">
                 {(['harian', 'mingguan', 'bulanan', 'semester'] as TimeFilter[]).map(f => (
                   <button key={f} onClick={() => setTimeFilter(f)} className={`px-5 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${timeFilter === f ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}>{f}</button>
                 ))}
              </div>
              {timeFilter === 'bulanan' && (
                <select value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className="bg-slate-50 border border-slate-100 px-4 py-2 rounded-xl text-[10px] font-black uppercase outline-none">
                   {semesterMonths.map(m => <option key={m.v} value={m.v}>{m.n}</option>)}
                </select>
              )}
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { label: 'Total Kehadiran', val: stats.hadir, color: 'emerald', icon: <CheckCircle2 size={24}/>, trend: '+5%' },
                { label: 'Izin & Sakit', val: stats.izin, color: 'indigo', icon: <ShieldCheck size={24}/>, trend: '-2%' },
                { label: 'Alpha', val: stats.alpha, color: 'rose', icon: <AlertTriangle size={24}/>, trend: '+1%' },
                { label: 'Total Sesi KBM', val: stats.total, color: 'slate', icon: <BookOpen size={24}/>, trend: '0%' }
              ].map((s, i) => (
                <div key={i} className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-xl flex items-center justify-between group hover:border-indigo-100 transition-all">
                   <div className="flex items-center gap-4">
                      <div className={`p-4 rounded-2xl bg-${s.color}-50 text-${s.color}-600`}>{s.icon}</div>
                      <div>
                         <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{s.label}</p>
                         <h3 className="text-2xl font-black text-slate-800 tracking-tighter">{s.val} <span className="text-[10px] font-normal text-slate-400">Jam</span></h3>
                      </div>
                   </div>
                   <div className={`flex items-center gap-1 text-[9px] font-black ${s.trend.startsWith('+') ? 'text-emerald-600' : s.trend.startsWith('-') ? 'text-rose-600' : 'text-slate-400'}`}>
                      {s.trend.startsWith('+') ? <ArrowUpRight size={12}/> : s.trend.startsWith('-') ? <ArrowDownRight size={12}/> : null}
                      {s.trend}
                   </div>
                </div>
              ))}
           </div>

           <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 bg-white p-8 rounded-[40px] border border-slate-100 shadow-2xl">
                 <h3 className="text-xs font-black text-slate-900 uppercase italic mb-8 flex items-center gap-3"><BarChart3 size={18} className="text-indigo-600"/> Monitoring Kehadiran Per Kelas</h3>
                 <div className="overflow-x-auto">
                    <table className="w-full text-left">
                       <thead>
                          <tr className="border-b border-slate-50">
                             <th className="py-4 text-[9px] font-black text-slate-400 uppercase">Kelas</th>
                             <th className="py-4 text-[9px] font-black text-slate-400 uppercase">Hadir</th>
                             <th className="py-4 text-[9px] font-black text-slate-400 uppercase">Progress</th>
                             <th className="py-4 text-right text-[9px] font-black text-slate-400 uppercase">Akurasi</th>
                          </tr>
                       </thead>
                       <tbody className="divide-y divide-slate-50">
                          {classStats.map(cls => (
                            <tr key={cls.id} className="group hover:bg-slate-50/50 transition-all">
                               <td className="py-4"><span className={`px-3 py-1 rounded-lg text-[10px] font-black ${CLASS_COLORS[cls.id]}`}>{cls.id}</span></td>
                               <td className="py-4 text-xs font-black text-slate-800">{cls.hadir} <span className="text-[10px] font-normal text-slate-400">/ {cls.total}</span></td>
                               <td className="py-4">
                                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden max-w-[120px]">
                                     <div className="bg-emerald-500 h-full rounded-full" style={{width: `${cls.persentase}%`}}></div>
                                  </div>
                               </td>
                               <td className="py-4 text-right text-xs font-black text-slate-900">{cls.persentase}%</td>
                            </tr>
                          ))}
                       </tbody>
                    </table>
                 </div>
              </div>

              <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-2xl">
                 <h3 className="text-xs font-black text-slate-900 uppercase italic mb-8 flex items-center gap-3"><Users size={18} className="text-indigo-600"/> Ranking Kedisiplinan Guru</h3>
                 <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                    {teacherStats.slice(0, 10).map((t, idx) => (
                      <div key={t.id} className="flex items-center justify-between p-4 rounded-2xl bg-slate-50/50 border border-slate-100 hover:border-indigo-200 transition-all">
                         <div className="flex items-center gap-4">
                            <span className="text-[10px] font-black text-slate-300">#{(idx+1).toString().padStart(2, '0')}</span>
                            <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center font-black text-[10px]">{t.id}</div>
                            <div>
                               <p className="text-[10px] font-black text-slate-800 uppercase truncate max-w-[120px] italic">{t.nama}</p>
                               <p className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">{t.hadir} Jam Hadir</p>
                            </div>
                         </div>
                         <div className={`text-[10px] font-black ${t.persentase > 90 ? 'text-emerald-600' : t.persentase > 70 ? 'text-indigo-600' : 'text-rose-600'}`}>{t.persentase}%</div>
                      </div>
                    ))}
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* MONITORING TAB */}
      {activeTab === 'monitoring' && (
        <div className="bg-white rounded-[40px] border border-slate-100 shadow-2xl overflow-hidden animate-in fade-in">
           <div className="p-8 border-b border-slate-50 bg-slate-50/50 flex items-center justify-between">
              <h3 className="text-xs font-black text-slate-900 uppercase italic">Live Attendance Monitoring</h3>
              <div className="flex items-center gap-2">
                 <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                 <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest italic">Live Sinkron</span>
              </div>
           </div>
           <div className="overflow-x-auto">
              <table className="w-full text-left">
                 <thead className="bg-slate-50/30">
                    <tr>
                       <th className="px-8 py-6 text-[9px] font-black text-slate-400 uppercase">Jam</th>
                       <th className="px-4 py-6 text-[9px] font-black text-slate-400 uppercase">Kelas</th>
                       <th className="px-4 py-6 text-[9px] font-black text-slate-400 uppercase">Guru & Pelajaran</th>
                       <th className="px-8 py-6 text-[9px] font-black text-slate-400 uppercase">Status</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-50">
                    {filteredRecords.filter(r => r.tanggal === todayStr).length > 0 ? filteredRecords.filter(r => r.tanggal === todayStr).map((r, i) => (
                      <tr key={i} className="hover:bg-slate-50/50 transition-all">
                         <td className="px-8 py-6 font-black text-xs text-slate-500 italic">Jam ke-{r.jam}</td>
                         <td className="px-4 py-6"><span className={`px-3 py-1 rounded-lg text-[10px] font-black ${CLASS_COLORS[r.id_kelas] || 'bg-slate-100 text-slate-600'}`}>{r.id_kelas}</span></td>
                         <td className="px-4 py-6">
                            <p className="text-xs font-black text-slate-800 uppercase tracking-tighter">{r.nama_guru}</p>
                            <p className="text-[9px] font-bold text-indigo-500 uppercase mt-0.5">{r.mapel}</p>
                         </td>
                         <td className="px-8 py-6">
                            <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase ${
                               r.status === AttendanceStatus.HADIR ? 'bg-emerald-50 text-emerald-600' :
                               r.status === AttendanceStatus.TIDAK_HADIR ? 'bg-rose-50 text-rose-600' : 'bg-amber-50 text-amber-600'
                            }`}>{r.status}</span>
                         </td>
                      </tr>
                    )) : (
                      <tr><td colSpan={4} className="p-20 text-center font-black text-slate-300 text-[10px] uppercase tracking-widest italic">Belum ada aktivitas absensi hari ini</td></tr>
                    )}
                 </tbody>
              </table>
           </div>
        </div>
      )}

      {/* PERMITS TAB */}
      {activeTab === 'permits' && (
        <div className="max-w-4xl mx-auto space-y-8 animate-in slide-in-from-bottom-6">
           <div className="bg-white p-10 rounded-[40px] border border-slate-100 shadow-2xl">
              <h3 className="text-sm font-black text-slate-900 uppercase italic mb-8 flex items-center gap-4"><ShieldCheck size={24} className="text-indigo-600"/> Input Izin Guru</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                 <div>
                    <label className="text-[10px] font-black text-slate-400 mb-2 block uppercase">Tanggal Izin</label>
                    <input type="date" className="w-full bg-slate-50 border border-slate-100 px-5 py-4 rounded-2xl font-black outline-none" value={permitForm.date} onChange={e => setPermitForm({...permitForm, date: e.target.value, affected_jams: []})}/>
                 </div>
                 <div>
                    <label className="text-[10px] font-black text-slate-400 mb-2 block uppercase">Pilih Guru</label>
                    <select className="w-full bg-slate-50 border border-slate-100 px-5 py-4 rounded-2xl font-black outline-none" value={permitForm.teacherId} onChange={e => setPermitForm({...permitForm, teacherId: e.target.value})}>
                       <option value="">-- Pilih Guru --</option>
                       {teachers.map(t => <option key={t.id} value={t.id}>{t.nama}</option>)}
                    </select>
                 </div>
                 <div>
                    <label className="text-[10px] font-black text-slate-400 mb-2 block uppercase">Status</label>
                    <select className="w-full bg-slate-50 border border-slate-100 px-5 py-4 rounded-2xl font-black outline-none" value={permitForm.status} onChange={e => setPermitForm({...permitForm, status: e.target.value as any})}>
                       <option value={AttendanceStatus.IZIN}>IZIN</option>
                       <option value={AttendanceStatus.SAKIT}>SAKIT</option>
                    </select>
                 </div>
                 <div>
                    <label className="text-[10px] font-black text-slate-400 mb-2 block uppercase">Jangkauan Izin</label>
                    <select className="w-full bg-slate-50 border border-slate-100 px-5 py-4 rounded-2xl font-black outline-none" value={permitForm.type} onChange={e => setPermitForm({...permitForm, type: e.target.value as any, affected_jams: []})}>
                       <option value="FULL_DAY">SELURUH HARI (FULL)</option>
                       <option value="SPECIFIC_HOURS">JAM TERTENTU</option>
                    </select>
                 </div>
                 <div className="md:col-span-2">
                    <label className="text-[10px] font-black text-slate-400 mb-2 block uppercase">Keterangan / Alasan</label>
                    <input className="w-full bg-slate-50 border border-slate-100 px-5 py-4 rounded-2xl font-black outline-none" value={permitForm.note} onChange={e => setPermitForm({...permitForm, note: e.target.value})} placeholder="Alasan izin..."/>
                 </div>
              </div>

              {/* Checklist Jam Khusus untuk Izin */}
              {permitForm.type === 'SPECIFIC_HOURS' && (
                <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 mb-8 animate-in zoom-in duration-300">
                   <p className="text-[10px] font-black text-slate-400 mb-4 uppercase tracking-widest flex items-center gap-2"><Clock size={14}/> Pilih Jam Mengajar:</p>
                   <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-8 gap-2">
                      {getPeriodsForDate(permitForm.date).map(jam => (
                        <label key={jam} className={`flex flex-col items-center justify-center p-4 rounded-2xl border transition-all cursor-pointer ${permitForm.affected_jams.includes(jam) ? 'bg-indigo-600 text-white border-indigo-700 shadow-md scale-95' : 'bg-white text-slate-400 border-slate-200 hover:border-indigo-300'}`}>
                           <input 
                             type="checkbox" 
                             className="hidden" 
                             checked={permitForm.affected_jams.includes(jam)}
                             onChange={e => {
                               const current = permitForm.affected_jams;
                               const updated = e.target.checked ? [...current, jam] : current.filter(j => j !== jam);
                               setPermitForm({...permitForm, affected_jams: updated});
                             }}
                           />
                           <span className="text-xs font-black">JAM {jam}</span>
                        </label>
                      ))}
                   </div>
                </div>
              )}

              <button onClick={handleApplyPermit} className="w-full bg-indigo-600 text-white font-black py-5 rounded-[22px] shadow-xl hover:bg-indigo-700 transition-all text-[11px] uppercase tracking-widest flex items-center justify-center gap-3">
                 <Save size={18}/> Terbitkan Surat Izin Digital
              </button>
           </div>
        </div>
      )}

      {/* AGENDA TAB */}
      {activeTab === 'agenda' && (
        <div className="max-w-4xl mx-auto space-y-8 animate-in slide-in-from-bottom-6">
           <div className="bg-white p-10 rounded-[40px] border border-slate-100 shadow-2xl">
              <h3 className="text-sm font-black text-slate-900 uppercase italic mb-8 flex items-center gap-4"><Calendar size={24} className="text-indigo-600"/> Kelola Kalender & Jam Khusus</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                 <div>
                    <label className="text-[10px] font-black text-slate-400 mb-1 block uppercase">Pilih Tanggal</label>
                    <input type="date" className="w-full bg-slate-50 border border-slate-100 px-5 py-4 rounded-2xl font-black outline-none focus:ring-4 focus:ring-indigo-500/10" value={newEvent.tanggal} onChange={e => setNewEvent({...newEvent, tanggal: e.target.value, affected_jams: []})}/>
                 </div>
                 <div>
                    <label className="text-[10px] font-black text-slate-400 mb-1 block uppercase">Keterangan Event</label>
                    <input className="w-full bg-slate-50 border border-slate-100 px-5 py-4 rounded-2xl font-black outline-none focus:ring-4 focus:ring-indigo-500/10" value={newEvent.nama} onChange={e => setNewEvent({...newEvent, nama: e.target.value})} placeholder="Contoh: HUT Sekolah..."/>
                 </div>
                 <div>
                    <label className="text-[10px] font-black text-slate-400 mb-1 block uppercase">Tipe Agenda</label>
                    <select className="w-full bg-slate-50 border border-slate-100 px-5 py-4 rounded-2xl font-black outline-none focus:ring-4 focus:ring-indigo-500/10" value={newEvent.tipe} onChange={e => setNewEvent({...newEvent, tipe: e.target.value as any, affected_jams: []})}>
                       <option value="LIBUR">LIBUR TOTAL</option>
                       <option value="KEGIATAN">KEGIATAN SEKOLAH</option>
                       <option value="JAM_KHUSUS">JAM KHUSUS (DILIBURKAN)</option>
                    </select>
                 </div>
              </div>

              {newEvent.tipe === 'JAM_KHUSUS' && (
                <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 mb-8 animate-in zoom-in duration-300">
                   <p className="text-[10px] font-black text-slate-400 mb-4 uppercase tracking-widest flex items-center gap-2"><Clock size={14}/> Pilih Jam yang Ingin Dikosongkan:</p>
                   <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-8 gap-2">
                      {getPeriodsForDate(newEvent.tanggal || todayStr).map(jam => (
                        <label key={jam} className={`flex flex-col items-center justify-center p-4 rounded-2xl border transition-all cursor-pointer ${newEvent.affected_jams?.includes(jam) ? 'bg-indigo-600 text-white border-indigo-700 shadow-md scale-95' : 'bg-white text-slate-400 border-slate-200 hover:border-indigo-300'}`}>
                           <input 
                             type="checkbox" 
                             className="hidden" 
                             checked={newEvent.affected_jams?.includes(jam)}
                             onChange={e => {
                               const current = newEvent.affected_jams || [];
                               const updated = e.target.checked ? [...current, jam] : current.filter(j => j !== jam);
                               setNewEvent({...newEvent, affected_jams: updated});
                             }}
                           />
                           <span className="text-xs font-black">JAM {jam}</span>
                        </label>
                      ))}
                   </div>
                </div>
              )}

              <button onClick={handleAddEvent} className="w-full bg-indigo-600 text-white font-black py-5 rounded-[22px] shadow-xl hover:bg-indigo-700 transition-all text-[11px] uppercase tracking-widest flex items-center justify-center gap-3">
                 <Plus size={18}/> Simpan ke Kalender Sekolah
              </button>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {(settings.events || []).map(event => (
                <div key={event.id} className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-xl flex items-center justify-between group hover:border-indigo-100 transition-all">
                   <div className="flex items-center gap-5">
                      <div className={`p-4 rounded-2xl ${event.tipe === 'LIBUR' ? 'bg-rose-50 text-rose-600' : 'bg-amber-50 text-amber-600'}`}>
                         {event.tipe === 'LIBUR' ? <Coffee size={24}/> : <Calendar size={24}/>}
                      </div>
                      <div>
                         <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{event.tanggal}</p>
                         <h4 className="text-sm font-black text-slate-800 uppercase italic leading-none mb-1">{event.nama}</h4>
                         <span className="text-[8px] font-black text-indigo-500 uppercase tracking-widest">
                           {event.tipe} {event.affected_jams && event.affected_jams.length > 0 && `(JAM: ${event.affected_jams.join(',')})`}
                         </span>
                      </div>
                   </div>
                   <button onClick={() => handleRemoveEvent(event.id)} className="p-3 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all">
                      <Trash2 size={20}/>
                   </button>
                </div>
              ))}
           </div>
        </div>
      )}

      {/* TEACHERS TAB */}
      {activeTab === 'teachers' && (
        <div className="space-y-6 animate-in slide-in-from-bottom-6">
           <div className="flex justify-between items-center">
              <h3 className="text-sm font-black text-slate-900 uppercase italic">Database Guru SMPN 3 Pacet</h3>
              <button onClick={() => { setEditingTeacherId(null); setTeacherForm({id: '', nama: '', mapel: []}); setIsTeacherModalOpen(true); }} className="bg-indigo-600 text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-indigo-700 transition-all shadow-lg">
                 <Plus size={16}/> Tambah Guru
              </button>
           </div>
           
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {teachers.map(t => (
                <div key={t.id} className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-xl group hover:border-indigo-200 transition-all">
                   <div className="flex items-start justify-between mb-6">
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-xl shadow-inner ${TEACHER_COLORS[t.id] || 'bg-slate-100 text-slate-400'}`}>
                         {t.id}
                      </div>
                      <div className="flex gap-2">
                         <button onClick={() => { setEditingTeacherId(t.id); setTeacherForm(t); setIsTeacherModalOpen(true); }} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"><Edit2 size={16}/></button>
                         <button onClick={() => setTeachers(prev => prev.filter(x => x.id !== t.id))} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"><Trash2 size={16}/></button>
                      </div>
                   </div>
                   <h4 className="text-sm font-black text-slate-800 uppercase italic mb-2 tracking-tight">{t.nama}</h4>
                   <div className="flex flex-wrap gap-2">
                      {t.mapel.map((m, idx) => <span key={idx} className="bg-slate-50 text-slate-500 px-3 py-1 rounded-lg text-[9px] font-bold uppercase border border-slate-100">{m}</span>)}
                   </div>
                </div>
              ))}
           </div>
        </div>
      )}

      {/* SCHEDULE TAB */}
      {activeTab === 'schedule' && (
        <div className="bg-white rounded-[40px] border border-slate-100 shadow-2xl overflow-hidden animate-in fade-in">
           <div className="p-10 border-b border-slate-50 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                 <h3 className="text-sm font-black text-slate-900 uppercase italic">Mapping Jadwal Master</h3>
                 <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1 italic">Atur mata pelajaran per kelas per jam</p>
              </div>
           </div>
           <div className="overflow-x-auto">
              <table className="w-full text-left">
                 <thead className="bg-slate-100/50">
                    <tr>
                       <th className="px-8 py-6 text-[9px] font-black text-slate-400 uppercase border-r border-slate-100">Hari / Jam</th>
                       {CLASSES.map(c => <th key={c.id} className="px-4 py-6 text-[9px] font-black text-slate-400 uppercase text-center">{c.nama}</th>)}
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100">
                    {schedule.map((row, i) => (
                      <tr key={i} className={`hover:bg-slate-50/50 transition-all ${row.kegiatan !== 'KBM' ? 'bg-slate-50/30' : ''}`}>
                         <td className="px-8 py-4 border-r border-slate-100">
                            <div className="flex items-center gap-3">
                               <span className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center text-[10px] font-black">{row.jam}</span>
                               <div>
                                  <p className="text-[10px] font-black text-slate-800 uppercase tracking-tighter">{row.hari}</p>
                                  <p className="text-[9px] font-bold text-slate-400">{row.waktu}</p>
                               </div>
                            </div>
                         </td>
                         {row.kegiatan !== 'KBM' ? (
                           <td colSpan={CLASSES.length} className="px-4 py-4 text-center">
                              <span className="text-[10px] font-black text-slate-300 uppercase tracking-[0.4em] italic">{row.kegiatan}</span>
                           </td>
                         ) : (
                           CLASSES.map(c => {
                             const mapping = row.mapping[c.id] || '';
                             return (
                               <td key={c.id} className="px-2 py-4">
                                  {mapping ? (
                                    <div className="bg-white border border-slate-100 p-2 rounded-xl shadow-sm text-center">
                                       <p className="text-[9px] font-black text-indigo-600 leading-none">{mapping.split('-')[0]}</p>
                                       <p className="text-[8px] font-bold text-slate-400 mt-1 uppercase truncate">{mapping.split('-')[1]}</p>
                                    </div>
                                  ) : <div className="h-8 bg-slate-50/50 rounded-lg border border-dashed border-slate-100"></div>}
                               </td>
                             );
                           })
                         )}
                      </tr>
                    ))}
                 </tbody>
              </table>
           </div>
        </div>
      )}

      {/* SISTEM TAB */}
      {activeTab === 'settings' && (
        <div className="max-w-3xl mx-auto space-y-8 animate-in slide-in-from-bottom-6">
           <div className={`p-8 rounded-[40px] border flex flex-col md:flex-row items-center md:items-start gap-6 shadow-2xl relative overflow-hidden ${!hasKey ? 'bg-amber-50 border-amber-200' : 'bg-emerald-50 border-emerald-200'}`}>
              <div className={`p-5 rounded-[24px] shadow-sm shrink-0 flex items-center justify-center ${!hasKey ? 'bg-white text-amber-600' : 'bg-white text-emerald-600'}`}>
                 {!hasKey ? <WifiOff size={40}/> : <Wifi size={40}/>}
              </div>
              <div className="flex-1 text-center md:text-left relative z-10">
                 <div className="flex flex-col md:flex-row md:items-center gap-2 mb-3">
                    <h4 className={`font-black text-xs uppercase italic tracking-widest ${!hasKey ? 'text-amber-800' : 'text-emerald-800'}`}>
                      Koneksi Cloud: {!hasKey ? 'TIDAK AKTIF' : 'SINKRON'}
                    </h4>
                    {hasKey && (
                      <span className="bg-emerald-500 text-white px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-tighter w-fit mx-auto md:mx-0">Cloud Connected</span>
                    )}
                 </div>
                 <p className={`text-[11px] font-bold uppercase tracking-tight leading-relaxed mb-6 ${!hasKey ? 'text-amber-600' : 'text-emerald-600'}`}>
                   {!hasKey 
                     ? "Aplikasi berjalan dalam mode lokal (Mockup). Hubungkan API Key Anda untuk mengaktifkan sinkronisasi database Supabase." 
                     : "Sempurna! Aplikasi terhubung ke Cloud Database. Semua data tersinkronisasi secara real-time."}
                 </p>
                 <div className="flex flex-wrap justify-center md:justify-start gap-3">
                    {!hasKey ? (
                      <button onClick={handleOpenKeySelector} className="flex items-center gap-2 bg-amber-600 text-white px-6 py-3 rounded-xl shadow-lg shadow-amber-200 hover:bg-amber-700 transition-all">
                        <Key size={14}/>
                        <span className="text-[9px] font-black uppercase tracking-tighter">Pilih API Key (Aktifkan Cloud)</span>
                      </button>
                    ) : (
                      <div className="flex items-center gap-2 bg-white/60 px-4 py-2 rounded-xl border border-emerald-100">
                         <ShieldCheck className="text-emerald-600" size={14}/>
                         <span className="text-[9px] font-black uppercase tracking-tighter text-emerald-800 italic">API Key Terdeteksi</span>
                      </div>
                    )}
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
                 <h4 className="text-slate-800 font-black text-xs uppercase italic mb-2 tracking-widest">Sinkronisasi Data Master</h4>
                 <p className="text-[11px] text-slate-500 mb-5 font-bold uppercase leading-relaxed">Pindahkan database guru dan jadwal master dari sistem lokal ke server Cloud (Hanya perlu dilakukan sekali setelah setup Cloud).</p>
                 <button onClick={handleRestoreDefaults} disabled={isRestoring} className="bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest px-8 py-4 rounded-2xl hover:bg-indigo-700 shadow-xl transition-all">MULAI SINKRONISASI KE CLOUD</button>
              </div>
           </div>
        </div>
      )}

      {/* TEACHER MODAL */}
      {isTeacherModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-6 z-[100] animate-in fade-in">
           <div className="bg-white w-full max-w-lg rounded-[40px] shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in duration-300">
              <div className="p-8 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                 <h3 className="text-sm font-black text-slate-800 uppercase italic">{editingTeacherId ? 'Edit Data Guru' : 'Tambah Guru Baru'}</h3>
                 <button onClick={() => setIsTeacherModalOpen(false)} className="text-slate-400 hover:text-rose-500 transition-all"><X size={24}/></button>
              </div>
              <form onSubmit={handleSaveTeacher} className="p-10 space-y-6">
                 <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">ID / Inisial Guru</label>
                    <input required className="w-full bg-slate-50 border border-slate-100 px-5 py-4 rounded-2xl text-sm font-black uppercase outline-none focus:ring-4 focus:ring-indigo-500/10" value={teacherForm.id} onChange={e => setTeacherForm({...teacherForm, id: e.target.value.toUpperCase()})} placeholder="CONTOH: SH"/>
                 </div>
                 <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Nama Lengkap & Gelar</label>
                    <input required className="w-full bg-slate-50 border border-slate-100 px-5 py-4 rounded-2xl text-sm font-black outline-none focus:ring-4 focus:ring-indigo-500/10" value={teacherForm.nama} onChange={e => setTeacherForm({...teacherForm, nama: e.target.value})} placeholder="CONTOH: Dra. Sri Hayati"/>
                 </div>
                 <button type="submit" className="w-full bg-indigo-600 text-white font-black py-5 rounded-[22px] shadow-xl hover:bg-indigo-700 transition-all text-[11px] uppercase tracking-widest">Simpan Perubahan</button>
              </form>
           </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
