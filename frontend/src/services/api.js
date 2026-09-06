import axios from 'axios';

// When VITE_BACKEND_URL / VITE_API_URL is empty, axios uses relative URLs.
// Vite dev proxy forwards /api/* to http://localhost:5000
// In production, set VITE_BACKEND_URL or VITE_API_URL to the deployed backend host.
const rawBase = (import.meta.env.VITE_BACKEND_URL || import.meta.env.VITE_API_URL || '').trim().replace(/\/+$/, '');
const baseURL = rawBase ? `${rawBase}/api` : '/api';

const api = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 12000,
});

// ── Request interceptor — attach JWT if present ───────────────────────────────
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('kw_token');
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
});

// ── Response interceptor — normalise errors, handle 401 ──────────────────────
api.interceptors.response.use(
  (response) => {
    // If the server responded with an HTML document instead of JSON
    // (e.g. Vercel SPA rewrite fallback or unhandled server crash page)
    if (typeof response.data === 'string' && response.data.trim().startsWith('<')) {
      return Promise.reject(new Error('Backend returned HTML instead of JSON. Ensure VITE_BACKEND_URL is set to your Railway backend URL.'));
    }
    return response;
  },
  (error) => {
    if (error.response) {
      const status = error.response.status;

      // 401 Unauthorised — token expired or invalid → force logout
      if (status === 401) {
        const isAuthEndpoint = error.config?.url?.includes('/auth/');
        if (!isAuthEndpoint) {
          // Only auto-logout for non-auth endpoints (game requests, /me, etc.)
          localStorage.removeItem('kw_token');
          localStorage.removeItem('kw_user');
          window.location.href = '/login';
        }
      }

      if (typeof error.response.data === 'string' && error.response.data.trim().startsWith('<')) {
        error.friendlyMessage = `Server error (${status}). The backend service may be starting up or encountered an unhandled error.`;
      } else if (error.response.data?.error) {
        error.friendlyMessage = error.response.data.error;
      } else {
        error.friendlyMessage = `Server error (${status}). Please try again.`;
      }
    } else if (error.request) {
      error.friendlyMessage = 'Unable to connect to backend server. Please check your internet connection or backend deployment.';
    } else {
      error.friendlyMessage = error.message || 'Failed to process request.';
    }
    return Promise.reject(error);
  }
);

// ── Game API ──────────────────────────────────────────────────────────────────
export const createGame     = (data)           => api.post('/create-game', data);
export const joinGame       = (data)           => api.post('/join-game', data);
export const getGame        = (gameCode)       => api.get(`/game/${gameCode}`);
export const submitQuestion = (gameCode, data) => api.post(`/game/${gameCode}/submit-question`, data);
export const getLeaderboard = (gameCode)       => api.get(`/game/${gameCode}/leaderboard`);
export const healthCheck    = ()               => api.get('/health');

// ── Auth API ──────────────────────────────────────────────────────────────────
export const authLogin    = (data) => api.post('/auth/login', data);
export const authRegister = (data) => api.post('/auth/register', data);
export const authMe       = ()     => api.get('/auth/me');
export const authLogout   = ()     => api.post('/auth/logout');

export default api;
