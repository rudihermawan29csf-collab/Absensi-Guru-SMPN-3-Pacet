
import React, { useState, useMemo, useRef } from 'react';
import { AttendanceRecord, AttendanceStatus, Teacher, AppSettings, SchoolEvent, ScheduleEntry } from '../types';
import { CLASSES, CLASS_COLORS, NOTE_CHOICES, MAPEL_NAME_MAP } from '../constants';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  Legend, Cell
} from 'recharts';
import { 
  Users, LayoutGrid, Edit2, Trash2, Calendar, 
  Activity, Settings, ShieldCheck, BookOpen, Plus, Download, Upload, Trash, X, 
  AlertTriangle, Save, CheckCircle2, Clock, Check
} from 'lucide-react';

interface AdminDashboardProps {
  data: AttendanceRecord[];
  teachers: Teacher[];
  setTeachers: React.Dispatch<React.SetStateAction<Teacher[]>>;
  schedule: ScheduleEntry[];
  setSchedule: React.Dispatch<React.SetStateAction<ScheduleEntry[]>>;
  settings: AppSettings;
  setSettings: React.Dispatch<React.SetStateAction<AppSettings>>;
  onSaveAttendance: (records: AttendanceRecord[]) => void;
}

type AdminTab = 'overview' | 'monitoring' | 'permits' | 'agenda' | 'teachers' | 'schedule' | 'settings';

