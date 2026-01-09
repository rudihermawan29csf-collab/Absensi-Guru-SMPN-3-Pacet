
import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { spreadsheetService, isSpreadsheetConfigured } from './pages/spreadsheetService';
import LoginPage from './pages/LoginPage';
import AdminDashboard from './pages/AdminDashboard';
import GuruDashboard from './pages/GuruDashboard';
import KetuaKelasDashboard from './pages/KetuaKelasDashboard';
import AttendanceForm from './pages/AttendanceForm';
import Layout from './components/Layout';
import { User, UserRole, AttendanceRecord, Teacher, AppSettings, ScheduleEntry } from './pages/types';
import { TEACHERS as INITIAL_TEACHERS, SCHEDULE as INITIAL_SCHEDULE } from './constants';
import { Loader2, Database, AlertCircle } from 'lucide-react';

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

  const fetchData = async () => {
    if (!isSpreadsheetConfigured) {
      setIsLoading(false);
      return;
    }

    try {
      const result = await spreadsheetService.getAllData();
      if (result) {
        if (result.attendance) setAttendanceData(result.attendance);
        if (result.teachers && result.teachers.length > 0) setTeachers(result.teachers);
        if (result.schedule && result.schedule.length > 0) setSchoolSchedule(result.schedule);
        if (result.settings && result.settings.length > 0) {
          const cfg = result.settings[0];
          setSettings({
            ...DEFAULT_SETTINGS,
            tahunPelajaran: cfg.tahunPelajaran,
            semester: cfg.semester,
            events: result.events || []
          });
        }
        setLastSync(new Date());
        setSyncStatus('synced');
      }
    } catch (error) {
      console.error("Fetch Error:", error);
      setSyncStatus('error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
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
      for (const rec of newRecords) {
        await spreadsheetService.saveRecord('attendance', rec);
      }
      // Update local state
      setAttendanceData(prev => {
        const updated = [...prev];
        newRecords.forEach(rec => {
          const idx = updated.findIndex(u => u.id === rec.id);
          if (idx !== -1) updated[idx] = rec;
          else updated.push(rec);
        });
        return updated;
      });
      setSyncStatus('synced');
      setLastSync(new Date());
    } catch (error: any) {
      console.error("Save Error:", error);
      setSyncStatus('error');
      throw new Error("Gagal menyimpan ke Spreadsheet");
    } finally {
      setIsSaving(false);
    }
  };

  if (!isSpreadsheetConfigured) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-slate-50 p-6 text-center">
        <AlertCircle className="w-16 h-16 text-rose-500 mb-4" />
        <h2 className="text-xl font-black text-slate-900 uppercase italic">Spreadsheet Belum Dikonfigurasi</h2>
        <p className="text-slate-500 mt-2 max-w-md">Harap isi URL Web App Spreadsheet Anda di file <code>pages/spreadsheetService.ts</code> untuk mengaktifkan database.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-slate-50 text-center p-6">
        <div className="w-20 h-20 bg-white rounded-3xl shadow-xl flex items-center justify-center border border-slate-100 mb-8">
          <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
        </div>
        <h2 className="text-slate-800 font-black text-xs uppercase tracking-[0.2em] mb-3">
          Sinkronisasi Spreadsheet...
        </h2>
        <div className="flex items-center gap-2 bg-slate-100 px-4 py-2 rounded-full">
          <Database size={12} className="text-slate-400" />
          <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest leading-none italic">
            SIAP GURU LIVE DATABASE
          </p>
        </div>
      </div>
    );
  }

  return (
    <Router>
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
                setTeachers={() => {}} // Admin logic to update via sheet
                schedule={schoolSchedule}
                setSchedule={() => {}}
                settings={settings}
                setSettings={() => {}}
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
