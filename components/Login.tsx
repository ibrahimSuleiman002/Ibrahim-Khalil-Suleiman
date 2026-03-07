
import React, { useState } from 'react';
import { UserRole, User } from '../types';

interface LoginProps {
  onLogin: (user: User) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [step, setStep] = useState<'role' | 'phone' | 'otp' | 'profile'>('role');
  const [role, setRole] = useState<UserRole | null>(null);
  const [phone, setPhone] = useState('');

  // Profile States
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState('');
  const [vehicleType, setVehicleType] = useState('Standard Keke');
  const [plateNumber, setPlateNumber] = useState('');

  const handleRoleSelect = (selectedRole: UserRole) => {
    setRole(selectedRole);
    setStep('phone');
  };

  const handlePhoneSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (phone.length >= 10) setStep('otp');
  };

  const handleOtpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!role) return;

    setStep('profile');
  };

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!role) return;

    const newUser: User = {
      id: Math.random().toString(36).substr(2, 9),
      name: name || "User",
      phone,
      role,
      avatar: avatar || `https://picsum.photos/200/200?random=${Math.random()}`,
      isVerified: true,
      vehicleType: role === UserRole.DRIVER ? vehicleType : undefined,
      plateNumber: role === UserRole.DRIVER ? plateNumber : undefined,
      isDriverVerified: role === UserRole.DRIVER ? true : undefined
    };
    onLogin(newUser);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <h1 className="text-5xl font-black text-[#065f46] tracking-tighter mb-2 italic">ZIKO</h1>
          <p className="text-slate-500 font-medium">Premium Keke Hailing • Kano</p>
        </div>

        {step === 'role' && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h2 className="text-xl font-bold text-slate-800 text-center mb-6">Choose Your Journey</h2>

            <button
              onClick={() => handleRoleSelect(UserRole.RIDER)}
              className="w-full p-6 bg-white luxury-shadow rounded-3xl flex items-center justify-between hover:border-[#065f46] border-2 border-transparent transition-all group"
            >
              <div className="text-left">
                <p className="text-lg font-bold text-slate-800">I want a ride</p>
                <p className="text-sm text-slate-500">Ride across Kano in comfort</p>
              </div>
              <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">🛺</div>
            </button>

            <button
              onClick={() => handleRoleSelect(UserRole.DRIVER)}
              className="w-full p-6 bg-white luxury-shadow rounded-3xl flex items-center justify-between hover:border-[#b45309] border-2 border-transparent transition-all group"
            >
              <div className="text-left">
                <p className="text-lg font-bold text-slate-800">I am a Pilot</p>
                <p className="text-sm text-slate-500">Drive and earn on your schedule</p>
              </div>
              <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">💳</div>
            </button>

          </div>
        )}

        {step === 'phone' && (
          <form onSubmit={handlePhoneSubmit} className="space-y-6 animate-in zoom-in-95 duration-300">
            <div className="bg-white p-8 rounded-[40px] luxury-shadow">
              <h2 className="text-2xl font-bold text-slate-800 mb-2">Welcome Back</h2>
              <p className="text-slate-500 mb-8 text-sm">Enter your phone number to continue.</p>

              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-400">+234</span>
                <input
                  autoFocus
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                  placeholder="800 000 0000"
                  className="w-full pl-16 pr-4 py-4 bg-slate-50 border-none rounded-2xl text-lg font-bold focus:ring-2 focus:ring-[#065f46]"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={phone.length < 10}
              className="w-full py-5 bg-[#065f46] text-white rounded-3xl font-bold shadow-lg shadow-emerald-900/20 disabled:opacity-50 transition-opacity"
            >
              Get Secure Code
            </button>
            <button onClick={() => setStep('role')} className="w-full text-slate-400 font-medium text-sm">Go Back</button>
          </form>
        )}

        {step === 'otp' && (
          <form onSubmit={handleOtpSubmit} className="space-y-6 animate-in zoom-in-95 duration-300">
            <div className="bg-white p-8 rounded-[40px] luxury-shadow">
              <h2 className="text-2xl font-bold text-slate-800 mb-2">Verify ID</h2>
              <p className="text-slate-500 mb-8 text-sm">We sent a code to +234 {phone}.</p>

              <div className="flex gap-2 justify-center">
                {[1, 2, 3, 4].map((i) => (
                  <input
                    key={i}
                    type="text"
                    maxLength={1}
                    className="w-14 h-14 text-center text-2xl font-bold bg-slate-50 rounded-2xl focus:ring-2 focus:ring-[#065f46]"
                    autoFocus={i === 1}
                  />
                ))}
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-5 bg-[#065f46] text-white rounded-3xl font-bold shadow-lg shadow-emerald-900/20"
            >
              Confirm Access
            </button>
            <button onClick={() => setStep('phone')} className="w-full text-slate-400 font-medium text-sm">Change Number</button>
          </form>
        )}

        {step === 'profile' && (
          <form onSubmit={handleProfileSubmit} className="space-y-6 animate-in zoom-in-95 duration-300 max-h-[85vh] overflow-y-auto pb-10 custom-scrollbar">
            <div className="bg-white p-8 rounded-[40px] luxury-shadow space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-slate-800 mb-2">
                  {role === UserRole.DRIVER ? 'Pilot Profile' : 'Rider Profile'}
                </h2>
                <p className="text-slate-500 text-sm">Let others recognize you on the road.</p>
              </div>

              <div className="flex justify-center mb-6">
                <div className="relative group">
                  <div className="w-24 h-24 bg-slate-100 rounded-full overflow-hidden border-4 border-emerald-50 flex items-center justify-center text-4xl">
                    {avatar ? <img src={avatar} alt="Profile" className="w-full h-full object-cover" /> : '👤'}
                  </div>
                  <label className="absolute bottom-0 right-0 w-8 h-8 bg-[#065f46] text-white rounded-full flex items-center justify-center cursor-pointer shadow-lg hover:scale-110 transition-transform">
                    <span>📸</span>
                    <input
                      type="file"
                      className="hidden"
                      onChange={(e) => {
                        // Simulated file upload
                        if (e.target.files?.[0]) {
                          setAvatar(URL.createObjectURL(e.target.files[0]));
                        }
                      }}
                    />
                  </label>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Full Name</label>
                  <input
                    required
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your name"
                    className="w-full px-4 py-4 bg-slate-50 border-none rounded-2xl font-bold focus:ring-2 focus:ring-[#065f46]"
                  />
                </div>

                {role === UserRole.DRIVER && (
                  <>
                    <div>
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Vehicle Type</label>
                      <select
                        value={vehicleType}
                        onChange={(e) => setVehicleType(e.target.value)}
                        className="w-full px-4 py-4 bg-slate-50 border-none rounded-2xl font-bold focus:ring-2 focus:ring-[#065f46] appearance-none"
                      >
                        <option>Standard Keke</option>
                        <option>Premium Keke</option>
                        <option>Elite Keke</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Plate Number</label>
                      <input
                        required
                        type="text"
                        value={plateNumber}
                        onChange={(e) => setPlateNumber(e.target.value.toUpperCase())}
                        placeholder="KKE-00-XXX"
                        className="w-full px-4 py-4 bg-slate-50 border-none rounded-2xl font-bold focus:ring-2 focus:ring-[#065f46]"
                      />
                    </div>
                    <div className="p-4 bg-emerald-50 rounded-2xl flex items-center gap-3">
                      <div className="w-6 h-6 bg-emerald-500 text-white rounded-full flex items-center justify-center text-[10px]">✓</div>
                      <p className="text-xs font-bold text-emerald-800">IDENTITY VERIFICATION READY</p>
                    </div>
                  </>
                )}
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-5 bg-[#065f46] text-white rounded-3xl font-bold shadow-lg shadow-emerald-900/20"
            >
              Complete Registration
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default Login;
