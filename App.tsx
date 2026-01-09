import React, { useState, useEffect } from 'react';
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
import { WifiOff, Loader2, Database, AlertCircle, RefreshCw } from 'lucide-react';

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
    } catch {
      return null;
    }
  });

  const [attendanceData, setAttendanceData] = useState<AttendanceRecord[]>(() => {
    try {
      const saved = localStorage.getItem('spn3_attendance');
      if (!saved || saved === 'undefined' || saved === 'null') return [];
      const parsed = JSON.parse(saved);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });

  const [teachers, setTeachers] = useState<Teacher[]>(INITIAL_TEACHERS);
  const [schoolSchedule, setSchoolSchedule] = useState<ScheduleEntry[]>(INITIAL_SCHEDULE);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasError, setHasError] = useState(false);

  const loadData = async () => {
    if (!isSpreadsheetConfigured) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setHasError(false);
    try {
      const result = await spreadsheetService.getAllData();
      if (result && typeof result === 'object') {
        // Hanya timpa jika data dari cloud memiliki isi
        if (Array.isArray(result.attendance)) {
          setAttendanceData(result.attendance);
        }
        
        if (Array.isArray(result.teachers) && result.teachers.length > 0) {
          setTeachers(result.teachers);
        }
        
        if (Array.isArray(result.schedule) && result.schedule.length > 0) {
          setSchoolSchedule(result.schedule);
        }
        
        if (result.settings) {
          setSettings({
            ...DEFAULT_SETTINGS,
            ...result.settings,
            events: Array.isArray(result.settings.events) ? result.settings.events : []
          });
        }
        
        localStorage.setItem('spn3_full_data', JSON.stringify(result));
      } else if (result === null) {
        console.warn("Gagal sinkronisasi. Menggunakan cache lokal.");
        setHasError(true);
      }
    } catch (err) {
      console.error("Koneksi gagal:", err);
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (attendanceData) {
      localStorage.setItem('spn3_attendance', JSON.stringify(attendanceData));
    }
  }, [attendanceData]);

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
      const updatedAttendance = [...(attendanceData || [])];
      newRecords.forEach(rec => {
        const idx = updatedAttendance.findIndex(a => a.id === rec.id);
        if (idx > -1) updatedAttendance[idx] = rec;
        else updatedAttendance.push(rec);
      });
      setAttendanceData(updatedAttendance);

      if (isSpreadsheetConfigured) {
        const success = await spreadsheetService.saveAttendance(newRecords);
        if (!success) throw new Error("Gagal simpan ke cloud");
      }
    } catch (error) {
      console.error("Offline Save: Data disimpan secara lokal.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateConfig = async (type: 'teachers' | 'schedule' | 'settings', newData: any) => {
    if (type === 'teachers') setTeachers(newData);
    if (type === 'schedule') setSchoolSchedule(newData);
    if (type === 'settings') setSettings(newData);

    if (isSpreadsheetConfigured) {
      await spreadsheetService.updateConfig(type, newData);
    }
  };

  if (isLoading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-slate-50 text-center p-6">
        <div className="relative mb-8">
          <div className="absolute inset-0 bg-indigo-500/10 blur-3xl rounded-full animate-pulse"></div>
          <div className="w-20 h-20 bg-white rounded-3xl shadow-xl flex items-center justify-center relative z-10 border border-slate-100">
            <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
          </div>
        </div>
        <h2 className="text-slate-800 font-black text-xs uppercase tracking-[0.2em] mb-3">Memuat Sistem SIAP</h2>
        <div className="flex items-center gap-2 bg-slate-100 px-4 py-2 rounded-full">
          <Database size={12} className="text-slate-400" />
          <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest leading-none">Sinkronisasi Cloud...</p>
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
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Mengirim Data...</span>
          </div>
        </div>
      )}

      {hasError && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] w-full max-w-sm px-6">
          <div className="bg-rose-600 text-white p-4 rounded-2xl shadow-2xl flex items-center justify-between gap-4 animate-in slide-in-from-bottom-10">
            <div className="flex items-center gap-3">
              <WifiOff size={18} className="shrink-0" />
              <p className="text-[10px] font-black uppercase tracking-wider">Koneksi Gagal. Menggunakan Mode Offline.</p>
            </div>
            <button 
              onClick={loadData}
              className="bg-white/20 hover:bg-white/30 p-2 rounded-lg transition-colors"
            >
              <RefreshCw size={14} />
            </button>
          </div>
        </div>
      )}
      
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/" /> : <LoginPage onLogin={handleLogin} teachers={teachers || []} />} />
        
        <Route path="/" element={user ? <Layout user={user} onLogout={handleLogout} /> : <Navigate to="/login" />}>
          <Route index element={
            user?.role === UserRole.ADMIN ? (
              <AdminDashboard 
                data={attendanceData || []} 
                teachers={teachers || []} 
                setTeachers={(val) => {
                  const newList = typeof val === 'function' ? val(teachers || []) : val;
                  handleUpdateConfig('teachers', newList);
                }} 
                schedule={schoolSchedule || []}
                setSchedule={(val) => {
                  const newList = typeof val === 'function' ? val(schoolSchedule || []) : val;
                  handleUpdateConfig('schedule', newList);
                }}
                settings={settings || DEFAULT_SETTINGS}
                setSettings={(val) => {
                  const newSettings = typeof val === 'function' ? val(settings || DEFAULT_SETTINGS) : val;
                  handleUpdateConfig('settings', newSettings);
                }}
                onSaveAttendance={saveAttendanceBulk}
              />
            ) :
            user?.role === UserRole.GURU ? (
              <GuruDashboard user={user} data={attendanceData || []} teachers={teachers || []} settings={settings || DEFAULT_SETTINGS} />
            ) : (
              <KetuaKelasDashboard user={user} data={attendanceData || []} teachers={teachers || []} settings={settings || DEFAULT_SETTINGS} schedule={schoolSchedule || []} />
            )
          } />
          
          <Route path="absen" element={
            user?.role === UserRole.KETUA_KELAS ? 
            <AttendanceForm 
              user={user} 
              onSave={saveAttendanceBulk} 
              attendanceData={attendanceData || []} 
              teachers={teachers || []} 
              settings={settings || DEFAULT_SETTINGS}
              schedule={schoolSchedule || []}
            /> : 
            <Navigate to="/" />
          } />
        </Route>
      </Routes>
    </Router>
  );
};

export default App;