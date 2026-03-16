
import React, { useState, useEffect } from 'react';
import { User, Location, RideType, UserRole, RideStatus, RideHistoryItem } from '../types';
import { KANO_LANDMARKS } from '../constants';
import RideHistory from './RideHistory';
import { rideApi, profileApi } from '../services/api';

interface RiderAppProps {
  user: User;
  onLogout: () => void;
  onUpdateUser: (user: User) => void;
  onSwitchToDriver: () => void;
}

const RiderApp: React.FC<RiderAppProps> = ({ user, onLogout, onUpdateUser, onSwitchToDriver }) => {
  const [status, setStatus] = useState<RideStatus>(RideStatus.IDLE);
  const [pickup, setPickup] = useState<string>('Current Location');
  const [destination, setDestination] = useState<string>('');
  const [rideType, setRideType] = useState<RideType>(RideType.SHARED);
  const [showSearch, setShowSearch] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [basePrice, setBasePrice] = useState(300);
  const [bargainPrice, setBargainPrice] = useState(300);
  const [rideHistory, setRideHistory] = useState<RideHistoryItem[]>([]);
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

  // Fetch history from backend
  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const response = await rideApi.getHistory();
        // Map backend ride to RideHistoryItem
        const formattedHistory: RideHistoryItem[] = response.data.map((ride: any) => ({
          id: ride._id,
          date: new Date(ride.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
          price: ride.price || 0, // Fallback if price not in model yet
          pickup: ride.pickup?.address || "Kano",
          destination: ride.destination?.address || "Kano",
          partnerName: ride.pilot?.fullName || "Ziko Pilot",
          partnerAvatar: ride.pilot?.image,
          status: RideStatus.COMPLETED
        }));
        setRideHistory(formattedHistory);
      } catch (err) {
        console.error("Failed to fetch history:", err);
      }
    };
    fetchHistory();
  }, [user.id]);

  const handleProfileImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const file = e.target.files[0];
      setIsUpdatingProfile(true);
      try {
        const formData = new FormData();
        formData.append('fullName', user.name);
        formData.append('image', file);

        const response = await profileApi.updateProfile('rider', formData);
        const backendUser = response.data;

        onUpdateUser({
          ...user,
          avatar: backendUser.image
        });
      } catch (err) {
        console.error("Failed to update profile image:", err);
        alert("Failed to update profile image.");
      } finally {
        setIsUpdatingProfile(false);
      }
    }
  };

  // Simulate Map Interactions
  const handleDestinationSelect = (place: string) => {
    setDestination(place);
    setShowSearch(false);
    setBasePrice(Math.floor(Math.random() * 500) + 200);
    setBargainPrice(Math.floor(Math.random() * 500) + 200);
  };

  const handleRequestRide = () => {
    setStatus(RideStatus.SEARCHING);
    setTimeout(() => {
      setStatus(RideStatus.ACCEPTED);
      // Automatically complete ride after 5 seconds for simulation
      setTimeout(() => {
        const newRide: RideHistoryItem = {
          id: Math.random().toString(36).substr(2, 9),
          date: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
          price: rideType === RideType.SHARED ? basePrice : bargainPrice,
          pickup,
          destination,
          partnerName: "Musa Dan Kano",
          partnerAvatar: "https://picsum.photos/100/100?random=1",
          status: RideStatus.COMPLETED
        };
        const updatedHistory = [newRide, ...rideHistory];
        setRideHistory(updatedHistory);
        localStorage.setItem(`ziko_history_${user.id}`, JSON.stringify(updatedHistory));
        setStatus(RideStatus.IDLE);
        setDestination('');
      }, 5000);
    }, 3000);
  };

  return (
    <div className="h-full w-full relative">
      {/* Mock Map Background */}
      <div className="absolute inset-0 bg-[#e2e8f0]">
        <div className="w-full h-full relative overflow-hidden">
          {/* Simulated Street Grid */}
          <div className="absolute inset-0 grid grid-cols-12 grid-rows-12 opacity-30 pointer-events-none">
            {Array.from({ length: 144 }).map((_, i) => (
              <div key={i} className="border-[0.5px] border-slate-400"></div>
            ))}
          </div>

          {/* Landmark Pins */}
          {KANO_LANDMARKS.map((landmark, i) => (
            <div
              key={i}
              className="absolute group"
              style={{
                left: `${20 + (i * 12) % 60}%`,
                top: `${30 + (i * 8) % 50}%`
              }}
            >
              <div className="w-4 h-4 bg-emerald-600 rounded-full border-2 border-white animate-bounce-slow"></div>
              <div className="hidden group-hover:block absolute top-6 left-1/2 -translate-x-1/2 bg-white px-2 py-1 rounded-md text-[10px] font-bold shadow-sm whitespace-nowrap">
                {landmark.name}
              </div>
            </div>
          ))}

          {/* User Marker */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
            <div className="relative">
              <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center animate-ping absolute -inset-0"></div>
              <div className="w-6 h-6 bg-blue-600 rounded-full border-4 border-white shadow-lg relative z-10"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Header */}
      <div className="absolute top-4 left-4 right-4 flex justify-between items-center z-20 pointer-events-none">
        <div className="flex items-center gap-3 pointer-events-auto">
          <label className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center luxury-shadow overflow-hidden cursor-pointer hover:border-emerald-500 border-2 border-transparent transition-all relative">
            {isUpdatingProfile ? (
              <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : null}
            {user.avatar ? (
              <img src={user.avatar} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <span className="text-xl">👤</span>
            )}
            <input type="file" className="hidden" onChange={handleProfileImageChange} disabled={isUpdatingProfile} />
          </label>
          <div className="bg-white px-4 py-2 rounded-2xl luxury-shadow flex flex-col justify-center">
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider leading-none mb-1">Welcome, {user.name.split(' ')[0]}</p>
            <div className="flex gap-2">
              <button
                onClick={() => onLogout()}
                className="text-[10px] font-black text-red-500 hover:text-red-600 transition-colors text-left uppercase tracking-tighter"
              >
                Sign Out
              </button>
              <span className="text-slate-200">|</span>
              <button
                onClick={() => setShowHistory(true)}
                className="text-[10px] font-black text-[#065f46] hover:text-[#059669] transition-colors text-left uppercase tracking-tighter"
              >
                History
              </button>
              {user.role === UserRole.DRIVER && (
                <>
                  <span className="text-slate-200">|</span>
                  <button
                    onClick={onSwitchToDriver}
                    className="text-[10px] font-black text-amber-600 hover:text-amber-700 transition-colors text-left uppercase tracking-tighter"
                  >
                    Pilot
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="px-4 py-2 bg-[#065f46] text-white rounded-full text-xs font-bold luxury-shadow pointer-events-auto">
          ZIKO
        </div>
      </div>

      {/* Main Bottom Sheet */}
      <div className={`absolute bottom-0 left-0 right-0 transition-transform duration-500 ease-out z-30 ${showSearch ? 'translate-y-0' : 'translate-y-0'}`}>
        <div className="mx-auto max-w-lg bg-white rounded-t-[40px] luxury-shadow p-6 pb-10">
          <div className="w-12 h-1 bg-slate-200 rounded-full mx-auto mb-6"></div>

          {status === RideStatus.IDLE && (
            <div className="space-y-6">
              <div className="bg-slate-50 p-4 rounded-3xl space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                  <input
                    type="text"
                    value={pickup}
                    readOnly
                    className="bg-transparent border-none w-full font-medium text-slate-800 focus:ring-0"
                  />
                </div>
                <div className="border-t border-slate-200"></div>
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                  <input
                    type="text"
                    placeholder="Where to in Kano?"
                    onFocus={() => setShowSearch(true)}
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    className="bg-transparent border-none w-full font-bold text-slate-800 placeholder:text-slate-400 focus:ring-0"
                  />
                </div>
              </div>

              {destination && (
                <div className="grid grid-cols-2 gap-4 animate-in slide-in-from-bottom-2 duration-300">
                  <button
                    onClick={() => setRideType(RideType.SHARED)}
                    className={`p-4 rounded-3xl border-2 transition-all ${rideType === RideType.SHARED ? 'border-[#065f46] bg-emerald-50' : 'border-slate-100 bg-white'}`}
                  >
                    <div className="text-2xl mb-2">🛺</div>
                    <p className="font-bold text-slate-800">Shared</p>
                    <p className="text-xs text-slate-500">3 Seats • Fixed</p>
                    <p className="mt-2 font-bold text-[#065f46]">₦{basePrice}</p>
                  </button>
                  <button
                    onClick={() => setRideType(RideType.PRIVATE)}
                    className={`p-4 rounded-3xl border-2 transition-all ${rideType === RideType.PRIVATE ? 'border-[#b45309] bg-amber-50' : 'border-slate-100 bg-white'}`}
                  >
                    <div className="text-2xl mb-2">💎</div>
                    <p className="font-bold text-slate-800">Private</p>
                    <p className="text-xs text-slate-500">Exclusive • Negotiable</p>
                    <p className="mt-2 font-bold text-[#b45309]">₦{Math.floor(basePrice * 2.5)}</p>
                  </button>
                </div>
              )}

              {destination && rideType === RideType.PRIVATE && (
                <div className="bg-amber-50 p-4 rounded-2xl flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-800">BARGAIN PRICE</span>
                  <div className="flex items-center gap-4">
                    <button onClick={() => setBargainPrice(p => Math.max(200, p - 50))} className="w-8 h-8 bg-white rounded-full luxury-shadow font-bold">-</button>
                    <span className="font-bold text-amber-900">₦{bargainPrice}</span>
                    <button onClick={() => setBargainPrice(p => p + 50)} className="w-8 h-8 bg-white rounded-full luxury-shadow font-bold">+</button>
                  </div>
                </div>
              )}

              <button
                disabled={!destination}
                onClick={handleRequestRide}
                className="w-full py-5 bg-[#065f46] text-white rounded-[24px] font-bold text-lg disabled:opacity-30 disabled:grayscale transition-all shadow-xl shadow-emerald-900/10"
              >
                {rideType === RideType.SHARED ? 'Find Ride' : 'Request Private Keke'}
              </button>
            </div>
          )}

          {status === RideStatus.SEARCHING && (
            <div className="text-center py-10 space-y-4">
              <div className="relative w-24 h-24 mx-auto mb-6">
                <div className="absolute inset-0 border-4 border-emerald-100 rounded-full"></div>
                <div className="absolute inset-0 border-4 border-emerald-500 rounded-full border-t-transparent animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center text-4xl">🛺</div>
              </div>
              <h3 className="text-2xl font-bold text-slate-800">Searching for Pilots</h3>
              <p className="text-slate-500">Finding the best Keke near {pickup}...</p>
              <button onClick={() => setStatus(RideStatus.IDLE)} className="text-red-500 font-bold mt-4">Cancel Request</button>
            </div>
          )}

          {status === RideStatus.ACCEPTED && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-slate-800">Driver is Arriving</h3>
                  <p className="text-sm text-emerald-600 font-medium">3 mins away • KKE-12-KNO</p>
                </div>
                <button className="w-12 h-12 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center font-bold">SOS</button>
              </div>

              <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-3xl">
                <div className="w-14 h-14 bg-slate-200 rounded-2xl overflow-hidden">
                  <img src="https://picsum.photos/100/100?random=1" alt="Driver" />
                </div>
                <div className="flex-1">
                  <p className="font-bold text-slate-800">Musa Dan Kano</p>
                  <p className="text-xs text-slate-500">⭐ 4.9 • 1,200+ rides</p>
                </div>
                <button className="w-10 h-10 bg-[#065f46] text-white rounded-full flex items-center justify-center">📞</button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-emerald-50 rounded-2xl">
                  <p className="text-[10px] uppercase font-bold text-emerald-700 tracking-wider">Fare</p>
                  <p className="text-lg font-bold text-emerald-900">₦{rideType === RideType.SHARED ? basePrice : bargainPrice}</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-2xl">
                  <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Payment</p>
                  <p className="text-lg font-bold text-slate-800">Cash</p>
                </div>
              </div>

              <button
                onClick={() => setStatus(RideStatus.IDLE)}
                className="w-full py-4 text-slate-400 font-medium text-sm"
              >
                Cancel Ride
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Search Overlay */}
      {showSearch && (
        <div className="absolute inset-0 bg-white z-50 p-6 flex flex-col animate-in fade-in duration-300">
          <div className="flex items-center gap-4 mb-8">
            <button onClick={() => setShowSearch(false)} className="text-2xl w-10 h-10 flex items-center justify-center bg-slate-50 rounded-full">←</button>
            <h2 className="text-xl font-bold">Where to?</h2>
          </div>

          <div className="relative mb-8">
            <input
              autoFocus
              type="text"
              placeholder="Search major landmarks or roads..."
              className="w-full pl-12 pr-4 py-4 bg-slate-50 border-none rounded-2xl font-medium focus:ring-2 focus:ring-[#065f46]"
            />
            <span className="absolute left-4 top-1/2 -translate-y-1/2">🔍</span>
          </div>

          <div className="space-y-2 overflow-y-auto">
            {KANO_LANDMARKS.map((landmark, i) => (
              <button
                key={i}
                onClick={() => handleDestinationSelect(landmark.name)}
                className="w-full p-4 flex items-center gap-4 hover:bg-slate-50 rounded-2xl transition-colors"
              >
                <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600">📍</div>
                <div className="text-left">
                  <p className="font-bold text-slate-800">{landmark.name}</p>
                  <p className="text-xs text-slate-500">Kano, Nigeria</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Ride History Overlay */}
      {showHistory && (
        <RideHistory
          history={rideHistory}
          onBack={() => setShowHistory(false)}
          title="Ride History"
        />
      )}
    </div>
  );
};

export default RiderApp;
