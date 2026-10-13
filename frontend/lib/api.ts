// frontend/lib/api.ts
import axios from 'axios';
import { useAuthStore } from './store';

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'https://tobie-graybearded-louis.ngrok-free.dev',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor — inject JWT
api.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor — handle 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout();
      if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);