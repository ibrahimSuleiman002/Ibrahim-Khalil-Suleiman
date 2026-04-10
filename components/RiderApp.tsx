

import React, { useState, useEffect, useMemo } from 'react';
import { User, Location, RideType, UserRole, RideStatus, RideHistoryItem } from '../types';
import { KANO_LANDMARKS } from '../constants';
import RideHistory from './RideHistory';
import { rideApi, profileApi } from '../services/api';
import { io, Socket } from 'socket.io-client';
import GoogleMap from './GoogleMap';

interface RiderAppProps {
  user: User;
  onLogout: () => void;
  onUpdateUser: (user: User) => void;
  onSwitchToDriver: () => void;
}

const RiderApp: React.FC<RiderAppProps> = ({ user, onLogout, onUpdateUser, onSwitchToDriver }) => {
  const [status, setStatus] = useState<RideStatus>(RideStatus.IDLE);
  const [pickup, setPickup] = useState<string>('Current Location');
  const [pickupCoords, setPickupCoords] = useState<Location>({ lat: 11.9964, lng: 8.5167 });
  const [destination, setDestination] = useState<string>('');
  const [destCoords, setDestCoords] = useState<Location | null>(null);
  const [rideType, setRideType] = useState<RideType>(RideType.SHARED);
  const [showSearch, setShowSearch] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [basePrice, setBasePrice] = useState(300);
  const [bargainPrice, setBargainPrice] = useState(300);
  const [distanceMeters, setDistanceMeters] = useState<number | undefined>(undefined);
  const [rideHistory, setRideHistory] = useState<RideHistoryItem[]>([]);
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [activeRideData, setActiveRideData] = useState<any>(null);
  const [activeRideId, setActiveRideId] = useState<string | null>(null);
  const [driverLocation, setDriverLocation] = useState<Location | null>(null);
  const [directions, setDirections] = useState<google.maps.DirectionsResult | null>(null);
  const [driverPath, setDriverPath] = useState<Location[]>([]);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isOfflineQueued, setIsOfflineQueued] = useState(false);
  const [processingAction, setProcessingAction] = useState<string | null>(null);

  // Auto-resume request when network is back
  useEffect(() => {
    const handleOnline = () => {
      if (isOfflineQueued && destCoords && status === RideStatus.IDLE) {
        setIsOfflineQueued(false);
        handleRequestRide();
      }
    };
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [isOfflineQueued, destCoords, status, pickupCoords, destination, basePrice, bargainPrice, rideType]);

  // Default Pickup to Current Location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const newLoc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setPickupCoords(newLoc);
          setPickup('Current Location');
        },
        (err) => {
          console.error("Error getting initial position:", err);
          // Fallback to Kano center already set in state
        }
      );
    }
  }, []);

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

  // Fetch Active Ride on Mount
  useEffect(() => {
    const fetchActive = async () => {
      try {
        const response = await rideApi.getActiveRide();
        const { activeRide, pendingRequest } = response.data;
        
        if (activeRide) {
          setActiveRideData(activeRide);
          setActiveRideId(activeRide._id);
          setStatus(RideStatus.ACCEPTED); // Or IN_PROGRESS depending on backend
          setPickup(activeRide.pickupAddress || 'Kano');
          setDestination(activeRide.destinationAddress || 'Kano');
          setRideType(activeRide.type.toUpperCase() as RideType);
          setBargainPrice(activeRide.price);
          if (activeRide.pickup) setPickupCoords(activeRide.pickup);
          if (activeRide.destination) setDestCoords(activeRide.destination);
        } else if (pendingRequest) {
          setStatus(RideStatus.SEARCHING);
          setActiveRideId(pendingRequest._id); // Store pending request ID for cancellation
          setPickup(pendingRequest.pickupAddress || 'Kano');
          setDestination(pendingRequest.destinationAddress || 'Kano');
          setRideType(pendingRequest.type.toUpperCase() as RideType);
          setBargainPrice(pendingRequest.price);
          if (pendingRequest.pickup) setPickupCoords(pendingRequest.pickup);
          if (pendingRequest.destination) setDestCoords(pendingRequest.destination);
        }
      } catch (err) {
        console.error("Failed to fetch active ride:", err);
      }
    };
    fetchActive();
  }, [user.id]);

  // Request Timeout Logic (Stops searching if no pilots accept within 45s)
  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;
    if (status === RideStatus.SEARCHING && activeRideId) {
      timeoutId = setTimeout(async () => {
        try {
          await rideApi.cancelRequest(activeRideId);
          setStatus(RideStatus.IDLE);
          setActiveRideId(null);
          setActiveRideData(null);
          alert("No pilots available to accept your request at the moment. Please try again later.");
        } catch (err) {
          console.error("Timeout cancellation failed:", err);
          // Still reset UI if backend fails to cancel due to timeout or network issue
          setStatus(RideStatus.IDLE);
          setActiveRideId(null);
          alert("Search timed out. Please try again.");
        }
      }, 45000); // 45 seconds timeout
    }
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [status, activeRideId]);

  // Socket Connection
  useEffect(() => {
    const newSocket = io('http://localhost:5000');
    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log('Rider connected to socket');
      newSocket.emit('join', user.id);
    });

    newSocket.on('ride-accepted', (ride) => {
      console.log('Ride accepted by pilot:', ride);
      setActiveRideData(ride);
      setActiveRideId(ride._id);
      setStatus(RideStatus.ACCEPTED);
      if (ride.pickup) setPickupCoords(ride.pickup);
      if (ride.destination) setDestCoords(ride.destination);
    });

    newSocket.on('driver-location-update', (data) => {
      console.log('Driver location update:', data);
      setDriverLocation(data.location);
      setDriverPath(prev => [...prev, data.location]);
    });

    newSocket.on('ride-cancelled', (data) => {
      console.log('Ride cancelled by other party:', data);
      alert("The ride has been cancelled by the pilot.");
      setStatus(RideStatus.IDLE);
      setActiveRideData(null);
      setActiveRideId(null);
      setDriverLocation(null);
      setDriverPath([]);
      setDirections(null);
    });

    newSocket.on('ride-finalized', (finalRide) => {
      console.log('ride finalized:', finalRide);
      setStatus(RideStatus.IDLE);
      setDestination('');
      setActiveRideData(null);
      setActiveRideId(null);
      setDriverLocation(null);
      setDriverPath([]);
      setDirections(null);
      alert(`Trip completed! Price: ₦${finalRide.price}`);
    });

    newSocket.on('trip-count-update', (data) => {
        // If ride completed, data will come here or we check status periodically
        if (data.role === 'rider') {
             // Potentially refresh something or handle completion
        }
    });

    return () => {
      newSocket.disconnect();
    };
  }, [user.id]);

  // Watch Rider location and emit to socket
  useEffect(() => {
    if (status === RideStatus.IDLE) return;

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const newLoc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setPickupCoords(newLoc);
        if (socket && activeRideId) {
          socket.emit('update-location', {
            riderId: user.id,
            location: newLoc,
            pilotId: activeRideData?.pilot?._id || activeRideData?.pilot
          });
        }
      },
      (err) => console.error("Error watching rider location:", err),
      { enableHighAccuracy: true }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [status, socket, activeRideId, activeRideData, user.id]);

  // Get Directions when destination is selected
  useEffect(() => {
    if (pickupCoords && destCoords && window.google) {
      const directionsService = new google.maps.DirectionsService();
      directionsService.route(
        {
          origin: pickupCoords,
          destination: destCoords,
          travelMode: google.maps.TravelMode.DRIVING,
        },
        (result, status) => {
          if (status === google.maps.DirectionsStatus.OK) {
            setDirections(result);
            if (result?.routes[0]?.legs[0]?.distance?.value) {
                const distMeters = result.routes[0].legs[0].distance.value;
                setDistanceMeters(distMeters);
                const calcPrice = Math.floor((distMeters / 1000) * 135);
                setBasePrice(calcPrice);
                setBargainPrice(calcPrice);
            }
          } else {
            console.error(`error fetching directions ${result}`);
          }
        }
      );
    }
  }, [pickupCoords, destCoords]);

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

  const handleDestinationSelect = (name: string, coords: Location) => {
    setDestination(name);
    setDestCoords(coords);
    setShowSearch(false);
  };

  const handleRequestRide = async () => {
    if (!destCoords) return;
    
    if (!navigator.onLine) {
        setIsOfflineQueued(true);
        alert("You are offline. We will automatically request your ride as soon as your internet connection is restored.");
        return;
    }

    setStatus(RideStatus.SEARCHING);
    setError(null);
    try {
      const price = rideType === RideType.SHARED ? basePrice : bargainPrice;
      
      const response = await rideApi.requestRide(pickupCoords, destCoords, pickup, destination, price, rideType, distanceMeters);
      console.log("Ride requested:", response.data);
      setActiveRideId(response.data._id);
      // Wait for socket notification 'ride-accepted'
    } catch (err: any) {
      console.error("Ride Request Error:", err);
      // If it's a network error from Axios (no response), queue it
      if (!err.response && !navigator.onLine) {
         setStatus(RideStatus.IDLE);
         setIsOfflineQueued(true);
         alert("Network disconnected. We'll keep trying when it connects.");
         return;
      }
      
      setStatus(RideStatus.IDLE);
      if (err.response?.status === 404 && err.response?.data?.error === "No available pilot yet") {
        alert("No available pilot yet");
      } else {
        alert(err.response?.data?.error || "Failed to request ride. Please try again.");
      }
    }
  };

  const handleCancelRide = async () => {
    if (!activeRideId) return;
    setProcessingAction('cancel');
    try {
        if (status === RideStatus.SEARCHING) {
            await rideApi.cancelRequest(activeRideId);
        } else {
            await rideApi.cancelRide(activeRideId);
        }
        setStatus(RideStatus.IDLE);
        setActiveRideData(null);
        setActiveRideId(null);
        setDriverLocation(null);
        setDirections(null);
        alert("Ride cancelled successfully.");
    } catch (err: any) {
        console.error("Failed to cancel ride:", err);
        if (err.response) {
            console.error("Cancellation Error Response:", err.response.data);
        }
        alert(`Failed to cancel ride: ${err.response?.data?.error || err.message}`);
    } finally {
        setProcessingAction(null);
    }
  };

  const handleCompleteRide = async () => {
    if (!activeRideId) return;
    setProcessingAction('complete');
    try {
        await rideApi.completeRideRider(activeRideId);
        // Status will be IDLE if the backend logic works or we can set it here
        // Actually, finalizeRideIfPossible marks it as completed in DB
        // For now, let's just reset locally after rider completes
        setStatus(RideStatus.IDLE);
        setDestination('');
        setActiveRideData(null);
        setActiveRideId(null);
        setDriverLocation(null);
        setDirections(null);
    } catch (err) {
        console.error("Failed to complete ride:", err);
        alert("Failed to complete ride.");
    } finally {
        setProcessingAction(null);
    }
  };

  const mapMarkers = useMemo(() => {
    const markers = [];
    if (pickupCoords) {
      markers.push({ 
        id: 'pickup', 
        position: pickupCoords, 
        title: 'Pickup', 
        icon: 'https://maps.google.com/mapfiles/ms/icons/blue-dot.png' 
      });
    }
    if (destCoords) {
      markers.push({ 
        id: 'destination', 
        position: destCoords, 
        title: 'Destination', 
        icon: 'https://maps.google.com/mapfiles/ms/icons/red-dot.png' 
      });
    }
    if (driverLocation) {
        markers.push({
            id: 'driver',
            position: driverLocation,
            title: 'Driver'
        });
    }
    return markers;
  }, [pickupCoords, destCoords, driverLocation]);

  return (
    <div className="h-full w-full relative">
      {/* Google Map Section */}
      <div className="absolute inset-0">
        <GoogleMap 
          center={pickupCoords} 
          markers={mapMarkers}
          directions={directions}
          paths={driverPath.length > 0 ? [{ id: 'driver-path', points: driverPath, color: '#10b981' }] : []}
        />
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
      <div className={`absolute bottom-0 left-0 right-0 transition-all duration-500 ease-out z-30 ${(isMinimized && (status === RideStatus.SEARCHING || status === RideStatus.ACCEPTED)) ? 'translate-y-[90%]' : 'translate-y-0'}`}>
        <div className="mx-auto max-w-lg bg-white rounded-t-[40px] luxury-shadow p-6 pb-10 relative">
          {/* Minimize/Maximize Handle for Active Ride */}
          {isMinimized && (status === RideStatus.SEARCHING || status === RideStatus.ACCEPTED) && (
            <button 
                onClick={() => setIsMinimized(false)}
                className="absolute -top-12 left-1/2 -translate-x-1/2 bg-[#065f46] text-white px-6 py-2 rounded-t-2xl font-bold flex items-center gap-2 animate-bounce pointer-events-auto"
            >
                <span>↑</span> VIEW ACTIVE RIDE
            </button>
          )}
          
          <div className="w-12 h-1 bg-slate-200 rounded-full mx-auto mb-6"></div>

          {status === RideStatus.IDLE && (
            <div className="space-y-6">
              <div className="bg-slate-50 p-4 rounded-3xl space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                  <input
                    type="text"
                    value={pickup}
                    onChange={(e) => setPickup(e.target.value)}
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

              {/* Bargain Section Commented Out
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
              */}

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
              <button disabled={!!processingAction} onClick={handleCancelRide} className="text-red-500 font-bold mt-4 disabled:opacity-50 flex items-center justify-center gap-2 mx-auto">
                {processingAction === 'cancel' && <div className="w-4 h-4 border-2 border-red-500/30 border-t-red-500 rounded-full animate-spin"></div>}
                {processingAction === 'cancel' ? 'Cancelling...' : 'Cancel Request'}
              </button>
            </div>
          )}

          {status === RideStatus.ACCEPTED && activeRideData && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-slate-800">
                    {activeRideData.status === 'ongoing' ? 'Ride In Progress' : 'Driver is Arriving'}
                  </h3>
                  <p className="text-sm text-emerald-600 font-medium">
                    {activeRideData.status === 'ongoing' ? 'On the way to destination' : 'Arriving soon'} • {activeRideData.pilot?.plateNumber || 'KKE-12-KNO'}
                  </p>
                </div>
                <button className="w-12 h-12 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center font-bold">SOS</button>
              </div>
 
              <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-3xl">
                <div className="w-14 h-14 bg-slate-200 rounded-2xl overflow-hidden">
                  <img src={activeRideData.pilot?.image || `https://picsum.photos/100/100?random=${activeRideData.pilot?._id}`} alt="Driver" className="w-full h-full object-cover" />
                </div>
                <div className="flex-1">
                  <p className="font-bold text-slate-800">{activeRideData.pilot?.fullName || "Ziko Pilot"}</p>
                  <p className="text-xs text-slate-500">⭐ 4.9 • {activeRideData.pilot?.phone || 'Contact Pilot'}</p>
                </div>
                <button className="w-10 h-10 bg-[#065f46] text-white rounded-full flex items-center justify-center">📞</button>
              </div>
 
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-emerald-50 rounded-2xl">
                  <p className="text-[10px] uppercase font-bold text-emerald-700 tracking-wider">Fare</p>
                  <p className="text-lg font-bold text-emerald-900">₦{activeRideData.price}</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-2xl">
                  <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Payment</p>
                  <p className="text-lg font-bold text-slate-800">Cash</p>
                </div>
              </div>

              <div className="space-y-3">
                <button
                    onClick={handleCompleteRide}
                    disabled={!!processingAction}
                    className="w-full py-4 bg-[#065f46] text-white rounded-2xl font-bold shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
                >
                    {processingAction === 'complete' && <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>}
                    {processingAction === 'complete' ? 'Processing...' : 'Mark as Completed'}
                </button>
                <button
                    onClick={handleCancelRide}
                    disabled={!!processingAction}
                    className="w-full py-4 bg-red-50 text-red-600 rounded-2xl font-bold border border-red-100 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                    {processingAction === 'cancel' && <div className="w-5 h-5 border-2 border-red-600/30 border-t-red-600 rounded-full animate-spin"></div>}
                    {processingAction === 'cancel' ? 'Processing...' : 'Cancel Ride'}
                </button>
                <button
                    onClick={() => setIsMinimized(true)}
                    className="w-full py-3 text-slate-400 font-medium text-xs"
                >
                    Minimize (Stay in Dash)
                </button>
              </div>
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
                onClick={() => handleDestinationSelect(landmark.name, { lat: landmark.lat, lng: landmark.lng })}
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
          trips={user.trips}
        />
      )}
    </div>
  );
};

export default RiderApp;
