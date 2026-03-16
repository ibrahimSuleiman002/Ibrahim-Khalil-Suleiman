
import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('ziko_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const authApi = {
  firebaseLogin: (idToken: string, phone: string, role: string) =>
    api.post('/auth/firebase-login', { idToken, phone, role }),
  verifyNin: (nin: string) => api.post('/auth/verify-nin', { nin }),
  getMe: (role: 'rider' | 'pilot') => api.get(`/${role}s/me`),
};

export const profileApi = {
  updateProfile: (role: 'rider' | 'pilot', formData: FormData) =>
    api.post(`/${role}s/profile`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
};

export const rideApi = {
  getHistory: () => api.get('/rides/history'),
  requestRide: (pickup: any, destination: any, pickupAddress: string, destinationAddress: string, price: number, type: string) => 
    api.post('/rides/request', { pickup, destination, pickupAddress, destinationAddress, price, type }),
  acceptRide: (rideId: string) => api.post(`/rides/accept/${rideId}`),
  getActiveRide: () => api.get('/rides/active'),
  completeRideRider: (rideId: string) => api.post(`/rides/complete-rider/${rideId}`),
  completeRidePilot: (rideId: string) => api.post(`/rides/complete-pilot/${rideId}`),
};

export default api;
