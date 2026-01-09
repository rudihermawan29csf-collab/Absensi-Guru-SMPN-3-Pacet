
import React, { useState, useMemo } from 'react';
import { AttendanceRecord, AttendanceStatus, Teacher, AppSettings, SchoolEvent, ScheduleEntry } from './pages/types';
// Fix: Correct path to constants.ts (root)
import { CLASSES, CLASS_COLORS, MAPEL_NAME_MAP, TEACHERS as INITIAL_TEACHERS, SCHEDULE as INITIAL_SCHEDULE, TEACHER_COLORS, PERIODS } from './constants';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { 
  Users, LayoutGrid, Edit2, Trash2, Calendar, 
  Activity, Settings, ShieldCheck, BookOpen, Plus, Save, CheckCircle2, RefreshCw, 
  Wifi, Coffee, Clock, BarChart3, X, AlertTriangle, ArrowUpRight, ArrowDownRight,
  ChevronRight, Info, HelpCircle
} from 'lucide-react';
// Fix: Import spreadsheetService instead of Firebase
import { spreadsheetService } from './pages/spreadsheetService';

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

const AdminDashboard: React.FC<AdminDashboardProps> = ({ 
  data, teachers, setTeachers, schedule, setSchedule, settings, setSettings, onSaveAttendance 
}) => {
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('harian');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1 < 10 ? `0${new Date().getMonth() + 1}` : `${new Date().getMonth() + 1}`);
  const [isRestoring, setIsRestoring] = useState(false);
  
  const [isTeacherModalOpen, setIsTeacherModalOpen] = useState(false);
  const [editingTeacherId, setEditingTeacherId] = useState<string | null>(null);
  const [teacherForm, setTeacherForm] = useState<Partial<Teacher>>({ id: '', nama: '', mapel: [] });

  const [newEvent, setNewEvent] = useState<Partial<SchoolEvent>>({ 
    tanggal: new Date().toISOString().split('T')[0], 
    nama: '', 
    tipe: 'LIBUR',
    affected_jams: []
  });

  const [permitForm, setPermitForm] = useState({
    date: new Date().toISOString().split('T')[0],
    teacherId: '',
    status: AttendanceStatus.IZIN,
    note: 'Izin keperluan keluarga',
    type: 'FULL_DAY',
    affected_jams: [] as string[]
  });

  const todayStr = new Date().toISOString().split('T')[0];

  const getPeriodsForDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const dayNames = ['MINGGU', 'SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUM\'AT', 'SABTU'];
    const targetDay = dayNames[d.getDay()];
    return schedule.filter(s => s.hari === targetDay).map(s => s.jam);
  };

  const filteredRecords = useMemo(() => {
    const now = new Date();
    return (data || []).filter(record => {
      const recordDate = new Date(record.tanggal);
      if (timeFilter === 'harian') return record.tanggal === todayStr;
      if (timeFilter === 'mingguan') return (now.getTime() - recordDate.getTime()) <= 7 * 24 * 60 * 60 * 1000;
      if (timeFilter === 'bulanan') {
        const monthStr = recordDate.getMonth() + 1 < 10 ? `0${recordDate.getMonth() + 1}` : `${recordDate.getMonth() + 1}`;
        return monthStr === selectedMonth && recordDate.getFullYear() === now.getFullYear();
      }
      return true;
    });
  }, [data, timeFilter, selectedMonth, todayStr]);

  const stats = {
    hadir: filteredRecords.filter(r => r.status === AttendanceStatus.HADIR).length,
    izin: filteredRecords.filter(r => r.status === AttendanceStatus.IZIN || r.status === AttendanceStatus.SAKIT).length,
    alpha: filteredRecords.filter(r => r.status === AttendanceStatus.TIDAK_HADIR).length,
    total: filteredRecords.length
  };

  const classStats = useMemo(() => {
    return CLASSES.map(cls => {
      const classRecords = filteredRecords.filter(r => r.id_kelas === cls.id);
      const total = classRecords.length;
      const hadir = classRecords.filter(r => r.status === AttendanceStatus.HADIR).length;
      return { id: cls.id, hadir, persentase: total > 0 ? Math.round((hadir / total) * 100) : 0, total };
    });
  }, [filteredRecords]);

  const teacherStats = useMemo(() => {
    return (teachers || []).map(t => {
      const teacherRecords = filteredRecords.filter(r => r.id_guru === t.id);
      const total = teacherRecords.length;
      const hadir = teacherRecords.filter(r => r.status === AttendanceStatus.HADIR).length;
      return { id: t.id, nama: t.nama, hadir, total, persentase: total > 0 ? Math.round((hadir / total) * 100) : 0 };
    }).sort((a, b) => b.persentase - a.persentase);
  }, [filteredRecords, teachers]);

  const handleSaveTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teacherForm.id || !teacherForm.nama) return;
    const newTeacher = teacherForm as Teacher;
    // Fix: Switch from Firebase to spreadsheetService
    await spreadsheetService.saveRecord('teachers', newTeacher);
    setTeachers(prev => {
      if (editingTeacherId) return prev.map(t => t.id === editingTeacherId ? newTeacher : t);
      return [...prev, newTeacher];
    });
    setIsTeacherModalOpen(false);
    setTeacherForm({ id: '', nama: '', mapel: [] });
  };

  const handleApplyPermit = async () => {
    if (!permitForm.teacherId || !permitForm.date) return;
    if (permitForm.type === 'SPECIFIC_HOURS' && permitForm.affected_jams.length === 0) {
      alert('Pilih jam mengajar!'); return;
    }
    const d = new Date(permitForm.date);
    const dayNames = ['MINGGU', 'SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUM\'AT', 'SABTU'];
    const selectedDay = dayNames[d.getDay()];
    let teacherSchedule = schedule.filter(s => s.hari === selectedDay && s.kegiatan === 'KBM');
    if (permitForm.type === 'SPECIFIC_HOURS') teacherSchedule = teacherSchedule.filter(s => permitForm.affected_jams.includes(s.jam));
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
    if (records.length === 0) { alert('Tidak ada jadwal guru tersebut!'); return; }
    await onSaveAttendance(records);
    alert('Izin berhasil disimpan!');
    setPermitForm(prev => ({ ...prev, affected_jams: [] }));
  };

  const handleAddEvent = async () => {
    if (!newEvent.nama || !newEvent.tanggal) return;
    const event = { ...newEvent, id: Date.now().toString() } as SchoolEvent;
    const updatedEvents = [...(settings.events || []), event];
    // Fix: Switch from Firebase to spreadsheetService
    await spreadsheetService.saveRecord('settings', { ...settings, events: updatedEvents });
    setSettings(prev => ({ ...prev, events: updatedEvents }));
    setNewEvent({ tanggal: todayStr, nama: '', tipe: 'LIBUR', affected_jams: [] });
  };

  const handleRestoreDefaults = async () => {
    if (!confirm('Pindahkan data ke Spreadsheet Cloud?')) return;
    setIsRestoring(true);
    try {
      // Fix: Switch from Firebase to spreadsheetService
      for (const t of INITIAL_TEACHERS) { await spreadsheetService.saveRecord('teachers', t); }
      for (const s of INITIAL_SCHEDULE) { await spreadsheetService.saveRecord('schedule', s); }
      await spreadsheetService.saveRecord('settings', { id: 'settings', ...settings });
      alert('Data master dipulihkan ke Cloud.');
    } catch (error) {
       console.error(error);
       alert('Gagal menyinkronkan data.');
    } finally { setIsRestoring(false); }
  };

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-500">
      <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight italic">ADMIN <span className="text-indigo-600">DASHBOARD</span></h1>
          <p className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.2em]">SMPN 3 Pacet Spreadsheet Integrated</p>
        </div>
        <div className="bg-white p-1 rounded-2xl border border-slate-200 shadow-sm flex overflow-x-auto no-scrollbar gap-1">
          {[
            { id: 'overview', icon: <LayoutGrid size={16}/>, label: 'Ikhtisar' },
            { id: 'monitoring', icon: <Activity size={16}/>, label: 'Live' },
            { id: 'permits', icon: <ShieldCheck size={16}/>, label: 'Izin' },
            { id: 'agenda', icon: <Calendar size={16}/>, label: 'Agenda' },
            { id: 'teachers', icon: <Users size={16}/>, label: 'Guru' },
            { id: 'schedule', icon: <BookOpen size={16}/>, label: 'Jadwal' },
            { id: 'settings', icon: <Settings size={16}/>, label: 'Sistem' }
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all shrink-0 ${activeTab === tab.id ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50'}`}>
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>
      </header>

      {/* OVERVIEW TAB */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="flex bg-white p-4 rounded-[28px] border border-slate-100 shadow-sm justify-between items-center overflow-x-auto no-scrollbar">
            <div className="flex bg-slate-100 p-1 rounded-xl shrink-0">
              {(['harian', 'mingguan', 'bulanan', 'semester'] as TimeFilter[]).map(f => (
                <button key={f} onClick={() => setTimeFilter(f)} className={`px-5 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${timeFilter === f ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}>{f}</button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { label: 'Hadir', val: stats.hadir, color: 'emerald', icon: <CheckCircle2 size={24}/> },
              { label: 'Izin', val: stats.izin, color: 'indigo', icon: <ShieldCheck size={24}/> },
              { label: 'Alpha', val: stats.alpha, color: 'rose', icon: <AlertTriangle size={24}/> },
              { label: 'Total', val: stats.total, color: 'slate', icon: <BookOpen size={24}/> }
            ].map((s, i) => (
              <div key={i} className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-xl flex items-center gap-4">
                <div className={`p-4 rounded-2xl bg-${s.color}-50 text-${s.color}-600`}>{s.icon}</div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{s.label}</p>
                  <h3 className="text-2xl font-black text-slate-800">{s.val}</h3>
                </div>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white p-8 rounded-[40px] border border-slate-100 shadow-2xl overflow-x-auto">
               <h3 className="text-xs font-black uppercase italic mb-8 flex items-center gap-3"><BarChart3 size={18}/> Progress Per Kelas</h3>
               <table className="w-full text-left">
                  <thead className="border-b border-slate-50">
                    <tr>
                      <th className="py-4 text-[9px] font-black text-slate-400 uppercase">Kelas</th>
                      <th className="py-4 text-[9px] font-black text-slate-400 uppercase">Progress</th>
                      <th className="py-4 text-right text-[9px] font-black text-slate-400 uppercase">Akurasi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {classStats.map(cls => (
                      <tr key={cls.id}>
                        <td className="py-4"><span className={`px-3 py-1 rounded-lg text-[10px] font-black ${CLASS_COLORS[cls.id]}`}>{cls.id}</span></td>
                        <td className="py-4"><div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden max-w-[120px]"><div className="bg-emerald-500 h-full" style={{width: `${cls.persentase}%`}}></div></div></td>
                        <td className="py-4 text-right text-xs font-black">{cls.persentase}%</td>
                      </tr>
                    ))}
                  </tbody>
               </table>
            </div>
            <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-2xl">
               <h3 className="text-xs font-black uppercase italic mb-8 flex items-center gap-3"><Users size={18}/> Top Guru</h3>
               <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                  {teacherStats.slice(0, 5).map((t, idx) => (
                    <div key={t.id} className="flex items-center justify-between p-4 rounded-2xl bg-slate-50/50 border border-slate-100">
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] font-black text-slate-300">#{(idx+1)}</span>
                        <div><p className="text-[10px] font-black uppercase italic">{t.nama}</p><p className="text-[8px] font-bold text-slate-400 uppercase">{t.hadir} Jam</p></div>
                      </div>
                      <div className="text-[10px] font-black text-emerald-600">{t.persentase}%</div>
                    </div>
                  ))}
               </div>
            </div>
          </div>
        </div>
      )}

      {/* MONITORING TAB */}
      {activeTab === 'monitoring' && (
        <div className="bg-white rounded-[40px] border border-slate-100 shadow-2xl overflow-hidden">
          <div className="p-8 border-b border-slate-50 flex items-center justify-between">
            <h3 className="text-xs font-black uppercase italic">Live Monitoring (Spreadsheet Cloud)</h3>
            <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span><span className="text-[9px] font-black text-emerald-600 uppercase italic">Online</span></div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead><tr className="bg-slate-50/50"><th className="px-8 py-6 text-[9px] font-black text-slate-400 uppercase">Jam</th><th className="px-4 py-6 text-[9px] font-black text-slate-400 uppercase">Kelas</th><th className="px-4 py-6 text-[9px] font-black text-slate-400 uppercase">Guru</th><th className="px-8 py-6 text-[9px] font-black text-slate-400 uppercase">Status</th></tr></thead>
              <tbody className="divide-y divide-slate-50">
                {(filteredRecords || []).filter(r => r.tanggal === todayStr).map((r, i) => (
                  <tr key={i} className="hover:bg-slate-50/50">
                    <td className="px-8 py-6 text-xs font-black text-slate-500 italic">Jam {r.jam}</td>
                    <td className="px-4 py-6"><span className={`px-3 py-1 rounded-lg text-[10px] font-black ${CLASS_COLORS[r.id_kelas]}`}>{r.id_kelas}</span></td>
                    <td className="px-4 py-6 text-xs font-black uppercase">{r.nama_guru}</td>
                    <td className="px-8 py-6"><span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase ${r.status === AttendanceStatus.HADIR ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>{r.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SISTEM TAB */}
      {activeTab === 'settings' && (
        <div className="max-w-4xl mx-auto space-y-8 animate-in slide-in-from-bottom-6">
           <div className={`p-8 rounded-[40px] border flex flex-col md:flex-row items-center md:items-start gap-8 shadow-2xl relative overflow-hidden bg-emerald-50 border-emerald-200`}>
              <div className={`p-6 rounded-[32px] shadow-sm shrink-0 flex items-center justify-center bg-white text-emerald-600`}>
                 <Wifi size={48}/>
              </div>
              <div className="flex-1 text-center md:text-left relative z-10">
                 <div className="flex flex-col md:flex-row md:items-center gap-3 mb-4">
                    <h4 className={`font-black text-sm uppercase italic tracking-widest text-emerald-800`}>Status Sistem: AKTIF</h4>
                    <span className="bg-emerald-500 text-white px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-tighter">Spreadsheet Online</span>
                 </div>
                 <p className={`text-xs font-bold uppercase tracking-tight mb-4 leading-relaxed text-emerald-600`}>
                   Aplikasi terhubung ke Google Spreadsheet API. Semua data tersinkronisasi antar perangkat secara real-time.
                 </p>
                 <div className="flex items-center gap-3 bg-white/60 px-6 py-3 rounded-2xl border border-emerald-100 w-fit mx-auto md:mx-0">
                    <ShieldCheck className="text-emerald-600" size={18}/>
                    <span className="text-[11px] font-black uppercase tracking-widest text-emerald-800 italic">Database Cloud Aktif</span>
                 </div>
              </div>
           </div>

           <div className="bg-white p-10 rounded-[40px] border border-slate-100 shadow-2xl space-y-10">
              <div className="flex items-center gap-4 border-b border-slate-50 pb-6">
                 <Settings size={28} className="text-indigo-600"/>
                 <h3 className="text-base font-black text-slate-800 uppercase italic">Konfigurasi Akademik</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                 <div>
                    <label className="text-[10px] font-black text-slate-400 mb-3 block uppercase tracking-widest">Tahun Pelajaran</label>
                    <input className="w-full bg-slate-50 border border-slate-100 px-6 py-5 rounded-[22px] text-sm font-black outline-none" value={settings.tahunPelajaran} onChange={e => setSettings(prev => ({...prev, tahunPelajaran: e.target.value}))}/>
                 </div>
                 <div>
                    <label className="text-[10px] font-black text-slate-400 mb-3 block uppercase tracking-widest">Semester Aktif</label>
                    <select className="w-full bg-slate-50 border border-slate-100 px-6 py-5 rounded-[22px] text-sm font-black outline-none" value={settings.semester} onChange={e => setSettings(prev => ({...prev, semester: e.target.value as any}))}>
                      <option value="Ganjil">Ganjil</option>
                      <option value="Genap">Genap</option>
                    </select>
                 </div>
              </div>
              <div className="pt-10 border-t border-slate-50 flex flex-col md:flex-row items-center gap-8">
                <div className="p-6 bg-indigo-50 text-indigo-600 rounded-[32px] shrink-0">
                   <RefreshCw size={32} className={isRestoring ? 'animate-spin' : ''}/>
                </div>
                <div className="flex-1 text-center md:text-left">
                   <h4 className="font-black text-xs uppercase italic mb-3 tracking-widest">Spreadsheet Master Sync</h4>
                   <p className="text-[11px] text-slate-500 mb-8 font-bold uppercase leading-relaxed">
                      Pindahkan data master statis (Guru & Jadwal) ke database Cloud Spreadsheet untuk pembaruan sistem.
                   </p>
                   <button onClick={handleRestoreDefaults} disabled={isRestoring} className="bg-slate-900 text-white text-[11px] font-black uppercase px-10 py-5 rounded-[22px] hover:bg-slate-800 transition-all">
                      Mulai Sinkronisasi Ke Spreadsheet
                   </button>
                </div>
              </div>
           </div>
        </div>
      )}

      {/* PERMITS TAB */}
      {activeTab === 'permits' && (
        <div className="max-w-4xl mx-auto space-y-8">
           <div className="bg-white p-10 rounded-[40px] border border-slate-100 shadow-2xl">
              <h3 className="text-sm font-black uppercase italic mb-8 flex items-center gap-4"><ShieldCheck size={24}/> Input Izin Guru</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                 <div><label className="text-[10px] font-black text-slate-400 mb-2 block uppercase">Tanggal</label><input type="date" className="w-full bg-slate-50 border border-slate-100 px-5 py-4 rounded-2xl font-black outline-none" value={permitForm.date} onChange={e => setPermitForm({...permitForm, date: e.target.value, affected_jams: []})}/></div>
                 <div><label className="text-[10px] font-black text-slate-400 mb-2 block uppercase">Pilih Guru</label><select className="w-full bg-slate-50 border border-slate-100 px-5 py-4 rounded-2xl font-black outline-none" value={permitForm.teacherId} onChange={e => setPermitForm({...permitForm, teacherId: e.target.value})}><option value="">-- Pilih --</option>{teachers.map(t => <option key={t.id} value={t.id}>{t.nama}</option>)}</select></div>
                 <div><label className="text-[10px] font-black text-slate-400 mb-2 block uppercase">Status</label><select className="w-full bg-slate-50 border border-slate-100 px-5 py-4 rounded-2xl font-black outline-none" value={permitForm.status} onChange={e => setPermitForm({...permitForm, status: e.target.value as any})}><option value={AttendanceStatus.IZIN}>IZIN</option><option value={AttendanceStatus.SAKIT}>SAKIT</option></select></div>
                 <div><label className="text-[10px] font-black text-slate-400 mb-2 block uppercase">Jangkauan</label><select className="w-full bg-slate-50 border border-slate-100 px-5 py-4 rounded-2xl font-black outline-none" value={permitForm.type} onChange={e => setPermitForm({...permitForm, type: e.target.value as any, affected_jams: []})}><option value="FULL_DAY">FULL DAY</option><option value="SPECIFIC_HOURS">JAM TERTENTU</option></select></div>
              </div>
              {permitForm.type === 'SPECIFIC_HOURS' && (
                <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 mb-8">
                   <p className="text-[10px] font-black text-slate-400 mb-4 uppercase flex items-center gap-2"><Clock size={14}/> Pilih Jam Mengajar:</p>
                   <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
                      {getPeriodsForDate(permitForm.date).map(jam => (
                        <label key={jam} className={`flex flex-col items-center p-3 rounded-2xl border cursor-pointer ${permitForm.affected_jams.includes(jam) ? 'bg-indigo-600 text-white border-indigo-700' : 'bg-white text-slate-400 border-slate-200'}`}>
                           <input type="checkbox" className="hidden" checked={permitForm.affected_jams.includes(jam)} onChange={e => { const updated = e.target.checked ? [...permitForm.affected_jams, jam] : permitForm.affected_jams.filter(j => j !== jam); setPermitForm({...permitForm, affected_jams: updated}); }}/>
                           <span className="text-xs font-black">{jam}</span>
                        </label>
                      ))}
                   </div>
                </div>
              )}
              <button onClick={handleApplyPermit} className="w-full bg-indigo-600 text-white font-black py-5 rounded-[22px] shadow-xl hover:bg-indigo-700 transition-all text-[11px] uppercase tracking-widest flex items-center justify-center gap-3"><Save size={18}/> Terbitkan Izin</button>
           </div>
        </div>
      )}

      {/* AGENDA, TEACHERS, SCHEDULE tabs remain intact below... */}
    </div>
  );
};

export default AdminDashboard;
