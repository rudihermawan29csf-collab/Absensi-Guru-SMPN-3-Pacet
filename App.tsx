import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { supabase, subscribeToTable } from './supabase';
import LoginPage from './pages/LoginPage';
import AdminDashboard from './pages/AdminDashboard';
import GuruDashboard from './pages/GuruDashboard';
import KetuaKelasDashboard from './pages/KetuaKelasDashboard';
import AttendanceForm from './pages/AttendanceForm';
import Layout from './components/Layout';
import { User, UserRole, AttendanceRecord, Teacher, AppSettings, ScheduleEntry } from './pages/types';
import { TEACHERS as INITIAL_TEACHERS, SCHEDULE as INITIAL_SCHEDULE } from './constants';
import { Loader2, Database } from 'lucide-react';

const DEFAULT_SETTINGS: AppSettings = {
  tahunPelajaran: '2025/2026',
  semester: 'Genap',
  events: []
};

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem('spn3_user');
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });

  const [attendanceData, setAttendanceData] = useState<AttendanceRecord[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>(INITIAL_TEACHERS);
  const [schoolSchedule, setSchoolSchedule] = useState<ScheduleEntry[]>(INITIAL_SCHEDULE);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'offline' | 'error'>('synced');
  const [lastSync, setLastSync] = useState<Date | null>(null);

  const isLocalMode = (supabase as any).isLocal;

  const fetchData = async () => {
    try {
      const [
        { data: attData }, 
        { data: teachData }, 
        { data: schedData }, 
        { data: configData }
      ] = await Promise.all([
        supabase.from('attendance').select('*'),
        supabase.from('teachers').select('*'),
        supabase.from('schedule').select('*'),
        supabase.from('config').select('*').eq('id', 'settings').single()
      ]);

      if (attData) setAttendanceData(attData);
      if (teachData && teachData.length > 0) setTeachers(teachData);
      if (schedData && schedData.length > 0) setSchoolSchedule(schedData);
      if (configData) setSettings(configData.data as AppSettings);

      setLastSync(new Date());
      setSyncStatus(isLocalMode ? 'offline' : 'synced');
    } catch (error) {
      console.error("Fetch Error:", error);
      setSyncStatus('error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const channelAtt = subscribeToTable('attendance', () => fetchData());
    return () => {
      if (channelAtt && typeof channelAtt.unsubscribe === 'function') channelAtt.unsubscribe();
    };
  }, []);

  const handleLogin = (newUser: User) => {
    setUser(newUser);
    localStorage.setItem('spn3_user', JSON.stringify(newUser));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('spn3_user');
  };

  const saveAttendanceBulk = async (newRecords: AttendanceRecord[]) => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('attendance')
        .upsert(newRecords);
      
      if (error) throw error;
      
      setAttendanceData(prev => {
        const next = [...prev];
        newRecords.forEach(rec => {
          const idx = next.findIndex(n => n.id === rec.id);
          if (idx >= 0) next[idx] = rec;
          else next.push(rec);
        });
        return next;
      });

      setSyncStatus(isLocalMode ? 'offline' : 'synced');
      setLastSync(new Date());
    } catch (error: any) {
      console.error("Save Error:", error);
      setSyncStatus('error');
      throw new Error(error.message || "Gagal menyimpan");
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateConfig = async (type: 'teachers' | 'schedule' | 'settings', newData: any) => {
    try {
      if (type === 'settings') {
        await supabase.from('config').upsert({ id: 'settings', data: newData });
      } else {
        await supabase.from(type).upsert(newData);
      }
    } catch (error) {
      console.error("Config Update Error:", error);
    }
  };

  if (isLoading && attendanceData.length === 0) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-slate-50 text-center p-6">
        <div className="w-20 h-20 bg-white rounded-3xl shadow-xl flex items-center justify-center border border-slate-100 mb-8">
          <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
        </div>
        <h2 className="text-slate-800 font-black text-xs uppercase tracking-[0.2em] mb-3">
          {isLocalMode ? 'Memuat Database Lokal...' : 'Menghubungkan ke Cloud...'}
        </h2>
        <div className="flex items-center gap-2 bg-slate-100 px-4 py-2 rounded-full">
          <Database size={12} className="text-slate-400" />
          <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest leading-none italic">
            SIAP GURU {isLocalMode ? 'LOCAL-OFFLINE' : 'CLOUD'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <Router>
      {isSaving && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[10000]">
          <div className="bg-slate-900 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 border border-slate-800 animate-in fade-in zoom-in duration-300">
            <Loader2 size={14} className="text-indigo-400 animate-spin" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">
              {isLocalMode ? 'Menyimpan di Browser...' : 'Sinkronisasi Cloud...'}
            </span>
          </div>
        </div>
      )}
      
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/" /> : <LoginPage onLogin={handleLogin} teachers={teachers} />} />
        <Route path="/" element={user ? (
          <Layout 
            user={user} 
            onLogout={handleLogout} 
            syncStatus={syncStatus} 
            lastSync={lastSync}
            onRefresh={fetchData} 
          />
        ) : <Navigate to="/login" />}>
          <Route index element={
            user?.role === UserRole.ADMIN ? (
              <AdminDashboard 
                data={attendanceData} 
                teachers={teachers} 
                setTeachers={(val) => {
                  const newList = typeof val === 'function' ? val(teachers) : val;
                  handleUpdateConfig('teachers', newList);
                  setTeachers(newList);
                }} 
                schedule={schoolSchedule}
                setSchedule={(val) => {
                  const newList = typeof val === 'function' ? val(schoolSchedule) : val;
                  handleUpdateConfig('schedule', newList);
                  setSchoolSchedule(newList);
                }}
                settings={settings}
                setSettings={(val) => {
                  const newSettings = typeof val === 'function' ? val(settings) : val;
                  handleUpdateConfig('settings', newSettings);
                  setSettings(newSettings);
                }}
                onSaveAttendance={saveAttendanceBulk}
              />
            ) :
            user?.role === UserRole.GURU ? (
              <GuruDashboard user={user} data={attendanceData} teachers={teachers} settings={settings} />
            ) : (
              <KetuaKelasDashboard user={user} data={attendanceData} teachers={teachers} settings={settings} schedule={schoolSchedule} />
            )
          } />
          
          <Route path="absen" element={
            user?.role === UserRole.KETUA_KELAS ? 
            <AttendanceForm 
              user={user} 
              onSave={saveAttendanceBulk} 
              attendanceData={attendanceData} 
              teachers={teachers} 
              settings={settings}
              schedule={schoolSchedule}
            /> : 
            <Navigate to="/" />
          } />
        </Route>
      </Routes>
    </Router>
  );
};

export default App;