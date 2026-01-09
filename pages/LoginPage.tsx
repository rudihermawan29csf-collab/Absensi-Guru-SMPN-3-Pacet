import React, { useState } from 'react';
import { UserRole, User, Teacher } from './types';
import { CLASSES } from '../constants';
import { School, AlertCircle, ShieldCheck, UserCircle, Users, Lock } from 'lucide-react';

interface LoginPageProps {
  onLogin: (user: User) => void;
  teachers: Teacher[];
}

const LoginPage: React.FC<LoginPageProps> = ({ onLogin, teachers }) => {
  const [role, setRole] = useState<UserRole>(UserRole.KETUA_KELAS);
  const [selectedId, setSelectedId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (role === UserRole.ADMIN) {
      if (password === 'admin123') {
        onLogin({ id: 'admin1', nama: 'Admin Utama', role: UserRole.ADMIN, email: 'admin@smpn3pacet.sch.id' });
      } else setError('Password Admin salah!');
      return;
    }

    if (role === UserRole.GURU) {
      const teacher = teachers.find(t => t.id === selectedId);
      if (teacher && password === 'guru123') {
        onLogin({ id: teacher.id, nama: teacher.nama, role: UserRole.GURU, email: `${teacher.id.toLowerCase()}@smpn3pacet.sch.id` });
      } else setError('Password Guru salah!');
      return;
    }

    if (role === UserRole.KETUA_KELAS) {
      const classObj = CLASSES.find(c => c.id === selectedId);
      if (classObj && password === 'ketua123') {
        onLogin({ id: `ketua-${selectedId}`, nama: `Ketua Kelas ${classObj.nama}`, role: UserRole.KETUA_KELAS, kelas: selectedId, email: 'ketua@student.id' });
      } else setError('Password Kelas salah!');
      return;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-sans">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex p-4 rounded-2xl bg-indigo-600 text-white shadow-lg mb-4">
            <School size={40} />
          </div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight uppercase italic">Kehadiran Guru <span className="text-indigo-600 block text-xs not-italic tracking-widest font-bold mt-1">DI KELAS</span></h1>
          <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] mt-2 italic">SMPN 3 Pacet</p>
        </div>

        <div className="bg-white rounded-[32px] shadow-2xl border border-slate-100 overflow-hidden">
          <div className="flex bg-slate-50 border-b border-slate-100 p-1">
            {[
              { id: UserRole.KETUA_KELAS, label: 'Siswa', icon: <Users size={14}/> },
              { id: UserRole.GURU, label: 'Guru', icon: <UserCircle size={14}/> },
              { id: UserRole.ADMIN, label: 'Admin', icon: <ShieldCheck size={14}/> }
            ].map((tab) => (
              <button 
                key={tab.id}
                onClick={() => { setRole(tab.id); setSelectedId(''); }}
                className={`flex-1 flex items-center justify-center gap-2 py-4 text-[10px] font-black uppercase rounded-2xl transition-all ${role === tab.id ? 'bg-white text-indigo-600 shadow-xl' : 'text-slate-400 hover:text-slate-600'}`}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>

          <form onSubmit={handleLogin} className="p-10 space-y-6">
            {error && (
              <div className="bg-rose-50 border border-rose-100 text-rose-600 px-4 py-3 rounded-xl flex items-center gap-3 text-[10px] font-black uppercase tracking-widest">
                <AlertCircle size={18} /> {error}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-black text-slate-400 mb-2 px-1 uppercase tracking-widest italic">Identitas Pengguna</label>
                {role === UserRole.ADMIN ? (
                   <div className="w-full px-6 py-4 rounded-2xl bg-slate-50 border border-slate-100 text-slate-500 text-xs font-black flex items-center gap-3 italic">
                      <ShieldCheck size={18} className="text-indigo-500" /> administrator_system
                   </div>
                ) : (
                  <select 
                    required
                    className="w-full px-6 py-4 rounded-2xl bg-slate-50 border border-slate-100 focus:bg-white focus:ring-4 focus:ring-indigo-50 outline-none transition-all text-xs font-black text-slate-700 uppercase"
                    value={selectedId}
                    onChange={(e) => setSelectedId(e.target.value)}
                  >
                    <option value="">-- PILIH {role === UserRole.GURU ? 'GURU' : 'KELAS'} --</option>
                    {role === UserRole.GURU 
                      ? teachers.map(t => <option key={t.id} value={t.id}>{t.nama}</option>)
                      : CLASSES.map(c => <option key={c.id} value={c.id}>{c.nama}</option>)
                    }
                  </select>
                )}
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 mb-2 px-1 uppercase tracking-widest italic">Kata Sandi</label>
                <div className="relative">
                  <Lock className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                  <input 
                    type="password" 
                    required
                    className="w-full pl-14 pr-6 py-4 rounded-2xl bg-slate-50 border border-slate-100 focus:bg-white focus:ring-4 focus:ring-indigo-50 outline-none transition-all text-xs font-black text-slate-700"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <button type="submit" className="w-full bg-indigo-600 text-white hover:bg-indigo-700 font-black py-5 rounded-2xl shadow-xl shadow-indigo-200 transition-all text-[11px] uppercase tracking-widest mt-4 active:scale-95">
              Masuk Sistem
            </button>
          </form>
        </div>
        
        <p className="text-center text-slate-400 text-[9px] font-black mt-8 uppercase tracking-[0.3em] italic">
          &copy; {new Date().getFullYear()} SMPN 3 Pacet Cloud Platform
        </p>
      </div>
    </div>
  );
};

export default LoginPage;