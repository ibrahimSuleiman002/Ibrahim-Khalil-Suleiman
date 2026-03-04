
import React, { useState } from 'react';
import { User, RideStatus } from '../types';

interface DriverAppProps {
  user: User;
  onLogout: () => void;
}

const DriverApp: React.FC<DriverAppProps> = ({ user, onLogout }) => {
  const [isOnline, setIsOnline] = useState(false);
  const [activeRide, setActiveRide] = useState<any>(null);
  const [showIncoming, setShowIncoming] = useState(false);

  // Simulation: Trigger a request after 3 seconds of being online
  const toggleOnline = () => {
    setIsOnline(!isOnline);
    if (!isOnline) {
      setTimeout(() => setShowIncoming(true), 3000);
    }
  };

  return (
    <div className="h-full w-full bg-slate-50 flex flex-col">
      {/* Header */}
      <div className="p-6 bg-white luxury-shadow flex justify-between items-center relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-slate-200 rounded-xl overflow-hidden">
            <img src={`https://picsum.photos/100/100?random=${user.id}`} alt="Me" />
          </div>
          <div>
            <p className="font-bold text-slate-800 text-sm">{user.name}</p>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">KKE-12-KNO</p>
          </div>
        </div>
        <button 
          onClick={() => onLogout()}
          className="text-xs font-bold text-slate-400"
        >
          LOGOUT
        </button>
      </div>

      {/* Dashboard Stats */}
      <div className="p-6 grid grid-cols-2 gap-4">
        <div className="bg-[#065f46] p-6 rounded-[32px] text-white">
          <p className="text-xs opacity-70 mb-1 font-medium">Daily Earnings</p>
          <p className="text-2xl font-black">₦4,250</p>
        </div>
        <div className="bg-white p-6 rounded-[32px] luxury-shadow">
          <p className="text-xs text-slate-500 mb-1 font-medium">Trips</p>
          <p className="text-2xl font-black text-slate-800">12</p>
        </div>
      </div>

      {/* Map Preview Area */}
      <div className="flex-1 m-6 bg-slate-200 rounded-[40px] relative overflow-hidden flex items-center justify-center">
        {!isOnline && (
          <div className="text-center p-8">
            <p className="text-slate-500 font-medium mb-4">You are currently offline</p>
            <p className="text-sm text-slate-400">Go online to start receiving ride requests from Kano.</p>
          </div>
        )}
        {isOnline && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-emerald-500 text-white px-4 py-2 rounded-full text-xs font-bold animate-pulse">
            LIVE IN KANO
          </div>
        )}
      </div>

      {/* Bottom Controls */}
      <div className="p-6 bg-white rounded-t-[40px] luxury-shadow">
        <button 
          onClick={toggleOnline}
          className={`w-full py-5 rounded-[24px] font-black text-lg transition-all duration-500 ${isOnline ? 'bg-red-50 text-red-600' : 'bg-[#065f46] text-white shadow-xl shadow-emerald-900/20'}`}
        >
          {isOnline ? 'GO OFFLINE' : 'GO ONLINE'}
        </button>
      </div>

      {/* Incoming Request Modal */}
      {showIncoming && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-sm rounded-[40px] p-8 shadow-2xl animate-in zoom-in-95 duration-500">
             <div className="flex justify-between items-start mb-6">
                <div className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-[10px] font-black tracking-widest uppercase">
                  Shared Request
                </div>
                <div className="text-xs font-bold text-slate-400">2.4km away</div>
             </div>

             <h2 className="text-2xl font-black text-slate-800 mb-6">New Ride</h2>

             <div className="space-y-4 mb-8">
               <div className="flex gap-4">
                  <div className="w-2 bg-emerald-500 rounded-full h-12"></div>
                  <div className="flex-1">
                     <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Pickup</p>
                     <p className="font-bold text-slate-800">Kurmi Market, Gate 3</p>
                  </div>
               </div>
               <div className="flex gap-4">
                  <div className="w-2 bg-amber-500 rounded-full h-12"></div>
                  <div className="flex-1">
                     <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Drop</p>
                     <p className="font-bold text-slate-800">Bayero University (Old Site)</p>
                  </div>
               </div>
             </div>

             <div className="bg-slate-50 p-4 rounded-3xl flex justify-between items-center mb-8">
                <div>
                   <p className="text-xs text-slate-400 font-bold">ESTIMATED EARNING</p>
                   <p className="text-2xl font-black text-emerald-600">₦850</p>
                </div>
                <div className="text-right">
                   <p className="text-xs text-slate-400 font-bold">SEATS</p>
                   <p className="text-lg font-black text-slate-800">2 / 3</p>
                </div>
             </div>

             <div className="flex gap-4">
                <button 
                  onClick={() => setShowIncoming(false)}
                  className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-2xl font-bold"
                >
                  Ignore
                </button>
                <button 
                  onClick={() => { setShowIncoming(false); setActiveRide(true); }}
                  className="flex-[2] py-4 bg-[#065f46] text-white rounded-2xl font-bold shadow-lg shadow-emerald-900/20"
                >
                  Accept Ride
                </button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DriverApp;
