
import React from 'react';
import { RideHistoryItem } from '../types';

interface RideHistoryProps {
    history: RideHistoryItem[];
    onBack: () => void;
    title: string;
    balance?: number;
    trips?: number;
}

const RideHistory: React.FC<RideHistoryProps> = ({ history, onBack, title, balance, trips }) => {
    return (
        <div className="absolute inset-0 bg-white z-50 flex flex-col p-6 animate-in slide-in-from-right duration-300">
            <div className="flex items-center gap-4 mb-6">
                <button onClick={onBack} className="text-2xl w-10 h-10 flex items-center justify-center bg-slate-50 rounded-full">←</button>
                <h2 className="text-2xl font-black text-slate-800">{title}</h2>
            </div>
            
            {(balance !== undefined || trips !== undefined) && (
                <div className="flex gap-4 mb-8">
                    {balance !== undefined && (
                        <div className="flex-1 px-5 py-5 bg-[#065f46] text-white rounded-[24px] luxury-shadow flex flex-col justify-center">
                            <span className="text-xs uppercase font-bold text-emerald-300 tracking-wider">Balance</span>
                            <span className="text-3xl font-black leading-tight mt-1">₦{balance.toLocaleString()}</span>
                        </div>
                    )}
                    {trips !== undefined && (
                        <div className="flex-[0.8] px-5 py-5 bg-white text-slate-800 border-2 border-slate-100 rounded-[24px] luxury-shadow flex flex-col justify-center">
                            <span className="text-xs uppercase font-bold text-slate-400 tracking-wider">Trips</span>
                            <div className="flex items-center gap-2 mt-1">
                                <span className="text-2xl">🏆</span>
                                <span className="text-3xl font-black leading-tight">{trips}</span>
                            </div>
                        </div>
                    )}
                </div>
            )}

            <div className="flex-1 overflow-y-auto space-y-4 pb-10 custom-scrollbar">
                {history.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-10">
                        <div className="text-6xl mb-4 opacity-20">🛺</div>
                        <p className="text-slate-400 font-medium">No successful rides yet.</p>
                        <p className="text-xs text-slate-300 uppercase tracking-widest mt-1">Start your journey in Kano</p>
                    </div>
                ) : (
                    history.map((ride) => (
                        <div key={ride.id} className="bg-white border border-slate-100 rounded-[32px] p-5 luxury-shadow-sm hover:border-emerald-100 transition-colors">
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 bg-slate-100 rounded-2xl overflow-hidden border-2 border-slate-50">
                                        {ride.partnerAvatar ? (
                                            <img src={ride.partnerAvatar} alt={ride.partnerName} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-xl bg-emerald-50 text-emerald-600 font-bold">
                                                {ride.partnerName.charAt(0)}
                                            </div>
                                        )}
                                    </div>
                                    <div>
                                        <p className="font-bold text-slate-800">{ride.partnerName}</p>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{ride.date}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-lg font-black text-emerald-600">₦{ride.price}</p>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase">Paid Cash</p>
                                </div>
                            </div>

                            <div className="space-y-2 relative pl-4 before:absolute before:left-1 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-100 before:rounded-full">
                                <div className="relative">
                                    <div className="absolute -left-4.5 top-1.5 w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase leading-none mb-0.5">Pickup</p>
                                    <p className="text-xs font-bold text-slate-700">{ride.pickup}</p>
                                </div>
                                <div className="relative">
                                    <div className="absolute -left-4.5 top-1.5 w-1.5 h-1.5 rounded-full bg-amber-500"></div>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase leading-none mb-0.5">Drop</p>
                                    <p className="text-xs font-bold text-slate-700">{ride.destination}</p>
                                </div>
                            </div>

                            <div className="mt-4 pt-4 border-t border-slate-50 flex justify-between items-center">
                                <span className="text-[10px] font-black text-emerald-500 bg-emerald-50 px-2 py-0.5 rounded-full uppercase tracking-tighter">Completed</span>
                                <span className="text-[10px] text-slate-300 font-mono">#{ride.id.slice(-6).toUpperCase()}</span>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default RideHistory;
