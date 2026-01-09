
import React, { useState, useMemo } from 'react';
// Fix: Correct path to types.ts in same directory
import { User, AttendanceRecord, AttendanceStatus, Teacher, AppSettings, ScheduleEntry } from './types';
import { CLASSES, MAPEL_NAME_MAP, TEACHER_COLORS } from '../constants';
import { Link } from 'react-router-dom';
import { Plus, Coffee, Filter } from 'lucide-react';
import { ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';

interface KetuaKelasDashboardProps {
  user: User;
  data: AttendanceRecord[];
  teachers: Teacher[];
  settings: AppSettings;
  schedule: ScheduleEntry[];
}

type TimeFilter = 'harian' | 'mingguan' | 'bulanan' | 'semester';

const KetuaKelasDashboard: React.FC<KetuaKelasDashboardProps> = ({ user, data, teachers, settings, schedule }) => {
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('harian');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1 < 10 ? `0${new Date().getMonth() + 1}` : `${new Date().getMonth() + 1}`);
  
  const classInfo = (CLASSES || []).find(c => c.id === user.kelas);
  const todayStr = new Date().toISOString().split('T')[0];
  const todayEvent = (settings?.events || []).find(e => e.tanggal === todayStr);
  const isHoliday = todayEvent?.tipe === 'LIBUR';

  const semesterMonths = useMemo(() => {
    return (settings?.semester === 'Ganjil')
      ? [{ v: '07', n: 'Juli' }, { v: '08', n: 'Agustus' }, { v: '09', n: 'September' }, { v: '10', n: 'Oktober' }, { v: '11', n: 'November' }, { v: '12', n: 'Desember' }]
      : [{ v: '01', n: 'Januari' }, { v: '02', n: 'Februari' }, { v: '03', n: 'Maret' }, { v: '04', n: 'April' }, { v: '05', n: 'Mei' }, { v: '06', n: 'Juni' }];
  }, [settings?.semester]);

  const filteredRecords = useMemo(() => {
    if (!Array.isArray(data)) return [];
    const now = new Date();
    return data.filter(d => d.id_kelas === user.kelas).filter(record => {
      const recordDate = new Date(record.tanggal);
      if (timeFilter === 'harian') return record.tanggal === now.toISOString().split('T')[0];
      if (timeFilter === 'mingguan') return (now.getTime() - recordDate.getTime()) <= 7 * 24 * 60 * 60 * 1000;
      if (timeFilter === 'bulanan') {
        const monthStr = recordDate.getMonth() + 1 < 10 ? `0${recordDate.getMonth() + 1}` : `${recordDate.getMonth() + 1}`;
        return monthStr === selectedMonth && recordDate.getFullYear() === now.getFullYear();
      }
      return true;
    });
  }, [data, user.kelas, timeFilter, selectedMonth]);

  const teacherPerformance = useMemo(() => {
    const perf: Record<string, any> = {};
    filteredRecords.forEach(r => {
      if (!perf[r.nama_guru]) perf[r.nama_guru] = { name: r.nama_guru, Hadir: 0, Izin: 0, Sakit: 0, Alpha: 0 };
      const key = r.status === AttendanceStatus.TIDAK_HADIR ? 'Alpha' : r.status;
      if (perf[r.nama_guru][key] !== undefined) perf[r.nama_guru][key]++;
    });
    return Object.values(perf);
  }, [filteredRecords]);

  const days = ['MINGGU', 'SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUM\'AT', 'SABTU'];
  const today = days[new Date().getDay()];
  const todaySchedule = (schedule || []).filter(s => s.hari === today);

  return (
    <div className="space-y-8 max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-6 duration-700">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
        <div>
          <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-2 block italic">TP {settings?.tahunPelajaran} • {settings?.semester}</span>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight leading-none italic">Kelas {classInfo?.nama}</h1>
          <p className="text-slate-400 font-bold text-[11px] uppercase tracking-[0.2em] mt-2">{today}, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
        </div>
        {!isHoliday && (
          <Link to="/absen" className="bg-slate-900 text-white font-black px-10 py-5 rounded-[22px] shadow-2xl transition-all text-[10px] uppercase tracking-widest flex items-center gap-3 active:scale-95"><Plus size={18} /> Kelola Presensi</Link>
        )}
      </div>

      <div className="bg-white rounded-[40px] border border-slate-100 shadow-2xl p-8 lg:p-12">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-12">
           <div className="flex items-center gap-4"><Filter size={24} className="text-indigo-600"/><h3 className="text-sm font-black text-slate-900 uppercase italic">Performa Guru di Kelas</h3></div>
           <div className="flex flex-wrap gap-4">
              <div className="flex bg-slate-100 p-1.5 rounded-2xl">
                {(['harian', 'mingguan', 'bulanan', 'semester'] as TimeFilter[]).map(f => (
                  <button key={f} onClick={() => setTimeFilter(f)} className={`px-5 py-2.5 text-[10px] font-black uppercase rounded-xl transition-all ${timeFilter === f ? 'bg-white text-indigo-600 shadow-xl' : 'text-slate-500'}`}>{f}</button>
                ))}
              </div>
              {timeFilter === 'bulanan' && (
                 <select value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className="bg-white border border-slate-100 px-4 py-2 rounded-xl text-[10px] font-black uppercase outline-none shadow-sm">
                    {semesterMonths.map(m => <option key={m.v} value={m.v}>{m.n}</option>)}
                 </select>
              )}
           </div>
        </div>

        {isHoliday && timeFilter === 'harian' ? (
           <div className="py-20 text-center flex flex-col items-center">
              <div className="w-24 h-24 bg-rose-50 text-rose-600 rounded-[32px] flex items-center justify-center mb-6 shadow-xl animate-bounce"><Coffee size={40} /></div>
              <h3 className="text-2xl font-black text-slate-900 uppercase italic">Hari Libur</h3>
              <p className="text-slate-400 font-bold text-xs mt-3 uppercase tracking-widest">{todayEvent?.nama || 'Libur Sekolah'}</p>
           </div>
        ) : (
          <div className="h-96">
             <ResponsiveContainer width="100%" height="100%">
                <BarChart data={teacherPerformance}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 'black'}} axisLine={false} tickLine={false} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 'black'}} />
                  <Tooltip cursor={{fill: '#f8fafc'}} />
                  <Legend iconType="circle" />
                  <Bar dataKey="Hadir" fill="#10b981" radius={[4, 4, 0, 0]} barSize={20} />
                  <Bar dataKey="Izin" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={20} />
                  <Bar dataKey="Sakit" fill="#f59e0b" radius={[4, 4, 0, 0]} barSize={20} />
                  <Bar dataKey="Alpha" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={20} />
                </BarChart>
             </ResponsiveContainer>
          </div>
        )}
      </div>

      {!isHoliday && (
        <div className="bg-white rounded-[40px] border border-slate-100 shadow-2xl overflow-hidden">
          <div className="p-8 border-b border-slate-50 bg-slate-50/50 flex items-center justify-between">
            <h3 className="text-xs font-black text-slate-900 uppercase italic">Live Jadwal Kelas</h3>
            {todayEvent?.tipe === 'KEGIATAN' && (
               <div className="bg-amber-50 text-amber-700 px-4 py-2 rounded-xl text-[10px] font-black border border-amber-100">{todayEvent.nama}</div>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50/30">
                <tr><th className="px-8 py-6 text-left text-[9px] font-black text-slate-300 uppercase">Jam</th><th className="px-4 py-6 text-left text-[9px] font-black text-slate-300 uppercase">Waktu</th><th className="px-4 py-6 text-left text-[9px] font-black text-slate-300 uppercase">Pelajaran</th><th className="px-8 py-6 text-left text-[9px] font-black text-slate-300 uppercase">Guru & Status</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {todaySchedule.map(item => {
                  const mapping = (item.mapping && item.mapping[user.kelas || '']) || '';
                  const [mapel, teacherId] = mapping.includes('-') ? mapping.split('-') : [mapping, ''];
                  const teacher = (teachers || []).find(t => t.id === teacherId);
                  const recorded = (data || []).find(d => d.tanggal === todayStr && d.id_kelas === user.kelas && d.jam === item.jam);
                  return (
                    <tr key={item.jam} className={`group hover:bg-slate-50/50 transition-all ${item.kegiatan !== 'KBM' ? 'opacity-40' : ''}`}>
                      <td className="px-8 py-7"><span className="w-10 h-10 rounded-[14px] bg-slate-100 flex items-center justify-center text-[11px] font-black text-slate-400">{item.jam}</span></td>
                      <td className="px-4 py-7"><span className="text-[11px] font-black text-slate-400">{item.waktu}</span></td>
                      <td className="px-4 py-7">{item.kegiatan === 'KBM' ? <span className="text-[13px] font-black uppercase text-slate-800 tracking-tight">{MAPEL_NAME_MAP[mapel] || mapel}</span> : <span className="text-[10px] font-black italic">{item.kegiatan}</span>}</td>
                      <td className="px-8 py-7">
                         {item.kegiatan === 'KBM' && mapping && (
                           <div className="flex flex-col gap-2">
                              <div className={`px-4 py-2 rounded-xl border text-[11px] font-black uppercase ${teacher ? TEACHER_COLORS[teacher.id] : ''}`}>{teacher?.nama || teacherId || 'Tanpa Nama'}</div>
                              {recorded && <span className={`text-[9px] font-black uppercase ${recorded.status === AttendanceStatus.HADIR ? 'text-emerald-600' : 'text-rose-600'}`}>{recorded.status}</span>}
                           </div>
                         )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default KetuaKelasDashboard;
