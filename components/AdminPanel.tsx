
import React, { useState } from 'react';
import { User } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

interface AdminPanelProps {
  user: User;
  onLogout: () => void;
}

const data = [
  { name: 'Mon', trips: 4000, revenue: 2400 },
  { name: 'Tue', trips: 3000, revenue: 1398 },
  { name: 'Wed', trips: 2000, revenue: 9800 },
  { name: 'Thu', trips: 2780, revenue: 3908 },
  { name: 'Fri', trips: 1890, revenue: 4800 },
  { name: 'Sat', trips: 2390, revenue: 3800 },
  { name: 'Sun', trips: 3490, revenue: 4300 },
];

const AdminPanel: React.FC<AdminPanelProps> = ({ user, onLogout }) => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'drivers' | 'incidents'>('dashboard');

  return (
    <div className="h-full w-full bg-slate-100 flex overflow-hidden">
      {/* Sidebar */}
      <div className="w-72 bg-[#065f46] text-white flex flex-col p-8">
        <h1 className="text-3xl font-black italic mb-12 tracking-tighter">ZIKO ADMIN</h1>
        
        <nav className="flex-1 space-y-4">
          <button 
            onClick={() => setActiveTab('dashboard')}
            className={`w-full flex items-center gap-4 p-4 rounded-2xl font-bold transition-all ${activeTab === 'dashboard' ? 'bg-white/10 text-white' : 'text-emerald-100/60 hover:text-white'}`}
          >
            <span>📊</span> Dashboard
          </button>
          <button 
            onClick={() => setActiveTab('drivers')}
            className={`w-full flex items-center gap-4 p-4 rounded-2xl font-bold transition-all ${activeTab === 'drivers' ? 'bg-white/10 text-white' : 'text-emerald-100/60 hover:text-white'}`}
          >
            <span>🛺</span> Fleet Management
          </button>
          <button 
            onClick={() => setActiveTab('incidents')}
            className={`w-full flex items-center gap-4 p-4 rounded-2xl font-bold transition-all ${activeTab === 'incidents' ? 'bg-white/10 text-white' : 'text-emerald-100/60 hover:text-white'}`}
          >
            <span>🚨</span> SOS & Safety
          </button>
        </nav>

        <div className="mt-auto pt-8 border-t border-white/10">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 bg-white/20 rounded-lg"></div>
            <div>
              <p className="text-xs font-bold">{user.name}</p>
              <p className="text-[10px] opacity-50 uppercase">Super Admin</p>
            </div>
          </div>
          <button 
            onClick={() => onLogout()}
            className="w-full py-3 bg-red-500/10 text-red-400 rounded-xl text-xs font-bold hover:bg-red-500/20 transition-colors"
          >
            LOGOUT SYSTEM
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-10">
        <header className="flex justify-between items-end mb-12">
          <div>
            <h2 className="text-3xl font-black text-slate-800">System Overview</h2>
            <p className="text-slate-500">Kano State Jurisdiction • Live Data</p>
          </div>
          <div className="bg-white px-6 py-3 rounded-2xl luxury-shadow flex items-center gap-3 text-sm font-bold text-slate-600">
             <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
             KANO CENTRAL ACTIVE
          </div>
        </header>

        {/* Stats Grid */}
        <div className="grid grid-cols-4 gap-6 mb-10">
          {[
            { label: 'Total Trips', val: '45.2k', delta: '+12%', color: 'text-emerald-600' },
            { label: 'Active Pilots', val: '1,248', delta: '+3%', color: 'text-blue-600' },
            { label: 'Avg Fare', val: '₦480', delta: '+5%', color: 'text-amber-600' },
            { label: 'Total Revenue', val: '₦21.4M', delta: '+18%', color: 'text-emerald-600' }
          ].map((stat, i) => (
            <div key={i} className="bg-white p-6 rounded-[32px] luxury-shadow">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">{stat.label}</p>
              <div className="flex items-end justify-between">
                <p className="text-2xl font-black text-slate-800">{stat.val}</p>
                <span className={`text-[10px] font-bold ${stat.color}`}>{stat.delta}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Visualizations */}
        <div className="grid grid-cols-2 gap-8 mb-10">
          <div className="bg-white p-8 rounded-[40px] luxury-shadow h-[400px] flex flex-col">
            <h3 className="font-bold text-slate-800 mb-6">Revenue Growth (7 Days)</h3>
            <div className="flex-1">
               <ResponsiveContainer width="100%" height="100%">
                 <AreaChart data={data}>
                    <defs>
                      <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#065f46" stopOpacity={0.1}/>
                        <stop offset="95%" stopColor="#065f46" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                    <Tooltip contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'}} />
                    <Area type="monotone" dataKey="revenue" stroke="#065f46" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
                 </AreaChart>
               </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white p-8 rounded-[40px] luxury-shadow h-[400px] flex flex-col">
            <h3 className="font-bold text-slate-800 mb-6">Daily Trips Volume</h3>
            <div className="flex-1">
               <ResponsiveContainer width="100%" height="100%">
                 <BarChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                    <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'}} />
                    <Bar dataKey="trips" fill="#b45309" radius={[8, 8, 0, 0]} />
                 </BarChart>
               </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Live Tracking Table */}
        <div className="bg-white rounded-[40px] luxury-shadow overflow-hidden">
           <div className="p-8 border-b border-slate-100 flex justify-between items-center">
              <h3 className="font-bold text-slate-800">Recent Incidents & SOS</h3>
              <button className="text-emerald-600 text-xs font-bold">VIEW ALL LOGS</button>
           </div>
           <table className="w-full text-left">
              <thead>
                 <tr className="bg-slate-50 text-[10px] font-black uppercase text-slate-400 tracking-widest">
                    <th className="px-8 py-4">Pilot ID</th>
                    <th className="px-8 py-4">Location</th>
                    <th className="px-8 py-4">Issue</th>
                    <th className="px-8 py-4">Status</th>
                    <th className="px-8 py-4 text-right">Actions</th>
                 </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                 {[
                    { id: 'KKE-004', loc: 'Dala Hill Area', issue: 'SOS Triggered', status: 'Alert', color: 'text-red-600' },
                    { id: 'KKE-812', loc: 'Zoo Road', issue: 'Route Deviation', status: 'Warning', color: 'text-amber-600' },
                    { id: 'KKE-441', loc: 'Hotoro', issue: 'Payment Dispute', status: 'In Review', color: 'text-slate-400' }
                 ].map((row, i) => (
                    <tr key={i} className="hover:bg-slate-50 transition-colors">
                       <td className="px-8 py-6 font-bold text-slate-800">{row.id}</td>
                       <td className="px-8 py-6 text-sm text-slate-500">{row.loc}</td>
                       <td className="px-8 py-6 text-sm font-medium">{row.issue}</td>
                       <td className={`px-8 py-6 text-xs font-black uppercase ${row.color}`}>{row.status}</td>
                       <td className="px-8 py-6 text-right">
                          <button className="px-4 py-2 bg-slate-800 text-white rounded-xl text-[10px] font-bold">INVESTIGATE</button>
                       </td>
                    </tr>
                 ))}
              </tbody>
           </table>
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;
