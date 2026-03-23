
import React, { useState, useEffect } from 'react';
import { auth } from './firebaseConfig';
import { onAuthStateChanged } from 'firebase/auth';
import { UserRole, User } from './types';
import RiderApp from './components/RiderApp';
import DriverApp from './components/DriverApp';
import Login from './components/Login';
import { authApi } from './services/api';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeRole, setActiveRole] = useState<UserRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Sync with Firebase Auth
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        const savedToken = localStorage.getItem('ziko_token');
        const savedUser = localStorage.getItem('ziko_user');
        
        if (savedToken && savedUser) {
          const user = JSON.parse(savedUser);
          setCurrentUser(user);
          setActiveRole(user.role);
          refreshUserData(user.role);
        }
      } else {
        setCurrentUser(null);
        setActiveRole(null);
        localStorage.removeItem('ziko_token');
        localStorage.removeItem('ziko_user');
      }
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Periodic refresh for real-time status (like verification)
  useEffect(() => {
    let interval: any;
    if (currentUser) {
      interval = setInterval(() => {
        refreshUserData(currentUser.role);
      }, 15000); // Sync every 15 seconds
    }
    return () => clearInterval(interval);
  }, [currentUser?.id]);

  const refreshUserData = async (roleType: UserRole) => {
    try {
      const role = roleType === UserRole.RIDER ? 'rider' : 'pilot';
      const response = await authApi.getMe(role);
      const backendUser = response.data;
      if (!backendUser) return;

      const updatedUser: User = {
        id: backendUser._id,
        name: backendUser.fullName,
        phone: backendUser.phone,
        role: roleType,
        avatar: backendUser.image,
        isVerified: backendUser.verified,
        vehicleType: backendUser.vehicleType,
        plateNumber: backendUser.plateNumber,
        nin: backendUser.nin,
        plateNumberImage: backendUser.plateNumberImage,
        vehicleDocument: backendUser.vehicleDocument,
        isDriverVerified: backendUser.verified,
        balance: backendUser.balance || 0,
        trips: roleType === UserRole.RIDER ? (backendUser.riderTrips || 0) : (backendUser.pilotTrips || 0)
      };
      
      // Only update if something changed to prevent unnecessary re-renders
      if (JSON.stringify(updatedUser) !== localStorage.getItem('ziko_user')) {
        setCurrentUser(updatedUser);
        localStorage.setItem('ziko_user', JSON.stringify(updatedUser));
      }
    } catch (err) {
      console.error("Failed to refresh user data:", err);
    }
  };

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    setActiveRole(user.role);
    localStorage.setItem('ziko_user', JSON.stringify(user));
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setActiveRole(null);
    localStorage.removeItem('ziko_user');
    localStorage.removeItem('ziko_token');
    auth.signOut();
  };

  const handleUpdateUser = (user: User) => {
    setCurrentUser(user);
    localStorage.setItem('ziko_user', JSON.stringify(user));
  };

  if (isLoading) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-[#065f46]">
        <div className="mb-8 animate-pulse text-white text-6xl font-black tracking-tighter">
          ZIKO
        </div>
        <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin"></div>
        <p className="text-white/70 mt-4 font-medium tracking-wide">Connecting Kano...</p>
      </div>
    );
  }

  if (!currentUser) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="h-screen w-screen bg-slate-50 overflow-hidden relative">
      {activeRole === UserRole.RIDER && (
        <RiderApp 
          user={currentUser} 
          onLogout={handleLogout} 
          onUpdateUser={handleUpdateUser} 
          onSwitchToDriver={() => setActiveRole(UserRole.DRIVER)}
        />
      )}
      {activeRole === UserRole.DRIVER && (
        <DriverApp 
          user={currentUser} 
          onLogout={handleLogout} 
          onUpdateUser={handleUpdateUser}
          onSwitchToRider={() => setActiveRole(UserRole.RIDER)}
        />
      )}
    </div>
  );
};

export default App;