const AdminDashboard: React.FC<AdminDashboardProps> = ({ 
  data, teachers, setTeachers, schedule, setSchedule, settings, setSettings, onSaveAttendance 
}) => {
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [timeFilter, setTimeFilter] = useState<'harian' | 'mingguan' | 'bulanan'>('harian');
  
  // Form States
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

  // Helper: Get Day Name from Date String
  const getDayFromDate = (dateStr: string) => {
    const dayNames = ['MINGGU', 'SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUM\'AT', 'SABTU'];
    return dayNames[new Date(dateStr).getDay()];
  };

  // Logic: Ambil Jam Mengajar Guru tertentu di hari tertentu
  const availableJamsForTeacher = useMemo(() => {
    if (!permitForm.id_guru || !permitForm.tanggal) return [];
    const day = getDayFromDate(permitForm.tanggal);
    
    // Cari di schedule semua jam di mana guru ini mengajar
    return schedule
      .filter(s => s.hari === day && s.kegiatan === 'KBM')
      .filter(s => {
        return Object.values(s.mapping).some(val => (val as string).includes(permitForm.id_guru));
      })
      .map(s => s.jam);
  }, [permitForm.id_guru, permitForm.tanggal, schedule]);

  // Logic: Ambil Seluruh Jam Pelajaran di hari tertentu (untuk Agenda Jam Khusus)
  const allJamsOnDay = useMemo(() => {
    if (!eventForm.tanggal) return [];
    const day = getDayFromDate(eventForm.tanggal);
    return schedule
      .filter(s => s.hari === day && s.kegiatan === 'KBM')
      .map(s => s.jam);
  }, [eventForm.tanggal, schedule]);

  // Action: Simpan Izin Guru
  const handleSavePermit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!permitForm.id_guru || permitForm.jam.length === 0) {
      alert('Mohon pilih guru dan jam mengajar yang sesuai.');
      return;
    }

    const teacher = teachers.find(t => t.id === permitForm.id_guru);
    const dayName = getDayFromDate(permitForm.tanggal);

    const newRecords: AttendanceRecord[] = permitForm.jam.map(j => {
      const sch = schedule.find(s => s.hari === dayName && s.jam === j);
      let mapel = 'Tugas Luar';
      let id_kelas = 'SEMUA';

      if (sch) {
        const classEntry = Object.entries(sch.mapping).find(([_, val]) => (val as string).includes(permitForm.id_guru));
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
    alert('Status izin guru berhasil diterapkan pada jam terpilih.');
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
    setSettings({ ...settings, events: [...settings.events, newEvent] });
    setEventForm({ nama: '', tipe: 'KEGIATAN', tanggal: todayStr, affected_jams: [] });
    alert('Agenda berhasil disimpan.');
  };

  const handleSaveTeacher = (e: React.FormEvent) => {
    e.preventDefault();
    if (!teacherForm.id || !teacherForm.nama) return;
    const teacherData = teacherForm as Teacher;
    if (editingTeacherId) {
      setTeachers(prev => prev.map(t => t.id === editingTeacherId ? teacherData : t));
    } else {
      setTeachers(prev => [...prev, teacherData]);
    }
    setIsTeacherModalOpen(false);
    setTeacherForm({ id: '', nama: '', mapel: [] });
    setEditingTeacherId(null);
  };

  // Stats
  const filteredData = useMemo(() => {
    return data.filter(r => {
      if (timeFilter === 'harian') return r.tanggal === todayStr;
      return true;
    });
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

      {/* 1. OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-6 animate-in fade-in">
           <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { label: 'Hadir Hari Ini', val: stats.hadir, color: 'emerald', icon: <CheckCircle2 size={24}/> },
                { label: 'Izin & Sakit', val: stats.izin, color: 'indigo', icon: <ShieldCheck size={24}/> },
                { label: 'Alpha (Tanpa Ket)', val: stats.alpha, color: 'rose', icon: <AlertTriangle size={24}/> }
              ].map((s, i) => (
                <div key={i} className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-xl shadow-slate-200/50 flex items-center gap-5">
                   <div className={`p-4 rounded-2xl bg-${s.color}-50 text-${s.color}-600`}>{s.icon}</div>
                   <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{s.label}</p>
                      <h3 className="text-3xl font-black text-slate-800">{s.val} <span className="text-xs font-normal text-slate-400">Jam</span></h3>
                   </div>
                </div>
              ))}
           </div>
           
           <div className="bg-white p-8 lg:p-10 rounded-[40px] border border-slate-100 shadow-2xl">
              <h3 className="text-sm font-black text-slate-800 uppercase italic mb-8 flex items-center gap-3"><Activity size={20} className="text-indigo-600"/> Rekapitulasi Kehadiran</h3>
              <div className="h-72">
                 <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={[{name: 'Hadir', v: stats.hadir}, {name: 'Izin', v: stats.izin}, {name: 'Alpha', v: stats.alpha}]}>
                       <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                       <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 'bold'}} />
                       <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 'bold'}} />
                       <Tooltip cursor={{fill: '#f8fafc'}} />
                       <Bar dataKey="v" radius={[8, 8, 0, 0]} barSize={60}>
                          <Cell fill="#10b981" /><Cell fill="#6366f1" /><Cell fill="#ef4444" />
                       </Bar>
                    </BarChart>
                 </ResponsiveContainer>
              </div>
           </div>
        </div>
      )}

      {/* 2. MONITORING KELAS */}
      {activeTab === 'monitoring' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 animate-in fade-in">
           {CLASSES.map(c => {
              const classRecs = data.filter(r => r.tanggal === todayStr && r.id_kelas === c.id);
              const lastRec = classRecs[classRecs.length - 1];
              const isHadir = lastRec?.status === AttendanceStatus.HADIR;
              return (
                <div key={c.id} className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-xl flex flex-col justify-between hover:border-indigo-200 transition-all group">
                   <div className="flex justify-between items-start mb-6">
                      <div className={`px-4 py-1.5 rounded-xl font-black text-[10px] uppercase ${CLASS_COLORS[c.id]}`}>KELAS {c.nama}</div>
                      <div className={`w-3 h-3 rounded-full ${lastRec ? (isHadir ? 'bg-emerald-500' : 'bg-rose-500') : 'bg-slate-200 animate-pulse'}`}></div>
                   </div>
                   <div className="space-y-1">
                      <h4 className="text-sm font-black text-slate-800 uppercase tracking-tight truncate group-hover:text-indigo-600 transition-colors">{lastRec?.nama_guru || 'Jadwal Kosong / Belum Absen'}</h4>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{lastRec?.mapel || '-'}</p>
                   </div>
                   <div className="mt-6 pt-4 border-t border-slate-50 flex items-center justify-between">
                      <span className="text-[9px] font-black text-slate-300 uppercase tracking-tighter">POSISI JAM: {lastRec?.jam || '-'}</span>
                      <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${isHadir ? 'text-emerald-600 bg-emerald-50' : (lastRec ? 'text-rose-600 bg-rose-50' : 'text-slate-300')}`}>
                         {lastRec?.status || 'NO DATA'}
                      </span>
                   </div>
                </div>
              );
           })}
        </div>
      )}

      {/* 3. IZIN GURU */}
      {activeTab === 'permits' && (
        <div className="max-w-2xl mx-auto animate-in zoom-in-95">
           <div className="bg-white p-10 rounded-[40px] border border-slate-100 shadow-2xl">
              <div className="flex items-center gap-4 mb-8 border-b border-slate-50 pb-6">
                 <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl"><ShieldCheck size={28}/></div>
                 <div>
                    <h3 className="text-lg font-black text-slate-800 uppercase italic">Input Izin Guru</h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Jam muncul otomatis berdasarkan jadwal guru</p>
                 </div>
              </div>
              
              <form onSubmit={handleSavePermit} className="space-y-6">
                 <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Tanggal Izin</label>
                    <div className="relative">
                       <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18}/>
                       <input type="date" className="w-full bg-slate-50 border border-slate-100 p-4 pl-12 rounded-2xl text-sm font-bold outline-none uppercase" value={permitForm.tanggal} onChange={e => setPermitForm({...permitForm, tanggal: e.target.value, jam: []})} />
                    </div>
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                       <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Pilih Guru</label>
                       <select required className="w-full bg-slate-50 border border-slate-100 p-4 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500/20" value={permitForm.id_guru} onChange={e => setPermitForm({...permitForm, id_guru: e.target.value, jam: []})}>
                          <option value="">-- PILIH GURU --</option>
                          {teachers.sort((a,b) => a.nama.localeCompare(b.nama)).map(t => <option key={t.id} value={t.id}>{t.nama}</option>)}
                       </select>
                    </div>
                    <div>
                       <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Status</label>
                       <select className="w-full bg-slate-50 border border-slate-100 p-4 rounded-2xl text-sm font-bold outline-none" value={permitForm.status} onChange={e => setPermitForm({...permitForm, status: e.target.value as any})}>
                          <option value={AttendanceStatus.IZIN}>IZIN</option>
                          <option value={AttendanceStatus.SAKIT}>SAKIT</option>
                          <option value={AttendanceStatus.TIDAK_HADIR}>ALPHA</option>
                       </select>
                    </div>
                 </div>

                 <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                       <Clock size={14}/> Jam Pelajaran Guru (Sesuai Jadwal)
                    </label>
                    {permitForm.id_guru && availableJamsForTeacher.length > 0 ? (
                       <div className="flex flex-wrap gap-2">
                          {availableJamsForTeacher.map(j => (
                             <button type="button" key={j} onClick={() => {
                                const newJams = permitForm.jam.includes(j) ? permitForm.jam.filter(x => x !== j) : [...permitForm.jam, j];
                                setPermitForm({...permitForm, jam: newJams});
                             }} className={`w-14 h-14 rounded-2xl text-xs font-black transition-all border flex items-center justify-center ${permitForm.jam.includes(j) ? 'bg-indigo-600 text-white border-indigo-700 shadow-lg scale-105' : 'bg-white text-slate-400 border-slate-100'}`}>
                                {j}
                             </button>
                          ))}
                       </div>
                    ) : (
                       <div className="p-5 bg-slate-50 border border-dashed border-slate-200 rounded-2xl text-center">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                             {permitForm.id_guru ? 'Guru tidak memiliki jadwal mengajar di hari ini.' : 'Silakan pilih guru terlebih dahulu.'}
                          </p>
                       </div>
                    )}
                 </div>

                 <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Catatan Tambahan</label>
                    <textarea placeholder="Alasan izin atau instruksi tugas..." className="w-full bg-slate-50 border border-slate-100 p-5 rounded-3xl text-sm font-medium outline-none min-h-[100px] focus:ring-2 focus:ring-indigo-500/20" value={permitForm.catatan} onChange={e => setPermitForm({...permitForm, catatan: e.target.value})} />
                 </div>

                 <button type="submit" disabled={permitForm.jam.length === 0} className={`w-full font-black py-5 rounded-2xl shadow-2xl transition-all flex items-center justify-center gap-3 uppercase tracking-widest text-[11px] ${permitForm.jam.length > 0 ? 'bg-slate-900 text-white hover:bg-black' : 'bg-slate-100 text-slate-300 cursor-not-allowed'}`}>
                    <Save size={20}/> Terapkan Izin Guru
                 </button>
              </form>
           </div>
        </div>
      )}

      {/* 4. AGENDA KEGIATAN */}
      {activeTab === 'agenda' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in">
           <div className="lg:col-span-1">
              <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-2xl h-fit sticky top-24">
                 <h3 className="text-sm font-black text-slate-800 uppercase italic mb-8 border-b border-slate-50 pb-4">Tambah Agenda</h3>
                 <form onSubmit={handleAddEvent} className="space-y-5">
                    <div>
                       <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Tanggal</label>
                       <input type="date" required className="w-full bg-slate-50 border border-slate-100 p-4 rounded-2xl text-sm font-bold outline-none uppercase" value={eventForm.tanggal} onChange={e => setEventForm({...eventForm, tanggal: e.target.value, affected_jams: []})} />
                    </div>
                    <div>
                       <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Tipe Agenda</label>
                       <select className="w-full bg-slate-50 border border-slate-100 p-4 rounded-2xl text-sm font-bold outline-none" value={eventForm.tipe} onChange={e => setEventForm({...eventForm, tipe: e.target.value as any})}>
                          <option value="KEGIATAN">KEGIATAN SEKOLAH</option>
                          <option value="LIBUR">LIBUR SEKOLAH</option>
                          <option value="JAM_KHUSUS">JAM KHUSUS (PENGURANGAN)</option>
                       </select>
                    </div>

                    {eventForm.tipe === 'JAM_KHUSUS' && (
                       <div className="animate-in slide-in-from-top-4">
                          <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Pilih Jam yang Terdampak</label>
                          <div className="grid grid-cols-4 gap-2">
                             {allJamsOnDay.map(j => (
                                <button key={j} type="button" onClick={() => {
                                   const newJams = eventForm.affected_jams?.includes(j) ? eventForm.affected_jams.filter(x => x !== j) : [...(eventForm.affected_jams || []), j];
                                   setEventForm({...eventForm, affected_jams: newJams});
                                }} className={`p-3 rounded-xl text-[10px] font-black border transition-all flex items-center justify-center gap-1 ${eventForm.affected_jams?.includes(j) ? 'bg-indigo-600 text-white border-indigo-700 shadow-md' : 'bg-slate-50 text-slate-400 border-slate-100'}`}>
                                   {eventForm.affected_jams?.includes(j) && <Check size={10}/>} {j}
                                </button>
                             ))}
                          </div>
                          {allJamsOnDay.length === 0 && <p className="text-[9px] text-rose-500 font-bold mt-2 uppercase">Tidak ada jadwal KBM di hari ini.</p>}
                       </div>
                    )}

                    <div>
                       <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Nama Agenda</label>
                       <input required className="w-full bg-slate-50 border border-slate-100 p-4 rounded-2xl text-sm font-bold outline-none" value={eventForm.nama} onChange={e => setEventForm({...eventForm, nama: e.target.value})} placeholder="Misal: Rapat Guru" />
                    </div>

                    <button type="submit" className="w-full bg-indigo-600 text-white font-black py-4 rounded-2xl shadow-xl hover:bg-indigo-700 transition-all uppercase text-[10px] tracking-widest">Simpan Agenda</button>
                 </form>
              </div>
           </div>
           
           <div className="lg:col-span-2 space-y-4">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest px-4 mb-2 italic">Daftar Agenda</h3>
              {settings.events.length === 0 ? (
                <div className="bg-slate-50 border-2 border-dashed border-slate-200 p-16 rounded-[40px] text-center">
                   <p className="text-slate-400 font-bold text-xs uppercase tracking-widest italic">Kosong</p>
                </div>
              ) : (
                settings.events.sort((a,b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime()).map(ev => (
                  <div key={ev.id} className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-xl flex justify-between items-center group">
                     <div className="flex gap-5 items-center">
                        <div className={`p-4 rounded-2xl ${ev.tipe === 'LIBUR' ? 'bg-rose-50 text-rose-600' : (ev.tipe === 'JAM_KHUSUS' ? 'bg-amber-50 text-amber-600' : 'bg-indigo-50 text-indigo-600')}`}>
                           <Calendar size={24}/>
                        </div>
                        <div>
                           <h4 className="font-black text-slate-800 text-base uppercase italic leading-tight">{ev.nama}</h4>
                           <div className="flex items-center gap-3 mt-1.5">
                              <span className="text-[10px] font-black text-indigo-500 uppercase">{new Date(ev.tanggal).toLocaleDateString('id-ID', {day: 'numeric', month: 'long', year: 'numeric'})}</span>
                              <span className="w-1 h-1 bg-slate-200 rounded-full"></span>
                              <span className="text-[10px] font-black text-slate-400 uppercase tracking-tight">{ev.tipe.replace('_', ' ')}</span>
                              {ev.affected_jams && ev.affected_jams.length > 0 && (
                                 <>
                                    <span className="w-1 h-1 bg-slate-200 rounded-full"></span>
                                    <span className="text-[10px] font-black text-amber-600 uppercase">Jam: {ev.affected_jams.join(', ')}</span>
                                 </>
                              )}
                           </div>
                        </div>
                     </div>
                     <button onClick={() => setSettings({...settings, events: settings.events.filter(x => x.id !== ev.id)})} className="p-3 text-slate-200 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"><Trash2 size={20}/></button>
                  </div>
                ))
              )}
           </div>
        </div>
      )}

      {/* 5. DATA GURU */}
      {activeTab === 'teachers' && (
        <div className="space-y-4 animate-in fade-in">
           <div className="flex justify-between items-center bg-white p-6 rounded-[32px] border border-slate-100 shadow-xl">
              <h3 className="text-sm font-black text-slate-800 uppercase italic tracking-wider">Database Guru</h3>
              <button onClick={() => { setTeacherForm({id: '', nama: '', mapel: []}); setEditingTeacherId(null); setIsTeacherModalOpen(true); }} className="bg-indigo-600 text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-indigo-700 transition-all shadow-lg">
                <Plus size={18}/> Tambah Guru
              </button>
           </div>
           
           <div className="bg-white rounded-[40px] border border-slate-100 shadow-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-500 border-b">
                    <tr>
                      <th className="px-8 py-5">ID</th>
                      <th className="px-8 py-5">Nama</th>
                      <th className="px-8 py-5">Mata Pelajaran</th>
                      <th className="px-8 py-5 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 text-sm">
                    {teachers.map(t => (
                      <tr key={t.id} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="px-8 py-6"><span className="font-black text-indigo-600 text-xs bg-indigo-50 px-2 py-1 rounded-lg uppercase">{t.id}</span></td>
                        <td className="px-8 py-6 font-black text-slate-800 uppercase text-xs italic">{t.nama}</td>
                        <td className="px-8 py-6">
                           <div className="flex flex-wrap gap-1">
                              {t.mapel.map((m, i) => <span key={i} className="text-[9px] font-bold bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full uppercase">{m}</span>)}
                           </div>
                        </td>
                        <td className="px-8 py-6 text-right space-x-1">
                           <button onClick={() => { setTeacherForm(t); setEditingTeacherId(t.id); setIsTeacherModalOpen(true); }} className="p-3 text-slate-300 hover:text-indigo-600 transition-all"><Edit2 size={16}/></button>
                           <button onClick={() => { if(confirm(`Hapus guru ${t.nama}?`)) setTeachers(prev => prev.filter(x => x.id !== t.id)); }} className="p-3 text-slate-300 hover:text-rose-600 transition-all"><Trash2 size={16}/></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
           </div>
        </div>
      )}

      {/* 6. JADWAL */}
      {activeTab === 'schedule' && (
        <div className="space-y-4 animate-in fade-in">
           <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-xl flex items-center justify-between">
              <div>
                 <h3 className="text-sm font-black text-slate-800 uppercase italic">Master Jadwal</h3>
                 <p className="text-[10px] text-slate-400 font-bold uppercase mt-1 tracking-tighter">MAPEL-IDGURU</p>
              </div>
              <div className="flex gap-2">
                 <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-3 px-6 py-3 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 shadow-lg transition-all">
                    <Upload size={18}/> Unggah CSV
                 </button>
                 <input type="file" ref={fileInputRef} className="hidden" accept=".csv" />
              </div>
           </div>
           
           <div className="bg-white rounded-[40px] border border-slate-100 shadow-2xl overflow-hidden overflow-x-auto">
              <table className="w-full text-left text-[10px]">
                 <thead className="bg-slate-50 font-black uppercase text-slate-400 border-b">
                    <tr>
                       <th className="px-6 py-5 sticky left-0 bg-slate-50 z-10 border-r">Hari</th>
                       <th className="px-4 py-5 text-center border-r">Jam</th>
                       <th className="px-6 py-5 border-r min-w-[120px]">Kegiatan</th>
                       {CLASSES.map(c => <th key={c.id} className="px-3 py-5 text-center min-w-[70px] border-r">{c.id}</th>)}
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-50 font-bold">
                    {schedule.map((s, idx) => (
                      <tr key={idx} className={`${s.kegiatan !== 'KBM' ? 'bg-slate-50/50' : ''} hover:bg-slate-50/80 group transition-all`}>
                         <td className="px-6 py-4 font-black text-slate-800 sticky left-0 bg-white group-hover:bg-slate-50 border-r uppercase italic">{s.hari}</td>
                         <td className="px-4 py-4 text-center border-r"><span className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded-lg text-[9px]">{s.jam}</span></td>
                         <td className={`px-6 py-4 border-r uppercase ${s.kegiatan === 'KBM' ? 'text-indigo-600 font-black' : 'text-slate-400 italic font-medium'}`}>{s.kegiatan}</td>
                         {CLASSES.map(c => (
                            <td key={c.id} className="px-3 py-4 text-center text-slate-300 border-r group-hover:text-slate-600 transition-colors">
                               {s.mapping[c.id] || '-'}
                            </td>
                         ))}
                      </tr>
                    ))}
                 </tbody>
              </table>
           </div>
        </div>
      )}

      {/* 7. SETTINGS */}
      {activeTab === 'settings' && (
        <div className="max-w-xl mx-auto space-y-8 animate-in slide-in-from-bottom-6">
           <div className="bg-white p-10 rounded-[40px] border border-slate-100 shadow-2xl">
              <h3 className="text-base font-black text-slate-800 uppercase italic mb-8 flex items-center gap-4"><Settings size={24} className="text-indigo-600"/> Konfigurasi</h3>
              <div className="space-y-6">
                 <div>
                    <label className="text-[10px] font-black text-slate-500 mb-2 block uppercase tracking-widest">Tahun Pelajaran</label>
                    <input className="w-full bg-slate-50 border border-slate-100 px-5 py-4 rounded-2xl text-sm font-black outline-none focus:ring-2 focus:ring-indigo-500/20" value={settings.tahunPelajaran} onChange={e => setSettings({...settings, tahunPelajaran: e.target.value})}/>
                 </div>
                 <div>
                    <label className="text-[10px] font-black text-slate-500 mb-2 block uppercase tracking-widest">Semester</label>
                    <div className="grid grid-cols-2 gap-3">
                       {['Ganjil', 'Genap'].map(s => (
                          <button key={s} onClick={() => setSettings({...settings, semester: s as any})} className={`py-4 rounded-2xl text-xs font-black uppercase border transition-all ${settings.semester === s ? 'bg-indigo-600 text-white border-indigo-700 shadow-lg' : 'bg-slate-50 text-slate-400 border-slate-100 hover:text-indigo-500'}`}>{s}</button>
                       ))}
                    </div>
                 </div>
              </div>
           </div>

           <div className="bg-rose-50 p-8 rounded-[40px] border border-rose-100 flex items-start gap-6">
              <div className="p-4 bg-white rounded-2xl text-rose-600 shadow-sm"><AlertTriangle size={32}/></div>
              <div>
                 <h4 className="text-rose-800 font-black text-xs uppercase italic mb-2 tracking-widest">Reset Sistem</h4>
                 <p className="text-[11px] text-rose-600 mb-5 font-bold uppercase tracking-tight leading-relaxed">Tindakan ini akan menghapus permanen seluruh data absensi dari penyimpanan lokal perangkat ini.</p>
                 <button onClick={() => { if(confirm('Reset seluruh data absensi?')) { localStorage.removeItem('spn3_attendance'); window.location.reload(); } }} className="bg-rose-600 text-white text-[10px] font-black uppercase tracking-widest px-8 py-4 rounded-2xl hover:bg-rose-700 shadow-xl shadow-rose-200 active:scale-95 transition-all">RESET DATABASE</button>
              </div>
           </div>
        </div>
      )}

      {/* TEACHER MODAL */}
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
                    <input required className="w-full bg-slate-50 border border-slate-100 px-5 py-4 rounded-2xl text-sm font-black uppercase outline-none focus:ring-2 focus:ring-indigo-500/20" value={teacherForm.id} onChange={e => setTeacherForm({...teacherForm, id: e.target.value.toUpperCase()})} disabled={!!editingTeacherId}/>
                 </div>
                 <div>
                    <label className="text-[10px] font-black text-slate-500 block mb-2 uppercase tracking-widest">Nama Lengkap</label>
                    <input required className="w-full bg-slate-50 border border-slate-100 px-5 py-4 rounded-2xl text-sm font-black italic outline-none focus:ring-2 focus:ring-indigo-500/20" value={teacherForm.nama} onChange={e => setTeacherForm({...teacherForm, nama: e.target.value})}/>
                 </div>
                 <div>
                    <label className="text-[10px] font-black text-slate-500 block mb-2 uppercase tracking-widest">Mapel (Pisah Koma)</label>
                    <input className="w-full bg-slate-50 border border-slate-100 px-5 py-4 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500/20" value={teacherForm.mapel?.join(', ')} onChange={e => setTeacherForm({...teacherForm, mapel: e.target.value.split(',').map(m => m.trim())})}/>
                 </div>
                 <div className="flex gap-4 pt-6">
                    <button type="button" onClick={() => setIsTeacherModalOpen(false)} className="flex-1 py-4 rounded-2xl text-[10px] font-black uppercase bg-slate-100 text-slate-400 tracking-widest">Batal</button>
                    <button type="submit" className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase shadow-xl shadow-indigo-200 tracking-widest hover:bg-indigo-700 active:scale-95 transition-all">Simpan</button>
                 </div>
              </form>
           </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
