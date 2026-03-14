
import React, { useState, useEffect, useRef } from 'react';
import { UserRole, User } from '../types';
import { auth } from '../firebaseConfig';
import {
  RecaptchaVerifier,
  signInWithPhoneNumber,
  ConfirmationResult,
  onAuthStateChanged
} from 'firebase/auth';
import { authApi, profileApi } from '../services/api';

interface LoginProps {
  onLogin: (user: User) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [step, setStep] = useState<'role' | 'phone' | 'otp' | 'profile'>('role');
  const [role, setRole] = useState<UserRole | null>(null);
  const [phone, setPhone] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  // Profile States
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [vehicleType, setVehicleType] = useState('Standard Keke');
  const [plateNumber, setPlateNumber] = useState('');

  const recaptchaRef = useRef<RecaptchaVerifier | null>(null);

  useEffect(() => {
    // Check if user is already logged in (but might need profile setup)
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user && user.phoneNumber && step === 'role') {
        setPhone(user.phoneNumber.replace('+234', ''));
        // If we have a user but no session in App.tsx, we still go through the flow
        // or we could skip to profile if they are new.
      }
    });
    return () => unsubscribe();
  }, [step]);

  const setupRecaptcha = () => {
    if (!recaptchaRef.current) {
      recaptchaRef.current = new RecaptchaVerifier(auth, 'recaptcha-container', {
        'size': 'invisible',
        'callback': () => {
          // reCAPTCHA solved, allow signInWithPhoneNumber.
        }
      });
    }
  };

  const handleRoleSelect = (selectedRole: UserRole) => {
    setRole(selectedRole);
    setStep('phone');
  };

  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (phone.length < 10) return;

    setError(null);
    setIsSending(true);

    try {
      setupRecaptcha();
      const appVerifier = recaptchaRef.current;
      if (!appVerifier) throw new Error("Recaptcha not initialized");

      const formattedPhone = `+234${phone.startsWith('0') ? phone.substring(1) : phone}`;
      const confirmation = await signInWithPhoneNumber(auth, formattedPhone, appVerifier);
      setConfirmationResult(confirmation);
      setStep('otp');
    } catch (err: any) {
      console.error("Auth Error:", err);
      setError(err.message || "Failed to send SMS. Please try again.");
      if (recaptchaRef.current) {
        recaptchaRef.current.clear();
        recaptchaRef.current = null;
      }
    } finally {
      setIsSending(false);
    }
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmationResult || verificationCode.length < 6) return;

    setError(null);
    setIsVerifying(true);

    try {
      const result = await confirmationResult.confirm(verificationCode);
      const idToken = await result.user.getIdToken();
      const backendRole = role === UserRole.RIDER ? 'rider' : 'pilot';
      
      try {
        const response = await authApi.firebaseLogin(idToken, phone, backendRole);
        const { token, user: backendUser } = response.data;
        
        localStorage.setItem('ziko_token', token);
        
        if (backendUser.fullName) {
          onLogin({
            id: backendUser._id,
            name: backendUser.fullName,
            phone: backendUser.phone,
            role: role!,
            avatar: backendUser.image,
            isVerified: backendUser.verified,
            vehicleType: backendUser.vehicleType,
            plateNumber: backendUser.plateNumber,
            isDriverVerified: backendUser.verified
          });
        } else {
          setStep('profile');
        }
      } catch (backendErr: any) {
        console.error("Backend Auth Error:", backendErr);
        const msg = backendErr.response?.data?.error;
        setError(typeof msg === 'string' ? msg : "Backend authentication failed.");
      }
    } catch (firebaseErr: any) {
      console.error("Firebase Verification Error:", firebaseErr);
      setError("Invalid OTP code. Please check and try again.");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!role) return;

    setError(null);
    setIsVerifying(true);

    try {
      const formData = new FormData();
      formData.append('fullName', name);
      if (avatarFile) {
        formData.append('image', avatarFile);
      }
      if (role === UserRole.DRIVER) {
        formData.append('vehicleType', vehicleType);
        formData.append('plateNumber', plateNumber);
      }

      const backendRole = role === UserRole.RIDER ? 'rider' : 'pilot';
      const response = await profileApi.updateProfile(backendRole, formData);
      const backendUser = response.data;

      const newUser: User = {
        id: backendUser._id,
        name: backendUser.fullName,
        phone: backendUser.phone,
        role: role,
        avatar: backendUser.image,
        isVerified: backendUser.verified,
        vehicleType: backendUser.vehicleType,
        plateNumber: backendUser.plateNumber,
        isDriverVerified: backendUser.verified
      };
      onLogin(newUser);
    } catch (err: any) {
      console.error("Profile Update Error Detailed:", err);
      let errorMsg = "Failed to save profile. Please try again.";
      
      if (err.response?.data) {
        const data = err.response.data;
        if (typeof data.error === 'string') {
          errorMsg = data.error;
        } else if (typeof data === 'string') {
          errorMsg = data;
        } else {
          errorMsg = JSON.stringify(data);
        }
      } else if (err.message) {
        errorMsg = err.message;
      }
      
      setError(errorMsg);
    } finally {
      setIsVerifying(false);
    }
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

              {error && (
                <div className="bg-red-50 p-4 rounded-2xl border border-red-100 mb-6">
                  <p className="text-red-500 text-xs font-bold text-center">
                    {typeof error === 'string' ? error : JSON.stringify(error)}
                  </p>
                </div>
              )}
              <div id="recaptcha-container"></div>
            </div>

            <button
              type="submit"
              disabled={phone.length < 10 || isSending}
              className="w-full py-5 bg-[#065f46] text-white rounded-3xl font-bold shadow-lg shadow-emerald-900/20 disabled:opacity-50 transition-opacity flex items-center justify-center gap-2"
            >
              {isSending ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                  Sending...
                </>
              ) : "Get Secure Code"}
            </button>
            <button type="button" onClick={() => setStep('role')} className="w-full text-slate-400 font-medium text-sm">Go Back</button>
          </form>
        )}

        {step === 'otp' && (
          <form onSubmit={handleOtpSubmit} className="space-y-6 animate-in zoom-in-95 duration-300">
            <div className="bg-white p-8 rounded-[40px] luxury-shadow">
              <h2 className="text-2xl font-bold text-slate-800 mb-2">Verify ID</h2>
              <p className="text-slate-500 mb-8 text-sm">We sent a 6-digit code to +234 {phone}.</p>

              <div className="flex justify-center">
                <input
                  autoFocus
                  type="text"
                  maxLength={6}
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="000000"
                  className="w-full text-center text-3xl tracking-[1rem] font-black bg-slate-50 py-4 rounded-2xl focus:ring-2 focus:ring-[#065f46] outline-none"
                />
              </div>

              {error && (
                <div className="bg-red-50 p-4 rounded-2xl border border-red-100 mb-6">
                  <p className="text-red-500 text-xs font-bold text-center">
                    {typeof error === 'string' ? error : JSON.stringify(error)}
                  </p>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={verificationCode.length < 6 || isVerifying}
              className="w-full py-5 bg-[#065f46] text-white rounded-3xl font-bold shadow-lg shadow-emerald-900/20 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isVerifying ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                  Verifying...
                </>
              ) : "Confirm Access"}
            </button>
            <button type="button" onClick={() => {
              setStep('phone');
              setVerificationCode('');
              setError(null);
            }} className="w-full text-slate-400 font-medium text-sm">Change Number</button>
          </form>
        )}

        {step === 'profile' && (
          <form onSubmit={handleProfileSubmit} className="space-y-6 animate-in zoom-in-95 duration-300 max-h-[80vh] overflow-y-auto pb-20 px-1 custom-scrollbar">
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
                        if (e.target.files?.[0]) {
                          const file = e.target.files[0];
                          setAvatarFile(file);
                          setAvatar(URL.createObjectURL(file));
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
                    {role === UserRole.DRIVER && name && avatarFile && plateNumber && (
                      <div className="p-4 bg-emerald-50 rounded-2xl flex items-center gap-3 animate-in fade-in zoom-in duration-300">
                        <div className="w-6 h-6 bg-emerald-500 text-white rounded-full flex items-center justify-center text-[10px]">✓</div>
                        <p className="text-xs font-bold text-emerald-800">IDENTITY VERIFICATION READY</p>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={isVerifying}
              className="w-full py-5 bg-[#065f46] text-white rounded-3xl font-bold shadow-lg shadow-emerald-900/20 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isVerifying ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                  Registering...
                </>
              ) : "Complete Registration"}
            </button>
          </form>
        )}
      </div>
    </div >
  );
};

export default Login;
