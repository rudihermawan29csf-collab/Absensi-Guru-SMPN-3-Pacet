
import React from 'react';
import { TrendingUp, Users, ClipboardCheck, AlertCircle } from 'lucide-react';

interface StatProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
  trend?: string;
}

const StatCard: React.FC<StatProps> = ({ label, value, icon, color, trend }) => (
  <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
        <h3 className="text-2xl font-black text-slate-800 tracking-tight">{value}</h3>
        {trend && (
          <p className={`text-[10px] mt-2 font-bold ${trend.startsWith('+') ? 'text-emerald-600' : 'text-rose-600'}`}>
            {trend} vs periode lalu
          </p>
        )}
      </div>
      <div className={`p-3 rounded-2xl ${color} shadow-inner`}>
        {icon}
      </div>
    </div>
  </div>
);

export const AdminStats: React.FC<{ total: number, presence: string, teacherCount: number }> = ({ total, presence, teacherCount }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
    <StatCard 
      label="Total Jam Terabsen" 
      value={total} 
      icon={<ClipboardCheck className="text-indigo-600" size={20} />} 
      color="bg-indigo-50" 
    />
    <StatCard 
      label="Rasio Kehadiran" 
      value={presence} 
      icon={<TrendingUp className="text-emerald-600" size={20} />} 
      color="bg-emerald-50"
      trend="+1.2%"
    />
    <StatCard 
      label="Guru Terdaftar" 
      value={teacherCount} 
      icon={<Users className="text-sky-600" size={20} />} 
      color="bg-sky-50" 
    />
    <StatCard 
      label="Status Laporan" 
      value="Aktif" 
      icon={<AlertCircle className="text-amber-600" size={20} />} 
      color="bg-amber-50" 
    />
  </div>
);
