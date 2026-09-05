import axios from 'axios';

// When VITE_BACKEND_URL / VITE_API_URL is empty, axios uses relative URLs.
// Vite dev proxy forwards /api/* to http://localhost:5000
// In production, set VITE_BACKEND_URL or VITE_API_URL to the deployed backend host.
const BASE_URL = import.meta.env.VITE_BACKEND_URL || import.meta.env.VITE_API_URL || '';

const api = axios.create({
  baseURL: `${BASE_URL}/api`,
  headers: { 'Content-Type': 'application/json' },
  timeout: 10000,
});

export const createGame  = (data)           => api.post('/create-game', data);
export const joinGame    = (data)           => api.post('/join-game', data);
export const getGame     = (gameCode)       => api.get(`/game/${gameCode}`);
export const submitQuestion = (gameCode, data) => api.post(`/game/${gameCode}/submit-question`, data);
export const getLeaderboard = (gameCode)   => api.get(`/game/${gameCode}/leaderboard`);
export const healthCheck = ()              => api.get('/health');

export default api;
