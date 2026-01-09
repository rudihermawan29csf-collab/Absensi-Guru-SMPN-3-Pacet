import React, { useState, useEffect, useCallback, useRef } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { spreadsheetService, isSpreadsheetConfigured } from './spreadsheetService';
import LoginPage from './pages/LoginPage';
import AdminDashboard from './pages/AdminDashboard';
import GuruDashboard from './pages/GuruDashboard';
import KetuaKelasDashboard from './pages/KetuaKelasDashboard';
import AttendanceForm from './pages/AttendanceForm';
import Layout from './components/Layout';
import { User, UserRole, AttendanceRecord, Teacher, AppSettings, ScheduleEntry } from './types';
import { TEACHERS as INITIAL_TEACHERS, SCHEDULE as INITIAL_SCHEDULE } from './constants';
import { WifiOff, Loader2, Database, AlertCircle, RefreshCw, Cloud } from 'lucide-react';

const DEFAULT_SETTINGS: AppSettings = {
  tahunPelajaran: '2025/2026',
  semester: 'Genap',
  events: []
};

const App: React.FC = () => {
  const isSavingRef = useRef(false);

  const [user, setUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem('spn3_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // State inisialisasi dari localStorage (Jangkar Utama)
  const [attendanceData, setAttendanceData] = useState<AttendanceRecord[]>(() => {
    try {
      const cached = localStorage.getItem('spn3_cached_data');
      if (cached) {
        const parsed = JSON.parse(cached);
        return Array.isArray(parsed.attendance) ? parsed.attendance : [];
      }
      return [];
    } catch {
      return [];
    }
  });

  const [teachers, setTeachers] = useState<Teacher[]>(() => {
    try {
      const cached = localStorage.getItem('spn3_cached_data');
      if (cached) {
        const parsed = JSON.parse(cached);
        return Array.isArray(parsed.teachers) && parsed.teachers.length > 0 ? parsed.teachers : INITIAL_TEACHERS;
      }
      return INITIAL_TEACHERS;
    } catch {
      return INITIAL_TEACHERS;
    }
  });

  const [schoolSchedule, setSchoolSchedule] = useState<ScheduleEntry[]>(() => {
    try {
      const cached = localStorage.getItem('spn3_cached_data');
      if (cached) {
        const parsed = JSON.parse(cached);
        return Array.isArray(parsed.schedule) && parsed.schedule.length > 0 ? parsed.schedule : INITIAL_SCHEDULE;
      }
      return INITIAL_SCHEDULE;
    } catch {
      return INITIAL_SCHEDULE;
    }
  });

  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const cached = localStorage.getItem('spn3_cached_data');
      if (cached) {
        const parsed = JSON.parse(cached);
        return parsed.settings || DEFAULT_SETTINGS;
      }
      return DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  });
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'offline' | 'error'>('synced');

  const loadData = useCallback(async (isManual = false) => {
    if (isSavingRef.current) return;
    if (!isSpreadsheetConfigured) {
      setIsLoading(false);
      return;
    }

    if (isManual) setSyncStatus('offline'); 
    else setIsLoading(true);

    try {
      const result = await spreadsheetService.getAllData();
      
      if (result && typeof result === 'object' && !isSavingRef.current) {
        if (Array.isArray(result.attendance)) setAttendanceData(result.attendance);
        if (Array.isArray(result.teachers) && result.teachers.length > 0) setTeachers(result.teachers);
        if (Array.isArray(result.schedule) && result.schedule.length > 0) setSchoolSchedule(result.schedule);
        if (result.settings) setSettings(result.settings);
        
        setLastSync(new Date());
        setSyncStatus('synced');
        localStorage.setItem('spn3_cached_data', JSON.stringify(result));
      }
    } catch (err) {
      console.warn("Gagal menarik data cloud, menggunakan data lokal.");
      setSyncStatus('error');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    // Interval 5 menit untuk sinkronisasi otomatis
    const interval = setInterval(() => loadData(true), 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [loadData]);

  const handleLogin = (newUser: User) => {
    setUser(newUser);
    localStorage.setItem('spn3_user', JSON.stringify(newUser));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('spn3_user');
  };

  const saveAttendanceBulk = async (newRecords: AttendanceRecord[]) => {
    // 1. LANGSUNG SIMPAN KE LOKAL (Instant UX)
    setIsSaving(true);
    isSavingRef.current = true;
    
    let updatedAttendance: AttendanceRecord[] = [];
    setAttendanceData(prev => {
      const updated = [...prev];
      newRecords.forEach(rec => {
        const idx = updated.findIndex(a => a.id === rec.id);
        if (idx > -1) updated[idx] = rec;
        else updated.push(rec);
      });
      updatedAttendance = updated;
      return updated;
    });

    const currentCache = JSON.parse(localStorage.getItem('spn3_cached_data') || '{}');
    localStorage.setItem('spn3_cached_data', JSON.stringify({
      ...currentCache,
      attendance: updatedAttendance
    }));

    // 2. KIRIM KE CLOUD DI LATAR BELAKANG
    try {
      // Kita tidak melempar error meskipun jaringan bermasalah di sini,
      // karena data sudah aman di localStorage.
      const success = await spreadsheetService.saveAttendance(newRecords);
      
      if (success) {
        setSyncStatus('synced');
        setLastSync(new Date());
      } else {
        setSyncStatus('offline');
      }
    } catch (error) {
      setSyncStatus('offline');
    } finally {
      // Delay visual agar user tahu ada proses 'sinkronisasi'
      setTimeout(() => {
        setIsSaving(false);
        isSavingRef.current = false;
      }, 2000);
    }
  };

  const handleUpdateConfig = async (type: 'teachers' | 'schedule' | 'settings', newData: any) => {
    if (type === 'teachers') setTeachers(newData);
    if (type === 'schedule') setSchoolSchedule(newData);
    if (type === 'settings') setSettings(newData);

    const currentCache = JSON.parse(localStorage.getItem('spn3_cached_data') || '{}');
    localStorage.setItem('spn3_cached_data', JSON.stringify({
      ...currentCache,
      [type]: newData
    }));

    if (isSpreadsheetConfigured) {
      await spreadsheetService.updateConfig(type, newData);
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
        <h2 className="text-slate-800 font-black text-xs uppercase tracking-[0.2em] mb-3">Memuat Sistem</h2>
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
            <RefreshCw size={14} className="text-indigo-400 animate-spin" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Sinkronisasi...</span>
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
            onRefresh={() => loadData(true)}
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