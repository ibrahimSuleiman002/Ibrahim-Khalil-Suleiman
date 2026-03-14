
import React, { useState, useEffect } from 'react';
import { auth } from './firebaseConfig';
import { onAuthStateChanged } from 'firebase/auth';
import { UserRole, User } from './types';
import RiderApp from './components/RiderApp';
import DriverApp from './components/DriverApp';
import Login from './components/Login';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Sync with Firebase Auth
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (fbUser) => {
      if (fbUser) {
        const saved = localStorage.getItem('ziko_user');
        if (saved) {
          const user = JSON.parse(saved);
          // Ensure the phone number matches or update if necessary
          setCurrentUser(user);
        } else {
          // If no local record exists but Firebase is logged in, 
          // we might need to prompt for profile setup if the current UI doesn't handle it.
          // For now, we'll let the Login component handle the profile setup on new logins.
          setCurrentUser(null);
        }
      } else {
        setCurrentUser(null);
      }
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    localStorage.setItem('ziko_user', JSON.stringify(user));
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('ziko_user');
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
      {currentUser.role === UserRole.RIDER && <RiderApp user={currentUser} onLogout={handleLogout} />}
      {currentUser.role === UserRole.DRIVER && <DriverApp user={currentUser} onLogout={handleLogout} />}
    </div>
  );
};

export default App;
