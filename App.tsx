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

  // Inisialisasi Data dari Supabase
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
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
        setSyncStatus('synced');
      } catch (error) {
        console.error("Supabase Init Error:", error);
        setSyncStatus('error');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();

    // Subscribe Real-time
    const channelAtt = subscribeToTable('attendance', () => fetchData());
    const channelTeach = subscribeToTable('teachers', () => fetchData());
    const channelSched = subscribeToTable('schedule', () => fetchData());
    const channelConfig = subscribeToTable('config', () => fetchData());

    return () => {
      // Pastikan channel ada sebelum dihapus (untuk menangani proxy safe client)
      if (channelAtt && typeof channelAtt.unsubscribe === 'function') channelAtt.unsubscribe();
      if (channelTeach && typeof channelTeach.unsubscribe === 'function') channelTeach.unsubscribe();
      if (channelSched && typeof channelSched.unsubscribe === 'function') channelSched.unsubscribe();
      if (channelConfig && typeof channelConfig.unsubscribe === 'function') channelConfig.unsubscribe();
      
      // Fallback untuk RealtimeChannel Supabase asli
      if (channelAtt && supabase.removeChannel) supabase.removeChannel(channelAtt);
      if (channelTeach && supabase.removeChannel) supabase.removeChannel(channelTeach);
      if (channelSched && supabase.removeChannel) supabase.removeChannel(channelSched);
      if (channelConfig && supabase.removeChannel) supabase.removeChannel(channelConfig);
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

  // Simpan Data Absensi ke Supabase
  const saveAttendanceBulk = async (newRecords: AttendanceRecord[]) => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('attendance')
        .upsert(newRecords);
      
      if (error) throw error;
      setSyncStatus('synced');
    } catch (error) {
      console.error("Save Error:", error);
      setSyncStatus('error');
      throw error;
    } finally {
      setIsSaving(false);
    }
  };

  // Update Config di Supabase
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
        <div className="relative mb-8">
          <div className="absolute inset-0 bg-indigo-500/10 blur-3xl rounded-full animate-pulse"></div>
          <div className="w-20 h-20 bg-white rounded-3xl shadow-xl flex items-center justify-center relative z-10 border border-slate-100">
            <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
          </div>
        </div>
        <h2 className="text-slate-800 font-black text-xs uppercase tracking-[0.2em] mb-3">Menghubungkan Supabase Cloud</h2>
        <div className="flex items-center gap-2 bg-slate-100 px-4 py-2 rounded-full">
          <Database size={12} className="text-slate-400" />
          <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest leading-none italic">SIAP GURU SMPN 3 PACET</p>
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
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Sinkronisasi Supabase...</span>
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
            onRefresh={() => window.location.reload()} 
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
                }} 
                schedule={schoolSchedule}
                setSchedule={(val) => {
                  const newList = typeof val === 'function' ? val(schoolSchedule) : val;
                  handleUpdateConfig('schedule', newList);
                }}
                settings={settings}
                setSettings={(val) => {
                  const newSettings = typeof val === 'function' ? val(settings) : val;
                  handleUpdateConfig('settings', newSettings);
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