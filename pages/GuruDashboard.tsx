
import React, { useState, useMemo } from 'react';
import { User, AttendanceRecord, AttendanceStatus, Teacher, AppSettings } from '../types';
import { 
  CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, Legend
} from 'recharts';
import { BookOpen, Clock, CheckCircle, PieChart as PieIcon, TrendingUp } from 'lucide-react';

interface GuruDashboardProps {
  user: User;
  data: AttendanceRecord[];
  teachers: Teacher[];
  settings: AppSettings;
}

type TimeFilter = 'harian' | 'mingguan' | 'bulanan' | 'semester';

const GuruDashboard: React.FC<GuruDashboardProps> = ({ user, data, settings }) => {
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('bulanan');
  const [selectedWeek, setSelectedWeek] = useState('1');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1 < 10 ? `0${new Date().getMonth() + 1}` : `${new Date().getMonth() + 1}`);

  const semesterMonths = useMemo(() => {
    return settings.semester === 'Ganjil' 
      ? [{ v: '07', n: 'Juli' }, { v: '08', n: 'Agustus' }, { v: '09', n: 'September' }, { v: '10', n: 'Oktober' }, { v: '11', n: 'November' }, { v: '12', n: 'Desember' }]
      : [{ v: '01', n: 'Januari' }, { v: '02', n: 'Februari' }, { v: '03', n: 'Maret' }, { v: '04', n: 'April' }, { v: '05', n: 'Mei' }, { v: '06', n: 'Juni' }];
  }, [settings.semester]);

  const teacherRecords = useMemo(() => {
    const now = new Date();
    return data.filter(d => d.id_guru === user.id).filter(record => {
      const recordDate = new Date(record.tanggal);
      if (timeFilter === 'harian') return record.tanggal === now.toISOString().split('T')[0];
      if (timeFilter === 'mingguan') return (now.getTime() - recordDate.getTime()) <= 7 * 24 * 60 * 60 * 1000;
      if (timeFilter === 'bulanan') {
        const monthStr = recordDate.getMonth() + 1 < 10 ? `0${recordDate.getMonth() + 1}` : `${recordDate.getMonth() + 1}`;
        return monthStr === selectedMonth && recordDate.getFullYear() === now.getFullYear();
      }
      return true;
    });
  }, [data, user.id, timeFilter, selectedMonth, selectedWeek]);

  const distributionData = useMemo(() => {
    const classGroups: Record<string, any> = {};
    teacherRecords.forEach(r => {
      if (!classGroups[r.id_kelas]) classGroups[r.id_kelas] = { name: r.id_kelas, Hadir: 0, Izin: 0, Sakit: 0, Alpha: 0 };
      const statusKey = r.status === AttendanceStatus.TIDAK_HADIR ? 'Alpha' : r.status;
      classGroups[r.id_kelas][statusKey]++;
    });
    return Object.values(classGroups);
  }, [teacherRecords]);

  const presenceRate = teacherRecords.length > 0 
    ? ((teacherRecords.filter(r => r.status === AttendanceStatus.HADIR).length / teacherRecords.length) * 100).toFixed(1)
    : '0';

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-5xl mx-auto">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
             <TrendingUp size={16} className="text-emerald-500" />
             <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Akurasi: {presenceRate}%</span>
          </div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight leading-none italic">Halo, {user.nama.split(',')[0]}!</h1>
          <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest mt-2">TP {settings.tahunPelajaran} • {settings.semester}</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex bg-slate-200/50 p-1.5 rounded-2xl w-fit">
            {(['harian', 'mingguan', 'bulanan', 'semester'] as TimeFilter[]).map(f => (
              <button key={f} onClick={() => setTimeFilter(f)} className={`px-5 py-2.5 text-[10px] font-black uppercase rounded-xl transition-all ${timeFilter === f ? 'bg-white text-indigo-600 shadow-xl' : 'text-slate-500'}`}>{f}</button>
            ))}
          </div>
          {timeFilter === 'mingguan' && (
             <select value={selectedWeek} onChange={e => setSelectedWeek(e.target.value)} className="bg-white border border-slate-100 px-4 py-2 rounded-xl text-[10px] font-black uppercase outline-none shadow-sm">
                {['1','2','3','4'].map(w => <option key={w} value={w}>Minggu {w}</option>)}
             </select>
          )}
          {timeFilter === 'bulanan' && (
             <select value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className="bg-white border border-slate-100 px-4 py-2 rounded-xl text-[10px] font-black uppercase outline-none shadow-sm">
                {semesterMonths.map(m => <option key={m.v} value={m.v}>{m.n}</option>)}
             </select>
          )}
        </div>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Total Mengajar', value: teacherRecords.length, icon: <BookOpen className="text-indigo-600"/>, bg: 'bg-indigo-50' },
          { label: 'Hadir', value: teacherRecords.filter(r => r.status === AttendanceStatus.HADIR).length, icon: <CheckCircle className="text-emerald-600"/>, bg: 'bg-emerald-50' },
          { label: 'Izin/Sakit', value: teacherRecords.filter(r => r.status === AttendanceStatus.IZIN || r.status === AttendanceStatus.SAKIT).length, icon: <TrendingUp className="text-amber-600"/>, bg: 'bg-amber-50' },
          { label: 'Alpha', value: teacherRecords.filter(r => r.status === AttendanceStatus.TIDAK_HADIR).length, icon: <Clock className="text-rose-600"/>, bg: 'bg-rose-50' },
        ].map((stat, i) => (
          <div key={i} className="bg-white p-7 rounded-[28px] border border-slate-100 flex items-center gap-6 shadow-xl shadow-slate-200/40">
            <div className={`p-4 rounded-2xl ${stat.bg}`}>{stat.icon}</div>
            <div><p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">{stat.label}</p><p className="text-3xl font-black text-slate-900 mt-1">{stat.value}</p></div>
          </div>
        ))}
      </div>

      <div className="bg-white p-8 lg:p-12 rounded-[40px] shadow-2xl border border-slate-100">
        <div className="flex items-center gap-4 mb-10"><PieIcon size={24} className="text-indigo-600"/><h3 className="text-sm font-black text-slate-900 uppercase italic">Persebaran Kehadiran ({timeFilter})</h3></div>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={distributionData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 11, fontWeight: 'black'}} />
              <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 11, fontWeight: 'black'}} />
              <Tooltip cursor={{fill: '#f8fafc'}} />
              <Legend iconType="circle" />
              <Bar dataKey="Hadir" fill="#10b981" radius={[6, 6, 0, 0]} barSize={35} />
              <Bar dataKey="Izin" fill="#3b82f6" radius={[6, 6, 0, 0]} barSize={35} />
              <Bar dataKey="Sakit" fill="#f59e0b" radius={[6, 6, 0, 0]} barSize={35} />
              <Bar dataKey="Alpha" fill="#ef4444" radius={[6, 6, 0, 0]} barSize={35} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default GuruDashboard;
