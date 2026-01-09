import React, { useState, useMemo } from 'react';
import { AttendanceRecord, AttendanceStatus, Teacher, AppSettings, SchoolEvent, ScheduleEntry } from './types';
import { CLASSES, CLASS_COLORS, TEACHERS as INITIAL_TEACHERS, SCHEDULE as INITIAL_SCHEDULE, MAPEL_NAME_MAP } from '../constants';
import { 
  Users, LayoutGrid, Calendar, Activity, Settings, ShieldCheck, BookOpen, Save, CheckCircle2, RefreshCw, 
  Wifi, BarChart3, AlertTriangle, Clock, Search, Filter, BookText
} from 'lucide-react';
import { spreadsheetService } from './spreadsheetService';

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

type AdminTab = 'overview' | 'monitoring' | 'permits' | 'teachers' | 'schedule' | 'settings';
type TimeFilter = 'harian' | 'mingguan' | 'bulanan' | 'semester';

const AdminDashboard: React.FC<AdminDashboardProps> = ({ 
  data, teachers, schedule, settings, setSettings, onSaveAttendance 
}) => {
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('harian');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1 < 10 ? `0${new Date().getMonth() + 1}` : `${new Date().getMonth() + 1}`);
  const [isRestoring, setIsRestoring] = useState(false);
  const [searchTeacher, setSearchTeacher] = useState('');
  const [scheduleDay, setScheduleDay] = useState('SENIN');

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

  const handleApplyPermit = async () => {
    if (!permitForm.teacherId || !permitForm.date) return;
    const d = new Date(permitForm.date);
    const dayNames = ['MINGGU', 'SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUM\'AT', 'SABTU'];
    const selectedDay = dayNames[d.getDay()];
    let teacherSchedule = schedule.filter(s => s.hari === selectedDay && s.kegiatan === 'KBM');
    
    if (permitForm.type === 'SPECIFIC_HOURS') {
      if (permitForm.affected_jams.length === 0) { alert('Pilih jam mengajar!'); return; }
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

    if (records.length === 0) { alert('Tidak ada jadwal guru tersebut!'); return; }
    await onSaveAttendance(records);
    alert('Izin berhasil disimpan ke Spreadsheet!');
    setPermitForm(prev => ({ ...prev, affected_jams: [] }));
  };

  const handleRestoreDefaults = async () => {
    if (!confirm('Pindahkan data master statis ke Google Spreadsheet?')) return;
    setIsRestoring(true);
    try {
      for (const t of INITIAL_TEACHERS) { await spreadsheetService.saveRecord('teachers', t); }
      for (const s of INITIAL_SCHEDULE) { await spreadsheetService.saveRecord('schedule', s); }
      await spreadsheetService.saveRecord('settings', { id: 'settings', ...settings });
      alert('Data master berhasil diunggah ke Spreadsheet.');
    } catch (err) { alert('Gagal menyinkronkan data.'); }
    finally { setIsRestoring(false); }
  };

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-500">
      <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-800 tracking-tight uppercase italic">Dashboard <span className="text-indigo-600">Admin</span></h1>
          <p className="text-slate-500 text-[9px] font-black uppercase tracking-[0.2em] italic">Kehadiran Guru di Kelas • SMPN 3 Pacet</p>
        </div>
        <div className="bg-white p-1 rounded-2xl border border-slate-200 shadow-sm flex overflow-x-auto no-scrollbar gap-1">
          {[
            { id: 'overview', icon: <LayoutGrid size={16}/>, label: 'Ikhtisar' },
            { id: 'monitoring', icon: <Activity size={16}/>, label: 'Live' },
            { id: 'permits', icon: <ShieldCheck size={16}/>, label: 'Izin Guru' },
            { id: 'teachers', icon: <Users size={16}/>, label: 'Data Guru' },
            { id: 'schedule', icon: <BookOpen size={16}/>, label: 'Jadwal' },
            { id: 'settings', icon: <Settings size={16}/>, label: 'Sistem' }
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[9px] font-black uppercase transition-all shrink-0 ${activeTab === tab.id ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50'}`}>
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>
      </header>

      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="flex bg-white p-4 rounded-[28px] border border-slate-100 shadow-sm justify-between items-center overflow-x-auto no-scrollbar">
            <div className="flex bg-slate-100 p-1 rounded-xl shrink-0">
              {(['harian', 'mingguan', 'bulanan', 'semester'] as TimeFilter[]).map(f => (
                <button key={f} onClick={() => setTimeFilter(f)} className={`px-5 py-2 rounded-lg text-[9px] font-black uppercase transition-all ${timeFilter === f ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}>{f}</button>
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
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest italic">{s.label}</p>
                  <h3 className="text-2xl font-black text-slate-800 tracking-tighter">{s.val}</h3>
                </div>
              </div>
            ))}
          </div>
          <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-2xl overflow-x-auto">
             <h3 className="text-xs font-black uppercase italic mb-8 flex items-center gap-3"><BarChart3 size={18}/> Progress Per Kelas</h3>
             <table className="w-full text-left">
                <thead className="border-b border-slate-50">
                  <tr>
                    <th className="py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Kelas</th>
                    <th className="py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Indikator</th>
                    <th className="py-4 text-right text-[9px] font-black text-slate-400 uppercase tracking-widest">Akurasi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {classStats.map(cls => (
                    <tr key={cls.id}>
                      <td className="py-4"><span className={`px-3 py-1 rounded-lg text-[10px] font-black ${CLASS_COLORS[cls.id]}`}>{cls.id}</span></td>
                      <td className="py-4"><div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden max-w-[200px]"><div className="bg-emerald-500 h-full" style={{width: `${cls.persentase}%`}}></div></div></td>
                      <td className="py-4 text-right text-xs font-black tracking-tighter">{cls.persentase}%</td>
                    </tr>
                  ))}
                </tbody>
             </table>
          </div>
        </div>
      )}

      {activeTab === 'monitoring' && (
        <div className="bg-white rounded-[40px] border border-slate-100 shadow-2xl overflow-hidden">
          <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
            <h3 className="text-xs font-black uppercase italic tracking-widest">Live Monitoring Database</h3>
            <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span><span className="text-[9px] font-black text-emerald-600 uppercase italic">Cloud Active</span></div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead><tr className="bg-slate-50/50"><th className="px-8 py-6 text-[9px] font-black text-slate-400 uppercase">Jam</th><th className="px-4 py-6 text-[9px] font-black text-slate-400 uppercase">Kelas</th><th className="px-4 py-6 text-[9px] font-black text-slate-400 uppercase">Guru</th><th className="px-8 py-6 text-[9px] font-black text-slate-400 uppercase">Status</th></tr></thead>
              <tbody className="divide-y divide-slate-50">
                {(filteredRecords || []).filter(r => r.tanggal === todayStr).length === 0 ? (
                  <tr><td colSpan={4} className="py-20 text-center text-[10px] font-black uppercase text-slate-400 italic">Belum ada laporan masuk hari ini</td></tr>
                ) : (
                  (filteredRecords || []).filter(r => r.tanggal === todayStr).map((r, i) => (
                    <tr key={i} className="hover:bg-slate-50/50">
                      <td className="px-8 py-6 text-xs font-black text-slate-500 italic">Jam {r.jam}</td>
                      <td className="px-4 py-6"><span className={`px-3 py-1 rounded-lg text-[10px] font-black ${CLASS_COLORS[r.id_kelas]}`}>{r.id_kelas}</span></td>
                      <td className="px-4 py-6 text-xs font-black uppercase tracking-tight">{r.nama_guru}</td>
                      <td className="px-8 py-6"><span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase ${r.status === AttendanceStatus.HADIR ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>{r.status}</span></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'permits' && (
        <div className="max-w-4xl mx-auto space-y-8 animate-in slide-in-from-bottom-6">
           <div className="bg-white p-10 rounded-[40px] border border-slate-100 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 p-10 opacity-5 -rotate-12"><ShieldCheck size={120}/></div>
              <h3 className="text-sm font-black uppercase italic mb-8 flex items-center gap-4"><ShieldCheck size={24} className="text-indigo-600"/> Input Izin / Sakit Guru</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 relative z-10">
                 <div><label className="text-[10px] font-black text-slate-400 mb-2 block uppercase italic">Tanggal Kejadian</label><input type="date" className="w-full bg-slate-50 border border-slate-100 px-6 py-4 rounded-2xl font-black text-xs outline-none focus:bg-white" value={permitForm.date} onChange={e => setPermitForm({...permitForm, date: e.target.value, affected_jams: []})}/></div>
                 <div><label className="text-[10px] font-black text-slate-400 mb-2 block uppercase italic">Pilih Guru Berhalangan</label><select className="w-full bg-slate-50 border border-slate-100 px-6 py-4 rounded-2xl font-black text-xs outline-none focus:bg-white uppercase" value={permitForm.teacherId} onChange={e => setPermitForm({...permitForm, teacherId: e.target.value})}><option value="">-- Pilih Guru --</option>{teachers.map(t => <option key={t.id} value={t.id}>{t.nama}</option>)}</select></div>
                 <div><label className="text-[10px] font-black text-slate-400 mb-2 block uppercase italic">Status Kehadiran</label><select className="w-full bg-slate-50 border border-slate-100 px-6 py-4 rounded-2xl font-black text-xs outline-none focus:bg-white" value={permitForm.status} onChange={e => setPermitForm({...permitForm, status: e.target.value as any})}><option value={AttendanceStatus.IZIN}>IZIN</option><option value={AttendanceStatus.SAKIT}>SAKIT</option></select></div>
                 <div><label className="text-[10px] font-black text-slate-400 mb-2 block uppercase italic">Jangkauan Waktu</label><select className="w-full bg-slate-50 border border-slate-100 px-6 py-4 rounded-2xl font-black text-xs outline-none focus:bg-white" value={permitForm.type} onChange={e => setPermitForm({...permitForm, type: e.target.value as any, affected_jams: []})}><option value="FULL_DAY">SATU HARI PENUH</option><option value="SPECIFIC_HOURS">JAM TERTENTU SAJA</option></select></div>
              </div>
              {permitForm.type === 'SPECIFIC_HOURS' && (
                <div className="bg-slate-50 p-8 rounded-3xl border border-slate-100 mb-8 animate-in zoom-in-95">
                   <p className="text-[10px] font-black text-slate-400 mb-5 uppercase flex items-center gap-2 italic"><Clock size={14}/> Pilih Jam Mengajar Yang Terdampak:</p>
                   <div className="grid grid-cols-4 md:grid-cols-8 gap-3">
                      {getPeriodsForDate(permitForm.date).map(jam => (
                        <label key={jam} className={`flex flex-col items-center p-4 rounded-2xl border cursor-pointer transition-all ${permitForm.affected_jams.includes(jam) ? 'bg-indigo-600 text-white border-indigo-700 shadow-lg' : 'bg-white text-slate-400 border-slate-200'}`}>
                           <input type="checkbox" className="hidden" checked={permitForm.affected_jams.includes(jam)} onChange={e => { const updated = e.target.checked ? [...permitForm.affected_jams, jam] : permitForm.affected_jams.filter(j => j !== jam); setPermitForm({...permitForm, affected_jams: updated}); }}/>
                           <span className="text-xs font-black uppercase">Jam {jam}</span>
                        </label>
                      ))}
                   </div>
                </div>
              )}
              <button onClick={handleApplyPermit} className="w-full bg-indigo-600 text-white font-black py-6 rounded-3xl shadow-xl hover:bg-indigo-700 transition-all text-[11px] uppercase tracking-widest flex items-center justify-center gap-4 active:scale-95"><Save size={20}/> Terbitkan Laporan Izin</button>
           </div>
        </div>
      )}

      {activeTab === 'teachers' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-6">
           <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-2xl">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                 <h3 className="text-sm font-black uppercase italic flex items-center gap-3"><Users size={24} className="text-indigo-600"/> Data Guru Tersinkron</h3>
                 <div className="relative"><Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18}/><input type="text" placeholder="CARI NAMA GURU..." className="pl-12 pr-6 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-[10px] font-black uppercase outline-none focus:bg-white focus:ring-4 focus:ring-indigo-50 min-w-[280px]" value={searchTeacher} onChange={e => setSearchTeacher(e.target.value)}/></div>
              </div>
              <div className="overflow-x-auto">
                 <table className="w-full text-left">
                    <thead><tr className="border-b border-slate-50"><th className="px-4 py-5 text-[9px] font-black text-slate-400 uppercase tracking-widest italic">Kode</th><th className="px-4 py-5 text-[9px] font-black text-slate-400 uppercase tracking-widest italic">Nama Lengkap</th><th className="px-4 py-5 text-[9px] font-black text-slate-400 uppercase tracking-widest italic">Mata Pelajaran</th></tr></thead>
                    <tbody className="divide-y divide-slate-50">
                       {teachers.filter(t => t.nama.toLowerCase().includes(searchTeacher.toLowerCase())).map(t => (
                         <tr key={t.id} className="hover:bg-slate-50/50">
                            <td className="px-4 py-5"><span className="text-[10px] font-black px-2 py-1 bg-slate-100 rounded-md">{t.id}</span></td>
                            <td className="px-4 py-5 text-xs font-black uppercase text-slate-800 tracking-tight">{t.nama}</td>
                            <td className="px-4 py-5"><div className="flex flex-wrap gap-2">{t.mapel.map((m, i) => <span key={i} className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-[9px] font-black uppercase tracking-tighter">{m}</span>)}</div></td>
                         </tr>
                       ))}
                    </tbody>
                 </table>
              </div>
           </div>
        </div>
      )}

      {activeTab === 'schedule' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-6">
           <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-2xl">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                 <h3 className="text-sm font-black uppercase italic flex items-center gap-3"><BookText size={24} className="text-indigo-600"/> Jadwal Pelajaran Aktif</h3>
                 <div className="flex bg-slate-100 p-1 rounded-2xl">
                    {['SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUM\'AT', 'SABTU'].map(day => (
                      <button key={day} onClick={() => setScheduleDay(day)} className={`px-4 py-2.5 rounded-xl text-[9px] font-black uppercase transition-all ${scheduleDay === day ? 'bg-white text-indigo-600 shadow-xl' : 'text-slate-400'}`}>{day.slice(0,3)}</button>
                    ))}
                 </div>
              </div>
              <div className="overflow-x-auto">
                 <table className="w-full text-left">
                    <thead><tr className="border-b border-slate-50"><th className="px-4 py-5 text-[9px] font-black text-slate-400 uppercase tracking-widest italic">Jam</th><th className="px-4 py-5 text-[9px] font-black text-slate-400 uppercase tracking-widest italic">Waktu</th><th className="px-4 py-5 text-[9px] font-black text-slate-400 uppercase tracking-widest italic">Kegiatan</th><th className="px-4 py-5 text-[9px] font-black text-slate-400 uppercase tracking-widest italic">Mapping Kelas</th></tr></thead>
                    <tbody className="divide-y divide-slate-50">
                       {schedule.filter(s => s.hari === scheduleDay).map((s, idx) => (
                         <tr key={idx} className="hover:bg-slate-50/50">
                            <td className="px-4 py-5 text-xs font-black italic">{s.jam}</td>
                            <td className="px-4 py-5 text-[10px] font-bold text-slate-400">{s.waktu}</td>
                            <td className="px-4 py-5 text-xs font-black uppercase italic tracking-tight">{s.kegiatan}</td>
                            <td className="px-4 py-5">
                               <div className="flex flex-wrap gap-2">
                                  {Object.entries(s.mapping).slice(0, 4).map(([cls, map]) => (
                                    <div key={cls} className="px-3 py-1 bg-slate-50 border border-slate-100 rounded-lg flex flex-col items-center">
                                       <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">{cls}</span>
                                       <span className="text-[10px] font-black uppercase leading-none">{map.split('-')[0]}</span>
                                    </div>
                                  ))}
                                  {Object.keys(s.mapping).length > 4 && <span className="text-[10px] font-black self-center text-slate-300">+{Object.keys(s.mapping).length - 4} More</span>}
                               </div>
                            </td>
                         </tr>
                       ))}
                    </tbody>
                 </table>
              </div>
           </div>
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="max-w-4xl mx-auto space-y-8 animate-in slide-in-from-bottom-6">
           <div className={`p-8 rounded-[40px] border flex flex-col md:flex-row items-center md:items-start gap-8 shadow-2xl bg-emerald-50 border-emerald-100`}>
              <div className={`p-6 rounded-[32px] shadow-xl flex items-center justify-center bg-white text-emerald-600`}>
                 <Wifi size={40}/>
              </div>
              <div className="flex-1 text-center md:text-left">
                 <div className="flex flex-col md:flex-row md:items-center gap-3 mb-4">
                    <h4 className={`font-black text-sm uppercase italic tracking-widest text-emerald-800`}>Konektivitas Cloud: TERHUBUNG</h4>
                 </div>
                 <p className={`text-xs font-bold uppercase tracking-tight mb-4 leading-relaxed text-emerald-600/70`}>
                   Database utama SMPN 3 Pacet aktif di Google Spreadsheet API v4. Semua perubahan disinkronkan ke dokumen pusat sekolah.
                 </p>
              </div>
           </div>

           <div className="bg-white p-12 rounded-[40px] border border-slate-100 shadow-2xl space-y-12">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                 <div>
                    <label className="text-[10px] font-black text-slate-400 mb-3 block uppercase tracking-[0.2em] italic">Tahun Pelajaran Berjalan</label>
                    <input className="w-full bg-slate-50 border border-slate-100 px-8 py-5 rounded-3xl text-sm font-black outline-none focus:bg-white focus:ring-4 focus:ring-indigo-50" value={settings.tahunPelajaran} onChange={e => setSettings(prev => ({...prev, tahunPelajaran: e.target.value}))}/>
                 </div>
                 <div>
                    <label className="text-[10px] font-black text-slate-400 mb-3 block uppercase tracking-[0.2em] italic">Semester Akademik</label>
                    <select className="w-full bg-slate-50 border border-slate-100 px-8 py-5 rounded-3xl text-sm font-black outline-none focus:bg-white focus:ring-4 focus:ring-indigo-50 uppercase" value={settings.semester} onChange={e => setSettings(prev => ({...prev, semester: e.target.value as any}))}>
                      <option value="Ganjil">SEMESTER GANJIL</option>
                      <option value="Genap">SEMESTER GENAP</option>
                    </select>
                 </div>
              </div>
              <div className="pt-12 border-t border-slate-50 flex flex-col md:flex-row items-center gap-10">
                <div className="p-8 bg-indigo-50 text-indigo-600 rounded-[40px] shrink-0 shadow-lg">
                   <RefreshCw size={40} className={isRestoring ? 'animate-spin' : ''}/>
                </div>
                <div className="flex-1 text-center md:text-left">
                   <h4 className="font-black text-xs uppercase italic mb-3 tracking-widest">Master Cloud Sync</h4>
                   <p className="text-[10px] text-slate-400 mb-8 font-black uppercase leading-relaxed italic tracking-wider">
                      Opsi untuk memulihkan atau memindahkan data dasar aplikasi ke Spreadsheet sekolah.
                   </p>
                   <button onClick={handleRestoreDefaults} disabled={isRestoring} className="bg-slate-900 text-white text-[11px] font-black uppercase px-12 py-5 rounded-3xl hover:bg-slate-800 transition-all shadow-2xl active:scale-95">
                      Sinkronkan Master Data Ke Cloud
                   </button>
                </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;