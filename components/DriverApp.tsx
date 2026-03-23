
import React, { useState, useEffect, useMemo } from 'react';
import { User, RideStatus, RideHistoryItem, Location } from '../types';
import RideHistory from './RideHistory';
import { rideApi, profileApi } from '../services/api';
import { io, Socket } from 'socket.io-client';
import GoogleMap from './GoogleMap';


interface DriverAppProps {
  user: User;
  onLogout: () => void;
  onUpdateUser: (user: User) => void;
  onSwitchToRider: () => void;
}

const DriverApp: React.FC<DriverAppProps> = ({ user, onLogout, onUpdateUser, onSwitchToRider }) => {
  const [isOnline, setIsOnline] = useState(false);
  const [activeRide, setActiveRide] = useState<any>(null);
  const [showIncoming, setShowIncoming] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [rideHistory, setRideHistory] = useState<RideHistoryItem[]>([]);
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [incomingRide, setIncomingRide] = useState<any>(null);
  const [currentLocation, setCurrentLocation] = useState<Location>({ lat: 11.9964, lng: 8.5167 });
  const [directions, setDirections] = useState<google.maps.DirectionsResult | null>(null);
  const [riderLocation, setRiderLocation] = useState<Location | null>(null);
  const [riderPath, setRiderPath] = useState<Location[]>([]);

  // Fetch history from backend
  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const response = await rideApi.getHistory();
        const formattedHistory: RideHistoryItem[] = response.data.map((ride: any) => ({
          id: ride._id,
          date: new Date(ride.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
          price: ride.price || 850,
          pickup: ride.pickup?.address || "Kano",
          destination: ride.destination?.address || "Kano",
          partnerName: ride.rider?.fullName || "Ziko Rider",
          partnerAvatar: ride.rider?.image,
          status: RideStatus.COMPLETED
        }));
        setRideHistory(formattedHistory);
      } catch (err) {
        console.error("Failed to fetch history:", err);
      }
    };
    fetchHistory();
  }, [user.id]);

  // Fetch Active Ride on Mount
  useEffect(() => {
    const fetchActive = async () => {
      try {
        const response = await rideApi.getActiveRide();
        const { activeRide } = response.data;
        
        if (activeRide) {
          setActiveRide(activeRide);
          setIsOnline(true);
        }
      } catch (err) {
        console.error("Failed to fetch active ride:", err);
      }
    };
    fetchActive();
  }, [user.id]);

  // Poll for Active Requests when Online (Handles missed socket events)
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    
    const fetchRequests = async () => {
      if (!isOnline || activeRide || incomingRide) return;
      try {
        const response = await rideApi.getActiveRequests();
        const requests = response.data;
        if (requests && requests.length > 0) {
          // Always show the first pending request if any exists
          setIncomingRide(requests[0]);
          setShowIncoming(true);
        }
      } catch (err) {
        console.error("Failed to fetch active requests:", err);
      }
    };

    if (isOnline && !activeRide && !incomingRide) {
      fetchRequests(); // Initial fetch
      interval = setInterval(fetchRequests, 10000); // Poll every 10s
    }

    return () => {
        if (interval) clearInterval(interval);
    };
  }, [isOnline, activeRide, incomingRide]);

  // Socket Connection
  useEffect(() => {
    const newSocket = io('http://localhost:5000');
    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log('Driver connected to socket server');
      newSocket.emit('join', user.id);
    });

    newSocket.on('new-ride', (request) => {
      console.log('New ride request received:', request);
      setIncomingRide(request);
      setShowIncoming(true);
    });

    newSocket.on('rider-completed', (data) => {
      console.log('Rider completed the ride:', data);
      setActiveRide((prev: any) => prev ? { ...prev, riderCompleted: true } : prev);
      alert("Rider has marked the trip as completed. Please confirm payment.");
    });

    newSocket.on('ride-cancelled', (data) => {
      console.log('Ride cancelled by other party:', data);
      alert("The ride has been cancelled by the rider.");
      setActiveRide(null);
      setDirections(null);
    });

    newSocket.on('ride-finalized', (finalRide) => {
      console.log('Ride finalized:', finalRide);
      setActiveRide(null);
      setDirections(null);
      setRiderLocation(null);
      setRiderPath([]);
      alert(`Trip finalized! Total earned: ₦${finalRide.price}`);
    });

    newSocket.on('rider-location-update', (data) => {
      console.log('Rider location update:', data);
      setRiderLocation(data.location);
      setRiderPath(prev => [...prev, data.location]);
    });

    return () => {
      newSocket.disconnect();
    };
  }, [user.id]);

  // Watch location and emit to socket
  useEffect(() => {
    if (!isOnline) return;

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const newLoc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setCurrentLocation(newLoc);
        if (socket && activeRide) {
          socket.emit('update-location', {
            pilotId: user.id,
            location: newLoc,
            riderId: activeRide.rider?._id || activeRide.rider
          });
        }
      },
      (err) => console.error("Error watching location:", err),
      { enableHighAccuracy: true }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [isOnline, socket, activeRide, user.id]);

  // Simulation: Move location slightly if geolocation is not available or for demo
  useEffect(() => {
    if (!isOnline || !activeRide) return;
    
    const interval = setInterval(() => {
        setCurrentLocation(prev => ({
            lat: prev.lat + (Math.random() - 0.5) * 0.0005,
            lng: prev.lng + (Math.random() - 0.5) * 0.0005
        }));
    }, 5000);

    return () => clearInterval(interval);
  }, [isOnline, activeRide]);

  // Get Directions for active ride
  useEffect(() => {
    if (activeRide && activeRide.pickup && activeRide.destination && window.google) {
      const directionsService = new google.maps.DirectionsService();
      directionsService.route(
        {
          origin: activeRide.pickup,
          destination: activeRide.destination,
          travelMode: google.maps.TravelMode.DRIVING,
        },
        (result, status) => {
          if (status === google.maps.DirectionsStatus.OK) {
            setDirections(result);
          }
        }
      );
    }
  }, [activeRide]);

  const handleProfileImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const file = e.target.files[0];
      setIsUpdatingProfile(true);
      try {
        const formData = new FormData();
        formData.append('fullName', user.name);
        formData.append('image', file);
        
        const response = await profileApi.updateProfile('pilot', formData);
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

  const toggleOnline = () => {
    const newOnlineStatus = !isOnline;
    setIsOnline(newOnlineStatus);
    
    if (socket) {
      if (newOnlineStatus) {
        socket.emit('pilot-go-online', { pilotId: user.id });
      } else {
        socket.emit('pilot-go-offline', { pilotId: user.id });
        setShowIncoming(false);
      }
    }
  };

  const handleAcceptRide = async () => {
    if (!incomingRide) return;
    try {
      const response = await rideApi.acceptRide(incomingRide._id);
      const backendRide = response.data;
      console.log("Ride accepted:", backendRide);
      setActiveRide(backendRide);
      setShowIncoming(false);
      setIncomingRide(null);

      // No need to manually update history here, it will be fetched or handled on completion
    } catch (err) {
      console.error("Failed to accept ride:", err);
      alert("Failed to accept ride. It might have been taken.");
      setShowIncoming(false);
      setIncomingRide(null);
    }
  };

  const handleCancelRide = async () => {
    if (!activeRide) return;
    try {
        await rideApi.cancelRide(activeRide._id);
        setActiveRide(null);
        setDirections(null);
        alert("Ride cancelled successfully.");
    } catch (err: any) {
        console.error("Failed to cancel ride:", err);
        if (err.response) {
            console.error("Cancellation Error Response:", err.response.data);
        }
        alert(`Failed to cancel ride: ${err.response?.data?.error || err.message}`);
    }
  };

  const handleAcceptPayment = async () => {
    if (!activeRide) return;
    try {
      await rideApi.completeRidePilot(activeRide._id);
      // Wait for socket 'ride-finalized' to clear the activeRide
    } catch (err) {
      console.error("Failed to accept payment:", err);
      alert("Failed to accept payment. Please try again.");
    }
  };

  const mapMarkers = useMemo(() => {
    const markers = [];
    if (currentLocation) {
        markers.push({
            id: 'me',
            position: currentLocation,
            title: 'Me'
        });
    }
    if (activeRide) {
        if (activeRide.pickup) {
            markers.push({ id: 'pickup', position: activeRide.pickup, title: 'Pickup', icon: 'https://maps.google.com/mapfiles/ms/icons/blue-dot.png' });
        }
        if (activeRide.destination) {
            markers.push({ id: 'destination', position: activeRide.destination, title: 'Destination', icon: 'https://maps.google.com/mapfiles/ms/icons/red-dot.png' });
        }
        if (riderLocation) {
            markers.push({ 
                id: 'rider', 
                position: riderLocation, 
                title: 'Rider', 
                icon: 'https://maps.google.com/mapfiles/ms/icons/man.png' 
            });
        }
    }
    return markers;
  }, [currentLocation, activeRide, riderLocation]);

  return (
    <div className="h-full w-full bg-slate-50 flex flex-col relative">
      {/* Map Preview Area / Active Ride */}
      <div className="flex-1 m-6 bg-slate-200 rounded-[40px] relative overflow-hidden">
        <GoogleMap 
          center={currentLocation} 
          markers={mapMarkers}
          directions={directions}
          paths={riderPath.length > 0 ? [{ id: 'rider-path', points: riderPath, color: '#3b82f6' }] : []}
        />

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
                <span className="text-slate-200">|</span>
                <button
                  onClick={onSwitchToRider}
                  className="text-[10px] font-black text-blue-600 hover:text-blue-700 transition-colors text-left uppercase tracking-tighter"
                >
                  Rider Mode
                </button>
              </div>
            </div>
          </div>
          <div className="px-4 py-2 bg-[#065f46] text-white rounded-full text-xs font-bold luxury-shadow pointer-events-auto">
            PILOT
          </div>
        </div>

        {!isOnline && !activeRide && (
          <div className="absolute inset-0 bg-white/60 backdrop-blur-sm flex items-center justify-center p-8">
            <div className="text-center">
                <p className="text-slate-500 font-medium mb-4">You are currently offline</p>
                <p className="text-sm text-slate-400">Go online to start receiving ride requests from Kano.</p>
            </div>
          </div>
        )}
        
        {isOnline && !activeRide && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-emerald-500 text-white px-4 py-2 rounded-full text-xs font-bold animate-pulse z-10">
            LIVE IN KANO
          </div>
        )}
        
        {activeRide && (
          <div className="absolute bottom-6 left-6 right-6 p-6 bg-white/90 backdrop-blur-md rounded-[32px] luxury-shadow border-2 border-emerald-500/20 z-10 animate-in slide-in-from-bottom-5 duration-500">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center text-2xl">🛺</div>
                    <div>
                        <p className="font-black text-slate-800 text-lg leading-none">In Progress</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">To: {activeRide.destinationAddress}</p>
                    </div>
                </div>
                <div className="text-right">
                    <p className="text-lg font-black text-emerald-600 leading-none">₦{activeRide.price}</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">{activeRide.rider?.fullName || 'Ziko Rider'}</p>
                </div>
            </div>

            <div className="flex gap-3">
                {activeRide.riderCompleted && (
                  <button
                    onClick={handleAcceptPayment}
                    className="flex-1 py-4 bg-emerald-600 text-white rounded-2xl font-black shadow-lg shadow-emerald-500/20 hover:bg-emerald-700 transition-all"
                  >
                    CONFIRM PAYMENT
                  </button>
                )}
                {!activeRide.riderCompleted && (
                  <div className="flex-1 py-4 bg-slate-100 text-slate-400 rounded-2xl font-bold text-center text-xs flex items-center justify-center uppercase tracking-widest">
                    Waiting for rider...
                  </div>
                )}
                <button
                    onClick={handleCancelRide}
                    className="w-14 h-14 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center font-bold border border-red-100"
                >
                    ✕
                </button>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Controls */}
      <div className="p-6 bg-white rounded-t-[40px] luxury-shadow">
        {!user.isVerified && (
          <div className="mb-4 p-4 bg-amber-50 rounded-2xl border border-amber-100 flex items-center gap-3">
            <span className="text-xl">⚠️</span>
            <p className="text-[11px] font-bold text-amber-700 leading-tight">
              ACCOUNT UNDER REVIEW<br/>
              <span className="opacity-70 font-medium">You cannot go online until your NIN and documents are verified.</span>
            </p>
          </div>
        )}
        <button
          disabled={!!activeRide || !user.isVerified}
          onClick={toggleOnline}
          className={`w-full py-5 rounded-[24px] font-black text-lg transition-all duration-500 disabled:opacity-50 ${isOnline ? 'bg-red-50 text-red-600' : 'bg-[#065f46] text-white shadow-xl shadow-emerald-900/20'}`}
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
                  <p className="font-bold text-slate-800">{incomingRide?.pickupAddress || 'Kurmi Market, Gate 3'}</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="w-2 bg-amber-500 rounded-full h-12"></div>
                <div className="flex-1">
                  <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Drop</p>
                  <p className="font-bold text-slate-800">{incomingRide?.destinationAddress || 'Bayero University (Old Site)'}</p>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-3xl flex justify-between items-center mb-8">
              <div>
                <p className="text-xs text-slate-400 font-bold">ESTIMATED EARNING</p>
                <p className="text-2xl font-black text-emerald-600">₦{incomingRide?.price || 0}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-400 font-bold">TYPE</p>
                <p className="text-lg font-black text-slate-800 uppercase">{incomingRide?.type || 'Standard'}</p>
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
                onClick={handleAcceptRide}
                className="flex-[2] py-4 bg-[#065f46] text-white rounded-2xl font-bold shadow-lg shadow-emerald-900/20"
              >
                Accept Ride
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Ride History Overlay */}
      {showHistory && (
        <RideHistory
          history={rideHistory}
          onBack={() => setShowHistory(false)}
          title="Trip Earnings"
        />
      )}
    </div>
  );
};

export default DriverApp;
