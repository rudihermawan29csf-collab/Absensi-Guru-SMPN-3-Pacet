import React, { useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { User, UserRole } from '../pages/types';
import { 
  LayoutDashboard, 
  ClipboardCheck, 
  LogOut, 
  User as UserIcon, 
  Menu, 
  School,
  Cloud,
  RefreshCw,
  CloudOff,
  Database
} from 'lucide-react';

interface LayoutProps {
  user: User;
  onLogout: () => void;
  syncStatus: 'synced' | 'offline' | 'error';
  lastSync: Date | null;
  onRefresh: () => void;
}

const Layout: React.FC<LayoutProps> = ({ user, onLogout, syncStatus, lastSync, onRefresh }) => {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  const menuItems = [
    { 
      label: 'Dashboard', 
      path: '/', 
      icon: <LayoutDashboard size={18} />, 
      roles: [UserRole.ADMIN, UserRole.GURU, UserRole.KETUA_KELAS] 
    },
    { 
      label: 'Input Absensi', 
      path: '/absen', 
      icon: <ClipboardCheck size={18} />, 
      roles: [UserRole.KETUA_KELAS] 
    },
  ];

  const filteredMenu = menuItems.filter(item => item.roles.includes(user.role));

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-white transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex flex-col h-full">
          <div className="p-6 flex items-center gap-3 border-b border-slate-800">
            <div className="p-2 bg-indigo-600 rounded-xl">
              <School className="text-white" size={24} />
            </div>
            <div>
              <h1 className="font-bold text-sm tracking-tight leading-none">SIAP GURU</h1>
              <p className="text-[10px] text-slate-400 mt-1 font-semibold uppercase tracking-widest">SMPN 3 PACET</p>
            </div>
          </div>
          
          <nav className="flex-1 p-4 space-y-1 mt-2">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-3 px-3">Menu Utama</p>
            {filteredMenu.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                  location.pathname === item.path 
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/20' 
                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                }`}
              >
                {item.icon}
                <span className="font-semibold text-sm">{item.label}</span>
              </Link>
            ))}
          </nav>

          <div className="p-4 border-t border-slate-800 bg-slate-950/20">
            <div className="flex items-center gap-3 p-3 mb-2 rounded-xl bg-slate-800/40">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center text-indigo-400">
                <UserIcon size={18} />
              </div>
              <div className="overflow-hidden">
                <p className="text-xs font-bold truncate text-slate-200">{user.nama}</p>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{user.role.replace('_', ' ')}</p>
              </div>
            </div>
            <button
              onClick={onLogout}
              className="flex items-center gap-3 w-full p-3 rounded-xl text-rose-400 hover:bg-rose-500/10 transition-colors font-bold text-sm"
            >
              <LogOut size={18} />
              <span>Keluar</span>
            </button>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 bg-slate-50">
        <header className="bg-white h-16 flex items-center justify-between px-6 border-b border-slate-200 sticky top-0 z-40">
          <div className="flex items-center gap-4">
            <button 
              className="lg:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-all"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu size={22} />
            </button>
            <h2 className="text-slate-800 font-black text-xs uppercase tracking-widest hidden sm:block">
              {filteredMenu.find(i => i.path === location.pathname)?.label || 'Dashboard'}
            </h2>
          </div>

          <div className="flex items-center gap-4">
            <button 
              onClick={onRefresh}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-all border ${
                syncStatus === 'synced' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 
                syncStatus === 'offline' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                'bg-rose-50 text-rose-600 border-rose-100'
              }`}
            >
              {syncStatus === 'synced' ? <Cloud size={14} /> : 
               syncStatus === 'offline' ? <Database size={14} /> :
               <CloudOff size={14} />}
              <span className="text-[10px] font-black uppercase tracking-widest hidden md:inline">
                {syncStatus === 'synced' ? 'Cloud Online' : 
                 syncStatus === 'offline' ? 'Mode Lokal' : 'Gagal Sinkron'}
              </span>
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar">
          <div className="max-w-6xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>

      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
};

export default Layout;