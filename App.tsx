
import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { doc, onSnapshot, setDoc, collection, updateDoc, query, getDocs } from "firebase/firestore";
import { db } from './firebase';
import LoginPage from './pages/LoginPage';
import AdminDashboard from './pages/AdminDashboard';
import GuruDashboard from './pages/GuruDashboard';
import KetuaKelasDashboard from './pages/KetuaKelasDashboard';
import AttendanceForm from './pages/AttendanceForm';
import Layout from './components/Layout';
import { User, UserRole, AttendanceRecord, Teacher, AppSettings, ScheduleEntry } from './types';
import { TEACHERS as INITIAL_TEACHERS, SCHEDULE as INITIAL_SCHEDULE } from './constants';

const DEFAULT_SETTINGS: AppSettings = {
  tahunPelajaran: '2025/2026',
  semester: 'Genap',
  events: []
};

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('spn3_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [attendanceData, setAttendanceData] = useState<AttendanceRecord[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [schoolSchedule, setSchoolSchedule] = useState<ScheduleEntry[]>([]);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);

  // 1. Sinkronisasi Real-time dari Firebase
  useEffect(() => {
    // Listener Settings
    const unsubSettings = onSnapshot(doc(db, "config", "settings"), (doc) => {
      if (doc.exists()) setSettings(doc.data() as AppSettings);
      else setDoc(doc.ref, DEFAULT_SETTINGS);
    });

    // Listener Teachers
    const unsubTeachers = onSnapshot(doc(db, "config", "teachers"), (doc) => {
      if (doc.exists()) setTeachers(doc.data().list as Teacher[]);
      else setDoc(doc.ref, { list: INITIAL_TEACHERS });
    });

    // Listener Schedule
    const unsubSchedule = onSnapshot(doc(db, "config", "schedule"), (doc) => {
      if (doc.exists()) setSchoolSchedule(doc.data().list as ScheduleEntry[]);
      else setDoc(doc.ref, { list: INITIAL_SCHEDULE });
    });

    // Listener Attendance (Query semua records)
    const unsubAttendance = onSnapshot(collection(db, "attendance"), (snapshot) => {
      const records: AttendanceRecord[] = [];
      snapshot.forEach((doc) => records.push(doc.data() as AttendanceRecord));
      setAttendanceData(records);
      setIsLoading(false);
    });

    return () => {
      unsubSettings();
      unsubTeachers();
      unsubSchedule();
      unsubAttendance();
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
    try {
      for (const record of newRecords) {
        // ID Dokumen: tanggal-kelas-jam
        const docId = `${record.tanggal}-${record.id_kelas}-${record.jam}`;
        await setDoc(doc(db, "attendance", docId), record);
      }
    } catch (error) {
      console.error("Gagal menyimpan ke Firebase:", error);
      alert("Koneksi bermasalah. Data gagal dikirim ke awan.");
    }
  };

  // Wrapper untuk update config (Admin)
  const updateTeachersFirebase = (newTeachers: Teacher[] | ((prev: Teacher[]) => Teacher[])) => {
    const list = typeof newTeachers === 'function' ? newTeachers(teachers) : newTeachers;
    setDoc(doc(db, "config", "teachers"), { list });
  };

  const updateScheduleFirebase = (newSchedule: ScheduleEntry[] | ((prev: ScheduleEntry[]) => ScheduleEntry[])) => {
    const list = typeof newSchedule === 'function' ? newSchedule(schoolSchedule) : newSchedule;
    setDoc(doc(db, "config", "schedule"), { list });
  };

  const updateSettingsFirebase = (newSettings: AppSettings | ((prev: AppSettings) => AppSettings)) => {
    const data = typeof newSettings === 'function' ? newSettings(settings) : newSettings;
    setDoc(doc(db, "config", "settings"), data);
  };

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-500 font-bold text-xs uppercase tracking-widest">Menghubungkan ke Awan...</p>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/" /> : <LoginPage onLogin={handleLogin} teachers={teachers} />} />
        
        <Route path="/" element={user ? <Layout user={user} onLogout={handleLogout} /> : <Navigate to="/login" />}>
          <Route index element={
            user?.role === UserRole.ADMIN ? (
              <AdminDashboard 
                data={attendanceData} 
                teachers={teachers} 
                setTeachers={updateTeachersFirebase as any} 
                schedule={schoolSchedule}
                setSchedule={updateScheduleFirebase as any}
                settings={settings}
                setSettings={updateSettingsFirebase as any}
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
