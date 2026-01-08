
import React, { useState, useEffect } from 'react';
import { User, AttendanceRecord, AttendanceStatus, Teacher, AppSettings, ScheduleEntry } from '../types';
import { NOTE_CHOICES, MAPEL_NAME_MAP } from '../constants';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Calendar, AlertTriangle, ShieldCheck } from 'lucide-react';

interface AttendanceFormProps {
  user: User;
  onSave: (records: AttendanceRecord[]) => void;
  attendanceData: AttendanceRecord[];
  teachers: Teacher[];
  settings: AppSettings;
  schedule: ScheduleEntry[];
}

interface BlockEntry {
  jams: string[]; 
  id_guru: string;
  nama_guru: string;
  mapel: string;
  status: AttendanceStatus;
  catatan: string;
  isAdminControlled?: boolean;
}

const AttendanceForm: React.FC<AttendanceFormProps> = ({ user, onSave, attendanceData, teachers, settings, schedule }) => {
  const navigate = useNavigate();
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [dayName, setDayName] = useState('');
  const [blocks, setBlocks] = useState<BlockEntry[]>([]);
  
  const todayEvent = settings.events.find(e => e.tanggal === date);
  const isHoliday = todayEvent?.tipe === 'LIBUR' || todayEvent?.tipe === 'KEGIATAN';

  useEffect(() => {
    const d = new Date(date);
    const dayNames = ['MINGGU', 'SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUM\'AT', 'SABTU'];
    const selectedDay = dayNames[d.getDay()];
    setDayName(selectedDay);

    const existingForDate = attendanceData.filter(a => a.tanggal === date && a.id_kelas === user.kelas);

    if (user.kelas && !isHoliday) {
      let daySchedule = schedule.filter(s => s.hari === selectedDay && s.mapping[user.kelas || ''] && s.kegiatan === 'KBM');
      
      if (todayEvent?.tipe === 'JAM_KHUSUS' && todayEvent.affected_jams) {
        daySchedule = daySchedule.filter(s => !todayEvent.affected_jams?.includes(s.jam));
      }

      const groupedBlocks: BlockEntry[] = [];
      let currentBlock: null | BlockEntry = null;

      daySchedule.forEach((s) => {
        const mappingValue = s.mapping[user.kelas || ''];
        const [mapelShort, teacherId] = mappingValue.split('-');
        const teacher = teachers.find(t => t.id === teacherId);
        const fullMapel = MAPEL_NAME_MAP[mapelShort] || mapelShort;
        
        const adminEntry = attendanceData.find(a => a.tanggal === date && a.id_guru === teacherId && a.is_admin_input);
        const existingRecord = existingForDate.find(e => e.jam === s.jam);

        if (currentBlock && currentBlock.id_guru === teacherId && currentBlock.mapel === fullMapel && currentBlock.isAdminControlled === !!adminEntry) {
          currentBlock.jams.push(s.jam);
        } else {
          currentBlock = {
            jams: [s.jam],
            id_guru: teacherId,
            nama_guru: teacher?.nama || teacherId,
            mapel: fullMapel,
            status: adminEntry ? adminEntry.status : (existingRecord ? existingRecord.status : AttendanceStatus.HADIR),
            catatan: adminEntry ? adminEntry.catatan || '' : (existingRecord ? existingRecord.catatan || 'Hadir tepat waktu' : 'Hadir tepat waktu'),
            isAdminControlled: !!adminEntry
          };
          groupedBlocks.push(currentBlock);
        }
      });
      setBlocks(groupedBlocks);
    } else setBlocks([]);
  }, [date, user.kelas, teachers, attendanceData, settings, isHoliday, schedule]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (blocks.length === 0) return;
    const recordsToSave: AttendanceRecord[] = [];
    blocks.forEach(block => {
      block.jams.forEach(jam => {
        recordsToSave.push({
          id: `${date}-${user.kelas}-${jam}`,
          id_guru: block.id_guru, nama_guru: block.nama_guru, mapel: block.mapel, id_kelas: user.kelas || '',
          tanggal: date, jam: jam, status: block.status, catatan: block.catatan, is_admin_input: block.isAdminControlled
        });
      });
    });
    onSave(recordsToSave);
    alert('Laporan berhasil disimpan!');
    navigate('/');
  };

  const getStatusColor = (status: AttendanceStatus, isActive: boolean) => {
    if (!isActive) return 'bg-slate-50 text-slate-400 border-slate-100';
    switch(status) {
      case AttendanceStatus.HADIR: return 'bg-emerald-600 text-white border-emerald-700 shadow-lg';
      case AttendanceStatus.IZIN: return 'bg-blue-600 text-white border-blue-700 shadow-lg';
      case AttendanceStatus.SAKIT: return 'bg-amber-500 text-white border-amber-600 shadow-lg';
      case AttendanceStatus.TIDAK_HADIR: return 'bg-rose-600 text-white border-rose-700 shadow-lg';
      default: return 'bg-slate-900 text-white';
    }
  };

  return (
    <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-6 duration-700">
      <div className="mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-6">
        <div className="flex items-center gap-6">
          <button onClick={() => navigate('/')} className="w-14 h-14 flex items-center justify-center bg-white rounded-[22px] shadow-lg text-slate-400 hover:text-indigo-600 transition-all border border-slate-50"><ArrowLeft size={24} /></button>
          <div><h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase italic">Input Absensi</h1><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">{dayName} • KELAS {user.kelas}</p></div>
        </div>
        <div className="bg-white px-6 py-4 rounded-[22px] border border-slate-100 flex items-center gap-4 shadow-xl">
           <Calendar className="text-indigo-600" size={20} /><input type="date" className="outline-none text-[11px] font-black text-slate-800 bg-transparent uppercase" value={date} onChange={(e) => setDate(e.target.value)}/>
        </div>
      </div>

      {isHoliday ? (
        <div className="bg-white p-24 rounded-[40px] text-center border border-slate-100 shadow-2xl">
           <AlertTriangle className="mx-auto text-amber-400 mb-6" size={80} />
           <h3 className="text-2xl font-black text-slate-900 uppercase italic">Akses Terkunci</h3>
           <p className="text-slate-400 font-bold text-sm mt-3 uppercase tracking-widest">Hari ini {todayEvent?.nama}</p>
        </div>
      ) : blocks.length > 0 ? (
        <form onSubmit={handleSubmit} className="space-y-6 pb-24">
           {blocks.map((block, idx) => (
             <div key={idx} className={`bg-white rounded-[32px] p-8 border border-slate-100 shadow-xl ${block.isAdminControlled ? 'bg-indigo-50 border-indigo-200 ring-2 ring-indigo-500/20' : ''}`}>
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                   <div className="lg:col-span-5">
                      <div className="flex items-center gap-3 mb-4">
                         <span className="bg-slate-900 text-white px-3 py-1 rounded-lg text-[9px] font-black uppercase">Jam {block.jams.join(', ')}</span>
                         {block.isAdminControlled && <span className="bg-indigo-600 text-white px-3 py-1.5 rounded-xl text-[9px] font-black uppercase flex items-center gap-2"><ShieldCheck size={12}/> Admin</span>}
                      </div>
                      <p className="text-[11px] font-black text-indigo-600 uppercase italic tracking-widest">{block.mapel}</p>
                      <h3 className="text-xl font-black text-slate-900 uppercase italic tracking-tighter">{block.nama_guru}</h3>
                   </div>
                   <div className="lg:col-span-7">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
                         {Object.values(AttendanceStatus).map(s => (
                           <button key={s} type="button" disabled={block.isAdminControlled} onClick={() => {
                               const nb = [...blocks]; nb[idx].status = s; setBlocks(nb);
                             }} className={`py-3.5 rounded-2xl text-[10px] font-black uppercase border transition-all ${getStatusColor(s, block.status === s)} ${block.isAdminControlled ? 'opacity-50' : ''}`}>{s}</button>
                         ))}
                      </div>
                      <select disabled={block.isAdminControlled} className="w-full bg-slate-50 border border-slate-100 px-5 py-3.5 rounded-2xl text-xs font-bold outline-none" value={block.catatan} onChange={e => {
                          const nb = [...blocks]; nb[idx].catatan = e.target.value; setBlocks(nb);
                        }}>
                         {NOTE_CHOICES.map(n => <option key={n} value={n}>{n}</option>)}
                      </select>
                   </div>
                </div>
             </div>
           ))}
           <div className="fixed bottom-10 left-1/2 -translate-x-1/2 w-full max-w-sm px-6 z-50">
              <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-5 rounded-[22px] shadow-2xl flex items-center justify-center gap-4 uppercase tracking-widest text-[11px] transition-all"><Save size={20} /> Simpan Laporan</button>
           </div>
        </form>
      ) : (
        <div className="bg-white p-24 rounded-[40px] text-center border border-slate-100 shadow-2xl">
           <h3 className="text-2xl font-black text-slate-900 uppercase italic">Tidak Ada Jadwal</h3>
        </div>
      )}
    </div>
  );
};

export default AttendanceForm;
