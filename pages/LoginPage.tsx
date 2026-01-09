
import React, { useState } from 'react';
// Fix: Correct path to types.ts in same directory
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
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">SIAP GURU</h1>
          <p className="text-slate-500 text-sm font-medium mt-1">SMP Negeri 3 Pacet</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden">
          <div className="flex bg-slate-50 border-b border-slate-100 p-1">
            {[
              { id: UserRole.KETUA_KELAS, label: 'Siswa', icon: <Users size={14}/> },
              { id: UserRole.GURU, label: 'Guru', icon: <UserCircle size={14}/> },
              { id: UserRole.ADMIN, label: 'Admin', icon: <ShieldCheck size={14}/> }
            ].map((tab) => (
              <button 
                key={tab.id}
                onClick={() => { setRole(tab.id); setSelectedId(''); }}
                className={`flex-1 flex items-center justify-center gap-2 py-3 text-xs font-bold rounded-lg transition-all ${role === tab.id ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>

          <form onSubmit={handleLogin} className="p-8 space-y-5">
            {error && (
              <div className="bg-rose-50 border border-rose-100 text-rose-600 px-4 py-3 rounded-xl flex items-center gap-3 text-xs font-bold">
                <AlertCircle size={18} /> {error}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2 px-1 uppercase tracking-wider">Pilih Identitas</label>
                {role === UserRole.ADMIN ? (
                   <div className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-500 text-sm font-medium flex items-center gap-3">
                      <ShieldCheck size={18} className="text-indigo-500" /> administrator_system
                   </div>
                ) : (
                  <select 
                    required
                    className="w-full px-4 py-3 rounded-xl bg-white border border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 outline-none transition-all text-sm font-medium text-slate-700"
                    value={selectedId}
                    onChange={(e) => setSelectedId(e.target.value)}
                  >
                    <option value="">-- Pilih {role === UserRole.GURU ? 'Guru' : 'Kelas'} --</option>
                    {role === UserRole.GURU 
                      ? teachers.map(t => <option key={t.id} value={t.id}>{t.nama}</option>)
                      : CLASSES.map(c => <option key={c.id} value={c.id}>{c.nama}</option>)
                    }
                  </select>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2 px-1 uppercase tracking-wider">Kata Sandi</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input 
                    type="password" 
                    required
                    className="w-full pl-11 pr-4 py-3 rounded-xl bg-white border border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 outline-none transition-all text-sm font-medium text-slate-700"
                    placeholder="Masukkan password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <button type="submit" className="w-full bg-indigo-600 text-white hover:bg-indigo-700 font-bold py-3.5 rounded-xl shadow-lg shadow-indigo-200 transition-all text-sm mt-2">
              Masuk
            </button>
          </form>
        </div>
        
        <p className="text-center text-slate-400 text-[10px] font-medium mt-8 uppercase tracking-widest">
          &copy; {new Date().getFullYear()} SMP Negeri 3 Pacet
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
