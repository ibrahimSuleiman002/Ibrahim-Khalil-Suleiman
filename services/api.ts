
import axios from 'axios';

// const API_BASE_URL = 'https://ziko-backend.onrender.com/api';
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
  requestRide: (pickup: any, destination: any, pickupAddress: string, destinationAddress: string, price: number, type: string, distance?: number) =>
    api.post('/rides/request', { pickup, destination, pickupAddress, destinationAddress, price, type, distance }),
  acceptRide: (rideId: string) => api.post(`/rides/accept/${rideId}`),
  getActiveRide: () => api.get('/rides/active'),
  getActiveRequests: () => api.get('/rides/requests'),
  completeRideRider: (rideId: string) => api.post(`/rides/complete-rider/${rideId}`),
  completeRidePilot: (rideId: string) => api.post(`/rides/complete-pilot/${rideId}`),
  cancelRide: (rideId: string) => api.post(`/rides/cancel-ride/${rideId}`),
  cancelRequest: (requestId: string) => api.post(`/rides/cancel-request/${requestId}`),
};

export const paymentApi = {
  clearCommission: (reference: string) => api.post('/payment/clear-commission', { reference }),
};

export default api;
